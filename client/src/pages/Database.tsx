import { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  ExternalLink,
  Layers,
  Server,
  Check,
  Copy,
  Settings,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import Checkbox from '../components/ui/Checkbox';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DatabaseInfo {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
}

interface ServerWithDB {
  id: number;
  name: string;
  db: DatabaseInfo | null;
  stats?: { size: number; tables: number };
  auto_db_injection: number;
}

const DatabasePage = () => {
  const { t } = useTranslation();
  const [servers, setServers] = useState<ServerWithDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [globalStatus, setGlobalStatus] = useState<'ONLINE' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const [manualForm, setManualForm] = useState({
    host: '',
    port: '3306',
    database: '',
    user: '',
    password: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const statusRes = await apiFetch('/api/servers/database/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setGlobalStatus(statusData.status);
      } else {
        setGlobalStatus('OFFLINE');
      }

      const response = await apiFetch('/api/servers');
      if (response.ok) {
        const serverList = await response.json();

        const enrichedServers = await Promise.all(
          serverList.map(async (srv: { id: number; name: string }) => {
            const dbRes = await apiFetch(`/api/servers/${srv.id}/database`);
            const dbData = dbRes.ok ? await dbRes.json() : null;
            return {
              id: srv.id,
              name: srv.name,
              db: dbData?.credentials || null,
              stats: dbData?.stats || { size: 0, tables: 0 },
              auto_db_injection: (srv as any).auto_db_injection || 0,
            };
          })
        );

        setServers(enrichedServers);
      }
    } catch {
      console.error('Failed to fetch data');
      toast.error(t('database.load_failed'));
      setGlobalStatus('OFFLINE');
    } finally {
      setLoading(false);
    }
  };

  const handleProvision = async (serverId: number) => {
    setProvisioning(serverId);
    try {
      const res = await apiFetch(`/api/servers/${serverId}/database/provision`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? { ...s, db: data.credentials } : s))
        );
        toast.success(t('database.provision_success'));
      } else {
        toast.error(t('database.provision_failed'));
      }
    } catch {
      toast.error(t('database.connection_error'));
    } finally {
      setProvisioning(null);
    }
  };

  const handleToggleAutoInjection = async (serverId: number, enabled: boolean) => {
    try {
      // First get full server data from API to ensure we don't break other settings
      const srvRes = await apiFetch(`/api/servers/${serverId}`);
      if (!srvRes.ok) throw new Error('Failed to fetch server data');
      const serverData = await srvRes.json();

      const updatedData = {
        ...serverData,
        auto_db_injection: enabled ? 1 : 0,
      };

      const res = await apiFetch(`/api/servers/${serverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (res.ok) {
        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? { ...s, auto_db_injection: enabled ? 1 : 0 } : s))
        );
        toast.success(t('database.auto_injection_updated'));
      } else {
        toast.error(t('database.auto_injection_failed'));
      }
    } catch {
      toast.error(t('database.connection_error'));
    }
  };

  const handleSaveManual = async (id: number) => {
    try {
      const response = await apiFetch(`/api/servers/${id}/database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm),
      });

      if (response.ok) {
        toast.success(t('database.credentials_saved'));
        setEditingId(null);
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.message || t('database.save_failed'));
      }
    } catch {
      toast.error(t('database.server_connect_failed'));
    }
  };

  const handleCustomProvision = async (id: number) => {
    try {
      const response = await apiFetch(`/api/servers/${id}/database/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: manualForm.user,
          password: manualForm.password,
          database: manualForm.database,
        }),
      });

      if (response.ok) {
        toast.success(t('database.local_db_created'));
        setEditingId(null);
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.message || t('database.local_db_failed'));
      }
    } catch {
      toast.error(t('database.server_connect_failed'));
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedKey(key);
          toast.success(t('database.copied'));
          setTimeout(() => setCopiedKey(null), 2000);
        })
        .catch(() => {
          toast.error(t('instances.copy_error'));
        });
    } else {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedKey(key);
        toast.success(t('database.copied'));
        setTimeout(() => setCopiedKey(null), 2000);
      } catch {
        toast.error(t('instances.copy_unsupported'));
      }
    }
  };

  const openManualEntry = (server: ServerWithDB) => {
    setEditingId(server.id);
    if (server.db) {
      setManualForm({
        host: server.db.host,
        port: String(server.db.port),
        database: server.db.database,
        user: server.db.user,
        password: server.db.password || '',
      });
    } else {
      setManualForm({ host: '', port: '3306', database: '', user: '', password: '' });
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <IconButton size="lg" isLoading variant="ghost" className="text-primary">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen flex flex-col">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="text-left">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">{t('database.title')}</h2>
            <div
              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                globalStatus === 'ONLINE'
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : globalStatus === 'OFFLINE'
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                    : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${globalStatus === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-current'}`}
              ></span>
              MariaDB: {globalStatus}
            </div>
          </div>
          <p className="text-gray-400 max-w-2xl text-left text-sm mt-1">{t('database.subtitle')}</p>
        </div>
        <IconButton onClick={fetchData} isLoading={loading} title={t('database.refresh_stats')}>
          <RefreshCw
            className={cn(
              'w-4 h-4 transition-transform duration-500 group-active:rotate-180',
              loading && 'animate-spin text-primary'
            )}
          />
        </IconButton>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {servers.map((server) => (
          <div
            key={server.id}
            className="bg-[#111827]/50 backdrop-blur-xl rounded-3xl border border-gray-800/50 overflow-hidden flex flex-col shadow-2xl transition-all hover:border-primary/20"
          >
            <div className="p-6 border-b border-gray-800/50 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">
                    {server.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      ID:{server.id}
                    </span>
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${server.db ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {!server.db && !editingId && (
                  <>
                    <Button
                      onClick={() => handleProvision(server.id)}
                      isLoading={provisioning === server.id}
                      variant="primary"
                      size="sm"
                    >
                      {provisioning === server.id
                        ? t('database.provisioning')
                        : t('database.auto_provision')}
                    </Button>
                    <Button onClick={() => openManualEntry(server)} variant="secondary" size="sm">
                      {t('database.manual')}
                    </Button>
                  </>
                )}
                {server.db && editingId !== server.id && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => window.open(window.location.origin + '/phpmyadmin/', '_blank')}
                      variant="ghost"
                      size="sm"
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                      className="text-[#bbc4ff] border-[#6c78af]/30 hover:bg-[#6c78af]/10"
                    >
                      phpMyAdmin
                    </Button>
                    <IconButton
                      onClick={() => openManualEntry(server)}
                      variant="ghost"
                      size="sm"
                      title={t('database.edit_config')}
                    >
                      <Settings className="w-4 h-4" />
                    </IconButton>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 flex-1">
              {editingId === server.id ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {t('database.host')}
                      </label>
                      <input
                        className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                        value={manualForm.host}
                        onChange={(e) => setManualForm({ ...manualForm, host: e.target.value })}
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {t('database.port')}
                      </label>
                      <input
                        className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                        value={manualForm.port}
                        onChange={(e) => setManualForm({ ...manualForm, port: e.target.value })}
                        placeholder="3306"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {t('database.database_name')}
                    </label>
                    <input
                      className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                      value={manualForm.database}
                      onChange={(e) => setManualForm({ ...manualForm, database: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {t('database.username')}
                      </label>
                      <input
                        className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                        value={manualForm.user}
                        onChange={(e) => setManualForm({ ...manualForm, user: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {t('database.password')}
                      </label>
                      <input
                        type="password"
                        className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                        value={manualForm.password}
                        onChange={(e) => setManualForm({ ...manualForm, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-4">
                    <Button
                      onClick={() => handleSaveManual(server.id)}
                      variant="primary"
                      size="sm"
                      className="flex-1"
                    >
                      {t('database.save_config')}
                    </Button>
                    {(!manualForm.host ||
                      manualForm.host === 'localhost' ||
                      manualForm.host === '127.0.0.1') && (
                      <Button
                        onClick={() => handleCustomProvision(server.id)}
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                      >
                        {t('database.create_local_db')}
                      </Button>
                    )}
                    <Button
                      onClick={() => setEditingId(null)}
                      variant="secondary"
                      size="sm"
                      className="px-6"
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : server.db ? (
                <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-500">
                  {[
                    {
                      label: t('database.host'),
                      value: `${server.db.host}:${server.db.port}`,
                      key: `host-${server.id}`,
                    },
                    {
                      label: t('database.database'),
                      value: server.db.database,
                      key: `db-${server.id}`,
                    },
                    { label: t('database.user'), value: server.db.user, key: `user-${server.id}` },
                    {
                      label: t('database.password'),
                      value: server.db.password || '********',
                      key: `pass-${server.id}`,
                    },
                  ].map((field) => (
                    <div key={field.key} className="space-y-2 group">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-extrabold text-gray-600 uppercase tracking-widest">
                          {field.label}
                        </label>
                      </div>
                      <div
                        onClick={() => copyToClipboard(field.value, field.key)}
                        className={`flex items-center justify-between px-4 py-3 border rounded-2xl transition-all cursor-pointer overflow-hidden ${
                          copiedKey === field.key
                            ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                            : 'bg-black/30 border-gray-800/40 hover:border-primary/40 hover:bg-primary/[0.02]'
                        }`}
                      >
                        <span className="text-xs text-gray-300 font-mono truncate mr-2">
                          {field.value}
                        </span>
                        {copiedKey === field.key ? (
                          <Check className="w-4 h-4 text-green-500 shrink-0 scale-110 transition-transform" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="col-span-2 mt-2 pt-4 border-t border-gray-800/30 grid grid-cols-2 gap-4 text-center">
                    <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/[0.02]">
                      <div className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mb-1">
                        {t('database.storage_size')}
                      </div>
                      <div className="text-lg font-bold text-white font-mono">
                        {server.stats?.size || 0}{' '}
                        <span className="text-[10px] text-gray-500">MB</span>
                      </div>
                    </div>
                    <div className="bg-white/[0.02] p-3 rounded-2xl border border-white/[0.02]">
                      <div className="text-lg font-bold text-white font-mono">
                        {server.stats?.tables || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                  <Database className="w-16 h-16 text-gray-700 mb-4 stroke-1" />
                  <h4 className="text-white font-bold mb-1">{t('database.offline_title')}</h4>
                  <p className="text-xs text-gray-500 max-w-[240px]">
                    {t('database.offline_message')}
                  </p>
                </div>
              )}
            </div>

            {server.db && editingId !== server.id && (
              <div className="px-8 py-4 bg-primary/[0.03] border-t border-gray-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                  <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">
                    {t('database.active')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={Boolean(server.auto_db_injection)}
                    onChange={(e) => handleToggleAutoInjection(server.id, e.target.checked)}
                    label={t('database.auto_injection_label')}
                    description={t('database.auto_injection_desc')}
                    className="mt-0"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {servers.length === 0 && (
        <div className="col-span-full py-20 bg-[#111827] rounded-3xl border border-dashed border-gray-800 flex flex-col items-center">
          <Layers className="w-12 h-12 text-gray-800 mb-4" />
          <h3 className="text-white font-bold">{t('database.no_instances_title')}</h3>
          <p className="text-gray-500 text-sm mt-1">{t('database.no_instances_message')}</p>
        </div>
      )}
    </div>
  );
};

export default DatabasePage;
