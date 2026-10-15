import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Mail,
  Sparkles,
  Globe,
  LogIn,
  UserPlus,
  Cloud,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { authService, UserAccount } from '../../services/authService';
import cloudService from '../../services/cloudService';
import { useTranslation } from '../../i18n';
import themeService, { ThemeMode } from '../../services/themeService';

interface AuthScreenProps {
  onAuthenticated: (user: UserAccount) => void;
}

/**
 * Localize Supabase and network auth error messages into Chinese when applicable
 */
function getLocalizedAuthError(rawMsg: string | undefined, isZh: boolean, fallback: string): string {
  if (!rawMsg) return fallback;
  if (!isZh) return rawMsg;

  const lower = rawMsg.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return '邮箱或密码错误，请核对后重试。';
  }
  if (lower.includes('email not confirmed')) {
    return '邮箱尚未激活验证，请先查收邮件并点击确认链接。';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return '该邮箱已被注册，请直接登录。';
  }
  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return '密码长度不能少于 6 位。';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return '请求过于频繁，请稍候再试。';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return '网络连接失败，请检查网络设置。';
  }
  return rawMsg;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const { t, currentLang, setLanguage } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGuestWarningModal, setShowGuestWarningModal] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => themeService.getTheme());

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

  const isCloudReady = cloudService.isConfigured();
  const isZh = currentLang === 'zh-CN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error(t('auth.passwordMismatch'));
        }
        if (password.length < 6) {
          throw new Error(t('auth.passwordMinLength'));
        }

        const result = await authService.signUp(username, email, password);
        if (result.requiresConfirmation) {
          setSuccessNotice(t('auth.emailConfirmSent', { email }));
          setIsSignUp(false);
          setPassword('');
          setConfirmPassword('');
        } else if (result.user) {
          onAuthenticated(result.user);
        }
      } else {
        const user = await authService.login(email, password);
        onAuthenticated(user);
      }
    } catch (err: any) {
      setError(getLocalizedAuthError(err?.message, isZh, t('auth.authFailedFallback')));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmGuest = async () => {
    setShowGuestWarningModal(false);
    setError(null);
    setLoading(true);
    try {
      const guest = await authService.guestLogin();
      onAuthenticated(guest);
    } catch (err: any) {
      setError(getLocalizedAuthError(err?.message, isZh, t('auth.guestFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zen-surface dark:bg-zen-dark-bg flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-10 transition-colors relative">
      
      {/* Top Bar with Language Switcher */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zen-primary to-sky-600 dark:from-zen-dark-primary dark:to-blue-600 text-white flex items-center justify-center font-sans font-black text-sm shadow-md shadow-zen-primary/20">
            IT
          </div>
          <div>
            <span className="font-headline font-extrabold text-base text-zen-text dark:text-zen-dark-text tracking-tight block leading-none">
              ItaLink
            </span>
            <span className="text-[10px] text-zen-text-muted dark:text-zen-dark-text-muted font-mono">
              Italiano · {t('auth.brandTagline')}
            </span>
          </div>
        </div>

        {/* Controls: Language Switcher & Theme Toggle */}
        <div className="flex items-center gap-2">
          {/* Dynamic Language Switcher Segmented Control */}
          <div className="flex items-center bg-zen-surface-container dark:bg-zen-dark-surface-high p-1 rounded-full border border-zen-border/60 dark:border-zen-dark-border shadow-xs gap-1">
            <div className="pl-1.5 pr-0.5 text-zen-text-muted">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                currentLang === 'en'
                  ? 'bg-zen-primary text-white shadow-xs'
                  : 'text-zen-text-muted hover:text-zen-text dark:hover:text-zen-dark-text'
              }`}
              title="Switch interface to English"
            >
              <span>EN</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('zh-CN')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                currentLang === 'zh-CN'
                  ? 'bg-zen-primary text-white shadow-xs'
                  : 'text-zen-text-muted hover:text-zen-text dark:hover:text-zen-dark-text'
              }`}
              title="切换界面语言为简体中文"
            >
              <span>中文</span>
            </button>
          </div>

          {/* Quick Theme Toggle */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="p-1.5 rounded-full bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text hover:border-zen-primary dark:hover:border-zen-dark-primary transition-all shadow-xs cursor-pointer flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme Mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 hover:-rotate-12 transition-transform" />
            )}
          </button>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-zen-surface-lowest dark:bg-zen-dark-surface rounded-3xl p-6 sm:p-8 border border-zen-border/70 dark:border-zen-dark-border shadow-zen-xl">
        
        {/* Cloud Readiness Badge */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Cloud className="w-3.5 h-3.5" />
            <span>
              {isCloudReady ? t('auth.cloudConnected') : t('auth.localMode')}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-headline font-bold text-zen-text dark:text-zen-dark-text tracking-tight">
            {isSignUp ? t('auth.createAccount') : t('auth.welcomeBack')}
          </h2>

          <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted">
            {isSignUp ? t('auth.signUpSubtitle') : t('auth.signInSubtitle')}
          </p>
        </div>

        {/* Tab Toggle (Sign In / Sign Up) */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-zen-surface-container dark:bg-zen-dark-surface-high rounded-2xl mb-6 border border-zen-border/40 dark:border-zen-dark-border">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
              setSuccessNotice(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              !isSignUp
                ? 'bg-zen-surface-lowest dark:bg-zen-dark-primary text-zen-primary dark:text-zen-dark-on-primary shadow-zen-sm'
                : 'text-zen-text-muted dark:text-zen-dark-text-muted hover:text-zen-text'
            }`}
          >
            {t('auth.tabSignIn')}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
              setSuccessNotice(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              isSignUp
                ? 'bg-zen-surface-lowest dark:bg-zen-dark-primary text-zen-primary dark:text-zen-dark-on-primary shadow-zen-sm'
                : 'text-zen-text-muted dark:text-zen-dark-text-muted hover:text-zen-text'
            }`}
          >
            {t('auth.tabSignUp')}
          </button>
        </div>

        {/* Success Notice */}
        {successNotice && (
          <div className="p-3.5 mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            <div className="flex-1">{successNotice}</div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-zen-text dark:text-zen-dark-text mb-1.5">
                {t('auth.usernameLabel')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zen-text-muted">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('auth.usernamePlaceholder')}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-zen-primary dark:focus:ring-zen-dark-primary focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zen-text dark:text-zen-dark-text mb-1.5">
              {t('auth.emailLabel')}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zen-text-muted">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-zen-primary dark:focus:ring-zen-dark-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zen-text dark:text-zen-dark-text mb-1.5">
              {t('auth.passwordLabel')}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zen-text-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-zen-primary dark:focus:ring-zen-dark-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-zen-text dark:text-zen-dark-text mb-1.5">
                {t('auth.confirmPasswordLabel')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zen-text-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-zen-primary dark:focus:ring-zen-dark-primary focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-zen-primary hover:bg-zen-primary-dark text-white dark:bg-zen-dark-primary dark:text-zen-dark-on-primary transition-all shadow-md shadow-zen-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{loading ? t('auth.signingUpBtn') : t('auth.signUpBtn')}</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{loading ? t('auth.signingInBtn') : t('auth.signInBtn')}</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zen-border/60 dark:border-zen-dark-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-zen-surface-lowest dark:bg-zen-dark-surface text-zen-text-muted font-medium">
              {t('auth.orDivider')}
            </span>
          </div>
        </div>

        {/* Continue as Guest Button */}
        <button
          type="button"
          onClick={() => setShowGuestWarningModal(true)}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 transition-all flex items-center justify-between cursor-pointer group shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <span className="block font-bold">
                {t('auth.guestBtnTitle')}
              </span>
              <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-normal">
                {t('auth.guestBtnSubtitle')}
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-500/70 group-hover:translate-x-1 transition-transform" />
        </button>

      </div>

      {/* Footer Info */}
      <p className="mt-6 text-center text-xs text-zen-text-muted">
        ItaLink · {t('auth.footerDesc')}
      </p>

      {/* Guest Mode Warning Confirmation Modal */}
      {showGuestWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zen-surface-lowest dark:bg-zen-dark-surface rounded-3xl p-6 sm:p-7 border border-amber-500/40 shadow-2xl relative">
            
            {/* Close modal X button */}
            <button
              type="button"
              onClick={() => setShowGuestWarningModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-zen-text-muted hover:text-zen-text dark:hover:text-zen-dark-text hover:bg-zen-surface-container dark:hover:bg-zen-dark-surface-high transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Warning Icon & Heading */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <ShieldAlert className="w-6 h-6 text-amber-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-headline font-bold text-zen-text dark:text-zen-dark-text">
                  {t('auth.guestNoticeTitle')}
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  {t('auth.guestNoticeSubtitle')}
                </p>
              </div>
            </div>

            {/* Warning Details Body */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-zen-text dark:text-zen-dark-text space-y-2 mb-6">
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                {t('auth.guestNoticeIntro')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-zen-text-muted dark:text-zen-dark-text-muted pl-1">
                <li>{t('auth.guestNoticeP1')}</li>
                <li>{t('auth.guestNoticeP2')}</li>
                <li>{t('auth.guestNoticeP3')}</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setShowGuestWarningModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-zen-primary text-white hover:bg-zen-primary-dark transition-all cursor-pointer shadow-sm text-center"
              >
                {t('auth.guestNoticeBack')}
              </button>

              <button
                type="button"
                onClick={handleConfirmGuest}
                disabled={loading}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text-muted hover:text-zen-text hover:border-amber-500/40 transition-all cursor-pointer text-center"
              >
                {loading ? t('auth.guestNoticeLoading') : t('auth.guestNoticeConfirm')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AuthScreen;
