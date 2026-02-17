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
  category: 'core' | 'metamod' | 'cssharp';
  inPool: boolean;
}

interface PoolTableProps {
  plugins: PluginInfo[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  onDelete: (id: string) => void;
  onUpload: (id: string, name: string) => void;
  tabSwitcher: React.ReactNode;
}

const PoolTable: React.FC<PoolTableProps> = ({
  plugins,
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  onDelete,
  onUpload,
  tabSwitcher,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row gap-3 shrink-0">
        {tabSwitcher}
        <div className="flex-1">
          <SearchInput
            placeholder={t('plugins.search_repository')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

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
            {plugins.map((info) => (
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
                      <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                        {info.name}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{info.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {info.inPool ? (
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle2 size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {t('plugins.installed')}
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
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {info.inPool ? (
                      <button
                        onClick={() => onDelete(info.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20"
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PoolTable;
