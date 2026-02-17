import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  Trash2,
  RotateCcw,
  Plus,
  HardDrive,
  Calendar,
  AlertCircle,
  Clock,
  Download,
  Upload,
  Server,
} from 'lucide-react';
import { formatDate } from '../utils/date';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useConfirmDialog } from '../hooks/useConfirmDialog.js';
import { apiFetch } from '../utils/api';
import type { Backup, Instance } from '../types';
import BackupScheduleModal from '../components/backups/BackupScheduleModal';
import CustomSelect from '../components/ui/CustomSelect';
import SearchInput from '../components/ui/SearchInput';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Backups: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { showConfirm } = useConfirmDialog();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [servers, setServers] = useState<Instance[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | number>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    if (selectedServerId) {
      fetchBackups(selectedServerId);
    } else {
      setBackups([]);
      setLoading(false);
    }
  }, [selectedServerId]);

  const fetchServers = async () => {
    try {
      const response = await apiFetch('/api/servers');
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();

      const serverArray = (Array.isArray(data) ? data : []) as Instance[];
      setServers(serverArray);

      if (serverArray && serverArray.length > 0) {
        setSelectedServerId(serverArray[0].id);
      } else {
        setLoading(false);
      }
    } catch {
      toast.error(t('backups.error_fetch_servers'));
      setLoading(false);
    }
  };

  const fetchBackups = async (serverId: string | number) => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/backups/${serverId}`);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      setBackups((Array.isArray(data) ? data : []) as Backup[]);
    } catch {
      toast.error(t('backups.error_fetch_backups'));
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!selectedServerId) return;

    try {
      const response = await apiFetch(`/api/backups/${selectedServerId}/create`, {
        method: 'POST',
        body: JSON.stringify({ comment: 'Manual Backup', type: 'manual' }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start backup');
      }
      // Success is handled by GlobalTaskOverlay
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRestore = async (backup: Backup) => {
    const confirmed = await showConfirm({
      title: t('backups.restore_confirm_title'),
      message: t('backups.restore_confirm_message', { filename: backup.filename }),
      confirmText: t('common.start'),
      cancelText: t('common.cancel'),
      type: 'warning',
    });

    if (confirmed) {
      try {
        const response = await apiFetch(`/api/backups/${backup.id}/restore`, {
          method: 'POST',
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to start restore');
        }
        // Success is handled by GlobalTaskOverlay
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const handleDownload = async (backup: Backup) => {
    try {
      // Direct download link with token
      const token = localStorage.getItem('token');
      const downloadUrl = `${window.location.origin}/api/backups/${backup.id}/download?token=${token}`;
      window.open(downloadUrl, '_blank');
      toast.success(t('backups.download_started'));
    } catch {
      toast.error(t('backups.download_failed'));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedServerId) return;

    const formData = new FormData();
    formData.append('backup', file);
    formData.append('comment', 'External Upload');

    try {
      const response = await fetch(`/api/backups/${selectedServerId}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      // Task will handle UI feedback
      toast.success(t('backups.upload_started'));
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: t('backups.delete_confirm_title'),
      message: t('backups.delete_confirm_message'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
    });

    if (confirmed) {
      try {
        const response = await apiFetch(`/api/backups/${id}`, { method: 'DELETE' });
        if (response.ok) {
          toast.success(t('backups.deleted_success'));
          fetchBackups(selectedServerId);
        } else {
          throw new Error();
        }
      } catch {
        toast.error(t('backups.delete_failed'));
      }
    }
  };

  const filteredBackups = backups.filter(
    (b: Backup) =>
      (b.filename?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (b.comment?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <div className="p-6 space-y-8 animate-in fade-in duration-700">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">{t('backups.title')}</h1>
            <p className="text-gray-400 max-w-2xl">{t('backups.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsScheduleModalOpen(true)}
              variant="secondary"
              icon={<Clock size={16} />}
            >
              {t('backups.schedule_settings_title')}
            </Button>
            <Button
              onClick={handleCreateBackup}
              variant="primary"
              icon={<Plus size={16} />}
              disabled={!selectedServerId}
            >
              {t('backups.create_new')}            </Button>
            <Button
              onClick={handleUploadClick}
              variant="secondary"
              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20"
              icon={<Upload size={16} />}
              disabled={!selectedServerId}
            >
              {t('backups.upload_external')}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".zip"
              className="hidden"
            />
          </div>
        </div>

        {/* Control Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative group">
            <CustomSelect
              options={servers.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              value={selectedServerId}
              onChange={(val) => setSelectedServerId(val)}
              placeholder={t('backups.select_server')}
              icon={<Server className="w-4 h-4" />}
              size="sm"
            />
          </div>

          <div className="lg:col-span-2">
            <SearchInput
              placeholder={t('backups.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Backups List */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl relative min-h-[400px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <IconButton
                  isLoading
                  variant="ghost"
                  size="lg"
                  className="text-primary pointer-events-none"
                >
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </IconButton>
                <p className="text-gray-400 font-medium">{t('common.loading')}</p>
              </div>
            </div>
          ) : filteredBackups.length > 0 ? (
            <>
              {/* Backup Count Info */}
              <div className="px-6 py-3 bg-white/5 border-b border-white/10">
                <p className="text-sm text-gray-400">
                  {t('common.backup', { count: filteredBackups.length })}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {t('backups.column_date')}
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {t('backups.column_filename')}
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {t('backups.column_size')}
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {t('backups.column_type')}
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredBackups.map((backup) => (
                      <tr key={backup.id} className="group hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                            <span className="text-sm font-medium text-white whitespace-nowrap">
                              {formatDate(
                                backup.createdAt,
                                t('common.date_formats.long'),
                                i18n.language
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col max-w-[300px]">
                            <span
                              className="text-sm font-semibold text-gray-200 truncate"
                              title={backup.filename}
                            >
                              {backup.filename}
                            </span>
                            {backup.comment && (
                              <span className="text-xs text-gray-500 truncate">
                                {backup.comment}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-300 font-medium tabular-nums">
                              {formatSize(backup.size)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                              backup.type === 'manual'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            )}
                          >
                            {backup.type === 'manual'
                              ? t('backups.type_manual')
                              : t('backups.type_auto')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 px-1">
                            <IconButton
                              onClick={() => handleRestore(backup)}
                              variant="ghost"
                              className="text-primary hover:bg-primary/10"
                              title={t('backups.restore')}
                            >
                              <RotateCcw className="w-5 h-5" />
                            </IconButton>
                            <IconButton
                              onClick={() => handleDownload(backup)}
                              variant="ghost"
                              className="text-blue-400 hover:bg-blue-400/10"
                              title={t('backups.download')}
                            >
                              <Download className="w-5 h-5" />
                            </IconButton>
                            <IconButton
                              onClick={() => handleDelete(backup.id)}
                              variant="ghost"
                              className="text-gray-500 hover:text-red-400 hover:bg-red-400/10"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-5 h-5" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 group hover:bg-white/10 transition-colors">
                <Archive className="w-10 h-10 text-gray-600 group-hover:text-primary/50 transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('backups.no_backups_found')}</h3>
              <p className="text-gray-500 max-w-sm mb-8">
                {selectedServerId
                  ? t('backups.no_backups_desc')
                  : t('backups.no_server_selected_desc')}
              </p>
              {selectedServerId && (
                <Button
                  onClick={handleCreateBackup}
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="w-5 h-5" />}
                >
                  {t('backups.create_new')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Proactive Tip */}
        <div className="flex items-start gap-4 p-5 bg-primary/5 border border-primary/10 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle className="w-24 h-24 text-primary" />
          </div>
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0 shadow-inner">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1 relative z-10">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              {t('backups.tip_title')}
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              {t('backups.tip_message')}
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      <BackupScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />
    </>
  );
};

export default Backups;
