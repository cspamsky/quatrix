import React, { useEffect } from 'react';
import { Card, Progress, Statistic, Skeleton, Space, Typography } from 'antd';
import { useMonitorStore } from '../store/monitorStore';
import { useTranslation } from 'react-i18next';
import {
    DashboardOutlined,
    HddOutlined,
    ThunderboltOutlined,
    FieldTimeOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const ServerResources: React.FC = () => {
    const { t } = useTranslation();
    const { stats, startMonitoring, stopMonitoring, isConnected } = useMonitorStore();

    useEffect(() => {
        startMonitoring();
        return () => stopMonitoring();
    }, []);

    if (!stats) {
        return (
            <Card title={<Space><DashboardOutlined /> {t('resources.title')}</Space>}>
                <Skeleton active />
            </Card>
        );
    }

    const { cpu, memory, disk, uptime } = stats;

    const getStatusColor = (percent: number) => {
        if (percent < 60) return '#52c41a'; // Green
        if (percent < 85) return '#faad14'; // Orange
        return '#f5222d'; // Red
    };

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${d}${t('resources.days')} ${h}${t('resources.hours')} ${m}${t('resources.minutes')}`;
    };

    return (
        <Card
            title={<Space><DashboardOutlined /> {t('resources.title')}</Space>}
            extra={isConnected ? <Text type="success">● API {t('common.online')}</Text> : <Text type="danger">● {t('common.disconnected')}</Text>}
            style={{ height: '100%', borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="large">

                {/* CPU Section */}
                <div>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space><ThunderboltOutlined /> <Text strong>{t('resources.cpu')}</Text></Space>
                        <Text>{cpu.load}%</Text>
                    </Space>
                    <Progress
                        percent={cpu.load}
                        strokeColor={getStatusColor(cpu.load)}
                        showInfo={false}
                        strokeLinecap="round"
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {cpu.cores.length} {t('resources.coresActive')}
                    </Text>
                </div>

                {/* Memory Section */}
                <div>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space><HddOutlined /> <Text strong>{t('resources.memory')}</Text></Space>
                        <Text>{memory.percentage}%</Text>
                    </Space>
                    <Progress
                        percent={memory.percentage}
                        strokeColor={getStatusColor(memory.percentage)}
                        showInfo={false}
                        strokeLinecap="round"
                    />
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {t('resources.used')}: {(memory.used / 1024 / 1024 / 1024).toFixed(2)} GB
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {t('resources.total')}: {(memory.total / 1024 / 1024 / 1024).toFixed(2)} GB
                        </Text>
                    </Space>
                </div>

                {/* Disk Section */}
                <div>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space><HddOutlined /> <Text strong>{t('resources.disk')}</Text></Space>
                        <Text>{disk.percentage}%</Text>
                    </Space>
                    <Progress
                        percent={disk.percentage}
                        strokeColor={getStatusColor(disk.percentage)}
                        showInfo={false}
                        strokeLinecap="round"
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {t('resources.free')}: {((disk.total - disk.used) / 1024 / 1024 / 1024).toFixed(2)} GB
                    </Text>
                </div>

                {/* Uptime Section */}
                <div style={{ marginTop: 8, padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                    <Statistic
                        title={<Space><FieldTimeOutlined /> {t('resources.uptime')}</Space>}
                        value={formatUptime(uptime)}
                        valueStyle={{ fontSize: '18px', fontWeight: 'bold' }}
                    />
                </div>

            </Space>
        </Card>
    );
};

export default ServerResources;
