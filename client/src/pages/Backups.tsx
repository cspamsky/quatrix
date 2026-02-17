import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  Database,
  FileText,
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

    const handleTaskCompletion = (task: any) => {
      const isRelevant =
        (task.type === 'backup_create' ||
          task.type === 'backup_upload' ||
          task.type === 'backup_restore') &&
        (String(task.metadata?.serverId) === String(selectedServerId) ||
          String(task.metadata?.backupId) === String(selectedServerId));

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
    if (!selectedServerId) return;

    const confirmed = await showConfirm({
      title: t('backups.create_confirm_title'),
      message: t('backups.create_confirm_message'),
      confirmText: t('backups.create_new'),
      cancelText: t('common.cancel'),
    });

    if (confirmed) {
      try {
        const response = await apiFetch(`/api/backups/${selectedServerId}`, {
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBackups.map((backup) => (
              <div
                key={backup.id}
                className="group relative bg-gray-900/40 hover:bg-gray-900/60 backdrop-blur-md border border-white/5 hover:border-primary/30 rounded-2xl p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform duration-300">
                    <Database size={24} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={clsx(
                        'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        backup.type === 'auto'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      )}
                    >
                      {backup.type}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-semibold truncate group-hover:text-primary transition-colors">
                    {backup.filename}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-1 italic">
                    {backup.comment || t('backups.no_comment')}
                  </p>

                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/5">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock size={14} className="text-primary/60" />
                      <span className="text-[11px] font-medium tabular-nums">
                        {new Date(backup.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <FileText size={14} className="text-primary/60" />
                      <span className="text-[11px] font-medium tracking-tight">
                        {formatSize(backup.size)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-5">
                  <Button
                    onClick={() => handleRestore(backup)}
                    className="flex-1 bg-primary/10 hover:bg-primary text-primary hover:text-white border-transparent"
                    size="sm"
                    icon={<RefreshCw size={14} />}
                  >
                    {t('backups.restore')}
                  </Button>
                  <Button
                    onClick={() => handleDownload(backup)}
                    variant="secondary"
                    className="aspect-square p-0 w-9 h-9 border-white/10 hover:border-primary/50"
                    size="sm"
                    title={t('backups.download')}
                  >
                    <Download size={14} />
                  </Button>
                  <Button
                    onClick={() => handleDelete(backup.id)}
                    variant="danger"
                    className="aspect-square p-0 w-9 h-9 bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500"
                    size="sm"
                    title={t('common.delete')}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-gray-900/30 backdrop-blur-sm border border-dashed border-white/10 rounded-3xl">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Database className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('backups.empty_title')}</h3>
            <p className="text-gray-500 text-center max-w-sm">{t('backups.empty_message')}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Backups;
