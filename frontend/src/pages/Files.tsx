import { useState, useEffect } from 'react';
import { Card, Select, Typography, Space, Empty } from 'antd';
// Unused import removed
import { useTranslation } from 'react-i18next';
import { serverService } from '../services/serverService';
import FileManager from '../components/FileManager';

const { Title } = Typography;

function Files() {
    const { t } = useTranslation();
    const [servers, setServers] = useState<any[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchServers = async () => {
        setLoading(true);
        try {
            const response = await serverService.getMyServers();
            if (response.success) {
                setServers(response.data);
                // Auto-select first server if available
                if (response.data.length > 0 && !selectedServer) {
                    setSelectedServer(response.data[0].id);
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

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }}>{t('nav.files')}</Title>
                <Select
                    style={{ width: 300 }}
                    placeholder="Sunucu seçin"
                    value={selectedServer}
                    onChange={setSelectedServer}
                    loading={loading}
                    options={servers.map(server => ({
                        value: server.id,
                        label: `${server.name} (${server.status})`,
                    }))}
                />
            </div>

            {selectedServer ? (
                <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <FileManager serverId={selectedServer} />
                </Card>
            ) : (
                <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <Empty
                        description="Lütfen bir sunucu seçin"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                </Card>
            )}
        </Space>
    );
}

export default Files;
