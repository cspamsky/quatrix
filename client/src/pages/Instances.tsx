import { 
  Search, 
  Plus, 
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import InstanceCard, { type Instance } from '../components/InstanceCard'

const Instances = () => {
  const navigate = useNavigate()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [installingId, setInstallingId] = useState<number | null>(null)

  const fetchServers = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/servers')
      const data = await response.json()
      setInstances(data)
    } catch (error) {
      console.error('Failed to fetch servers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  const handleDeleteServer = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this server instance? All data will be permanently removed.')) return
    
    setDeletingId(id)
    try {
      const response = await fetch(`http://localhost:3001/api/servers/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setInstances(prev => prev.filter(i => i.id !== id))
      } else {
        alert('Failed to delete server')
      }
    } catch (error) {
      console.error('Delete server error:', error)
      alert('Connection error')
    } finally {
      setDeletingId(null)
    }
  }, [])

  const handleInstall = useCallback(async (id: number) => {
    setInstallingId(id)
    try {
      const response = await fetch(`http://localhost:3001/api/servers/${id}/install`, {
        method: 'POST'
      })
      if (response.ok) {
        // Redirection to console as requested
        navigate(`/instances/${id}/console`)
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to start installation')
      }
    } catch (error) {
      console.error('Install error:', error)
      alert('Connection error')
    } finally {
      setInstallingId(null)
    }
  }, [navigate])

  const handleStartServer = useCallback(async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/servers/${id}/start`, {
        method: 'POST'
      })
      if (response.ok) {
        // Refresh server list to get updated status
        fetchServers()
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to start server')
      }
    } catch (error) {
      console.error('Start server error:', error)
      alert('Connection error')
    }
  }, [fetchServers])

  const handleStopServer = useCallback(async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/servers/${id}/stop`, {
        method: 'POST'
      })
      if (response.ok) {
        // Refresh server list to get updated status
        fetchServers()
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to stop server')
      }
    } catch (error) {
      console.error('Stop server error:', error)
      alert('Connection error')
    }
  }, [fetchServers])

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleConsole = useCallback((id: number) => {
    navigate(`/instances/${id}/console`)
  }, [navigate])

  const handleSettings = useCallback((id: number) => {
    navigate(`/instances/${id}/settings`)
  }, [navigate])

  return (
    <div className="p-6 min-h-screen flex flex-col">
      <div className="flex-1">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Server Instances</h2>
            <p className="text-sm text-gray-400 mt-1">Manage and monitor your dedicated CS2 server instances in real-time.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                className="w-64 pl-10 pr-4 py-2 bg-[#111827] border border-gray-800 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl transition-all outline-none text-sm text-gray-200" 
                placeholder="Filter instances..." 
                type="text"
              />
            </div>
            <button 
              onClick={() => navigate('/instances/create')}
              className="bg-primary hover:bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Plus className="mr-2 w-4 h-4" />
              Create New Instance
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-400">Loading servers...</div>
          </div>
        ) : instances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-400 mb-4">No servers found. Create your first server to get started!</p>
            <button 
              onClick={() => navigate('/instances/create')}
              className="px-6 py-2 bg-primary hover:bg-blue-600 text-white rounded-xl font-semibold transition-all"
            >
              Create Server
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                isCopied={copiedId === instance.id.toString()}
                isDeleting={deletingId === instance.id}
                isInstalling={installingId === instance.id}
                onStart={handleStartServer}
                onStop={handleStopServer}
                onInstall={handleInstall}
                onDelete={handleDeleteServer}
                onCopy={copyToClipboard}
                onConsole={handleConsole}
                onSettings={handleSettings}
              />
            ))}
          </div>
        )}
      </div>

      {!loading && instances.length > 0 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-[#111827] rounded-xl border border-gray-800/60">
          <div className="flex items-center space-x-10">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Total Active</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-bold text-white">{instances.filter(i => i.status === 'ONLINE').length}</span>
                <span className="text-gray-500 text-sm">/ {instances.length}</span>
              </div>
            </div>
            <div className="w-px h-8 bg-gray-800"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Player Count</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-bold text-white">{instances.reduce((sum, i) => sum + i.current_players, 0)}</span>
                <span className="text-gray-500 text-sm">/ {instances.reduce((sum, i) => sum + i.max_players, 0)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              aria-label="Previous page"
              className="p-2 border border-gray-800 rounded-md hover:bg-gray-800 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors" 
              disabled
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-md text-xs font-bold shadow-sm">1</button>
            <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-800 rounded-md text-xs font-medium transition-colors">2</button>
            <button 
              aria-label="Next page"
              className="p-2 border border-gray-800 rounded-md hover:bg-gray-800 text-gray-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Instances
