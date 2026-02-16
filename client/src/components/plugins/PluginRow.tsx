import React from 'react';
import { Cpu, Zap, Layers, Download, Trash2, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';

interface PluginInfo {
  id: string;
  name: string;
  category: 'core' | 'metamod' | 'cssharp';
  description?: string;
  tags?: string[];
  inPool: boolean;
  isCustom?: boolean;
}

interface PluginRowProps {
  id: string;
  info: PluginInfo;
  status: { installed: boolean; hasConfigs: boolean } | undefined;
  updates: { hasUpdate: boolean; currentVersion?: string; latestVersion?: string } | undefined;
  actionLoading: string | null;
  onAction: (id: string, action: 'install' | 'uninstall' | 'update') => void;
  onOpenConfig: (id: string, name: string) => void;
  onOpenUpload: (id: string, name: string) => void;
  metamodInstalled: boolean;
  cssharpInstalled: boolean;
}

const PluginRow: React.FC<PluginRowProps> = ({
  id,
  info,
  status,
  updates,
  actionLoading,
  onAction,
  onOpenConfig,
  onOpenUpload,
  metamodInstalled,
  cssharpInstalled,
}) => {
  const { t } = useTranslation();
  const isInstalled = !!status?.installed;
  const hasConfigs = !!status?.hasConfigs;
  const hasUpdate = !!updates?.hasUpdate;
  const isLoading = actionLoading === id;

  const canInstall =
    !isInstalled &&
    info.inPool &&
    (id === 'metamod' || metamodInstalled) &&
    (info.category !== 'cssharp' || id === 'cssharp' || cssharpInstalled);

  return (
    <tr className="group hover:bg-primary/[0.01] transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              isInstalled
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-gray-800/40 text-gray-500 border border-gray-800/40'
            }`}
          >
            {id === 'metamod' || info.category === 'metamod' ? (
              <Cpu size={18} />
            ) : id === 'cssharp' || info.category === 'cssharp' ? (
              <Zap size={18} />
            ) : (
              <Layers size={18} />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">
              {info.name}
            </div>
            <span
              className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded mt-1 inline-block ${
                isInstalled ? 'bg-green-500/10 text-green-500' : 'bg-gray-800/60 text-gray-500'
              }`}
            >
              {isInstalled ? t('plugins.installed') : t('plugins.not_installed')}
            </span>
            {info.isCustom && (
              <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded mt-1 ml-1 inline-block bg-blue-500/10 text-blue-500 border border-blue-500/20">
                {t('plugins.custom')}
              </span>
            )}
            {!info.inPool && (
              <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded mt-1 ml-1 inline-block bg-orange-500/10 text-orange-500 border border-orange-500/20">
                {t('plugins.not_in_pool')}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 hidden lg:table-cell">
        <p className="text-xs text-gray-500 max-w-sm line-clamp-1 mb-2">
          {info.description || `High-performance module.`}
        </p>
        <div className="flex flex-wrap gap-1">
          {info.tags?.map((tag) => (
            <span
              key={tag}
              className="text-[8px] font-bold text-primary/40 group-hover:text-primary/70 transition-colors uppercase tracking-tight"
            >
              #{tag}
            </span>
          ))}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-mono font-bold text-gray-400">
            {isInstalled ? `v${updates?.currentVersion || '?.?.?'}` : '--'}
          </span>
          {hasUpdate && isInstalled && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px] font-black text-yellow-500 animate-pulse uppercase">
                {t('plugins.update')}
              </span>
              <span className="text-[9px] text-yellow-500/50 font-medium">
                → v{updates?.latestVersion}
              </span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2 text-right">
          {isInstalled ? (
            <>
              <>
                {hasUpdate && (
                  <IconButton
                    onClick={() => onAction(id, 'update')}
                    isLoading={isLoading}
                    variant="primary"
                    className="text-green-500 hover:bg-green-500/10 border-green-500/20"
                    title="Update Plugin"
                  >
                    <Download size={14} />
                  </IconButton>
                )}
                {hasConfigs && (
                  <IconButton
                    onClick={() => onOpenConfig(id, info.name)}
                    variant="ghost"
                    className="bg-primary/5 text-primary hover:bg-primary/10"
                    title="Plugin Settings"
                  >
                    <Settings size={14} />
                  </IconButton>
                )}
                <IconButton
                  onClick={() => onAction(id, 'uninstall')}
                  isLoading={isLoading}
                  variant="ghost"
                  className="bg-red-500/5 text-red-500 hover:bg-red-500/10 border-red-500/10"
                  title="Uninstall Plugin"
                >
                  <Trash2 size={14} />
                </IconButton>
              </>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {!info.inPool && (
                <IconButton
                  onClick={() => onOpenUpload(id, info.name)}
                  variant="ghost"
                  className="bg-orange-500/5 text-orange-500 hover:bg-orange-500/10 border-orange-500/10"
                  title="Upload to Pool"
                >
                  <Layers size={14} />
                </IconButton>
              )}
              <Button
                disabled={!canInstall}
                onClick={() => onAction(id, 'install')}
                isLoading={isLoading}
                variant="primary"
                icon={<Download size={14} />}
                className="text-[10px] uppercase font-bold tracking-widest"
              >
                {info.inPool ? t('plugins.install') : t('plugins.not_in_pool')}
              </Button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export default PluginRow;
