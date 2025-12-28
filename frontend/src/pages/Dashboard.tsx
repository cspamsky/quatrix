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
                message.success('Server creation started!');
                setIsModalVisible(false);
                form.resetFields();
                fetchServers();
                // Open console automatically to show progress
                setSelectedServerForConsole(response.data.id);
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to create server');
        }
    };

    const handleStart = async (id: string) => {
        try {
            await serverService.startServer(id);
            message.success('Start command sent');
            fetchServers();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to start');
        }
    };

    const handleStop = async (id: string) => {
        try {
            await serverService.stopServer(id);
            message.success('Stop command sent');
            fetchServers();
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to stop');
        }
    };

    const handleDelete = (id: string) => {
        modal.confirm({
            title: 'Delete Server?',
            icon: <ExclamationCircleOutlined />,
            content: 'This will stop the server (or installation) and delete all files. This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await serverService.deleteServer(id);
                    message.success('Server deleted successfully');
                    fetchServers();
                } catch (error: any) {
                    message.error(error.response?.data?.message || 'Failed to delete server');
                }
            },
        });
    };

    const handleValidate = async (id: string) => {
        try {
            const response = await serverService.validateServer(id);
            if (response.success) {
                message.success('Validation process started. check console for details.');
                // Open console automatically
                setSelectedServerForConsole(id);
                fetchServers();
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to start validation');
        }
    };

    const handleUpdateServer = async (values: any) => {
        if (!editingServer) return;
        try {
            const response = await serverService.updateServer(editingServer.id, values);
            if (response.success) {
                message.success('Server updated successfully');
                setIsEditModalVisible(false);
                setEditingServer(null);
                fetchServers();
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to update server');
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
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
            render: (status: string) => {
                let color = 'default';
                if (status === 'RUNNING') color = 'success';
                if (status === 'CREATING' || status === 'STARTING') color = 'processing';
                if (status === 'STOPPED') color = 'error';
                if (status === 'ERROR') color = 'warning';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Port',
            dataIndex: 'port',
            key: 'port',
            responsive: ['xl' as const, 'xxl' as const],
        },
        {
            title: 'Actions',
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
                            <span className="button-text">Start</span>
                        </Button>
                    ) : (
                        <Button
                            icon={<StopOutlined />}
                            onClick={() => handleStop(record.id)}
                            danger
                            size="small"
                            disabled={record.status === 'CREATING'}
                        >
                            <span className="button-text">Stop</span>
                        </Button>
                    )}
                    <Button
                        icon={<SettingOutlined />}
                        size="small"
                        onClick={() => setSelectedServerForConsole(record.id)}
                        title="Console"
                    >
                        <span className="button-text">Console</span>
                    </Button>
                    <Button
                        icon={<FileTextOutlined />}
                        size="small"
                        onClick={() => setSelectedServerForConfig(record.id)}
                        disabled={record.status === 'CREATING'}
                        title="Config"
                    >
                        <span className="button-text">Config</span>
                    </Button>
                    <Button
                        icon={<SafetyCertificateOutlined />}
                        size="small"
                        onClick={() => handleValidate(record.id)}
                        disabled={record.status !== 'STOPPED' && record.status !== 'ERROR'}
                        title="Verify Server Files"
                    >
                        <span className="button-text">Verify</span>
                    </Button>
                    <Button
                        icon={<GlobalOutlined />}
                        size="small"
                        onClick={() => setSelectedServerForWorkshop(record)}
                        title="Workshop Manager"
                    >
                        <span className="button-text">Workshop</span>
                    </Button>
                    <Button
                        icon={<DeleteOutlined />}
                        size="small"
                        danger
                        onClick={() => handleDelete(record.id)}
                        title="Delete"
                    >
                        <span className="button-text">{record.status === 'CREATING' ? 'Cancel' : 'Delete'}</span>
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Header Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchServers}>Refresh</Button>
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
                    <Card title="Your Servers" style={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <Table
                            dataSource={servers}
                            columns={columns}
                            rowKey="id"
                            loading={loading}
                            locale={{ emptyText: 'No servers found. Create your first one!' }}
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
                        <Text type="danger">Backend is currently offline. Server management features are disabled.</Text>
                    </Space>
                </Card>
            )}

            {/* Create Server Modal */}
            <Modal
                title="Create New CS2 Server"
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
                        label="Server Name"
                        rules={[{ required: true, message: 'Please input server name!' }]}
                    >
                        <Input placeholder="My Awesome CS2 Server" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Description (Optional)"
                    >
                        <Input.TextArea placeholder="A short description for your server" />
                    </Form.Item>

                    <Form.Item
                        name="gsltToken"
                        label="GSLT Token"
                        help={<a href="https://steamcommunity.com/dev/managegameservers" target="_blank" rel="noreferrer">Get your token here</a>}
                        rules={[{ required: true, message: 'GSLT Token is required for public visibility!' }]}
                    >
                        <Input placeholder="Example: 5F0B..." />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" icon={<RocketOutlined />}>
                                Create & Install
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
                title="Edit Server Details"
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
                        label="Server Name"
                        rules={[{ required: true, message: 'Please input server name!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Description (Optional)"
                    >
                        <Input.TextArea />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsEditModalVisible(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">
                                Update
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
