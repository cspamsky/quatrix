import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/date';
import { RefreshCcw, Info, Cpu, Database, Globe, HardDrive } from 'lucide-react';

interface AnalyticsData {
  timestamp: string;
  cpu: number;
  ram: number;
  net_in: number;
  net_out: number;
  disk_read: number;
  disk_write: number;
}

const Analytics = () => {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState('24h');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    data: stats,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<AnalyticsData[]>({
    queryKey: ['analytics', range],
    queryFn: async () => {
      const response = await apiFetch(`/api/analytics?range=${range}`);
      return response.json();
    },
  });

  const chartData = (stats || []).map((item) => ({
    ...item,
    time: formatDate(item.timestamp, t('common.date_formats.long'), i18n.language),
  }));

  interface ChartPayloadEntry {
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: AnalyticsData;
  }

  const calculateStats = (data: AnalyticsData[]) => {
    if (!data.length) return null;
    const cpuArr = data.map((d) => d.cpu);
    const ramArr = data.map((d) => d.ram);
    const netArr = data.map((d) => d.net_in + (d.net_out || 0));
    const diskArr = data.map((d) => d.disk_read + (d.disk_write || 0));

    return {
      avgCpu: cpuArr.reduce((a, b) => a + b, 0) / data.length,
      peakCpu: Math.max(...cpuArr),
      avgRam: ramArr.reduce((a, b) => a + b, 0) / data.length,
      peakRam: Math.max(...ramArr),
      peakNet: Math.max(...netArr),
      peakDisk: Math.max(...diskArr),
    };
  };

  const summary = calculateStats(stats || []);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: ChartPayloadEntry[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f172a]/90 border border-gray-700 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-xs font-bold text-gray-400 mb-3 border-b border-gray-700/50 pb-2">
            {label}
          </p>
          <div className="grid grid-cols-1 gap-2 min-w-[180px]">
            {payload.map((entry, index: number) => (
              <div key={index} className="flex items-center justify-between gap-6 py-0.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tight">
                    {entry.name}
                  </span>
                </div>
                <span className="text-xs font-black text-white font-mono">
                  {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}{' '}
                  {[
                    t('analytics.cpu'),
                    t('analytics.ram'),
                    t('analytics.peak_cpu'),
                    t('analytics.peak_ram'),
                    'CPU',
                    'RAM',
                  ].includes(entry.name)
                    ? '%'
                    : 'MB/s'}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const SummaryCard = ({ title, value, unit, icon: Icon, colorClass }: any) => (
    <div className="bg-[#111827]/40 backdrop-blur-xl p-5 rounded-2xl border border-gray-800/30 flex items-center justify-between group hover:border-primary/20 transition-all duration-500">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-white group-hover:text-primary transition-colors">
            {value}
          </span>
          <span className="text-[10px] font-bold text-gray-600 uppercase leading-none">{unit}</span>
        </div>
      </div>
      <div className={`p-2.5 rounded-xl bg-gray-900/50 border border-gray-800/50 ${colorClass}`}>
        <Icon size={18} />
      </div>
    </div>
  );

  return (
    <div className="w-full p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {t('nav.analytics') || 'System Analytics'}
          </h1>
          <p className="text-gray-400 font-medium text-sm">
            {t('analytics.subtitle') ||
              'Historical system performance and resource utilization insights'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#111827]/80 p-1 rounded-xl border border-gray-800/50">
          {['24h', '7d', '30d'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all uppercase tracking-tight ${
                range === r ? 'bg-primary text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-800 mx-1"></div>
          <button
            onClick={() => refetch()}
            className={`p-1.5 text-gray-500 hover:text-white transition-all ${isFetching ? 'text-primary' : ''}`}
            title={t('common.refresh')}
          >
            <RefreshCcw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-in fade-in slide-in-from-top-4 duration-700 delay-200">
        <SummaryCard
          title={t('analytics.avg_cpu')}
          value={summary?.avgCpu.toFixed(1) || '0.0'}
          unit="%"
          icon={Cpu}
          colorClass="text-blue-500"
        />
        <SummaryCard
          title={t('analytics.peak_cpu')}
          value={summary?.peakCpu.toFixed(1) || '0.0'}
          unit="%"
          icon={Cpu}
          colorClass="text-blue-400"
        />
        <SummaryCard
          title={t('analytics.avg_ram')}
          value={summary?.avgRam.toFixed(1) || '0.0'}
          unit="%"
          icon={Database}
          colorClass="text-purple-500"
        />
        <SummaryCard
          title={t('analytics.peak_ram')}
          value={summary?.peakRam.toFixed(1) || '0.0'}
          unit="%"
          icon={Database}
          colorClass="text-purple-400"
        />
        <SummaryCard
          title={t('analytics.peak_net')}
          value={summary?.peakNet.toFixed(1) || '0.0'}
          unit="MB/s"
          icon={Globe}
          colorClass="text-green-500"
        />
        <SummaryCard
          title={t('analytics.peak_disk')}
          value={summary?.peakDisk.toFixed(1) || '0.0'}
          unit="MB/s"
          icon={HardDrive}
          colorClass="text-orange-500"
        />
      </div>

      <div className="bg-[#111827] p-8 rounded-2xl border border-gray-800 shadow-xl min-h-[600px] flex flex-col">
        <div className="flex items-center gap-2 mb-8 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 max-w-fit">
          <Info size={16} className="text-blue-500" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {t('analytics.unified_message', {
              defaultValue: 'All metrics are unified in a single high-fidelity timeframe.',
            })}
          </p>
        </div>

        <div className="flex-1 w-full h-[500px] relative">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCcw size={32} className="text-primary animate-spin" />
            </div>
          ) : chartData.length > 0 ? (
            <div className="absolute inset-0">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="#4b5563"
                      fontSize={10}
                      tickMargin={10}
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="#4b5563" fontSize={10} tickMargin={10} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="circle"
                      wrapperStyle={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    />
                    <Line
                      name={t('analytics.cpu')}
                      type="monotone"
                      dataKey="cpu"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                    <Line
                      name={t('analytics.ram')}
                      type="monotone"
                      dataKey="ram"
                      stroke="#a855f7"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                    <Line
                      name={t('analytics.net_in')}
                      type="monotone"
                      dataKey="net_in"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                    <Line
                      name={t('analytics.net_out')}
                      type="monotone"
                      dataKey="net_out"
                      stroke="#4ade80"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                    <Line
                      name={t('analytics.disk_read')}
                      type="monotone"
                      dataKey="disk_read"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                    <Line
                      name={t('analytics.disk_write')}
                      type="monotone"
                      dataKey="disk_write"
                      stroke="#fbbf24"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4">
              <Info size={48} />
              <p className="text-sm font-bold uppercase tracking-widest text-center">
                {t('analytics.no_data_title', {
                  defaultValue: 'No analytics data collected yet.',
                })}
                <br />
                <span className="text-[10px] text-gray-700">
                  {t('analytics.no_data_desc', {
                    defaultValue: 'Data snapshots are taken every 5 minutes.',
                  })}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
