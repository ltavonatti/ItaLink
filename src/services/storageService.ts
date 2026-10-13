/**
 * Decoupled Data Synchronization & Storage Abstraction Layer
 * 
 * Acts as a strict boundary between UI/game engines and persistence.
 * Designed so that future replacement with a cloud/remote database (e.g. Supabase, Firebase, REST)
 * requires zero changes to the UI components.
 */

import {
  SRSCardState,
  SRSSettings,
  DailySRSProgress,
  SRSRating,
  DEFAULT_SRS_SETTINGS,
  DEFAULT_CARD_STATE,
  calculateNextReview,
  getStudyDate,
} from './srsService';

export type CardMasteryState = 'mastered' | 'learning' | 'unseen';

export interface CardReviewRecord {
  wordId: string;
  status: CardMasteryState;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt: number;
}

export interface UserStats {
  totalReviews: number;
  masteredCount: number;
  needPracticeCount: number;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
}

export interface UserStudyProgress {
  userId: string;
  mastery: Record<string, CardReviewRecord>;
  stats: UserStats;
  srs: Record<string, SRSCardState>;
  srsSettings: SRSSettings;
  srsDaily: DailySRSProgress;
  updatedAt: number;
  version: number;
}

export interface SyncResult {
  success: boolean;
  message: string;
  progress?: UserStudyProgress;
}

/**
 * Strict contract for any persistence engine (Local Storage, IndexedDB, or future Cloud API)
 */
export interface SyncStorageProvider {
  getProgress(userId: string): Promise<UserStudyProgress>;
  saveProgress(progress: UserStudyProgress): Promise<void>;
  recordReview(userId: string, wordId: string, isMastered: boolean): Promise<UserStudyProgress>;
  recordSRSReview(userId: string, wordId: string, rating: SRSRating): Promise<UserStudyProgress>;
  updateSRSSettings(userId: string, settings: Partial<SRSSettings>): Promise<UserStudyProgress>;
  exportData(userId: string): Promise<string>;
  importData(userId: string, rawJson: string): Promise<SyncResult>;
  resetProgress(userId: string): Promise<void>;
}

const STORAGE_PREFIX = 'zen_italian_progress_';

function getDefaultProgress(userId: string): UserStudyProgress {
  const today = new Date().toISOString().split('T')[0];
  const studyDate = getStudyDate(Date.now(), DEFAULT_SRS_SETTINGS.dayCutoffHour);

  return {
    userId,
    mastery: {},
    stats: {
      totalReviews: 0,
      masteredCount: 0,
      needPracticeCount: 0,
      streakDays: 1,
      lastActiveDate: today,
    },
    srs: {},
    srsSettings: { ...DEFAULT_SRS_SETTINGS },
    srsDaily: {
      date: studyDate,
      newCardsCompleted: 0,
      reviewsCompleted: 0,
    },
    updatedAt: Date.now(),
    version: 2,
  };
}

/**
 * LocalStorage implementation of the storage provider
 */
class LocalStorageSyncProvider implements SyncStorageProvider {
  private getKey(userId: string): string {
    return `${STORAGE_PREFIX}${userId}`;
  }

  public async getProgress(userId: string): Promise<UserStudyProgress> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return getDefaultProgress(userId);
    }

    try {
      const raw = window.localStorage.getItem(this.getKey(userId));
      if (!raw) {
        const initial = getDefaultProgress(userId);
        await this.saveProgress(initial);
        return initial;
      }
      const parsed: UserStudyProgress = JSON.parse(raw);

      // Schema Migration & Integrity Safeguards
      let modified = false;

      if (!parsed.srs) {
        parsed.srs = {};
        // Backfill SRS records from legacy mastery if any exists
        if (parsed.mastery) {
          Object.entries(parsed.mastery).forEach(([wId, mRec]) => {
            const card = DEFAULT_CARD_STATE(wId);
            if (mRec.status === 'mastered') {
              card.state = 'review';
              card.intervalDays = 4;
              card.dueDate = Date.now() + 4 * 86400000;
              card.repetitions = 1;
            } else if (mRec.status === 'learning') {
              card.state = 'learning';
              card.step = 0;
              card.dueDate = Date.now();
            }
            card.lastReviewedAt = mRec.lastReviewedAt || 0;
            parsed.srs[wId] = card;
          });
        }
        modified = true;
      }

      if (!parsed.srsSettings) {
        parsed.srsSettings = { ...DEFAULT_SRS_SETTINGS };
        modified = true;
      }

      const currentStudyDay = getStudyDate(Date.now(), parsed.srsSettings.dayCutoffHour);
      if (!parsed.srsDaily || parsed.srsDaily.date !== currentStudyDay) {
        parsed.srsDaily = {
          date: currentStudyDay,
          newCardsCompleted: 0,
          reviewsCompleted: 0,
        };
        modified = true;
      }

      if (parsed.version !== 2) {
        parsed.version = 2;
        modified = true;
      }

      if (modified) {
        await this.saveProgress(parsed);
      }

      return parsed;
    } catch (err) {
      console.error('Failed to parse user study progress:', err);
      return getDefaultProgress(userId);
    }
  }

  public async saveProgress(progress: UserStudyProgress): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      progress.updatedAt = Date.now();
      window.localStorage.setItem(this.getKey(progress.userId), JSON.stringify(progress));
    } catch (err) {
      console.error('Failed to save study progress:', err);
    }
  }

  public async recordReview(
    userId: string,
    wordId: string,
    isMastered: boolean
  ): Promise<UserStudyProgress> {
    const progress = await this.getProgress(userId);
    const existing = progress.mastery[wordId] || {
      wordId,
      status: 'unseen',
      correctCount: 0,
      incorrectCount: 0,
      lastReviewedAt: 0,
    };

    const newStatus: CardMasteryState = isMastered ? 'mastered' : 'learning';

    existing.status = newStatus;
    existing.lastReviewedAt = Date.now();
    if (isMastered) {
      existing.correctCount += 1;
    } else {
      existing.incorrectCount += 1;
    }

    progress.mastery[wordId] = existing;
    progress.stats.totalReviews += 1;

    // Recalculate summary totals
    let mastered = 0;
    let learning = 0;
    Object.values(progress.mastery).forEach((item) => {
      if (item.status === 'mastered') mastered++;
      if (item.status === 'learning') learning++;
    });

    progress.stats.masteredCount = mastered;
    progress.stats.needPracticeCount = learning;

    // Update streak if reviewing on a new day
    const today = new Date().toISOString().split('T')[0];
    if (progress.stats.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (progress.stats.lastActiveDate === yesterday) {
        progress.stats.streakDays += 1;
      } else {
        progress.stats.streakDays = 1;
      }
      progress.stats.lastActiveDate = today;
    }

    await this.saveProgress(progress);
    return progress;
  }

  public async recordSRSReview(
    userId: string,
    wordId: string,
    rating: SRSRating
  ): Promise<UserStudyProgress> {
    const progress = await this.getProgress(userId);
    const currentStudyDay = getStudyDate(Date.now(), progress.srsSettings.dayCutoffHour);

    // Date rollover check
    if (!progress.srsDaily || progress.srsDaily.date !== currentStudyDay) {
      progress.srsDaily = {
        date: currentStudyDay,
        newCardsCompleted: 0,
        reviewsCompleted: 0,
      };
    }

    const card = progress.srs[wordId] || DEFAULT_CARD_STATE(wordId);
    const wasNew = card.state === 'new';

    // Compute next interval via SuperMemo-2 / Anki scheduler
    const result = calculateNextReview(card, rating);

    card.state = result.nextState;
    card.step = result.nextStep;
    card.dueDate = result.nextDueDate;
    card.intervalDays = result.nextIntervalDays;
    card.easeFactor = result.nextEaseFactor;
    card.repetitions = result.nextRepetitions;
    card.lapses = result.nextLapses;
    card.lastReviewedAt = Date.now();

    progress.srs[wordId] = card;

    // Increment daily quota counters
    if (wasNew) {
      progress.srsDaily.newCardsCompleted += 1;
    } else {
      progress.srsDaily.reviewsCompleted += 1;
    }

    // Mirror to legacy mastery record for backward compatibility
    const isMastered = rating === 'good' || rating === 'easy';
    const legacy = progress.mastery[wordId] || {
      wordId,
      status: 'unseen',
      correctCount: 0,
      incorrectCount: 0,
      lastReviewedAt: 0,
    };
    legacy.status = card.state === 'review' ? 'mastered' : 'learning';
    legacy.lastReviewedAt = Date.now();
    if (isMastered) {
      legacy.correctCount += 1;
    } else {
      legacy.incorrectCount += 1;
    }
    progress.mastery[wordId] = legacy;

    progress.stats.totalReviews += 1;

    // Recalculate summary totals
    let masteredCount = 0;
    let learningCount = 0;
    Object.values(progress.srs).forEach((c) => {
      if (c.state === 'review') masteredCount++;
      if (c.state === 'learning' || c.state === 'relearning') learningCount++;
    });
    progress.stats.masteredCount = masteredCount;
    progress.stats.needPracticeCount = learningCount;

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    if (progress.stats.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (progress.stats.lastActiveDate === yesterday) {
        progress.stats.streakDays += 1;
      } else {
        progress.stats.streakDays = 1;
      }
      progress.stats.lastActiveDate = today;
    }

    await this.saveProgress(progress);
    return progress;
  }

  public async updateSRSSettings(
    userId: string,
    settings: Partial<SRSSettings>
  ): Promise<UserStudyProgress> {
    const progress = await this.getProgress(userId);
    progress.srsSettings = {
      ...progress.srsSettings,
      ...settings,
    };
    await this.saveProgress(progress);
    return progress;
  }

  public async exportData(userId: string): Promise<string> {
    const progress = await this.getProgress(userId);
    const exportPayload = {
      app: 'zen-italian',
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      payload: progress,
    };
    return JSON.stringify(exportPayload, null, 2);
  }

  public async importData(userId: string, rawJson: string): Promise<SyncResult> {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || parsed.app !== 'zen-italian' || !parsed.payload) {
        return {
          success: false,
          message: 'Invalid backup file format. Expected a valid Zen Italian export payload.',
        };
      }

      const incoming: UserStudyProgress = parsed.payload;
      // Remap userId to current active user to prevent cross-account ID conflicts
      incoming.userId = userId;
      incoming.updatedAt = Date.now();

      // Ensure SRS fields exist on imported data
      if (!incoming.srs) incoming.srs = {};
      if (!incoming.srsSettings) incoming.srsSettings = { ...DEFAULT_SRS_SETTINGS };
      if (!incoming.srsDaily) {
        incoming.srsDaily = {
          date: getStudyDate(Date.now(), incoming.srsSettings.dayCutoffHour),
          newCardsCompleted: 0,
          reviewsCompleted: 0,
        };
      }

      await this.saveProgress(incoming);
      return {
        success: true,
        message: 'Progress restored successfully!',
        progress: incoming,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to import data: ${err?.message || 'Malformed JSON string'}`,
      };
    }
  }

  public async resetProgress(userId: string): Promise<void> {
    const fresh = getDefaultProgress(userId);
    await this.saveProgress(fresh);
  }
}

export const storageService: SyncStorageProvider = new LocalStorageSyncProvider();
export default storageService;
