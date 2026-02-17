import { memo } from 'react';
import {
  Users,
  Play,
  Square,
  Terminal,
  Settings,
  Trash2,
  Download,
  RotateCcw,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import IconButton from './ui/IconButton';
import Checkbox from './ui/Checkbox';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Instance {
  id: number;
  name: string;
  map: string;
  status: 'ONLINE' | 'OFFLINE' | 'STARTING' | 'INSTALLING' | 'CRASHED';
  current_players: number;
  max_players: number;
  port: number;
  isInstalled?: boolean;
  workshop_map_name?: string;
}

interface ServerRowProps {
  instance: Instance;
  serverIp: string;
  isSelected: boolean;
  onSelect: (id: number) => void;
  installingId: number | null;
  startingId: number | null;
  stoppingId: number | null;
  restartingId: number | null;
  deletingId: number | null;
  onInstall: (id: number) => void;
  onStart: (id: number) => void;
  onStop: (id: number) => void;
  onRestart: (id: number) => void;
  onDelete: (id: number) => void;
  onConsole: (id: number) => void;
  onSettings: (id: number) => void;
  onFiles: (id: number) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
  userPermissions?: string[];
}

const ServerRow = memo(
  ({
    instance,
    serverIp,
    isSelected,
    onSelect,
    installingId,
    startingId,
    stoppingId,
    restartingId,
    deletingId,
    onInstall,
    onStart,
    onStop,
    onRestart,
    onDelete,
    onConsole,
    onSettings,
    onFiles,
    onCopy,
    copiedId,
    userPermissions = [],
  }: ServerRowProps) => {
    const { t } = useTranslation();

    const hasPerm = (p: string) => userPermissions.includes('*') || userPermissions.includes(p);

    return (
      <div
        className={`flex items-center gap-4 bg-[#111827] hover:bg-[#111827]/80 p-3 rounded-xl border transition-all ${
          isSelected ? 'border-primary bg-primary/5' : 'border-gray-800/50'
        } ${instance.status === 'OFFLINE' ? 'opacity-80' : ''}`}
      >
        <div className="flex items-center gap-3 shrink-0">
          <Checkbox checked={isSelected} onChange={() => onSelect(instance.id)} />
          <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center shrink-0 border border-gray-800 overflow-hidden">
            {instance.status === 'ONLINE' ? (
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            ) : instance.status === 'OFFLINE' ? (
              <div className="w-2 h-2 rounded-full bg-gray-500" />
            ) : instance.status === 'CRASHED' ? (
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            ) : (
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-sm truncate">{instance.name}</h3>
            <span className="text-[10px] text-gray-600 font-mono">#{instance.id}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest truncate max-w-[120px]">
              {instance.workshop_map_name || instance.map}
            </p>
            <span className="text-[10px] text-gray-700">|</span>
            <button
              type="button"
              onClick={() => onCopy(`${serverIp}:${instance.port}`, instance.id.toString())}
              className="group/ip flex items-center gap-1.5 transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/5 border border-primary/10 group-hover/ip:border-primary/30 transition-all">
                <span className="text-[10px] text-gray-500 font-mono font-bold group-hover/ip:text-primary transition-colors">
                  {serverIp}:{instance.port}
                </span>
                {copiedId === instance.id.toString() ? (
                  <Check size={10} className="text-primary transition-all scale-110" />
                ) : (
                  <Copy
                    size={10}
                    className="text-primary opacity-40 group-hover/ip:opacity-100 transition-all"
                  />
                )}
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-8 shrink-0 px-4">
          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter mb-1">
              {t('serverCard.players')}
            </span>
            <div className="flex items-center gap-1.5">
              <Users size={12} className="text-gray-500" />
              <span className="text-xs font-bold text-gray-200">
                {instance.current_players} / {instance.max_players}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!instance.isInstalled ? (
            hasPerm('servers.create') && (
              <IconButton
                onClick={() => onInstall(instance.id)}
                isLoading={installingId === instance.id || instance.status === 'INSTALLING'}
                variant="ghost"
                title={t('serverCard.install_server')}
                className="text-orange-500 hover:bg-orange-500/10 border-orange-500/20"
              >
                <Download size={16} />
              </IconButton>
            )
          ) : (
            <>
              {instance.status === 'OFFLINE' ? (
                hasPerm('servers.update') && (
                  <IconButton
                    onClick={() => onStart(instance.id)}
                    isLoading={startingId === instance.id}
                    variant="ghost"
                    title={t('serverCard.start')}
                    className="text-green-500 hover:bg-green-500/10 border-green-500/20"
                  >
                    <Play size={16} />
                  </IconButton>
                )
              ) : (
                <>
                  {hasPerm('servers.update') && (
                    <>
                      <IconButton
                        onClick={() => onStop(instance.id)}
                        isLoading={stoppingId === instance.id}
                        variant="ghost"
                        title={t('serverCard.stop')}
                        className="text-red-500 hover:bg-red-500/10 border-red-500/20"
                      >
                        <Square size={16} className="fill-current" />
                      </IconButton>
                      <IconButton
                        onClick={() => onRestart(instance.id)}
                        isLoading={restartingId === instance.id}
                        variant="ghost"
                        title={t('serverCard.restart')}
                        className="text-amber-500 hover:bg-amber-500/10 border-amber-500/20"
                      >
                        <RotateCcw
                          className={cn('w-4 h-4', restartingId === instance.id && 'animate-spin')}
                        />
                      </IconButton>
                    </>
                  )}
                </>
              )}
              {hasPerm('servers.console') && (
                <IconButton
                  onClick={() => onConsole(instance.id)}
                  variant="ghost"
                  title={t('serverCard.console')}
                  className="text-blue-500 hover:bg-blue-500/10 border-blue-500/20"
                >
                  <Terminal size={16} />
                </IconButton>
              )}
            </>
          )}
          <div className="w-px h-6 bg-gray-800 mx-1" />
          {hasPerm('servers.files') && (
            <IconButton
              onClick={() => onFiles(instance.id)}
              disabled={!instance.isInstalled}
              variant="ghost"
              title={t('serverCard.file_manager')}
            >
              <FileText size={16} />
            </IconButton>
          )}

          <IconButton
            onClick={() => onSettings(instance.id)}
            variant="ghost"
            title={t('serverCard.settings')}
          >
            <Settings size={16} />
          </IconButton>

          {hasPerm('servers.delete') && (
            <IconButton
              onClick={() => onDelete(instance.id)}
              isLoading={deletingId === instance.id}
              variant="ghost"
              title={t('serverCard.delete_server')}
              className="text-red-500 hover:bg-red-500/10 border-red-500/20"
            >
              <Trash2 size={16} />
            </IconButton>
          )}
        </div>
      </div>
    );
  }
);

export default ServerRow;
