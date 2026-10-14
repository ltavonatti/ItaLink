import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  User as UserIcon,
  Database,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { storageService, UserStudyProgress } from '../../services/storageService';
import cloudService, { CloudSyncStatus } from '../../services/cloudService';
import { useTranslation } from '../../i18n';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface SyncModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onProgressUpdated?: (progress: UserStudyProgress) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  userId,
  isOpen,
  onClose,
  onProgressUpdated,
}) => {
  const { currentLang } = useTranslation();
  const [activeMainTab, setActiveMainTab] = useState<'cloud' | 'manual'>('cloud');
  const [activeBackupTab, setActiveBackupTab] = useState<'export' | 'import'>('export');
  
  // Cloud state
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>('disconnected');
  const [cloudMessage, setCloudMessage] = useState<string>('');
  const [cloudUser, setCloudUser] = useState<SupabaseUser | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Custom DB Settings State
  const [showDbSettings, setShowDbSettings] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');

  // Backup & Restore State
  const [exportJson, setExportJson] = useState('');
  const [importJson, setImportJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [progress, setProgress] = useState<UserStudyProgress | null>(null);

  useEffect(() => {
    // Subscribe to cloud sync status
    const unsubSync = cloudService.onSyncStatusChange((status, msg) => {
      setCloudStatus(status);
      if (msg) setCloudMessage(msg);
    });

    // Subscribe to cloud auth state
    const unsubAuth = cloudService.onAuthStateChange((user) => {
      setCloudUser(user);
    });

    // Read saved custom DB credentials
    const savedCreds = cloudService.getSavedCustomCredentials();
    if (savedCreds) {
      setCustomUrl(savedCreds.url);
      setCustomKey(savedCreds.anonKey);
    }

    return () => {
      unsubSync();
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, userId]);

  const loadData = async () => {
    const data = await storageService.getProgress(userId);
    setProgress(data);
    const jsonStr = await storageService.exportData(userId);
    setExportJson(jsonStr);
    setStatusMessage(null);
  };

  if (!isOpen) return null;

  // Manual Export / Import Actions
  const handleCopy = () => {
    navigator.clipboard.writeText(exportJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zen-italian-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      setStatusMessage({
        type: 'error',
        text: currentLang === 'zh-CN' ? '请先粘贴备份数据内容。' : 'Please paste the backup JSON string first.',
      });
      return;
    }

    const res = await storageService.importData(userId, importJson.trim());
    if (res.success && res.progress) {
      setProgress(res.progress);
      setImportJson('');
      setStatusMessage({
        type: 'success',
        text: currentLang === 'zh-CN' ? '进度数据恢复成功！' : 'Progress restored successfully!',
      });
      if (onProgressUpdated) {
        onProgressUpdated(res.progress);
      }
      const updatedJson = await storageService.exportData(userId);
      setExportJson(updatedJson);
    } else {
      setStatusMessage({
        type: 'error',
        text: res.message,
      });
    }
  };

  // Cloud Actions
  const handleManualCloudSync = async () => {
    setIsSyncingNow(true);
    try {
      const targetUid = cloudUser?.id || userId;
      const updated = await storageService.syncWithCloud(targetUid);
      setProgress(updated);
      if (onProgressUpdated) {
        onProgressUpdated(updated);
      }
      const updatedJson = await storageService.exportData(targetUid);
      setExportJson(updatedJson);
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError(currentLang === 'zh-CN' ? '请填写邮箱与密码' : 'Please enter email and password');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'signin') {
        const res = await cloudService.signInWithEmail(authEmail.trim(), authPassword);
        if (!res.success) {
          setAuthError(res.error || 'Authentication failed');
        } else {
          // Immediately perform cloud synchronization on login
          const user = cloudService.getCurrentUser();
          if (user) {
            await storageService.syncWithCloud(user.id);
            await loadData();
          }
        }
      } else {
        const res = await cloudService.signUpWithEmail(authEmail.trim(), authPassword);
        if (!res.success) {
          setAuthError(res.error || 'Account creation failed');
        } else {
          const user = cloudService.getCurrentUser();
          if (user) {
            await storageService.syncWithCloud(user.id);
            await loadData();
          }
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await cloudService.signOut();
  };

  const handleSaveCustomCreds = () => {
    if (!customUrl.trim() || !customKey.trim()) {
      setStatusMessage({
        type: 'error',
        text: currentLang === 'zh-CN' ? 'Supabase URL 和 Key 不能为空' : 'Supabase URL and Key cannot be empty',
      });
      return;
    }
    const success = cloudService.setCustomCredentials(customUrl.trim(), customKey.trim());
    if (success) {
      setShowDbSettings(false);
      setStatusMessage({
        type: 'success',
        text: currentLang === 'zh-CN' ? '云端数据库配置成功！' : 'Custom Supabase credentials connected!',
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: currentLang === 'zh-CN' ? '数据库连接失败，请检查 URL 与 Key' : 'Connection failed. Please check URL and Key',
      });
    }
  };

  const handleClearCustomCreds = () => {
    cloudService.clearCustomCredentials();
    setCustomUrl('');
    setCustomKey('');
    setShowDbSettings(false);
    setStatusMessage({
      type: 'success',
      text: currentLang === 'zh-CN' ? '已重置为默认云端设置' : 'Reset to default cloud settings',
    });
  };

  // Render Status Badge
  const renderStatusBadge = () => {
    switch (cloudStatus) {
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {currentLang === 'zh-CN' ? '已连接并实时同步' : 'Live Synced'}
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Loader2 className="w-3 h-3 animate-spin" />
            {currentLang === 'zh-CN' ? '正在同步数据...' : 'Syncing...'}
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {currentLang === 'zh-CN' ? '离线模式 (本地队列)' : 'Offline (Local)'}
          </span>
        );
      case 'error':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
            title={cloudMessage || 'Sync error'}
          >
            <AlertCircle className="w-3 h-3" />
            {currentLang === 'zh-CN' ? '同步异常' : 'Sync Error'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zen-surface-container dark:bg-zen-dark-surface-high text-zen-text-muted border border-zen-border/40">
            <CloudOff className="w-3 h-3" />
            {currentLang === 'zh-CN' ? '本地模式 (未连接云端)' : 'Local Only'}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-zen-surface-lowest dark:bg-zen-dark-surface rounded-3xl border border-zen-border dark:border-zen-dark-border shadow-zen-lg overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zen-border/40 dark:border-zen-dark-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zen-primary/10 text-zen-primary dark:text-zen-dark-primary">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline font-bold text-base sm:text-lg text-zen-text dark:text-zen-dark-text">
                  {currentLang === 'zh-CN' ? '云端同步与数据管理' : 'Cloud Sync & Data'}
                </h3>
              </div>
              <p className="text-xs text-zen-text-muted">
                {currentLang === 'zh-CN' ? '零操作云端自动同步 · 支持本地离线存储' : 'Zero-Manual-Steps Cloud Sync & Local Storage'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zen-text-muted hover:text-zen-text hover:bg-zen-surface-container dark:hover:bg-zen-dark-surface-high transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Progress Summary Strip */}
        {progress && (
          <div className="px-4 sm:px-5 py-2.5 bg-zen-surface-container/30 dark:bg-zen-dark-surface-high/30 border-b border-zen-border/30 dark:border-zen-dark-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-zen-text-muted">{currentLang === 'zh-CN' ? '已掌握: ' : 'Mastered: '}</span>
                <span className="font-mono font-bold text-zen-text dark:text-zen-dark-text">{progress.stats.masteredCount}</span>
              </div>
              <div>
                <span className="text-zen-text-muted">{currentLang === 'zh-CN' ? '连续: ' : 'Streak: '}</span>
                <span className="font-mono font-bold text-zen-primary dark:text-zen-dark-primary">{progress.stats.streakDays}d</span>
              </div>
            </div>
            <div>{renderStatusBadge()}</div>
          </div>
        )}

        {/* Main Tabs Navigation */}
        <div className="px-4 sm:px-5 pt-3 shrink-0">
          <div className="grid grid-cols-2 gap-1 p-1 bg-zen-surface-container dark:bg-zen-dark-surface-high rounded-xl border border-zen-border/40 dark:border-zen-dark-border text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveMainTab('cloud');
                setStatusMessage(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeMainTab === 'cloud'
                  ? 'bg-zen-surface-lowest dark:bg-zen-dark-primary text-zen-primary dark:text-zen-dark-on-primary shadow-zen-sm'
                  : 'text-zen-text-muted hover:text-zen-text'
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span>{currentLang === 'zh-CN' ? '云端无感同步' : 'Native Cloud Sync'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMainTab('manual');
                setStatusMessage(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeMainTab === 'manual'
                  ? 'bg-zen-surface-lowest dark:bg-zen-dark-primary text-zen-primary dark:text-zen-dark-on-primary shadow-zen-sm'
                  : 'text-zen-text-muted hover:text-zen-text'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>{currentLang === 'zh-CN' ? '手动备份与恢复' : 'Manual Backup (JSON)'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {statusMessage && (
          <div className="px-4 sm:px-5 pt-3">
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* ========================================================= */}
          {/* TAB 1: NATIVE CLOUD SYNC */}
          {/* ========================================================= */}
          {activeMainTab === 'cloud' && (
            <div className="space-y-4">
              
              {/* Authenticated User State */}
              {cloudUser ? (
                <div className="p-4 rounded-2xl bg-zen-surface-container/40 dark:bg-zen-dark-surface-high/40 border border-zen-border/50 dark:border-zen-dark-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-zen-primary/10 text-zen-primary dark:text-zen-dark-primary flex items-center justify-center font-bold">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zen-text dark:text-zen-dark-text">
                          {cloudUser.email}
                        </div>
                        <div className="text-[11px] text-zen-text-muted flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          <span>{currentLang === 'zh-CN' ? '已授权云端账户' : 'Authenticated Cloud Account'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{currentLang === 'zh-CN' ? '退出' : 'Sign Out'}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-zen-border/30 dark:border-zen-dark-border flex gap-2">
                    <button
                      type="button"
                      onClick={handleManualCloudSync}
                      disabled={isSyncingNow}
                      className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-zen-primary hover:bg-zen-primary-dark text-white dark:bg-zen-dark-primary dark:text-zen-dark-on-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                      <span>
                        {isSyncingNow
                          ? (currentLang === 'zh-CN' ? '正在同步...' : 'Syncing...')
                          : (currentLang === 'zh-CN' ? '立即与云端双向同步' : 'Sync Now with Cloud')}
                      </span>
                    </button>
                  </div>

                  <p className="text-[11px] text-zen-text-muted leading-relaxed">
                    {currentLang === 'zh-CN'
                      ? '✓ 自动无感模式已激活：每当您学习新单词或完成卡片复习时，系统会在后台静默同步至云端。'
                      : '✓ Automatic background sync is active: every review and card interval is seamlessly mirrored to your cloud account.'}
                  </p>
                </div>
              ) : (
                /* Unauthenticated Auth Box */
                <div className="p-4 rounded-2xl bg-zen-surface-container/40 dark:bg-zen-dark-surface-high/40 border border-zen-border/50 dark:border-zen-dark-border space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zen-border/30 dark:border-zen-dark-border">
                    <div className="text-xs font-bold text-zen-text dark:text-zen-dark-text">
                      {authMode === 'signin'
                        ? (currentLang === 'zh-CN' ? '登录云端账号' : 'Sign In to Cloud Sync')
                        : (currentLang === 'zh-CN' ? '注册新云端账号' : 'Create Free Cloud Account')}
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                          setAuthError(null);
                        }}
                        className="text-zen-primary dark:text-zen-dark-primary hover:underline font-medium"
                      >
                        {authMode === 'signin'
                          ? (currentLang === 'zh-CN' ? '没有账号？注册' : 'Create account')
                          : (currentLang === 'zh-CN' ? '已有账号？登录' : 'Already have account')}
                      </button>
                    </div>
                  </div>

                  {authError && (
                    <div className="p-2 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                      {authError}
                    </div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-2.5">
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-zen-text-muted" />
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder={currentLang === 'zh-CN' ? '邮箱地址' : 'Email address'}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zen-surface-lowest dark:bg-zen-dark-surface border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text focus:outline-none focus:border-zen-primary"
                        required
                      />
                    </div>

                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-zen-text-muted" />
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder={currentLang === 'zh-CN' ? '密码 (至少 6 位)' : 'Password (min. 6 chars)'}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zen-surface-lowest dark:bg-zen-dark-surface border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text focus:outline-none focus:border-zen-primary"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-zen-primary hover:bg-zen-primary-dark text-white dark:bg-zen-dark-primary dark:text-zen-dark-on-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {authLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      <span>
                        {authMode === 'signin'
                          ? (currentLang === 'zh-CN' ? '登录并同步本地进度' : 'Sign In & Sync Progress')
                          : (currentLang === 'zh-CN' ? '创建账号并同步' : 'Sign Up & Sync Progress')}
                      </span>
                    </button>
                  </form>

                  <p className="text-[11px] text-zen-text-muted leading-relaxed">
                    {currentLang === 'zh-CN'
                      ? '💡 提示：即使不登录，您的所有进度也安全储存在本地浏览器中。登录后可在手机、平板与电脑间无感漫游。'
                      : '💡 Tip: Even without signing in, all progress is safely saved locally. Signing in unlocks instant multi-device syncing.'}
                  </p>
                </div>
              )}

              {/* Advanced Custom Database Configuration Accordion */}
              <div className="border border-zen-border/40 dark:border-zen-dark-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDbSettings(!showDbSettings)}
                  className="w-full p-3 bg-zen-surface-container/20 dark:bg-zen-dark-surface-high/20 flex items-center justify-between text-xs font-semibold text-zen-text dark:text-zen-dark-text hover:bg-zen-surface-container/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-zen-text-muted" />
                    <span>{currentLang === 'zh-CN' ? '自定义 Supabase 数据库设置 (可选)' : 'Custom Supabase Database Settings (Optional)'}</span>
                  </div>
                  {showDbSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showDbSettings && (
                  <div className="p-3.5 space-y-3 bg-zen-surface-lowest dark:bg-zen-dark-surface border-t border-zen-border/30 dark:border-zen-dark-border text-xs">
                    <p className="text-[11px] text-zen-text-muted leading-relaxed">
                      {currentLang === 'zh-CN'
                        ? '支持连接您自己专属的 Supabase 项目。如果使用默认环境变量部署，则无需在此配置。'
                        : 'Connect directly to your own self-hosted or managed Supabase instance. Leave blank to use build-time env variables.'}
                    </p>

                    <div>
                      <label className="block text-[11px] font-medium text-zen-text-muted mb-1">
                        Supabase Project URL
                      </label>
                      <input
                        type="text"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://xyzcompany.supabase.co"
                        className="w-full p-2 font-mono text-[11px] rounded-lg bg-zen-surface-container/50 dark:bg-zen-dark-surface-high/50 border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zen-text-muted mb-1">
                        Anon Public Key
                      </label>
                      <input
                        type="password"
                        value={customKey}
                        onChange={(e) => setCustomKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                        className="w-full p-2 font-mono text-[11px] rounded-lg bg-zen-surface-container/50 dark:bg-zen-dark-surface-high/50 border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text focus:outline-none"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveCustomCreds}
                        className="py-1.5 px-3 rounded-lg font-bold text-xs bg-zen-primary text-white dark:bg-zen-dark-primary dark:text-zen-dark-on-primary hover:bg-zen-primary-dark transition-all"
                      >
                        {currentLang === 'zh-CN' ? '保存自定义配置' : 'Save Credentials'}
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCustomCreds}
                        className="py-1.5 px-3 rounded-lg text-xs text-zen-text-muted hover:text-zen-text transition-all"
                      >
                        {currentLang === 'zh-CN' ? '重置为默认' : 'Clear / Use Default'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: MANUAL BACKUP (JSON) */}
          {/* ========================================================= */}
          {activeMainTab === 'manual' && (
            <div className="space-y-4">
              {/* Subtab Selector */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-zen-surface-container dark:bg-zen-dark-surface-high rounded-xl border border-zen-border/40 dark:border-zen-dark-border text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveBackupTab('export');
                    setStatusMessage(null);
                  }}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeBackupTab === 'export'
                      ? 'bg-zen-surface-lowest dark:bg-zen-dark-primary text-zen-primary dark:text-zen-dark-on-primary shadow-zen-sm'
                      : 'text-zen-text-muted hover:text-zen-text'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{currentLang === 'zh-CN' ? '导出备份文件' : 'Export JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveBackupTab('import');
                    setStatusMessage(null);
                  }}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeBackupTab === 'import'
                      ? 'bg-zen-surface-lowest dark:bg-zen-dark-primary text-zen-primary dark:text-zen-dark-on-primary shadow-zen-sm'
                      : 'text-zen-text-muted hover:text-zen-text'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{currentLang === 'zh-CN' ? '恢复导入数据' : 'Import JSON'}</span>
                </button>
              </div>

              {activeBackupTab === 'export' ? (
                <div className="space-y-3">
                  <p className="text-xs text-zen-text-muted leading-relaxed">
                    {currentLang === 'zh-CN'
                      ? '复制下方文本或直接下载备份文件。在另一台设备上选择“恢复导入数据”，即可离线合并进度。'
                      : 'Copy the JSON payload below or download the file. You can paste it into any other device to restore your study data offline.'}
                  </p>

                  <div className="relative">
                    <textarea
                      readOnly
                      value={exportJson}
                      rows={5}
                      className="w-full p-3 font-mono text-[11px] rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text focus:outline-none resize-none select-all"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-zen-primary hover:bg-zen-primary-dark text-white dark:bg-zen-dark-primary dark:text-zen-dark-on-primary transition-all flex items-center justify-center gap-1.5"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? (currentLang === 'zh-CN' ? '已复制到剪贴板' : 'Copied!') : (currentLang === 'zh-CN' ? '复制文本' : 'Copy Payload')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="py-2.5 px-4 rounded-xl font-bold text-xs bg-zen-surface-container dark:bg-zen-dark-surface-high border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text hover:border-zen-primary transition-all flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>{currentLang === 'zh-CN' ? '下载文件' : 'Download'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-zen-text-muted leading-relaxed">
                    {currentLang === 'zh-CN'
                      ? '将从其他设备导出的备份 JSON 文本粘贴至下方，点击恢复即可合并至当前进度。'
                      : 'Paste the backup JSON text from your other device into the box below and click restore.'}
                  </p>

                  <textarea
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    rows={5}
                    placeholder={currentLang === 'zh-CN' ? '在此粘贴备份 JSON 文本...' : 'Paste JSON payload here...'}
                    className="w-full p-3 font-mono text-[11px] rounded-xl bg-zen-surface-container/60 dark:bg-zen-dark-surface-high/60 border border-zen-border/60 dark:border-zen-dark-border text-zen-text dark:text-zen-dark-text focus:outline-none focus:border-zen-primary resize-none"
                  />

                  <button
                    type="button"
                    onClick={handleImport}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-zen-primary hover:bg-zen-primary-dark text-white dark:bg-zen-dark-primary dark:text-zen-dark-on-primary transition-all flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{currentLang === 'zh-CN' ? '立即恢复进度数据' : 'Restore Progress Now'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default SyncModal;
