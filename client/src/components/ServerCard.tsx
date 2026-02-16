import { memo } from 'react';
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
  RotateCcw,
  FileText,
} from 'lucide-react';
import { getMapImage } from '../utils/mapImages';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
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
  image?: string;
  isInstalled?: boolean;
  workshop_map_name?: string;
  workshop_map_image?: string;
}

interface ServerCardProps {
  instance: Instance;
  serverIp: string;
  copiedId: string | null;
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
  onCopy: (text: string, id: string) => void;
  onConsole: (id: number) => void;
  onSettings: (id: number) => void;
  onFiles: (id: number) => void;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
  userPermissions?: string[];
}

const ServerCard = memo(
  ({
    instance,
    serverIp,
    copiedId,
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
    onCopy,
    onConsole,
    onSettings,
    onFiles,
    isSelected = false,
    onSelect,
    userPermissions = [],
  }: ServerCardProps) => {
    const { t } = useTranslation();

    const hasPerm = (p: string) => userPermissions.includes('*') || userPermissions.includes(p);
    return (
      <div
        className={`bg-[#111827] rounded-xl border border-gray-800/50 overflow-hidden flex flex-col group hover:border-primary/50 transition-all duration-300 ${
          instance.status === 'OFFLINE' ? 'opacity-70 grayscale-[0.5]' : ''
        } ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
      >
        <div className="relative h-32 overflow-hidden bg-gray-900">
          <img
            alt={`Map ${instance.workshop_map_name || instance.map}`}
            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
            src={instance.workshop_map_image || getMapImage(instance.map)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] to-transparent"></div>

          <div className="absolute top-3 left-3 flex items-center">
            {instance.status === 'ONLINE' && (
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 flex items-center backdrop-blur-md shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                {t('serverCard.status_online')}
              </div>
            )}
            {instance.status === 'OFFLINE' && (
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20 flex items-center backdrop-blur-md shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-1.5"></span>
                {t('serverCard.status_offline')}
              </div>
            )}
            {instance.status === 'STARTING' && (
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 flex items-center backdrop-blur-md shadow-sm">
                <div className="w-2 h-2 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mr-1.5"></div>
                {t('serverCard.status_starting')}
              </div>
            )}
            {instance.status === 'INSTALLING' && (
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center backdrop-blur-md shadow-sm">
                <div className="w-2 h-2 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-1.5"></div>
                {t('serverCard.status_installing')}
              </div>
            )}
            {instance.status === 'CRASHED' && (
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center backdrop-blur-md shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>
                {t('serverCard.status_crashed') || 'CRASHED'}
              </div>
            )}
          </div>

          {onSelect && (
            <div className="absolute top-3 right-3 z-20">
              <Checkbox checked={isSelected} onChange={() => onSelect(instance.id)} />
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
            <p className="text-white text-[10px] font-bold tracking-widest uppercase opacity-80 truncate max-w-[150px]">
              {instance.workshop_map_name || instance.map}
            </p>
            {instance.workshop_map_image && (
              <div className="px-1.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-[8px] font-black text-blue-400 uppercase tracking-tighter backdrop-blur-sm">
                {t('serverCard.workshop')}
              </div>
            )}
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
                <Users className="w-3.5 h-3.5 mr-2 opacity-70" /> {t('serverCard.players')}
              </span>
              <span className="text-white font-medium">
                {instance.current_players} / {instance.max_players}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 flex items-center">
                <Hash className="w-3.5 h-3.5 mr-2 opacity-70" /> {t('serverCard.ip_address')}
              </span>
              <button
                type="button"
                aria-label={t('serverCard.copy_address')}
                title={t('serverCard.copy_address')}
                className="flex items-center gap-1.5 text-primary hover:text-blue-400 transition-colors group/ip bg-transparent border-0 p-0 focus:outline-none"
                onClick={() => onCopy(`${serverIp}:${instance.port}`, instance.id.toString())}
              >
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/5 border border-primary/10 group-hover/ip:border-primary/30 transition-all">
                  <span className="font-mono text-[10px] font-bold">
                    {serverIp || t('serverCard.detecting')}
                    {serverIp ? `:${instance.port}` : ''}
                  </span>
                  {copiedId === instance.id.toString() ? (
                    <Check size={10} className="text-primary" />
                  ) : (
                    <Copy
                      size={10}
                      className="text-primary opacity-40 group-hover/ip:opacity-100 transition-opacity"
                    />
                  )}
                </div>
              </button>
            </div>
          </div>

          <div className="mt-auto flex items-center gap-2 pt-4 border-t border-gray-800/60">
            {!instance.isInstalled ? (
              hasPerm('servers.create') && (
                <Button
                  onClick={() => onInstall(instance.id)}
                  isLoading={installingId === instance.id || instance.status === 'INSTALLING'}
                  variant="primary"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5" />}
                  fullWidth
                  className="bg-orange-600 hover:bg-orange-700 shadow-orange-600/20"
                >
                  {instance.status === 'INSTALLING'
                    ? t('serverCard.installing')
                    : t('serverCard.install_server')}
                </Button>
              )
            ) : (
              <>
                {instance.status === 'OFFLINE' ? (
                  hasPerm('servers.update') && (
                    <Button
                      onClick={() => onStart(instance.id)}
                      isLoading={startingId === instance.id}
                      variant="success"
                      size="sm"
                      icon={<Play className="w-3.5 h-3.5" />}
                      className="flex-1"
                    >
                      {startingId === instance.id
                        ? t('serverCard.starting')
                        : t('serverCard.start')}
                    </Button>
                  )
                ) : (
                  <>
                    {hasPerm('servers.update') && (
                      <div className="flex flex-1 gap-1.5">
                        <Button
                          onClick={() => onStop(instance.id)}
                          isLoading={stoppingId === instance.id}
                          variant="ghost"
                          size="sm"
                          icon={<Square className="w-3 h-3 fill-current" />}
                          className="flex-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 border-red-500/20"
                        >
                          {stoppingId === instance.id
                            ? t('serverCard.stopping')
                            : t('serverCard.stop')}
                        </Button>
                        <IconButton
                          onClick={() => onRestart(instance.id)}
                          isLoading={restartingId === instance.id}
                          variant="ghost"
                          className="text-amber-500 hover:bg-amber-500/10 active:scale-95"
                          title={t('serverCard.restart')}
                        >
                          <RotateCcw
                            className={cn(
                              'w-4 h-4',
                              restartingId === instance.id && 'animate-spin'
                            )}
                          />
                        </IconButton>
                      </div>
                    )}
                  </>
                )}
                {hasPerm('servers.console') && (
                  <Button
                    onClick={() => onConsole(instance.id)}
                    variant="ghost"
                    size="sm"
                    icon={<Terminal className="w-3.5 h-3.5" />}
                    className="flex-1"
                  >
                    {t('serverCard.console')}
                  </Button>
                )}
              </>
            )}

            <IconButton
              onClick={() => onSettings(instance.id)}
              variant="ghost"
              title={t('serverCard.settings')}
            >
              <Settings className="w-3.5 h-3.5" />
            </IconButton>

            {hasPerm('servers.files') && (
              <IconButton
                onClick={() => onFiles(instance.id)}
                disabled={!instance.isInstalled}
                variant="ghost"
                title={t('serverCard.file_manager')}
              >
                <FileText className="w-3.5 h-3.5" />
              </IconButton>
            )}

            {hasPerm('servers.delete') && (
              <IconButton
                onClick={() => onDelete(instance.id)}
                isLoading={deletingId === instance.id}
                variant="ghost"
                className="text-red-500 hover:bg-red-500/10 border-red-500/20"
                title={t('serverCard.delete_server')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default ServerCard;
