import React, { useState, useEffect } from 'react';
import Navbar, { StudyMode } from './components/Navbar';
import Dashboard from './components/Dashboard';
import { AuthScreen } from './components/Auth/AuthScreen';
import { FlashcardView } from './components/Flashcards/FlashcardView';
import { SyncModal } from './components/Sync/SyncModal';
import { authService, UserAccount } from './services/authService';
import { VOCABULARY_PACKS, getPackById } from './data/italianVocabulary';
import { useTranslation } from './i18n';
import { ArrowLeft, CheckSquare, Gamepad2, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const { t, currentLang } = useTranslation();
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => authService.getCurrentUser());
  const [activeMode, setActiveMode] = useState<StudyMode>('dashboard');
  const [selectedPackId, setSelectedPackId] = useState<string>('greetings-courtesy');
  const [isSRSMode, setIsSRSMode] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 1. Local Authentication Barrier
  if (!currentUser) {
    return <AuthScreen onAuthenticated={(user) => setCurrentUser(user)} />;
  }

  const currentPack = getPackById(selectedPackId) || VOCABULARY_PACKS[0];

  return (
    <div className="min-h-screen bg-zen-surface dark:bg-zen-dark-bg text-zen-text dark:text-zen-dark-text flex flex-col font-sans transition-colors duration-200">
      
      {/* 2. Global Navigation Bar with Auth & Sync */}
      <Navbar
        activeMode={activeMode}
        onSelectMode={(mode) => {
          setIsSRSMode(false);
          setActiveMode(mode);
        }}
        selectedPackTitle={currentPack.title[currentLang]}
        currentUser={currentUser}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onLogout={() => authService.logout()}
      />

      {/* 3. Main Content Container */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 ${activeMode === 'flashcards' ? 'py-2 sm:py-6' : 'py-6 sm:py-8'}`}>
        {activeMode === 'dashboard' && (
          <Dashboard
            userId={currentUser.id}
            selectedPackId={selectedPackId}
            onSelectPack={setSelectedPackId}
            onSelectMode={(mode) => {
              setIsSRSMode(false);
              setActiveMode(mode);
            }}
            onStartSRSSession={(packId) => {
              setSelectedPackId(packId || 'all');
              setIsSRSMode(true);
              setActiveMode('flashcards');
            }}
          />
        )}

        {/* Phase 3, 4, 5 Study Engines */}
        {activeMode !== 'dashboard' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
            {/* Top Sub-Bar to return to Dashboard & display active session (For modes other than Flashcards which has its own unified header) */}
            {activeMode !== 'flashcards' && (
              <div className="flex items-center justify-between pb-4 border-b border-zen-border/40 dark:border-zen-dark-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsSRSMode(false);
                    setActiveMode('dashboard');
                  }}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-zen-text-muted dark:text-zen-dark-text-muted hover:text-zen-primary dark:hover:text-zen-dark-primary transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('common.back')} · {t('nav.dashboard')}</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zen-text-muted dark:text-zen-dark-text-muted hidden sm:inline">
                    {t('common.activePack')}:
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/40 dark:border-zen-dark-border text-zen-primary dark:text-zen-dark-primary">
                    {currentPack.title[currentLang]} ({currentPack.words.length})
                  </span>
                </div>
              </div>
            )}

            {/* Interactive Flashcard Engine (Phase 3) */}
            {activeMode === 'flashcards' && (
              <FlashcardView
                userId={currentUser.id}
                initialPackId={selectedPackId}
                isSRSMode={isSRSMode}
                onBackToDashboard={() => {
                  setIsSRSMode(false);
                  setActiveMode('dashboard');
                }}
              />
            )}

            {/* Quiz Engine Placeholder (Phase 4) */}
            {activeMode === 'quiz' && (
              <div className="rounded-3xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-8 sm:p-12 border border-zen-border/60 dark:border-zen-dark-border text-center space-y-6 shadow-zen-sm">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <CheckSquare className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-2xl font-headline font-bold text-zen-text dark:text-zen-dark-text">
                    {t('quiz.title')}
                  </h3>
                  <p className="text-sm text-zen-text-muted dark:text-zen-dark-text-muted">
                    {t('quiz.subtitle')}
                  </p>
                </div>
                <div className="p-4 max-w-lg mx-auto rounded-2xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 dark:border-zen-dark-border text-xs text-zen-text-muted dark:text-zen-dark-text-muted flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>
                    {currentLang === 'zh-CN'
                      ? `已就绪【${currentPack.title['zh-CN']}】测试词库。待接入 Phase 4 多选闯关引擎。`
                      : `Prepared "${currentPack.title.en}". Ready for Phase 4 Quiz Engine.`}
                  </span>
                </div>
              </div>
            )}

            {/* Falling Words Arcade Placeholder (Phase 5) */}
            {activeMode === 'fallingWords' && (
              <div className="rounded-3xl bg-zen-surface-lowest dark:bg-zen-dark-surface p-8 sm:p-12 border border-zen-border/60 dark:border-zen-dark-border text-center space-y-6 shadow-zen-sm">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Gamepad2 className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-2xl font-headline font-bold text-zen-text dark:text-zen-dark-text">
                    {t('fallingWords.title')}
                  </h3>
                  <p className="text-sm text-zen-text-muted dark:text-zen-dark-text-muted">
                    {t('fallingWords.subtitle')}
                  </p>
                </div>
                <div className="p-4 max-w-lg mx-auto rounded-2xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 dark:border-zen-dark-border text-xs text-zen-text-muted dark:text-zen-dark-text-muted flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>
                    {currentLang === 'zh-CN'
                      ? `已载入【${currentPack.title['zh-CN']}】词库。待接入 Phase 5 下落街机引擎。`
                      : `Loaded "${currentPack.title.en}". Ready for Phase 5 Arcade Engine.`}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. Global Text Backup / Sync Modal */}
      <SyncModal
        userId={currentUser.id}
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* 5. Global Zen Footer */}
      <footer className={`border-t border-zen-border/40 dark:border-zen-dark-border/60 py-6 text-center text-xs text-zen-text-muted dark:text-zen-dark-text-muted ${activeMode === 'flashcards' ? 'hidden sm:block' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Zen Italian · {currentLang === 'zh-CN' ? '专为中文母语者定制的意语学习系统' : 'Italian Learning System for Chinese Speakers'}</p>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span>v1.0.0</span>
            <span>•</span>
            <span>EN / zh-CN Dynamic L10N</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
