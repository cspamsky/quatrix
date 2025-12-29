import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Space,
    Breadcrumb,
    Input,
    Modal,
    message,
    Upload,
    Typography,
    Tooltip,
    Popconfirm,
    Empty,
    Dropdown
} from 'antd';
import {
    FolderFilled,
    FileOutlined,
    ArrowLeftOutlined,
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    PlusOutlined,
    UploadOutlined,
    HomeOutlined,
    SearchOutlined,
    SaveOutlined,
    CloseOutlined,
    FileZipOutlined,
    RestOutlined,
    ScissorOutlined,
    SnippetsOutlined,
    RollbackOutlined,
    ClearOutlined,
    ReloadOutlined,
    InboxOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { fileService, FileEntry } from '../services/fileService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface FileManagerProps {
    serverId: string;
}

const FileManager: React.FC<FileManagerProps> = ({ serverId }) => {
    const { t } = useTranslation();
    const [messageApi, contextHolder] = message.useMessage();
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [searchText, setSearchText] = useState('');

    // Editor State
    const [editingFile, setEditingFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState('');

    // Clipboard State (for Cut/Paste)
    const [clipboard, setClipboard] = useState<{ paths: string[], type: 'cut' | 'copy' } | null>(null);

    // Modals
    const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
    const [isNewFolderModalVisible, setIsNewFolderModalVisible] = useState(false);
    const [isArchiveModalVisible, setIsArchiveModalVisible] = useState(false);
    const [pathValue, setPathValue] = useState('');
    const [archiveName, setArchiveName] = useState('');
    const [targetItem, setTargetItem] = useState<FileEntry | null>(null);
    const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const isTrashBin = currentPath.startsWith('.quatrix_trash');

    const loadFiles = async (path: string = '') => {
        setLoading(true);
        try {
            const data = await fileService.listFiles(serverId, path);
            setFiles(data.files);
            setCurrentPath(data.currentPath);
            setSelectedRowKeys([]);
        } catch (error: any) {
            messageApi.error(t('common.error') + ': ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFiles();
    }, [serverId]);

    const handleNavigate = (path: string) => {
        loadFiles(path);
    };

    const handleBack = () => {
        if (currentPath === '.quatrix_trash') {
            loadFiles('');
            return;
        }
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        loadFiles(parts.join('/'));
    };

    const handleDownload = (file: FileEntry) => {
        if (file.isDirectory) {
            messageApi.info('Klasör indirme desteklenmiyor. Lütfen önce arşivleyin.');
            return;
        }
        fileService.downloadFile(serverId, file.path);
    };

    const handleRecycle = async (paths: string[]) => {
        try {
            await fileService.recyclePaths(serverId, paths);
            messageApi.success('Geri dönüşüm kutusuna taşındı');
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error('İşlem başarısız: ' + (error.response?.data?.error || error.message));
        }
    };

    const handlePermanentDelete = async (paths: string[]) => {
        try {
            await fileService.deletePaths(serverId, paths);
            messageApi.success('Kalıcı olarak silindi');
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error('Silme başarısız: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleRestore = async (paths: string[]) => {
        try {
            await fileService.restorePaths(serverId, paths);
            messageApi.success('Geri yüklendi');
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error('Geri yükleme başarısız: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleEmptyTrash = async () => {
        try {
            await fileService.emptyTrash(serverId);
            messageApi.success('Çöp kutusu boşaltıldı');
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error('İşlem başarısız');
        }
    };

    const handleArchive = async () => {
        if (!archiveName.trim() || selectedRowKeys.length === 0) return;
        try {
            // Prepend current path so the zip is created in the current directory
            const finalName = currentPath ? `${currentPath}/${archiveName.trim()}` : archiveName.trim();
            await fileService.archivePaths(serverId, selectedRowKeys as string[], finalName);
            messageApi.success('Arşiv oluşturuldu');
            setIsArchiveModalVisible(false);
            setArchiveName('');
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error('Arşivleme başarısız');
        }
    };

    const handleUnzip = async (file: FileEntry) => {
        try {
            await fileService.unzipPath(serverId, file.path);
            messageApi.success('Arşivden çıkarıldı');
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error('Çıkarma işlemi başarısız');
        }
    };

    const handleRename = async () => {
        if (!targetItem || !pathValue.trim()) return;
        try {
            const folder = currentPath ? currentPath + '/' : '';
            await fileService.renamePath(serverId, targetItem.path, folder + pathValue.trim());
            messageApi.success('Yeniden adlandırıldı');
            setIsRenameModalVisible(false);
            setTargetItem(null);
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error('İşlem başarısız');
        }
    };

    const handleCreateFolder = async () => {
        if (!pathValue.trim()) return;
        try {
            const newPath = currentPath ? `${currentPath}/${pathValue.trim()}` : pathValue.trim();
            await fileService.createDirectory(serverId, newPath);
            messageApi.success('Klasör oluşturuldu');
            setIsNewFolderModalVisible(false);
            setPathValue('');
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error('Klasör oluşturma başarısız');
        }
    };

    // Clipboard Logic
    const handleCut = (paths: string[]) => {
        setClipboard({ paths, type: 'cut' });
        messageApi.info(`${paths.length} öge kesildi. Hedef klasöre gidip yapıştırın.`);
    };

    const handlePaste = async () => {
        if (!clipboard) return;
        try {
            // Using rename for "Move" operation
            for (const srcPath of clipboard.paths) {
                const fileName = srcPath.split('/').pop() || '';
                const destPath = currentPath ? `${currentPath}/${fileName}` : fileName;
                await fileService.renamePath(serverId, srcPath, destPath);
            }
            messageApi.success('Yapıştırıldı');
            setClipboard(null);
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error('Yapıştırma başarısız: ' + error.message);
        }
    };

    const openEditor = async (file: FileEntry) => {
        try {
            const data = await fileService.getFileContent(serverId, file.path);
            setFileContent(data.content);
            setEditingFile(file.path);
        } catch (error) {
            messageApi.error('Dosya açılamadı');
        }
    };

    const saveFile = async () => {
        if (!editingFile) return;
        try {
            await fileService.saveFileContent(serverId, editingFile, fileContent);
            messageApi.success('Kaydedildi');
            setEditingFile(null);
        } catch (error) {
            messageApi.error('Kaydetme başarısız');
        }
    };

    const formatSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${['B', 'KB', 'MB', 'GB'][i]}`;
    };

    const columns = [
        {
            title: 'Ad',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: FileEntry) => (
                <Space onClick={() => record.isDirectory ? handleNavigate(record.path) : openEditor(record)} style={{ cursor: 'pointer', width: '100%' }}>
                    {record.isDirectory ? <FolderFilled style={{ color: '#faad14', fontSize: '18px' }} /> : <FileOutlined style={{ color: '#1890ff', fontSize: '18px' }} />}
                    <Text delete={isTrashBin}>{text}</Text>
                </Space>
            ),
            sorter: (a: FileEntry, b: FileEntry) => a.name.localeCompare(b.name),
        },
        {
            title: 'Boyut',
            dataIndex: 'size',
            key: 'size',
            width: 100,
            render: (size: number, record: FileEntry) => record.isDirectory ? '-' : formatSize(size),
        },
        {
            title: 'Son Değişiklik',
            dataIndex: 'modified',
            key: 'modified',
            width: 180,
            render: (modified: string) => dayjs(modified).format('DD.MM.YYYY HH:mm'),
            responsive: ['md' as const],
        },
        {
            title: 'İşlemler',
            key: 'actions',
            width: 150,
            render: (_: any, record: FileEntry) => (
                <Space>
                    {isTrashBin ? (
                        <>
                            <Tooltip title="Geri Yükle">
                                <Button icon={<RollbackOutlined />} size="small" onClick={() => handleRestore([record.path])} />
                            </Tooltip>
                            <Popconfirm title="Kalıcı olarak sil?" onConfirm={() => handlePermanentDelete([record.path])}>
                                <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
                        </>
                    ) : (
                        <>
                            {record.name.endsWith('.zip') && (
                                <Tooltip title="Arşivden Çıkar">
                                    <Button icon={<FileZipOutlined />} size="small" onClick={() => handleUnzip(record)} />
                                </Tooltip>
                            )}
                            {!record.isDirectory && (
                                <Button icon={<DownloadOutlined />} size="small" onClick={() => handleDownload(record)} />
                            )}
                            <Dropdown menu={{
                                items: [
                                    { key: 'rename', icon: <EditOutlined />, label: 'Yeniden Adlandır', onClick: () => { setTargetItem(record); setPathValue(record.name); setIsRenameModalVisible(true); } },
                                    { key: 'cut', icon: <ScissorOutlined />, label: 'Kes', onClick: () => handleCut([record.path]) },
                                ]
                            }} trigger={['click']}>
                                <Button size="small" icon={<EditOutlined />} />
                            </Dropdown>
                            <Popconfirm title="Geri dönüşüme taşı?" onConfirm={() => handleRecycle([record.path])}>
                                <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchText.toLowerCase()));

    const breadcrumbItems = [
        {
            title: <span onClick={() => loadFiles('')} style={{ cursor: 'pointer' }}><HomeOutlined /> Root</span>
        },
        ...(isTrashBin ? [{ title: 'Çöp Kutusu' }] : currentPath.split('/').filter(Boolean).map((part, i, arr) => ({
            title: <span onClick={() => handleNavigate(arr.slice(0, i + 1).join('/'))} style={{ cursor: 'pointer' }}>{part}</span>
        })))
    ];

    if (editingFile) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
                {contextHolder}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <Title level={5}>{editingFile}</Title>
                    <Space>
                        <Button icon={<SaveOutlined />} type="primary" onClick={saveFile}>Kaydet</Button>
                        <Button icon={<CloseOutlined />} onClick={() => setEditingFile(null)}>Kapat</Button>
                    </Space>
                </div>
                <Input.TextArea value={fileContent} onChange={(e) => setFileContent(e.target.value)} style={{ flex: 1, fontFamily: 'monospace', background: '#1e1e1e', color: '#d4d4d4' }} />
            </div>
        );
    }

    return (
        <div className="file-manager-container">
            {contextHolder}
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <Space wrap>
                        <Button icon={<ArrowLeftOutlined />} disabled={!currentPath && !isTrashBin} onClick={handleBack}>Geri</Button>
                        <Button icon={<ReloadOutlined />} onClick={() => loadFiles(currentPath)}>Yenile</Button>

                        {!isTrashBin && (
                            <>
                                <Button icon={<PlusOutlined />} onClick={() => { setPathValue(''); setIsNewFolderModalVisible(true); }}>Yeni Klasör</Button>
                                <Button icon={<UploadOutlined />} onClick={() => setIsUploadModalVisible(true)}>Yükle</Button>
                                {clipboard && (
                                    <Button icon={<SnippetsOutlined />} type="primary" onClick={handlePaste}>Yapıştır ({clipboard.paths.length})</Button>
                                )}
                            </>
                        )}

                        {selectedRowKeys.length > 0 && (
                            <>
                                <Popconfirm title={isTrashBin ? "Kalıcı sil?" : "Geri dönüşüme taşı?"} onConfirm={() => isTrashBin ? handlePermanentDelete(selectedRowKeys as string[]) : handleRecycle(selectedRowKeys as string[])}>
                                    <Button icon={<DeleteOutlined />} danger>Seçilileri Sil ({selectedRowKeys.length})</Button>
                                </Popconfirm>
                                {!isTrashBin && (
                                    <>
                                        <Button icon={<FileZipOutlined />} onClick={() => { setArchiveName(''); setIsArchiveModalVisible(true); }}>Arşivle</Button>
                                        <Button icon={<ScissorOutlined />} onClick={() => handleCut(selectedRowKeys as string[])}>Kes</Button>
                                    </>
                                )}
                                {isTrashBin && (
                                    <Button icon={<RollbackOutlined />} onClick={() => handleRestore(selectedRowKeys as string[])}>Geri Yükle</Button>
                                )}
                            </>
                        )}

                        {!isTrashBin ? (
                            <Button icon={<RestOutlined />} onClick={() => loadFiles('.quatrix_trash')}>Çöp Kutusu</Button>
                        ) : (
                            <Popconfirm title="Tüm çöp kutusunu boşalt?" onConfirm={handleEmptyTrash}>
                                <Button icon={<ClearOutlined />} danger>Çöpü Boşalt</Button>
                            </Popconfirm>
                        )}
                    </Space>
                    <Input placeholder="Ara..." prefix={<SearchOutlined />} style={{ width: 200 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                </div>

                <Breadcrumb
                    items={breadcrumbItems}
                    style={{ padding: '8px', background: 'rgba(0,0,0,0.02)' }}
                />

                <Table
                    rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                    columns={columns}
                    dataSource={filteredFiles.map(f => ({ ...f, key: f.path }))}
                    loading={loading}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: <Empty description={isTrashBin ? "Çöp Kutusu Boş" : "Klasör Boş"} /> }}
                    onRow={(record) => ({ onDoubleClick: () => record.isDirectory ? handleNavigate(record.path) : openEditor(record) })}
                />
            </Space>

            <Modal title="Yeniden Adlandır / Taşı" open={isRenameModalVisible} onOk={handleRename} onCancel={() => setIsRenameModalVisible(false)} destroyOnClose>
                <Input value={pathValue} onChange={(e) => setPathValue(e.target.value)} />
            </Modal>

            <Modal title="Yeni Klasör" open={isNewFolderModalVisible} onOk={handleCreateFolder} onCancel={() => setIsNewFolderModalVisible(false)} destroyOnClose>
                <Input value={pathValue} onChange={(e) => setPathValue(e.target.value)} />
            </Modal>

            <Modal title="Dosya Yükle" open={isUploadModalVisible} onCancel={() => setIsUploadModalVisible(false)} footer={null} destroyOnClose width={600}>
                <Upload.Dragger
                    name="files"
                    action={`${API_URL}/api/files/${serverId}/upload?path=${currentPath}`}
                    multiple
                    showUploadList={true}
                    onChange={(info) => {
                        if (info.file.status === 'done') {
                            loadFiles(currentPath);
                            messageApi.success(`${info.file.name} yüklendi`);
                        } else if (info.file.status === 'error') {
                            messageApi.error(`${info.file.name} yüklenemedi`);
                        }
                    }}
                >
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">Dosyaları buraya sürükleyin veya tıklayın</p>
                    <p className="ant-upload-hint">Tekli veya toplu dosya yükleme desteklenir.</p>
                </Upload.Dragger>
            </Modal>

            <Modal title="Arşivle (Zip)" open={isArchiveModalVisible} onOk={handleArchive} onCancel={() => setIsArchiveModalVisible(false)} destroyOnClose>
                <Input placeholder="Arşiv Adı (örn: backup)" value={archiveName} onChange={(e) => setArchiveName(e.target.value)} addonAfter=".zip" />
            </Modal>
        </div>
    );
};

export default FileManager;
