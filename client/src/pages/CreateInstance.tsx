import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import {
  Info,
  Map as MapIcon,
  Settings2,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Globe,
  Network,
  Package,
  Upload,
} from 'lucide-react';
import { SERVER_REGIONS } from '../config/regions';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import CustomSelect from '../components/ui/CustomSelect';
import toast from 'react-hot-toast';

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

const CreateInstance = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [availableEggs, setAvailableEggs] = useState<Egg[]>([]);
  const [useEgg, setUseEgg] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    serverName: '',
    maxPlayers: 10,
    port: '27015',
    initialMap: 'de_dust2',
    glstToken: '',
    steamApiKey: '',
    serverPassword: '',
    rconPassword: '',
    autoStart: true,
    sourceTV: false,
    vac: true,
    gameAlias: 'competitive',
    hibernate: true,
    validateFiles: false,
    autoUpdate: false,
    additionalArgs: '',
    region: 3,
    cpuPriority: 0,
    ramLimit: 0,
    ip: '',
    interfaces: [] as { name: string; ip: string }[],
    egg_id: '',
    egg_image: '',
    egg_variables: {} as Record<string, string>,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const fetchInterfaces = async () => {
      try {
        const response = await apiFetch('/api/system-info');
        if (response.ok) {
          const data = await response.json();
          if (data.interfaces && data.interfaces.length > 0) {
            setFormData((prev) => ({ ...prev, interfaces: data.interfaces }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch network interfaces:', err);
      }
    };
    fetchInterfaces();
  }, []);

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

  useEffect(() => {
    fetchEggs();
  }, []);

  const handleImportEgg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const eggData = JSON.parse(content);
      
      const response = await apiFetch('/api/servers/import-egg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eggData),
      });

      if (response.ok) {
        toast.success(t('pterodactyl.import_success'));
        await fetchEggs();
        e.target.value = '';
      } else {
        const data = await response.json();
        setError(data.message || t('pterodactyl.import_error'));
      }
    } catch (err) {
      setError(t('pterodactyl.invalid_egg_json'));
    }
  };

  const nextStep = () => {
    if (useEgg && step === 1) {
      setStep(3);
    } else {
      setStep((s) => Math.min(s + 1, 3));
    }
  };

  const prevStep = () => {
    if (useEgg && step === 3) {
      setStep(1);
    } else {
      setStep((s) => Math.max(s - 1, 1));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await apiFetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.serverName,
          map: formData.initialMap,
          max_players: parseInt(String(formData.maxPlayers)),
          port: parseInt(String(formData.port)),
          rcon_password: formData.rconPassword || null,
          password: formData.serverPassword || null,
          gslt_token: formData.glstToken || null,
          steam_api_key: formData.steamApiKey || null,
          vac_enabled: formData.vac ? 1 : 0,
          game_alias: formData.gameAlias,
          hibernate: formData.hibernate ? 1 : 0,
          validate_files: formData.validateFiles ? 1 : 0,
          auto_update: formData.autoUpdate ? 1 : 0,
          additional_args: formData.additionalArgs || null,
          auto_start: formData.autoStart,
          region: formData.region,
          cpu_priority: formData.cpuPriority,
          ram_limit: formData.ramLimit,
          ip: formData.ip,
          egg_id: useEgg ? formData.egg_id : null,
          egg_image: useEgg ? formData.egg_image : null,
          egg_variables: useEgg ? JSON.stringify(formData.egg_variables) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('createInstance.create_error'));
      }

      // Invalidate servers query to ensure the new server shows up in Instances list
      queryClient.invalidateQueries({ queryKey: ['servers'] });

      navigate('/instances');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 font-display">
      {/* Breadcrumbs & Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {t('createInstance.title')}
        </h2>
        <p className="text-sm text-gray-400 mt-1">{t('createInstance.subtitle')}</p>
      </div>

      <div className="bg-[#111827] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        {/* Stepper Header */}
        <div className="px-8 py-6 border-b border-gray-800 bg-[#111827]">
          <div className="flex justify-between items-center max-w-2xl">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-800 text-gray-500'}`}
              >
                1
              </div>
              <span
                className={`font-semibold hidden sm:block ${step >= 1 ? 'text-primary' : 'text-gray-500'}`}
              >
                {t('createInstance.step_details')}
              </span>
            </div>
            {!useEgg && (
              <>
                <div className={`h-px flex-1 mx-4 ${step > 1 ? 'bg-primary' : 'bg-gray-800'}`}></div>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-800 text-gray-500'}`}
                  >
                    2
                  </div>
                  <span
                    className={`font-semibold hidden sm:block ${step >= 2 ? 'text-primary' : 'text-gray-500'}`}
                  >
                    {t('createInstance.step_map')}
                  </span>
                </div>
                <div className={`h-px flex-1 mx-4 ${step > 2 ? 'bg-primary' : 'bg-gray-800'}`}></div>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-800 text-gray-500'}`}
                  >
                    3
                  </div>
                  <span
                    className={`font-semibold hidden sm:block ${step >= 3 ? 'text-primary' : 'text-gray-500'}`}
                  >
                    {t('createInstance.step_advanced')}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-8 min-h-[400px]">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}
          <form className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Step 1: Server Details */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-800 mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Info className="text-primary" size={20} />
                    {t('createInstance.basic_info_title')}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('createInstance.basic_info_subtitle')}
                  </p>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-6">
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={useEgg}
                        onChange={(e) => {
                          setUseEgg(e.target.checked);
                          if (!e.target.checked) setFormData((prev) => ({ ...prev, egg_id: '' }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-gray-800 rounded-full peer peer-checked:bg-primary transition-all duration-300"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-all duration-300"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                        Docker Egg Runner (Pterodactyl)
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Use this to run non-CS2 servers or custom setups in isolated containers
                      </span>
                    </div>
                  </label>
                </div>

                {useEgg && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-400">
                        {t('pterodactyl.select_egg')}
                      </label>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <CustomSelect
                            options={availableEggs.map((egg) => ({
                              value: egg.id,
                              label: egg.name,
                            }))}
                            value={formData.egg_id}
                            onChange={(val: string | number) => {
                              const eggId = String(val);
                              const egg = availableEggs.find((e) => e.id === eggId);
                              const initialVars: Record<string, string> = {};
                              egg?.variables.forEach((v) => {
                                initialVars[v.env_variable] = v.default_value;
                              });
                              
                              // Get first docker image if available
                              const firstImage = egg?.docker_images ? Object.values(egg.docker_images)[0] : '';

                              setFormData((prev) => ({
                                ...prev,
                                serverName: egg?.name || '',
                                egg_id: eggId,
                                egg_image: firstImage,
                                egg_variables: initialVars,
                              }));
                            }}
                            icon={<Package className="w-4 h-4" />}
                          />
                        </div>
                        <label className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-all border border-gray-700 active:scale-95">
                          <Upload size={14} className="text-primary" />
                          <span className="hidden sm:inline">{t('pterodactyl.import_egg')}</span>
                          <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleImportEgg}
                          />
                        </label>
                      </div>
                      {formData.egg_id && (
                        <p className="text-xs text-gray-500 italic mt-1">
                          {availableEggs.find((e) => e.id === formData.egg_id)?.description}
                        </p>
                      )}
                    </div>

                      {formData.egg_id &&
                      availableEggs.find((e) => e.id === formData.egg_id)?.variables.length ? (
                        <div className="space-y-6">
                          {/* Docker Image Selection */}
                          {Object.keys(availableEggs.find((e) => e.id === formData.egg_id)?.docker_images || {}).length > 1 && (
                            <div className="space-y-2 p-6 bg-black/20 rounded-xl border border-gray-800">
                              <label className="block text-xs font-bold text-primary uppercase tracking-widest">
                                {t('pterodactyl.docker_image') || 'Docker Image'}
                              </label>
                              <CustomSelect
                                options={Object.entries(availableEggs.find((e) => e.id === formData.egg_id)?.docker_images || {}).map(([name, image]) => ({
                                  value: image,
                                  label: name,
                                }))}
                                value={formData.egg_image}
                                onChange={(val: string | number) =>
                                  setFormData((prev) => ({ ...prev, egg_image: String(val) }))
                                }
                                icon={<Globe className="w-4 h-4" />}
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-black/20 rounded-xl border border-gray-800">
                            <div className="col-span-1 md:col-span-2 pb-2">
                              <h4 className="text-xs font-black text-primary uppercase tracking-widest">
                                {t('pterodactyl.egg_variables') || 'Egg Variables'}
                              </h4>
                            </div>
                            {availableEggs
                              .find((e) => e.id === formData.egg_id)
                              ?.variables
                              .filter(v => v.user_viewable || showAdvanced)
                              .map((v) => (
                                <div key={v.env_variable} className="space-y-2">
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>{v.name}</span>
                                    {v.rules.includes('required') && (
                                      <span className="text-red-500 text-[10px]">REQUIRED</span>
                                    )}
                                    {!v.user_viewable && (
                                      <span className="text-xs text-yellow-500/50" title="Hidden from normal view">
                                        <Settings2 size={10} />
                                      </span>
                                    )}
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.egg_variables[v.env_variable] || ''}
                                    onChange={(e) =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        egg_variables: {
                                          ...prev.egg_variables,
                                          [v.env_variable]: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full bg-[#0F172A]/80 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-700"
                                    placeholder={v.default_value}
                                  />
                                  <p className="text-[10px] text-gray-600 italic leading-tight">
                                    {v.description}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                      ) : null}
                  </div>
                )}

                {useEgg && formData.egg_id && (
                  <div className="pt-4 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-primary transition-colors uppercase tracking-widest"
                    >
                      <Settings2 size={14} />
                      {showAdvanced ? t('common.hide_advanced') || 'Hide Advanced' : t('common.show_advanced') || 'Show Advanced Instance Settings'}
                    </button>
                  </div>
                )}

                {(!useEgg || (useEgg && showAdvanced)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-2">
                      <label htmlFor="serverName" className="block text-sm font-bold text-gray-400">
                        {t('createInstance.server_name')}
                      </label>
                      <input
                        id="serverName"
                        type="text"
                        name="serverName"
                        value={formData.serverName}
                        onChange={handleInputChange}
                        className="w-full bg-[#0F172A]/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                        placeholder={t('createInstance.server_name_placeholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="maxPlayers" className="block text-sm font-bold text-gray-400">
                        {t('createInstance.max_players')}
                      </label>
                      <input
                        id="maxPlayers"
                        type="number"
                        name="maxPlayers"
                        value={formData.maxPlayers}
                        onChange={handleInputChange}
                        className="w-full bg-[#0F172A]/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="port" className="block text-sm font-bold text-gray-400">
                        {t('createInstance.server_port')}
                      </label>
                      <input
                        id="port"
                        type="text"
                        name="port"
                        value={formData.port}
                        onChange={handleInputChange}
                        className="w-full bg-[#0F172A]/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="region" className="block text-sm font-bold text-gray-400">
                        {t('createInstance.server_region')}
                      </label>
                      <CustomSelect
                        options={SERVER_REGIONS.map((r) => ({
                          value: r.id,
                          label: t(`regions.${r.code}`),
                        }))}
                        value={formData.region}
                        onChange={(val: string | number) =>
                          setFormData((prev) => ({ ...prev, region: Number(val) }))
                        }
                        icon={<Globe className="w-4 h-4" />}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="ip" className="block text-sm font-bold text-gray-400">
                        {t('createInstance.bind_ip')}
                      </label>
                      {formData.interfaces && formData.interfaces.length > 0 ? (
                        <div className="relative group/ip">
                          <input
                            id="ip"
                            type="text"
                            name="ip"
                            value={formData.ip}
                            onChange={handleInputChange}
                            onFocus={(e) => e.target.select()}
                            className="w-full bg-[#0F172A]/50 border border-gray-800 rounded-xl px-4 py-3 pr-44 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600 font-mono"
                            placeholder={t('createInstance.bind_ip_placeholder')}
                          />
                          <div className="absolute right-1.5 top-1.5 bottom-1.5 w-40">
                            <CustomSelect
                              options={formData.interfaces.map((iface) => ({
                                value: iface.ip,
                                label: `${iface.name}: ${iface.ip}`,
                              }))}
                              value={formData.ip}
                              onChange={(val: string | number) =>
                                setFormData((prev) => ({ ...prev, ip: String(val) }))
                              }
                              placeholder={t('common.select') || 'Select'}
                              icon={<Network className="w-4 h-4" />}
                              size="sm"
                            />
                          </div>
                        </div>
                      ) : (
                        <input
                          id="ip"
                          type="text"
                          name="ip"
                          value={formData.ip}
                          onChange={handleInputChange}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-[#0F172A]/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600 font-mono"
                          placeholder={t('createInstance.bind_ip_placeholder')}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Map Selection */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-800 mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <MapIcon className="text-primary" size={20} />
                    {t('createInstance.map_config_title')}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('createInstance.map_config_subtitle')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="initialMap" className="block text-sm font-bold text-gray-400">
                    {t('createInstance.initial_map')}
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'de_dust2', label: 'de_dust2' },
                      { value: 'de_mirage', label: 'de_mirage' },
                      { value: 'de_inferno', label: 'de_inferno' },
                      { value: 'de_nuke', label: 'de_nuke' },
                      { value: 'de_ancient', label: 'de_ancient' },
                      { value: 'de_anubis', label: 'de_anubis' },
                      { value: 'de_vertigo', label: 'de_vertigo' },
                      { value: 'de_overpass', label: 'de_overpass' },
                    ]}
                    value={formData.initialMap}
                    onChange={(val: string | number) =>
                      setFormData((prev) => ({ ...prev, initialMap: String(val) }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Step 3: Advanced Settings */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-800 mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings2 className="text-primary" size={20} />
                    {t('createInstance.advanced_config_title')}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('createInstance.advanced_config_subtitle')}
                  </p>
                </div>

                {!useEgg && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label htmlFor="glstToken" className="block text-sm font-bold text-gray-400">
                        {t('createInstance.gslt_token')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="glstToken"
                        type="text"
                        name="glstToken"
                        value={formData.glstToken}
                        onChange={handleInputChange}
                        className="w-full bg-[#0F172A]/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                        placeholder={t('createInstance.gslt_placeholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="steamApiKey" className="block text-sm font-bold text-gray-400">
                        {t('createInstance.steam_api_key')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="steamApiKey"
                        type="text"
                        name="steamApiKey"
                        value={formData.steamApiKey}
                        onChange={handleInputChange}
                        className="w-full bg-[#0F172A]/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                        placeholder={t('createInstance.steam_api_placeholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="serverPassword"
                        className="block text-sm font-bold text-gray-400"
                      >
                        {t('createInstance.server_password')}
                      </label>
                      <input
                        id="serverPassword"
                        type="password"
                        name="serverPassword"
                        value={formData.serverPassword}
                        onChange={handleInputChange}
                        className="w-full bg-[#0F172A]/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                        placeholder={t('createInstance.server_password_placeholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="rconPassword" className="block text-sm font-bold text-gray-400">
                        {t('createInstance.rcon_password')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="rconPassword"
                        type="password"
                        name="rconPassword"
                        value={formData.rconPassword}
                        onChange={handleInputChange}
                        className="w-full bg-[#0F172A]/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                        placeholder={t('createInstance.rcon_placeholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="gameAlias" className="block text-sm font-bold text-gray-400">
                        {t('createInstance.game_alias')}
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
                        value={formData.gameAlias}
                        onChange={(val: string | number) =>
                          setFormData((prev) => ({ ...prev, gameAlias: String(val) }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="additionalArgs"
                        className="block text-sm font-bold text-gray-400"
                      >
                        {t('createInstance.additional_args')}
                      </label>
                      <input
                        id="additionalArgs"
                        type="text"
                        name="additionalArgs"
                        value={formData.additionalArgs}
                        onChange={handleInputChange}
                        className="w-full bg-[#0F172A]/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                        placeholder={t('createInstance.additional_args_placeholder')}
                      />
                    </div>
                  </div>
                )}
                {useEgg && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label htmlFor="rconPassword" className="block text-sm font-bold text-gray-400">
                          {t('createInstance.rcon_password')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="rconPassword"
                          type="password"
                          name="rconPassword"
                          value={formData.rconPassword}
                          onChange={handleInputChange}
                          className="w-full bg-[#0F172A]/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600"
                          placeholder={t('createInstance.rcon_placeholder')}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="ramLimit" className="block text-sm font-bold text-gray-400">
                          {t('createInstance.ram_limit')} (MB) <span className="text-xs text-gray-600 font-normal ml-1">0 = {t('createInstance.unlimited')}</span>
                        </label>
                        <input
                          id="ramLimit"
                          type="number"
                          name="ramLimit"
                          value={formData.ramLimit}
                          onChange={handleInputChange}
                          className="w-full bg-[#0F172A]/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 bg-[#0F172A]/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
                      <button
                        aria-label="Toggle Auto-start server after creation"
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, autoStart: !prev.autoStart }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.autoStart ? 'bg-primary' : 'bg-gray-700'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.autoStart ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-300 font-semibold">{t('createInstance.auto_start')}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Konteyner oluşturulduktan sonra başlar</span>
                      </div>
                    </div>
                  </div>
                )}

                {!useEgg && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div className="flex items-center gap-3 p-4 bg-[#0F172A]/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
                      <button
                        aria-label="Toggle Server Hibernation"
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, hibernate: !prev.hibernate }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.hibernate ? 'bg-primary' : 'bg-gray-700'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.hibernate ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-300 font-semibold">
                          {t('createInstance.enable_hibernation')}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                          {t('createInstance.hibernation_desc')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-[#0F172A]/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
                      <button
                        aria-label="Toggle Force File Validation"
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, validateFiles: !prev.validateFiles }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.validateFiles ? 'bg-primary' : 'bg-gray-700'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.validateFiles ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-300 font-semibold">
                          {t('createInstance.validate_files')}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                          {t('createInstance.validate_desc')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-[#0F172A]/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
                      <button
                        aria-label="Toggle Auto-start server after creation"
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, autoStart: !prev.autoStart }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.autoStart ? 'bg-primary' : 'bg-gray-700'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.autoStart ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <span className="text-sm text-gray-300">{t('createInstance.auto_start')}</span>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-[#0F172A]/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
                      <button
                        aria-label="Toggle Enable SourceTV"
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, sourceTV: !prev.sourceTV }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.sourceTV ? 'bg-primary' : 'bg-gray-700'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.sourceTV ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <span className="text-sm text-gray-300">
                        {t('createInstance.enable_sourcetv')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-[#0F172A]/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
                      <button
                        aria-label="Toggle Enable VAC"
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, vac: !prev.vac }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.vac ? 'bg-primary' : 'bg-gray-700'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.vac ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <span className="text-sm text-gray-300">{t('createInstance.enable_vac')}</span>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-[#0F172A]/50 border border-amber-900/30 rounded-xl hover:border-amber-700/50 transition-all group">
                      <button
                        aria-label="Toggle Auto-Update"
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, autoUpdate: !prev.autoUpdate }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.autoUpdate ? 'bg-amber-600' : 'bg-gray-700'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.autoUpdate ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-300 font-semibold group-hover:text-amber-200 transition-colors">
                          {t('createInstance.auto_update')}
                        </span>
                        <span className="text-[10px] text-amber-500/70 uppercase font-bold tracking-tight">
                          {t('createInstance.auto_update_desc')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {useEgg && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div className="flex items-center gap-3 p-4 bg-[#0F172A]/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all">
                      <button
                        aria-label="Toggle Auto-start server after creation"
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, autoStart: !prev.autoStart }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.autoStart ? 'bg-primary' : 'bg-gray-700'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.autoStart ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <span className="text-sm text-gray-300">{t('createInstance.auto_start')}</span>
                    </div>
                  </div>
                )}

                {/* Performance Orchestration */}
                <div className="pt-6 border-t border-gray-800">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                    <Settings2 className="text-primary" size={20} />
                    {t('createInstance.performance_orchestration')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-400">
                        {t('createInstance.cpu_priority')}
                      </label>
                      <CustomSelect
                        options={[
                          { value: -10, label: t('serverSettings.cpu_high') },
                          { value: 0, label: t('serverSettings.cpu_normal') },
                          { value: 10, label: t('serverSettings.cpu_low') },
                          { value: 19, label: t('serverSettings.cpu_idle') },
                        ]}
                        value={formData.cpuPriority}
                        onChange={(val: string | number) =>
                          setFormData((prev) => ({ ...prev, cpuPriority: Number(val) }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-400">
                        {t('createInstance.ram_limit')}
                      </label>
                      <CustomSelect
                        options={[
                          { value: 0, label: t('serverSettings.ram_unlimited') },
                          { value: 4096, label: '4 GB' },
                          { value: 8192, label: '8 GB' },
                          { value: 16384, label: '16 GB' },
                        ]}
                        value={formData.ramLimit}
                        onChange={(val: string | number) =>
                          setFormData((prev) => ({ ...prev, ramLimit: Number(val) }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Navigation Footer */}
        <div className="px-8 py-6 border-t border-gray-800 bg-[#0F172A]/30 flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-800"
          >
            <ChevronLeft size={18} />
            {t('createInstance.previous')}
          </button>

          <div className="flex gap-4">
            {(useEgg && step === 1) || step === 3 ? (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.serverName}
                className="px-12 py-3 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Rocket size={18} />
                {loading ? t('createInstance.creating') : t('createInstance.launch_instance')}
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="px-10 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 active:scale-95"
              >
                {t('createInstance.next_step')}
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInstance;
