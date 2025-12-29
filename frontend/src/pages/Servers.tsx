import { useState, useEffect } from 'react';
import {
    Card, Row, Col, Button, Typography, Space, Modal, Form, Input, Table, Tag, App, Select, Switch, Radio
} from 'antd';
import {
    PlayCircleOutlined,
    StopOutlined,
    GlobalOutlined,
    RocketOutlined,
    PlusOutlined,
    ReloadOutlined,
    SettingOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    SafetyCertificateOutlined,
    EditOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { serverService } from '../services/serverService';
import Console from '../components/Console';
import WorkshopManager from '../components/WorkshopManager';

const { Title } = Typography;

function Servers() {
    const { message, modal } = App.useApp();
    const { t } = useTranslation();

    // State
    const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [servers, setServers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedServerForConsole, setSelectedServerForConsole] = useState<string | null>(null);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingServer, setEditingServer] = useState<any>(null);
    const [selectedServerForWorkshop, setSelectedServerForWorkshop] = useState<any | null>(null);
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [installType, setInstallType] = useState<'new' | 'existing'>('new');

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
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        fetch(`${API_URL}/health`)
            .then(res => res.json())
            .then(() => setApiStatus('online'))
            .catch(() => setApiStatus('offline'));

        fetchServers();
    }, []);

    const handleCreateServer = async (values: any) => {
        try {
            const finalValues = {
                ...values,
                gsltToken: values.gsltToken?.trim(),
                steamAuthKey: values.steamAuthKey?.trim()
            };

            // If it's a new install, don't send installPath
            if (installType === 'new') {
                delete finalValues.installPath;
            }

            const response = await serverService.createServer(finalValues);
            if (response.success) {
                message.success(t('common.success'));
                setIsModalVisible(false);
                createForm.resetFields();
                setInstallType('new');
                fetchServers();
                setSelectedServerForConsole(response.data.id);
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || t('common.error'));
        }
    };

    const handleStart = async (id: string) => {
        setLoading(true);
        const hide = message.loading(t('server.processing_starting'), 0);
        try {
            await serverService.startServer(id);
            hide();
            message.success(t('common.success'));
            fetchServers();
        } catch (error: any) {
            hide();
            message.error(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleRestart = async (id: string) => {
        setLoading(true);
        const hide = message.loading(t('server.processing_restarting'), 0);
        try {
            await serverService.restartServer(id);
            hide();
            message.success(t('common.success'));
            fetchServers();
        } catch (error: any) {
            hide();
            message.error(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleForceStop = async (id: string) => {
        setLoading(true);
        const hide = message.loading(t('server.processing_stopping'), 0);
        try {
            await serverService.forceStopServer(id);
            hide();
            message.success(t('common.success'));
            fetchServers();
        } catch (error: any) {
            hide();
            message.error(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
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
        const hide = message.loading(t('server.processing_verifying'), 0);
        try {
            const response = await serverService.validateServer(id);
            hide();
            if (response.success) {
                message.success(t('common.success'));
                setSelectedServerForConsole(id);
                fetchServers();
            }
        } catch (error: any) {
            hide();
            message.error(error.response?.data?.message || t('common.error'));
        }
    };

    const handleUpdateServer = async (values: any) => {
        if (!editingServer) return;
        try {
            const finalValues = {
                ...values,
                gsltToken: values.gsltToken?.trim(),
                steamAuthKey: values.steamAuthKey?.trim()
            };
            const response = await serverService.updateServer(editingServer.id, finalValues);
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
        setIsEditModalVisible(true);
    };

    useEffect(() => {
        if (isEditModalVisible && editingServer) {
            editForm.setFieldsValue({
                name: editingServer.name,
                description: editingServer.description,
                gsltToken: editingServer.gsltToken,
                steamAuthKey: editingServer.steamAuthKey,
                rconPassword: '',
                maxPlayers: editingServer.maxPlayers || 10,
                map: editingServer.map || 'de_dust2',
                port: editingServer.port,
                vacEnabled: editingServer.vacEnabled
            });
        }
    }, [isEditModalVisible, editingServer, editForm]);

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
                        title={t('common.edit')}
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
                    ) : null}


                    {(record.status === 'RUNNING' || record.status === 'STARTING' || record.status === 'STOPPING' || record.status === 'CREATING') && (
                        <Button
                            icon={<StopOutlined />}
                            onClick={() => handleForceStop(record.id)}
                            danger
                            size="small"
                            type={record.status === 'CREATING' ? 'primary' : 'default'}
                        >
                            <span className="button-text">{t('server.stop')}</span>
                        </Button>
                    )}


                    {record.status === 'RUNNING' && (
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => handleRestart(record.id)}
                            size="small"
                            title={t('server.restart')}
                        >
                            <span className="button-text">{t('server.restart')}</span>
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
                        <span className="button-text">{t('common.delete')}</span>
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }}>{t('nav.servers')}</Title>
                <Space>
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

            <Card title={t('dashboard.yourServers')} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Table
                    dataSource={servers}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    locale={{ emptyText: t('dashboard.noServers') }}
                    pagination={{ pageSize: 10 }}
                    className="responsive-table"
                />
            </Card>

            {/* Create Modal */}
            <Modal
                title={t('dashboard.createServer')}
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    setInstallType('new');
                    createForm.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={createForm}
                    onFinish={handleCreateServer}
                    layout="vertical"
                    initialValues={{
                        maxPlayers: 10,
                        map: 'de_dust2',
                        vacEnabled: true,
                        installType: 'new'
                    }}
                >
                    <Form.Item label={t('dashboard.installType')} name="installType">
                        <Radio.Group
                            optionType="button"
                            buttonStyle="solid"
                            onChange={(e) => setInstallType(e.target.value)}
                            value={installType}
                        >
                            <Radio value="new">{t('dashboard.newInstall')}</Radio>
                            <Radio value="existing">{t('dashboard.existingPath')}</Radio>
                        </Radio.Group>
                    </Form.Item>

                    {installType === 'existing' && (
                        <Card
                            size="small"
                            style={{ marginBottom: 20, background: 'rgba(0,0,0,0.02)', border: '1px dashed #d9d9d9' }}
                        >
                            <Typography.Text type="secondary" size="small" style={{ display: 'block', marginBottom: 10 }}>
                                <ExclamationCircleOutlined style={{ marginRight: 8 }} />
                                {t('dashboard.existing_desc')}
                            </Typography.Text>
                            <Form.Item
                                name="installPath"
                                label={t('dashboard.path_label')}
                                rules={[{ required: true }]}
                                extra={t('dashboard.example_path')}
                            >
                                <Input placeholder={t('dashboard.path_placeholder')} />
                            </Form.Item>
                        </Card>
                    )}

                    <Form.Item name="name" label={t('dashboard.serverName')} rules={[{ required: true }]}><Input placeholder={t('dashboard.serverName_placeholder')} /></Form.Item>
                    <Form.Item name="description" label={t('dashboard.description')}><Input.TextArea placeholder={t('dashboard.description_placeholder')} /></Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="port" label={t('server.port')}>
                                <Input type="number" placeholder={t('dashboard.auto_allocate')} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="vacEnabled" label={t('server.vac_secure')} valuePropName="checked">
                                <Switch checkedChildren={t('common.enabled')} unCheckedChildren={t('common.disabled')} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="gsltToken" label={t('dashboard.gsltToken')} rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="steamAuthKey" label={t('server.steam_web_api_key')}><Input /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="rconPassword" label={t('server.rcon_password')} rules={[{ required: true, message: t('common.required') }]}><Input.Password /></Form.Item></Col>
                        <Col span={12}><Form.Item name="maxPlayers" label={t('dashboard.max_players')} rules={[{ required: true, message: t('common.required') }]}><Input type="number" /></Form.Item></Col>
                    </Row>
                    <Form.Item name="map" label={t('dashboard.default_map')} rules={[{ required: true }]}>
                        <Select placeholder={t('dashboard.map_placeholder')}>
                            <Select.OptGroup label={t('dashboard.competitive_maps')}>
                                <Select.Option value="de_dust2">Dust 2</Select.Option>
                                <Select.Option value="de_mirage">Mirage</Select.Option>
                                <Select.Option value="de_inferno">Inferno</Select.Option>
                                <Select.Option value="de_nuke">Nuke</Select.Option>
                                <Select.Option value="de_overpass">Overpass</Select.Option>
                                <Select.Option value="de_vertigo">Vertigo</Select.Option>
                                <Select.Option value="de_ancient">Ancient</Select.Option>
                                <Select.Option value="de_anubis">Anubis</Select.Option>
                            </Select.OptGroup>
                        </Select>
                    </Form.Item>
                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)}>{t('common.cancel')}</Button>
                            <Button type="primary" htmlType="submit" icon={installType === 'new' ? <RocketOutlined /> : <PlusOutlined />}>
                                {installType === 'new' ? t('dashboard.createAndInstall') : t('common.create')}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title={t('dashboard.editDetails')}
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                footer={null}
                destroyOnHidden
            >
                <Form
                    form={editForm}
                    onFinish={handleUpdateServer}
                    layout="vertical"
                >
                    <Form.Item name="name" label={t('dashboard.serverName')} rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="description" label={t('dashboard.description')}><Input.TextArea /></Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="port" label={t('server.port')}>
                                <Input type="number" placeholder={t('dashboard.auto_allocate')} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="vacEnabled" label={t('server.vac_secure')} valuePropName="checked">
                                <Switch checkedChildren={t('common.enabled')} unCheckedChildren={t('common.disabled')} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="gsltToken" label={t('dashboard.gsltToken')} rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="steamAuthKey" label={t('server.steam_web_api_key')}><Input /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="rconPassword" label={t('dashboard.rcon_password_edit')}><Input.Password placeholder={t('dashboard.empty_no_change')} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="maxPlayers" label={t('dashboard.max_players')} rules={[{ required: true, message: t('common.required') }]}><Input type="number" /></Form.Item></Col>
                    </Row>
                    <Form.Item name="map" label={t('dashboard.default_map')} rules={[{ required: true }]}>
                        <Select>
                            <Select.OptGroup label={t('dashboard.competitive_maps')}>
                                <Select.Option value="de_dust2">Dust 2</Select.Option>
                                <Select.Option value="de_mirage">Mirage</Select.Option>
                                <Select.Option value="de_inferno">Inferno</Select.Option>
                                <Select.Option value="de_nuke">Nuke</Select.Option>
                            </Select.OptGroup>
                        </Select>
                    </Form.Item>
                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setIsEditModalVisible(false)}>{t('common.cancel')}</Button>
                            <Button type="primary" htmlType="submit">{t('common.update')}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Console Modal */}
            <Modal
                title={`${t('dashboard.server_console')} - ${servers.find(s => s.id === selectedServerForConsole)?.name || ''}`}
                open={!!selectedServerForConsole}
                onCancel={() => setSelectedServerForConsole(null)}
                width={800}
                footer={null}
                destroyOnHidden
            >
                {selectedServerForConsole && <Console serverId={selectedServerForConsole} />}
            </Modal>

            {/* Workshop Modal */}
            <Modal
                title={`${t('dashboard.workshop_management')} - ${selectedServerForWorkshop?.name || ''}`}
                open={!!selectedServerForWorkshop}
                onCancel={() => setSelectedServerForWorkshop(null)}
                width={480}
                footer={null}
                destroyOnHidden
            >
                {selectedServerForWorkshop && (
                    <WorkshopManager
                        server={selectedServerForWorkshop}
                        onUpdate={() => {
                            fetchServers();
                            setSelectedServerForWorkshop(null);
                        }}
                    />
                )}
            </Modal>
        </Space>
    );
}

export default Servers;
