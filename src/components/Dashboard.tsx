import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  CheckSquare,
  Gamepad2,
  Sparkles,
  ArrowRight,
  Handshake,
  Compass,
  Flame,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Sliders,
  Brain,
  Clock,
  Zap,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { VOCABULARY_PACKS, getAllWords } from '../data/italianVocabulary';
import { StudyMode } from './Navbar';
import { storageService, UserStudyProgress } from '../services/storageService';
import { buildDailyQueue, SRSSettings, DailyQueueBreakdown } from '../services/srsService';
import { StudySettingsModal } from './SRS/StudySettingsModal';

interface DashboardProps {
  userId: string;
  selectedPackId: string;
  onSelectPack: (packId: string) => void;
  onSelectMode: (mode: StudyMode) => void;
  onStartSRSSession: (packId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  userId,
  selectedPackId,
  onSelectPack,
  onSelectMode,
  onStartSRSSession,
}) => {
  const { t, currentLang } = useTranslation();
  const allWords = getAllWords();

  // SRS Engine State
  const [progress, setProgress] = useState<UserStudyProgress | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [srsScope, setSrsScope] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;
    storageService.getProgress(userId).then((res) => {
      if (isMounted) {
        setProgress(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const srsWords = useMemo(() => {
    if (srsScope === 'all') return allWords;
    const pack = VOCABULARY_PACKS.find((p) => p.id === srsScope);
    return pack ? pack.words : allWords;
  }, [srsScope, allWords]);

  const queueBreakdown = useMemo<DailyQueueBreakdown>(() => {
    if (!progress) {
      return {
        dueReviews: [],
        learningCards: [],
        newCards: [],
        totalAvailable: 0,
      };
    }
    return buildDailyQueue(
      srsWords,
      progress.srs || {},
      progress.srsSettings,
      progress.srsDaily
    );
  }, [srsWords, progress]);

  const handleSaveSettings = async (newSettings: SRSSettings) => {
    const updated = await storageService.updateSRSSettings(userId, newSettings);
    setProgress({ ...updated });
  };

  const getPackIcon = (packId: string) => {
    switch (packId) {
      case 'greetings-courtesy':
        return <Handshake className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'daily-survival':
        return <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'key-verbs':
        return <Flame className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      default:
        return <BookOpen className="w-5 h-5 text-zen-primary dark:text-zen-dark-primary" />;
    }
  };

  const selectedPack = VOCABULARY_PACKS.find((p) => p.id === selectedPackId) || VOCABULARY_PACKS[0];

  return (
    <div className="space-y-6 sm:space-y-10 pb-12 sm:pb-16">
      
      {/* 1. Hero / Welcome Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-zen-surface-lowest via-zen-surface-container/50 to-zen-surface-high/30 dark:from-zen-dark-surface dark:via-zen-dark-surface-high/50 dark:to-zen-dark-surface-lowest p-4 sm:p-8 lg:p-10 border border-zen-border/60 dark:border-zen-dark-border/80 shadow-zen-md">
        <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zen-primary/10 dark:bg-zen-dark-primary/20 text-zen-primary dark:text-zen-dark-primary text-[11px] sm:text-xs font-bold tracking-wide">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{currentLang === 'zh-CN' ? '双语界面 · 拼音助读系统' : 'Bilingual UI · Pinyin Phonetic Bridge'}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-headline font-bold text-zen-text dark:text-zen-dark-text tracking-tight leading-tight">
            {t('dashboard.welcomeTitle')}
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-zen-text-muted dark:text-zen-dark-text-muted leading-relaxed">
            {t('dashboard.welcomeSubtitle')}
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-2">
            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zen-surface-lowest dark:bg-zen-dark-surface-high border border-zen-border/40 dark:border-zen-dark-border">
              <span className="text-[11px] sm:text-xs text-zen-text-muted dark:text-zen-dark-text-muted block">
                {t('dashboard.quickStats.totalCards')}
              </span>
              <span className="text-lg sm:text-2xl font-black font-mono text-zen-text dark:text-zen-dark-text">
                {allWords.length}
              </span>
            </div>

            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zen-surface-lowest dark:bg-zen-dark-surface-high border border-zen-border/40 dark:border-zen-dark-border">
              <span className="text-[11px] sm:text-xs text-zen-text-muted dark:text-zen-dark-text-muted block">
                {t('dashboard.quickStats.corePacks')}
              </span>
              <span className="text-lg sm:text-2xl font-black font-mono text-zen-text dark:text-zen-dark-text">
                {VOCABULARY_PACKS.length}
              </span>
            </div>

            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zen-surface-lowest dark:bg-zen-dark-surface-high border border-zen-border/40 dark:border-zen-dark-border">
              <span className="text-[11px] sm:text-xs text-zen-text-muted dark:text-zen-dark-text-muted block">
                {t('dashboard.quickStats.phoneticEngine')}
              </span>
              <span className="text-xs sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {t('dashboard.quickStats.phoneticEngineStatus')}
              </span>
            </div>

            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zen-surface-lowest dark:bg-zen-dark-surface-high border border-zen-border/40 dark:border-zen-dark-border">
              <span className="text-[11px] sm:text-xs text-zen-text-muted dark:text-zen-dark-text-muted block">
                {t('common.activePack')}
              </span>
              <span className="text-xs sm:text-sm font-bold text-zen-primary dark:text-zen-dark-primary truncate block mt-1">
                {selectedPack.title[currentLang]}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Today's Spaced Repetition (Anki SM-2) Hub */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-500/10 via-zen-surface-lowest to-purple-500/10 dark:from-indigo-950/40 dark:via-zen-dark-surface dark:to-purple-950/20 p-5 sm:p-7 border border-indigo-500/30 dark:border-indigo-500/40 shadow-zen-md">
        <div className="relative z-10 space-y-5">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[11px] sm:text-xs font-bold tracking-wide">
                <Brain className="w-3.5 h-3.5" />
                <span>{t('srs.srsModeActive')}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-headline font-bold text-zen-text dark:text-zen-dark-text flex items-center gap-2">
                <span>{t('srs.dailyHubTitle')}</span>
              </h2>
              <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted">
                {t('srs.dailyHubSubtitle')}
              </p>
            </div>

            {/* Scope Filter & Settings Action */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <div className="relative">
                <select
                  value={srsScope}
                  onChange={(e) => setSrsScope(e.target.value)}
                  className="text-xs font-bold py-1.5 pl-3 pr-7 rounded-xl bg-zen-surface-lowest dark:bg-zen-dark-surface border border-zen-border/70 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text cursor-pointer hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                >
                  <option value="all">{t('common.allPacks')} ({allWords.length})</option>
                  {VOCABULARY_PACKS.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.title[currentLang]} ({pack.words.length})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-xl bg-zen-surface-lowest dark:bg-zen-dark-surface border border-zen-border/70 dark:border-zen-dark-border text-zen-text hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm cursor-pointer"
                title={t('srs.settingsTitle')}
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metric Badges Grid: Due / Learn / New */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {/* 1. Due Reviews */}
            <div className="p-3 sm:p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-400 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold">{t('srs.dueBadge')}</span>
                <Clock className="w-4 h-4 opacity-75" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono">
                  {queueBreakdown.dueReviews.length}
                </span>
                <span className="text-[10px] sm:text-xs opacity-75">
                  / {progress?.srsSettings.maxReviewsPerDay || 100}
                </span>
              </div>
              <span className="text-[10px] text-zen-text-muted mt-1 hidden sm:block">
                {currentLang === 'zh-CN' ? '按记忆曲线已到期卡片' : 'Memory interval overdue'}
              </span>
            </div>

            {/* 2. Learning */}
            <div className="p-3 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold">{t('srs.learnBadge')}</span>
                <RotateCcw className="w-4 h-4 opacity-75" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono">
                  {queueBreakdown.learningCards.length}
                </span>
              </div>
              <span className="text-[10px] text-zen-text-muted mt-1 hidden sm:block">
                {currentLang === 'zh-CN' ? '1分/10分日内巩固阶段' : '1m/10m intraday steps'}
              </span>
            </div>

            {/* 3. New Cards */}
            <div className="p-3 sm:p-4 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-400 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold">{t('srs.newBadge')}</span>
                <Zap className="w-4 h-4 opacity-75" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono">
                  {queueBreakdown.newCards.length}
                </span>
                <span className="text-[10px] sm:text-xs opacity-75">
                  / {progress?.srsSettings.newCardsPerDay || 15}
                </span>
              </div>
              <span className="text-[10px] text-zen-text-muted mt-1 hidden sm:block">
                {currentLang === 'zh-CN' ? '今日新词学习配额' : 'Today intake quota'}
              </span>
            </div>
          </div>

          {/* Action Row */}
          {queueBreakdown.totalAvailable > 0 ? (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zen-text-muted">
                <span>{currentLang === 'zh-CN' ? '今日已完成：' : 'Completed today: '}</span>
                <span className="font-mono font-bold text-zen-text dark:text-zen-dark-text">
                  {progress?.srsDaily?.newCardsCompleted || 0} {t('srs.newBadge')} · {progress?.srsDaily?.reviewsCompleted || 0} {t('srs.dueBadge')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onStartSRSSession(srsScope)}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-zen-primary to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-zen-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <span>{t('srs.startDaily')} ({queueBreakdown.totalAvailable})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="pt-2 p-4 rounded-2xl bg-zen-surface-lowest dark:bg-zen-dark-surface border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-zen-text dark:text-zen-dark-text">
                    {t('srs.allCaughtUp')}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-zen-text-muted">
                    {t('srs.allCaughtUpDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-zen-surface-container dark:bg-zen-dark-surface-high text-zen-text hover:text-zen-primary transition-colors cursor-pointer"
              >
                {t('srs.settingsTitle')}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. Vocabulary Pack Selector */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 sm:gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-headline font-bold text-zen-text dark:text-zen-dark-text flex items-center gap-2">
              <span>{t('dashboard.selectPackTitle')}</span>
            </h2>
            <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted mt-0.5">
              {t('dashboard.selectPackSubtitle')}
            </p>
          </div>
          <span className="text-xs font-mono text-zen-text-muted dark:text-zen-dark-text-muted">
            {t('common.totalWords')}: {allWords.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
          {VOCABULARY_PACKS.map((pack) => {
            const isSelected = selectedPackId === pack.id;
            return (
              <div
                key={pack.id}
                onClick={() => onSelectPack(pack.id)}
                className={`group cursor-pointer rounded-2xl p-4 sm:p-6 transition-all duration-200 border text-left flex flex-col justify-between ${
                  isSelected
                    ? 'bg-zen-surface-lowest dark:bg-zen-dark-surface border-zen-primary dark:border-zen-dark-primary shadow-zen-md ring-2 ring-zen-primary/20 dark:ring-zen-dark-primary/30'
                    : 'bg-zen-surface-lowest/70 dark:bg-zen-dark-surface/60 border-zen-border/50 dark:border-zen-dark-border/60 hover:border-zen-border dark:hover:border-zen-dark-border hover:shadow-zen-sm'
                }`}
              >
                <div>
                  {/* Pack Header */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="p-2.5 rounded-xl bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/40 dark:border-zen-dark-border">
                      {getPackIcon(pack.id)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zen-surface-container dark:bg-zen-dark-surface-high text-zen-text-muted dark:text-zen-dark-text-muted">
                        {t('packs.wordsCount', { count: pack.words.length })}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-zen-primary dark:text-zen-dark-primary" />
                      )}
                    </div>
                  </div>

                  {/* Pack Title & Description */}
                  <h3 className="text-lg font-headline font-bold text-zen-text dark:text-zen-dark-text group-hover:text-zen-primary dark:group-hover:text-zen-dark-primary transition-colors">
                    {pack.title[currentLang]}
                  </h3>
                  <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted mt-1.5 leading-relaxed">
                    {pack.description[currentLang]}
                  </p>
                </div>

                {/* Sample Word Chips Preview */}
                <div className="mt-5 pt-4 border-t border-zen-border/40 dark:border-zen-dark-border/60 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zen-text-muted/80 dark:text-zen-dark-text-muted/80 block">
                    {t('common.preview')}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {pack.words.slice(0, 3).map((w) => (
                      <span
                        key={w.id}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-zen-surface-container/80 dark:bg-zen-dark-surface-high/80 text-zen-text dark:text-zen-dark-text border border-zen-border/30 dark:border-zen-dark-border/50"
                      >
                        <span className="font-bold">{w.word}</span>
                        <span className="font-mono text-[11px] text-zen-primary dark:text-zen-dark-primary">
                          [{w.pinyinHint}]
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Study Mode Selector */}
      <section className="space-y-3 sm:space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-headline font-bold text-zen-text dark:text-zen-dark-text flex items-center gap-2">
            <span>{t('dashboard.selectModeTitle')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted mt-0.5">
            {t('dashboard.selectModeSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
          
          {/* Mode 1: Flashcards */}
          <div
            onClick={() => onSelectMode('flashcards')}
            className="group cursor-pointer rounded-2xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-4 sm:p-6 border border-zen-border/60 dark:border-zen-dark-border hover:border-zen-primary dark:hover:border-zen-dark-primary shadow-zen-sm hover:shadow-zen-md transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[11px] sm:text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {t('dashboard.modes.flashcards.nativeTitle')}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-headline font-bold text-zen-text dark:text-zen-dark-text group-hover:text-zen-primary dark:group-hover:text-zen-dark-primary transition-colors">
                {t('dashboard.modes.flashcards.title')}
              </h3>

              <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted mt-1.5 sm:mt-2 leading-relaxed">
                {t('dashboard.modes.flashcards.desc')}
              </p>
            </div>

            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-zen-border/40 dark:border-zen-dark-border flex items-center justify-between text-zen-primary dark:text-zen-dark-primary font-bold text-xs sm:text-sm">
              <span>{t('dashboard.modes.flashcards.action')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Mode 2: Testing Suite */}
          <div
            onClick={() => onSelectMode('quiz')}
            className="group cursor-pointer rounded-2xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-4 sm:p-6 border border-zen-border/60 dark:border-zen-dark-border hover:border-zen-primary dark:hover:border-zen-dark-primary shadow-zen-sm hover:shadow-zen-md transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[11px] sm:text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  {t('dashboard.modes.quiz.nativeTitle')}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-headline font-bold text-zen-text dark:text-zen-dark-text group-hover:text-zen-primary dark:group-hover:text-zen-dark-primary transition-colors">
                {t('dashboard.modes.quiz.title')}
              </h3>

              <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted mt-1.5 sm:mt-2 leading-relaxed">
                {t('dashboard.modes.quiz.desc')}
              </p>
            </div>

            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-zen-border/40 dark:border-zen-dark-border flex items-center justify-between text-zen-primary dark:text-zen-dark-primary font-bold text-xs sm:text-sm">
              <span>{t('dashboard.modes.quiz.action')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Mode 3: Falling Words Arcade */}
          <div
            onClick={() => onSelectMode('fallingWords')}
            className="group cursor-pointer rounded-2xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-4 sm:p-6 border border-zen-border/60 dark:border-zen-dark-border hover:border-zen-primary dark:hover:border-zen-dark-primary shadow-zen-sm hover:shadow-zen-md transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[11px] sm:text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  {t('dashboard.modes.fallingWords.nativeTitle')}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-headline font-bold text-zen-text dark:text-zen-dark-text group-hover:text-zen-primary dark:group-hover:text-zen-dark-primary transition-colors">
                {t('dashboard.modes.fallingWords.title')}
              </h3>

              <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted mt-1.5 sm:mt-2 leading-relaxed">
                {t('dashboard.modes.fallingWords.desc')}
              </p>
            </div>

            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-zen-border/40 dark:border-zen-dark-border flex items-center justify-between text-zen-primary dark:text-zen-dark-primary font-bold text-xs sm:text-sm">
              <span>{t('dashboard.modes.fallingWords.action')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>
      </section>

      {/* 4. Phonetic Bridge Explainer Note */}
      <section className="rounded-2xl p-4 sm:p-6 bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/50 dark:border-zen-dark-border flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
          <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-xs sm:text-sm text-zen-text dark:text-zen-dark-text">
            {t('pinyinGuide.helpTitle')}
          </h4>
          <p className="text-[11px] sm:text-xs text-zen-text-muted dark:text-zen-dark-text-muted leading-relaxed">
            {t('pinyinGuide.helpDescription')}
          </p>
        </div>
      </section>

      {/* Study Settings Modal */}
      {progress && (
        <StudySettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={progress.srsSettings}
          onSave={handleSaveSettings}
        />
      )}

    </div>
  );
};

export default Dashboard;

