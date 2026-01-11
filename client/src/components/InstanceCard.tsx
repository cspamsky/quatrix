import { memo } from 'react'
import {
  Users,
  Hash,
  Play,
  Square,
  Terminal,
  Settings,
  Copy,
  Check,
  Trash2,
  Download,
  RefreshCw
} from 'lucide-react'

export interface Instance {
  id: number
  name: string
  map: string
  status: 'ONLINE' | 'OFFLINE' | 'STARTING' | 'INSTALLING'
  current_players: number
  max_players: number
  port: number
  image?: string
  isInstalled?: boolean
}

interface InstanceCardProps {
  instance: Instance
  isCopied: boolean
  isDeleting: boolean
  isInstalling: boolean
  onStart: (id: number) => void
  onStop: (id: number) => void
  onInstall: (id: number) => void
  onDelete: (id: number) => void
  onCopy: (text: string, id: string) => void
  onConsole: (id: number) => void
  onSettings: (id: number) => void
}

const InstanceCard = memo(({
  instance,
  isCopied,
  isDeleting,
  isInstalling,
  onStart,
  onStop,
  onInstall,
  onDelete,
  onCopy,
  onConsole,
  onSettings
}: InstanceCardProps) => {
  return (
    <div
      className={`bg-[#111827] rounded-xl border border-gray-800/50 overflow-hidden flex flex-col group hover:border-primary/50 transition-all duration-300 ${
        instance.status === 'OFFLINE' ? 'opacity-70 grayscale-[0.5]' : ''
      }`}
    >
      <div className="relative h-32 overflow-hidden bg-gray-900">
        <img
          alt={`Map ${instance.map}`}
          className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
          src={instance.image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400"}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] to-transparent"></div>

        <div className="absolute top-3 left-3 flex items-center">
          {instance.status === 'ONLINE' && (
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 flex items-center backdrop-blur-md shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
              ONLINE
            </div>
          )}
          {instance.status === 'OFFLINE' && (
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20 flex items-center backdrop-blur-md shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-1.5"></span>
              OFFLINE
            </div>
          )}
          {instance.status === 'STARTING' && (
             <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 flex items-center backdrop-blur-md shadow-sm">
              <div className="w-2 h-2 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mr-1.5"></div>
              STARTING
            </div>
          )}
          {instance.status === 'INSTALLING' && (
             <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center backdrop-blur-md shadow-sm">
              <div className="w-2 h-2 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-1.5"></div>
              INSTALLING
            </div>
          )}
        </div>

        <div className="absolute bottom-3 left-3">
          <p className="text-white text-[10px] font-bold tracking-widest uppercase opacity-80">{instance.map}</p>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-white truncate text-sm">{instance.name}</h3>
          <span className="text-[10px] text-gray-500 font-mono">ID: {instance.id}</span>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 flex items-center">
              <Users className="w-3.5 h-3.5 mr-2 opacity-70" /> Players
            </span>
            <span className="text-white font-medium">{instance.current_players} / {instance.max_players}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 flex items-center">
              <Hash className="w-3.5 h-3.5 mr-2 opacity-70" /> Port
            </span>
            <div
              className="flex items-center gap-1.5 text-primary cursor-pointer hover:text-blue-400 transition-colors group/ip"
              onClick={() => onCopy(`localhost:${instance.port}`, instance.id.toString())}
            >
              <span className="font-mono">localhost:{instance.port}</span>
              {isCopied ? <Check size={12} /> : <Copy size={12} className="opacity-0 group-hover/ip:opacity-100 transition-opacity" />}
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4 border-t border-gray-800/60">
          {!instance.isInstalled ? (
            <button
              onClick={() => onInstall(instance.id)}
              disabled={isInstalling || instance.status === 'INSTALLING'}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded text-[11px] font-semibold transition-all flex items-center justify-center shadow-lg shadow-orange-500/10 disabled:opacity-50"
            >
              {isInstalling || instance.status === 'INSTALLING' ? (
                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-3 h-3 mr-1.5" />
              )}
              {instance.status === 'INSTALLING' ? 'Installing...' : 'Install Server'}
            </button>
          ) : instance.status === 'OFFLINE' ? (
            <button
              onClick={() => onStart(instance.id)}
              className="flex-1 bg-primary hover:bg-blue-600 text-white py-2 rounded text-[11px] font-semibold transition-all flex items-center justify-center shadow-lg shadow-primary/10"
            >
              <Play className="w-3 h-3 mr-1.5" /> Start
            </button>
          ) : (
            <button
              onClick={() => onStop(instance.id)}
              className="flex-1 bg-gray-800/40 hover:bg-red-500/10 hover:text-red-500 py-2 rounded text-[11px] font-semibold transition-all flex items-center justify-center border border-gray-800/40"
            >
              <Square className="w-3 h-3 mr-1.5 fill-current" /> Stop
            </button>
          )}
          <button
            onClick={() => onConsole(instance.id)}
            className={`flex-1 bg-gray-800/40 py-2 rounded text-[11px] font-semibold transition-all flex items-center justify-center border border-gray-800/40 ${
              !instance.isInstalled ? 'text-gray-600 cursor-not-allowed' : 'hover:bg-primary/10 hover:text-primary'
            }`}
            disabled={!instance.isInstalled}
          >
            <Terminal className="w-3 h-3 mr-1.5" /> Console
          </button>
          <button
            aria-label="Server settings"
            onClick={() => onSettings(instance.id)}
            className="p-2 bg-gray-800/40 hover:bg-gray-700/40 rounded transition-all border border-gray-800/40 text-gray-400 hover:text-white"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            aria-label="Delete server"
            onClick={() => onDelete(instance.id)}
            disabled={isDeleting}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded transition-all border border-red-500/20 text-red-500 flex items-center justify-center disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
})

export default InstanceCard
