/**
 * Spaced Repetition System (SRS) Engine
 * Anki-compatible SuperMemo-2 (SM-2) implementation with learning steps.
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
        intervalMs = STEP_10M;
        break;
      case 'hard':
        nextState = 'relearning';
        nextStep = 0;
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
    // Graduated Review Card (SM-2 with Anki ease adjustment)
    const currentInterval = Math.max(1, card.intervalDays || 1);

    switch (rating) {
      case 'again':
        nextState = 'relearning';
        nextStep = 0;
        nextLapses += 1;
        nextRepetitions = 0;
        nextEaseFactor = Math.max(1.3, nextEaseFactor - 0.2);
        nextIntervalDays = 1;
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
 * Format interval into human-readable Anki badge string (e.g. "<1m", "10m", "1d", "4d", "1.5mo")
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
 * Partition available words into daily Anki study queues:
 * 1. Due Reviews (due <= now)
 * 2. Learning Cards (intra-day)
 * 3. New Cards (up to remaining daily quota)
 */
export interface DailyQueueBreakdown {
  dueReviews: ItalianWord[];
  learningCards: ItalianWord[];
  newCards: ItalianWord[];
  totalAvailable: number;
}

export function buildDailyQueue(
  allWords: ItalianWord[],
  srsMap: Record<string, SRSCardState>,
  settings: SRSSettings,
  dailyProgress: DailySRSProgress,
  now = Date.now()
): DailyQueueBreakdown {
  const currentStudyDay = getStudyDate(now, settings.dayCutoffHour);

  // Check if daily progress needs date rollover
  const effectiveDaily =
    dailyProgress && dailyProgress.date === currentStudyDay
      ? dailyProgress
      : { date: currentStudyDay, newCardsCompleted: 0, reviewsCompleted: 0 };

  const remainingNewQuota = Math.max(0, settings.newCardsPerDay - effectiveDaily.newCardsCompleted);
  const remainingReviewQuota = Math.max(0, settings.maxReviewsPerDay - effectiveDaily.reviewsCompleted);

  const dueReviews: ItalianWord[] = [];
  const learningCards: ItalianWord[] = [];
  const unseenWords: ItalianWord[] = [];

  for (const word of allWords) {
    const srs = srsMap[word.id];
    if (!srs || srs.state === 'new') {
      unseenWords.push(word);
    } else if (srs.state === 'learning' || srs.state === 'relearning') {
      learningCards.push(word);
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

  // Limit due reviews to remaining quota
  const cappedDueReviews = dueReviews.slice(0, remainingReviewQuota);

  // Limit new cards to remaining quota
  const cappedNewCards = unseenWords.slice(0, remainingNewQuota);

  return {
    dueReviews: cappedDueReviews,
    learningCards,
    newCards: cappedNewCards,
    totalAvailable: cappedDueReviews.length + learningCards.length + cappedNewCards.length,
  };
}

