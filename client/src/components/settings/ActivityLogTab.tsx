import React from 'react'
import { Terminal, Server, Database, Monitor, AlertTriangle, Shield } from 'lucide-react'

const ActivityLogTab: React.FC = () => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 mb-6">
        <Terminal className="text-[#1890ff]" size={20} />
        <h3 className="text-lg font-bold text-white">Recent Activities</h3>
      </div>
      <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-hide">
        {/* Activity Item */}
        <div className="flex items-start gap-4 p-4 bg-[#0F172A]/50 rounded-lg border border-gray-800/30 hover:border-blue-500/30 transition-all">
          <div className="p-2 rounded-lg bg-green-500/10 text-green-500 shrink-0">
            <Server size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Server Started</p>
            <p className="text-xs text-gray-400 mt-1">CS2-Server-01 has been successfully started</p>
            <p className="text-xs text-gray-500 mt-2">2 minutes ago</p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-[#0F172A]/50 rounded-lg border border-gray-800/30 hover:border-blue-500/30 transition-all">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
            <Terminal size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Console Command Executed</p>
            <p className="text-xs text-gray-400 mt-1 font-mono">mp_roundtime 5</p>
            <p className="text-xs text-gray-500 mt-2">15 minutes ago</p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-[#0F172A]/50 rounded-lg border border-gray-800/30 hover:border-blue-500/30 transition-all">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
            <Database size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Map Changed</p>
            <p className="text-xs text-gray-400 mt-1">Changed to de_dust2</p>
            <p className="text-xs text-gray-500 mt-2">1 hour ago</p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-[#0F172A]/50 rounded-lg border border-gray-800/30 hover:border-blue-500/30 transition-all">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 shrink-0">
            <Monitor size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">System Update</p>
            <p className="text-xs text-gray-400 mt-1">Server configuration updated successfully</p>
            <p className="text-xs text-gray-500 mt-2">3 hours ago</p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-[#0F172A]/50 rounded-lg border border-gray-800/30 hover:border-blue-500/30 transition-all">
          <div className="p-2 rounded-lg bg-red-500/10 text-red-500 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Security Alert</p>
            <p className="text-xs text-gray-500 mt-1">Failed login attempt detected</p>
            <p className="text-xs text-gray-500 mt-2">5 hours ago</p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-[#0F172A]/50 rounded-lg border border-gray-800/30 hover:border-blue-500/30 transition-all">
          <div className="p-2 rounded-lg bg-green-500/10 text-green-500 shrink-0">
            <Shield size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Password Changed</p>
            <p className="text-xs text-gray-400 mt-1">Account password was successfully updated</p>
            <p className="text-xs text-gray-500 mt-2">1 day ago</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivityLogTab
