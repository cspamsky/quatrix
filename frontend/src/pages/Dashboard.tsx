import { useState, useEffect } from 'react';
import {
    Card, Statistic, Row, Col, Button, Typography, Space, Modal, Form, Input, Table, Tag, App
} from 'antd';
import {
    DashboardOutlined,
    PlayCircleOutlined,
    StopOutlined,
    GlobalOutlined,
    RocketOutlined,
    PlusOutlined,
    ReloadOutlined,
    SettingOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    FileTextOutlined,
    SafetyCertificateOutlined,
    EditOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { serverService } from '../services/serverService';
import Console from '../components/Console';
import ServerResources from '../components/ServerResources';
import ConfigEditor from '../components/ConfigEditor';
import WorkshopManager from '../components/WorkshopManager';

const { Title, Text } = Typography;

function Dashboard() {
    const { message, modal } = App.useApp();
    const { t } = useTranslation();

    // State
    const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [servers, setServers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedServerForConsole, setSelectedServerForConsole] = useState<string | null>(null);
    const [selectedServerForConfig, setSelectedServerForConfig] = useState<string | null>(null);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingServer, setEditingServer] = useState<any>(null);
    const [selectedServerForWorkshop, setSelectedServerForWorkshop] = useState<any | null>(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const fetchServers = async () => {
        setLoading(true);
        try {
            const response = await serverService.getMyServers();
            if (response.success) {
                setServers(response.data);
            }
        } catch (error) {
            message.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Check backend health
        fetch('http://localhost:3000/health')
            .then(res => res.json())
            .then(() => setApiStatus('online'))
            .catch(() => setApiStatus('offline'));

        fetchServers();
    }, []);

    const handleCreateServer = async (values: any) => {
        try {
            const response = await serverService.createServer(values);
            if (response.success) {
                message.success(t('common.success'));
                setIsModalVisible(false);
                form.resetFields();
                fetchServers();
                setSelectedServerForConsole(response.data.id);
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || t('common.error'));
        }
    };

    const handleStart = async (id: string) => {
        try {
            await serverService.startServer(id);
            message.success(t('common.success'));
            fetchServers();
        } catch (error: any) {
            message.error(error.response?.data?.message || t('common.error'));
        }
    };

    const handleStop = async (id: string) => {
        try {
            await serverService.stopServer(id);
            message.success(t('common.success'));
            fetchServers();
        } catch (error: any) {
            message.error(error.response?.data?.message || t('common.error'));
        }
    };

    const handleDelete = (id: string) => {
        modal.confirm({
            title: t('server.delete_confirm_title'),
            icon: <ExclamationCircleOutlined />,
            content: t('server.delete_confirm_content'),
            okText: t('common.delete'),
            okType: 'danger',
            cancelText: t('common.cancel'),
            onOk: async () => {
                try {
                    await serverService.deleteServer(id);
                    message.success(t('common.success'));
                    fetchServers();
                } catch (error: any) {
                    message.error(error.response?.data?.message || t('common.error'));
                }
            },
        });
    };

    const handleValidate = async (id: string) => {
        try {
            const response = await serverService.validateServer(id);
            if (response.success) {
                message.success(t('common.success'));
                setSelectedServerForConsole(id);
                fetchServers();
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || t('common.error'));
        }
    };

    const handleUpdateServer = async (values: any) => {
        if (!editingServer) return;
        try {
            const response = await serverService.updateServer(editingServer.id, values);
            if (response.success) {
                message.success(t('common.success'));
                setIsEditModalVisible(false);
                setEditingServer(null);
                fetchServers();
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || t('common.error'));
        }
    };

    const handleEdit = (record: any) => {
        setEditingServer(record);
        editForm.setFieldsValue({
            name: record.name,
            description: record.description
        });
        setIsEditModalVisible(true);
    };

    const columns = [
        {
            title: t('server.name'),
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: t('server.status'),
            dataIndex: 'status',
            key: 'status',
            responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
            render: (status: string) => {
                let color = 'default';
                if (status === 'RUNNING') color = 'success';
                if (status === 'CREATING' || status === 'STARTING') color = 'processing';
                if (status === 'STOPPED') color = 'error';
                if (status === 'ERROR') color = 'warning';
                return <Tag color={color}>{t(`status.${status}`)}</Tag>;
            }
        },
        {
            title: t('server.port'),
            dataIndex: 'port',
            key: 'port',
            responsive: ['xl' as const, 'xxl' as const],
        },
        {
            title: t('common.actions'),
            key: 'actions',
            render: (_: any, record: any) => (
                <Space wrap>
                    <Button
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEdit(record)}
                        title="Rename Server"
                    />
                    {record.status === 'STOPPED' || record.status === 'ERROR' ? (
                        <Button
                            icon={<PlayCircleOutlined />}
                            onClick={() => handleStart(record.id)}
                            type="primary"
                            size="small"
                        >
                            <span className="button-text">{t('server.start')}</span>
                        </Button>
                    ) : (
                        <Button
                            icon={<StopOutlined />}
                            onClick={() => handleStop(record.id)}
                            danger
                            size="small"
                            disabled={record.status === 'CREATING'}
                        >
                            <span className="button-text">{t('server.stop')}</span>
                        </Button>
                    )}
                    <Button
                        icon={<SettingOutlined />}
                        size="small"
                        onClick={() => setSelectedServerForConsole(record.id)}
                        title={t('server.console')}
                    >
                        <span className="button-text">{t('server.console')}</span>
                    </Button>
                    <Button
                        icon={<FileTextOutlined />}
                        size="small"
                        onClick={() => setSelectedServerForConfig(record.id)}
                        disabled={record.status === 'CREATING'}
                        title={t('server.config')}
                    >
                        <span className="button-text">{t('server.config')}</span>
                    </Button>
                    <Button
                        icon={<SafetyCertificateOutlined />}
                        size="small"
                        onClick={() => handleValidate(record.id)}
                        disabled={record.status !== 'STOPPED' && record.status !== 'ERROR'}
                        title={t('server.verify_files')}
                    >
                        <span className="button-text">{t('server.verify')}</span>
                    </Button>
                    <Button
                        icon={<GlobalOutlined />}
                        size="small"
                        onClick={() => setSelectedServerForWorkshop(record)}
                        title={t('server.workshop')}
                    >
                        <span className="button-text">{t('server.workshop')}</span>
                    </Button>
                    <Button
                        icon={<DeleteOutlined />}
                        size="small"
                        danger
                        onClick={() => handleDelete(record.id)}
                        title={t('common.delete')}
                    >
                        <span className="button-text">{record.status === 'CREATING' ? t('common.cancel') : t('common.delete')}</span>
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Header Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }}>{t('dashboard.title')}</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchServers}>{t('common.refresh')}</Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsModalVisible(true)}
                        disabled={apiStatus !== 'online'}
                    >
                        {t('dashboard.createServer')}
                    </Button>
                </Space>
            </div>

            {/* Statistics */}
            <Row gutter={16}>
                <Col xs={24} sm={12} lg={8}>
                    <Card variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <Statistic
                            title={t('dashboard.totalServers')}
                            value={servers.length}
                            prefix={<DashboardOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <Statistic
                            title={t('dashboard.runningServers')}
                            value={servers.filter(s => s.status === 'RUNNING').length}
                            prefix={<PlayCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <Card variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <Statistic
                            title={t('dashboard.stoppedServers')}
                            value={servers.filter(s => s.status === 'STOPPED').length}
                            prefix={<StopOutlined />}
                            valueStyle={{ color: '#ff4d4f' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Main Content Area */}
            <Row gutter={[16, 16]}>
                <Col xs={24} xl={16}>
                    <Card title={t('dashboard.yourServers')} style={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <Table
                            dataSource={servers}
                            columns={columns}
                            rowKey="id"
                            loading={loading}
                            locale={{ emptyText: t('dashboard.noServers') }}
                            pagination={{ pageSize: 5 }}
                            className="responsive-table"
                        />
                    </Card>
                </Col>
                <Col xs={24} xl={8}>
                    <ServerResources />
                </Col>
            </Row>

            {/* Backend Info Alert if Offline */}
            {apiStatus !== 'online' && (
                <Card style={{ background: '#fff2f0', border: '1px solid #ffccc7' }}>
                    <Space>
                        <GlobalOutlined style={{ color: '#ff4d4f' }} />
                        <Text type="danger">{t('dashboard.backendOffline')}</Text>
                    </Space>
                </Card>
            )}

            {/* Create Server Modal */}
            <Modal
                title={t('dashboard.createServer')}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    onFinish={handleCreateServer}
                    layout="vertical"
                >
                    <Form.Item
                        name="name"
                        label={t('dashboard.serverName')}
                        rules={[{ required: true, message: t('common.error') }]}
                    >
                        <Input placeholder="My Awesome CS2 Server" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label={t('dashboard.description')}
                    >
                        <Input.TextArea placeholder="A short description" />
                    </Form.Item>

                    <Form.Item
                        name="gsltToken"
                        label={t('dashboard.gsltToken')}
                        help={<a href="https://steamcommunity.com/dev/managegameservers" target="_blank" rel="noreferrer">Steam Dev Portal</a>}
                        rules={[{ required: true, message: t('common.error') }]}
                    >
                        <Input placeholder="Example: 5F0B..." />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)}>{t('common.cancel')}</Button>
                            <Button type="primary" htmlType="submit" icon={<RocketOutlined />}>
                                {t('dashboard.createAndInstall')}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Console Modal */}
            <Modal
                title={`Server Console - ${servers.find(s => s.id === selectedServerForConsole)?.name || ''}`}
                open={!!selectedServerForConsole}
                onCancel={() => setSelectedServerForConsole(null)}
                width={800}
                footer={null}
                destroyOnClose
            >
                {selectedServerForConsole && (
                    <Console serverId={selectedServerForConsole} />
                )}
            </Modal>

            {/* Config Editor Modal */}
            <Modal
                title={`File Editor - ${servers.find(s => s.id === selectedServerForConfig)?.name || ''}`}
                open={!!selectedServerForConfig}
                onCancel={() => setSelectedServerForConfig(null)}
                width={900}
                footer={null}
                destroyOnClose
                style={{ top: 20 }}
            >
                {selectedServerForConfig && (
                    <ConfigEditor serverId={selectedServerForConfig} />
                )}
            </Modal>

            {/* Edit Server Modal */}
            <Modal
                title={t('dashboard.editDetails')}
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={editForm}
                    onFinish={handleUpdateServer}
                    layout="vertical"
                >
                    <Form.Item
                        name="name"
                        label={t('dashboard.serverName')}
                        rules={[{ required: true, message: t('common.error') }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label={t('dashboard.description')}
                    >
                        <Input.TextArea />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsEditModalVisible(false)}>{t('common.cancel')}</Button>
                            <Button type="primary" htmlType="submit">
                                {t('common.update')}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Workshop Manager Modal */}
            <Modal
                title={`Workshop Management - ${selectedServerForWorkshop?.name || ''}`}
                open={!!selectedServerForWorkshop}
                onCancel={() => setSelectedServerForWorkshop(null)}
                width={480}
                footer={null}
                destroyOnClose
            >
                {selectedServerForWorkshop && (
                    <WorkshopManager
                        server={selectedServerForWorkshop}
                        onUpdate={() => {
                            fetchServers();
                        }}
                    />
                )}
            </Modal>
        </Space>
    );
}

export default Dashboard;
