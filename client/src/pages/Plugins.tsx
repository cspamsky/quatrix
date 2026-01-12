import { useState, useEffect, useCallback } from 'react'
import { 
  Cpu, 
  Zap, 
  Server as ServerIcon,
  Download,
  ShieldCheck,
  AlertCircle,
  Loader2
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
  const { showNotification } = useNotification()
  const { showConfirm } = useConfirmDialog()
  const [instances, setInstances] = useState<Instance[]>([])
  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [pluginStatus, setPluginStatus] = useState<{ metamod: boolean, cssharp: boolean }>({ metamod: false, cssharp: false })
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchInstances = useCallback(async () => {
    try {
        const response = await apiFetch('/api/servers');
        const data = await response.json();
        setInstances(data);
        if (data.length > 0 && !selectedServer) {
            setSelectedServer(data[0].id.toString());
        }
    } catch (error) {
        console.error('Failed to fetch instances:', error);
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

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  useEffect(() => {
    if (selectedServer) {
        fetchPluginStatus(selectedServer);
    }
  }, [selectedServer, fetchPluginStatus]);

  const handleInstall = async (pluginId: 'metamod' | 'cssharp') => {
    if (!selectedServer) return;

    const pluginName = pluginId === 'metamod' ? 'Metamod:Source' : 'CounterStrikeSharp';
    
    // Check requirements
    if (pluginId === 'cssharp' && !pluginStatus.metamod) {
        showNotification('warning', 'Requirement Missing', 'Metamod required before installing CounterStrikeSharp');
        return;
    }

    const isConfirmed = await showConfirm({
        title: `Install ${pluginName}`,
        message: `Are you sure you want to install ${pluginName} on the selected server? The server should be OFFLINE for a safe installation.`,
        confirmText: 'Install Now',
        type: 'warning'
    });

    if (!isConfirmed) return;

    setActionLoading(pluginId);
    try {
        const endpoint = pluginId === 'metamod' ? 'install-metamod' : 'install-cssharp';
        const response = await apiFetch(`/api/servers/${selectedServer}/plugins/${endpoint}`, {
            method: 'POST'
        });

        if (response.ok) {
            showNotification('success', 'Installation Success', `${pluginName} installed successfully!`);
            fetchPluginStatus(selectedServer);
        } else {
            const error = await response.json();
            showNotification('error', 'Installation Failed', error.message || `Failed to install ${pluginName}`);
        }
    } catch (error: any) {
        showNotification('error', 'Error', error.message || 'Installation failed');
    } finally {
        setActionLoading(null);
    }
  };

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
                {instances.map((inst: Instance) => (
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
                    <button 
                        disabled={pluginStatus.metamod || actionLoading !== null}
                        onClick={() => handleInstall('metamod')}
                        className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            pluginStatus.metamod 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                            : 'bg-primary text-white hover:bg-blue-600 shadow-lg shadow-primary/20 active:scale-95'
                        }`}
                    >
                        {actionLoading === 'metamod' ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        {pluginStatus.metamod ? 'Already Installed' : 'Install Framework'}
                    </button>
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
                    <button 
                         disabled={pluginStatus.cssharp || actionLoading !== null}
                         onClick={() => handleInstall('cssharp')}
                         className={`flex items-center px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                             pluginStatus.cssharp 
                             ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                             : 'bg-primary text-white hover:bg-blue-600 shadow-lg shadow-primary/20 active:scale-95'
                         }`}
                    >
                        {actionLoading === 'cssharp' ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        {pluginStatus.cssharp ? 'Already Installed' : 'Install Framework'}
                    </button>
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
                        <div className="text-[11px] text-gray-500">v0.6.1</div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-400">shobhit-pathak</td>
                    <td className="py-4 px-6 text-xs text-gray-400">Competitive match & practice system for CS2 servers.</td>
                    <td className="py-4 px-6 text-right">
                        <button className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded hover:bg-primary hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest">Install</button>
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
                        <div className="font-bold text-white text-sm">Advanced Admin</div>
                        <div className="text-[11px] text-gray-500">v1.0.5</div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-400">daffy</td>
                    <td className="py-4 px-6 text-xs text-gray-400">Essential admin commands and player management tools.</td>
                    <td className="py-4 px-6 text-right">
                        <button className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded hover:bg-primary hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest">Install</button>
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
