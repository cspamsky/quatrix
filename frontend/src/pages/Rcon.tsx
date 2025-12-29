import { useState, useEffect } from 'react';
import { Card, Select, Typography, Space, Input, Button, Alert, List } from 'antd';
import { SendOutlined, LinkOutlined, DisconnectOutlined, ClearOutlined } from '@ant-design/icons';
import axios from 'axios';
import { serverService } from '../services/serverService';

const { Title, Text } = Typography;

interface CommandHistory {
    command: string;
    response: string;
    timestamp: Date;
}

function Rcon() {
    const [servers, setServers] = useState<any[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [command, setCommand] = useState('');
    const [history, setHistory] = useState<CommandHistory[]>([]);
    const [rconPassword, setRconPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
        fetchServers();
    }, []);

    const handleConnect = async () => {
        if (!selectedServer || !rconPassword) {
            setError('Lütfen sunucu seçin ve RCON şifresini girin');
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

    const handleExecute = async () => {
        if (!selectedServer || !command.trim()) return;

        try {
            const response = await axios.post(`${API_URL}/api/rcon/${selectedServer}/execute`, {
                command: command.trim(),
            });

            setHistory([...history, {
                command: command.trim(),
                response: response.data.response || 'Komut çalıştırıldı',
                timestamp: new Date(),
            }]);
            setCommand('');
        } catch (error: any) {
            setError(error.response?.data?.error || 'Komut çalıştırılamadı');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleExecute();
        }
    };

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }}>
                    <SendOutlined /> RCON Konsol
                </Title>
                <Select
                    style={{ width: 300 }}
                    placeholder="Çalışan sunucu seçin"
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
            </div>

            {error && (
                <Alert
                    message="Hata"
                    description={error}
                    type="error"
                    closable
                    onClose={() => setError(null)}
                />
            )}

            {!connected ? (
                <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <div>
                            <Text strong>RCON Şifresi</Text>
                            <Input.Password
                                placeholder="RCON şifrenizi girin"
                                value={rconPassword}
                                onChange={(e) => setRconPassword(e.target.value)}
                                onPressEnter={handleConnect}
                                style={{ marginTop: 8 }}
                            />
                        </div>
                        <Button
                            type="primary"
                            icon={<LinkOutlined />}
                            onClick={handleConnect}
                            loading={connecting}
                            disabled={!selectedServer || !rconPassword}
                            block
                        >
                            Bağlan
                        </Button>
                    </Space>
                </Card>
            ) : (
                <Card
                    title="RCON Konsol"
                    extra={
                        <Space>
                            <Button
                                icon={<ClearOutlined />}
                                onClick={() => setHistory([])}
                                size="small"
                            >
                                Temizle
                            </Button>
                            <Button
                                danger
                                icon={<DisconnectOutlined />}
                                onClick={handleDisconnect}
                                size="small"
                            >
                                Bağlantıyı Kes
                            </Button>
                        </Space>
                    }
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                >
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <div
                            style={{
                                background: '#1e1e1e',
                                padding: '16px',
                                borderRadius: '6px',
                                maxHeight: '400px',
                                overflowY: 'auto',
                                fontFamily: 'monospace',
                            }}
                        >
                            {history.length === 0 ? (
                                <Text style={{ color: '#858585' }}>Komut geçmişi boş...</Text>
                            ) : (
                                <List
                                    dataSource={history}
                                    renderItem={(item) => (
                                        <div style={{ marginBottom: '12px' }}>
                                            <Text style={{ color: '#4ec9b0' }}>
                                                {item.timestamp.toLocaleTimeString()} &gt; {item.command}
                                            </Text>
                                            <pre
                                                style={{
                                                    color: '#d4d4d4',
                                                    margin: '4px 0 0 0',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
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
                                placeholder="Komut girin (örn: status, say Hello)"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={handleExecute}
                                disabled={!command.trim()}
                            >
                                Gönder
                            </Button>
                        </Space.Compact>

                        <Alert
                            message="Popüler Komutlar"
                            description={
                                <Space direction="vertical" size="small">
                                    <Text code>status</Text> - Sunucu durumu
                                    <Text code>say Mesaj</Text> - Sunucuya mesaj gönder
                                    <Text code>changelevel de_dust2</Text> - Harita değiştir
                                    <Text code>kick oyuncu_adı</Text> - Oyuncu at
                                    <Text code>mp_restartgame 1</Text> - Oyunu yeniden başlat
                                </Space>
                            }
                            type="info"
                            showIcon
                        />
                    </Space>
                </Card>
            )}
        </Space>
    );
}

export default Rcon;
