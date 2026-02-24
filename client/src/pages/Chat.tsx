import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../utils/socket';
import { apiFetch } from '../utils/api';
import { MessageSquare, User, Clock, Hash, RefreshCw, Server, Calendar, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/date';
import { useSteamAvatars } from '../hooks/useSteamAvatars';
import CustomSelect from '../components/ui/CustomSelect';
import SearchInput from '../components/ui/SearchInput';
import IconButton from '../components/ui/IconButton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatLog {
  id: number;
  server_id: number;
  player_name: string;
  steam_id: string;
  message: string;
  type: string;
  created_at: string;
}

interface ServerInfo {
  id: number;
  status: string;
  name: string;
  port: number;
}

const Chat = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [allServers, setAllServers] = useState<ServerInfo[]>([]);
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollHeight = useRef<number>(0);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const response = await apiFetch(`/api/servers`);
        const data = await response.json();
        setAllServers(data);

        if (id) {
          // Verify server exists
          data.find((s: ServerInfo) => s.id.toString() === id);
        } else if (data.length > 0) {
          // If no ID, but servers exist, redirect to first server's chat
          navigate(`/chat/${data[0].id}`, { replace: true });
        }
      } catch (error) {
        console.error('Failed to fetch servers:', error);
      }
    };

    fetchServers();

    if (!id) return;

    setOffset(0);
    setHasMore(true);
    setChatLogs([]); // Clear logs on server change to avoid confusion
    fetchChatHistory(0, true);

    // Socket.IO for real-time chat
    socket.on(
      'chat_message',
      (msg: {
        serverId: string;
        name: string;
        steamId: string;
        message: string;
        type: string;
        timestamp: string;
      }) => {
        if (msg.serverId.toString() === id) {
          setChatLogs((prev) => [
            ...prev,
            {
              id: Date.now(), // Local ID for key
              server_id: parseInt(msg.serverId),
              player_name: msg.name,
              steam_id: msg.steamId,
              message: msg.message,
              type: msg.type,
              created_at: msg.timestamp,
            },
          ]);

          // Only scroll if was at bottom or it's our own message? (simple auto-scroll check)
          if (isAutoScroll) {
            setTimeout(scrollToBottom, 50);
          }
        }
      }
    );

    return () => {
      socket.off('chat_message');
    };
  }, [id]);

  // Scroll detection
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

    // Check if at bottom (with 50px tolerance)
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAutoScroll(atBottom);

    // Initial infinite scroll trigger if near top
    if (scrollTop < 100 && !isLoading && hasMore) {
      loadMore();
    }
  };

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchChatHistory = async (newOffset = 0, isInitial = false) => {
    if (!id) return;
    setIsLoading(true);
    try {
      const limit = 50;
      let url = `/api/chat/${id}?limit=${limit}&offset=${newOffset}`;
      if (startDate) url += `&startDate=${startDate} 00:00:00`;
      if (endDate) url += `&endDate=${endDate} 23:59:59`;

      const response = await apiFetch(url);
      if (response.ok) {
        const data = await response.json();

        // Sort Oldest -> Newest (API returns newest first DESC)
        const sorted = data.sort(
          (a: ChatLog, b: ChatLog) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        if (isInitial) {
          setChatLogs(sorted);
          setTimeout(scrollToBottom, 50);
        } else if (sorted.length > 0) {
          // Adjust scroll to maintain position when loading older messages
          if (chatContainerRef.current) {
            lastScrollHeight.current = chatContainerRef.current.scrollHeight;
          }

          setChatLogs((prev) => [...sorted, ...prev]);

          // Keep scroll position relative to the content we just loaded
          setTimeout(() => {
            if (chatContainerRef.current) {
              const newScrollHeight = chatContainerRef.current.scrollHeight;
              chatContainerRef.current.scrollTop = newScrollHeight - lastScrollHeight.current;
            }
          }, 0);
        }

        if (data.length < limit) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!hasMore || isLoading) return;
    const nextOffset = offset + 50;
    setOffset(nextOffset);
    fetchChatHistory(nextOffset);
  };

  const getTypeColor = (type: string) => {
    return type === 'say_team'
      ? 'text-emerald-400 bg-emerald-400/10'
      : 'text-primary bg-primary/10';
  };

  const filteredLogs = chatLogs.filter(
    (log) =>
      (log.player_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.message?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.steam_id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // No auto-useEffect scroll here, it's handled in fetchChatHistory and socket listener

  // Collect unique SteamIDs for avatar fetching
  const uniqueSteamIds = Array.from(new Set(filteredLogs.map((log) => log.steam_id)));
  const { data: avatars = {} } = useSteamAvatars(uniqueSteamIds);

  return (
    <div className="flex flex-col h-full overflow-hidden font-display">
      {/* Header */}
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 shrink-0 z-10 relative">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{t('chat.title')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('chat.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-[#0d1421] border border-gray-800 rounded-lg px-3 py-1.5 h-10">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-white border-none focus:ring-0 w-28 uppercase"
              title={t('chat.filter_by_date')}
            />
            <span className="text-gray-600">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-white border-none focus:ring-0 w-28 uppercase"
              title={t('chat.filter_by_date')}
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="ml-1 text-gray-500 hover:text-red-400 transition-colors"
                title={t('chat.clear_filter')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <SearchInput
            placeholder={t('chat.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            containerClassName="w-64"
          />

          <div className="flex flex-col items-end">
            <div className="relative">
              <CustomSelect
                options={allServers.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.port})`,
                }))}
                value={id ? parseInt(id) : ''}
                onChange={(val) => navigate(`/chat/${val}`)}
                placeholder={t('chat.select_server')}
                icon={<Server className="w-4 h-4" />}
                size="sm"
                className="min-w-[200px]"
              />
            </div>
          </div>

          <IconButton
            onClick={() => {
              setOffset(0);
              fetchChatHistory(0, true);
            }}
            isLoading={isLoading}
          >
            <RefreshCw
              className={cn(
                'w-4 h-4 transition-transform duration-500 group-active:rotate-180',
                isLoading && 'animate-spin text-primary'
              )}
            />
          </IconButton>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 pb-6 gap-6">
        <div className="flex-1 bg-[#0d1421] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div
            className="overflow-y-auto flex-1 p-4 flex flex-col custom-scrollbar"
            ref={chatContainerRef}
            onScroll={handleScroll}
          >
            <div className="space-y-4 pb-2">
              {hasMore && !searchTerm && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="text-xs text-gray-500 hover:text-primary transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-800 hover:border-gray-700 bg-gray-900/50"
                  >
                    {isLoading ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Clock size={12} />
                    )}
                    {t('chat.load_more', { defaultValue: 'Load Older Messages' })}
                  </button>
                </div>
              )}
              {filteredLogs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-800/20 flex items-center justify-center">
                    <MessageSquare size={32} />
                  </div>
                  <p className="text-sm font-medium">
                    {searchTerm ? t('chat.no_messages') : t('chat.no_history')}
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="group animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-gray-800">
                      {/* Avatar placeholder */}
                      <div
                        onClick={() => setSearchTerm(log.player_name)}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shrink-0 border border-gray-700 group-hover:border-primary/50 transition-colors cursor-pointer hover:scale-105 active:scale-95 overflow-hidden"
                        title={t('chat.filter_by_user')}
                      >
                        {avatars[log.steam_id] ? (
                          <img
                            src={avatars[log.steam_id]}
                            alt={log.player_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="text-gray-400 w-5 h-5 group-hover:text-primary transition-colors" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            onClick={() => setSearchTerm(log.player_name)}
                            className="font-bold text-slate-200 truncate max-w-[200px] cursor-pointer hover:text-primary hover:underline underline-offset-2 transition-all"
                            title={t('chat.filter_by_user')}
                          >
                            {log.player_name}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${getTypeColor(log.type)}`}
                          >
                            {log.type === 'say_team' ? t('chat.team') : t('chat.all')}
                          </span>
                          <span className="text-[11px] text-gray-500 font-mono mt-0.5 ml-auto">
                            {formatDate(
                              log.created_at,
                              t('common.date_formats.time'),
                              i18n.language
                            )}
                          </span>
                        </div>

                        <p className="text-slate-300 text-sm leading-relaxed break-words bg-[#111827]/50 p-2.5 rounded-lg border border-gray-800/50">
                          {log.message}
                        </p>

                        <div className="mt-2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-primary transition-colors cursor-help">
                            <Clock size={12} />
                            {formatDate(
                              log.created_at,
                              t('common.date_formats.short'),
                              i18n.language
                            )}
                          </div>
                          <div
                            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-primary transition-colors cursor-copy"
                            onClick={() => navigator.clipboard.writeText(log.steam_id)}
                          >
                            <Hash size={12} />
                            {log.steam_id}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
