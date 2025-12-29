import { useState, useEffect, useCallback } from 'react';
import { Card, Select, Typography, Space, Input, Button, Alert, List, Table, Tag, Modal, Form, InputNumber, Popconfirm, Tooltip, Tabs, App } from 'antd';
import {
    SendOutlined,
    LinkOutlined,
    DisconnectOutlined,
    ClearOutlined,
    UserOutlined,
    ReloadOutlined,
    UserDeleteOutlined,
    StopOutlined,
    CodeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { serverService } from '../services/serverService';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface CommandHistory {
    command: string;
    response: string;
    timestamp: Date;
}

interface Player {
    index: string;
    id: string;
    name: string;
    steamId: string;
    connected: string;
    ping: string;
    loss: string;
    state: string;
    address: string;
}

function Rcon() {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const [servers, setServers] = useState<any[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [command, setCommand] = useState('');
    const [history, setHistory] = useState<CommandHistory[]>([]);
    const [rconPassword, setRconPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [activeTab, setActiveTab] = useState('console');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const fetchServers = async () => {
        setLoading(true);
        try {
            const response = await serverService.getMyServers();
            if (response.success) {
                const runningServers = response.data.filter((s: any) => s.status === 'RUNNING');
                setServers(runningServers);
                if (runningServers.length > 0 && !selectedServer) {
                    setSelectedServer(runningServers[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching servers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlayers = useCallback(async () => {
        if (!selectedServer || !connected) return;
        setLoadingPlayers(true);
        try {
            const response = await axios.get(`${API_URL}/api/rcon/${selectedServer}/players`);
            if (response.data.success) {
                setPlayers(response.data.players);
            }
        } catch (error) {
            console.error('Error fetching players:', error);
        } finally {
            setLoadingPlayers(false);
        }
    }, [selectedServer, connected, API_URL]);

    useEffect(() => {
        fetchServers();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (connected && activeTab === 'players') {
            fetchPlayers();
            interval = setInterval(fetchPlayers, 10000); // Auto refresh every 10s
        }
        return () => clearInterval(interval);
    }, [connected, activeTab, fetchPlayers]);

    const handleConnect = async () => {
        if (!selectedServer || !rconPassword) {
            setError(t('common.required'));
            return;
        }

        setConnecting(true);
        setError(null);

        try {
            const server = servers.find(s => s.id === selectedServer);
            await axios.post(`${API_URL}/api/rcon/${selectedServer}/connect`, {
                host: '127.0.0.1',
                port: server.port,
                password: rconPassword,
            });
            setConnected(true);
            setHistory([{
                command: '[SYSTEM]',
                response: 'RCON bağlantısı başarılı',
                timestamp: new Date(),
            }]);
        } catch (error: any) {
            setError(error.response?.data?.error || 'Bağlantı başarısız');
            setConnected(false);
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!selectedServer) return;

        try {
            await axios.post(`${API_URL}/api/rcon/${selectedServer}/disconnect`);
            setConnected(false);
            setHistory([...history, {
                command: '[SYSTEM]',
                response: 'RCON bağlantısı kesildi',
                timestamp: new Date(),
            }]);
        } catch (error: any) {
            setError(error.response?.data?.error || 'Bağlantı kesme başarısız');
        }
    };

    const handleExecute = async (cmdOverride?: string) => {
        const cmdToRun = cmdOverride || command.trim();
        if (!selectedServer || !cmdToRun) return;

        try {
            const response = await axios.post(`${API_URL}/api/rcon/${selectedServer}/execute`, {
                command: cmdToRun,
            });

            message.success(t('rcon.command_sent'));
            setHistory(prev => [...prev, {
                command: cmdToRun,
                response: response.data.response || 'Komut çalıştırıldı',
                timestamp: new Date(),
            }]);
            if (!cmdOverride) setCommand('');
        } catch (error: any) {
            message.error(error.response?.data?.error || 'Komut çalıştırılamadı');
        }
    };

    const handleKick = async (id: string, name: string) => {
        try {
            await axios.post(`${API_URL}/api/rcon/${selectedServer}/kick`, {
                userId: id,
                reason: 'Kicked by Admin'
            });
            Modal.success({ title: t('common.success'), content: `${name} kicked.` });
            fetchPlayers();
        } catch (error: any) {
            Modal.error({ title: t('common.error'), content: error.message });
        }
    };

    const handleBan = (id: string, name: string) => {
        Modal.confirm({
            title: t('rcon.confirm_ban'),
            content: (
                <div style={{ marginTop: 16 }}>
                    <Text>{name} (ID: {id}) için yasaklama süresi:</Text>
                    <Form layout="vertical" style={{ marginTop: 16 }}>
                        <Form.Item label={t('rcon.ban_minutes')}>
                            <InputNumber defaultValue={0} min={0} style={{ width: '100%' }} id="ban-minutes-input" />
                        </Form.Item>
                    </Form>
                </div>
            ),
            onOk: async () => {
                const input = document.getElementById('ban-minutes-input') as HTMLInputElement;
                const minutes = input?.value || '0';
                try {
                    await axios.post(`${API_URL}/api/rcon/${selectedServer}/ban`, {
                        userId: id,
                        minutes: parseInt(minutes),
                        reason: 'Banned by Admin'
                    });
                    Modal.success({ title: t('common.success'), content: `${name} banned.` });
                    fetchPlayers();
                } catch (error: any) {
                    Modal.error({ title: t('common.error'), content: error.message });
                }
            }
        });
    };

    const playerColumns = [
        { title: '#', dataIndex: 'index', key: 'index', width: 50 },
        { title: t('rcon.player_id'), dataIndex: 'id', key: 'id', width: 60 },
        {
            title: t('rcon.player_name'),
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: t('rcon.player_steamid'),
            dataIndex: 'steamId',
            key: 'steamId',
            render: (text: string) => <Tag color="blue">{text}</Tag>
        },
        {
            title: t('rcon.player_ping'),
            dataIndex: 'ping',
            key: 'ping',
            render: (ping: string) => {
                const p = parseInt(ping);
                let color = 'green';
                if (p > 100) color = 'orange';
                if (p > 200) color = 'red';
                return <Tag color={color}>{ping}ms</Tag>;
            }
        },
        {
            title: t('rcon.player_actions'),
            key: 'actions',
            width: 150,
            render: (_: any, record: Player) => (
                <Space>
                    <Tooltip title={t('rcon.kick')}>
                        <Popconfirm
                            title={t('rcon.confirm_kick')}
                            onConfirm={() => handleKick(record.id, record.name)}
                        >
                            <Button size="small" danger icon={<UserDeleteOutlined />} />
                        </Popconfirm>
                    </Tooltip>
                    <Tooltip title={t('rcon.ban')}>
                        <Button size="small" danger type="primary" icon={<StopOutlined />} onClick={() => handleBan(record.id, record.name)} />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }}>{t('nav.rcon')}</Title>
                <div style={{ display: 'flex', gap: 16 }}>
                    <Select
                        style={{ width: 300 }}
                        placeholder={t('dashboard.map_placeholder')}
                        value={selectedServer}
                        onChange={(value) => {
                            setSelectedServer(value);
                            setConnected(false);
                            setHistory([]);
                        }}
                        loading={loading}
                        options={servers.map(server => ({
                            value: server.id,
                            label: `${server.name} - ${server.port}`,
                        }))}
                    />
                    {connected && (
                        <Button
                            danger
                            icon={<DisconnectOutlined />}
                            onClick={handleDisconnect}
                        >
                            {t('rcon.back_to_console')}
                        </Button>
                    )}
                </div>
            </div>

            {error && (
                <Alert
                    message={t('common.error')}
                    description={error}
                    type="error"
                    closable
                    onClose={() => setError(null)}
                />
            )}

            {!connected ? (
                <Card bordered={false} className="glass-card">
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <div>
                            <Text strong>{t('common.password')}</Text>
                            <Input.Password
                                placeholder={t('common.password')}
                                value={rconPassword}
                                onChange={(e) => setRconPassword(e.target.value)}
                                onPressEnter={handleConnect}
                                style={{ marginTop: 8 }}
                                prefix={<LinkOutlined />}
                            />
                        </div>
                        <Button
                            type="primary"
                            icon={<LinkOutlined />}
                            onClick={handleConnect}
                            loading={connecting}
                            disabled={!selectedServer || !rconPassword}
                            block
                            size="large"
                        >
                            {t('common.login')}
                        </Button>
                    </Space>
                </Card>
            ) : (
                <Card
                    bordered={false}
                    className="glass-card"
                    bodyStyle={{ padding: 0 }}
                >
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        style={{ padding: '0 24px' }}
                        items={[
                            {
                                key: 'console',
                                label: <span><CodeOutlined /> {t('server.console')}</span>,
                                children: (
                                    <div style={{ padding: '16px 0 24px 0' }}>
                                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                            <div
                                                style={{
                                                    background: '#141414',
                                                    padding: '16px',
                                                    borderRadius: '8px',
                                                    height: '450px',
                                                    overflowY: 'auto',
                                                    fontFamily: '"Fira Code", monospace',
                                                    border: '1px solid #303030'
                                                }}
                                            >
                                                {history.length === 0 ? (
                                                    <div style={{ textAlign: 'center', marginTop: 180 }}>
                                                        <Text style={{ color: '#444' }}>{t('common.loading')}</Text>
                                                    </div>
                                                ) : (
                                                    <List
                                                        split={false}
                                                        dataSource={history}
                                                        renderItem={(item) => (
                                                            <div style={{ marginBottom: '8px' }}>
                                                                <div style={{ borderBottom: '1px solid #222', paddingBottom: 2, marginBottom: 4 }}>
                                                                    <Text style={{ color: '#569cd6', fontSize: '11px' }}>
                                                                        [{item.timestamp.toLocaleTimeString()}]
                                                                    </Text>
                                                                    <Text style={{ color: '#4ec9b0', marginLeft: 8, fontSize: '12px' }}>
                                                                        &gt; {item.command}
                                                                    </Text>
                                                                </div>
                                                                <pre
                                                                    style={{
                                                                        color: '#d4d4d4',
                                                                        margin: 0,
                                                                        whiteSpace: 'pre-wrap',
                                                                        wordBreak: 'break-word',
                                                                        fontSize: '13px'
                                                                    }}
                                                                >
                                                                    {item.response}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    />
                                                )}
                                            </div>

                                            <Space.Compact style={{ width: '100%' }}>
                                                <Input
                                                    placeholder="status, say, kick, maps..."
                                                    value={command}
                                                    onChange={(e) => setCommand(e.target.value)}
                                                    onPressEnter={() => handleExecute()}
                                                    size="large"
                                                />
                                                <Button
                                                    type="primary"
                                                    icon={<SendOutlined />}
                                                    onClick={() => handleExecute()}
                                                    disabled={!command.trim()}
                                                    size="large"
                                                >
                                                    {t('common.actions')}
                                                </Button>
                                            </Space.Compact>

                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <Button size="small" onClick={() => handleExecute('status')}>status</Button>
                                                <Button size="small" onClick={() => handleExecute('maps *')}>maps *</Button>
                                                <Button size="small" onClick={() => handleExecute('stats')}>stats</Button>
                                                <Button size="small" onClick={() => handleExecute('mp_restartgame 1')}>mp_restartgame 1</Button>
                                                <Button size="small" icon={<ClearOutlined />} onClick={() => setHistory([])}>{t('common.refresh')}</Button>
                                            </div>
                                        </Space>
                                    </div>
                                )
                            },
                            {
                                key: 'players',
                                label: <span><UserOutlined /> {t('rcon.players')}</span>,
                                children: (
                                    <div style={{ padding: '16px 0 24px 0' }}>
                                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                icon={<ReloadOutlined />}
                                                onClick={fetchPlayers}
                                                loading={loadingPlayers}
                                            >
                                                {t('rcon.refresh_players')}
                                            </Button>
                                        </div>
                                        <Table
                                            columns={playerColumns}
                                            dataSource={players}
                                            rowKey="id"
                                            pagination={false}
                                            loading={loadingPlayers}
                                        />
                                    </div>
                                )
                            }
                        ]}
                    />
                </Card>
            )}
        </Space>
    );
}

export default Rcon;
