import { useState, useEffect } from 'react';
import { Layout, Typography, Space, Select, Button, Menu } from 'antd';
import {
    DashboardOutlined,
    CloudServerOutlined,
    SettingOutlined,
    LogoutOutlined,
    ControlOutlined,
    FolderOpenOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { useTranslation } from 'react-i18next';
import { settingsService } from '../services/settingsService';
import SetupWizard from './SetupWizard';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const MainLayout = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const { darkMode, toggleDarkMode } = useThemeStore();
    const [isWizardVisible, setIsWizardVisible] = useState(false);

    const checkSettings = async () => {
        try {
            const response = await settingsService.getSettings();
            if (response.success && !response.data.isConfigured) {
                setIsWizardVisible(true);
            }
        } catch (error) {
            console.error('Failed to fetch settings');
        }
    };

    useEffect(() => {
        checkSettings();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{
                background: darkMode ? '#141414' : '#001529',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                position: 'sticky',
                top: 0,
                zIndex: 1,
                width: '100%',
                borderBottom: darkMode ? '1px solid #303030' : 'none'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <CloudServerOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                    <Title level={3} style={{ color: 'white', margin: 0 }}>
                        Quatrix
                    </Title>
                </div>

                <Space size="middle">
                    <Button
                        type="text"
                        icon={darkMode ? <BulbFilled style={{ color: '#fadb14' }} /> : <BulbOutlined style={{ color: 'white' }} />}
                        onClick={toggleDarkMode}
                        style={{ color: 'white' }}
                    />
                    <Text className="header-email" style={{ color: 'white', opacity: 0.85 }}>{user?.email}</Text>
                    <Select
                        value={i18n.resolvedLanguage}
                        onChange={changeLanguage}
                        size={'small'}
                        style={{ width: 100 }}
                        options={[
                            { value: 'en', label: '🇬🇧 EN' },
                            { value: 'tr', label: '🇹🇷 TR' },
                        ]}
                    />
                    <Button
                        type="primary"
                        danger
                        size={'small'}
                        icon={<LogoutOutlined />}
                        onClick={handleLogout}
                    >
                        <span className="logout-text">{t('common.logout')}</span>
                    </Button>
                </Space>
            </Header>

            <Layout>
                <Sider width={250} style={{ background: darkMode ? '#141414' : '#fff' }} breakpoint="lg" collapsedWidth="0">
                    <Menu
                        mode="inline"
                        theme={darkMode ? 'dark' : 'light'}
                        selectedKeys={[location.pathname]}
                        style={{ height: '100%', borderRight: 0, paddingTop: '12px', background: darkMode ? '#141414' : '#fff' }}
                        items={[
                            {
                                key: '/',
                                icon: <DashboardOutlined />,
                                label: t('nav.dashboard'),
                                onClick: () => navigate('/')
                            },
                            {
                                key: '/servers',
                                icon: <CloudServerOutlined />,
                                label: t('nav.servers'),
                                onClick: () => navigate('/servers')
                            },
                            {
                                key: '/files',
                                icon: <FolderOpenOutlined />,
                                label: 'Dosya Yöneticisi',
                                onClick: () => navigate('/files')
                            },
                            {
                                key: '/rcon',
                                icon: <ControlOutlined />,
                                label: 'RCON Konsol',
                                onClick: () => navigate('/rcon')
                            },
                            {
                                type: 'divider'
                            },
                            {
                                key: '/settings',
                                icon: <SettingOutlined />,
                                label: t('nav.settings'),
                                onClick: () => navigate('/settings')
                            }
                        ]}
                    />
                </Sider>
                <Content style={{
                    padding: '24px',
                    minHeight: 280,
                    background: darkMode ? '#000' : '#f5f5f5',
                    color: darkMode ? 'rgba(255,255,255,0.85)' : 'initial'
                }}>
                    <Outlet />
                </Content>
            </Layout>

            <SetupWizard
                visible={isWizardVisible}
                onComplete={() => setIsWizardVisible(false)}
            />
        </Layout>
    );
};

export default MainLayout;
