import React, { useState } from 'react';
import { Modal, Steps, Button, Typography, Space, Input, Form, Card, App } from 'antd';
import {
    RocketOutlined,
    FolderOpenOutlined,
    DownloadOutlined,
    CheckCircleOutlined,
    SettingOutlined
} from '@ant-design/icons';
import { settingsService } from '../services/settingsService';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;

interface SetupWizardProps {
    visible: boolean;
    onComplete: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ visible, onComplete }) => {
    const { message } = App.useApp();
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const { t } = useTranslation();
    const handleNext = async () => {
        if (current === 2) {
            // Final step - Save configuration
            try {
                const values = await form.validateFields();
                setLoading(true);
                const response = await settingsService.updateSettings(values);
                if (response.success) {
                    message.success(t('wizard.save_success'));
                    setCurrent(current + 1);
                }
            } catch (error: any) {
                message.error(error.response?.data?.message || t('wizard.save_fail'));
            } finally {
                setLoading(false);
            }
        } else {
            setCurrent(current + 1);
        }
    };

    const steps = [
        {
            title: t('wizard.welcome'),
            content: (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <RocketOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 24 }} />
                    <Title level={3}>{t('wizard.welcome_title')}</Title>
                    <Paragraph>
                        {t('wizard.welcome_para')}
                    </Paragraph>
                </div>
            ),
        },
        {
            title: t('wizard.steamcmd'),
            content: (
                <div>
                    <Title level={4}><DownloadOutlined /> {t('wizard.steamcmd_title')}</Title>
                    <Paragraph>
                        {t('wizard.steamcmd_para')}
                    </Paragraph>
                    <Card size="small" style={{ background: 'rgba(0, 0, 0, 0.02)', marginBottom: 16 }}>
                        <Space direction="vertical">
                            <Text strong>{t('wizard.steamcmd_win_instructions')}</Text>
                            <Text>{t('wizard.steamcmd_win_step1')} <a href="https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip" target="_blank" rel="noreferrer">{t('wizard.steamcmd_win_here')}</a> {t('wizard.steamcmd_win_step2')}</Text>
                            <Text>{t('wizard.steamcmd_win_step3')}</Text>
                        </Space>
                    </Card>
                    <Paragraph type="secondary">
                        {t('wizard.steamcmd_next_hint')}
                    </Paragraph>
                </div>
            ),
        },
        {
            title: t('wizard.config'),
            content: (
                <div>
                    <Title level={4}><SettingOutlined /> {t('wizard.config_title')}</Title>
                    <Form form={form} layout="vertical" initialValues={{
                        steamcmdPath: './steamcmd',
                        serversPath: './cs2-servers'
                    }}>
                        <Form.Item
                            name="steamcmdPath"
                            label={t('wizard.config_steamcmd_label')}
                            rules={[{ required: true, message: t('common.required') }]}
                            help={t('wizard.config_steamcmd_help')}
                        >
                            <Input prefix={<FolderOpenOutlined />} placeholder="C:\steamcmd" />
                        </Form.Item>
                        <Form.Item
                            name="serversPath"
                            label={t('wizard.config_servers_label')}
                            rules={[{ required: true, message: t('common.required') }]}
                            help={t('wizard.config_servers_help')}
                        >
                            <Input prefix={<FolderOpenOutlined />} placeholder="C:\quatrix\servers" />
                        </Form.Item>
                    </Form>
                </div>
            ),
        },
        {
            title: t('wizard.ready'),
            content: (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
                    <Title level={3}>{t('wizard.ready_title')}</Title>
                    <Paragraph>
                        {t('wizard.ready_para')}
                    </Paragraph>
                </div>
            ),
        },
    ];

    return (
        <Modal
            open={visible}
            title={t('wizard.title')}
            footer={[
                current > 0 && current < 3 && (
                    <Button key="back" onClick={() => setCurrent(current - 1)}>
                        {t('wizard.previous')}
                    </Button>
                ),
                current < 3 ? (
                    <Button key="next" type="primary" onClick={handleNext} loading={loading}>
                        {t('wizard.next')}
                    </Button>
                ) : (
                    <Button key="finish" type="primary" onClick={onComplete}>
                        {t('wizard.go_dashboard')}
                    </Button>
                ),
            ]}
            closable={false}
            maskClosable={false}
            width={600}
        >
            <Steps current={current} items={steps.map(item => ({ title: item.title }))} style={{ marginBottom: 32 }} />
            <div className="steps-content">{steps[current].content}</div>
        </Modal>
    );
};

export default SetupWizard;
