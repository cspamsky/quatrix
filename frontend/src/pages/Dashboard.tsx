import { useState, useEffect } from 'react';
import {
    Card, Row, Col, Typography, Space, Progress, Statistic, Tag, List
} from 'antd';
import {
    DashboardOutlined,
    ThunderboltOutlined,
    HddOutlined,
    GlobalOutlined,
    FieldTimeOutlined,
    SafetyCertificateOutlined,
    PlayCircleOutlined,
    StopOutlined,
    CloudServerOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMonitorStore } from '../store/monitorStore';
import { serverService } from '../services/serverService';

const { Title, Text } = Typography;

function Dashboard() {
    const { t } = useTranslation();
    const { stats, isConnected, startMonitoring, stopMonitoring } = useMonitorStore();
    const [servers, setServers] = useState<any[]>([]);
    const [loadingServers, setLoadingServers] = useState(true);

    useEffect(() => {
        startMonitoring();
        fetchServers();

        // Refresh server counts every 30 seconds
        const interval = setInterval(fetchServers, 30000);

        return () => {
            stopMonitoring();
            clearInterval(interval);
        };
    }, []);

    const fetchServers = async () => {
        try {
            const response = await serverService.getMyServers();
            if (response.success) {
                setServers(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch servers for dashboard', error);
        } finally {
            setLoadingServers(false);
        }
    };

    const getStatusColor = (percent: number) => {
        if (percent < 60) return '#52c41a'; // Green
        if (percent < 85) return '#faad14'; // Orange
        return '#f5222d'; // Red
    };

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
    };

    return (
        <div style={{ width: '100%', height: 'auto' }}>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={2} style={{ margin: 0 }}>{t('nav.dashboard')}</Title>
                    <Tag color={isConnected ? 'success' : 'error'} style={{ padding: '4px 12px', borderRadius: '12px' }}>
                        {isConnected ? t('common.online') : t('common.offline')}
                    </Tag>
                </div>

                {/* Server Statistics Summary */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Card size="small" variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: 12 }}>
                            <Statistic
                                title={t('dashboard.totalServers')}
                                value={servers.length}
                                prefix={<CloudServerOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                                loading={loadingServers}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card size="small" variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: 12 }}>
                            <Statistic
                                title={t('dashboard.runningServers')}
                                value={servers.filter(s => s.status === 'RUNNING').length}
                                prefix={<PlayCircleOutlined />}
                                valueStyle={{ color: '#52c41a' }}
                                loading={loadingServers}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card size="small" variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: 12 }}>
                            <Statistic
                                title={t('dashboard.stoppedServers')}
                                value={servers.filter(s => s.status === 'STOPPED' || s.status === 'ERROR').length}
                                prefix={<StopOutlined />}
                                valueStyle={{ color: '#ff4d4f' }}
                                loading={loadingServers}
                            />
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ display: 'flex' }}>
                    {/* Combined System Resources - CPU, RAM, Disk */}
                    <Col xs={24} lg={16} style={{ display: 'flex' }}>
                        <Card
                            title={<Space size="small"><DashboardOutlined /> {t('resources.title')}</Space>}
                            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', width: '100%' }}
                            bodyStyle={{ padding: '16px 20px' }}
                            loading={!stats}
                        >
                            {stats && (
                                <Row gutter={[20, 0]}>
                                    <Col xs={24} md={12}>
                                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                                            {/* CPU Section */}
                                            <div>
                                                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                                    <Space size="small"><ThunderboltOutlined /> <Text strong style={{ fontSize: '13px' }}>{t('resources.cpu')}</Text></Space>
                                                    <Text style={{ fontSize: '13px' }}>{stats.cpu.load}%</Text>
                                                </Space>
                                                <Progress
                                                    percent={stats.cpu.load}
                                                    strokeColor={getStatusColor(stats.cpu.load)}
                                                    showInfo={false}
                                                    strokeLinecap="round"
                                                    size="small"
                                                />
                                            </div>

                                            {/* Memory Section */}
                                            <div style={{ marginTop: 4 }}>
                                                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                                    <Space size="small"><HddOutlined /> <Text strong style={{ fontSize: '13px' }}>{t('resources.memory')}</Text></Space>
                                                    <Text style={{ fontSize: '13px' }}>{stats.memory.percentage}%</Text>
                                                </Space>
                                                <Progress
                                                    percent={stats.memory.percentage}
                                                    strokeColor={getStatusColor(stats.memory.percentage)}
                                                    showInfo={false}
                                                    strokeLinecap="round"
                                                    size="small"
                                                />
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                                        {t('resources.used')}: {(stats.memory.used / 1024 / 1024 / 1024).toFixed(1)} GB
                                                    </Text>
                                                </div>
                                            </div>

                                            {/* Uptime Section */}
                                            <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: 8, marginTop: 8 }}>
                                                <Statistic
                                                    title={<Text type="secondary" style={{ fontSize: '12px' }}><FieldTimeOutlined /> {t('resources.uptime')}</Text>}
                                                    value={formatUptime(stats.uptime)}
                                                    valueStyle={{ fontSize: '15px', fontWeight: 'bold' }}
                                                />
                                            </div>
                                        </Space>
                                    </Col>

                                    <Col xs={24} md={12}>
                                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                                            {/* Disk/Storage Section */}
                                            <div>
                                                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                                    <Space size="small"><HddOutlined /> <Text strong style={{ fontSize: '13px' }}>{t('resources.diskUsage')}</Text></Space>
                                                    <Text style={{ fontSize: '13px' }}>{stats.disk.percentage}%</Text>
                                                </Space>
                                                <Progress
                                                    percent={stats.disk.percentage}
                                                    strokeColor={getStatusColor(stats.disk.percentage)}
                                                    showInfo={false}
                                                    strokeLinecap="round"
                                                    size="small"
                                                />
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                                        {t('resources.total')}: {(stats.disk.total / 1024 / 1024 / 1024).toFixed(1)} GB
                                                    </Text>
                                                </div>
                                            </div>

                                            <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: 8, marginTop: 32 }}>
                                                <Statistic
                                                    title={<Text type="secondary" style={{ fontSize: '12px' }}><SafetyCertificateOutlined /> {t('resources.freeSpace')}</Text>}
                                                    value={((stats.disk.total - stats.disk.used) / 1024 / 1024 / 1024).toFixed(1)}
                                                    suffix="GB"
                                                    valueStyle={{ fontSize: '15px', fontWeight: 'bold' }}
                                                />
                                            </div>
                                        </Space>
                                    </Col>
                                </Row>
                            )}
                        </Card>
                    </Col>

                    {/* Used Ports - Matched height scrollable */}
                    <Col xs={24} lg={8} style={{ display: 'flex' }}>
                        <Card
                            title={<Space size="small"><GlobalOutlined /> {t('resources.usedPorts')}</Space>}
                            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', width: '100%', display: 'flex', flexDirection: 'column' }}
                            bodyStyle={{ flex: 1, overflow: 'hidden', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}
                            loading={!stats}
                        >
                            <style>{`
                                .custom-scrollbar::-webkit-scrollbar {
                                    width: 4px;
                                }
                                .custom-scrollbar::-webkit-scrollbar-track {
                                    background: transparent;
                                }
                                .custom-scrollbar::-webkit-scrollbar-thumb {
                                    background: rgba(0,0,0,0.1);
                                    border-radius: 10px;
                                }
                                .port-item {
                                    display: flex;
                                    align-items: center;
                                    justify-content: space-between;
                                    padding: 8px 12px;
                                    background: rgba(24, 144, 255, 0.04);
                                    border-radius: 10px;
                                    margin-bottom: 8px;
                                    border: 1px solid rgba(24, 144, 255, 0.08);
                                    transition: all 0.2s ease;
                                }
                                .port-item:hover {
                                    background: rgba(24, 144, 255, 0.08);
                                    border-color: rgba(24, 144, 255, 0.2);
                                    transform: translateX(3px);
                                }
                            `}</style>
                            {stats && (
                                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', maxHeight: '200px' }} className="custom-scrollbar">
                                    <List
                                        dataSource={stats.network?.usedPorts || []}
                                        renderItem={port => (
                                            <div className="port-item">
                                                <Space size="small">
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1890ff' }} />
                                                    <Text strong style={{ fontSize: '14px' }}>{port}</Text>
                                                </Space>
                                                <Tag color="blue" style={{ borderRadius: '4px', margin: 0, fontSize: '11px' }}>Active</Tag>
                                            </div>
                                        )}
                                        locale={{ emptyText: t('resources.noPorts') }}
                                    />
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
            </Space>
        </div>
    );
}

export default Dashboard;
