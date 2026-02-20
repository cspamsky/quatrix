import { useState, useEffect } from 'react';
import { X, Search, Download, AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import toast from 'react-hot-toast';
import Button from '../ui/Button';

interface RemoteServer {
  attributes: {
    identifier: string;
    uuid: string;
    name: string;
    node: string;
    is_suspended: boolean;
    allocation: number;
    is_imported?: boolean; // Quatrix enrichment
    limits: {
      memory: number;
      disk: number;
    };
    relationships?: {
      allocations?: {
        data: Array<{
          attributes: {
            id: number;
            port: number;
            ip: string;
          };
        }>;
      };
    };
  };
  is_imported?: boolean; // Quatrix enrichment at root level
}

interface Panel {
  id: string;
  name: string;
}

const PterodactylImportModal = ({
  isOpen,
  onClose,
  onImported,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}) => {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<string>('');
  const [servers, setServers] = useState<RemoteServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPanels();
    }
  }, [isOpen]);

  const fetchPanels = async () => {
    try {
      const res = await apiFetch('/api/pterodactyl/panels');
      if (res.ok) {
        const data = await res.json();
        setPanels(data);
        if (data.length > 0) setSelectedPanel(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch panels:', error);
    }
  };

  const fetchRemoteServers = async () => {
    if (!selectedPanel) return;
    setLoading(true);
    setServers([]);
    try {
      const res = await apiFetch(`/api/pterodactyl/panels/${selectedPanel}/servers`);
      if (res.ok) {
        const data = await res.json();
        setServers(data);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to list servers');
      }
    } catch (error) {
      toast.error('Panel connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (remote: RemoteServer) => {
    setImportingId(remote.attributes.identifier);
    const allocation =
      remote.attributes.relationships?.allocations?.data.find(
        (a) => a.attributes.id === remote.attributes.allocation
      ) || remote.attributes.relationships?.allocations?.data[0];

    try {
      const res = await apiFetch('/api/pterodactyl/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panel_id: selectedPanel,
          remote_id: remote.attributes.identifier,
          name: remote.attributes.name,
          port: allocation?.attributes.port || 27015,
          ip: allocation?.attributes.ip,
        }),
      });

      if (res.ok) {
        toast.success(`Imported ${remote.attributes.name}`);
        onImported();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Import failed');
      }
    } catch (error) {
      toast.error('Import error');
    } finally {
      setImportingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>

      <div className="relative w-full max-w-3xl bg-[#0B0F17] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-6 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Import Pterodactyl Server
              </h2>
              <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-0.5 opacity-70">
                Hybrid Orchestrator Wizard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Panel Selector */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-1 text-[10px]">
              Select Panel Source
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={selectedPanel}
                onChange={(e) => setSelectedPanel(e.target.value)}
                className="flex-1 bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all appearance-none"
              >
                <option value="" disabled>
                  Choose a connected panel...
                </option>
                {panels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button
                onClick={fetchRemoteServers}
                disabled={!selectedPanel || loading}
                isLoading={loading}
                className="px-8"
                icon={<Search className="w-4 h-4" />}
              >
                Search Remote
              </Button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Available Servers ({servers.length})
              </h4>
              <div className="flex items-center gap-2 text-[10px] text-amber-500 font-bold uppercase">
                <Shield className="w-3 h-3" />
                Secure Import Active
              </div>
            </div>

            {servers.length === 0 && !loading && (
              <div className="py-20 flex flex-col items-center justify-center text-center bg-black/10 rounded-2xl border border-dashed border-gray-800">
                <div className="w-16 h-16 rounded-full bg-gray-800/20 flex items-center justify-center text-gray-600 mb-4">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-gray-400 font-bold">No servers found</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Select a panel and click search to list available servers.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {servers.map((remote) => (
                <div
                  key={remote.attributes.uuid}
                  className="group bg-black/40 hover:bg-primary/5 rounded-2xl border border-gray-800 hover:border-primary/50 p-5 transition-all flex flex-col sm:flex-row items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-5 w-full">
                    <div className="w-12 h-12 rounded-2xl bg-gray-800/30 flex items-center justify-center text-gray-500 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h5 className="font-bold text-lg text-white truncate">
                        {remote.attributes.name}
                      </h5>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter bg-gray-800/50 px-2 py-0.5 rounded-md">
                          ID: {remote.attributes.identifier}
                        </span>
                        <span className="text-[10px] font-bold text-primary uppercase">
                          Node: {remote.attributes.node}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="hidden xl:flex flex-col items-end text-right mr-4">
                      <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                        Resources
                      </span>
                      <span className="text-xs text-gray-400 font-bold">
                        {remote.attributes.limits.memory}MB RAM / {remote.attributes.limits.disk}MB
                        Disk
                      </span>
                    </div>
                    <Button
                      onClick={() => handleImport(remote)}
                      isLoading={importingId === remote.attributes.identifier}
                      disabled={remote.is_imported}
                      className={`w-full sm:w-auto whitespace-nowrap ${
                        remote.is_imported
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20'
                      }`}
                      icon={
                        remote.is_imported ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )
                      }
                    >
                      {remote.is_imported ? 'Already Imported' : 'Import to Quatrix'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="p-6 bg-black/40 border-t border-gray-800 flex items-center gap-3 text-xs text-gray-500 italic">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Importing a server will add it to your Quatrix instances and allow you to manage power,
          console and players.
        </footer>
      </div>
    </div>
  );
};

export default PterodactylImportModal;
