import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Space, Row, Col, Divider, App } from 'antd';
import {
    SaveOutlined,
    ReloadOutlined,
    SettingOutlined,
    FolderOpenOutlined,
    LockOutlined,
    CloudDownloadOutlined,
    RocketOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons';
import { settingsService } from '../services/settingsService';
import { authService } from '../services/authService';

const { Title, Text } = Typography;

const Settings = () => {
    const { message, modal } = App.useApp();
    const [configForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [installing, setInstalling] = useState(false);

    const fetchSettings = async () => {
        try {
            const response = await settingsService.getSettings();
            if (response.success) {
                configForm.setFieldsValue(response.data);
            }
        } catch (error) {
            message.error('Failed to load settings');
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const onConfigFinish = async (values: any) => {
        setLoading(true);
        try {
            const response = await settingsService.updateSettings(values);
            if (response.success) {
                message.success('Settings updated successfully!');
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const onPasswordFinish = async (values: any) => {
        setPasswordLoading(true);
        try {
            const response = await authService.changePassword(values);
            if (response.success) {
                message.success('Password updated successfully!');
                passwordForm.resetFields();
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to update password');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleInstallSteamCMD = async () => {
        modal.confirm({
            title: 'Install SteamCMD?',
            icon: <ExclamationCircleOutlined />,
            content: 'This will download and extract SteamCMD to the configured directory. Make sure the path is correct.',
            onOk: async () => {
                setInstalling(true);
                try {
                    const res = await settingsService.installSteamCMD();
                    if (res.success) message.success('SteamCMD installed successfully!');
                } catch (error: any) {
                    message.error(error.response?.data?.message || 'Installation failed');
                } finally {
                    setInstalling(false);
                }
            },
        });
    };

    const handleResetWizard = async () => {
        modal.confirm({
            title: 'Reset Setup Wizard?',
            icon: <ExclamationCircleOutlined />,
            content: 'This will reset the "isConfigured" flag. The setup wizard will appear again on your next dashboard visit.',
            okType: 'danger',
            onOk: async () => {
                try {
                    const res = await settingsService.resetSetup();
                    if (res.success) message.success('Setup wizard reset. Refreshing...');
                    window.location.href = '/';
                } catch (error: any) {
                    message.error('Failed to reset setup wizard');
                }
            },
        });
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={2} style={{ margin: 0 }}>Quatrix Settings</Title>
                    <Button icon={<ReloadOutlined />} onClick={fetchSettings} loading={initialLoading}>
                        Refresh
                    </Button>
                </div>

                {/* Global Configuration */}
                <Card
                    loading={initialLoading}
                    title={<span><SettingOutlined /> Global Configuration</span>}
                >
                    <Form
                        form={configForm}
                        layout="vertical"
                        onFinish={onConfigFinish}
                        autoComplete="off"
                    >
                        <Row gutter={24}>
                            <Col span={24}>
                                <Form.Item
                                    name="steamcmdPath"
                                    label="SteamCMD Directory"
                                    rules={[{ required: true, message: 'Please enter SteamCMD path' }]}
                                    extra="Directory where steamcmd.exe (Windows) or steamcmd.sh (Linux) is located."
                                >
                                    <Input
                                        prefix={<FolderOpenOutlined />}
                                        placeholder="e.g., C:\steamcmd or ./steamcmd"
                                    />
                                </Form.Item>
                            </Col>

                            <Col span={24}>
                                <Form.Item
                                    name="serversPath"
                                    label="Servers Root Directory"
                                    rules={[{ required: true, message: 'Please enter servers root path' }]}
                                    extra="Common root folder where all CS2 server instances will be stored."
                                >
                                    <Input
                                        prefix={<FolderOpenOutlined />}
                                        placeholder="e.g., C:\cs2-servers or ./cs2-servers"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider />

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SaveOutlined />}
                                loading={loading}
                                size="large"
                            >
                                Save Configuration
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                <Row gutter={24}>
                    <Col xs={24} lg={12}>
                        {/* Password Reset */}
                        <Card title={<span><LockOutlined /> Security & Password</span>}>
                            <Form
                                form={passwordForm}
                                layout="vertical"
                                onFinish={onPasswordFinish}
                            >
                                <Form.Item
                                    name="currentPassword"
                                    label="Current Password"
                                    rules={[{ required: true, message: 'Required' }]}
                                >
                                    <Input.Password prefix={<LockOutlined />} />
                                </Form.Item>
                                <Form.Item
                                    name="newPassword"
                                    label="New Password"
                                    rules={[
                                        { required: true, message: 'Required' },
                                        { min: 6, message: 'Min 6 characters' }
                                    ]}
                                >
                                    <Input.Password prefix={<LockOutlined />} />
                                </Form.Item>
                                <Button
                                    type="default"
                                    htmlType="submit"
                                    loading={passwordLoading}
                                    block
                                >
                                    Update Password
                                </Button>
                            </Form>
                        </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                        {/* Management Tools */}
                        <Card title={<span><RocketOutlined /> Management Tools</span>}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Button
                                    icon={<CloudDownloadOutlined />}
                                    block
                                    onClick={handleInstallSteamCMD}
                                    loading={installing}
                                >
                                    Install/Update SteamCMD Online
                                </Button>
                                <Button
                                    icon={<ReloadOutlined />}
                                    block
                                    onClick={handleResetWizard}
                                >
                                    Re-run Setup Wizard
                                </Button>
                                <Divider style={{ margin: '12px 0' }} />
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Note: Installing SteamCMD will download approximately 3MB.
                                </Text>
                            </Space>
                        </Card>
                    </Col>
                </Row>

                <Card title="Application Info">
                    <Row gutter={24}>
                        <Col span={8}>
                            <Text type="secondary">Product Name</Text>
                            <Title level={5} style={{ marginTop: 4 }}>Quatrix</Title>
                        </Col>
                        <Col span={8}>
                            <Text type="secondary">Version</Text>
                            <Title level={5} style={{ marginTop: 4 }}>v0.1.0-alpha</Title>
                        </Col>
                        <Col span={8}>
                            <Text type="secondary">Environment</Text>
                            <Title level={5} style={{ marginTop: 4 }}>Development (Native)</Title>
                        </Col>
                    </Row>
                </Card>
            </Space>
        </div>
    );
};

export default Settings;
