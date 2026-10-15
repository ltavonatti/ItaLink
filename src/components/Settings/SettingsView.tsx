import React, { useState, useEffect } from 'react';
import {
  Settings,
  ArrowLeft,
  User,
  Brain,
  Sparkles,
  AlertTriangle,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Globe,
  CheckCircle2,
  X,
  Award,
  Cloud,
  RefreshCw,
  Database
} from 'lucide-react';
import { useTranslation } from '../../i18n';
import { UserAccount, authService } from '../../services/authService';
import { storageService, UserStudyProgress } from '../../services/storageService';
import cloudService, { CloudSyncStatus } from '../../services/cloudService';
import { themeService, ThemeMode } from '../../services/themeService';
import { audioService } from '../../services/audioService';
import { getAllWords } from '../../data/italianVocabulary';

interface SettingsViewProps {
  userId: string;
  onBackToDashboard: () => void;
  onProgressUpdated?: (newProgress: UserStudyProgress) => void;
  onOpenSyncModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userId,
  onBackToDashboard,
  onProgressUpdated,
  onOpenSyncModal,
}) => {
  const { t, currentLang, toggleLanguage } = useTranslation();
  const allWords = getAllWords();
  const totalLibraryWords = allWords.length;

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => authService.getCurrentUser());
  const [progress, setProgress] = useState<UserStudyProgress | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => themeService.getTheme());
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => audioService.isSfxEnabled());

  // Form state for SRS settings
  const [newCardsPerDay, setNewCardsPerDay] = useState<number>(15);
  const [maxReviewsPerDay, setMaxReviewsPerDay] = useState<number>(50);
  const [dayCutoffHour, setDayCutoffHour] = useState<number>(4);
  const [randomizeNewCards, setRandomizeNewCards] = useState<boolean>(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Danger Zone Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetConfirmInput, setResetConfirmInput] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccessToast, setResetSuccessToast] = useState<boolean>(false);

  // Cloud Sync state
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(() => cloudService.getStatus().status);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>(() => cloudService.getStatus().message);
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  // Load progress
  useEffect(() => {
    let mounted = true;
    storageService.getProgress(userId).then((res) => {
      if (mounted) {
        setProgress(res);
        if (res.srsSettings) {
          setNewCardsPerDay(res.srsSettings.newCardsPerDay || 15);
          setMaxReviewsPerDay(res.srsSettings.maxReviewsPerDay || 50);
          setDayCutoffHour(res.srsSettings.dayCutoffHour || 4);
          setRandomizeNewCards(res.srsSettings.randomizeNewCards ?? true);
        }
      }
    });

    const unsubTheme = themeService.subscribe((m) => setTheme(m));
    const unsubAuth = authService.subscribe((u) => setCurrentUser(u));
    const unsubCloud = cloudService.onSyncStatusChange((st, msg) => {
      setSyncStatus(st);
      setSyncStatusMessage(msg || '');
    });

    return () => {
      mounted = false;
      unsubTheme();
      unsubAuth();
      unsubCloud();
    };
  }, [userId]);

  const handleToggleTheme = () => {
    audioService.playClick();
    const next = themeService.toggleTheme();
    setTheme(next);
  };

  const handleToggleSfx = () => {
    const next = audioService.toggleSfx();
    setSfxEnabled(next);
    if (next) audioService.playClick();
  };

  const handleSaveSRSSettings = async () => {
    audioService.playClick();
    const updated = await storageService.updateSRSSettings(userId, {
      newCardsPerDay,
      maxReviewsPerDay,
      dayCutoffHour,
      randomizeNewCards,
    });
    setProgress(updated);
    if (onProgressUpdated) onProgressUpdated(updated);

    setSaveSuccessMsg(t('srs.savedSuccess'));
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 3000);
  };

  const handleOpenResetModal = () => {
    audioService.playClick();
    setResetConfirmInput('');
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = async () => {
    if (resetConfirmInput.trim().toUpperCase() !== 'RESET') {
      return;
    }

    try {
      setIsResetting(true);
      const freshProgress = await storageService.resetProgress(userId);
      setProgress(freshProgress);
      if (onProgressUpdated) onProgressUpdated(freshProgress);

      audioService.playComplete();
      setIsResetModalOpen(false);
      setResetConfirmInput('');
      setResetSuccessToast(true);

      setTimeout(() => {
        setResetSuccessToast(false);
      }, 5000);
    } catch (err) {
      console.error('Failed to reset progress:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSyncNow = async () => {
    audioService.playClick();
    setIsSyncingNow(true);
    setSyncSuccessToast(null);
    try {
      const updated = await storageService.syncWithCloud(userId);
      setProgress(updated);
      if (onProgressUpdated) onProgressUpdated(updated);
      setSyncSuccessToast(t('settings.syncSuccess'));
      audioService.playComplete();
      setTimeout(() => {
        setSyncSuccessToast(null);
      }, 4000);
    } catch (err: any) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Compute live library stats
  const masteredCount = progress?.stats?.masteredCount || 0;
  const learningCount = progress?.stats?.needPracticeCount || 0;
  const unseenCount = Math.max(0, totalLibraryWords - (masteredCount + learningCount));
  const masteryPercentage = totalLibraryWords > 0 ? Math.round((masteredCount / totalLibraryWords) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* 1. Header & Navigation Sub-Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zen-border/40 dark:border-zen-dark-border">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-zen-text-muted dark:text-zen-dark-text-muted hover:text-zen-primary dark:hover:text-zen-dark-primary transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('settings.backToDashboard')}</span>
        </button>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-zen-primary/10 dark:bg-zen-dark-primary/20 text-zen-primary dark:text-zen-dark-primary border border-zen-primary/20">
            <Settings className="w-3.5 h-3.5" />
            <span>ItaLink v1.0</span>
          </span>
        </div>
      </div>

      {/* Main Title Section */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-headline font-bold text-zen-text dark:text-zen-dark-text tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-zen-primary dark:text-zen-dark-primary" />
          <span>{t('settings.title')}</span>
        </h1>
        <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Toast Notification after Reset */}
      {resetSuccessToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{t('settings.resetSuccessToast')}</span>
          </div>
          <button
            type="button"
            onClick={() => setResetSuccessToast(false)}
            className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Active User Profile Section */}
      <section className="rounded-2xl sm:rounded-3xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-5 sm:p-6 border border-zen-border/60 dark:border-zen-dark-border shadow-zen-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zen-text-muted">
          <User className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary" />
          <span>{t('settings.profileSection')}</span>
        </div>

        {currentUser && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 dark:border-zen-dark-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zen-primary to-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-headline font-bold text-base text-zen-text dark:text-zen-dark-text">
                    {currentUser.displayName || currentUser.username}
                  </span>
                  {currentUser.isGuest ? (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Guest Account
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      Standard
                    </span>
                  )}
                </div>
                <span className="text-xs text-zen-text-muted dark:text-zen-dark-text-muted">
                  {currentUser.email}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono text-zen-text-muted">
              <span>ID: <code className="bg-zen-surface-lowest dark:bg-zen-dark-surface px-1.5 py-0.5 rounded border border-zen-border/40">{currentUser.id.substring(0, 12)}...</code></span>
            </div>
          </div>
        )}
      </section>

      {/* 2.5 Cloud Synchronization & Remote Backup */}
      <section className="rounded-2xl sm:rounded-3xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-5 sm:p-6 border border-zen-border/60 dark:border-zen-dark-border shadow-zen-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zen-text-muted">
            <Cloud className="w-4 h-4 text-sky-500" />
            <span>{t('settings.syncSection')}</span>
          </div>

          {/* Live Status Indicator */}
          <div className="flex items-center">
            {syncStatus === 'synced' && (
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{currentLang === 'zh-CN' ? '已云端同步' : 'Cloud Synced'}</span>
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
                <RefreshCw className="w-3 h-3 animate-spin text-sky-500" />
                <span>{currentLang === 'zh-CN' ? '正在同步...' : 'Syncing...'}</span>
              </span>
            )}
            {syncStatus === 'offline' && (
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{currentLang === 'zh-CN' ? '网络离线' : 'Offline'}</span>
              </span>
            )}
            {(syncStatus === 'disconnected' || syncStatus === 'error') && (
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-stone-500 dark:text-stone-400 bg-stone-500/10 border border-stone-500/20 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-stone-400" />
                <span>{currentLang === 'zh-CN' ? '本地存储模式' : 'Local Storage'}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 dark:border-zen-dark-border">
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-zen-text dark:text-zen-dark-text flex items-center gap-2">
              <Database className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary" />
              <span>Supabase Cloud BaaS</span>
            </h4>
            <p className="text-[11px] sm:text-xs text-zen-text-muted dark:text-zen-dark-text-muted">
              {currentUser?.isGuest
                ? t('settings.guestSyncWarning')
                : (syncStatusMessage || t('settings.syncSubtitle'))}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncingNow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zen-primary text-white text-xs font-bold hover:bg-zen-primary-dark transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
              <span>{isSyncingNow ? t('common.loading') : t('settings.syncNow')}</span>
            </button>

            {onOpenSyncModal && (
              <button
                type="button"
                onClick={() => {
                  audioService.playClick();
                  onOpenSyncModal();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zen-surface-lowest dark:bg-zen-dark-surface text-zen-text dark:text-zen-dark-text border border-zen-border/60 dark:border-zen-dark-border text-xs font-bold hover:border-zen-primary transition-all cursor-pointer shadow-sm"
              >
                <Settings className="w-3.5 h-3.5 text-zen-text-muted" />
                <span>{t('settings.advancedSync')}</span>
              </button>
            )}
          </div>
        </div>

        {syncSuccessToast && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{syncSuccessToast}</span>
          </div>
        )}
      </section>

      {/* 3. Learning Progress & SRS Records Overview */}
      <section className="rounded-2xl sm:rounded-3xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-5 sm:p-6 border border-zen-border/60 dark:border-zen-dark-border shadow-zen-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zen-text-muted">
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{t('settings.statsSection')}</span>
          </div>

          <span className="text-xs font-mono font-bold text-zen-primary dark:text-zen-dark-primary">
            {masteryPercentage}% {currentLang === 'zh-CN' ? '总掌握率' : 'Mastered'}
          </span>
        </div>

        {/* Mastered Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 rounded-full bg-zen-surface-container dark:bg-zen-dark-surface-high overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(masteredCount / totalLibraryWords) * 100}%` }}
              title={`Mastered: ${masteredCount}`}
            />
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${(learningCount / totalLibraryWords) * 100}%` }}
              title={`Learning: ${learningCount}`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-zen-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>{t('settings.statsMastered')}: {masteredCount}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>{t('settings.statsLearning')}: {learningCount}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              <span>{t('settings.statsUnseen')}: {unseenCount}</span>
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 dark:border-zen-dark-border">
            <span className="text-xs text-zen-text-muted block">{t('settings.statsTotalWords')}</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-zen-text dark:text-zen-dark-text mt-1 block">
              {totalLibraryWords}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
            <span className="text-xs block opacity-85">{t('settings.statsMastered')}</span>
            <span className="text-xl sm:text-2xl font-black font-mono mt-1 block">
              {masteredCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300">
            <span className="text-xs block opacity-85">{t('settings.statsStreak')}</span>
            <span className="text-xl sm:text-2xl font-black font-mono mt-1 block">
              {progress?.stats?.streakDays || 0} {currentLang === 'zh-CN' ? '天' : 'days'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/30 text-indigo-800 dark:text-indigo-300">
            <span className="text-xs block opacity-85">{t('settings.statsTotalReviews')}</span>
            <span className="text-xl sm:text-2xl font-black font-mono mt-1 block">
              {progress?.stats?.totalReviews || 0}
            </span>
          </div>
        </div>
      </section>

      {/* 4. Spaced Repetition (SRS) Engine Quotas */}
      <section className="rounded-2xl sm:rounded-3xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-5 sm:p-6 border border-zen-border/60 dark:border-zen-dark-border shadow-zen-sm space-y-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zen-text-muted">
          <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>{t('settings.studySection')}</span>
        </div>

        {/* Daily Goal Quota */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs sm:text-sm font-bold text-zen-text dark:text-zen-dark-text block">
                {t('srs.newCardsPerDay')}
              </label>
              <p className="text-[11px] sm:text-xs text-zen-text-muted">
                {currentLang === 'zh-CN' ? '每日计划吸纳学习的全新意大利语单词数量。' : 'Number of brand new Italian words to introduce in daily sessions.'}
              </p>
            </div>
            <span className="text-base sm:text-lg font-mono font-black text-indigo-600 dark:text-indigo-400">
              {newCardsPerDay} {t('srs.wordsUnit')}
            </span>
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 15, 25].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setNewCardsPerDay(preset)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  newCardsPerDay === preset
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-zen-surface-container dark:bg-zen-dark-surface-high border-zen-border/40 text-zen-text hover:border-indigo-400'
                }`}
              >
                {preset} {t('srs.wordsUnit')}
              </button>
            ))}
          </div>
        </div>

        {/* Max Reviews Per Day */}
        <div className="space-y-2 pt-3 border-t border-zen-border/30 dark:border-zen-dark-border/60">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs sm:text-sm font-bold text-zen-text dark:text-zen-dark-text block">
                {t('srs.maxReviewsPerDay')}
              </label>
              <p className="text-[11px] sm:text-xs text-zen-text-muted">
                {currentLang === 'zh-CN' ? '每日复习卡片的最大配额上限，防止复习负担过重。' : 'Maximum number of due review cards to schedule each day.'}
              </p>
            </div>
            <span className="text-sm sm:text-base font-mono font-bold text-zen-text dark:text-zen-dark-text">
              {maxReviewsPerDay}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[20, 35, 50, 100].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setMaxReviewsPerDay(preset)}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  maxReviewsPerDay === preset
                    ? 'bg-zen-primary text-white border-zen-primary'
                    : 'bg-zen-surface-container dark:bg-zen-dark-surface-high border-zen-border/40 text-zen-text hover:border-zen-primary'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Day Rollover Cutoff Hour */}
        <div className="space-y-2 pt-3 border-t border-zen-border/30 dark:border-zen-dark-border/60">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs sm:text-sm font-bold text-zen-text dark:text-zen-dark-text block">
                {t('srs.dayCutoffHour')}
              </label>
              <p className="text-[11px] sm:text-xs text-zen-text-muted">
                {t('srs.dayCutoffDesc')}
              </p>
            </div>
            <span className="text-xs sm:text-sm font-mono font-bold px-2 py-1 rounded-lg bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/40">
              {dayCutoffHour}:00 AM
            </span>
          </div>
        </div>

        {/* Randomize intake order toggle */}
        <div className="pt-3 border-t border-zen-border/30 dark:border-zen-dark-border/60 flex items-center justify-between">
          <div className="pr-4">
            <span className="text-xs sm:text-sm font-bold text-zen-text dark:text-zen-dark-text block">
              {t('srs.randomizeOrder')}
            </span>
            <p className="text-[11px] sm:text-xs text-zen-text-muted">
              {t('srs.randomizeOrderDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRandomizeNewCards(!randomizeNewCards)}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              randomizeNewCards ? 'bg-zen-primary dark:bg-zen-dark-primary' : 'bg-stone-300 dark:bg-stone-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                randomizeNewCards ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Save Button Row */}
        <div className="pt-3 flex items-center justify-between">
          {saveSuccessMsg && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{saveSuccessMsg}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveSRSSettings}
            className="ml-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
          >
            {t('srs.saveSettings')}
          </button>
        </div>
      </section>

      {/* 5. Appearance & Audio Preferences */}
      <section className="rounded-2xl sm:rounded-3xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-5 sm:p-6 border border-zen-border/60 dark:border-zen-dark-border shadow-zen-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zen-text-muted">
          <Sparkles className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary" />
          <span>{t('settings.appearanceSection')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="p-4 rounded-2xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 dark:border-zen-dark-border hover:border-zen-primary dark:hover:border-zen-dark-primary text-left transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] text-zen-text-muted block">{t('settings.languageLabel')}</span>
              <span className="text-sm font-bold text-zen-text dark:text-zen-dark-text mt-0.5 block">
                {currentLang === 'zh-CN' ? '简体中文 (zh-CN)' : 'English (en)'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-zen-surface-lowest dark:bg-zen-dark-surface flex items-center justify-center text-zen-primary">
              <Globe className="w-4 h-4" />
            </div>
          </button>

          {/* Theme Mode Toggle */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="p-4 rounded-2xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 dark:border-zen-dark-border hover:border-zen-primary dark:hover:border-zen-dark-primary text-left transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] text-zen-text-muted block">{t('settings.themeLabel')}</span>
              <span className="text-sm font-bold text-zen-text dark:text-zen-dark-text mt-0.5 block">
                {theme === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-zen-surface-lowest dark:bg-zen-dark-surface flex items-center justify-center">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </div>
          </button>

          {/* Sound Effects Toggle */}
          <button
            type="button"
            onClick={handleToggleSfx}
            className="p-4 rounded-2xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 dark:border-zen-dark-border hover:border-zen-primary dark:hover:border-zen-dark-primary text-left transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] text-zen-text-muted block">{t('settings.sfxLabel')}</span>
              <span className="text-sm font-bold text-zen-text dark:text-zen-dark-text mt-0.5 block">
                {sfxEnabled ? t('settings.sfxOn') : t('settings.sfxOff')}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-zen-surface-lowest dark:bg-zen-dark-surface flex items-center justify-center">
              {sfxEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-red-500" />
              )}
            </div>
          </button>
        </div>
      </section>

      {/* 6. DANGER ZONE (High Friction Solid Confirmation) */}
      <section className="rounded-2xl sm:rounded-3xl bg-red-500/5 dark:bg-red-950/20 p-5 sm:p-6 border-2 border-red-500/30 dark:border-red-500/40 shadow-zen-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span>{t('settings.dangerZone')}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <h3 className="text-sm sm:text-base font-bold text-zen-text dark:text-zen-dark-text">
              {t('settings.resetProgressBtn')}
            </h3>
            <p className="text-xs text-zen-text-muted dark:text-zen-dark-text-muted leading-relaxed">
              {t('settings.dangerZoneDesc')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenResetModal}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition-all shadow-sm shadow-red-600/20 cursor-pointer self-start sm:self-auto shrink-0"
          >
            {t('settings.resetProgressBtn')}
          </button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SOLID CONFIRMATION MODAL (Enforces typing "RESET")      */}
      {/* ======================================================== */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-3xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-6 sm:p-7 border-2 border-red-500/40 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 rounded-xl text-zen-text-muted hover:text-zen-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-headline font-black text-zen-text dark:text-zen-dark-text leading-snug">
                {t('settings.resetModalTitle')}
              </h2>
              
              <div className="space-y-2 text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted bg-red-500/10 dark:bg-red-950/40 p-3.5 rounded-2xl border border-red-500/20">
                <p className="font-semibold text-red-700 dark:text-red-300">
                  • {t('settings.resetModalWarning1')}
                </p>
                <p>
                  • {t('settings.resetModalWarning2', { total: totalLibraryWords })}
                </p>
              </div>
            </div>

            {/* High-Friction Typing Requirement */}
            <div className="space-y-2 pt-1">
              <label
                htmlFor="reset-confirm-input"
                className="text-xs font-bold text-zen-text dark:text-zen-dark-text block"
              >
                {t('settings.resetModalTypeConfirm')}
              </label>
              <input
                id="reset-confirm-input"
                type="text"
                autoComplete="off"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder={t('settings.resetModalPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-red-500 dark:focus:border-red-500 outline-none font-mono font-bold text-center text-sm tracking-widest text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                autoFocus
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zen-surface-container dark:bg-zen-dark-surface-high text-zen-text dark:text-zen-dark-text text-xs sm:text-sm font-bold hover:bg-zen-surface-container/80 transition-colors cursor-pointer"
              >
                {t('settings.resetModalCancel')}
              </button>

              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetConfirmInput.trim().toUpperCase() !== 'RESET' || isResetting}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-sm ${
                  resetConfirmInput.trim().toUpperCase() === 'RESET' && !isResetting
                    ? 'bg-red-600 hover:bg-red-700 cursor-pointer shadow-red-600/30'
                    : 'bg-stone-400 dark:bg-stone-700 opacity-50 cursor-not-allowed'
                }`}
              >
                {isResetting ? t('common.loading') : t('settings.resetModalConfirmBtn')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsView;
