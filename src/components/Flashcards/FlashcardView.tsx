import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Volume2,
  Volume1,
  RotateCw,
  Shuffle,
  Sparkles,
  ArrowLeft,
  Check,
  X,
  BookOpen,
  Trophy,
  Repeat,
  ChevronDown,
  Maximize2,
  Brain,
  Sliders,
  Layers
} from 'lucide-react';
import { VOCABULARY_PACKS, getAllWords, ItalianWord } from '../../data/italianVocabulary';
import { audioService } from '../../services/audioService';
import { storageService, UserStudyProgress } from '../../services/storageService';
import {
  SRSRating,
  SRSCardState,
  DEFAULT_CARD_STATE,
  DEFAULT_SRS_SETTINGS,
  getRatingIntervalLabels,
  buildDailyQueue,
  DailyQueueBreakdown,
  SRSSettings
} from '../../services/srsService';
import { StudySettingsModal } from '../SRS/StudySettingsModal';
import { useTranslation } from '../../i18n';

interface FlashcardViewProps {
  userId: string;
  initialPackId?: string;
  isSRSMode?: boolean;
  onBackToDashboard: () => void;
  onProgressUpdated?: (progress: UserStudyProgress) => void;
}

type AnimationState = 'idle' | 'dragging' | 'snapping' | 'exiting-right' | 'exiting-left';

export const FlashcardView: React.FC<FlashcardViewProps> = ({
  userId,
  initialPackId = 'daily',
  isSRSMode = false,
  onBackToDashboard,
  onProgressUpdated,
}) => {
  const { t, currentLang } = useTranslation();

  // 1. Core State
  const [userProgress, setUserProgress] = useState<UserStudyProgress | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    isSRSMode ? 'daily' : (initialPackId || 'daily')
  );
  const [sessionQueue, setSessionQueue] = useState<ItalianWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [needPracticeIds, setNeedPracticeIds] = useState<Set<string>>(new Set());
  const [isDeckCompleted, setIsDeckCompleted] = useState<boolean>(false);

  // 2. Auxiliary View Toggles
  const [isPackDropdownOpen, setIsPackDropdownOpen] = useState<boolean>(false);
  const [isPinyinVisible, setIsPinyinVisible] = useState<boolean>(true);
  const [isShuffled, setIsShuffled] = useState<boolean>(false);
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);
  const [isReviewMistakesOnly, setIsReviewMistakesOnly] = useState<boolean>(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);
  const [activeBackTab, setActiveBackTab] = useState<'tip' | 'example'>('tip');
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // 3. Motion & Gesture Animation State
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 4. Component Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const velocityRef = useRef<{ vx: number; lastX: number; lastTime: number }>({ vx: 0, lastX: 0, lastTime: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationStateRef = useRef<AnimationState>(animationState);
  animationStateRef.current = animationState;

  // Cleanup pending animation timeouts on unmount
  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    };
  }, []);

  // Close pack dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPackDropdownOpen(false);
      }
    };
    if (isPackDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPackDropdownOpen]);

  // Sync category when props change from App/Dashboard
  useEffect(() => {
    if (isSRSMode) {
      setSelectedCategory('daily');
    } else if (initialPackId && initialPackId !== 'all') {
      setSelectedCategory(initialPackId);
    }
  }, [isSRSMode, initialPackId]);

  // Load user progress asynchronously
  useEffect(() => {
    let isMounted = true;
    storageService.getProgress(userId).then((res) => {
      if (isMounted) {
        setUserProgress(res);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const allWords = useMemo(() => getAllWords(), []);

  // Calculate daily SRS queue breakdown (Due reviews, Learning cards, New cards)
  const queueBreakdown = useMemo<DailyQueueBreakdown>(() => {
    if (!userProgress) {
      return { dueReviews: [], learningCards: [], newCards: [], totalAvailable: 0 };
    }
    return buildDailyQueue(
      allWords,
      userProgress.srs || {},
      userProgress.srsSettings || DEFAULT_SRS_SETTINGS,
      userProgress.srsDaily
    );
  }, [allWords, userProgress]);

  // Base cards available for the chosen category filter
  const baseCategoryCards = useMemo(() => {
    if (selectedCategory === 'daily') {
      return [
        ...queueBreakdown.dueReviews,
        ...queueBreakdown.learningCards,
        ...queueBreakdown.newCards,
      ];
    }
    if (selectedCategory === 'all') {
      return allWords;
    }
    const pack = VOCABULARY_PACKS.find((p) => p.id === selectedCategory);
    return pack ? pack.words : allWords;
  }, [selectedCategory, queueBreakdown, allWords]);

  // Build deck queue whenever category, shuffle, or mistake filters change
  useEffect(() => {
    if (!userProgress) return;

    if (selectedCategory === 'daily') {
      const dailyList = [
        ...queueBreakdown.dueReviews,
        ...queueBreakdown.learningCards,
        ...queueBreakdown.newCards,
      ];
      setSessionQueue(dailyList);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsDeckCompleted(dailyList.length === 0);
    } else {
      let list = [...baseCategoryCards];

      if (isReviewMistakesOnly) {
        const filtered = list.filter((w) => needPracticeIds.has(w.id));
        if (filtered.length > 0) list = filtered;
      }

      if (isShuffled) {
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
      }

      setSessionQueue(list);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsDeckCompleted(list.length === 0);
    }
  }, [
    selectedCategory,
    userProgress?.srsDaily?.date,
    isShuffled,
    shuffleSeed,
    isReviewMistakesOnly,
    queueBreakdown
  ]);

  // Current and underneath cards
  const currentCard: ItalianWord | undefined = sessionQueue[currentIndex];
  const nextCard: ItalianWord | undefined = sessionQueue[currentIndex + 1];

  // Auto-play audio on card transition or flip if enabled
  useEffect(() => {
    if (currentCard && autoPlayAudio && !isDeckCompleted && !isLoading) {
      const timer = setTimeout(() => {
        audioService.playNormal(currentCard.word);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isFlipped, currentCard?.id, autoPlayAudio, isDeckCompleted, isLoading]);

  // Reset image error and modal states on card change
  useEffect(() => {
    setImageLoadError(false);
    setIsImageModalOpen(false);
  }, [currentIndex, currentCard?.id, isFlipped]);

  // Card Flip Handler
  const handleFlipCard = useCallback(() => {
    audioService.playFlipSound();
    setIsFlipped((prev) => !prev);
  }, []);

  // SuperMemo-2 / Anki SRS Review rating trigger
  const triggerSRSRating = useCallback(
    (rating: SRSRating) => {
      if (!currentCard || animationStateRef.current !== 'idle') return;

      const isPositive = rating === 'good' || rating === 'easy';
      if (isPositive) {
        audioService.playMasteredSound();
        setMasteredIds((prev) => new Set(prev).add(currentCard.id));
        setNeedPracticeIds((prev) => {
          const next = new Set(prev);
          next.delete(currentCard.id);
          return next;
        });
      } else if (rating === 'again') {
        audioService.playReviewSound();
        setNeedPracticeIds((prev) => new Set(prev).add(currentCard.id));
      } else {
        audioService.playFlipSound();
      }

      const nextState: AnimationState = isPositive ? 'exiting-right' : 'exiting-left';
      animationStateRef.current = nextState;
      setAnimationState(nextState);

      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = setTimeout(async () => {
        // Persist review to SRS storage
        const updated = await storageService.recordSRSReview(userId, currentCard.id, rating);
        setUserProgress({ ...updated });
        if (onProgressUpdated) onProgressUpdated(updated);

        let nextQueue = sessionQueue;
        // In daily or pack mode, if card is marked 'again', queue it again for intra-session re-review
        if (rating === 'again') {
          nextQueue = [...sessionQueue, currentCard];
          setSessionQueue(nextQueue);
        }

        const nextIndex = currentIndex + 1;
        if (nextIndex < nextQueue.length) {
          setIsFlipped(false);
          setActiveBackTab('tip');
          setCurrentIndex(nextIndex);
        } else {
          setIsDeckCompleted(true);
        }

        animationStateRef.current = 'idle';
        setAnimationState('idle');
        setDragOffset({ x: 0, y: 0 });
      }, 180);
    },
    [currentCard, currentIndex, sessionQueue, userId, onProgressUpdated]
  );

  // High-speed flyout gesture trigger (Swipe Right = Good, Swipe Left = Again)
  const triggerFlyout = useCallback(
    (isMastered: boolean) => {
      triggerSRSRating(isMastered ? 'good' : 'again');
    },
    [triggerSRSRating]
  );

  // SRS Current Card State & Live Rating Interval Labels
  const currentCardSRS = useMemo<SRSCardState>(() => {
    if (!currentCard || !userProgress) return DEFAULT_CARD_STATE(currentCard?.id || '');
    return userProgress.srs[currentCard.id] || DEFAULT_CARD_STATE(currentCard.id);
  }, [currentCard, userProgress]);

  const ratingLabels = useMemo(() => {
    return getRatingIntervalLabels(currentCardSRS, currentLang);
  }, [currentCardSRS, currentLang]);

  // Reset Session Helper
  const resetSession = useCallback(() => {
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsDeckCompleted(false);
    setMasteredIds(new Set());
    setNeedPracticeIds(new Set());
    setActiveBackTab('tip');
    setImageLoadError(false);
    setIsImageModalOpen(false);
    animationStateRef.current = 'idle';
    setAnimationState('idle');
    setDragOffset({ x: 0, y: 0 });

    if (selectedCategory === 'daily') {
      const dailyList = [
        ...queueBreakdown.dueReviews,
        ...queueBreakdown.learningCards,
        ...queueBreakdown.newCards,
      ];
      setSessionQueue(dailyList);
      setIsDeckCompleted(dailyList.length === 0);
    } else {
      let list = [...baseCategoryCards];
      if (isShuffled) {
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
      }
      setSessionQueue(list);
      setIsDeckCompleted(list.length === 0);
    }
  }, [selectedCategory, queueBreakdown, baseCategoryCards, isShuffled]);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setIsReviewMistakesOnly(false);
    setIsPackDropdownOpen(false);
    resetSession();
  };

  const handleShuffleToggle = () => {
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    setIsShuffled((prev) => !prev);
    setShuffleSeed((prev) => prev + 1);
    setCurrentIndex(0);
    setIsFlipped(false);
    animationStateRef.current = 'idle';
    setAnimationState('idle');
    setDragOffset({ x: 0, y: 0 });
  };

  const handleSaveSettings = async (newSettings: SRSSettings) => {
    const updated = await storageService.updateSRSSettings(userId, newSettings);
    setUserProgress({ ...updated });
    if (onProgressUpdated) onProgressUpdated(updated);
  };

  // Keyboard Shortcuts (Space=Flip, 1=Again, 2=Hard, 3=Good, 4=Easy, W=Fast Audio, S=Slow Audio)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (isDeckCompleted) return;

      // Audio hotkeys work on both front and back
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (currentCard) audioService.playNormal(currentCard.word);
        return;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        if (currentCard) audioService.playSlow(currentCard.word);
        return;
      }

      // Space flips or shows answer
      if (e.code === 'Space') {
        e.preventDefault();
        if (animationStateRef.current === 'idle') handleFlipCard();
        return;
      }

      // If flipped, 1-4 or A/D keys rate the card
      if (isFlipped) {
        switch (e.code) {
          case 'Digit1':
          case 'Numpad1':
          case 'KeyA':
            e.preventDefault();
            if (animationStateRef.current === 'idle') triggerSRSRating('again');
            break;
          case 'Digit2':
          case 'Numpad2':
            e.preventDefault();
            if (animationStateRef.current === 'idle') triggerSRSRating('hard');
            break;
          case 'Digit3':
          case 'Numpad3':
          case 'KeyD':
            e.preventDefault();
            if (animationStateRef.current === 'idle') triggerSRSRating('good');
            break;
          case 'Digit4':
          case 'Numpad4':
            e.preventDefault();
            if (animationStateRef.current === 'idle') triggerSRSRating('easy');
            break;
          default:
            break;
        }
      } else {
        // When unflipped, ArrowLeft or A triggers 'again', ArrowRight or D triggers 'good'
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          e.preventDefault();
          if (animationStateRef.current === 'idle') triggerFlyout(false);
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          e.preventDefault();
          if (animationStateRef.current === 'idle') triggerFlyout(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlipCard, triggerSRSRating, triggerFlyout, currentCard, isDeckCompleted, isFlipped]);

  // Pointer Event Handlers for 120fps Gesture Dragging with horizontal intent lock
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (animationStateRef.current !== 'idle') return;
    if (e.button !== 0) return;

    pointerIdRef.current = e.pointerId;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { vx: 0, lastX: e.clientX, lastTime: performance.now() };
    isDraggingRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId || !dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!isDraggingRef.current) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        pointerIdRef.current = null;
        dragStartRef.current = null;
        return;
      }

      if (Math.abs(dx) > 6) {
        isDraggingRef.current = true;
        setAnimationState('dragging');
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Fallback if unsupported
        }
      }
    }

    if (isDraggingRef.current) {
      const now = performance.now();
      const dt = now - velocityRef.current.lastTime;
      if (dt > 8) {
        const instantVx = (e.clientX - velocityRef.current.lastX) / dt;
        velocityRef.current.vx = velocityRef.current.vx * 0.3 + instantVx * 0.7;
        velocityRef.current.lastX = e.clientX;
        velocityRef.current.lastTime = now;
      }
      setDragOffset({ x: dx, y: dy * 0.15 });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    const wasDragging = isDraggingRef.current;
    const dx = dragOffset.x;
    const vx = velocityRef.current.vx;

    pointerIdRef.current = null;
    dragStartRef.current = null;
    isDraggingRef.current = false;

    // Tap (<7px) flips the card
    if (!wasDragging && Math.abs(dx) < 7) {
      setAnimationState('idle');
      setDragOffset({ x: 0, y: 0 });
      handleFlipCard();
      return;
    }

    // Swiped past distance threshold (75px) OR fast flick (|vx| > 0.4 px/ms and >20px)
    const isFlickRight = vx > 0.4 && dx > 20;
    const isFlickLeft = vx < -0.4 && dx < -20;
    const isDistanceRight = dx > 75;
    const isDistanceLeft = dx < -75;

    if (isFlickRight || isDistanceRight) {
      triggerFlyout(true);
    } else if (isFlickLeft || isDistanceLeft) {
      triggerFlyout(false);
    } else {
      setAnimationState('snapping');
      setDragOffset({ x: 0, y: 0 });
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = setTimeout(() => {
        setAnimationState('idle');
      }, 180);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current === e.pointerId) {
      pointerIdRef.current = null;
      dragStartRef.current = null;
      isDraggingRef.current = false;
      setAnimationState('snapping');
      setDragOffset({ x: 0, y: 0 });
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = setTimeout(() => {
        setAnimationState('idle');
      }, 180);
    }
  };

  // Stack depth interpolation
  const stackProgress = useMemo(() => {
    if (animationState === 'exiting-right' || animationState === 'exiting-left') {
      return 1;
    }
    if (animationState === 'dragging') {
      return Math.min(1, Math.abs(dragOffset.x) / 120);
    }
    return 0;
  }, [animationState, dragOffset.x]);

  const underneathScale = 0.94 + 0.06 * stackProgress;
  const underneathTranslateY = 10 * (1 - stackProgress);
  const underneathOpacity = 0.6 + 0.4 * stackProgress;

  // Active Card Transform & Dynamic Glow Style
  const getActiveCardStyle = useCallback((): React.CSSProperties => {
    const flipAngle = isFlipped ? 180 : 0;

    if (animationState === 'dragging') {
      const tilt = dragOffset.x * 0.05;
      let glow: string | undefined = undefined;
      let borderColor: string | undefined = undefined;

      if (dragOffset.x > 15) {
        const intensity = Math.min(0.65, dragOffset.x / 100);
        glow = `0 0 28px rgba(16, 185, 129, ${intensity})`;
        borderColor = `rgba(16, 185, 129, ${Math.min(0.85, dragOffset.x / 80)})`;
      } else if (dragOffset.x < -15) {
        const intensity = Math.min(0.65, Math.abs(dragOffset.x) / 100);
        glow = `0 0 28px rgba(244, 63, 94, ${intensity})`;
        borderColor = `rgba(244, 63, 94, ${Math.min(0.85, Math.abs(dragOffset.x) / 80)})`;
      }

      return {
        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${tilt}deg) rotateY(${flipAngle}deg)`,
        transition: 'none',
        boxShadow: glow,
        borderColor,
        touchAction: 'pan-y',
      };
    }

    if (animationState === 'exiting-right') {
      return {
        transform: `translate3d(650px, ${dragOffset.y}px, 0) rotate(20deg) rotateY(${flipAngle}deg)`,
        opacity: 0,
        transition: 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 180ms ease-out',
        pointerEvents: 'none',
      };
    }

    if (animationState === 'exiting-left') {
      return {
        transform: `translate3d(-650px, ${dragOffset.y}px, 0) rotate(-20deg) rotateY(${flipAngle}deg)`,
        opacity: 0,
        transition: 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 180ms ease-out',
        pointerEvents: 'none',
      };
    }

    if (animationState === 'snapping') {
      return {
        transform: `translate3d(0px, 0px, 0) rotate(0deg) rotateY(${flipAngle}deg)`,
        opacity: 1,
        transition: 'transform 180ms cubic-bezier(0.175, 0.885, 0.32, 1.15)',
        touchAction: 'pan-y',
      };
    }

    return {
      transform: `translate3d(0px, 0px, 0) rotate(0deg) rotateY(${flipAngle}deg)`,
      opacity: 1,
      transition: 'transform 260ms cubic-bezier(0.4, 0, 0.2, 1)',
      touchAction: 'pan-y',
    };
  }, [animationState, dragOffset, isFlipped]);

  // Audio trigger handlers
  const handlePlayNormal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;
    if (currentCard.media?.audio) {
      const played = await audioService.playAudioFile(currentCard.media.audio);
      if (!played) {
        audioService.playNormal(currentCard.word);
      }
    } else {
      audioService.playNormal(currentCard.word);
    }
  };

  const handlePlaySlow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentCard) audioService.playSlow(currentCard.word);
  };

  // Unified Pack & Session Dropdown Options
  const categoryOptions = useMemo(() => {
    return [
      {
        id: 'daily',
        title: currentLang === 'zh-CN' ? '⚡ 今日智能复习 (Anki)' : "⚡ Today's Daily Queue",
        count: queueBreakdown.totalAvailable,
        isDaily: true,
      },
      {
        id: 'all',
        title: t('common.allPacks'),
        count: allWords.length,
      },
      ...VOCABULARY_PACKS.map((p) => ({
        id: p.id,
        title: p.title[currentLang],
        count: p.words.length,
      })),
    ];
  }, [queueBreakdown.totalAvailable, currentLang, allWords.length, t]);

  const currentCategoryOption =
    categoryOptions.find((c) => c.id === selectedCategory) || categoryOptions[0];

  // ==========================================
  // RENDER CONDITIONAL STATES (AFTER ALL HOOKS)
  // ==========================================

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center space-y-4 animate-in fade-in duration-200">
        <div className="w-14 h-14 mx-auto rounded-3xl bg-zen-primary/10 text-zen-primary dark:text-zen-dark-primary flex items-center justify-center shadow-zen-sm">
          <Brain className="w-7 h-7 animate-pulse" />
        </div>
        <p className="text-sm font-mono text-zen-text-muted">
          {t('common.loading')}
        </p>
      </div>
    );
  }

  // 2. Session Completed State
  if (isDeckCompleted) {
    if (selectedCategory === 'daily') {
      return (
        <div className="max-w-2xl mx-auto py-8 sm:py-14 px-4 text-center space-y-6 sm:space-y-8 animate-in fade-in duration-300">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-zen-sm">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('srs.sessionCompleteToast')}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-headline font-bold text-zen-text dark:text-zen-dark-text">
              {t('srs.allCaughtUp')}
            </h2>
            <p className="text-xs sm:text-sm text-zen-text-muted max-w-md mx-auto">
              {t('srs.allCaughtUpDesc')}
            </p>
          </div>

          {/* Daily Progress Stats Card */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 p-4 rounded-2xl bg-zen-surface-lowest dark:bg-zen-dark-surface border border-zen-border/60 dark:border-zen-dark-border shadow-zen-sm">
            <div>
              <span className="text-[11px] sm:text-xs text-zen-text-muted block">{t('srs.dueBadge')}</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                {userProgress?.srsDaily?.reviewsCompleted || 0}
              </span>
            </div>
            <div>
              <span className="text-[11px] sm:text-xs text-zen-text-muted block">{t('srs.newBadge')}</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                {userProgress?.srsDaily?.newCardsCompleted || 0}
              </span>
            </div>
            <div>
              <span className="text-[11px] sm:text-xs text-zen-text-muted block">{t('common.streak')}</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {userProgress?.stats?.streakDays || 1} 🔥
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-zen-primary to-indigo-600 text-white shadow-zen-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{currentLang === 'zh-CN' ? '返回仪表盘' : 'Return to Dashboard'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-sm bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text hover:border-zen-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>{currentLang === 'zh-CN' ? '提前学习其他词包' : 'Review Ahead / All Packs'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="w-full sm:w-auto px-4 py-3 rounded-xl font-bold text-sm bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 text-zen-text-muted hover:text-zen-text transition-all flex items-center justify-center gap-2 cursor-pointer"
              title="Daily Goals"
            >
              <Sliders className="w-4 h-4" />
              <span>{t('srs.settingsTitle')}</span>
            </button>
          </div>

          {/* Settings Modal */}
          {userProgress && (
            <StudySettingsModal
              isOpen={isSettingsModalOpen}
              onClose={() => setIsSettingsModalOpen(false)}
              settings={userProgress.srsSettings}
              onSave={handleSaveSettings}
            />
          )}
        </div>
      );
    }

    // Standard pack completion screen
    const totalDone = sessionQueue.length;
    const masteredCount = masteredIds.size;
    const needPracticeCount = needPracticeIds.size;
    const percent = totalDone > 0 ? Math.round((masteredCount / totalDone) * 100) : 100;

    return (
      <div className="max-w-2xl mx-auto py-6 sm:py-12 px-4 text-center space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-zen-sm">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <div className="space-y-1 sm:space-y-2">
          <h2 className="text-2xl sm:text-4xl font-headline font-bold text-zen-text dark:text-zen-dark-text">
            {currentLang === 'zh-CN' ? '太棒了！本组卡片学习完成！' : 'Bravo! Deck Completed!'}
          </h2>
          <p className="text-xs sm:text-sm text-zen-text-muted">
            {currentLang === 'zh-CN'
              ? `本次学习 ${totalDone} 张词卡，已巩固 ${masteredCount} 张。`
              : `You reviewed ${totalDone} cards and reinforced ${masteredCount}.`}
          </p>
        </div>

        {/* Stats Summary Card */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-2xl bg-zen-surface-lowest dark:bg-zen-dark-surface border border-zen-border/60 dark:border-zen-dark-border shadow-zen-sm">
          <div>
            <span className="text-[11px] sm:text-xs text-zen-text-muted block">{t('common.accuracy')}</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-zen-primary dark:text-zen-dark-primary">{percent}%</span>
          </div>
          <div>
            <span className="text-[11px] sm:text-xs text-zen-text-muted block">{t('common.mastered')}</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{masteredCount}</span>
          </div>
          <div>
            <span className="text-[11px] sm:text-xs text-zen-text-muted block">{t('common.needPractice')}</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">{needPracticeCount}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
          {needPracticeCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsReviewMistakesOnly(true);
                resetSession();
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-zen-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Repeat className="w-4 h-4" />
              <span>{currentLang === 'zh-CN' ? `专项巩固 (${needPracticeCount} 词)` : `Review Mistakes (${needPracticeCount})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={resetSession}
            className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-zen-primary hover:bg-zen-primary-dark text-white dark:bg-zen-dark-primary dark:text-zen-dark-on-primary transition-all shadow-zen-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>{currentLang === 'zh-CN' ? '重新刷一遍此卡组' : 'Restart Deck'}</span>
          </button>

          <button
            type="button"
            onClick={onBackToDashboard}
            className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text hover:border-zen-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{currentLang === 'zh-CN' ? '返回仪表盘' : 'Back to Dashboard'}</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Fallback when current card is not found or empty queue
  if (!currentCard) {
    if (selectedCategory === 'daily') {
      return (
        <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-zen-sm">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl sm:text-2xl font-headline font-bold text-zen-text dark:text-zen-dark-text">
              {t('srs.allCaughtUp')}
            </h3>
            <p className="text-xs sm:text-sm text-zen-text-muted max-w-md mx-auto">
              {t('srs.allCaughtUpDesc')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              className="w-full sm:w-auto px-5 py-2.5 bg-zen-primary text-white rounded-xl text-xs sm:text-sm font-bold shadow-zen-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>{currentLang === 'zh-CN' ? '浏览全部词汇' : 'Browse All Words'}</span>
            </button>
            <button
              type="button"
              onClick={onBackToDashboard}
              className="w-full sm:w-auto px-5 py-2.5 bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 text-zen-text rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('common.back')}</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-sm text-zen-text-muted">No cards available in this category.</p>
        <button
          type="button"
          onClick={() => handleCategoryChange('all')}
          className="px-4 py-2 bg-zen-primary text-white rounded-xl text-xs font-bold"
        >
          View All Cards
        </button>
      </div>
    );
  }

  const hasTip = Boolean(currentCard.pronunciationNotes);
  const hasExample = Boolean(currentCard.exampleSentence);

  // ==========================================
  // 4. MAIN ACTIVE CARD VIEWPORT & INTERACTION
  // ==========================================

  return (
    <div className="max-w-2xl mx-auto flex flex-col justify-between min-h-[calc(100vh-8.5rem)] sm:min-h-0 sm:space-y-4">
      
      {/* Top Bar: Back + Pack Dropdown Selector + Progress + Toggles */}
      <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-2xl bg-zen-surface-lowest/95 dark:bg-zen-dark-surface/95 border border-zen-border/50 dark:border-zen-dark-border shadow-zen-sm">
        
        {/* Left: Back Button & Category Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="p-1.5 sm:p-2 rounded-xl text-zen-text-muted hover:text-zen-primary dark:hover:text-zen-dark-primary hover:bg-zen-surface-container dark:hover:bg-zen-dark-surface-high transition-colors cursor-pointer"
            title={t('common.back')}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Category Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPackDropdownOpen(!isPackDropdownOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                selectedCategory === 'daily'
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
                  : 'bg-zen-surface-container/70 dark:bg-zen-dark-surface-high/70 border-zen-border/40 dark:border-zen-dark-border hover:border-zen-primary text-zen-text dark:text-zen-dark-text'
              }`}
            >
              {selectedCategory === 'daily' && <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              <span className="max-w-[120px] sm:max-w-[180px] truncate">
                {currentCategoryOption.title}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-zen-text-muted transition-transform ${isPackDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isPackDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 py-1.5 rounded-2xl bg-zen-surface-lowest dark:bg-zen-dark-surface border border-zen-border/70 dark:border-zen-dark-border shadow-zen-lg z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zen-text-muted border-b border-zen-border/30 dark:border-zen-dark-border/50">
                  {t('common.selectPack')}
                </div>
                {categoryOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleCategoryChange(opt.id)}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      selectedCategory === opt.id
                        ? 'bg-zen-primary/10 text-zen-primary dark:text-zen-dark-primary font-bold'
                        : 'text-zen-text dark:text-zen-dark-text hover:bg-zen-surface-container dark:hover:bg-zen-dark-surface-high'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      {opt.id === 'daily' && <Brain className="w-3.5 h-3.5 text-indigo-500" />}
                      {opt.title}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zen-surface-container dark:bg-zen-dark-surface-high text-zen-text-muted">
                      {opt.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center / Right: Progress Counter & Mini Progress Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-zen-text dark:text-zen-dark-text">
              {currentIndex + 1}
              <span className="text-zen-text-muted font-normal">/{sessionQueue.length}</span>
            </span>
            <div className="w-12 sm:w-20 h-1.5 rounded-full bg-zen-border/40 dark:bg-zen-dark-border overflow-hidden">
              <div
                className="h-full bg-zen-primary dark:bg-zen-dark-primary transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / (sessionQueue.length || 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Quick Action Toggles */}
          <div className="flex items-center gap-1 sm:gap-1.5 pl-1.5 sm:pl-2 border-l border-zen-border/40 dark:border-zen-dark-border">
            {/* Pinyin Toggle */}
            <button
              type="button"
              onClick={() => setIsPinyinVisible(!isPinyinVisible)}
              className={`px-2 py-1 rounded-lg font-mono font-bold text-[11px] border transition-all cursor-pointer ${
                isPinyinVisible
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'bg-zen-surface-container/50 border-zen-border/40 text-zen-text-muted'
              }`}
              title="Toggle Pinyin phonetic hint"
            >
              {currentLang === 'zh-CN' ? '拼' : 'PIN'}
            </button>

            {/* Shuffle Toggle (for non-daily lists) */}
            {selectedCategory !== 'daily' && (
              <button
                type="button"
                onClick={handleShuffleToggle}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isShuffled
                    ? 'bg-zen-primary/15 border-zen-primary text-zen-primary dark:text-zen-dark-primary'
                    : 'bg-zen-surface-container/50 border-zen-border/40 text-zen-text-muted'
                }`}
                title="Shuffle cards"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Auto-play Audio Toggle */}
            <button
              type="button"
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                autoPlayAudio
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
                  : 'bg-zen-surface-container/50 border-zen-border/40 text-zen-text-muted'
              }`}
              title={autoPlayAudio ? 'Auto Pronounce: ON' : 'Auto Pronounce: OFF'}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Zero-Scroll Card Viewport Architecture with Realistic Stack Depth */}
      <div className="w-full flex items-center justify-center my-auto py-2 sm:py-3 relative overflow-x-clip">
        <div className="perspective-1000 w-full max-w-lg h-[58vh] sm:h-[62vh] min-h-[480px] sm:min-h-[530px] max-h-[620px] relative">
          
          {/* UNDERNEATH CARD (Next card elevating smoothly into place) */}
          {nextCard ? (
            <div
              key={`underneath-${nextCard.id}`}
              style={{
                transform: `scale(${underneathScale}) translateY(${underneathTranslateY}px)`,
                opacity: underneathOpacity,
                transition:
                  animationState === 'dragging'
                    ? 'none'
                    : 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 180ms ease-out',
              }}
              className="absolute inset-0 z-0 select-none rounded-3xl border border-zen-border/70 dark:border-zen-dark-border bg-zen-surface-lowest dark:bg-zen-dark-surface shadow-zen-md p-5 sm:p-8 flex flex-col justify-between pointer-events-none"
              aria-hidden="true"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/40 text-zen-text-muted">
                  {nextCard.partOfSpeech || 'word'}
                </span>
                <div className="flex items-center gap-1.5 opacity-40">
                  <div className="p-2 rounded-xl bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/40 text-zen-text-muted">
                    <Volume2 className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="text-center my-auto py-4 space-y-2">
                <h2 className="text-3xl sm:text-5xl font-headline font-bold text-zen-text dark:text-zen-dark-text tracking-tight">
                  {nextCard.word}
                </h2>
                {nextCard.phoneticIPA && (
                  <p className="font-mono text-xs sm:text-sm text-zen-text-muted tracking-wide">
                    {nextCard.phoneticIPA}
                  </p>
                )}
              </div>

              <div className="text-center pt-2 text-[11px] text-zen-text-muted border-t border-zen-border/30 dark:border-zen-dark-border/40 flex items-center justify-center gap-1.5 opacity-50">
                <RotateCw className="w-3 h-3 text-zen-primary dark:text-zen-dark-primary" />
                <span>{currentLang === 'zh-CN' ? '点击翻转卡片查看释义与拼音' : 'Tap to reveal definition & Pinyin'}</span>
              </div>
            </div>
          ) : (
            <div
              key="underneath-completed-teaser"
              style={{
                transform: `scale(${underneathScale}) translateY(${underneathTranslateY}px)`,
                opacity: underneathOpacity,
                transition:
                  animationState === 'dragging'
                    ? 'none'
                    : 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 180ms ease-out',
              }}
              className="absolute inset-0 z-0 select-none rounded-3xl border-2 border-dashed border-amber-500/40 dark:border-amber-400/30 bg-amber-500/5 dark:bg-amber-500/10 shadow-zen-md p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-3 pointer-events-none"
              aria-hidden="true"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-zen-sm">
                <Trophy className="w-7 h-7" />
              </div>
              <p className="font-headline font-bold text-lg sm:text-xl text-zen-text dark:text-zen-dark-text">
                {currentLang === 'zh-CN' ? '即将达成卡组全掌握！' : 'Almost Finished!'}
              </p>
              <p className="text-xs text-zen-text-muted">
                {currentLang === 'zh-CN' ? '划过最后一张卡片生成统计' : 'Swipe this last card to view results'}
              </p>
            </div>
          )}

          {/* ACTIVE FOREGROUND CARD */}
          <div
            key={`active-${currentCard.id}-${currentIndex}`}
            ref={cardRef}
            style={getActiveCardStyle()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className="w-full h-full relative cursor-grab active:cursor-grabbing select-none rounded-3xl transform-style-3d z-10"
          >
            {/* FRONT OF CARD (Italian Word + Phonetics) */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg) translateZ(1px)',
              }}
              className="absolute inset-0 p-5 sm:p-8 flex flex-col justify-between backface-hidden rounded-3xl border border-zen-border/70 dark:border-zen-dark-border bg-zen-surface-lowest dark:bg-zen-dark-surface shadow-zen-lg overflow-hidden"
            >
              {/* Swipe Stamp Badge: Good (Green, Top-Right) */}
              <div
                style={{
                  opacity:
                    animationState === 'exiting-right'
                      ? 1
                      : animationState === 'dragging' && dragOffset.x > 15
                      ? Math.min(1, (dragOffset.x - 15) / 55)
                      : 0,
                  transform: `rotate(-12deg) scale(${
                    animationState === 'exiting-right'
                      ? 1.05
                      : animationState === 'dragging' && dragOffset.x > 15
                      ? 0.9 + Math.min(0.2, (dragOffset.x - 15) / 250)
                      : 0.85
                  })`,
                  transition:
                    animationState === 'dragging'
                      ? 'none'
                      : 'opacity 180ms ease-out, transform 180ms ease-out',
                }}
                className="absolute top-5 right-5 z-30 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg pointer-events-none border-2 border-emerald-300/40 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{t('srs.good')}</span>
              </div>

              {/* Swipe Stamp Badge: Again (Red, Top-Left) */}
              <div
                style={{
                  opacity:
                    animationState === 'exiting-left'
                      ? 1
                      : animationState === 'dragging' && dragOffset.x < -15
                      ? Math.min(1, (Math.abs(dragOffset.x) - 15) / 55)
                      : 0,
                  transform: `rotate(12deg) scale(${
                    animationState === 'exiting-left'
                      ? 1.05
                      : animationState === 'dragging' && dragOffset.x < -15
                      ? 0.9 + Math.min(0.2, (Math.abs(dragOffset.x) - 15) / 250)
                      : 0.85
                  })`,
                  transition:
                    animationState === 'dragging'
                      ? 'none'
                      : 'opacity 180ms ease-out, transform 180ms ease-out',
                }}
                className="absolute top-5 left-5 z-30 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-2xl bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg pointer-events-none border-2 border-rose-300/40 flex items-center gap-1.5"
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>{t('srs.again')}</span>
              </div>

              {/* Top row: Part of Speech & Audio Triggers */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/40 text-zen-text-muted">
                  {currentCard.partOfSpeech || 'word'}
                </span>

                <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={handlePlayNormal}
                    className="p-2 rounded-xl bg-zen-surface-container dark:bg-zen-dark-surface-high hover:bg-zen-primary/10 hover:text-zen-primary border border-zen-border/40 text-zen-text dark:text-zen-dark-text transition-all cursor-pointer"
                    title="Standard speed (1.0x)"
                  >
                    <Volume2 className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={handlePlaySlow}
                    className="p-2 rounded-xl bg-zen-surface-container dark:bg-zen-dark-surface-high hover:bg-amber-500/10 hover:text-amber-600 border border-zen-border/40 text-zen-text dark:text-zen-dark-text transition-all cursor-pointer"
                    title="Slow phonetics (0.8x)"
                  >
                    <Volume1 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </button>
                </div>
              </div>

              {/* Center: Italian Word + IPA */}
              <div className="text-center my-auto py-4 space-y-2">
                <h2 className="text-3xl sm:text-5xl font-headline font-bold text-zen-text dark:text-zen-dark-text tracking-tight">
                  {currentCard.word}
                </h2>
                {currentCard.phoneticIPA && (
                  <p className="font-mono text-xs sm:text-sm text-zen-text-muted tracking-wide">
                    {currentCard.phoneticIPA}
                  </p>
                )}
              </div>

              {/* Bottom: Subtle interaction cue */}
              <div className="text-center pt-2 text-[11px] text-zen-text-muted border-t border-zen-border/30 dark:border-zen-dark-border/40 flex items-center justify-center gap-1.5">
                <RotateCw className="w-3 h-3 text-zen-primary dark:text-zen-dark-primary" />
                <span>{currentLang === 'zh-CN' ? '点击翻转卡片查看释义与拼音' : 'Tap to reveal definition & Pinyin'}</span>
              </div>
            </div>

            {/* BACK OF CARD with Segmented Details & Set-Size Image */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg) translateZ(1px)',
              }}
              className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between backface-hidden rounded-3xl border border-zen-border/70 dark:border-zen-dark-border bg-zen-surface-lowest dark:bg-zen-dark-surface shadow-zen-lg overflow-hidden"
            >
              {/* Swipe Stamp Badge: Good (Green, displayed on screen Top-Right under rotateY-180) */}
              <div
                style={{
                  opacity:
                    animationState === 'exiting-right'
                      ? 1
                      : animationState === 'dragging' && dragOffset.x > 15
                      ? Math.min(1, (dragOffset.x - 15) / 55)
                      : 0,
                  transform: `rotate(12deg) scale(${
                    animationState === 'exiting-right'
                      ? 1.05
                      : animationState === 'dragging' && dragOffset.x > 15
                      ? 0.9 + Math.min(0.2, (dragOffset.x - 15) / 250)
                      : 0.85
                  })`,
                  transition:
                    animationState === 'dragging'
                      ? 'none'
                      : 'opacity 180ms ease-out, transform 180ms ease-out',
                }}
                className="absolute top-5 left-5 z-30 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg pointer-events-none border-2 border-emerald-300/40 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{t('srs.good')}</span>
              </div>

              {/* Swipe Stamp Badge: Again (Red, displayed on screen Top-Left under rotateY-180) */}
              <div
                style={{
                  opacity:
                    animationState === 'exiting-left'
                      ? 1
                      : animationState === 'dragging' && dragOffset.x < -15
                      ? Math.min(1, (Math.abs(dragOffset.x) - 15) / 55)
                      : 0,
                  transform: `rotate(-12deg) scale(${
                    animationState === 'exiting-left'
                      ? 1.05
                      : animationState === 'dragging' && dragOffset.x < -15
                      ? 0.9 + Math.min(0.2, (Math.abs(dragOffset.x) - 15) / 250)
                      : 0.85
                  })`,
                  transition:
                    animationState === 'dragging'
                      ? 'none'
                      : 'opacity 180ms ease-out, transform 180ms ease-out',
                }}
                className="absolute top-5 right-5 z-30 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-2xl bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg pointer-events-none border-2 border-rose-300/40 flex items-center gap-1.5"
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>{t('srs.again')}</span>
              </div>
              
              {/* Top row: Word Echo + Audio + Pinyin */}
              <div className="flex items-center justify-between pb-2 border-b border-zen-border/30 dark:border-zen-dark-border/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-headline font-bold text-zen-text dark:text-zen-dark-text">
                    {currentCard.word}
                  </span>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={handlePlayNormal}
                    className="p-1 rounded-lg text-zen-primary hover:bg-zen-primary/10 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isPinyinVisible && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200">
                    <span className="text-[9px] font-bold uppercase tracking-wider">拼音:</span>
                    <span className="font-mono font-bold text-xs tracking-wide">[{currentCard.pinyinHint}]</span>
                  </div>
                )}
              </div>

              {/* Middle: Card Body with Centered Translation, Fixed Image & Tabs */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-1.5 sm:py-2 scrollbar-none flex flex-col justify-center">
                <div className="space-y-3 sm:space-y-3.5 my-auto">
                  {/* 1. Primary Definitions (Centered above image) */}
                  <div className="text-center space-y-0.5 sm:space-y-1">
                    <div className="inline-block mb-0.5">
                      <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/40 text-zen-text-muted">
                        {currentCard.partOfSpeech || 'word'}
                      </span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-zen-text dark:text-zen-dark-text leading-tight">
                      {currentLang === 'zh-CN' ? currentCard.translations['zh-CN'] : currentCard.translations.en}
                    </p>
                    <p className="text-xs sm:text-sm text-zen-text-muted">
                      {currentLang === 'zh-CN' ? currentCard.translations.en : currentCard.translations['zh-CN']}
                    </p>
                  </div>

                  {/* 2. Set-size Image Container (Under translation, centered square) */}
                  {currentCard.media?.image && !imageLoadError && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsImageModalOpen(true);
                      }}
                      className="w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-2xl overflow-hidden border border-zen-border/50 dark:border-zen-dark-border/70 shadow-sm flex-shrink-0 bg-zen-surface-container/30 flex items-center justify-center p-1.5 relative cursor-pointer group hover:scale-[1.02] active:scale-95 transition-all"
                      title={currentLang === 'zh-CN' ? '点击查看大图' : 'Click to enlarge'}
                    >
                      <img
                        src={currentCard.media.image}
                        alt={currentCard.word}
                        onError={() => setImageLoadError(true)}
                        className="w-full h-full object-contain rounded-xl select-none pointer-events-none"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-2xl">
                        <Maximize2 className="w-4 h-4 drop-shadow" />
                      </div>
                    </div>
                  )}

                  {/* 3. Segmented Detail Tabs & Content (Phonetic Tip & Example) */}
                  {(hasTip || hasExample) && (
                    <div className="space-y-1.5 sm:space-y-2 max-w-sm sm:max-w-md mx-auto w-full">
                      {hasTip && hasExample ? (
                        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/40 text-[11px] font-bold" onPointerDown={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveBackTab('tip');
                            }}
                            className={`flex-1 py-1 px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              activeBackTab === 'tip'
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-sm'
                                : 'text-zen-text-muted hover:text-zen-text'
                            }`}
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>{currentLang === 'zh-CN' ? '发音秘诀' : 'Phonetic Tip'}</span>
                          </button>
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveBackTab('example');
                            }}
                            className={`flex-1 py-1 px-2 rounded-lg text-center transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              activeBackTab === 'example'
                                ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 shadow-sm'
                                : 'text-zen-text-muted hover:text-zen-text'
                            }`}
                          >
                            <BookOpen className="w-3 h-3 text-blue-500" />
                            <span>{currentLang === 'zh-CN' ? '实用例句' : 'Example'}</span>
                          </button>
                        </div>
                      ) : null}

                      {/* Segment Content */}
                      {((activeBackTab === 'tip' && hasTip) || (!hasExample && hasTip)) && currentCard.pronunciationNotes && (
                        <div
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 sm:p-2.5 rounded-xl bg-zen-surface-container/70 dark:bg-zen-dark-surface-high/70 border border-zen-border/40 text-xs text-zen-text-muted leading-relaxed"
                        >
                          {!hasExample && (
                            <span className="font-bold text-zen-text dark:text-zen-dark-text flex items-center justify-center gap-1 mb-0.5">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>{currentLang === 'zh-CN' ? '发音秘诀' : 'Phonetic Tip'}</span>
                            </span>
                          )}
                          <p className="line-clamp-3 text-center sm:text-left">
                            {currentCard.pronunciationNotes[currentLang]}
                          </p>
                        </div>
                      )}

                      {((activeBackTab === 'example' && hasExample) || (!hasTip && hasExample)) && currentCard.exampleSentence && (
                        <div
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 sm:p-2.5 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-xs space-y-0.5 text-center sm:text-left"
                        >
                          <p className="font-headline font-bold text-zen-text dark:text-zen-dark-text text-xs sm:text-sm line-clamp-2">
                            "{currentCard.exampleSentence.it}"
                          </p>
                          <p className="text-zen-text-muted text-[11px] line-clamp-1">
                            {currentCard.exampleSentence[currentLang]}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom: Return to front cue */}
              <div className="text-center pt-1.5 text-[11px] text-zen-text-muted border-t border-zen-border/30 dark:border-zen-dark-border/40 flex-shrink-0">
                {currentLang === 'zh-CN' ? '再次点击翻回正面' : 'Tap to flip back'}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 5. Sticky Bottom Action Bar with 4 Anki SM-2 Rating Buttons */}
      <div className="sticky bottom-0 left-0 right-0 z-30 pt-2 pb-3 sm:py-2 bg-zen-surface/90 dark:bg-zen-dark-bg/90 sm:bg-transparent sm:dark:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-zen-border/40 sm:border-0">
        <div className="max-w-lg mx-auto px-1 sm:px-0">
          {!isFlipped ? (
            /* When card is unflipped: full-width "Show Answer / Flip (Space)" button */
            <button
              type="button"
              disabled={animationState !== 'idle'}
              onClick={handleFlipCard}
              className="w-full h-12 rounded-2xl font-bold text-xs sm:text-sm bg-zen-primary hover:bg-zen-primary-dark text-white dark:bg-zen-dark-primary dark:text-zen-dark-on-primary transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-zen-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Show Answer (Space)"
            >
              <RotateCw className="w-4 h-4" />
              <span>{currentLang === 'zh-CN' ? '查看答案 / 翻转 (空格)' : 'Show Answer / Flip (Space)'}</span>
            </button>
          ) : (
            /* When card is flipped: 4 Anki Rating Buttons with live interval previews */
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {/* 1. Again */}
              <button
                type="button"
                disabled={animationState !== 'idle'}
                onClick={() => triggerSRSRating('again')}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Again (Key 1 or A)"
              >
                <span className="font-mono text-[10px] font-bold text-rose-600 dark:text-rose-300">
                  {ratingLabels.again}
                </span>
                <span className="font-bold text-xs flex items-center gap-0.5 mt-0.5">
                  {t('srs.again')}
                  <span className="text-[10px] opacity-60 font-mono">(1)</span>
                </span>
              </button>

              {/* 2. Hard */}
              <button
                type="button"
                disabled={animationState !== 'idle'}
                onClick={() => triggerSRSRating('hard')}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Hard (Key 2)"
              >
                <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-300">
                  {ratingLabels.hard}
                </span>
                <span className="font-bold text-xs flex items-center gap-0.5 mt-0.5">
                  {t('srs.hard')}
                  <span className="text-[10px] opacity-60 font-mono">(2)</span>
                </span>
              </button>

              {/* 3. Good */}
              <button
                type="button"
                disabled={animationState !== 'idle'}
                onClick={() => triggerSRSRating('good')}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Good (Key 3 or D)"
              >
                <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-300">
                  {ratingLabels.good}
                </span>
                <span className="font-bold text-xs flex items-center gap-0.5 mt-0.5">
                  {t('srs.good')}
                  <span className="text-[10px] opacity-60 font-mono">(3)</span>
                </span>
              </button>

              {/* 4. Easy */}
              <button
                type="button"
                disabled={animationState !== 'idle'}
                onClick={() => triggerSRSRating('easy')}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Easy (Key 4)"
              >
                <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                  {ratingLabels.easy}
                </span>
                <span className="font-bold text-xs flex items-center gap-0.5 mt-0.5">
                  {t('srs.easy')}
                  <span className="text-[10px] opacity-60 font-mono">(4)</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Image Preview Modal */}
      {isImageModalOpen && currentCard?.media?.image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative max-w-sm sm:max-w-md w-full bg-zen-surface-lowest dark:bg-zen-dark-surface rounded-3xl p-5 shadow-2xl border border-zen-border/40 dark:border-zen-dark-border flex flex-col space-y-3 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zen-border/30 dark:border-zen-dark-border/40">
              <div>
                <h3 className="font-headline font-bold text-xl text-zen-text dark:text-zen-dark-text">
                  {currentCard.word}
                </h3>
                <p className="text-xs text-zen-text-muted">
                  {currentCard.translations[currentLang]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-zen-surface-container dark:hover:bg-zen-dark-surface-high text-zen-text-muted hover:text-zen-text transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full max-h-[50vh] rounded-2xl overflow-hidden bg-zen-surface-container/20 flex items-center justify-center p-2">
              <img
                src={currentCard.media.image}
                alt={currentCard.word}
                className="max-h-[48vh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>
            {currentCard.media.attribution && (
              <p className="text-[10px] text-zen-text-muted text-center">
                {currentCard.media.attribution}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Study Settings Modal */}
      {userProgress && (
        <StudySettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={userProgress.srsSettings}
          onSave={handleSaveSettings}
        />
      )}

    </div>
  );
};

export default FlashcardView;
