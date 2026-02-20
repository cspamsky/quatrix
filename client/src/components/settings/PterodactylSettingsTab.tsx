import { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import toast from 'react-hot-toast';
import Button from '../ui/Button';

interface Panel {
  id: string;
  name: string;
  base_url: string;
  created_at: string;
}

const PterodactylSettingsTab = () => {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newPanel, setNewPanel] = useState({ name: '', baseUrl: '', apiKey: '', clientApiKey: '' });

  useEffect(() => {
    fetchPanels();
  }, []);

  const fetchPanels = async () => {
    try {
      const res = await apiFetch('/api/pterodactyl/panels');
      if (res.ok) {
        const data = await res.json();
        setPanels(data);
      }
    } catch (error) {
      console.error('Failed to fetch panels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await apiFetch('/api/pterodactyl/panels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPanel.name,
          base_url: newPanel.baseUrl,
          api_key: newPanel.apiKey,
          client_api_key: newPanel.clientApiKey,
        }),
      });

      if (res.ok) {
        toast.success('Pterodactyl panel registered');
        setNewPanel({ name: '', baseUrl: '', apiKey: '', clientApiKey: '' });
        fetchPanels();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to register panel');
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePanel = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this panel connection? Remote servers will still work but you won't be able to controls them easily."
      )
    )
      return;

    try {
      const res = await apiFetch(`/api/pterodactyl/panels/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Panel removed');
        fetchPanels();
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Pterodactyl Panels</h3>
          <p className="text-sm text-gray-400">
            Connect to external Pterodactyl instances to manage them from Quatrix.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add Connection */}
        <div className="bg-black/20 rounded-2xl border border-gray-800 p-6">
          <h4 className="text-sm font-black text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add New Connection
          </h4>
          <form onSubmit={handleAddPanel} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Panel Name
              </label>
              <input
                type="text"
                value={newPanel.name}
                onChange={(e) => setNewPanel({ ...newPanel, name: e.target.value })}
                placeholder="e.g. My Home Lab"
                className="w-full px-4 py-2 bg-black/40 border border-gray-800 rounded-xl text-white outline-none focus:border-primary transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Panel URL
              </label>
              <input
                type="url"
                value={newPanel.baseUrl}
                onChange={(e) => setNewPanel({ ...newPanel, baseUrl: e.target.value })}
                placeholder="https://panel.example.com"
                className="w-full px-4 py-2 bg-black/40 border border-gray-800 rounded-xl text-white outline-none focus:border-primary transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Application API Key (ptla_)
              </label>
              <input
                type="password"
                value={newPanel.apiKey}
                onChange={(e) => setNewPanel({ ...newPanel, apiKey: e.target.value })}
                placeholder="Required for listing servers"
                className="w-full px-4 py-2 bg-black/40 border border-gray-800 rounded-xl text-white outline-none focus:border-primary transition-all font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Client API Key (ptlc_)
              </label>
              <input
                type="password"
                value={newPanel.clientApiKey}
                onChange={(e) => setNewPanel({ ...newPanel, clientApiKey: e.target.value })}
                placeholder="Required for Power Controls (Start/Stop)"
                className="w-full px-4 py-2 bg-black/40 border border-gray-800 rounded-xl text-white outline-none focus:border-primary transition-all font-mono text-sm"
              />
            </div>
            <Button
              type="submit"
              isLoading={adding}
              className="w-full py-3"
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              Verify & Add Connection
            </Button>
          </form>
        </div>

        {/* Existing Connections */}
        <div className="space-y-4">
          <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
            Active Connections ({panels.length})
          </h4>
          {panels.length === 0 && !loading && (
            <div className="py-12 flex flex-col items-center justify-center bg-black/10 rounded-2xl border border-dashed border-gray-800 group border-gray-800">
              <AlertCircle className="w-8 h-8 text-gray-600 mb-2 group-hover:text-primary transition-colors" />
              <p className="text-gray-600 text-sm font-medium">No external panels connected.</p>
            </div>
          )}

          <div className="space-y-3">
            {panels.map((panel) => (
              <div
                key={panel.id}
                className="bg-[#111827] rounded-xl border border-gray-800 p-4 flex items-center justify-between group hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white leading-tight">{panel.name}</h5>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{panel.base_url}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePanel(panel.id)}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PterodactylSettingsTab;
