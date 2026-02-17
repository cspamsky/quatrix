import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  Database,
  Upload,
  Server,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '../utils/api.js';
import Button from '../components/ui/Button.js';
import SearchInput from '../components/ui/SearchInput.js';
import { toast } from 'react-hot-toast';
import socket from '../utils/socket.js';
import { useConfirmDialog } from '../hooks/useConfirmDialog.js';
import CustomSelect from '../components/ui/CustomSelect.js';
import { useTasks } from '../hooks/useTasks.js';
import { clsx } from 'clsx';
import type { Task } from '../contexts/TaskContext.js';

interface Backup {
  id: string;
  server_id: number;
  filename: string;
  size: number;
  type: 'manual' | 'auto';
  comment: string;
  created_at: string;
}

interface Instance {
  id: number;
  name: string;
}

const Backups: React.FC = () => {
  const { t } = useTranslation();
  const { showConfirm } = useConfirmDialog();
  const { addTask, updateTask, removeTask } = useTasks();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [servers, setServers] = useState<Instance[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBackups = async (serverId: string) => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/backups/${serverId}`);
      if (response.ok) {
        const data = await response.json();
        setBackups(data);
      }
    } catch (err) {
      console.error('Fetch backups error:', err);
      toast.error(t('backups.fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchServers = async () => {
    try {
      const response = await apiFetch('/api/servers');
      if (response.ok) {
        const data = await response.json();
        setServers(data);
      }
    } catch (err) {
      console.error('Fetch servers error:', err);
      toast.error(t('backups.fetch_servers_error'));
    }
  };

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

    const handleTaskCompletion = (task: Task) => {
      const metadata = task.metadata as
        | { serverId?: string | number; backupId?: string | number }
        | undefined;
      const isRelevant =
        (task.type === 'backup_create' ||
          task.type === 'backup_upload' ||
          task.type === 'backup_restore') &&
        (String(metadata?.serverId) === String(selectedServerId) ||
          String(metadata?.backupId) === String(selectedServerId));

      if (isRelevant) {
        fetchBackups(selectedServerId);
      }
    };

    socket.on('task_completed', handleTaskCompletion);

    return () => {
      socket.off('task_completed', handleTaskCompletion);
    };
  }, [selectedServerId]);

  const handleCreateBackup = async () => {
    console.log('[Backups] Create Backup button clicked, selectedServer:', selectedServerId);
    if (!selectedServerId) {
      toast.error(t('backups.select_server_warning'));
      return;
    }

    const confirmed = await showConfirm({
      title: t('backups.create_confirm_title'),
      message: t('backups.create_confirm_message'),
      confirmText: t('backups.create_new'),
      cancelText: t('common.cancel'),
    });

    if (confirmed) {
      try {
        const response = await apiFetch(`/api/backups/${selectedServerId}/create`, {
          method: 'POST',
          body: JSON.stringify({ comment: 'Manual Backup' }),
        });

        if (response.ok) {
          toast.success(t('backups.create_started'));
        } else {
          throw new Error();
        }
      } catch (err) {
        console.error('Create backup error:', err);
        toast.error(t('backups.create_failed'));
      }
    }
  };

  const handleRestore = async (backup: Backup) => {
    console.log('[Backups] Restore button clicked for:', backup.filename);
    const confirmed = await showConfirm({
      title: t('backups.restore_confirm_title'),
      message: t('backups.restore_confirm_message', { name: backup.filename }),
      confirmText: t('backups.restore'),
      cancelText: t('common.cancel'),
      type: 'warning',
    });

    if (confirmed) {
      try {
        const response = await apiFetch(`/api/backups/${backup.id}/restore`, {
          method: 'POST',
        });
        if (response.ok) {
          toast.success(t('backups.restore_started'));
        } else {
          throw new Error();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const handleDownload = async (backup: Backup) => {
    const token = localStorage.getItem('token');
    const downloadUrl = `${window.location.origin}/api/backups/${backup.id}/download?token=${token}`;
    window.open(downloadUrl, '_blank');
    toast.success(t('backups.download_started'));
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

    const localTaskId = `local_upload_${Date.now()}`;

    addTask({
      id: localTaskId,
      type: 'backup_upload',
      status: 'pending',
      progress: 0,
      message: 'tasks.messages.uploading_file',
      startTime: Date.now(),
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/backups/${selectedServerId}/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        updateTask(localTaskId, { status: 'running', progress: percent * 0.9 });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        updateTask(localTaskId, { progress: 95, message: 'tasks.messages.processing_on_server' });
        setTimeout(() => removeTask(localTaskId), 3000);
        toast.success(t('backups.upload_started'));
      } else {
        let errorMsg = 'Upload failed';
        try {
          const data = JSON.parse(xhr.responseText);
          errorMsg = data.error || errorMsg;
        } catch (err) {
          console.error('XHR load parse error:', err);
        }
        updateTask(localTaskId, { status: 'failed', message: errorMsg });
        toast.error(errorMsg);
        setTimeout(() => removeTask(localTaskId), 5000);
      }
    };

    xhr.onerror = () => {
      updateTask(localTaskId, { status: 'failed', message: 'Network error' });
      toast.error('Network error');
      setTimeout(() => removeTask(localTaskId), 5000);
    };

    xhr.send(formData);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      } catch (err) {
        console.error('Delete backup error:', err);
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">{t('backups.title')}</h1>
            <p className="text-gray-400 max-w-2xl">{t('backups.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" icon={<Clock size={16} />}>
              {t('backups.schedule_settings_title')}
            </Button>
            <Button
              onClick={handleCreateBackup}
              variant="primary"
              icon={<Plus size={16} />}
              disabled={!selectedServerId}
            >
              {t('backups.create_new')}
            </Button>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative group">
            <CustomSelect
              options={servers.map((s) => ({
                value: s.id.toString(),
                label: s.name,
              }))}
              value={selectedServerId}
              onChange={(val) => setSelectedServerId(val.toString())}
              placeholder={t('backups.select_server')}
              icon={<Server className="w-4 h-4" />}
              size="sm"
            />
          </div>
          <div className="relative group lg:col-span-2">
            <SearchInput
              placeholder={t('backups.search_placeholder')}
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-900/50 backdrop-blur-sm border border-white/5 rounded-2xl">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-gray-400 animate-pulse">{t('common.loading')}</p>
          </div>
        ) : filteredBackups.length > 0 ? (
          <div className="overflow-x-auto bg-gray-900/40 backdrop-blur-md border border-white/5 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">{t('backups.column_filename')}</th>
                  <th className="px-6 py-4 font-semibold">{t('backups.column_type')}</th>
                  <th className="px-6 py-4 font-semibold">{t('backups.column_size')}</th>
                  <th className="px-6 py-4 font-semibold">{t('backups.column_date')}</th>
                  <th className="px-12 py-4 font-semibold text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBackups.map((backup) => (
                  <tr
                    key={backup.id}
                    className="group hover:bg-white/5 transition-colors duration-200"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          <Database size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-white truncate">
                            {backup.filename}
                          </span>
                          <span className="text-xs text-gray-500 truncate">
                            {backup.comment || t('backups.no_comment')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                          backup.type === 'auto'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        )}
                      >
                        {t(`backups.type_${backup.type}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 tabular-nums">
                      {formatSize(backup.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(backup.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleRestore(backup)}
                          variant="secondary"
                          className="h-8 px-3 text-xs bg-primary/10 hover:bg-primary text-primary hover:text-white border-transparent"
                          icon={<RefreshCw size={14} />}
                        >
                          {t('backups.restore')}
                        </Button>
                        <Button
                          onClick={() => handleDownload(backup)}
                          variant="secondary"
                          className="h-8 w-8 p-0 border-white/10 hover:border-primary/50"
                          title={t('backups.download')}
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          onClick={() => handleDelete(backup.id)}
                          variant="danger"
                          className="h-8 w-8 p-0 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500"
                          title={t('common.delete')}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-gray-900/30 backdrop-blur-sm border border-dashed border-white/10 rounded-3xl">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Database className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('backups.no_backups_found')}
            </h3>
            <p className="text-gray-500 text-center max-w-sm">{t('backups.no_backups_desc')}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Backups;
