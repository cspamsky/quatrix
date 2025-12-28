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
        try {
            const response = await settingsService.updateSettings(values);
            if (response.success) {
                message.success(t('common.success'));
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const onPasswordFinish = async (values: any) => {
        setPasswordLoading(true);
        try {
            const response = await authService.changePassword(values);
            if (response.success) {
                message.success(t('common.success'));
                passwordForm.resetFields();
            }
        } catch (error: any) {
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
                try {
                    const res = await settingsService.installSteamCMD();
                    if (res.success) message.success(t('common.success'));
                } catch (error: any) {
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
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={2} style={{ margin: 0 }}>{t('settings.title')}</Title>
                    <Button icon={<ReloadOutlined />} onClick={fetchSettings} loading={initialLoading}>
                        {t('common.refresh')}
                    </Button>
                </div>

                {/* Global Configuration */}
                <Card
                    loading={initialLoading}
                    title={<span><SettingOutlined /> {t('settings.save')}</span>}
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
                                    label={t('settings.steamcmd')}
                                    rules={[{ required: true, message: t('common.required') }]}
                                    extra={t('settings.steamcmd_desc')}
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
                                    label={t('settings.serversPath')}
                                    rules={[{ required: true, message: t('common.required') }]}
                                    extra={t('settings.serversPath_desc')}
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
                                {t('settings.save')}
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                <Row gutter={24}>
                    <Col xs={24} lg={12}>
                        {/* Password Reset */}
                        <Card title={<span><LockOutlined /> {t('settings.security')}</span>}>
                            <Form
                                form={passwordForm}
                                layout="vertical"
                                onFinish={onPasswordFinish}
                            >
                                <Form.Item
                                    name="currentPassword"
                                    label={t('settings.currentPassword')}
                                    rules={[{ required: true, message: t('common.required') }]}
                                >
                                    <Input.Password prefix={<LockOutlined />} />
                                </Form.Item>
                                <Form.Item
                                    name="newPassword"
                                    label={t('settings.newPassword')}
                                    rules={[
                                        { required: true, message: t('common.required') },
                                        { min: 6, message: t('common.min_chars') }
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
                                    {t('settings.updatePassword')}
                                </Button>
                            </Form>
                        </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                        {/* Management Tools */}
                        <Card title={<span><RocketOutlined /> {t('settings.management')}</span>}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Button
                                    icon={<CloudDownloadOutlined />}
                                    block
                                    onClick={handleInstallSteamCMD}
                                    loading={installing}
                                >
                                    {t('settings.installSteamCMD')}
                                </Button>
                                <Button
                                    icon={<ReloadOutlined />}
                                    block
                                    onClick={handleResetWizard}
                                >
                                    {t('settings.resetWizard')}
                                </Button>
                                <Divider style={{ margin: '12px 0' }} />
                            </Space>
                        </Card>
                    </Col>
                </Row>

                <Card title={t('settings.appInfo')}>
                    <Row gutter={24}>
                        <Col span={8}>
                            <Text type="secondary">{t('settings.productName')}</Text>
                            <Title level={5} style={{ marginTop: 4 }}>Quatrix</Title>
                        </Col>
                        <Col span={8}>
                            <Text type="secondary">{t('settings.version')}</Text>
                            <Title level={5} style={{ marginTop: 4 }}>v1.0.0</Title>
                        </Col>
                        <Col span={8}>
                            <Text type="secondary">{t('settings.environment')}</Text>
                            <Title level={5} style={{ marginTop: 4 }}>Development (Native)</Title>
                        </Col>
                    </Row>
                </Card>
            </Space>
        </div>
    );
};

export default Settings;
