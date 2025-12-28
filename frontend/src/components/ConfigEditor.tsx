import React, { useState, useEffect } from 'react';
import { Layout, Menu, Input, Button, App, Empty, Spin, Typography, Space } from 'antd';
import { FileTextOutlined, SaveOutlined, ReloadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { fileService, ConfigFile } from '../services/fileService';
import { useTranslation } from 'react-i18next';

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface ConfigEditorProps {
    serverId: string;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ serverId }) => {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const [files, setFiles] = useState<ConfigFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchFiles();
    }, [serverId]);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const response = await fileService.listFiles(serverId);
            setFiles(response.data);
            if (response.data.length > 0 && !selectedFile) {
                handleFileSelect(response.data[0].name);
            }
        } catch (error) {
            message.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (filename: string) => {
        if (content !== originalContent) {
            if (!window.confirm(t('common.unsaved_changes'))) {
                return;
            }
        }

        setSelectedFile(filename);
        setLoading(true);
        try {
            const response = await fileService.getFileContent(serverId, filename);
            setContent(response.data);
            setOriginalContent(response.data);
        } catch (error) {
            message.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedFile) return;
        setSaving(true);
        try {
            await fileService.saveFileContent(serverId, selectedFile, content);
            setOriginalContent(content);
            message.success(t('config.saveSuccess'));
        } catch (error) {
            message.error(t('common.error'));
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = content !== originalContent;

    return (
        <Layout style={{ height: '500px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
            <Sider width={200} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
                <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
                    <Space>
                        <UnorderedListOutlined />
                        <Text strong>{t('config.files')}</Text>
                    </Space>
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={selectedFile ? [selectedFile] : []}
                    style={{ border: 'none', height: 'calc(100% - 46px)', overflowY: 'auto' }}
                    onClick={({ key }) => handleFileSelect(key)}
                    items={files.map(file => ({
                        key: file.name,
                        icon: <FileTextOutlined />,
                        label: file.name
                    }))}
                />
            </Sider>
            <Content style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={5} style={{ margin: 0 }}>
                        {selectedFile ? `${t('config.editing')}: ${selectedFile}` : t('config.selectFile')}
                    </Title>
                    <Space>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchFiles}
                            size="small"
                        >
                            {t('common.refresh')}
                        </Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSave}
                            loading={saving}
                            disabled={!selectedFile || !hasChanges}
                        >
                            {t('common.save')}
                        </Button>
                    </Space>
                </div>

                {loading && !content ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Spin>
                            <div style={{ padding: 20 }} />
                        </Spin>
                    </div>
                ) : selectedFile ? (
                    <TextArea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        style={{
                            flex: 1,
                            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                            fontSize: '13px',
                            resize: 'none',
                            whiteSpace: 'pre'
                        }}
                    />
                ) : (
                    <Empty description={t('config.selectFileDesc')} style={{ marginTop: '100px' }} />
                )}
            </Content>
        </Layout>
    );
};

export default ConfigEditor;
