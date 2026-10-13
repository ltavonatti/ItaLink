import React, { useState, useEffect } from 'react';
import { X, Download, Upload, Copy, Check, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { storageService, UserStudyProgress } from '../../services/storageService';
import { useTranslation } from '../../i18n';

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
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportJson, setExportJson] = useState('');
  const [importJson, setImportJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [progress, setProgress] = useState<UserStudyProgress | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-zen-surface-lowest dark:bg-zen-dark-surface rounded-3xl border border-zen-border dark:border-zen-dark-border shadow-zen-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-zen-border/40 dark:border-zen-dark-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zen-primary/10 text-zen-primary dark:text-zen-dark-primary">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-lg text-zen-text dark:text-zen-dark-text">
                {currentLang === 'zh-CN' ? '跨设备数据同步与备份' : 'Cross-Device Data Sync'}
              </h3>
              <p className="text-xs text-zen-text-muted">
                {currentLang === 'zh-CN' ? '本地存储解耦架构 · 支持导入与导出' : 'Decoupled Storage Layer · Text Backup & Restore'}
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

        {/* Current Stats Summary */}
        {progress && (
          <div className="px-5 sm:px-6 py-3 bg-zen-surface-container/40 dark:bg-zen-dark-surface-high/40 border-b border-zen-border/30 dark:border-zen-dark-border grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-zen-text-muted block">{currentLang === 'zh-CN' ? '已掌握卡片' : 'Mastered'}</span>
              <span className="font-mono font-bold text-sm text-zen-text dark:text-zen-dark-text">{progress.stats.masteredCount}</span>
            </div>
            <div>
              <span className="text-zen-text-muted block">{currentLang === 'zh-CN' ? '复习总次数' : 'Total Reviews'}</span>
              <span className="font-mono font-bold text-sm text-zen-text dark:text-zen-dark-text">{progress.stats.totalReviews}</span>
            </div>
            <div>
              <span className="text-zen-text-muted block">{currentLang === 'zh-CN' ? '连续学习' : 'Streak'}</span>
              <span className="font-mono font-bold text-sm text-zen-primary dark:text-zen-dark-primary">{progress.stats.streakDays} {currentLang === 'zh-CN' ? '天' : 'days'}</span>
            </div>
          </div>
        )}

        {/* Tab Selector (Export / Import) */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-zen-surface-container dark:bg-zen-dark-surface-high rounded-xl border border-zen-border/40 dark:border-zen-dark-border text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('export');
                setStatusMessage(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'export'
                  ? 'bg-zen-surface-lowest dark:bg-zen-dark-primary text-zen-primary dark:text-zen-dark-on-primary shadow-zen-sm'
                  : 'text-zen-text-muted hover:text-zen-text'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{currentLang === 'zh-CN' ? '导出备份数据' : 'Export Backup'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('import');
                setStatusMessage(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'import'
                  ? 'bg-zen-surface-lowest dark:bg-zen-dark-primary text-zen-primary dark:text-zen-dark-on-primary shadow-zen-sm'
                  : 'text-zen-text-muted hover:text-zen-text'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{currentLang === 'zh-CN' ? '导入跨设备数据' : 'Import Progress'}</span>
            </button>
          </div>

          {/* Feedback Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
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
          )}

          {activeTab === 'export' ? (
            <div className="space-y-3">
              <p className="text-xs text-zen-text-muted leading-relaxed">
                {currentLang === 'zh-CN'
                  ? '复制下方文本或直接下载备份文件。在另一台设备上进入此页面选择“导入”，即可无缝同步词汇掌握记录。'
                  : 'Copy the JSON payload below or download the file. You can paste it into any other device to restore your study data.'}
              </p>

              <div className="relative">
                <textarea
                  readOnly
                  value={exportJson}
                  rows={6}
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
                  <span>{currentLang === 'zh-CN' ? '下载备份文件' : 'Download .json'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zen-text-muted leading-relaxed">
                {currentLang === 'zh-CN'
                  ? '将从其他设备导出的备份 JSON 文本粘贴至下方，点击恢复即可合并覆盖当前进度。'
                  : 'Paste the backup JSON text from your other device into the box below and click restore.'}
              </p>

              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                rows={6}
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

      </div>
    </div>
  );
};

export default SyncModal;
