import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, App, Layout } from 'antd';
import { UserOutlined, LockOutlined, RocketOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Content } = Layout;

const Login: React.FC = () => {
    const { message } = App.useApp();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);
    const { darkMode, toggleDarkMode } = useThemeStore();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const response = await authService.login(values);
            if (response.success) {
                message.success(t('common.success'));
                setAuth(response.data.user, response.data.token);
                navigate('/');
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', background: darkMode ? '#000' : '#f0f2f5' }}>
            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
                <Button
                    type="text"
                    icon={darkMode ? <BulbFilled style={{ color: '#fadb14' }} /> : <BulbOutlined />}
                    onClick={toggleDarkMode}
                    size="large"
                />
            </div>
            <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 16px' }}>
                <Card style={{
                    width: '100%',
                    maxWidth: 400,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    borderRadius: 12
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <RocketOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                        <Title level={2} style={{ marginTop: 12 }}>Quatrix</Title>
                        <Text type="secondary">{t('common.login')}</Text>
                    </div>

                    <Form
                        name="login"
                        onFinish={onFinish}
                        layout="vertical"
                        size="large"
                    >
                        <Form.Item
                            name="email"
                            rules={[{ required: true, message: t('common.error'), type: 'email' }]}
                        >
                            <Input prefix={<UserOutlined />} placeholder={t('common.email')} />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: t('common.error') }]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder={t('common.password')} />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" block loading={loading}>
                                {t('common.login')}
                            </Button>
                        </Form.Item>
                    </Form>

                    <div style={{ textAlign: 'center' }}>
                        <Space>
                            <Text type="secondary">{t('common.no_account')}</Text>
                            <Link to="/register">{t('common.create_account')}</Link>
                        </Space>
                    </div>
                </Card>
            </Content>
        </Layout>
    );
};

export default Login;
