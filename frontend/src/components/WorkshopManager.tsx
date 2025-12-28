import React, { useState } from 'react';
import { Form, Input, Button, Typography, Space, Divider, message } from 'antd';
import { GlobalOutlined, SaveOutlined, RocketOutlined, DeleteOutlined } from '@ant-design/icons';
import { serverService } from '../services/serverService';

const { Title, Text } = Typography;

interface WorkshopManagerProps {
    server: any;
    onUpdate: () => void;
}

const WorkshopManager: React.FC<WorkshopManagerProps> = ({ server, onUpdate }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const response = await serverService.updateServer(server.id, {
                workshopCollection: values.workshopCollection || null,
                workshopMapId: values.workshopMapId || null
            });
            if (response.success) {
                message.success('Workshop settings updated successfully');
                onUpdate();
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to update workshop settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '0' }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <GlobalOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <Title level={5} style={{ marginTop: 4, marginBottom: 2 }}>Workshop Settings</Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Manage maps and collections.
                </Text>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                    workshopCollection: server.workshopCollection || '',
                    workshopMapId: server.workshopMapId || ''
                }}
                size="small"
            >
                <Space direction="vertical" style={{ width: '100%' }} size={4}>
                    <Form.Item
                        name="workshopCollection"
                        label={<Space size={4}><GlobalOutlined /><span style={{ fontSize: 12 }}>Collection ID</span></Space>}
                        style={{ marginBottom: 4 }}
                    >
                        <Input placeholder="e.g. 3012345678" />
                    </Form.Item>

                    <Form.Item
                        name="workshopMapId"
                        label={<Space size={4}><RocketOutlined /><span style={{ fontSize: 12 }}>Start Map ID</span></Space>}
                        style={{ marginBottom: 0 }}
                    >
                        <Input placeholder="e.g. 3087654321" />
                    </Form.Item>

                    <Divider style={{ margin: '8px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => form.resetFields()}
                            size="small"
                        >
                            Reset
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={loading}
                            size="small"
                        >
                            Save Settings
                        </Button>
                    </div>
                </Space>
            </Form>
        </div>
    );
};

export default WorkshopManager;
