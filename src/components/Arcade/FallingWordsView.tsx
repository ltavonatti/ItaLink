import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Gamepad2,
  Heart,
  Trophy,
  Flame,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Check,
  X,
  BookOpen,
  Headphones,
  Gauge,
  GraduationCap,
  Layers,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  ItalianWord,
  VOCABULARY_PACKS,
  getAllWords,
  getPackById,
} from '../../data/italianVocabulary';
import { audioService } from '../../services/audioService';
import { storageService, UserStudyProgress } from '../../services/storageService';
import { getStudiedWordIds } from '../../services/srsService';
import { useTranslation } from '../../i18n';

interface FallingWordsProps {
  userId: string;
  initialPackId?: string;
  onBackToDashboard: () => void;
}

type GameState = 'start' | 'playing' | 'paused' | 'gameover';

export type DifficultyLevel = 'relaxed' | 'standard' | 'fast';

interface DifficultyConfig {
  baseDuration: number;
  minDuration: number;
  speedPerCleared: number;
  speedPerCombo: number;
  transitionDelayCorrect: number;
  transitionDelayWrong: number;
}

const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  relaxed: {
    baseDuration: 10500, // 10.5s initial fall duration: very comfortable for beginners
    minDuration: 7000,   // never drops below 7.0s even on high streaks
    speedPerCleared: 45, // gentle deceleration
    speedPerCombo: 15,
    transitionDelayCorrect: 520, // ample time to confirm correct answer
    transitionDelayWrong: 850,   // plenty of time to read and learn the correct answer
  },
  standard: {
    baseDuration: 7500,  // 7.5s fall duration
    minDuration: 4500,   // 4.5s min
    speedPerCleared: 80,
    speedPerCombo: 25,
    transitionDelayCorrect: 380,
    transitionDelayWrong: 650,
  },
  fast: {
    baseDuration: 5500,  // 5.5s fall duration
    minDuration: 2400,   // 2.4s min
    speedPerCleared: 110,
    speedPerCombo: 35,
    transitionDelayCorrect: 280,
    transitionDelayWrong: 500,
  },
};

interface FallingCard {
  word: ItalianWord;
  options: ItalianWord[];
  correctIndex: number;
  spawnTime: number;
  duration: number; // in ms
}

export type PoolScope = 'studied' | 'all';

const STORAGE_HIGHSCORE_KEY = 'zen_caduta_parole_highscore';
const STORAGE_AUTO_AUDIO_KEY = 'zen_caduta_parole_auto_audio';
const STORAGE_SHOW_PINYIN_KEY = 'zen_caduta_parole_show_pinyin';
const STORAGE_DIFFICULTY_KEY = 'zen_caduta_parole_difficulty';
const STORAGE_POOL_SCOPE_KEY = 'zen_caduta_parole_word_pool_scope';

export const FallingWordsView: React.FC<FallingWordsProps> = ({
  userId,
  initialPackId = 'all',
  onBackToDashboard,
}) => {
  const { t, currentLang } = useTranslation();

  // Load user progress for SRS studied words
  const [progress, setProgress] = useState<UserStudyProgress | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`zen_italian_study_progress_${userId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return null;
  });

  useEffect(() => {
    let isMounted = true;
    storageService.getProgress(userId).then((data) => {
      if (isMounted) setProgress(data);
    });
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Settings & Preferences
  const [selectedPackId, setSelectedPackId] = useState<string>(initialPackId);
  const [poolScope, setPoolScope] = useState<PoolScope>(() => {
    if (typeof window === 'undefined') return 'studied';
    const saved = localStorage.getItem(STORAGE_POOL_SCOPE_KEY);
    return saved === 'all' ? 'all' : 'studied'; // defaults to studied
  });
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => {
    if (typeof window === 'undefined') return 'relaxed';
    const saved = localStorage.getItem(STORAGE_DIFFICULTY_KEY);
    return saved === 'relaxed' || saved === 'standard' || saved === 'fast' ? saved : 'relaxed';
  });
  const [autoPronounce, setAutoPronounce] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(STORAGE_AUTO_AUDIO_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [showPinyin, setShowPinyin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(STORAGE_SHOW_PINYIN_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => audioService.isSfxEnabled());

  // Game Flow State
  const [gameState, setGameState] = useState<GameState>('start');
  const [lives, setLives] = useState<number>(3);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem(STORAGE_HIGHSCORE_KEY);
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [wordsCleared, setWordsCleared] = useState<number>(0);
  const [missedWords, setMissedWords] = useState<ItalianWord[]>([]);

  // Current Falling Word State
  const [currentCard, setCurrentCard] = useState<FallingCard | null>(null);
  const [fallProgress, setFallProgress] = useState<number>(0); // 0 to 100 (%)
  const [feedbackState, setFeedbackState] = useState<{
    type: 'correct' | 'wrong' | 'floor';
    selectedIndex?: number;
    pointsGained?: number;
  } | null>(null);

  // Animation Loop References
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isHandlingAnswerRef = useRef<boolean>(false);
  const currentCardRef = useRef<FallingCard | null>(null);
  currentCardRef.current = currentCard;

  // Catalog and SRS Studied Word Computations
  const allCatalogWords = useMemo(() => getAllWords(), []);

  const studiedWordIds = useMemo(() => {
    return getStudiedWordIds(progress);
  }, [progress]);

  const totalStudiedWordsCount = useMemo(() => {
    return allCatalogWords.filter((w) => studiedWordIds.has(w.id)).length;
  }, [allCatalogWords, studiedWordIds]);

  const packStats = useMemo(() => {
    const map = new Map<string, { studied: number; total: number }>();
    for (const pack of VOCABULARY_PACKS) {
      const studied = pack.words.filter((w) => studiedWordIds.has(w.id)).length;
      map.set(pack.id, { studied, total: pack.words.length });
    }
    return map;
  }, [studiedWordIds]);

  // Base words selected by pack
  const basePackWords = useMemo(() => {
    if (selectedPackId === 'all') {
      return allCatalogWords;
    }
    const pack = getPackById(selectedPackId);
    return pack && pack.words.length > 0 ? pack.words : allCatalogWords;
  }, [selectedPackId, allCatalogWords]);

  // Active word pool filtered by poolScope ('studied' vs 'all')
  const activeWordPool = useMemo(() => {
    if (poolScope === 'all') {
      return basePackWords;
    }
    return basePackWords.filter((w) => studiedWordIds.has(w.id));
  }, [basePackWords, poolScope, studiedWordIds]);

  const isPoolEmpty = activeWordPool.length === 0;

  const handleSelectPoolScope = (scope: PoolScope) => {
    setPoolScope(scope);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_POOL_SCOPE_KEY, scope);
    }
  };

  const handleSelectDifficulty = (level: DifficultyLevel) => {
    setDifficulty(level);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_DIFFICULTY_KEY, level);
    }
  };

  const handleToggleAutoPronounce = () => {
    const next = !autoPronounce;
    setAutoPronounce(next);
    localStorage.setItem(STORAGE_AUTO_AUDIO_KEY, String(next));
  };

  const handleTogglePinyin = () => {
    const next = !showPinyin;
    setShowPinyin(next);
    localStorage.setItem(STORAGE_SHOW_PINYIN_KEY, String(next));
  };

  const handleToggleSfx = () => {
    const next = audioService.toggleSfx();
    setSfxEnabled(next);
  };

  // Play audio for a word
  const playWordAudio = useCallback((word: ItalianWord) => {
    if (word.media?.audio) {
      audioService.playAudioFile(word.media.audio);
    } else {
      audioService.playNormal(word.word);
    }
  }, []);

  // Compute falling duration based on words cleared, combo streak, and active difficulty
  const calculateDuration = useCallback(
    (cleared: number, currentCombo: number, diff: DifficultyLevel): number => {
      const config = DIFFICULTY_CONFIGS[diff];
      const speedUpFromCleared = cleared * config.speedPerCleared;
      const speedUpFromCombo = currentCombo * config.speedPerCombo;
      const totalSpeedUp = Math.min(
        speedUpFromCleared + speedUpFromCombo,
        config.baseDuration - config.minDuration
      );
      return Math.max(config.minDuration, config.baseDuration - totalSpeedUp);
    },
    []
  );

  // Generate 4-option falling card
  const spawnCard = useCallback(
    (clearedCount: number, currentComboStreak: number, diffOverride?: DifficultyLevel) => {
      if (activeWordPool.length === 0) return;

      const activeDiff = diffOverride || difficulty;

      // Select target word randomly from activeWordPool (strictly studied words when poolScope === 'studied')
      const targetIndex = Math.floor(Math.random() * activeWordPool.length);
      const targetWord = activeWordPool[targetIndex];

      // Draw distractors: first try activeWordPool, supplement from allCatalogWords if pool < 4
      const candidateDistractors = activeWordPool.filter((w) => w.id !== targetWord.id);
      const seenIds = new Set<string>([targetWord.id]);
      const distractors: ItalianWord[] = [];

      // Prioritize distractors from the active pool
      const shuffledCandidates = [...candidateDistractors].sort(() => Math.random() - 0.5);
      for (const w of shuffledCandidates) {
        if (distractors.length >= 3) break;
        distractors.push(w);
        seenIds.add(w.id);
      }

      // If active pool is small (< 4 words), backfill distractors from the full catalog
      if (distractors.length < 3) {
        const fallbackCandidates = allCatalogWords
          .filter((w) => !seenIds.has(w.id))
          .sort(() => Math.random() - 0.5);
        for (const w of fallbackCandidates) {
          if (distractors.length >= 3) break;
          distractors.push(w);
          seenIds.add(w.id);
        }
      }

      // Randomize correct option position (0 to distractors.length)
      const correctIdx = Math.floor(Math.random() * (distractors.length + 1));
      const options: ItalianWord[] = [...distractors];
      options.splice(correctIdx, 0, targetWord);

      const duration = calculateDuration(clearedCount, currentComboStreak, activeDiff);
      const newCard: FallingCard = {
        word: targetWord,
        options,
        correctIndex: correctIdx,
        spawnTime: performance.now(),
        duration,
      };

      setCurrentCard(newCard);
      setFallProgress(0);
      setFeedbackState(null);
      isHandlingAnswerRef.current = false;

      // Auto-pronounce if enabled
      if (autoPronounce) {
        playWordAudio(targetWord);
      }
    },
    [activeWordPool, allCatalogWords, difficulty, calculateDuration, autoPronounce, playWordAudio]
  );

  // Trigger Game Over
  const handleGameOver = useCallback(
    (finalScore: number) => {
      setGameState('gameover');
      audioService.playGameOverSound();

      if (finalScore > highScore) {
        setHighScore(finalScore);
        setIsNewHighScore(true);
        localStorage.setItem(STORAGE_HIGHSCORE_KEY, String(finalScore));
      } else {
        setIsNewHighScore(false);
      }
    },
    [highScore]
  );

  // Handle floor hit (word fell all the way down)
  const handleFloorHit = useCallback(() => {
    if (isHandlingAnswerRef.current || !currentCardRef.current) return;
    isHandlingAnswerRef.current = true;

    const missedCard = currentCardRef.current;
    audioService.playMissSound();

    setFeedbackState({ type: 'floor' });
    setCombo(0);
    setMissedWords((prev) => {
      if (!prev.some((w) => w.id === missedCard.word.id)) {
        return [...prev, missedCard.word];
      }
      return prev;
    });

    setLives((prevLives) => {
      const nextLives = prevLives - 1;
      if (nextLives <= 0) {
        setTimeout(() => {
          handleGameOver(score);
        }, 500);
        return 0;
      }

      // Spawn next word after brief feedback pause
      const delay = DIFFICULTY_CONFIGS[difficulty].transitionDelayWrong;
      setTimeout(() => {
        spawnCard(wordsCleared, 0);
      }, delay);
      return nextLives;
    });
  }, [difficulty, score, wordsCleared, handleGameOver, spawnCard]);

  // Main 60fps Falling Animation Loop
  useEffect(() => {
    if (gameState !== 'playing' || !currentCard) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const tick = (now: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = now;
      }

      const elapsed = now - currentCard.spawnTime;
      const progress = Math.min((elapsed / currentCard.duration) * 100, 100);
      setFallProgress(progress);

      if (progress >= 100) {
        handleFloorHit();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, currentCard, handleFloorHit]);

  // Handle user selecting an option (0, 1, 2, 3)
  const handleSelectOption = useCallback(
    (index: number) => {
      if (gameState !== 'playing' || isHandlingAnswerRef.current || !currentCard) return;
      isHandlingAnswerRef.current = true;

      const isCorrect = index === currentCard.correctIndex;

      if (isCorrect) {
        // Calculate points: 100 base + height reflex bonus (0 to 100)
        const heightBonus = Math.round(100 * Math.max(0, 1 - fallProgress / 100));
        const newCombo = combo + 1;
        const newMaxCombo = Math.max(maxCombo, newCombo);
        const multiplier =
          newCombo >= 15 ? 3.0 : newCombo >= 10 ? 2.5 : newCombo >= 6 ? 2.0 : newCombo >= 3 ? 1.5 : 1.0;

        const pointsGained = Math.round((100 + heightBonus) * multiplier);
        const newScore = score + pointsGained;

        setScore(newScore);
        setCombo(newCombo);
        setMaxCombo(newMaxCombo);
        const newCleared = wordsCleared + 1;
        setWordsCleared(newCleared);

        audioService.playHitSound();
        if (newCombo === 3 || newCombo === 5 || newCombo % 5 === 0) {
          audioService.playComboSound(newCombo);
        }

        setFeedbackState({
          type: 'correct',
          selectedIndex: index,
          pointsGained,
        });

        // Spawn next word after celebratory pause
        const delay = DIFFICULTY_CONFIGS[difficulty].transitionDelayCorrect;
        setTimeout(() => {
          spawnCard(newCleared, newCombo);
        }, delay);
      } else {
        // Incorrect match
        audioService.playMissSound();
        setCombo(0);
        setMissedWords((prev) => {
          if (!prev.some((w) => w.id === currentCard.word.id)) {
            return [...prev, currentCard.word];
          }
          return prev;
        });

        setFeedbackState({
          type: 'wrong',
          selectedIndex: index,
        });

        setLives((prevLives) => {
          const nextLives = prevLives - 1;
          if (nextLives <= 0) {
            setTimeout(() => {
              handleGameOver(score);
            }, 550);
            return 0;
          }

          const delay = DIFFICULTY_CONFIGS[difficulty].transitionDelayWrong;
          setTimeout(() => {
            spawnCard(wordsCleared, 0);
          }, delay);
          return nextLives;
        });
      }
    },
    [difficulty, gameState, currentCard, fallProgress, combo, maxCombo, score, wordsCleared, handleGameOver, spawnCard]
  );

  // Global Keyboard Shortcuts (1-4 for options, Space/Esc to pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes when typing inside inputs or modals
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (gameState === 'playing') {
        if (e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          setGameState('paused');
          audioService.stop();
          return;
        }

        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          const optionIndex = parseInt(e.key, 10) - 1;
          handleSelectOption(optionIndex);
        }
      } else if (gameState === 'paused') {
        if (e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          // Resume game
          if (currentCard) {
            // Adjust card spawn time to account for pause duration
            const remainingProgressFraction = fallProgress / 100;
            const newSpawnTime = performance.now() - currentCard.duration * remainingProgressFraction;
            currentCard.spawnTime = newSpawnTime;
          }
          setGameState('playing');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, fallProgress, currentCard, handleSelectOption]);

  // Start new game session
  const handleStartGame = () => {
    setLives(3);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setWordsCleared(0);
    setMissedWords([]);
    setIsNewHighScore(false);
    setFeedbackState(null);
    setGameState('playing');
    spawnCard(0, 0);
  };

  // Resume paused game
  const handleResumeGame = () => {
    if (currentCard) {
      const remainingProgressFraction = fallProgress / 100;
      const newSpawnTime = performance.now() - currentCard.duration * remainingProgressFraction;
      currentCard.spawnTime = newSpawnTime;
    }
    setGameState('playing');
  };

  // Render combo multiplier badge
  const comboMultiplier =
    combo >= 15 ? 3.0 : combo >= 10 ? 2.5 : combo >= 6 ? 2.0 : combo >= 3 ? 1.5 : 1.0;

  const isPlayingOrPaused = gameState === 'playing' || gameState === 'paused';

  return (
    <div
      className={
        isPlayingOrPaused
          ? 'w-full max-w-7xl mx-auto flex flex-col justify-between h-[calc(100dvh-4.25rem)] sm:h-[calc(100dvh-6.5rem)] select-none overflow-hidden px-1 sm:px-0'
          : 'w-full max-w-6xl mx-auto py-1 sm:py-3 space-y-4'
      }
    >
      {/* ========================================================
          1. START SCREEN
          ======================================================== */}
      {gameState === 'start' && (
        <div className="rounded-3xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-4 sm:p-8 lg:p-10 border border-zen-border/60 dark:border-zen-dark-border text-center space-y-6 lg:space-y-8 shadow-zen-sm animate-in fade-in duration-200">
          {/* Header & Icon */}
          <div className="space-y-3 max-w-xl mx-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-3xl bg-gradient-to-tr from-rose-500/20 to-orange-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
              <Gamepad2 className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-headline font-bold text-zen-text dark:text-zen-dark-text tracking-tight">
                {t('fallingWords.title')}
              </h2>
              <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted leading-relaxed max-w-lg mx-auto">
                {t('fallingWords.subtitle')}
              </p>
            </div>

            {/* High Score Banner */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-mono text-xs sm:text-sm font-bold shadow-xs">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>{t('fallingWords.highScore', { score: highScore.toLocaleString() })}</span>
            </div>
          </div>

          {/* Two-Column Responsive Settings Arena */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 text-left">
            {/* Left Column: Word Pool & Pack Selection */}
            <div className="space-y-4">
              {/* Word Pool Scope */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-zen-text-muted dark:text-zen-dark-text-muted uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>{t('fallingWords.poolScopeLabel')}</span>
                  </span>
                  <span className="font-mono text-[11px] font-normal text-zen-primary dark:text-zen-dark-primary">
                    {t('fallingWords.studiedRatio', {
                      studied: totalStudiedWordsCount,
                      total: allCatalogWords.length,
                    })}
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectPoolScope('studied')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      poolScope === 'studied'
                        ? 'border-zen-primary bg-zen-primary/10 dark:border-zen-dark-primary dark:bg-zen-dark-primary/10 font-bold text-zen-primary dark:text-zen-dark-primary ring-2 ring-zen-primary/20 shadow-xs'
                        : 'border-zen-border/60 dark:border-zen-dark-border bg-zen-surface-container/50 dark:bg-zen-dark-surface-high/50 hover:border-zen-primary/40 text-zen-text dark:text-zen-dark-text'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary shrink-0" />
                          <span>{t('fallingWords.poolScopeStudied')}</span>
                        </span>
                        {poolScope === 'studied' && (
                          <Check className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] font-normal leading-snug text-zen-text-muted dark:text-zen-dark-text-muted">
                        {t('fallingWords.poolScopeStudiedDesc')}
                      </div>
                    </div>
                    <div className="pt-2 text-xs font-mono font-medium text-zen-text-muted dark:text-zen-dark-text-muted">
                      {t('fallingWords.studiedCount', { count: totalStudiedWordsCount })}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPoolScope('all')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      poolScope === 'all'
                        ? 'border-zen-primary bg-zen-primary/10 dark:border-zen-dark-primary dark:bg-zen-dark-primary/10 font-bold text-zen-primary dark:text-zen-dark-primary ring-2 ring-zen-primary/20 shadow-xs'
                        : 'border-zen-border/60 dark:border-zen-dark-border bg-zen-surface-container/50 dark:bg-zen-dark-surface-high/50 hover:border-zen-primary/40 text-zen-text dark:text-zen-dark-text'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary shrink-0" />
                          <span>{t('fallingWords.poolScopeAll')}</span>
                        </span>
                        {poolScope === 'all' && (
                          <Check className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] font-normal leading-snug text-zen-text-muted dark:text-zen-dark-text-muted">
                        {t('fallingWords.poolScopeAllDesc')}
                      </div>
                    </div>
                    <div className="pt-2 text-xs font-mono font-medium text-zen-text-muted dark:text-zen-dark-text-muted">
                      {allCatalogWords.length} {t('srs.wordsUnit')}
                    </div>
                  </button>
                </div>
              </div>

              {/* Pack Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-zen-text-muted dark:text-zen-dark-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t('fallingWords.selectPack')}</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPackId('all')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      selectedPackId === 'all'
                        ? 'border-zen-primary bg-zen-primary/10 dark:border-zen-dark-primary dark:bg-zen-dark-primary/10 font-bold text-zen-primary dark:text-zen-dark-primary ring-2 ring-zen-primary/20'
                        : 'border-zen-border/60 dark:border-zen-dark-border bg-zen-surface-container/50 dark:bg-zen-dark-surface-high/50 hover:border-zen-primary/40 text-zen-text dark:text-zen-dark-text'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold">{t('fallingWords.allPacks')}</div>
                      <div className="text-xs text-zen-text-muted dark:text-zen-dark-text-muted">
                        {poolScope === 'studied'
                          ? t('fallingWords.studiedRatio', {
                              studied: totalStudiedWordsCount,
                              total: allCatalogWords.length,
                            })
                          : `${allCatalogWords.length} ${t('srs.wordsUnit')}`}
                      </div>
                    </div>
                    {selectedPackId === 'all' && <Check className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary" />}
                  </button>

                  {VOCABULARY_PACKS.map((pack) => {
                    const stats = packStats.get(pack.id) || { studied: 0, total: pack.words.length };
                    return (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => setSelectedPackId(pack.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          selectedPackId === pack.id
                            ? 'border-zen-primary bg-zen-primary/10 dark:border-zen-dark-primary dark:bg-zen-dark-primary/10 font-bold text-zen-primary dark:text-zen-dark-primary ring-2 ring-zen-primary/20'
                            : 'border-zen-border/60 dark:border-zen-dark-border bg-zen-surface-container/50 dark:bg-zen-dark-surface-high/50 hover:border-zen-primary/40 text-zen-text dark:text-zen-dark-text'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="text-sm font-bold truncate">{pack.title[currentLang]}</div>
                          <div className="text-xs text-zen-text-muted dark:text-zen-dark-text-muted">
                            {poolScope === 'studied'
                              ? t('fallingWords.studiedRatio', {
                                  studied: stats.studied,
                                  total: stats.total,
                                })
                              : `${stats.total} ${t('srs.wordsUnit')}`}
                          </div>
                        </div>
                        {selectedPackId === pack.id && (
                          <Check className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Empty Pool Warning Banner */}
              {isPoolEmpty && (
                <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-left space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                        {totalStudiedWordsCount === 0
                          ? t('fallingWords.noStudiedWordsTotal')
                          : t('fallingWords.noStudiedWordsInPack')}
                      </h4>
                      <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                        {totalStudiedWordsCount === 0
                          ? t('fallingWords.noStudiedWordsTotalDesc')
                          : t('fallingWords.noStudiedWordsInPackDesc', {
                              pack:
                                selectedPackId === 'all'
                                  ? t('fallingWords.allPacks')
                                  : getPackById(selectedPackId)?.title[currentLang] || selectedPackId,
                            })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 pl-8">
                    {totalStudiedWordsCount === 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSelectPoolScope('all')}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{t('fallingWords.practiceAllWordsAnyway')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={onBackToDashboard}
                          className="px-3 py-1.5 rounded-xl border border-amber-600/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>{t('fallingWords.goToFlashcards')}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedPackId('all')}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{t('fallingWords.allPacks')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectPoolScope('all')}
                          className="px-3 py-1.5 rounded-xl border border-amber-600/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>{t('fallingWords.practiceAllWordsAnyway')}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Difficulty, Quick Toggles & Arcade Guide */}
            <div className="space-y-4">
              {/* Difficulty & Pacing Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-zen-text-muted dark:text-zen-dark-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>{t('fallingWords.difficultyLabel')}</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(['relaxed', 'standard', 'fast'] as DifficultyLevel[]).map((level) => {
                    const isSelected = difficulty === level;
                    const titleKey =
                      level === 'relaxed'
                        ? 'fallingWords.difficultyRelaxed'
                        : level === 'standard'
                        ? 'fallingWords.difficultyStandard'
                        : 'fallingWords.difficultyFast';
                    const descKey =
                      level === 'relaxed'
                        ? 'fallingWords.difficultyRelaxedDesc'
                        : level === 'standard'
                        ? 'fallingWords.difficultyStandardDesc'
                        : 'fallingWords.difficultyFastDesc';

                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleSelectDifficulty(level)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-zen-primary bg-zen-primary/10 dark:border-zen-dark-primary dark:bg-zen-dark-primary/10 font-bold text-zen-primary dark:text-zen-dark-primary ring-2 ring-zen-primary/20 shadow-xs'
                            : 'border-zen-border/60 dark:border-zen-dark-border bg-zen-surface-container/50 dark:bg-zen-dark-surface-high/50 hover:border-zen-primary/40 text-zen-text dark:text-zen-dark-text'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold">{t(titleKey)}</span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] font-normal leading-snug text-zen-text-muted dark:text-zen-dark-text-muted">
                            {t(descKey)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Settings Toggles */}
              <div className="p-3.5 rounded-2xl bg-zen-surface-container/40 dark:bg-zen-dark-surface-high/40 border border-zen-border/40 dark:border-zen-dark-border flex flex-wrap items-center justify-around gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={handleToggleAutoPronounce}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                    autoPronounce
                      ? 'bg-zen-primary/10 border-zen-primary/30 text-zen-primary dark:text-zen-dark-primary font-bold'
                      : 'bg-zen-surface border-zen-border/50 text-zen-text-muted'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>{t('fallingWords.autoPronounce')}</span>
                  <span className="font-mono text-[10px] uppercase font-bold">{autoPronounce ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTogglePinyin}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                    showPinyin
                      ? 'bg-zen-primary/10 border-zen-primary/30 text-zen-primary dark:text-zen-dark-primary font-bold'
                      : 'bg-zen-surface border-zen-border/50 text-zen-text-muted'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('fallingWords.showPinyin')}</span>
                  <span className="font-mono text-[10px] uppercase font-bold">{showPinyin ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleSfx}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                    sfxEnabled
                      ? 'bg-zen-primary/10 border-zen-primary/30 text-zen-primary dark:text-zen-dark-primary font-bold'
                      : 'bg-zen-surface border-zen-border/50 text-zen-text-muted'
                  }`}
                >
                  {sfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{t('fallingWords.soundEffects')}</span>
                  <span className="font-mono text-[10px] uppercase font-bold">{sfxEnabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {/* How to Play & Controls Card */}
              <div className="p-4 rounded-2xl bg-zen-surface-container/30 dark:bg-zen-dark-surface-high/30 border border-zen-border/40 text-xs text-zen-text-muted dark:text-zen-dark-text-muted space-y-2">
                <div className="font-bold text-zen-text dark:text-zen-dark-text flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary" />
                  <span>{t('fallingWords.howToPlay')}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-zen-surface border border-zen-border/60 text-zen-text dark:text-zen-dark-text font-bold">1</span>
                  <span className="px-2 py-0.5 rounded-md bg-zen-surface border border-zen-border/60 text-zen-text dark:text-zen-dark-text font-bold">2</span>
                  <span className="px-2 py-0.5 rounded-md bg-zen-surface border border-zen-border/60 text-zen-text dark:text-zen-dark-text font-bold">3</span>
                  <span className="px-2 py-0.5 rounded-md bg-zen-surface border border-zen-border/60 text-zen-text dark:text-zen-dark-text font-bold">4</span>
                  <span>{t('fallingWords.keyboardHint')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 border-t border-zen-border/40 dark:border-zen-dark-border/40">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-zen-border/60 dark:border-zen-dark-border text-sm font-bold text-zen-text dark:text-zen-dark-text hover:bg-zen-surface-container dark:hover:bg-zen-dark-surface-high transition-colors cursor-pointer"
            >
              {t('common.back')}
            </button>

            <button
              type="button"
              onClick={handleStartGame}
              disabled={isPoolEmpty}
              className={`w-full sm:w-auto px-10 py-3.5 rounded-2xl font-bold text-sm sm:text-base shadow-zen-md flex items-center justify-center gap-2 transition-all ${
                isPoolEmpty
                  ? 'bg-zen-border/60 text-zen-text-muted/60 dark:bg-zen-dark-border dark:text-zen-dark-text-muted/40 cursor-not-allowed'
                  : 'bg-zen-primary hover:bg-zen-primary-hover dark:bg-zen-dark-primary dark:hover:bg-zen-dark-primary-hover text-white cursor-pointer active:scale-[0.98]'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{t('fallingWords.startGame')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          2. IN-GAME HUD & PLAYFIELD
          ======================================================== */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <div className="flex flex-col flex-1 h-full justify-between animate-in fade-in duration-200 overflow-hidden">
          {/* Top In-Game Status Bar */}
          <div className="p-2 sm:p-3 rounded-2xl bg-zen-surface-lowest dark:bg-zen-dark-surface border border-zen-border/60 dark:border-zen-dark-border flex items-center justify-between gap-2 shadow-xs shrink-0">
            {/* Lives (Hearts) & Difficulty Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <div className="flex items-center gap-1 sm:gap-1.5">
                {[1, 2, 3].map((heartIndex) => (
                  <Heart
                    key={heartIndex}
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${
                      heartIndex <= lives
                        ? 'fill-rose-500 text-rose-500 animate-pulse'
                        : 'fill-transparent text-zen-text-muted/30 dark:text-zen-dark-text-muted/30 scale-90'
                    }`}
                  />
                ))}
              </div>

              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 text-xs font-medium text-zen-text-muted">
                <Gauge className="w-3.5 h-3.5 text-zen-primary dark:text-zen-dark-primary" />
                <span>
                  {difficulty === 'relaxed'
                    ? t('fallingWords.difficultyRelaxed').split(' ')[0]
                    : difficulty === 'standard'
                    ? t('fallingWords.difficultyStandard')
                    : t('fallingWords.difficultyFast').split(' ')[0]}
                </span>
              </span>

              <span
                className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border ${
                  poolScope === 'studied'
                    ? 'bg-zen-primary/10 border-zen-primary/30 text-zen-primary dark:text-zen-dark-primary font-bold'
                    : 'bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border-zen-border/40 text-zen-text-muted'
                }`}
              >
                {poolScope === 'studied' ? (
                  <GraduationCap className="w-3.5 h-3.5" />
                ) : (
                  <Layers className="w-3.5 h-3.5" />
                )}
                <span>
                  {poolScope === 'studied' ? t('fallingWords.studiedBadge') : t('fallingWords.allWordsBadge')}
                </span>
              </span>

              {/* Desktop Words Cleared Counter */}
              <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 text-xs font-mono font-medium text-zen-text-muted">
                <span>{t('fallingWords.wordsCleared')}:</span>
                <strong className="text-zen-text dark:text-zen-dark-text">{wordsCleared}</strong>
              </span>
            </div>

            {/* Score & Combo */}
            <div className="flex items-center gap-2 sm:gap-3 font-mono">
              {/* High Score Badge (Desktop) */}
              <div className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>BEST: {highScore.toLocaleString()}</span>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-zen-text-muted uppercase tracking-wider hidden xs:block">
                  {t('fallingWords.currentScore', { score: '' }).replace(':', '')}
                </div>
                <div className="text-base sm:text-2xl font-bold text-zen-text dark:text-zen-dark-text">
                  {score.toLocaleString()}
                </div>
              </div>

              {combo >= 2 && (
                <div className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-[11px] sm:text-xs font-bold animate-bounce">
                  <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                  <span>{comboMultiplier}x</span>
                </div>
              )}
            </div>

            {/* In-Game Controls (Audio, Pinyin, Pause) */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={handleTogglePinyin}
                title={t('fallingWords.showPinyin')}
                className={`p-1.5 sm:p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  showPinyin
                    ? 'bg-zen-primary/10 border-zen-primary/30 text-zen-primary dark:text-zen-dark-primary'
                    : 'bg-zen-surface border-zen-border/40 text-zen-text-muted'
                }`}
              >
                拼
              </button>

              <button
                type="button"
                onClick={handleToggleSfx}
                title={t('fallingWords.soundEffects')}
                className={`p-1.5 sm:p-2 rounded-xl border transition-colors cursor-pointer ${
                  sfxEnabled
                    ? 'bg-zen-primary/10 border-zen-primary/30 text-zen-primary dark:text-zen-dark-primary'
                    : 'bg-zen-surface border-zen-border/40 text-zen-text-muted'
                }`}
              >
                {sfxEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setGameState('paused');
                  audioService.stop();
                }}
                className="p-1.5 sm:p-2 rounded-xl bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text hover:bg-zen-border/30 transition-colors cursor-pointer"
                title={t('fallingWords.pause')}
              >
                <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Falling Playfield Container */}
          <div className="relative flex-1 min-h-[160px] sm:min-h-[320px] lg:min-h-[440px] my-1 sm:my-2 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-sky-500/10 via-zen-surface-lowest to-rose-500/15 dark:from-sky-950/25 dark:via-zen-dark-surface dark:to-rose-950/25 border-2 border-zen-border/70 dark:border-zen-dark-border overflow-hidden shadow-inner flex flex-col justify-between">
            {/* Ambient Arcade Grid Lines (PC & Tablet) */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.08),transparent_70%)] pointer-events-none" />

            {/* Combo Streak Watermark */}
            {combo >= 3 && (
              <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-mono font-bold text-[11px] sm:text-xs shadow-sm animate-pulse z-20">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{t('fallingWords.combo', { count: combo })}</span>
              </div>
            )}

            {/* Floor Danger Zone Line */}
            <div className="absolute bottom-0 left-0 right-0 h-9 sm:h-12 border-t-2 border-dashed border-rose-500/50 bg-gradient-to-t from-rose-500/20 to-transparent flex items-center justify-center pointer-events-none z-0">
              <span className="text-[9px] sm:text-xs font-mono font-bold tracking-widest text-rose-500/80 uppercase">
                {t('fallingWords.lives')} Line
              </span>
            </div>

            {/* Falling Word Card */}
            {currentCard && (
              <div
                style={{
                  top: `${8 + (fallProgress / 100) * 80}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute left-1/2 will-change-transform transition-colors duration-150 z-10 w-[92%] sm:w-[85%] max-w-sm sm:max-w-lg lg:max-w-xl p-3 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl shadow-zen-lg text-center border backdrop-blur-sm ${
                  feedbackState?.type === 'correct'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-4 ring-emerald-500/20 scale-105'
                    : feedbackState?.type === 'wrong' || feedbackState?.type === 'floor'
                    ? 'bg-rose-500/25 border-rose-500 text-rose-900 dark:text-rose-100 ring-4 ring-rose-500/20 scale-95 animate-shake'
                    : 'bg-zen-surface-lowest/95 dark:bg-zen-dark-surface/95 border-zen-border dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text'
                }`}
              >
                {/* Floating Gained Score Feedback */}
                {feedbackState?.type === 'correct' && feedbackState.pointsGained && (
                  <div className="absolute -top-5 sm:-top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500 text-white font-mono text-[11px] sm:text-xs font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap">
                    {t('fallingWords.scoreBonus', { points: feedbackState.pointsGained })}
                  </div>
                )}

                {/* Floor Hit / Wrong Answer Alert */}
                {feedbackState?.type === 'floor' && (
                  <div className="absolute -top-5 sm:-top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-rose-500 text-white font-mono text-[11px] sm:text-xs font-bold shadow-lg whitespace-nowrap">
                    {t('fallingWords.missedAlert')}
                  </div>
                )}
                {feedbackState?.type === 'wrong' && (
                  <div className="absolute -top-5 sm:-top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-rose-500 text-white font-mono text-[11px] sm:text-xs font-bold shadow-lg whitespace-nowrap">
                    {t('fallingWords.wrongAlert')}
                  </div>
                )}

                {/* Italian Target Word & Audio Replay Button */}
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-headline font-black tracking-tight">
                    {currentCard.word.word}
                  </h3>
                  <button
                    type="button"
                    onClick={() => playWordAudio(currentCard.word)}
                    className="p-1 sm:p-1.5 rounded-full hover:bg-zen-border/40 text-zen-primary dark:text-zen-dark-primary transition-colors cursor-pointer shrink-0"
                    title="Play pronunciation"
                  >
                    <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </button>
                </div>

                {/* Pinyin Phonetic Bridge Hint */}
                {showPinyin && currentCard.word.pinyinHint && (
                  <div className="text-xs sm:text-sm lg:text-base font-mono text-zen-text-muted dark:text-zen-dark-text-muted mt-0.5 sm:mt-1">
                    {currentCard.word.pinyinHint}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom 4-Option Multiple Choice Grid */}
          {currentCard && (
            <div className="shrink-0 space-y-1 sm:space-y-1.5">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-zen-text-muted dark:text-zen-dark-text-muted px-1 font-mono">
                <span>{t('fallingWords.typeOrSelect')}</span>
                <span className="hidden sm:inline">{t('fallingWords.keyboardHint')}</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {currentCard.options.map((opt, idx) => {
                  const isThisCorrect = idx === currentCard.correctIndex;
                  const isThisSelected = feedbackState?.selectedIndex === idx;

                  let buttonStyle =
                    'border-zen-border/60 dark:border-zen-dark-border bg-zen-surface-lowest dark:bg-zen-dark-surface text-zen-text dark:text-zen-dark-text hover:border-zen-primary/50 hover:bg-zen-surface-container/60 hover:shadow-xs';

                  if (feedbackState) {
                    if (isThisCorrect) {
                      buttonStyle =
                        'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold ring-2 ring-emerald-500/30';
                    } else if (isThisSelected && feedbackState.type === 'wrong') {
                      buttonStyle =
                        'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold ring-2 ring-rose-500/30';
                    }
                  }

                  return (
                    <button
                      key={opt.id + idx}
                      type="button"
                      disabled={feedbackState !== null}
                      onClick={() => handleSelectOption(idx)}
                      className={`p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.98] min-h-[44px] sm:min-h-[56px] lg:min-h-[64px] ${buttonStyle}`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <span className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 rounded-md sm:rounded-lg bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border font-mono text-[11px] sm:text-xs lg:text-sm font-bold flex items-center justify-center text-zen-text-muted shrink-0 shadow-xs">
                          {idx + 1}
                        </span>
                        <span className="text-xs sm:text-sm lg:text-base font-semibold leading-snug line-clamp-2">
                          {opt.translations[currentLang]}
                        </span>
                      </div>

                      {feedbackState && isThisCorrect && (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1.5" />
                      )}
                      {feedbackState && isThisSelected && feedbackState.type === 'wrong' && (
                        <X className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 ml-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          3. PAUSE OVERLAY MODAL
          ======================================================== */}
      {gameState === 'paused' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zen-surface-lowest dark:bg-zen-dark-surface rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-zen-border dark:border-zen-dark-border text-center space-y-6 shadow-zen-xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Pause className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-headline font-bold text-zen-text dark:text-zen-dark-text">
                {t('fallingWords.pausedTitle')}
              </h3>
              <p className="text-xs text-zen-text-muted dark:text-zen-dark-text-muted">
                {t('fallingWords.currentScore', { score: score.toLocaleString() })}
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleResumeGame}
                className="w-full py-3 rounded-2xl bg-zen-primary text-white font-bold text-sm shadow-zen-md hover:bg-zen-primary-hover transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t('fallingWords.resume')}</span>
              </button>

              <button
                type="button"
                onClick={handleStartGame}
                className="w-full py-3 rounded-2xl border border-zen-border/60 text-zen-text dark:text-zen-dark-text font-bold text-sm hover:bg-zen-surface-container transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('fallingWords.playAgain')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGameState('start');
                  audioService.stop();
                }}
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-zen-text-muted hover:text-zen-text transition-colors cursor-pointer"
              >
                {t('fallingWords.quit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. GAME OVER & RECAP SCREEN
          ======================================================== */}
      {gameState === 'gameover' && (
        <div className="rounded-3xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-4 sm:p-8 lg:p-10 border border-zen-border/60 dark:border-zen-dark-border space-y-6 sm:space-y-8 shadow-zen-sm animate-in fade-in duration-200">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-3xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
              <Trophy className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-headline font-bold text-zen-text dark:text-zen-dark-text">
                {t('fallingWords.gameOver')}
              </h2>
              <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted">
                {t('fallingWords.statsSummary')}
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 text-xs text-zen-text-muted font-medium">
                  <Gauge className="w-3.5 h-3.5 text-zen-primary dark:text-zen-dark-primary" />
                  <span>
                    {t('fallingWords.difficultyLabel')}:{' '}
                    <strong className="text-zen-text dark:text-zen-dark-text">
                      {difficulty === 'relaxed'
                        ? t('fallingWords.difficultyRelaxed')
                        : difficulty === 'standard'
                        ? t('fallingWords.difficultyStandard')
                        : t('fallingWords.difficultyFast')}
                    </strong>
                  </span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 text-xs text-zen-text-muted font-medium">
                  {poolScope === 'studied' ? (
                    <GraduationCap className="w-3.5 h-3.5 text-zen-primary dark:text-zen-dark-primary" />
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-zen-primary dark:text-zen-dark-primary" />
                  )}
                  <span>
                    {t('fallingWords.poolScopeLabel')}:{' '}
                    <strong className="text-zen-text dark:text-zen-dark-text">
                      {poolScope === 'studied'
                        ? t('fallingWords.poolScopeStudied')
                        : t('fallingWords.poolScopeAll')}
                    </strong>
                  </span>
                </span>
              </div>
            </div>

            {isNewHighScore && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-sm animate-bounce">
                <Sparkles className="w-4 h-4" />
                <span>{t('fallingWords.newHighScore')}</span>
              </div>
            )}
          </div>

          {/* Stats Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
            <div className="p-4 rounded-2xl bg-zen-surface-container/40 dark:bg-zen-dark-surface-high/40 border border-zen-border/40 text-center space-y-1">
              <div className="text-[11px] uppercase font-mono text-zen-text-muted">
                {t('fallingWords.finalScore')}
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono text-zen-primary dark:text-zen-dark-primary">
                {score.toLocaleString()}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zen-surface-container/40 dark:bg-zen-dark-surface-high/40 border border-zen-border/40 text-center space-y-1">
              <div className="text-[11px] uppercase font-mono text-zen-text-muted">
                {t('fallingWords.wordsCleared')}
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {wordsCleared}
              </div>
            </div>

            <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-zen-surface-container/40 dark:bg-zen-dark-surface-high/40 border border-zen-border/40 text-center space-y-1">
              <div className="text-[11px] uppercase font-mono text-zen-text-muted">
                {t('fallingWords.maxCombo')}
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono text-orange-600 dark:text-orange-400">
                {maxCombo}x
              </div>
            </div>
          </div>

          {/* Missed Words Section */}
          <div className="max-w-4xl mx-auto space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zen-text-muted dark:text-zen-dark-text-muted flex items-center justify-between">
              <span>{t('fallingWords.missedWords')}</span>
              <span className="font-mono text-[11px]">({missedWords.length})</span>
            </h4>

            {missedWords.length === 0 ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs text-center font-medium">
                {t('fallingWords.noMissedWords')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {missedWords.map((word) => (
                  <div
                    key={word.id}
                    className="p-3 rounded-2xl bg-zen-surface-container/50 dark:bg-zen-dark-surface-high/50 border border-zen-border/40 dark:border-zen-dark-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-sm text-zen-text dark:text-zen-dark-text">
                        {word.word}
                      </div>
                      <div className="text-zen-text-muted dark:text-zen-dark-text-muted">
                        {word.translations[currentLang]} {word.pinyinHint ? `· ${word.pinyinHint}` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => playWordAudio(word)}
                      className="p-2 rounded-xl bg-zen-surface hover:bg-zen-border/40 text-zen-primary dark:text-zen-dark-primary transition-colors cursor-pointer shrink-0"
                      title="Listen"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Post-Game Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 border-t border-zen-border/40 dark:border-zen-dark-border/40">
            <button
              type="button"
              onClick={() => {
                setGameState('start');
                audioService.stop();
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-zen-border/60 text-sm font-bold text-zen-text dark:text-zen-dark-text hover:bg-zen-surface-container transition-colors cursor-pointer"
            >
              {t('fallingWords.quit')}
            </button>

            <button
              type="button"
              onClick={handleStartGame}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-zen-primary hover:bg-zen-primary-hover text-white font-bold text-sm shadow-zen-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t('fallingWords.playAgain')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FallingWordsView;
