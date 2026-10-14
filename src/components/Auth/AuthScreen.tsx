import React, { useState } from 'react';
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
} from 'lucide-react';
import { authService, UserAccount } from '../../services/authService';
import cloudService from '../../services/cloudService';
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
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGuestWarningModal, setShowGuestWarningModal] = useState(false);

  const isCloudReady = cloudService.isConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error(
            currentLang === 'zh-CN'
              ? '两次输入的密码不一致，请重新输入。'
              : 'Passwords do not match. Please re-enter.'
          );
        }
        if (password.length < 6) {
          throw new Error(
            currentLang === 'zh-CN'
              ? '密码长度不能少于 6 位。'
              : 'Password must be at least 6 characters.'
          );
        }

        const result = await authService.signUp(username, email, password);
        if (result.requiresConfirmation) {
          setSuccessNotice(
            currentLang === 'zh-CN'
              ? `注册确认邮件已发送至 ${email}。请查收邮件完成验证后登录。`
              : `Confirmation email sent to ${email}. Please check your inbox and confirm your address before signing in.`
          );
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
      setError(err?.message || 'Authentication failed. Please check your credentials.');
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
      setError(err?.message || 'Guest access failed.');
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
              Italiano · {currentLang === 'zh-CN' ? '智能意语学习' : 'Spaced Repetition'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text hover:border-zen-primary transition-all cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-zen-primary dark:text-zen-dark-primary" />
          <span>{currentLang === 'zh-CN' ? '中文' : 'EN'}</span>
        </button>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-zen-surface-lowest dark:bg-zen-dark-surface rounded-3xl p-6 sm:p-8 border border-zen-border/70 dark:border-zen-dark-border shadow-zen-xl">
        
        {/* Cloud Readiness Badge */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Cloud className="w-3.5 h-3.5" />
            <span>
              {isCloudReady
                ? currentLang === 'zh-CN'
                  ? '云端同步已连接 · Supabase'
                  : 'Cloud Sync Connected · Supabase'
                : currentLang === 'zh-CN'
                ? '本地离线存储模式'
                : 'Local Offline Storage Mode'}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-headline font-bold text-zen-text dark:text-zen-dark-text tracking-tight">
            {isSignUp
              ? currentLang === 'zh-CN'
                ? '创建云端学习档案'
                : 'Create Account'
              : currentLang === 'zh-CN'
              ? '登录您的学习账号'
              : 'Welcome Back'}
          </h2>

          <p className="text-xs sm:text-sm text-zen-text-muted dark:text-zen-dark-text-muted">
            {isSignUp
              ? currentLang === 'zh-CN'
                ? '注册账号以自动将学习进度、艾宾浩斯复习曲线与打卡数据漫游至云端。'
                : 'Sign up to auto-sync your SRS intervals, review streaks, and mastery to the cloud.'
              : currentLang === 'zh-CN'
              ? '登录账号以即时同步您的多端学习记录。'
              : 'Sign in to access your saved progress and multi-device cloud backups.'}
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
            {currentLang === 'zh-CN' ? '账号登录' : 'Sign In'}
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
            {currentLang === 'zh-CN' ? '新用户注册' : 'Sign Up'}
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
                {currentLang === 'zh-CN' ? '用户昵称' : 'Display Name / Username'}
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
                  placeholder={currentLang === 'zh-CN' ? '例如：Marco' : 'e.g. Marco'}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/60 dark:border-zen-dark-border text-sm text-zen-text dark:text-zen-dark-text focus:outline-none focus:border-zen-primary transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zen-text dark:text-zen-dark-text mb-1.5">
              {currentLang === 'zh-CN' ? '电子邮箱' : 'Email Address'}
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
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/60 dark:border-zen-dark-border text-sm text-zen-text dark:text-zen-dark-text focus:outline-none focus:border-zen-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zen-text dark:text-zen-dark-text mb-1.5">
              {currentLang === 'zh-CN' ? '密码 (最少6位)' : 'Password (min. 6 characters)'}
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
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/60 dark:border-zen-dark-border text-sm text-zen-text dark:text-zen-dark-text focus:outline-none focus:border-zen-primary transition-colors"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-zen-text dark:text-zen-dark-text mb-1.5">
                {currentLang === 'zh-CN' ? '确认密码' : 'Confirm Password'}
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
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/60 dark:border-zen-dark-border text-sm text-zen-text dark:text-zen-dark-text focus:outline-none focus:border-zen-primary transition-colors"
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
                <span>{loading ? '...' : currentLang === 'zh-CN' ? '注册并开启云端同步' : 'Create Account & Sync'}</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{loading ? '...' : currentLang === 'zh-CN' ? '登录云端账号' : 'Sign In to Cloud Account'}</span>
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
              {currentLang === 'zh-CN' ? '免注册体验' : 'Or Experience Instantly'}
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
                {currentLang === 'zh-CN' ? '以访客身份继续' : 'Continue as Guest'}
              </span>
              <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-normal">
                {currentLang === 'zh-CN' ? '仅存本地 · 无云端同步' : 'Local only · No cloud save'}
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-500/70 group-hover:translate-x-1 transition-transform" />
        </button>

      </div>

      {/* Footer Info */}
      <p className="mt-6 text-center text-xs text-zen-text-muted">
        ItaLink · {currentLang === 'zh-CN' ? '现代智能意语闪卡与艾宾浩斯复习系统' : 'Modern Italian Vocabulary & Spaced Repetition'}
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
                  {currentLang === 'zh-CN' ? '访客模式警告' : 'Guest Mode Notice'}
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  {currentLang === 'zh-CN' ? '学习进度将 不会 保存到云端' : 'Progress will NOT be saved to cloud'}
                </p>
              </div>
            </div>

            {/* Warning Details Body */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-zen-text dark:text-zen-dark-text space-y-2 mb-6">
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                {currentLang === 'zh-CN'
                  ? '以访客身份进入系统时：'
                  : 'When entering as a guest:'}
              </p>
              <ul className="list-disc list-inside space-y-1 text-zen-text-muted dark:text-zen-dark-text-muted pl-1">
                <li>
                  {currentLang === 'zh-CN'
                    ? '所有词汇熟练度、艾宾浩斯复习计划与连续打卡记录仅保存在此浏览器中。'
                    : 'All flashcard reviews, SRS intervals, and streak days are saved only on this browser.'}
                </li>
                <li>
                  {currentLang === 'zh-CN'
                    ? '清理浏览器缓存、在无痕模式下浏览或更换设备，数据将永久丢失且无法恢复。'
                    : 'Clearing browser cache, using incognito mode, or switching devices will permanently erase all data.'}
                </li>
                <li>
                  {currentLang === 'zh-CN'
                    ? '若需长期学习，强烈建议注册免费账号开启自动云端保存。'
                    : 'To ensure your study journey is safe, we strongly recommend signing up for free.'}
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setShowGuestWarningModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-zen-primary text-white hover:bg-zen-primary-dark transition-all cursor-pointer shadow-sm text-center"
              >
                {currentLang === 'zh-CN' ? '返回登录 / 注册' : 'Go Back to Sign In'}
              </button>

              <button
                type="button"
                onClick={handleConfirmGuest}
                disabled={loading}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text-muted hover:text-zen-text hover:border-amber-500/40 transition-all cursor-pointer text-center"
              >
                {loading
                  ? '...'
                  : currentLang === 'zh-CN'
                  ? '我已知晓，以访客继续'
                  : 'I Understand, Continue as Guest'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AuthScreen;
