import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, App, Empty, Spin, Typography, Space } from 'antd';
import { FileTextOutlined, SaveOutlined, ReloadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { fileService, FileEntry } from '../services/fileService';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/useThemeStore';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

interface ConfigEditorProps {
    serverId: string;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ serverId }) => {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const { darkMode } = useThemeStore();
    const [files, setFiles] = useState<FileEntry[]>([]);
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
            const result = await fileService.listFiles(serverId, 'cfg'); // Assuming 'cfg' or root
            const configFiles = result.files.filter(f => !f.isDirectory && (f.name.endsWith('.cfg') || f.name.endsWith('.ini')));
            setFiles(configFiles);
            if (configFiles.length > 0 && !selectedFile) {
                handleFileSelect(configFiles[0].name);
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
            const result = await fileService.getFileContent(serverId, filename);
            setContent(result.content);
            setOriginalContent(result.content);
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

    const getLanguage = (filename: string | null) => {
        if (!filename) return 'plaintext';
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'cfg':
            case 'ini':
                return 'ini';
            case 'json':
                return 'json';
            case 'sh':
            case 'bash':
                return 'shell';
            case 'txt':
            case 'log':
                return 'plaintext';
            default:
                return 'plaintext';
        }
    };

    const hasChanges = content !== originalContent;

    return (
        <Layout style={{ height: '600px', background: darkMode ? '#141414' : '#fff', border: `1px solid ${darkMode ? '#303030' : '#f0f0f0'}`, borderRadius: '8px', overflow: 'hidden' }}>
            <Sider width={200} theme={darkMode ? 'dark' : 'light'} style={{ borderRight: `1px solid ${darkMode ? '#303030' : '#f0f0f0'}`, background: darkMode ? '#141414' : '#fff' }}>
                <div style={{ padding: '12px', borderBottom: `1px solid ${darkMode ? '#303030' : '#f0f0f0'}` }}>
                    <Space>
                        <UnorderedListOutlined />
                        <Text strong style={{ color: darkMode ? 'rgba(255,255,255,0.85)' : 'initial' }}>{t('config.files')}</Text>
                    </Space>
                </div>
                <Menu
                    mode="inline"
                    theme={darkMode ? 'dark' : 'light'}
                    selectedKeys={selectedFile ? [selectedFile] : []}
                    style={{ border: 'none', height: 'calc(100% - 46px)', overflowY: 'auto', background: darkMode ? '#141414' : '#fff' }}
                    onClick={({ key }) => handleFileSelect(key)}
                    items={files.map(file => ({
                        key: file.name,
                        icon: <FileTextOutlined />,
                        label: file.name
                    }))}
                />
            </Sider>
            <Content style={{ padding: '16px', display: 'flex', flexDirection: 'column', background: darkMode ? '#1d1d1d' : '#fcfcfc' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={5} style={{ margin: 0, color: darkMode ? 'rgba(255,255,255,0.85)' : 'initial' }}>
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

                <div style={{ flex: 1, borderRadius: '4px', overflow: 'hidden', border: `1px solid ${darkMode ? '#303030' : '#f0f0f0'}` }}>
                    {loading && !content ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Spin>
                                <div style={{ padding: 20 }} />
                            </Spin>
                        </div>
                    ) : selectedFile ? (
                        <Editor
                            height="100%"
                            language={getLanguage(selectedFile)}
                            theme={darkMode ? 'vs-dark' : 'light'}
                            value={content}
                            onChange={(value) => setContent(value || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                fontFamily: "'Cascadia Code', Consolas, 'Courier New', monospace",
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 10, bottom: 10 }
                            }}
                        />
                    ) : (
                        <Empty description={t('config.selectFileDesc')} style={{ marginTop: '100px' }} />
                    )}
                </div>
            </Content>
        </Layout>
    );
};

export default ConfigEditor;

