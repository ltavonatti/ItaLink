import React, { useState, useEffect } from 'react';
import { X, Sliders, Check, Clock, Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { SRSSettings } from '../../services/srsService';

interface StudySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SRSSettings;
  onSave: (newSettings: SRSSettings) => void;
}

export const StudySettingsModal: React.FC<StudySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const { t, currentLang } = useTranslation();
  const [newCards, setNewCards] = useState<number>(settings.newCardsPerDay);
  const [maxReviews, setMaxReviews] = useState<number>(settings.maxReviewsPerDay);
  const [cutoffHour, setCutoffHour] = useState<number>(settings.dayCutoffHour);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewCards(settings.newCardsPerDay);
      setMaxReviews(settings.maxReviewsPerDay);
      setCutoffHour(settings.dayCutoffHour);
      setShowSavedFeedback(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      newCardsPerDay: Math.max(1, Math.min(100, Number(newCards) || 15)),
      maxReviewsPerDay: Math.max(10, Math.min(1000, Number(maxReviews) || 100)),
      dayCutoffHour: Math.max(0, Math.min(23, Number(cutoffHour) || 4)),
    });
    setShowSavedFeedback(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full bg-zen-surface-lowest dark:bg-zen-dark-surface rounded-3xl p-6 sm:p-7 shadow-2xl border border-zen-border/60 dark:border-zen-dark-border flex flex-col space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zen-border/40 dark:border-zen-dark-border/60">
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

        {/* Form Body */}
        <div className="space-y-5">
          {/* 1. New Cards Per Day */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-zen-text dark:text-zen-dark-text">
                {t('srs.newCardsPerDay')}
              </label>
              <span className="font-mono font-bold text-sm text-zen-primary dark:text-zen-dark-primary px-2.5 py-0.5 rounded-lg bg-zen-primary/10 dark:bg-zen-dark-primary/20">
                {newCards}
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: t('srs.casual'), val: 5 },
                { label: t('srs.standard'), val: 15 },
                { label: t('srs.intensive'), val: 25 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setNewCards(p.val)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    newCards === p.val
                      ? 'bg-zen-primary text-white border-zen-primary shadow-sm'
                      : 'bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border-zen-border/40 text-zen-text-muted hover:text-zen-text'
                  }`}
                >
                  {p.label}
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

          {/* 3. Day Rollover Hour */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-zen-surface-container/40 dark:bg-zen-dark-surface-high/40 border border-zen-border/40 dark:border-zen-dark-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zen-text dark:text-zen-dark-text flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zen-primary" />
                <span>{t('srs.dayCutoffHour')}</span>
              </span>
              <select
                value={cutoffHour}
                onChange={(e) => setCutoffHour(Number(e.target.value))}
                className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-zen-surface-lowest dark:bg-zen-dark-surface border border-zen-border/50 text-zen-text dark:text-zen-dark-text cursor-pointer"
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
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center gap-3">
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
            className={`flex-1 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-zen-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
              showSavedFeedback
                ? 'bg-emerald-600'
                : 'bg-zen-primary hover:bg-zen-primary-hover active:scale-95'
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
                <span>{t('srs.saveSettings')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudySettingsModal;

