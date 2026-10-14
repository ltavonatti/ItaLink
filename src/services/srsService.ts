/**
 * Spaced Repetition System (SRS) Engine
 * SuperMemo-2 (SM-2) memory curve implementation with intraday learning steps.
 * 
 * Strict Zero External Dependencies: Pure TypeScript and native Date calculations.
 */

import { ItalianWord } from '../data/italianVocabulary';
import { SupportedLanguage } from '../i18n';

export type SRSCardStatus = 'new' | 'learning' | 'review' | 'relearning';
export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export interface SRSCardState {
  wordId: string;
  state: SRSCardStatus;
  step: number;           // Index in learning steps (0 = 1m, 1 = 10m)
  dueDate: number;        // Epoch timestamp (ms) when card is due
  intervalDays: number;   // Interval in days (for graduated cards)
  easeFactor: number;     // Multiplier, default 2.50 (minimum 1.30)
  repetitions: number;    // Consecutive successful reviews
  lapses: number;         // Times forgotten after graduating
  lastReviewedAt: number; // Timestamp of last review
}

export interface SRSSettings {
  newCardsPerDay: number;    // Default: 15
  maxReviewsPerDay: number;  // Default: 100
  dayCutoffHour: number;     // Hour of day (0-23) when new day starts. Default: 4 (4:00 AM)
  selectedPackIds?: string[]; // Array of selected pack IDs, or ['all'] for all packs
  randomizeNewCards?: boolean; // Default: true - whether new cards are shuffled at random
}

export interface DailySRSProgress {
  date: string;              // YYYY-MM-DD
  newCardsCompleted: number;
  reviewsCompleted: number;
}

export interface SRSReviewResult {
  nextState: SRSCardStatus;
  nextStep: number;
  nextDueDate: number;
  nextIntervalDays: number;
  nextEaseFactor: number;
  nextRepetitions: number;
  nextLapses: number;
  intervalPreviewMs: number;
}

export const DEFAULT_SRS_SETTINGS: SRSSettings = {
  newCardsPerDay: 15,
  maxReviewsPerDay: 100,
  dayCutoffHour: 4, // 4:00 AM
  selectedPackIds: ['all'],
  randomizeNewCards: true,
};

export const DEFAULT_CARD_STATE = (wordId: string): SRSCardState => ({
  wordId,
  state: 'new',
  step: 0,
  dueDate: 0,
  intervalDays: 0,
  easeFactor: 2.5,
  repetitions: 0,
  lapses: 0,
  lastReviewedAt: 0,
});

// Learning step durations in milliseconds
const STEP_1M = 60 * 1000;
const STEP_6M = 6 * 60 * 1000;
const STEP_10M = 10 * 60 * 1000;
const STEP_1D = 24 * 60 * 60 * 1000;
const STEP_4D = 4 * 24 * 60 * 60 * 1000;

/**
 * Calculates the current study calendar date based on the user's daylight cutoff hour.
 * (e.g. 2:00 AM before 4:00 AM cutoff counts as the previous calendar day).
 */
export function getStudyDate(now = Date.now(), cutoffHour = 4): string {
  const d = new Date(now);
  if (d.getHours() < cutoffHour) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().split('T')[0];
}

/**
 * Calculate the next review schedule for a given card state and rating
 */
export function calculateNextReview(
  card: SRSCardState,
  rating: SRSRating,
  now = Date.now()
): SRSReviewResult {
  let nextState: SRSCardStatus = card.state;
  let nextStep = card.step;
  let nextIntervalDays = card.intervalDays;
  let nextEaseFactor = card.easeFactor || 2.5;
  let nextRepetitions = card.repetitions || 0;
  let nextLapses = card.lapses || 0;
  let intervalMs = STEP_1M;

  if (card.state === 'new') {
    switch (rating) {
      case 'again':
        nextState = 'learning';
        nextStep = 0;
        intervalMs = STEP_1M;
        nextIntervalDays = 0;
        break;
      case 'hard':
        nextState = 'learning';
        nextStep = 0;
        intervalMs = STEP_6M;
        nextIntervalDays = 0;
        break;
      case 'good':
        nextState = 'learning';
        nextStep = 1;
        intervalMs = STEP_10M;
        nextIntervalDays = 0;
        break;
      case 'easy':
        nextState = 'review';
        nextStep = 0;
        nextIntervalDays = 4;
        intervalMs = STEP_4D;
        nextRepetitions = 1;
        break;
    }
  } else if (card.state === 'learning') {
    if (card.step === 0) {
      // At step 0 (1 minute)
      switch (rating) {
        case 'again':
          nextState = 'learning';
          nextStep = 0;
          intervalMs = STEP_1M;
          break;
        case 'hard':
          nextState = 'learning';
          nextStep = 0;
          intervalMs = STEP_6M;
          break;
        case 'good':
          nextState = 'learning';
          nextStep = 1;
          intervalMs = STEP_10M;
          break;
        case 'easy':
          nextState = 'review';
          nextStep = 0;
          nextIntervalDays = 4;
          intervalMs = STEP_4D;
          nextRepetitions = 1;
          break;
      }
    } else {
      // At step 1 (10 minutes)
      switch (rating) {
        case 'again':
          nextState = 'learning';
          nextStep = 0;
          intervalMs = STEP_1M;
          break;
        case 'hard':
          nextState = 'learning';
          nextStep = 1;
          intervalMs = STEP_6M;
          break;
        case 'good':
          // Graduates to Review!
          nextState = 'review';
          nextStep = 0;
          nextIntervalDays = 1;
          intervalMs = STEP_1D;
          nextRepetitions = 1;
          break;
        case 'easy':
          // Graduates with bonus interval
          nextState = 'review';
          nextStep = 0;
          nextIntervalDays = 4;
          intervalMs = STEP_4D;
          nextRepetitions = 1;
          break;
      }
    }
  } else if (card.state === 'relearning') {
    switch (rating) {
      case 'again':
        nextState = 'relearning';
        nextStep = 0;
        nextIntervalDays = 0;
        intervalMs = STEP_10M;
        break;
      case 'hard':
        nextState = 'relearning';
        nextStep = 0;
        nextIntervalDays = 0;
        intervalMs = 12 * 60 * 1000;
        break;
      case 'good':
        nextState = 'review';
        nextStep = 0;
        nextIntervalDays = 1;
        intervalMs = STEP_1D;
        break;
      case 'easy':
        nextState = 'review';
        nextStep = 0;
        nextIntervalDays = 2;
        intervalMs = 2 * STEP_1D;
        break;
    }
  } else {
    // Graduated Review Card (SM-2 with spaced repetition ease adjustment)
    const currentInterval = Math.max(1, card.intervalDays || 1);

    switch (rating) {
      case 'again':
        nextState = 'relearning';
        nextStep = 0;
        nextLapses += 1;
        nextRepetitions = 0;
        nextEaseFactor = Math.max(1.3, nextEaseFactor - 0.2);
        nextIntervalDays = 0;
        intervalMs = STEP_10M;
        break;

      case 'hard':
        nextState = 'review';
        nextEaseFactor = Math.max(1.3, nextEaseFactor - 0.15);
        nextIntervalDays = Math.max(1, Math.round(currentInterval * 1.2));
        intervalMs = nextIntervalDays * STEP_1D;
        nextRepetitions += 1;
        break;

      case 'good':
        nextState = 'review';
        if (card.repetitions <= 1) {
          nextIntervalDays = 3;
        } else {
          nextIntervalDays = Math.max(2, Math.round(currentInterval * nextEaseFactor));
        }
        intervalMs = nextIntervalDays * STEP_1D;
        nextRepetitions += 1;
        break;

      case 'easy':
        nextState = 'review';
        nextEaseFactor += 0.15;
        if (card.repetitions <= 1) {
          nextIntervalDays = 4;
        } else {
          nextIntervalDays = Math.max(3, Math.round(currentInterval * nextEaseFactor * 1.3));
        }
        intervalMs = nextIntervalDays * STEP_1D;
        nextRepetitions += 1;
        break;
    }
  }

  const nextDueDate = now + intervalMs;

  return {
    nextState,
    nextStep,
    nextDueDate,
    nextIntervalDays,
    nextEaseFactor: Math.round(nextEaseFactor * 100) / 100,
    nextRepetitions,
    nextLapses,
    intervalPreviewMs: intervalMs,
  };
}

/**
 * Format interval into human-readable badge string (e.g. "<1m", "10m", "1d", "4d", "1.5mo")
 */
export function formatIntervalPreview(ms: number, lang: SupportedLanguage = 'en'): string {
  const isZh = lang === 'zh-CN';
  const minutes = Math.round(ms / (60 * 1000));

  if (minutes < 1) {
    return isZh ? '<1分钟' : '<1m';
  }
  if (minutes < 60) {
    return isZh ? `${minutes}分钟` : `${minutes}m`;
  }

  const hours = Math.round(ms / (60 * 60 * 1000));
  if (hours < 24) {
    return isZh ? `${hours}小时` : `${hours}h`;
  }

  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days < 30) {
    return isZh ? `${days}天` : `${days}d`;
  }

  const months = Math.round((days / 30) * 10) / 10;
  if (months < 12) {
    return isZh ? `${months}个月` : `${months}mo`;
  }

  const years = Math.round((days / 365) * 10) / 10;
  return isZh ? `${years}年` : `${years}y`;
}

/**
 * Get all 4 button preview labels for a given card
 */
export function getRatingIntervalLabels(
  card: SRSCardState,
  lang: SupportedLanguage = 'en',
  now = Date.now()
): Record<SRSRating, string> {
  const ratings: SRSRating[] = ['again', 'hard', 'good', 'easy'];
  const labels: Record<SRSRating, string> = {
    again: '',
    hard: '',
    good: '',
    easy: '',
  };

  ratings.forEach((r) => {
    const calc = calculateNextReview(card, r, now);
    labels[r] = formatIntervalPreview(calc.intervalPreviewMs, lang);
  });

  return labels;
}

/**
 * Check if a review result schedules the card for tomorrow or later (>= 1 day / 86400000ms).
 * Any rating resulting in intra-day minutes (< 1 day) requires the card to remain in the active study session queue.
 */
export function isScheduledForFutureDay(result: SRSReviewResult): boolean {
  return result.intervalPreviewMs >= STEP_1D;
}

/**
 * Partition available words into daily smart review queues:
 * 1. Due Reviews (due <= now)
 * 2. Learning Cards (intra-day)
 * 3. New Cards (up to remaining daily quota)
 */
export interface DailyQueueBreakdown {
  dueReviews: ItalianWord[];
  learningCards: ItalianWord[];
  newCards: ItalianWord[];
  totalAvailable: number;
  totalDuePool?: number;
  totalLearningPool?: number;
  totalUnseenPool?: number;
}

/**
 * Resolves the target pool of words based on selected pack IDs.
 * If 'all' is included or array is empty, all packs are included.
 */
export function getWordsForPacks(
  selectedPackIds: string[] | undefined,
  packs: { id: string; words: ItalianWord[] }[]
): ItalianWord[] {
  if (!selectedPackIds || selectedPackIds.length === 0 || selectedPackIds.includes('all')) {
    return packs.flatMap((p) => p.words);
  }
  const selectedSet = new Set(selectedPackIds);
  const matchingPacks = packs.filter((p) => selectedSet.has(p.id));
  if (matchingPacks.length === 0) {
    return packs.flatMap((p) => p.words);
  }
  return matchingPacks.flatMap((p) => p.words);
}

/**
 * Deterministic pseudo-random number generator based on a string seed (e.g. study date + userId).
 * Ensures that card shuffling is stable throughout a given calendar study day.
 */
export function shuffleArraySeeded<T>(array: T[], seedStr: string): T[] {
  const result = [...array];
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const rng = () => {
    hash = (hash + 0x6d2b79f5) | 0;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildDailyQueue(
  allWords: ItalianWord[],
  srsMap: Record<string, SRSCardState>,
  settings: SRSSettings,
  dailyProgress?: DailySRSProgress,
  now = Date.now()
): DailyQueueBreakdown {
  const dueReviews: ItalianWord[] = [];
  const learningCards: ItalianWord[] = [];
  const unseenWords: ItalianWord[] = [];

  for (const word of allWords) {
    const srs = srsMap[word.id];
    if (!srs || srs.state === 'new') {
      unseenWords.push(word);
    } else if (srs.state === 'learning' || srs.state === 'relearning') {
      // Intra-day card: only include if its step interval has elapsed (dueDate <= now)
      if (srs.dueDate <= now) {
        learningCards.push(word);
      }
    } else if (srs.state === 'review') {
      if (srs.dueDate <= now) {
        dueReviews.push(word);
      }
    }
  }

  // Sort due cards by most overdue first
  dueReviews.sort((a, b) => {
    const dueA = srsMap[a.id]?.dueDate || 0;
    const dueB = srsMap[b.id]?.dueDate || 0;
    return dueA - dueB;
  });

  // Sort learning cards by earliest due date
  learningCards.sort((a, b) => {
    const dueA = srsMap[a.id]?.dueDate || 0;
    const dueB = srsMap[b.id]?.dueDate || 0;
    return dueA - dueB;
  });

  // Calculate daily quota and remaining session capacity based on user's global daily goal
  const dailyGoal = Math.max(1, settings.newCardsPerDay || 15);
  const todayDate = getStudyDate(now, settings.dayCutoffHour);
  const completedToday =
    dailyProgress && dailyProgress.date === todayDate
      ? dailyProgress.newCardsCompleted || 0
      : 0;

  const remainingQuota = Math.max(0, dailyGoal - completedToday);

  // If daily goal is already met today and no overdue reviews or learning cards exist, session is caught up
  if (remainingQuota === 0 && dueReviews.length === 0 && learningCards.length === 0) {
    return {
      dueReviews: [],
      learningCards: [],
      newCards: [],
      totalAvailable: 0,
      totalDuePool: dueReviews.length,
      totalLearningPool: learningCards.length,
      totalUnseenPool: unseenWords.length,
    };
  }

  // Active session capacity strictly respects the user's daily goal
  const sessionCapacity = dailyGoal;

  // 1. Priority 1: Due mature reviews (capped by sessionCapacity and maxReviewsPerDay)
  const maxReviews = settings.maxReviewsPerDay || 100;
  const allowedReviews = Math.min(dueReviews.length, maxReviews, sessionCapacity);
  const cappedDueReviews = dueReviews.slice(0, allowedReviews);
  let availableSlots = sessionCapacity - cappedDueReviews.length;

  // 2. Priority 2: In-progress learning cards (capped by remaining availableSlots)
  const allowedLearning = Math.min(learningCards.length, availableSlots);
  const cappedLearningCards = learningCards.slice(0, allowedLearning);
  availableSlots -= cappedLearningCards.length;

  // 3. Priority 3: Fresh unseen cards (fill remaining availableSlots up to remainingQuota)
  // If randomizeNewCards is enabled (default true), shuffle unseen cards with today's date seed so words from multiple/all packs are mixed at random
  const orderedUnseen =
    settings.randomizeNewCards !== false
      ? shuffleArraySeeded(unseenWords, todayDate)
      : unseenWords;

  const allowedNew = Math.min(orderedUnseen.length, availableSlots, remainingQuota);
  const cappedNewCards = orderedUnseen.slice(0, allowedNew);

  return {
    dueReviews: cappedDueReviews,
    learningCards: cappedLearningCards,
    newCards: cappedNewCards,
    totalAvailable: cappedDueReviews.length + cappedLearningCards.length + cappedNewCards.length,
    totalDuePool: dueReviews.length,
    totalLearningPool: learningCards.length,
    totalUnseenPool: unseenWords.length,
  };
}

/**
 * Checks whether a word has ever been studied in the SRS system (both past and current session).
 * A word is considered studied if it has progressed beyond 'new', has been reviewed, or has repetitions/legacy mastery.
 */
export function isWordStudied(
  wordId: string,
  progress: {
    srs?: Record<string, SRSCardState>;
    mastery?: Record<string, { status?: string; lastReviewedAt?: number; correctCount?: number; incorrectCount?: number }>;
  } | null | undefined
): boolean {
  if (!progress) return false;
  const srsCard = progress.srs?.[wordId];
  if (srsCard) {
    if (srsCard.lastReviewedAt > 0) return true;
    if (srsCard.state !== 'new') return true;
    if (srsCard.repetitions > 0) return true;
  }
  const masteryCard = progress.mastery?.[wordId];
  if (masteryCard) {
    if (masteryCard.lastReviewedAt && masteryCard.lastReviewedAt > 0) return true;
    if (masteryCard.status === 'mastered' || masteryCard.status === 'learning') return true;
    if ((masteryCard.correctCount || 0) > 0 || (masteryCard.incorrectCount || 0) > 0) return true;
  }
  return false;
}

/**
 * Returns a Set of all word IDs that have been studied in the SRS system.
 */
export function getStudiedWordIds(
  progress: {
    srs?: Record<string, SRSCardState>;
    mastery?: Record<string, { status?: string; lastReviewedAt?: number; correctCount?: number; incorrectCount?: number }>;
  } | null | undefined
): Set<string> {
  const result = new Set<string>();
  if (!progress) return result;
  if (progress.srs) {
    for (const [id, card] of Object.entries(progress.srs)) {
      if (card.lastReviewedAt > 0 || card.state !== 'new' || card.repetitions > 0) {
        result.add(id);
      }
    }
  }
  if (progress.mastery) {
    for (const [id, m] of Object.entries(progress.mastery)) {
      if (
        (m.lastReviewedAt && m.lastReviewedAt > 0) ||
        m.status === 'mastered' ||
        m.status === 'learning' ||
        (m.correctCount || 0) > 0 ||
        (m.incorrectCount || 0) > 0
      ) {
        result.add(id);
      }
    }
  }
  return result;
}

/**
 * Filters a list of Italian words down to only those that have been studied in SRS.
 */
export function getStudiedWords(
  words: ItalianWord[],
  progress: {
    srs?: Record<string, SRSCardState>;
    mastery?: Record<string, { status?: string; lastReviewedAt?: number; correctCount?: number; incorrectCount?: number }>;
  } | null | undefined
): ItalianWord[] {
  const studiedIds = getStudiedWordIds(progress);
  return words.filter((w) => studiedIds.has(w.id));
}



