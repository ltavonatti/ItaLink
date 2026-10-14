import React, { useState, useEffect } from 'react';
import Navbar, { StudyMode } from './components/Navbar';
import Dashboard from './components/Dashboard';
import { AuthScreen } from './components/Auth/AuthScreen';
import { FlashcardView } from './components/Flashcards/FlashcardView';
import { FallingWordsView } from './components/Arcade/FallingWordsView';
import { WordFillPlaceholder } from './components/Arcade/WordFillPlaceholder';
import { SettingsView } from './components/Settings/SettingsView';
import { SyncModal } from './components/Sync/SyncModal';
import { authService, UserAccount } from './services/authService';
import { VOCABULARY_PACKS, getPackById } from './data/italianVocabulary';
import { useTranslation } from './i18n';

import { storageService } from './services/storageService';

export const App: React.FC = () => {
  const { currentLang } = useTranslation();
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

  // Background cloud synchronization on load
  useEffect(() => {
    if (currentUser?.id && !currentUser.isGuest) {
      storageService.syncWithCloud(currentUser.id).catch((err) => {
        console.warn('Initial cloud sync silent notice:', err);
      });
    }
  }, [currentUser?.id, currentUser?.isGuest]);

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
          if (mode === 'flashcards') {
            setIsSRSMode(true);
          } else {
            setIsSRSMode(false);
          }
          setActiveMode(mode);
        }}
        selectedPackTitle={currentPack.title[currentLang]}
        currentUser={currentUser}
        onLogout={() => authService.logout()}
      />

      {/* 3. Main Content Container */}
      <main
        className={`flex-1 max-w-7xl w-full mx-auto ${
          activeMode === 'fallingWords'
            ? 'px-2 sm:px-6 lg:px-8 py-1 sm:py-4 flex flex-col'
            : activeMode === 'flashcards'
            ? 'px-3 sm:px-6 lg:px-8 py-2 sm:py-6'
            : 'px-3 sm:px-6 lg:px-8 py-6 sm:py-8'
        }`}
      >
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

        {/* Study Engines and Configuration Views */}
        {activeMode !== 'dashboard' && (
          <div
            className={`${
              activeMode === 'fallingWords'
                ? 'flex-1 flex flex-col w-full'
                : 'space-y-4 sm:space-y-6'
            } animate-in fade-in duration-200`}
          >
            {/* Interactive Flashcard Engine */}
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

            {/* Falling Words Arcade Engine */}
            {activeMode === 'fallingWords' && (
              <FallingWordsView
                userId={currentUser.id}
                initialPackId={selectedPackId}
                onBackToDashboard={() => {
                  setIsSRSMode(false);
                  setActiveMode('dashboard');
                }}
              />
            )}

            {/* Word Forge Placeholder with Cat Meme */}
            {(activeMode === 'wordFill' || activeMode === 'quiz') && (
              <WordFillPlaceholder
                onBackToDashboard={() => {
                  setIsSRSMode(false);
                  setActiveMode('dashboard');
                }}
                onPlayFallingWords={() => {
                  setIsSRSMode(false);
                  setActiveMode('fallingWords');
                }}
                onStartFlashcards={() => {
                  setIsSRSMode(false);
                  setActiveMode('flashcards');
                }}
              />
            )}

            {/* System Preferences & Data Management (Settings) */}
            {activeMode === 'settings' && (
              <SettingsView
                userId={currentUser.id}
                onBackToDashboard={() => {
                  setIsSRSMode(false);
                  setActiveMode('dashboard');
                }}
                onOpenSyncModal={() => setIsSyncModalOpen(true)}
              />
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
      <footer className={`border-t border-zen-border/40 dark:border-zen-dark-border/60 py-6 text-center text-xs text-zen-text-muted dark:text-zen-dark-text-muted ${activeMode === 'flashcards' || activeMode === 'fallingWords' ? 'hidden sm:block' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 ItaLink · {currentLang === 'zh-CN' ? '现代智能意语词汇闪卡系统' : 'Modern Italian Flashcard System'}</p>
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
