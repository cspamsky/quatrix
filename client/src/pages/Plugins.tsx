import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Cpu, 
  Zap, 
  Server as ServerIcon,
  Download,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Trash2
} from 'lucide-react'
import { apiFetch } from '../utils/api'
import { useNotification } from '../contexts/NotificationContext'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext'

interface Instance {
    id: number;
    name: string;
    status: string;
}

const Plugins = () => {
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const { showConfirm } = useConfirmDialog()
  const [instances, setInstances] = useState<Instance[]>([])
  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [pluginStatus, setPluginStatus] = useState<{ metamod: boolean, cssharp: boolean, matchzy: boolean, simpleadmin: boolean }>({ metamod: false, cssharp: false, matchzy: false, simpleadmin: false })
  const [pluginUpdates, setPluginUpdates] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchInstances = useCallback(async () => {
    try {
        setLoading(true);
        const response = await apiFetch('/api/servers');
        const data = await response.json();
        if (Array.isArray(data)) {
            setInstances(data);
            if (data.length > 0 && !selectedServer) {
                setSelectedServer(data[0].id.toString());
            }
        } else {
            console.error('Expected array from /api/servers, got:', typeof data, data);
            setInstances([]);
        }
    } catch (error) {
        console.error('Failed to fetch instances:', error);
    } finally {
        setLoading(false);
    }
  }, [selectedServer]);

  const fetchPluginStatus = useCallback(async (id: string) => {
    try {
        const response = await apiFetch(`/api/servers/${id}/plugins/status`);
        if (response.ok) {
            const data = await response.json();
            setPluginStatus(data);
        }
    } catch (error) {
        console.error('Failed to fetch plugin status:', error);
    }
  }, []);

  const fetchPluginUpdates = useCallback(async (id: string) => {
    try {
        const response = await apiFetch(`/api/servers/${id}/plugins/updates`);
        if (response.ok) {
            const data = await response.json();
            setPluginUpdates(data);
        }
    } catch (error) {
        console.error('Failed to fetch plugin updates:', error);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  useEffect(() => {
    if (selectedServer) {
        fetchPluginStatus(selectedServer);
        fetchPluginUpdates(selectedServer);
    }
  }, [selectedServer, fetchPluginStatus, fetchPluginUpdates]);

  // Auto-update plugins if enabled
  useEffect(() => {
    const autoUpdateEnabled = localStorage.getItem('autoPluginUpdates') === 'true';
    if (!autoUpdateEnabled || !pluginUpdates || !selectedServer) return;

    // Check if any plugin has updates and auto-update them
    const updatePlugins = async () => {
      if (pluginUpdates.matchzy?.hasUpdate && pluginStatus.matchzy) {
        console.log('Auto-updating MatchZy...');
        await handleUpdate('matchzy');
      }
      if (pluginUpdates.simpleadmin?.hasUpdate && pluginStatus.simpleadmin) {
        console.log('Auto-updating SimpleAdmin...');
        await handleUpdate('simpleadmin');
      }
    };

    updatePlugins();
  }, [pluginUpdates]); // Only run when updates are fetched

  const handleUpdate = async (plugin: 'matchzy' | 'simpleadmin') => {
    if (!selectedServer) return;

    const pluginName = plugin === 'matchzy' ? 'MatchZy' : 'CS2-SimpleAdmin';
    
    const confirmed = await showConfirm({
      title: `Update ${pluginName}?`,
      message: `This will uninstall the current version and install the latest version from GitHub. The server will need to be restarted.`,
      confirmText: 'Update Now',
      type: 'warning'
    });

    if (!confirmed) return;

    setActionLoading(plugin);
    try {
      const response = await apiFetch(`/api/servers/${selectedServer}/plugins/update-${plugin}`, {
        method: 'POST'
      });

      if (response.ok) {
        showNotification('success', `${pluginName} updated successfully!`);
        await fetchPluginStatus(selectedServer);
        await fetchPluginUpdates(selectedServer);
      } else {
        const data = await response.json();
        showNotification('error', data.message || 'Update failed');
      }
    } catch (error) {
      showNotification('error', 'Failed to update plugin');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (plugin: 'metamod' | 'cssharp' | 'matchzy' | 'simpleadmin', action: 'install' | 'uninstall') => {
    if (!selectedServer) return;

    let pluginName = '';
    switch(plugin) {
        case 'metamod': pluginName = 'Metamod:Source'; break;
        case 'cssharp': pluginName = 'CounterStrikeSharp'; break;
        case 'matchzy': pluginName = 'MatchZy'; break;
        case 'simpleadmin': pluginName = 'CS2-SimpleAdmin'; break;
    }

    // Check requirements for install
    if (action === 'install') {
        if (plugin === 'cssharp' && !pluginStatus.metamod) {
            showNotification('warning', 'Requirement Missing', 'Metamod required before installing CounterStrikeSharp');
            return;
        }
        if ((plugin === 'matchzy' || plugin === 'simpleadmin') && !pluginStatus.cssharp) {
            showNotification('warning', 'Requirement Missing', 'CounterStrikeSharp required before installing this plugin');
            return;
        }
    }

    const isConfirmed = await showConfirm({
        title: `${action === 'install' ? 'Install' : 'Uninstall'} ${pluginName}`,
        message: `Are you sure you want to ${action} ${pluginName}? ${action === 'uninstall' ? 'This might affect other dependent plugins.' : 'The server should be OFFLINE for a safe installation.'}`,
        confirmText: `${action === 'install' ? 'Install' : 'Uninstall'} Now`,
        type: action === 'uninstall' ? 'danger' : 'warning'
    });

    if (!isConfirmed) return;

    setActionLoading(plugin);
    try {
        const endpoint = `/api/servers/${selectedServer}/plugins/${action}-${plugin}`;
        const response = await apiFetch(endpoint, {
            method: 'POST'
        });
        
        if (response.ok) {
            showNotification('success', 'Operation Successful', `${pluginName} ${action}ed successfully!`);
            fetchPluginStatus(selectedServer);
        } else {
            const err = await response.json();
            showNotification('error', 'Operation Failed', err.message);
        }
    } catch (error) {
        console.error(`Failed to ${action} plugin:`, error);
        showNotification('error', 'Error', `An error occurred during ${action}.`);
    } finally {
        setActionLoading(null);
    }
  };

  if (loading && instances.length === 0) {
    return (
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-gray-400 font-bold animate-pulse">Synchronizing with server...</p>
        </div>
    );
  }

  if (instances.length === 0 && !loading) {
    return (
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 border border-gray-700">
                <ServerIcon size={40} className="text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Servers Found</h2>
            <p className="text-gray-400 max-w-md mb-8">You need to create at least one server instance before you can manage addons and plugins.</p>
            <button 
                onClick={() => navigate('/instances')}
                className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
            >
                Create First Instance
            </button>
        </div>
    );
  }

  return (
    <div className="p-6 font-display overflow-y-auto max-h-[calc(100vh-64px)]">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Addons & Plugins</h2>
          <p className="text-sm text-gray-400 mt-1">Enhance your CS2 server with professional management tools</p>
        </div>
        
        <div className="flex items-center space-x-4 bg-[#111827] border border-gray-800 p-1.5 rounded-xl shadow-inner">
            <div className="flex items-center px-3 text-gray-500 border-r border-gray-800">
                <ServerIcon size={16} className="mr-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">Target Server</span>
            </div>
            <select 
                className="bg-transparent text-white text-sm font-bold outline-none px-3 py-1 cursor-pointer pr-8"
                value={selectedServer || ''}
                onChange={(e) => setSelectedServer(e.target.value)}
            >
                {Array.isArray(instances) && instances.map((inst: Instance) => (
                    <option key={inst.id} value={inst.id} className="bg-[#111827]">{inst.name}</option>
                ))}
            </select>
        </div>
      </header>

      {/* Core Frameworks Section */}
      <section className="mb-12">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6 uppercase tracking-wider text-[13px]">
            <Zap className="text-primary w-5 h-5" />
            Core Frameworks
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Metamod Card */}
            <div className={`bg-[#111827] border ${pluginStatus.metamod ? 'border-primary/30 bg-primary/5' : 'border-gray-800'} rounded-2xl p-6 transition-all relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 transform group-hover:scale-110 transition-transform">
                    <Cpu size={120} />
                </div>
                
                <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center space-x-4">
                        <div className={`w-14 h-14 rounded-2xl ${pluginStatus.metamod ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-800 text-gray-400'} flex items-center justify-center transition-all`}>
                            <Cpu size={28} />
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-white">Metamod:Source</h4>
                            <p className="text-sm text-gray-500">Essential base framework</p>
                        </div>
                    </div>
                    {pluginStatus.metamod ? (
                        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest border border-green-500/20">Installed</span>
                    ) : (
                        <span className="px-3 py-1 rounded-full bg-gray-800 text-gray-500 text-[10px] font-black uppercase tracking-widest">Not Detected</span>
                    )}
                </div>
                
                <p className="mt-6 text-gray-400 text-sm leading-relaxed relative z-10">
                    The core framework required for almost all CS2 server extensions. It handles plugin orchestration and low-level engine hooks.
                </p>
                
                <div className="mt-8 flex items-center justify-between relative z-10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-600">Version 2.0 (Source 2)</div>
                    <div className="flex gap-2">
                        {pluginStatus.metamod ? (
                            <button 
                                disabled={actionLoading !== null}
                                onClick={() => handleAction('metamod', 'uninstall')}
                                className="flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                            >
                                {actionLoading === 'metamod' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                Uninstall
                            </button>
                        ) : (
                            <button 
                                disabled={actionLoading !== null}
                                onClick={() => handleAction('metamod', 'install')}
                                className="flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all bg-primary text-white hover:bg-blue-600 shadow-lg shadow-primary/20 active:scale-95"
                            >
                                {actionLoading === 'metamod' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                )}
                                Install Framework
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* CS Sharp Card */}
            <div className={`bg-[#111827] border ${pluginStatus.cssharp ? 'border-primary/30 bg-primary/5' : 'border-gray-800'} rounded-2xl p-6 transition-all relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 transform group-hover:scale-110 transition-transform">
                    <Zap size={120} />
                </div>
                
                <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center space-x-4">
                        <div className={`w-14 h-14 rounded-2xl ${pluginStatus.cssharp ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-800 text-gray-400'} flex items-center justify-center transition-all`}>
                            <Zap size={28} />
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-white">CounterStrikeSharp</h4>
                            <p className="text-sm text-gray-500">C# Scripting Platform</p>
                        </div>
                    </div>
                    {pluginStatus.cssharp ? (
                        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest border border-green-500/20">Installed</span>
                    ) : (
                        <span className="px-3 py-1 rounded-full bg-gray-800 text-gray-500 text-[10px] font-black uppercase tracking-widest">Not Detected</span>
                    )}
                </div>
                
                <p className="mt-6 text-gray-400 text-sm leading-relaxed relative z-10">
                    A powerful platform for creating server-side plugins using C#. It provides a modern API for gameplay modification and admin tools.
                </p>
                
                <div className="mt-8 flex items-center justify-between relative z-10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-600">Requires Metamod</div>
                    <div className="flex gap-2">
                        {pluginStatus.cssharp ? (
                            <button 
                                disabled={actionLoading !== null}
                                onClick={() => handleAction('cssharp', 'uninstall')}
                                className="flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                            >
                                {actionLoading === 'cssharp' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                Uninstall
                            </button>
                        ) : (
                            <button 
                                disabled={actionLoading !== null}
                                onClick={() => handleAction('cssharp', 'install')}
                                className="flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all bg-primary text-white hover:bg-blue-600 shadow-lg shadow-primary/20 active:scale-95"
                            >
                                {actionLoading === 'cssharp' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                )}
                                Install Platform
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Featured Plugins Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-wider text-[13px]">
                <ShieldCheck className="text-primary w-5 h-5" />
                One-Click Plugin Gallery
            </h3>
            <div className="flex items-center space-x-2 bg-blue-500/10 text-primary px-3 py-1 rounded-lg border border-primary/20">
                <AlertCircle size={14} />
                <span className="text-[10px] font-bold">Requires CounterStrikeSharp</span>
            </div>
        </div>

        <div className="bg-[#111827] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800/50 text-left">
              <thead>
                <tr className="bg-[#0c1424]">
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Plugin Name</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Author</th>
                  <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Description</th>
                  <th className="py-4 px-6 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                        <div className="font-bold text-white text-sm">MatchZy</div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500">v0.8.15</span>
                            {pluginUpdates?.matchzy?.hasUpdate && (
                                <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-[9px] font-bold border border-green-500/20 animate-pulse">
                                    {pluginUpdates.matchzy.latestVersion} Available
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-400">shobhit-pathak</td>
                    <td className="py-4 px-6 text-xs text-gray-400">Competitive match & practice system for CS2 servers.</td>
                    <td className="py-4 px-6 text-right">
                        <div className="flex items-center gap-2 justify-end">
                            {pluginStatus.matchzy ? (
                                <>
                                    {pluginUpdates?.matchzy?.hasUpdate && (
                                        <button 
                                            disabled={actionLoading !== null}
                                            onClick={() => handleUpdate('matchzy')}
                                            className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 border border-green-500/20 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                                        >
                                            {actionLoading === 'matchzy' ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                            Update
                                        </button>
                                    )}
                                    <button 
                                        disabled={actionLoading !== null}
                                        onClick={() => handleAction('matchzy', 'uninstall')}
                                        className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 border border-red-500/20 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                                    >
                                        {actionLoading === 'matchzy' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                        Uninstall
                                    </button>
                                </>
                            ) : (
                                <button 
                                    disabled={actionLoading !== null || !pluginStatus.cssharp}
                                    onClick={() => handleAction('matchzy', 'install')}
                                    className={`px-3 py-1.5 rounded transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${
                                        !pluginStatus.cssharp 
                                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                                        : 'bg-gray-800 text-gray-300 hover:bg-primary hover:text-white'
                                    }`}
                                    title={!pluginStatus.cssharp ? "Requires CounterStrikeSharp" : ""}
                                >
                                    {actionLoading === 'matchzy' ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                    Install
                                </button>
                            )}
                        </div>
                    </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                        <div className="font-bold text-white text-sm">Puddin's Skin Changer</div>
                        <div className="text-[11px] text-gray-500">v1.2.0</div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-400">Pudding</td>
                    <td className="py-4 px-6 text-xs text-gray-400">Advanced weapon skin and knife changer for CS2.</td>
                    <td className="py-4 px-6 text-right">
                        <button className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded hover:bg-primary hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest">Install</button>
                    </td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                        <div className="font-bold text-white text-sm">CS2 SimpleAdmin</div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500">v1.7.8-beta-8</span>
                            {pluginUpdates?.simpleadmin?.hasUpdate && (
                                <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-[9px] font-bold border border-green-500/20 animate-pulse">
                                    {pluginUpdates.simpleadmin.latestVersion} Available
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-400">daffyyyy</td>
                    <td className="py-4 px-6 text-xs text-gray-400">Essential admin commands (kick, ban, map) and player management.</td>
                    <td className="py-4 px-6 text-right">
                        <div className="flex items-center gap-2 justify-end">
                            {pluginStatus.simpleadmin ? (
                                <>
                                    {pluginUpdates?.simpleadmin?.hasUpdate && (
                                        <button 
                                            disabled={actionLoading !== null}
                                            onClick={() => handleUpdate('simpleadmin')}
                                            className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 border border-green-500/20 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                                        >
                                            {actionLoading === 'simpleadmin' ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                            Update
                                        </button>
                                    )}
                                    <button 
                                        disabled={actionLoading !== null}
                                        onClick={() => handleAction('simpleadmin', 'uninstall')}
                                        className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 border border-red-500/20 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                                    >
                                        {actionLoading === 'simpleadmin' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                        Uninstall
                                    </button>
                                </>
                            ) : (
                                <button 
                                    disabled={actionLoading !== null || !pluginStatus.cssharp}
                                    onClick={() => handleAction('simpleadmin', 'install')}
                                    className={`px-3 py-1.5 rounded transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${
                                        !pluginStatus.cssharp 
                                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                                        : 'bg-gray-800 text-gray-300 hover:bg-primary hover:text-white'
                                    }`}
                                    title={!pluginStatus.cssharp ? "Requires CounterStrikeSharp" : ""}
                                >
                                    {actionLoading === 'simpleadmin' ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                    Install
                                </button>
                            )}
                        </div>
                    </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Plugins
