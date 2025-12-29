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

import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const Settings = () => {
    const { t } = useTranslation();
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
            message.error(t('common.error'));
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const onConfigFinish = async (values: any) => {
        setLoading(true);
        const hide = message.loading(t('common.processing'), 0);
        try {
            const response = await settingsService.updateSettings(values);
            hide();
            if (response.success) {
                message.success(t('common.success'));
            }
        } catch (error: any) {
            hide();
            message.error(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const onPasswordFinish = async (values: any) => {
        setPasswordLoading(true);
        const hide = message.loading(t('common.processing'), 0);
        try {
            const response = await authService.changePassword(values);
            hide();
            if (response.success) {
                message.success(t('common.success'));
                passwordForm.resetFields();
            }
        } catch (error: any) {
            hide();
            message.error(error.response?.data?.message || t('common.error'));
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleInstallSteamCMD = async () => {
        modal.confirm({
            title: t('settings.installSteamCMD'),
            icon: <ExclamationCircleOutlined />,
            content: t('settings.installSteamCMD_confirm'),
            onOk: async () => {
                setInstalling(true);
                const hide = message.loading(t('common.processing'), 0);
                try {
                    const res = await settingsService.installSteamCMD();
                    hide();
                    if (res.success) message.success(t('common.success'));
                } catch (error: any) {
                    hide();
                    message.error(error.response?.data?.message || t('common.error'));
                } finally {
                    setInstalling(false);
                }
            },
        });
    };

    const handleResetWizard = async () => {
        modal.confirm({
            title: t('settings.resetWizard'),
            icon: <ExclamationCircleOutlined />,
            content: t('settings.resetWizard_confirm'),
            okType: 'danger',
            onOk: async () => {
                try {
                    const res = await settingsService.resetSetup();
                    if (res.success) message.success(t('common.success'));
                    window.location.href = '/';
                } catch (error: any) {
                    message.error(t('common.error'));
                }
            },
        });
    };

    return (
        <div style={{ width: '100%', height: 'auto' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={2} style={{ margin: 0 }}>{t('settings.title')}</Title>
                </div>

                {/* Global Configuration */}
                <Card
                    loading={initialLoading}
                    variant="borderless"
                    title={<Space><SettingOutlined style={{ color: '#1890ff' }} /> {t('settings.save')}</Space>}
                    style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                    bodyStyle={{ padding: '20px' }}
                >
                    <Form
                        form={configForm}
                        layout="vertical"
                        onFinish={onConfigFinish}
                        autoComplete="off"
                    >
                        <Row gutter={[24, 0]}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="steamcmdPath"
                                    label={<Text strong>{t('settings.steamcmd')}</Text>}
                                    rules={[{ required: true, message: t('common.required') }]}
                                    extra={<Text type="secondary" style={{ fontSize: '12px' }}>{t('settings.steamcmd_desc')}</Text>}
                                >
                                    <Input
                                        prefix={<FolderOpenOutlined style={{ color: '#bfbfbf' }} />}
                                        placeholder="e.g., C:\steamcmd"
                                        style={{ borderRadius: 8 }}
                                    />
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="serversPath"
                                    label={<Text strong>{t('settings.serversPath')}</Text>}
                                    rules={[{ required: true, message: t('common.required') }]}
                                    extra={<Text type="secondary" style={{ fontSize: '12px' }}>{t('settings.serversPath_desc')}</Text>}
                                >
                                    <Input
                                        prefix={<FolderOpenOutlined style={{ color: '#bfbfbf' }} />}
                                        placeholder="e.g., C:\cs2-servers"
                                        style={{ borderRadius: 8 }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider style={{ margin: '20px 0' }} />

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SaveOutlined />}
                                loading={loading}
                                size="large"
                                style={{ borderRadius: 8, height: 40 }}
                            >
                                {t('settings.save')}
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        {/* Security */}
                        <Card
                            variant="borderless"
                            title={<Space><LockOutlined style={{ color: '#ff4d4f' }} /> {t('settings.security')}</Space>}
                            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
                            bodyStyle={{ padding: '20px' }}
                        >
                            <Form
                                form={passwordForm}
                                layout="vertical"
                                onFinish={onPasswordFinish}
                            >
                                <Form.Item
                                    name="currentPassword"
                                    label={<Text strong>{t('settings.currentPassword')}</Text>}
                                    rules={[{ required: true, message: t('common.required') }]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                                        style={{ borderRadius: 8 }}
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="newPassword"
                                    label={<Text strong>{t('settings.newPassword')}</Text>}
                                    rules={[
                                        { required: true, message: t('common.required') },
                                        { min: 6, message: t('common.min_chars') }
                                    ]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                                        style={{ borderRadius: 8 }}
                                    />
                                </Form.Item>
                                <Button
                                    type="primary"
                                    danger
                                    ghost
                                    htmlType="submit"
                                    loading={passwordLoading}
                                    block
                                    style={{ borderRadius: 8, height: 40 }}
                                >
                                    {t('settings.updatePassword')}
                                </Button>
                            </Form>
                        </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                        {/* Management Tools */}
                        <Card
                            variant="borderless"
                            title={<Space><RocketOutlined style={{ color: '#722ed1' }} /> {t('settings.management')}</Space>}
                            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}
                            bodyStyle={{ padding: '20px' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(24,144,255,0.05) 0%, rgba(24,144,255,0.02) 100%)', borderRadius: 10, border: '1px solid rgba(24,144,255,0.15)' }}>
                                    <div style={{ marginBottom: 10 }}>
                                        <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>
                                            <CloudDownloadOutlined style={{ marginRight: 6 }} />
                                            {t('settings.installSteamCMD')}
                                        </Text>
                                    </div>
                                    <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: '12px', lineHeight: '1.5' }}>
                                        {t('settings.installSteamCMD_desc')}
                                    </Text>
                                    <Button
                                        type="primary"
                                        icon={<CloudDownloadOutlined />}
                                        block
                                        onClick={handleInstallSteamCMD}
                                        loading={installing}
                                        style={{ borderRadius: 8, height: 38 }}
                                    >
                                        {t('settings.installSteamCMD')}
                                    </Button>
                                </div>

                                <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(255,77,79,0.05) 0%, rgba(255,77,79,0.02) 100%)', borderRadius: 10, border: '1px solid rgba(255,77,79,0.2)' }}>
                                    <div style={{ marginBottom: 10 }}>
                                        <Text strong style={{ fontSize: '13px', color: '#ff4d4f' }}>
                                            <ReloadOutlined style={{ marginRight: 6 }} />
                                            {t('settings.resetWizard')}
                                        </Text>
                                    </div>
                                    <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: '12px', lineHeight: '1.5' }}>
                                        {t('settings.resetWizard_desc')}
                                    </Text>
                                    <Button
                                        danger
                                        icon={<ReloadOutlined />}
                                        block
                                        onClick={handleResetWizard}
                                        style={{ borderRadius: 8, height: 38 }}
                                    >
                                        {t('settings.resetWizard')}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24}>
                        {/* App Info */}
                        <Card
                            variant="borderless"
                            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)' }}
                            bodyStyle={{ padding: '20px' }}
                        >
                            <Row gutter={[24, 24]}>
                                <Col xs={24} sm={8}>
                                    <div style={{ textAlign: 'center' }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: 4 }}>{t('settings.productName')}</Text>
                                        <Title level={4} style={{ margin: 0, color: '#fff' }}>Quatrix</Title>
                                    </div>
                                </Col>
                                <Col xs={24} sm={8}>
                                    <div style={{ textAlign: 'center' }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: 4 }}>{t('settings.version')}</Text>
                                        <Title level={4} style={{ margin: 0, color: '#fff' }}>v1.0.0</Title>
                                    </div>
                                </Col>
                                <Col xs={24} sm={8}>
                                    <div style={{ textAlign: 'center' }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: 4 }}>{t('settings.environment')}</Text>
                                        <Title level={4} style={{ margin: 0, color: '#fff' }}>Stable (Windows)</Title>
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                </Row>
            </Space>
        </div>
    );
};

export default Settings;
