import React, { useState, useEffect } from 'react';
import {
  Globe,
  Layers,
  CheckSquare,
  Gamepad2,
  LayoutDashboard,
  Menu,
  X,
  RefreshCw,
  LogOut,
  Sun,
  Moon,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { UserAccount } from '../services/authService';
import { themeService, ThemeMode } from '../services/themeService';
import { audioService } from '../services/audioService';

export type StudyMode = 'dashboard' | 'flashcards' | 'quiz' | 'fallingWords';

interface NavbarProps {
  activeMode: StudyMode;
  onSelectMode: (mode: StudyMode) => void;
  selectedPackTitle?: string;
  currentUser?: UserAccount | null;
  onOpenSync?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeMode,
  onSelectMode,
  selectedPackTitle,
  currentUser,
  onOpenSync,
  onLogout,
}) => {
  const { t, currentLang, toggleLanguage } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => themeService.getTheme());
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => audioService.isSfxEnabled());

  useEffect(() => {
    const unsub = themeService.subscribe((currentTheme) => {
      setTheme(currentTheme);
    });
    return () => unsub();
  }, []);

  const handleToggleTheme = () => {
    const next = themeService.toggleTheme();
    setTheme(next);
  };

  const handleToggleSfx = () => {
    const next = audioService.toggleSfx();
    setSfxEnabled(next);
  };

  const navItems: { mode: StudyMode; label: string; icon: React.ReactNode }[] = [
    {
      mode: 'dashboard',
      label: t('nav.dashboard'),
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      mode: 'flashcards',
      label: t('nav.flashcards'),
      icon: <Layers className="w-4 h-4" />,
    },
    {
      mode: 'quiz',
      label: t('nav.quiz'),
      icon: <CheckSquare className="w-4 h-4" />,
    },
    {
      mode: 'fallingWords',
      label: t('nav.fallingWords'),
      icon: <Gamepad2 className="w-4 h-4" />,
    },
  ];

  const handleModeChange = (mode: StudyMode) => {
    onSelectMode(mode);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-zen-surface-lowest/95 dark:bg-zen-dark-surface/95 backdrop-blur-md border-b border-zen-border/60 dark:border-zen-dark-border/80 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-18">
          
          {/* Brand & App Title */}
          <div
            className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer shrink-0"
            onClick={() => handleModeChange('dashboard')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-zen-primary to-zen-primary-dark dark:from-zen-dark-primary dark:to-zen-dark-secondary flex items-center justify-center text-white dark:text-zen-dark-on-primary shadow-sm">
              <span className="font-serif font-black text-base sm:text-xl tracking-tight">IT</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-headline font-bold text-base sm:text-xl text-zen-text dark:text-zen-dark-text tracking-tight">
                  <span className="sm:hidden">Zen IT</span>
                  <span className="hidden sm:inline">
                    {currentLang === 'zh-CN' ? 'Zen Italian · 禅意意语' : 'Zen Italian'}
                  </span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-zen-primary/10 dark:bg-zen-dark-primary/20 text-zen-primary dark:text-zen-dark-primary">
                  {currentLang === 'zh-CN' ? '拼音注音' : 'Pinyin'}
                </span>
              </div>
              <p className="text-[11px] text-zen-text-muted dark:text-zen-dark-text-muted hidden md:block">
                {selectedPackTitle ? `${t('common.activePack')}: ${selectedPackTitle}` : t('app.subtitle')}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 p-1 rounded-2xl border border-zen-border/40 dark:border-zen-dark-border">
            {navItems.map((item) => {
              const isActive = activeMode === item.mode;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => handleModeChange(item.mode)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-zen-surface-lowest dark:bg-zen-dark-primary text-zen-primary dark:text-zen-dark-on-primary shadow-zen-sm font-bold'
                      : 'text-zen-text-muted dark:text-zen-dark-text-muted hover:text-zen-text dark:hover:text-zen-dark-text'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Actions & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Desktop-only SFX Sound Toggle */}
            <button
              type="button"
              onClick={handleToggleSfx}
              className="hidden sm:flex p-2 rounded-xl text-zen-text-muted hover:text-zen-text dark:text-zen-dark-text-muted dark:hover:text-zen-dark-text hover:bg-zen-surface-container dark:hover:bg-zen-dark-surface-high transition-colors cursor-pointer"
              title={sfxEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
              aria-label="Toggle Sound Effects"
            >
              {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-500" />}
            </button>

            {/* Desktop & Mobile Theme Toggle (Sun/Moon) */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text hover:border-zen-primary dark:hover:border-zen-dark-primary transition-all shadow-sm cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme Mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Language Switcher Quick Toggle */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="group flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text hover:border-zen-primary dark:hover:border-zen-dark-primary transition-all shadow-sm cursor-pointer"
              title={t('nav.switchLabel')}
              aria-label={t('nav.languageToggle')}
            >
              <Globe className="w-3.5 h-3.5 text-zen-primary dark:text-zen-dark-primary group-hover:rotate-12 transition-transform" />
              <span className="font-mono">{currentLang === 'zh-CN' ? '中' : 'EN'}</span>
            </button>

            {/* Desktop-only Sync & Backup Trigger */}
            {onOpenSync && (
              <button
                type="button"
                onClick={onOpenSync}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text hover:border-zen-primary dark:hover:border-zen-dark-primary transition-all shadow-sm cursor-pointer"
                title={currentLang === 'zh-CN' ? '跨设备数据备份与同步' : 'Sync & Backup'}
                aria-label="Open Sync Modal"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zen-primary dark:text-zen-dark-primary" />
                <span>{currentLang === 'zh-CN' ? '备份同步' : 'Sync'}</span>
              </button>
            )}

            {/* Desktop-only User Profile & Logout */}
            {currentUser && (
              <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-zen-border/40 dark:border-zen-dark-border">
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 text-xs text-zen-text dark:text-zen-dark-text"
                  title={currentUser.email}
                >
                  <div className="w-6 h-6 rounded-full bg-zen-primary/10 dark:bg-zen-dark-primary/20 text-zen-primary dark:text-zen-dark-primary flex items-center justify-center font-bold text-[10px]">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="font-medium max-w-[90px] truncate">
                    {currentUser.displayName || currentUser.username}
                  </span>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 rounded-xl text-zen-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title={currentLang === 'zh-CN' ? '退出登录' : 'Log out'}
                    aria-label="Log out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Mobile Menu Hamburger Toggle (Visible on < lg) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-zen-text-muted dark:text-zen-dark-text-muted hover:text-zen-text dark:hover:text-zen-dark-text bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/40 dark:border-zen-dark-border cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Slide-Down Drawer (< lg) */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-zen-border/40 dark:border-zen-dark-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            
            {/* User Profile Card inside Drawer */}
            {currentUser && (
              <div className="p-3 rounded-2xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/40 dark:border-zen-dark-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-zen-primary/15 dark:bg-zen-dark-primary/25 text-zen-primary dark:text-zen-dark-primary flex items-center justify-center font-bold text-sm">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-zen-text dark:text-zen-dark-text">
                        {currentUser.displayName || currentUser.username}
                      </span>
                      {currentUser.isGuest && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          Guest
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zen-text-muted dark:text-zen-dark-text-muted block truncate max-w-[160px]">
                      {currentUser.email}
                    </span>
                  </div>
                </div>

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{currentLang === 'zh-CN' ? '退出' : 'Logout'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Mobile Study Mode Nav Links */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zen-text-muted px-2 block mb-1">
                {currentLang === 'zh-CN' ? '学习导航' : 'Study Modules'}
              </span>
              {navItems.map((item) => {
                const isActive = activeMode === item.mode;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => handleModeChange(item.mode)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-zen-primary/10 dark:bg-zen-dark-primary/20 text-zen-primary dark:text-zen-dark-primary font-bold'
                        : 'text-zen-text-muted dark:text-zen-dark-text-muted hover:text-zen-text dark:hover:text-zen-dark-text hover:bg-zen-surface-container/50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Actions: Sync & SFX */}
            <div className="pt-2 border-t border-zen-border/30 dark:border-zen-dark-border/60 grid grid-cols-2 gap-2">
              {onOpenSync && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenSync();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/40 text-zen-text dark:text-zen-dark-text"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zen-primary dark:text-zen-dark-primary" />
                  <span>{currentLang === 'zh-CN' ? '备份同步' : 'Sync Backup'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleSfx}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/40 text-zen-text dark:text-zen-dark-text"
              >
                {sfxEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{currentLang === 'zh-CN' ? '音效: 开启' : 'SFX: ON'}</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-zen-text-muted" />
                    <span>{currentLang === 'zh-CN' ? '音效: 关闭' : 'SFX: OFF'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </header>
  );
};

export default Navbar;
