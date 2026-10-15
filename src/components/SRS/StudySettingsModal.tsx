import React, { useState, useEffect } from 'react';
import { X, Sliders, Check, Clock, Sparkles, RotateCcw, Layers, Shuffle } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { SRSSettings } from '../../services/srsService';
import { VOCABULARY_PACKS } from '../../data/italianVocabulary';

interface StudySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SRSSettings;
  onSave: (newSettings: SRSSettings) => void | Promise<void>;
  onResetDailyQuota?: () => void | Promise<void>;
  onResetLearningCards?: () => void | Promise<void>;
}

export const StudySettingsModal: React.FC<StudySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onResetDailyQuota,
  onResetLearningCards,
}) => {
  const { t, currentLang } = useTranslation();
  const [newCards, setNewCards] = useState<number>(settings.newCardsPerDay);
  const [maxReviews, setMaxReviews] = useState<number>(settings.maxReviewsPerDay);
  const [cutoffHour, setCutoffHour] = useState<number>(settings.dayCutoffHour);
  const [selectedPacks, setSelectedPacks] = useState<string[]>(settings.selectedPackIds || ['all']);
  const [randomizeNew, setRandomizeNew] = useState<boolean>(settings.randomizeNewCards !== false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewCards(settings.newCardsPerDay);
      setMaxReviews(settings.maxReviewsPerDay);
      setCutoffHour(settings.dayCutoffHour);
      setSelectedPacks(settings.selectedPackIds && settings.selectedPackIds.length > 0 ? settings.selectedPackIds : ['all']);
      setRandomizeNew(settings.randomizeNewCards !== false);
      setIsSaving(false);
      setShowSavedFeedback(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await Promise.resolve(
        onSave({
          newCardsPerDay: Math.max(1, Math.min(100, Number(newCards) || 15)),
          maxReviewsPerDay: Math.max(10, Math.min(1000, Number(maxReviews) || 100)),
          dayCutoffHour: Math.max(0, Math.min(23, Number(cutoffHour) || 4)),
          selectedPackIds: selectedPacks,
          randomizeNewCards: randomizeNew,
        })
      );
      setShowSavedFeedback(true);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 450);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] bg-zen-surface-lowest dark:bg-zen-dark-surface rounded-3xl shadow-2xl border border-zen-border/60 dark:border-zen-dark-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Pinned */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4.5 border-b border-zen-border/40 dark:border-zen-dark-border/60 shrink-0 bg-zen-surface-lowest dark:bg-zen-dark-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zen-primary/10 dark:bg-zen-dark-primary/20 text-zen-primary dark:text-zen-dark-primary">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-lg text-zen-text dark:text-zen-dark-text">
                {t('srs.settingsTitle')}
              </h3>
              <p className="text-xs text-zen-text-muted">
                {t('srs.settingsSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zen-surface-container dark:hover:bg-zen-dark-surface-high text-zen-text-muted hover:text-zen-text transition-colors cursor-pointer"
            title={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-5 overscroll-contain">
          {/* 1. New Cards Per Day */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-zen-text dark:text-zen-dark-text">
                {t('srs.newCardsPerDay')}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zen-text-muted font-medium">
                  {currentLang === 'zh-CN' ? `约 ${newCards} 分钟/天` : `~${newCards} min/day`}
                </span>
                <div className="flex items-center gap-1 bg-zen-primary/10 dark:bg-zen-dark-primary/20 px-2.5 py-1 rounded-xl border border-zen-primary/30">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newCards}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) setNewCards(Math.max(1, Math.min(50, v)));
                    }}
                    className="w-10 text-center font-mono font-bold text-sm text-zen-primary dark:text-zen-dark-primary bg-transparent focus:outline-none"
                  />
                  <span className="text-xs font-bold text-zen-primary dark:text-zen-dark-primary">
                    {currentLang === 'zh-CN' ? '词' : 'words'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-5 gap-1.5">
              {[5, 10, 15, 20, 25].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setNewCards(val)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center leading-tight ${
                    newCards === val
                      ? 'bg-zen-primary text-white border-zen-primary shadow-sm scale-102'
                      : 'bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border-zen-border/40 text-zen-text-muted hover:text-zen-text'
                  }`}
                >
                  <span className="block font-black text-sm">{val}</span>
                  <span className="text-[10px] opacity-80">{currentLang === 'zh-CN' ? '词' : 'words'}</span>
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min="1"
              max="50"
              value={newCards}
              onChange={(e) => setNewCards(Number(e.target.value))}
              className="w-full accent-zen-primary cursor-pointer"
            />
          </div>

          {/* 2. Max Reviews Per Day */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-zen-text dark:text-zen-dark-text">
                {t('srs.maxReviewsPerDay')}
              </label>
              <span className="font-mono font-bold text-sm text-zen-primary dark:text-zen-dark-primary px-2.5 py-0.5 rounded-lg bg-zen-primary/10 dark:bg-zen-dark-primary/20">
                {maxReviews >= 500 ? (currentLang === 'zh-CN' ? '不限' : 'Unlimited') : maxReviews}
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 200, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMaxReviews(val)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    maxReviews === val
                      ? 'bg-zen-primary text-white border-zen-primary shadow-sm'
                      : 'bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border-zen-border/40 text-zen-text-muted hover:text-zen-text'
                  }`}
                >
                  {val >= 500 ? (currentLang === 'zh-CN' ? '不限' : 'Max') : val}
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={maxReviews}
              onChange={(e) => setMaxReviews(Number(e.target.value))}
              className="w-full accent-zen-primary cursor-pointer"
            />
          </div>

          {/* 3. Study Source Packs (Global Queue Source) */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-zen-surface-container/40 dark:bg-zen-dark-surface-high/40 border border-zen-border/40 dark:border-zen-dark-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zen-text dark:text-zen-dark-text flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zen-primary" />
                <span>{t('srs.studySource')}</span>
              </span>
              <span className="text-[11px] font-mono text-zen-text-muted">
                {selectedPacks.includes('all')
                  ? (currentLang === 'zh-CN' ? '全部卡包' : 'All Packs')
                  : `${selectedPacks.length} ${currentLang === 'zh-CN' ? '个卡包' : 'selected'}`}
              </span>
            </div>
            <p className="text-[11px] text-zen-text-muted leading-tight">
              {t('srs.studySourceDesc')}
            </p>

            {/* All Packs vs Custom Selection */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedPacks(['all'])}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                  selectedPacks.includes('all')
                    ? 'bg-zen-primary text-white border-zen-primary shadow-sm'
                    : 'bg-zen-surface-lowest dark:bg-zen-dark-surface border-zen-border/50 text-zen-text dark:text-zen-dark-text hover:border-zen-primary/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>🎲</span>
                  <span>{t('srs.allPacksRandom')}</span>
                </div>
                {selectedPacks.includes('all') && <Check className="w-4 h-4 text-white" />}
              </button>

              {/* Individual Pack Chips */}
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {VOCABULARY_PACKS.map((pack) => {
                  const isChecked = !selectedPacks.includes('all') && selectedPacks.includes(pack.id);
                  const packName = pack.title[currentLang as 'en' | 'zh-CN'] || pack.title.en;

                  return (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => {
                        if (selectedPacks.includes('all')) {
                          setSelectedPacks([pack.id]);
                        } else if (isChecked) {
                          const remaining = selectedPacks.filter((id) => id !== pack.id);
                          setSelectedPacks(remaining.length === 0 ? ['all'] : remaining);
                        } else {
                          const updated = [...selectedPacks, pack.id];
                          setSelectedPacks(updated.length === VOCABULARY_PACKS.length ? ['all'] : updated);
                        }
                      }}
                      className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between cursor-pointer ${
                        isChecked
                          ? 'bg-zen-primary/15 dark:bg-zen-dark-primary/25 border-zen-primary text-zen-primary dark:text-zen-dark-primary font-bold'
                          : 'bg-zen-surface-lowest dark:bg-zen-dark-surface border-zen-border/40 text-zen-text-muted hover:text-zen-text hover:border-zen-border'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{pack.icon || '📖'}</span>
                        <span>{packName}</span>
                        {pack.id === 'italian-slang' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                            18+
                          </span>
                        )}
                        <span className="text-[10px] text-zen-text-muted font-normal font-mono">
                          ({pack.words.length})
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-zen-primary border-zen-primary text-white'
                            : 'border-zen-border/60 bg-transparent'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Randomize intake order toggle */}
            <label className="flex items-start gap-2.5 pt-2 border-t border-zen-border/30 dark:border-zen-dark-border/40 cursor-pointer">
              <input
                type="checkbox"
                checked={randomizeNew}
                onChange={(e) => setRandomizeNew(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-zen-primary focus:ring-zen-primary cursor-pointer accent-zen-primary"
              />
              <div className="text-[11px] leading-tight">
                <span className="font-bold text-zen-text dark:text-zen-dark-text flex items-center gap-1">
                  <Shuffle className="w-3 h-3 text-zen-primary" />
                  {t('srs.randomizeOrder')}
                </span>
                <p className="text-zen-text-muted mt-0.5">
                  {t('srs.randomizeOrderDesc')}
                </p>
              </div>
            </label>
          </div>

          {/* 4. Day Rollover Hour */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-zen-surface-container/40 dark:bg-zen-dark-surface-high/40 border border-zen-border/40 dark:border-zen-dark-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zen-text dark:text-zen-dark-text flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zen-primary" />
                <span>{t('srs.dayCutoffHour')}</span>
              </span>
              <select
                value={cutoffHour}
                onChange={(e) => setCutoffHour(Number(e.target.value))}
                className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-zen-primary dark:focus:ring-zen-dark-primary"
              >
                <option value={0}>00:00 (Midnight)</option>
                <option value={2}>02:00 AM</option>
                <option value={4}>04:00 AM (Recommended)</option>
                <option value={6}>06:00 AM</option>
              </select>
            </div>
            <p className="text-[11px] text-zen-text-muted leading-tight">
              {t('srs.dayCutoffDesc')}
            </p>
          </div>

          {/* Optional Reset Daily SRS Quota & Learning Cards (For testing & backlog recovery) */}
        {(onResetDailyQuota || onResetLearningCards) && (
          <div className="pt-1 flex flex-col items-center gap-2">
            {onResetDailyQuota && (
              <button
                type="button"
                onClick={async () => {
                  await Promise.resolve(onResetDailyQuota());
                  setShowSavedFeedback(true);
                  setTimeout(() => {
                    onClose();
                  }, 400);
                }}
                className="text-[11px] font-mono text-zen-text-muted hover:text-amber-600 dark:hover:text-amber-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer underline underline-offset-2"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{currentLang === 'zh-CN' ? '重置今日学习计数 (测试模式)' : "Reset Today's Study Quota (Test Mode)"}</span>
              </button>
            )}

            {onResetLearningCards && (
              <button
                type="button"
                onClick={async () => {
                  await Promise.resolve(onResetLearningCards());
                  setShowSavedFeedback(true);
                  setTimeout(() => {
                    onClose();
                  }, 400);
                }}
                className="text-[11px] font-mono text-rose-600/80 dark:text-rose-400/80 hover:text-rose-700 dark:hover:text-rose-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer underline underline-offset-2"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{currentLang === 'zh-CN' ? '清空学习中卡片积压 (重置为新词)' : 'Reset In-Progress Learning Cards to New'}</span>
              </button>
            )}
          </div>
        )}
        </div>

        {/* Footer Actions - Pinned */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-zen-border/40 dark:border-zen-dark-border/60 shrink-0 bg-zen-surface-lowest dark:bg-zen-dark-surface flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/50 text-zen-text-muted hover:text-zen-text transition-colors cursor-pointer"
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex-1 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-zen-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
              showSavedFeedback
                ? 'bg-emerald-600'
                : 'bg-zen-primary hover:bg-zen-primary-hover active:scale-95 disabled:opacity-50'
            }`}
          >
            {showSavedFeedback ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{t('srs.savedSuccess')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isSaving ? (currentLang === 'zh-CN' ? '保存中...' : 'Saving...') : t('srs.saveSettings')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudySettingsModal;

