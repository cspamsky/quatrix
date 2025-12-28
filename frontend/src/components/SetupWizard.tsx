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

    const handleNext = async () => {
        if (current === 2) {
            // Final step - Save configuration
            try {
                const values = await form.validateFields();
                setLoading(true);
                const response = await settingsService.updateSettings(values);
                if (response.success) {
                    message.success('Configuration saved successfully!');
                    setCurrent(current + 1);
                }
            } catch (error: any) {
                message.error(error.response?.data?.message || 'Failed to save settings');
            } finally {
                setLoading(false);
            }
        } else {
            setCurrent(current + 1);
        }
    };

    const steps = [
        {
            title: 'Welcome',
            content: (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <RocketOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 24 }} />
                    <Title level={3}>Welcome to Quatrix!</Title>
                    <Paragraph>
                        We need to perform a quick initial setup to get your CS2 server management panel ready.
                        This wizard will guide you through installing SteamCMD and configuring your server paths.
                    </Paragraph>
                </div>
            ),
        },
        {
            title: 'SteamCMD',
            content: (
                <div>
                    <Title level={4}><DownloadOutlined /> Install SteamCMD</Title>
                    <Paragraph>
                        Quatrix uses SteamCMD to download and update Counter-Strike 2.
                    </Paragraph>
                    <Card size="small" style={{ background: 'rgba(0, 0, 0, 0.02)', marginBottom: 16 }}>
                        <Space direction="vertical">
                            <Text strong>Instructions for Windows:</Text>
                            <Text>1. Download SteamCMD from <a href="https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip" target="_blank" rel="noreferrer">here</a>.</Text>
                            <Text>2. Extract it to a folder (e.g., <code>C:\steamcmd</code>).</Text>
                            <Text>3. Run <code>steamcmd.exe</code> once to let it update itself.</Text>
                        </Space>
                    </Card>
                    <Paragraph type="secondary">
                        Once you have installed it, proceed to the next step to set the path.
                    </Paragraph>
                </div>
            ),
        },
        {
            title: 'Configuration',
            content: (
                <div>
                    <Title level={4}><SettingOutlined /> Configure Paths</Title>
                    <Form form={form} layout="vertical" initialValues={{
                        steamcmdPath: './steamcmd',
                        serversPath: './cs2-servers'
                    }}>
                        <Form.Item
                            name="steamcmdPath"
                            label="SteamCMD Directory"
                            rules={[{ required: true, message: 'Please input SteamCMD path!' }]}
                            help="Full path to the folder containing steamcmd.exe"
                        >
                            <Input prefix={<FolderOpenOutlined />} placeholder="C:\steamcmd" />
                        </Form.Item>
                        <Form.Item
                            name="serversPath"
                            label="Servers Root Directory"
                            rules={[{ required: true, message: 'Please input servers root path!' }]}
                            help="Folder where CS2 servers will be installed"
                        >
                            <Input prefix={<FolderOpenOutlined />} placeholder="C:\quatrix\servers" />
                        </Form.Item>
                    </Form>
                </div>
            ),
        },
        {
            title: 'Ready!',
            content: (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }} />
                    <Title level={3}>You're all set!</Title>
                    <Paragraph>
                        Quatrix is now configured and ready to manage your CS2 servers.
                        Click the button below to start your journey.
                    </Paragraph>
                </div>
            ),
        },
    ];

    return (
        <Modal
            open={visible}
            title="Initial Setup Wizard"
            footer={[
                current > 0 && current < 3 && (
                    <Button key="back" onClick={() => setCurrent(current - 1)}>
                        Previous
                    </Button>
                ),
                current < 3 ? (
                    <Button key="next" type="primary" onClick={handleNext} loading={loading}>
                        Next
                    </Button>
                ) : (
                    <Button key="finish" type="primary" onClick={onComplete}>
                        Go to Dashboard
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
