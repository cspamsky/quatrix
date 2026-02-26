import React from 'react';
import { Cpu, Zap, Layers, CheckCircle2, AlertCircle, Trash2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SearchInput from '../ui/SearchInput';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PluginInfo {
  id: string;
  name: string;
  githubRepo?: string;
  category: 'core' | 'metamod' | 'cssharp';
  inPool: boolean;
  currentVersion?: string;
}

interface PoolTableProps {
  plugins: PluginInfo[];
  remoteUpdates: Record<string, { hasUpdate: boolean; latestVersion: string; currentVersion: string }>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  onDelete: (id: string) => void;
  onUpload: (id: string, name: string) => void;
  onSyncFromRemote: (id: string) => void;
  onRefreshRemote: () => void;
  isRemoteLoading: boolean;
  isSyncing: boolean;
  tabSwitcher: React.ReactNode;
}

const PoolTable: React.FC<PoolTableProps> = ({
  plugins,
  remoteUpdates,
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  onDelete,
  onUpload,
  onSyncFromRemote,
  onRefreshRemote,
  isRemoteLoading,
  isSyncing,
  tabSwitcher,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row gap-3 shrink-0">
        {tabSwitcher}
        <div className="flex-1">
          <SearchInput
            placeholder={t('plugins.search_repository')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <button
          onClick={onRefreshRemote}
          disabled={isRemoteLoading}
          className="flex items-center gap-2 px-4 py-1.5 bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl border border-gray-700/50 transition-all text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
        >
          <Download size={14} className={isRemoteLoading ? 'animate-bounce' : ''} />
          {isRemoteLoading ? t('plugins.checking_updates') : t('plugins.check_remote_updates')}
        </button>

        <div className="flex items-center gap-1 bg-[#111827]/40 border border-gray-800/50 p-1 rounded-xl overflow-x-auto scrollbar-hide h-[34px]">
          {['all', 'core', 'metamod', 'cssharp'].map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap h-full',
                activeCategory === cat
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              )}
            >
              {t(`plugins.${cat === 'all' ? 'all_categories' : cat}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#111827]/40 border border-gray-800/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0c1424] border-b border-gray-800/80">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 w-1/3">
                {t('plugins.plugin')}
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                {t('plugins.status')}
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">
                {t('plugins.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/20">
            {plugins.map((info) => {
              const remote = remoteUpdates[info.id];
              const hasUpdateAvailable = remote?.hasUpdate;

              return (
                <tr key={info.id} className="group hover:bg-primary/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gray-800/40 text-gray-500 border border-gray-800/40`}
                      >
                        {info.category === 'metamod' ? (
                          <Cpu size={18} />
                        ) : info.category === 'cssharp' ? (
                          <Zap size={18} />
                        ) : (
                          <Layers size={18} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-primary transition-colors flex items-center gap-2">
                          {info.name}
                          {hasUpdateAvailable && (
                            <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" title="Update Available"></span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center gap-2">
                          {info.id}
                          {info.currentVersion && <span>• v{info.currentVersion}</span>}
                          {remote && <span className="text-primary/60 italic">(GitHub: v{remote.latestVersion})</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {info.inPool ? (
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle2 size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {t('plugins.in_pool', 'In Pool')}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-orange-500">
                          <AlertCircle size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {t('plugins.not_in_pool')}
                          </span>
                        </div>
                      )}
                      {hasUpdateAvailable && (
                        <div className="flex items-center gap-2 text-orange-400 bg-orange-500/5 px-2 py-1 rounded-lg border border-orange-500/10 w-fit">
                          <AlertCircle size={12} />
                          <span className="text-[9px] font-bold uppercase tracking-wider">
                            {t('plugins.update_available', 'Update Available')}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {hasUpdateAvailable && (
                        <button
                          onClick={() => onSyncFromRemote(info.id)}
                          disabled={isSyncing}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-500/20 transition-all border border-orange-500/20 disabled:opacity-50"
                        >
                          <Download size={14} className={isSyncing ? 'animate-spin' : ''} />
                          {t('plugins.update_from_github', 'Sync GitHub')}
                        </button>
                      )}
                      {info.inPool ? (
                        <button
                          onClick={() => onDelete(info.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/5 text-red-500/70 hover:text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/10 transition-all border border-red-500/10"
                        >
                          <Trash2 size={14} />
                          {t('plugins.delete')}
                        </button>
                      ) : (
                        <button
                          onClick={() => onUpload(info.id, info.name)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/20 transition-all border border-primary/20"
                        >
                          <Download size={14} />
                          {t('plugins.upload')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PoolTable;
