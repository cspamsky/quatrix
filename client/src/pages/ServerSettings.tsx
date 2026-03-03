import { apiFetch } from '../utils/api';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Server,
  MapPin,
  Users,
  Lock,
  Key,
  Shield,
  Globe,
  Network,
  Package,
  Settings2,
} from 'lucide-react';
import { SERVER_REGIONS } from '../config/regions';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import CustomSelect from '../components/ui/CustomSelect';

interface ServerData {
  id: number;
  name: string;
  map: string;
  max_players: number;
  port: number;
  password?: string;
  rcon_password?: string;
  vac_enabled: boolean;
  gslt_token?: string;
  steam_api_key?: string;
  game_type: number;
  game_mode: number;
  game_alias?: string;
  hibernate: number;
  validate_files: number;
  auto_update: number;
  additional_args?: string;
  tickrate: number;
  region: number;
  cpu_priority: number;
  ram_limit: number;
  restart_policy?: string;
  ip?: string;
  interfaces?: { name: string; ip: string }[];
  egg_id?: string | null;
  egg_image?: string | null;
  egg_variables?: string | null;
}

interface EggVariable {
  name: string;
  description: string;
  env_variable: string;
  default_value: string;
  user_viewable: boolean;
  user_editable: boolean;
  rules: string;
}

interface Egg {
  id: string;
  name: string;
  description: string;
  variables: EggVariable[];
  docker_images: Record<string, string>;
}

const ServerSettings = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [server, setServer] = useState<ServerData | null>(null);
  const [availableEggs, setAvailableEggs] = useState<Egg[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [user] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : { permissions: [] };
    } catch {
      return { permissions: [] };
    }
  });

  const canEdit = user?.permissions?.includes('*') || user?.permissions?.includes('servers.update');

  useEffect(() => {
    fetchServerData();
    fetchEggs();
  }, [id]);

  const fetchEggs = async () => {
    try {
      const response = await apiFetch('/api/servers/available-eggs');
      if (response.ok) {
        const data = await response.json();
        setAvailableEggs(data);
      }
    } catch (err) {
      console.error('Failed to fetch eggs:', err);
    }
  };

  const fetchServerData = async () => {
    try {
      const [srvResponse, , infoResponse] = await Promise.allSettled([
        apiFetch(`/api/servers/${id}`),
        apiFetch(`/api/servers/${id}/database`),
        apiFetch('/api/system-info'),
      ]);

      if (
        srvResponse.status === 'fulfilled' &&
        (srvResponse as PromiseFulfilledResult<Response>).value.ok
      ) {
        const data = await (srvResponse as PromiseFulfilledResult<Response>).value.json();
        let interfaces = [];
        if (
          infoResponse.status === 'fulfilled' &&
          (infoResponse as PromiseFulfilledResult<Response>).value.ok
        ) {
          const info = await (infoResponse as PromiseFulfilledResult<Response>).value.json();
          interfaces = info.interfaces || [];
        }
        setServer({ ...data, interfaces });
      }
    } catch (error) {
      console.error('Failed to fetch server:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!server) return;

    setSaving(true);
    try {
      const response = await apiFetch(`/api/servers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server),
      });

      if (response.ok) {
        toast.success(t('serverSettings.save_success'));
      } else {
        toast.error(t('serverSettings.save_error'));
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Connection error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 text-gray-600">
          <Server className="w-10 h-10 opacity-20" />
          <span className="text-xs font-bold tracking-widest uppercase">
            {t('serverSettings.loading')}
          </span>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        {t('serverSettings.not_found')}
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/instances')}
              className="p-1 -ml-1 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {t('serverSettings.title')}
            </h2>
          </div>
          <div className="pl-9">
            <p className="text-sm text-gray-400 mt-1">{t('serverSettings.subtitle')}</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-8 flex-1">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Server Information */}
          <div className="bg-[#111827] rounded-2xl border border-gray-800 p-8">
            <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-3">
              <Server className="w-5 h-5 text-primary" />
              {t('serverSettings.instance_info')}
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400">
                  {t('serverSettings.server_name')}
                </label>
                <input
                  type="text"
                  value={server.name}
                  onChange={(e) => setServer({ ...server, name: e.target.value })}
                  className="w-full px-5 py-3 bg-black/20 border border-gray-800 rounded-xl text-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-700 disabled:opacity-50"
                  placeholder="Quatrix Dedicated Server"
                  disabled={!canEdit}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">
                    {t('serverSettings.primary_map')}
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'de_dust2', label: 'de_dust2' },
                      { value: 'de_mirage', label: 'de_mirage' },
                      { value: 'de_inferno', label: 'de_inferno' },
                      { value: 'de_nuke', label: 'de_nuke' },
                      { value: 'de_overpass', label: 'de_overpass' },
                      { value: 'de_vertigo', label: 'de_vertigo' },
                      { value: 'de_ancient', label: 'de_ancient' },
                      { value: 'de_anubis', label: 'de_anubis' },
                    ]}
                    value={server.map}
                    onChange={(val) => setServer({ ...server, map: val as string })}
                    disabled={!canEdit}
                    icon={<MapPin className="w-4 h-4" />}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">
                    {t('serverSettings.max_players')}
                  </label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                    <input
                      type="number"
                      min="2"
                      max="64"
                      value={server.max_players}
                      onChange={(e) =>
                        setServer({ ...server, max_players: parseInt(e.target.value) })
                      }
                      className="w-full pl-12 pr-5 py-3 bg-black/20 border border-gray-800 rounded-xl text-white focus:border-primary outline-none transition-all disabled:opacity-50"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">
                    {t('serverSettings.server_port')}
                  </label>
                  <input
                    type="number"
                    min="1024"
                    max="65535"
                    value={server.port}
                    onChange={(e) => setServer({ ...server, port: parseInt(e.target.value) })}
                    className="w-full px-5 py-3 bg-black/20 border border-gray-800 rounded-xl text-white font-mono focus:border-primary outline-none transition-all disabled:opacity-50"
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">
                    {t('serverSettings.game_alias')}
                  </label>
                  <CustomSelect
                    options={[
                      { value: '', label: t('createInstance.game_alias_default') },
                      { value: 'competitive', label: t('createInstance.game_alias_competitive') },
                      { value: 'casual', label: t('createInstance.game_alias_casual') },
                      { value: 'deathmatch', label: t('createInstance.game_alias_deathmatch') },
                      { value: 'wingman', label: t('createInstance.game_alias_wingman') },
                      { value: 'armsrace', label: t('createInstance.game_alias_armsrace') },
                      { value: 'demolition', label: t('createInstance.game_alias_demolition') },
                      { value: 'training', label: t('createInstance.game_alias_training') },
                      { value: 'custom', label: t('createInstance.game_alias_custom') },
                    ]}
                    value={server.game_alias || ''}
                    onChange={(val) => setServer({ ...server, game_alias: val as string })}
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">
                    {t('serverSettings.tickrate')}
                  </label>
                  <input
                    type="number"
                    min="64"
                    max="128"
                    value={server.tickrate || 128}
                    onChange={(e) => setServer({ ...server, tickrate: parseInt(e.target.value) })}
                    className="w-full px-5 py-3 bg-black/20 border border-gray-800 rounded-xl text-white focus:border-primary outline-none transition-all disabled:opacity-50"
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">
                    {t('serverSettings.server_region')}
                  </label>
                  <CustomSelect
                    options={SERVER_REGIONS.map((r) => ({
                      value: r.id,
                      label: t(`regions.${r.code}`),
                    }))}
                    value={server.region || 3}
                    onChange={(val) => setServer({ ...server, region: Number(val) })}
                    disabled={!canEdit}
                    icon={<Globe className="w-4 h-4" />}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">
                    {t('serverSettings.additional_args')}
                  </label>
                  <input
                    type="text"
                    value={server.additional_args || ''}
                    onChange={(e) => setServer({ ...server, additional_args: e.target.value })}
                    className="w-full px-5 py-3 bg-black/20 border border-gray-800 rounded-xl text-white focus:border-primary outline-none transition-all disabled:opacity-50"
                    placeholder="-tickrate 128 +sv_infinite_ammo 1..."
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">
                    {t('createInstance.bind_ip')}
                  </label>
                  <div className="space-y-2">
                    {server.interfaces && server.interfaces.length > 0 ? (
                      <div className="relative group/ip">
                        <input
                          type="text"
                          value={server.ip || ''}
                          onChange={(e) => setServer({ ...server, ip: e.target.value })}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-5 py-3 pr-44 bg-black/20 border border-gray-800 rounded-xl text-white font-mono focus:border-primary outline-none transition-all disabled:opacity-50"
                          placeholder={t('createInstance.bind_ip_placeholder')}
                          disabled={!canEdit}
                        />
                        <div className="absolute right-1.5 top-1.5 bottom-1.5 w-40">
                          <CustomSelect
                            options={server.interfaces.map((iface) => ({
                              value: iface.ip,
                              label: `${iface.name}: ${iface.ip}`,
                            }))}
                            value={server.ip || ''}
                            onChange={(val) => setServer({ ...server, ip: String(val) })}
                            placeholder={t('common.select') || 'Select'}
                            icon={<Network className="w-4 h-4" />}
                            disabled={!canEdit}
                            size="sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={server.ip || ''}
                        onChange={(e) => setServer({ ...server, ip: e.target.value })}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-5 py-3 bg-black/20 border border-gray-800 rounded-xl text-white font-mono focus:border-primary outline-none transition-all disabled:opacity-50"
                        placeholder={t('createInstance.bind_ip_placeholder')}
                        disabled={!canEdit}
                      />
                    )}
                  </div>
                </div>

                {/* Performance Orchestration */}
                <div className="space-y-4 pt-4 border-t border-gray-800/50">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                    {t('serverSettings.performance_orchestration')} & Otomasyon
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {t('serverSettings.cpu_priority')}
                      </label>
                      <CustomSelect
                        options={[
                          { value: -10, label: t('serverSettings.cpu_high') },
                          { value: 0, label: t('serverSettings.cpu_normal') },
                          { value: 10, label: t('serverSettings.cpu_low') },
                          { value: 19, label: t('serverSettings.cpu_idle') },
                        ]}
                        value={server.cpu_priority || 0}
                        onChange={(val) => setServer({ ...server, cpu_priority: Number(val) })}
                        disabled={!canEdit}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {t('serverSettings.ram_limit')}
                      </label>
                      <CustomSelect
                        options={[
                          { value: 0, label: t('serverSettings.ram_unlimited') },
                          { value: 4096, label: '4 GB' },
                          { value: 8192, label: '8 GB' },
                          { value: 16384, label: '16 GB' },
                        ]}
                        value={server.ram_limit || 0}
                        onChange={(val) => setServer({ ...server, ram_limit: Number(val) })}
                        disabled={!canEdit}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {t('serverSettings.restart_policy')}
                      </label>
                      <CustomSelect
                        options={[
                          { value: 'on_failure', label: t('serverSettings.restart_on_failure') },
                          { value: 'always', label: t('serverSettings.restart_always') },
                          { value: 'never', label: t('serverSettings.restart_never') },
                        ]}
                        value={server.restart_policy || 'on_failure'}
                        onChange={(val) => setServer({ ...server, restart_policy: val as string })}
                        disabled={!canEdit}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-[#111827] rounded-2xl border border-gray-800 p-8">
            <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              {t('serverSettings.security_settings')}
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">
                    {t('serverSettings.server_password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                    <input
                      type="password"
                      value={server.password || ''}
                      onChange={(e) => setServer({ ...server, password: e.target.value })}
                      className="w-full pl-12 pr-5 py-3 bg-black/20 border border-gray-800 rounded-xl text-white focus:border-primary outline-none transition-all disabled:opacity-50"
                      placeholder={t('serverSettings.optional')}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-400">
                    {t('serverSettings.rcon_password')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                    <input
                      type="password"
                      value={server.rcon_password || ''}
                      onChange={(e) => setServer({ ...server, rcon_password: e.target.value })}
                      className="w-full pl-12 pr-5 py-3 bg-black/20 border border-gray-800 rounded-xl text-white focus:border-primary outline-none transition-all disabled:opacity-50"
                      placeholder={t('serverSettings.required')}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400">
                  {t('serverSettings.gslt_token')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={server.gslt_token || ''}
                  onChange={(e) => setServer({ ...server, gslt_token: e.target.value })}
                  className="w-full px-5 py-3 bg-black/20 border border-gray-800 rounded-xl text-white font-mono text-sm focus:border-primary outline-none transition-all disabled:opacity-50"
                  placeholder={t('serverSettings.gslt_placeholder')}
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400">
                  {t('serverSettings.steam_api_key')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={server.steam_api_key || ''}
                  onChange={(e) => setServer({ ...server, steam_api_key: e.target.value })}
                  className="w-full px-5 py-3 bg-black/20 border border-gray-800 rounded-xl text-white font-mono text-sm focus:border-primary outline-none transition-all disabled:opacity-50"
                  placeholder={t('serverSettings.steam_api_placeholder')}
                  disabled={!canEdit}
                />
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={Boolean(server.vac_enabled)}
                      onChange={(e) => setServer({ ...server, vac_enabled: e.target.checked })}
                      className="sr-only peer"
                      disabled={!canEdit}
                    />
                    <div className="w-12 h-6 bg-gray-800 rounded-full peer peer-checked:bg-primary transition-all duration-300"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-all duration-300"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
                      {t('serverSettings.vac_enabled')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      {t('serverSettings.vac_desc')}
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-8 pt-4 border-t border-gray-800/50">
                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={Boolean(server.hibernate)}
                      onChange={(e) =>
                        setServer({ ...server, hibernate: e.target.checked ? 1 : 0 })
                      }
                      className="sr-only peer"
                      disabled={!canEdit}
                    />
                    <div className="w-12 h-6 bg-gray-800 rounded-full peer peer-checked:bg-primary transition-all duration-300"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-all duration-300"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
                      {t('serverSettings.hibernation')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      {t('serverSettings.hibernation_desc')}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={Boolean(server.validate_files)}
                      onChange={(e) =>
                        setServer({ ...server, validate_files: e.target.checked ? 1 : 0 })
                      }
                      className="sr-only peer"
                      disabled={!canEdit}
                    />
                    <div className="w-12 h-6 bg-gray-800 rounded-full peer peer-checked:bg-primary transition-all duration-300"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-all duration-300"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
                      {t('serverSettings.validate_files')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      {t('serverSettings.validate_desc')}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={Boolean(server.auto_update)}
                      onChange={(e) =>
                        setServer({ ...server, auto_update: e.target.checked ? 1 : 0 })
                      }
                      className="sr-only peer"
                      disabled={!canEdit}
                    />
                    <div className="w-12 h-6 bg-gray-800 rounded-full peer peer-checked:bg-amber-600 transition-all duration-300"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-all duration-300"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-300 group-hover:text-amber-200 transition-colors">
                      {t('serverSettings.auto_update')}
                    </span>
                    <span className="text-[10px] text-amber-500/70 font-bold uppercase tracking-wider">
                      {t('serverSettings.auto_update_warning')}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Egg Runner Settings (Generic Pterodactyl Egg) */}
          {server.egg_id && (
            <div className="bg-[#111827] rounded-2xl border border-gray-800 p-8 xl:col-span-2">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-3">
                <Package className="w-5 h-5 text-primary" />
                {t('pterodactyl.variables')}
              </h3>
              <p className="text-sm text-gray-500 mb-8">
                {availableEggs.find((e) => e.id === server.egg_id)?.name} -{' '}
                {t('pterodactyl.variables')}
              </p>

              <div className="space-y-6">
                {/* Docker Image Selection */}
                {Object.keys(availableEggs.find((e) => e.id === server.egg_id)?.docker_images || {}).length > 1 && (
                  <div className="p-6 bg-black/20 rounded-xl border border-gray-800 space-y-3">
                    <label className="block text-xs font-black text-primary uppercase tracking-widest">
                      {t('pterodactyl.docker_image') || 'Docker Image'}
                    </label>
                    <CustomSelect
                      options={Object.entries(availableEggs.find((e) => e.id === server.egg_id)?.docker_images || {}).map(([name, image]) => ({
                        value: image,
                        label: name,
                      }))}
                      value={server.egg_image || ''}
                      onChange={(val: string | number) =>
                        setServer({ ...server, egg_image: String(val) })
                      }
                      icon={<Globe className="w-4 h-4" />}
                      disabled={!canEdit}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-black/20 rounded-xl border border-gray-800">
                  <div className="col-span-full flex items-center justify-between pb-2 border-b border-gray-800/50 mb-2">
                    <h4 className="text-xs font-black text-primary uppercase tracking-widest">
                      {t('pterodactyl.egg_variables') || 'Egg Variables'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-tighter flex items-center gap-1.5"
                    >
                      <Settings2 size={12} />
                      {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                    </button>
                  </div>
                  {availableEggs
                    .find((e) => e.id === server.egg_id)
                    ?.variables
                    .filter(v => v.user_viewable || showAdvanced)
                    .map((v) => {
                      const vars = server.egg_variables ? JSON.parse(server.egg_variables) : {};
                      return (
                        <div key={v.env_variable} className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                            <span>{v.name}</span>
                            {!v.user_viewable && (
                              <span className="text-yellow-500/50" title="Hidden from normal view">
                                <Settings2 size={10} />
                              </span>
                            )}
                          </label>
                          <input
                            type="text"
                            value={vars[v.env_variable] || ''}
                            onChange={(e) => {
                              const newVars = { ...vars, [v.env_variable]: e.target.value };
                              setServer({ ...server, egg_variables: JSON.stringify(newVars) });
                            }}
                            className="w-full px-4 py-2 bg-[#0F172A]/80 border border-gray-800 rounded-lg text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-700 disabled:opacity-50"
                            placeholder={v.default_value}
                            disabled={!canEdit}
                          />
                          <p className="text-[10px] text-gray-600 italic leading-tight">
                            {v.description}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Action Footer */}
        {canEdit && (
          <div className="flex items-center justify-end gap-4 p-6 bg-[#111827] rounded-2xl border border-gray-800">
            <button
              type="button"
              onClick={() => navigate('/instances')}
              className="px-6 py-2 text-gray-400 hover:text-white transition-colors font-semibold"
            >
              {t('serverSettings.discard')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? t('serverSettings.saving') : t('serverSettings.save_changes')}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ServerSettings;
