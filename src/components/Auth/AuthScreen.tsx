import React, { useState } from 'react';
import { Lock, User, Mail, Sparkles, Globe, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { authService, UserAccount } from '../../services/authService';
import { useTranslation } from '../../i18n';

interface AuthScreenProps {
  onAuthenticated: (user: UserAccount) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const { currentLang, toggleLanguage } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error(
            currentLang === 'zh-CN'
              ? '两次输入的密码不一致，请重试。'
              : 'Passwords do not match. Please re-enter.'
          );
        }
        const user = await authService.signUp(username, email, password);
        onAuthenticated(user);
      } else {
        const user = await authService.login(username || email, password);
        onAuthenticated(user);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const guest = await authService.guestLogin();
      onAuthenticated(guest);
    } catch (err: any) {
      setError(err?.message || 'Guest login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zen-surface dark:bg-zen-dark-bg flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 transition-colors">
      
      {/* Top Bar with Language Switcher */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zen-primary text-white flex items-center justify-center font-serif font-black text-sm">
            IT
          </div>
          <span className="font-headline font-bold text-sm text-zen-text dark:text-zen-dark-text">
            Zen Italian
          </span>
        </div>

        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text hover:border-zen-primary transition-all"
        >
          <Globe className="w-3.5 h-3.5 text-zen-primary dark:text-zen-dark-primary" />
          <span>{currentLang === 'zh-CN' ? '中文' : 'EN'}</span>
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-zen-surface-lowest dark:bg-zen-dark-surface rounded-3xl p-6 sm:p-8 border border-zen-border/70 dark:border-zen-dark-border shadow-zen-lg">
        
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zen-primary/10 text-zen-primary dark:text-zen-dark-primary text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{currentLang === 'zh-CN' ? '本地安全认证 · 离线可用' : 'Local Auth · Zero Cloud Needed'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-headline font-bold text-zen-text dark:text-zen-dark-text">
            {isSignUp
              ? currentLang === 'zh-CN'
                ? '创建学习档案'
                : 'Create Account'
              : currentLang === 'zh-CN'
              ? '登录学习系统'
              : 'Welcome Back'}
          </h2>

          <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted">
            {isSignUp
              ? currentLang === 'zh-CN'
                ? '注册本地账号以保存您的词汇熟练度与复习进度。'
                : 'Sign up to persist your vocabulary mastery and review progress.'
              : currentLang === 'zh-CN'
              ? '使用您的本地账号登录以继续意语进阶。'
              : 'Sign in to access your dashboard and flashcard sessions.'}
          </p>
        </div>

        {/* Tab Toggle (Sign In / Sign Up) */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-zen-surface-container dark:bg-zen-dark-surface-high rounded-xl mb-6 border border-zen-border/40 dark:border-zen-dark-border">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              !isSignUp
                ? 'bg-zen-surface-lowest dark:bg-zen-dark-primary text-zen-primary dark:text-zen-dark-on-primary shadow-zen-sm'
                : 'text-zen-text-muted dark:text-zen-dark-text-muted hover:text-zen-text'
            }`}
          >
            {currentLang === 'zh-CN' ? '已有账号登录' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              isSignUp
                ? 'bg-zen-surface-lowest dark:bg-zen-dark-primary text-zen-primary dark:text-zen-dark-on-primary shadow-zen-sm'
                : 'text-zen-text-muted dark:text-zen-dark-text-muted hover:text-zen-text'
            }`}
          >
            {currentLang === 'zh-CN' ? '新用户注册' : 'Sign Up'}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zen-text dark:text-zen-dark-text mb-1">
              {isSignUp
                ? currentLang === 'zh-CN'
                  ? '用户名'
                  : 'Username'
                : currentLang === 'zh-CN'
                ? '用户名或邮箱'
                : 'Username or Email'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zen-text-muted">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={
                  isSignUp
                    ? currentLang === 'zh-CN'
                      ? '例如：Marco'
                      : 'e.g. Marco'
                    : currentLang === 'zh-CN'
                    ? '输入用户名或邮箱'
                    : 'Enter username or email'
                }
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/60 dark:border-zen-dark-border text-sm text-zen-text dark:text-zen-dark-text focus:outline-none focus:border-zen-primary transition-colors"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-zen-text dark:text-zen-dark-text mb-1">
                {currentLang === 'zh-CN' ? '电子邮箱' : 'Email Address'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zen-text-muted">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/60 dark:border-zen-dark-border text-sm text-zen-text dark:text-zen-dark-text focus:outline-none focus:border-zen-primary transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zen-text dark:text-zen-dark-text mb-1">
              {currentLang === 'zh-CN' ? '密码' : 'Password'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zen-text-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/60 dark:border-zen-dark-border text-sm text-zen-text dark:text-zen-dark-text focus:outline-none focus:border-zen-primary transition-colors"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-zen-text dark:text-zen-dark-text mb-1">
                {currentLang === 'zh-CN' ? '确认密码' : 'Confirm Password'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zen-text-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/60 dark:border-zen-dark-border text-sm text-zen-text dark:text-zen-dark-text focus:outline-none focus:border-zen-primary transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-zen-primary hover:bg-zen-primary-dark text-white dark:bg-zen-dark-primary dark:text-zen-dark-on-primary transition-all shadow-zen-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{loading ? '...' : currentLang === 'zh-CN' ? '立即注册并进入' : 'Sign Up & Enter'}</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{loading ? '...' : currentLang === 'zh-CN' ? '登录并进入' : 'Sign In & Enter'}</span>
              </>
            )}
          </button>
        </form>

        {/* Guest Access Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zen-border/60 dark:border-zen-dark-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-zen-surface-lowest dark:bg-zen-dark-surface text-zen-text-muted">
              {currentLang === 'zh-CN' ? '或者' : 'Or'}
            </span>
          </div>
        </div>

        {/* Quick Guest / Demo Login */}
        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text hover:border-zen-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-zen-primary dark:text-zen-dark-primary" />
          <span>{currentLang === 'zh-CN' ? '以访客身份快速体验 (免注册)' : 'Continue as Guest (Instant Access)'}</span>
        </button>

      </div>

      {/* Footer Info */}
      <p className="mt-8 text-center text-xs text-zen-text-muted">
        Zen Italian · {currentLang === 'zh-CN' ? '离线优先 · 本地加密存储' : 'Offline-First · Local Encrypted Storage'}
      </p>

    </div>
  );
};

export default AuthScreen;
