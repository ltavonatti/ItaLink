import React from 'react';
import {
  Sparkles,
  ArrowLeft,
  Gamepad2,
  Layers,
  Construction,
} from 'lucide-react';
import { useTranslation } from '../../i18n';

interface WordFillPlaceholderProps {
  onBackToDashboard: () => void;
  onPlayFallingWords?: () => void;
  onStartFlashcards?: () => void;
}

export const WordFillPlaceholder: React.FC<WordFillPlaceholderProps> = ({
  onBackToDashboard,
  onPlayFallingWords,
  onStartFlashcards,
}) => {
  const { t, currentLang } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* Navigation Top Sub-Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zen-border/40 dark:border-zen-dark-border">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-zen-text-muted dark:text-zen-dark-text-muted hover:text-zen-primary dark:hover:text-zen-dark-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')} · {t('nav.dashboard')}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <Construction className="w-3.5 h-3.5 animate-bounce" />
            <span>{t('wordFill.statusBadge')}</span>
          </span>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="rounded-3xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-6 sm:p-10 border border-zen-border/60 dark:border-zen-dark-border shadow-zen-md text-center space-y-6">
        
        {/* Header Titles */}
        <div className="max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zen-primary/10 dark:bg-zen-dark-primary/20 text-zen-primary dark:text-zen-dark-primary text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('wordFill.nativeTitle')} · {currentLang === 'zh-CN' ? '词汇挑战' : 'Vocabulary Challenge'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-headline font-black text-zen-text dark:text-zen-dark-text tracking-tight">
            {t('wordFill.title')}
          </h1>
          <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted leading-relaxed max-w-md mx-auto">
            {t('wordFill.subtitle')}
          </p>
        </div>

        {/* The Cat Meme Card */}
        <div className="max-w-md mx-auto relative rounded-3xl overflow-hidden bg-gradient-to-b from-stone-900 via-stone-800 to-stone-950 p-3 sm:p-4 shadow-2xl border-4 border-stone-800 dark:border-stone-700">
          
          {/* Top Meme Caption */}
          <div className="py-2.5 px-3 text-center">
            <span className="font-headline font-black text-white text-base sm:text-xl tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none">
              {t('wordFill.catMemeTop')}
            </span>
          </div>

          {/* Central Image with clean frame */}
          <div className="relative overflow-hidden rounded-2xl bg-stone-950 flex items-center justify-center min-h-[220px] sm:min-h-[260px]">
            <img
              src="/media/images/shigoto-zaitaku-cat-woman.webp"
              alt="Cat sleeping on developer's keyboard"
              className="w-full max-h-[300px] object-contain select-none pointer-events-none"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/media/images/pet-fat-cat.webp';
              }}
            />
          </div>

          {/* Bottom Meme Caption */}
          <div className="py-2.5 px-3 text-center">
            <span className="font-headline font-black text-amber-300 text-sm sm:text-lg tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none">
              {t('wordFill.catMemeBottom')}
            </span>
          </div>
        </div>

        {/* Informative Note */}
        <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted max-w-lg mx-auto leading-relaxed">
          {t('wordFill.message')}
        </p>

        {/* Alternative Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-5 py-2.5 rounded-xl bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text hover:border-zen-primary text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            {t('wordFill.backToDashboard')}
          </button>

          {onPlayFallingWords && (
            <button
              type="button"
              onClick={onPlayFallingWords}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>{t('wordFill.playFallingWords')}</span>
            </button>
          )}

          {onStartFlashcards && (
            <button
              type="button"
              onClick={onStartFlashcards}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zen-primary hover:bg-zen-primary-variant text-white text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>{t('wordFill.practiceFlashcards')}</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
};

export default WordFillPlaceholder;

