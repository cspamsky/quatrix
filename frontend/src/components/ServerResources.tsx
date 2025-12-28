import React, { useEffect } from 'react';
import { Card, Progress, Statistic, Skeleton, Space, Typography } from 'antd';
import { useMonitorStore } from '../store/monitorStore';
import {
    DashboardOutlined,
    HddOutlined,
    ThunderboltOutlined,
    FieldTimeOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const ServerResources: React.FC = () => {
    const { stats, startMonitoring, stopMonitoring, isConnected } = useMonitorStore();

    useEffect(() => {
        startMonitoring();
        return () => stopMonitoring();
    }, []);

    if (!stats) {
        return (
            <Card title={<Space><DashboardOutlined /> System Resources</Space>}>
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
        return `${d}d ${h}h ${m}m`;
    };

    return (
        <Card
            title={<Space><DashboardOutlined /> System Resources</Space>}
            extra={isConnected ? <Text type="success">● API Online</Text> : <Text type="danger">● Disconnected</Text>}
            style={{ height: '100%', borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="large">

                {/* CPU Section */}
                <div>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space><ThunderboltOutlined /> <Text strong>CPU Load</Text></Space>
                        <Text>{cpu.load}%</Text>
                    </Space>
                    <Progress
                        percent={cpu.load}
                        strokeColor={getStatusColor(cpu.load)}
                        showInfo={false}
                        strokeLinecap="round"
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {cpu.cores.length} Cores Active
                    </Text>
                </div>

                {/* Memory Section */}
                <div>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space><HddOutlined /> <Text strong>Memory</Text></Space>
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
                            Used: {(memory.used / 1024 / 1024 / 1024).toFixed(2)} GB
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            Total: {(memory.total / 1024 / 1024 / 1024).toFixed(2)} GB
                        </Text>
                    </Space>
                </div>

                {/* Disk Section */}
                <div>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space><HddOutlined /> <Text strong>Storage (Main)</Text></Space>
                        <Text>{disk.percentage}%</Text>
                    </Space>
                    <Progress
                        percent={disk.percentage}
                        strokeColor={getStatusColor(disk.percentage)}
                        showInfo={false}
                        strokeLinecap="round"
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        Free: {((disk.total - disk.used) / 1024 / 1024 / 1024).toFixed(2)} GB
                    </Text>
                </div>

                {/* Uptime Section */}
                <div style={{ marginTop: 8, padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                    <Statistic
                        title={<Space><FieldTimeOutlined /> System Uptime</Space>}
                        value={formatUptime(uptime)}
                        valueStyle={{ fontSize: '18px', fontWeight: 'bold' }}
                    />
                </div>

            </Space>
        </Card>
    );
};

export default ServerResources;
