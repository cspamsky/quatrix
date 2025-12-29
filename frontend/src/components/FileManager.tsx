import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Space,
    Breadcrumb,
    Input,
    Modal,
    Upload,
    Typography,
    Tooltip,
    Popconfirm,
    Empty,
    Dropdown,
    App,
    Menu
} from 'antd';
import Editor from '@monaco-editor/react';
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
    InboxOutlined,
    AppstoreOutlined,
    BarsOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { fileService, FileEntry } from '../services/fileService';
import { useThemeStore } from '../store/useThemeStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface FileManagerProps {
    serverId: string;
}

const FileManager: React.FC<FileManagerProps> = ({ serverId }) => {
    const { t } = useTranslation();
    const { message: messageApi } = App.useApp();
    const { darkMode } = useThemeStore();
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [searchText, setSearchText] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; record: FileEntry | null }>({ visible: false, x: 0, y: 0, record: null });

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
            messageApi.info(t('files.folder_download_not_supported'));
            return;
        }
        messageApi.info(t('files.processing_downloading'));
        fileService.downloadFile(serverId, file.path);
    };

    const handleRecycle = async (paths: string[]) => {
        try {
            await fileService.recyclePaths(serverId, paths);
            messageApi.success(t('files.recycle_success'));
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error(t('files.recycle_fail') + ': ' + (error.response?.data?.error || error.message));
        }
    };

    const handlePermanentDelete = async (paths: string[]) => {
        try {
            await fileService.deletePaths(serverId, paths);
            messageApi.success(t('files.delete_success'));
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error(t('files.delete_fail') + ': ' + (error.response?.data?.error || error.message));
        }
    };

    const handleRestore = async (paths: string[]) => {
        try {
            await fileService.restorePaths(serverId, paths);
            messageApi.success(t('files.restore_success'));
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error(t('files.restore_fail') + ': ' + (error.response?.data?.error || error.message));
        }
    };

    const handleEmptyTrash = async () => {
        try {
            await fileService.emptyTrash(serverId);
            messageApi.success(t('files.trash_cleared'));
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error(t('common.error') + ': ' + (error.response?.data?.error || error.message));
        }
    };

    const handleArchive = async () => {
        if (!archiveName.trim() || selectedRowKeys.length === 0) return;
        try {
            // Prepend current path so the zip is created in the current directory
            const finalName = currentPath ? `${currentPath}/${archiveName.trim()}` : archiveName.trim();
            await fileService.archivePaths(serverId, selectedRowKeys as string[], finalName);
            messageApi.success(t('files.archive_success'));
            setIsArchiveModalVisible(false);
            setArchiveName('');
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error(t('files.archive_fail') + ': ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDownloadZip = async (paths: string[]) => {
        const hide = messageApi.loading(t('files.processing_zipping'), 0);
        try {
            const zipName = `download_${dayjs().format('YYYYMMDD_HHmmss')}.zip`;
            const finalName = currentPath ? `${currentPath}/${zipName}` : zipName;

            // 1. Create Archive
            await fileService.archivePaths(serverId, paths, finalName);

            // 2. Download it
            await fileService.downloadFile(serverId, finalName);

            messageApi.success(t('files.zip_download_started'));
            hide();
            loadFiles(currentPath);
        } catch (error: any) {
            hide();
            messageApi.error(t('files.archive_fail') + ': ' + error.message);
        }
    };

    const handleUnzip = async (file: FileEntry) => {
        try {
            await fileService.unzipPath(serverId, file.path);
            messageApi.success(t('files.unzip_success'));
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error(t('files.unzip_fail') + ': ' + (error.response?.data?.error || error.message));
        }
    };

    const handleRename = async () => {
        if (!targetItem || !pathValue.trim()) return;
        try {
            const folder = currentPath ? currentPath + '/' : '';
            await fileService.renamePath(serverId, targetItem.path, folder + pathValue.trim());
            messageApi.success(t('files.rename_success'));
            setIsRenameModalVisible(false);
            setTargetItem(null);
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error(t('files.rename_fail') + ': ' + (error.response?.data?.error || error.message));
        }
    };

    const handleCreateFolder = async () => {
        if (!pathValue.trim()) return;
        try {
            const newPath = currentPath ? `${currentPath}/${pathValue.trim()}` : pathValue.trim();
            await fileService.createDirectory(serverId, newPath);
            messageApi.success(t('files.folder_created'));
            setIsNewFolderModalVisible(false);
            setPathValue('');
            loadFiles(currentPath);
        } catch (error: any) {
            messageApi.error(t('files.folder_fail') + ': ' + (error.response?.data?.error || error.message));
        }
    };

    // Clipboard Logic
    const handleCut = (paths: string[]) => {
        setClipboard({ paths, type: 'cut' });
        messageApi.info(`${paths.length} ${t('files.cut_info')}`);
    };

    const handlePaste = async () => {
        if (!clipboard) return;
        const hide = messageApi.loading(t('files.processing_pasting'), 0);
        try {
            // Using rename for "Move" operation
            for (const srcPath of clipboard.paths) {
                const fileName = srcPath.split('/').pop() || '';
                const destPath = currentPath ? `${currentPath}/${fileName}` : fileName;
                await fileService.renamePath(serverId, srcPath, destPath);
            }
            hide();
            messageApi.success(t('files.paste_success'));
            setClipboard(null);
            loadFiles(currentPath);
        } catch (error: any) {
            hide();
            messageApi.error(t('files.paste_fail') + ': ' + error.message);
        }
    };

    const handleMoveFiles = async (sourcePaths: string[], targetFolder: string) => {
        const hide = messageApi.loading(t('files.processing_moving'), 0);
        try {
            for (const srcPath of sourcePaths) {
                // Check if moving folder into its own child - basic check
                if (targetFolder.startsWith(srcPath)) continue;

                const fileName = srcPath.split('/').pop() || '';
                const destPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;

                if (srcPath === destPath) continue;

                await fileService.renamePath(serverId, srcPath, destPath);
            }
            hide();
            messageApi.success(t('files.move_success'));
            loadFiles(currentPath);
        } catch (error: any) {
            hide();
            messageApi.error(t('files.move_fail') + ': ' + error.message);
        }
    };

    const openEditor = async (file: FileEntry) => {
        try {
            const data = await fileService.getFileContent(serverId, file.path);
            setFileContent(data.content);
            setEditingFile(file.path);
        } catch (error) {
            messageApi.error(t('files.open_fail'));
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            if (editingFile) return; // Ignore if editing a file

            if (e.key === 'F2') {
                e.preventDefault();
                if (selectedRowKeys.length === 1) {
                    const file = files.find(f => f.path === selectedRowKeys[0]);
                    if (file) {
                        setTargetItem(file);
                        setPathValue(file.name);
                        setIsRenameModalVisible(true);
                    }
                }
            } else if (e.key === 'Delete') {
                e.preventDefault();
                if (selectedRowKeys.length > 0) {
                    Modal.confirm({
                        title: isTrashBin ? t('files.permanent_delete') + "?" : t('files.recycle') + "?",
                        onOk: () => isTrashBin ? handlePermanentDelete(selectedRowKeys as string[]) : handleRecycle(selectedRowKeys as string[])
                    });
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                setSelectedRowKeys(files.map(f => f.path));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedRowKeys.length === 1) {
                    const file = files.find(f => f.path === selectedRowKeys[0]);
                    if (file) {
                        file.isDirectory ? handleNavigate(file.path) : openEditor(file);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [files, selectedRowKeys, editingFile, isTrashBin]);

    const saveFile = async () => {
        if (!editingFile) return;
        try {
            await fileService.saveFileContent(serverId, editingFile, fileContent);
            messageApi.success(t('files.save_success'));
            // Keep in editor or close? Usually good to close or show saved status.
            // Let's keep it open but maybe show a success message.
        } catch (error: any) {
            messageApi.error(t('files.save_fail') + ': ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const hide = messageApi.loading(`${t('files.uploading')} ${files.length} ${t('files.files')}...`, 0);
        try {
            await fileService.uploadFiles(serverId, currentPath, files);
            hide();
            messageApi.success(t('files.upload_success'));
            loadFiles(currentPath);
        } catch (error: any) {
            hide();
            messageApi.error(t('files.upload_fail') + ': ' + (error.message));
        }
    };

    const handleContextMenu = (record: FileEntry, e: React.MouseEvent) => {
        e.preventDefault();
        if (isTrashBin) return; // No context menu in trash for now
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            record
        });
    };

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [contextMenu]);

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

    const formatSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${['B', 'KB', 'MB', 'GB'][i]}`;
    };

    const columns = [
        {
            title: t('files.name'),
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
            title: t('files.size'),
            dataIndex: 'size',
            key: 'size',
            width: 100,
            render: (size: number, record: FileEntry) => record.isDirectory ? '-' : formatSize(size),
        },
        {
            title: t('files.modified'),
            dataIndex: 'modified',
            key: 'modified',
            width: 180,
            render: (modified: string) => dayjs(modified).format('DD.MM.YYYY HH:mm'),
            responsive: ['md' as const],
        },
        {
            title: t('common.actions'),
            key: 'actions',
            width: 150,
            render: (_: any, record: FileEntry) => (
                <Space>
                    {isTrashBin ? (
                        <>
                            <Tooltip title={t('files.restore')}>
                                <Button icon={<RollbackOutlined />} size="small" onClick={() => handleRestore([record.path])} />
                            </Tooltip>
                            <Popconfirm title={t('files.permanent_delete') + '?'} onConfirm={() => handlePermanentDelete([record.path])}>
                                <Button icon={<DeleteOutlined />} size="small" danger />
                            </Popconfirm>
                        </>
                    ) : (
                        <>
                            {record.name.endsWith('.zip') && (
                                <Tooltip title={t('files.unzip')}>
                                    <Button icon={<FileZipOutlined />} size="small" onClick={() => handleUnzip(record)} />
                                </Tooltip>
                            )}
                            {!record.isDirectory && (
                                <Button icon={<DownloadOutlined />} size="small" onClick={() => handleDownload(record)} />
                            )}
                            <Dropdown menu={{
                                items: [
                                    { key: 'rename', icon: <EditOutlined />, label: t('files.rename'), onClick: () => { setTargetItem(record); setPathValue(record.name); setIsRenameModalVisible(true); } },
                                    { key: 'cut', icon: <ScissorOutlined />, label: t('files.cut'), onClick: () => handleCut([record.path]) },
                                ]
                            }} trigger={['click']}>
                                <Button size="small" icon={<EditOutlined />} />
                            </Dropdown>
                            <Popconfirm title={t('files.recycle') + '?'} onConfirm={() => handleRecycle([record.path])}>
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
            title: (
                <span
                    onClick={() => loadFiles('')}
                    style={{ cursor: 'pointer' }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Internal move (Rename)
                        if (isDragging) return; // Ignore external file drop
                        if (selectedRowKeys.length === 0) return;

                        // Root path is empty string
                        const targetPath = '';
                        await handleMoveFiles(selectedRowKeys as string[], targetPath);
                    }}
                >
                    <HomeOutlined /> {t('files.root')}
                </span>
            )
        },
        ...(isTrashBin ? [{ title: t('files.trash') }] : currentPath.split('/').filter(Boolean).map((part, i, arr) => {
            const path = arr.slice(0, i + 1).join('/');
            return {
                title: (
                    <span
                        onClick={() => handleNavigate(path)}
                        style={{ cursor: 'pointer' }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isDragging) return;
                            if (selectedRowKeys.length === 0) return;

                            // Prevent moving into itself or current directory
                            if (path === currentPath) return;

                            await handleMoveFiles(selectedRowKeys as string[], path);
                        }}
                    >
                        {part}
                    </span>
                )
            };
        }))
    ];

    if (editingFile) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '600px', background: darkMode ? '#141414' : '#fff', padding: '16px', borderRadius: '8px', border: `1px solid ${darkMode ? '#303030' : '#f0f0f0'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <Space>
                        <FileOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                        <Title level={5} style={{ margin: 0, color: darkMode ? 'rgba(255,255,255,0.85)' : 'initial' }}>{editingFile.split('/').pop()}</Title>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{editingFile}</Text>
                    </Space>
                    <Space>
                        <Button icon={<SaveOutlined />} type="primary" onClick={saveFile}>{t('common.save')}</Button>
                        <Button icon={<CloseOutlined />} onClick={() => setEditingFile(null)}>{t('common.close')}</Button>
                    </Space>
                </div>
                <div style={{ flex: 1, borderRadius: '4px', overflow: 'hidden', border: `1px solid ${darkMode ? '#303030' : '#f0f0f0'}` }}>
                    <Editor
                        height="100%"
                        language={getLanguage(editingFile)}
                        theme={darkMode ? 'vs-dark' : 'light'}
                        value={fileContent}
                        onChange={(value) => setFileContent(value || '')}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            fontFamily: "'Cascadia Code', Consolas, 'Courier New', monospace",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 10, bottom: 10 }
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div
            className="file-manager-container"
            style={{ position: 'relative', minHeight: '400px' }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
        >
            {isDragging && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(24, 144, 255, 0.2)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 1000,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        border: '2px dashed #1890ff',
                        borderRadius: '8px'
                    }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleDrop}
                >
                    <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
                        <InboxOutlined style={{ fontSize: '64px', color: '#1890ff' }} />
                        <Title level={3} style={{ color: '#1890ff', marginTop: '16px' }}>{t('files.upload_drop')}</Title>
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu.visible && contextMenu.record && (
                <div
                    style={{
                        position: 'fixed',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        zIndex: 1001,
                        background: darkMode ? '#1f1f1f' : '#fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        borderRadius: '4px',
                        padding: '4px 0',
                        minWidth: '150px'
                    }}
                >
                    <Menu
                        style={{ border: 'none', background: 'transparent' }}
                        items={[
                            {
                                key: 'open',
                                icon: contextMenu.record.isDirectory ? <FolderFilled /> : <EditOutlined />,
                                label: contextMenu.record.isDirectory ? t('common.open') : t('common.edit'),
                                onClick: () => {
                                    contextMenu.record!.isDirectory
                                        ? handleNavigate(contextMenu.record!.path)
                                        : openEditor(contextMenu.record!)
                                }
                            },
                            {
                                key: 'rename',
                                icon: <EditOutlined />,
                                label: t('files.rename'),
                                onClick: () => { setTargetItem(contextMenu.record); setPathValue(contextMenu.record!.name); setIsRenameModalVisible(true); }
                            },
                            !contextMenu.record.isDirectory ? {
                                key: 'download',
                                icon: <DownloadOutlined />,
                                label: t('common.download'),
                                onClick: () => handleDownload(contextMenu.record!)
                            } : {
                                key: 'download',
                                icon: <DownloadOutlined />,
                                label: t('files.download_zip'),
                                onClick: () => handleDownloadZip([contextMenu.record!.path])
                            },
                            {
                                key: 'cut',
                                icon: <ScissorOutlined />,
                                label: t('files.cut'),
                                onClick: () => handleCut([contextMenu.record!.path])
                            },
                            {
                                type: 'divider'
                            },
                            {
                                key: 'delete',
                                icon: <DeleteOutlined />,
                                label: t('common.delete'),
                                danger: true,
                                onClick: () => handleRecycle([contextMenu.record!.path])
                            }
                        ].filter(Boolean) as any}
                    />
                </div>
            )}
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <Space wrap>
                        <Button icon={<ArrowLeftOutlined />} disabled={!currentPath && !isTrashBin} onClick={handleBack}>{t('files.back')}</Button>
                        <Button icon={<ReloadOutlined />} onClick={() => loadFiles(currentPath)}>{t('files.refresh')}</Button>

                        {!isTrashBin && (
                            <>
                                <Button icon={<PlusOutlined />} onClick={() => { setPathValue(''); setIsNewFolderModalVisible(true); }}>{t('files.new_folder')}</Button>
                                <Button icon={<UploadOutlined />} onClick={() => setIsUploadModalVisible(true)}>{t('files.upload')}</Button>
                                {clipboard && (
                                    <Button icon={<SnippetsOutlined />} type="primary" onClick={handlePaste}>{t('files.paste')} ({clipboard.paths.length})</Button>
                                )}
                            </>
                        )}

                        {selectedRowKeys.length > 0 && (
                            <>
                                <Popconfirm title={isTrashBin ? t('files.permanent_delete') + "?" : t('files.recycle') + "?"} onConfirm={() => isTrashBin ? handlePermanentDelete(selectedRowKeys as string[]) : handleRecycle(selectedRowKeys as string[])}>
                                    <Button icon={<DeleteOutlined />} danger>{t('files.delete_selected')} ({selectedRowKeys.length})</Button>
                                </Popconfirm>
                                {!isTrashBin && (
                                    <>
                                        <Button icon={<FileZipOutlined />} onClick={() => { setArchiveName(''); setIsArchiveModalVisible(true); }}>{t('files.archive')}</Button>
                                        <Button icon={<DownloadOutlined />} onClick={() => handleDownloadZip(selectedRowKeys as string[])}>{t('files.download_zip')}</Button>
                                        <Button icon={<ScissorOutlined />} onClick={() => handleCut(selectedRowKeys as string[])}>{t('files.cut')}</Button>
                                    </>
                                )}
                                {isTrashBin && (
                                    <Button icon={<RollbackOutlined />} onClick={() => handleRestore(selectedRowKeys as string[])}>{t('files.restore')}</Button>
                                )}
                            </>
                        )}

                        {!isTrashBin ? (
                            <Button icon={<RestOutlined />} onClick={() => loadFiles('.quatrix_trash')}>{t('files.trash')}</Button>
                        ) : (
                            <Popconfirm title={t('common.unsaved_changes')} onConfirm={handleEmptyTrash}>
                                <Button icon={<ClearOutlined />} danger>{t('files.empty_trash')}</Button>
                            </Popconfirm>
                        )}

                    </Space>
                    <Space>
                        <Button.Group>
                            <Button
                                icon={<BarsOutlined />}
                                type={viewMode === 'list' ? 'primary' : 'default'}
                                onClick={() => setViewMode('list')}
                            />
                            <Button
                                icon={<AppstoreOutlined />}
                                type={viewMode === 'grid' ? 'primary' : 'default'}
                                onClick={() => setViewMode('grid')}
                            />
                        </Button.Group>
                        <Input placeholder={t('files.search')} prefix={<SearchOutlined />} style={{ width: 200 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                    </Space>
                </div>

                <Breadcrumb
                    items={breadcrumbItems}
                    style={{ padding: '8px', background: 'rgba(0,0,0,0.02)' }}
                />



                {viewMode === 'list' ? (
                    <Table
                        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                        columns={columns}
                        dataSource={filteredFiles.map(f => ({ ...f, key: f.path }))}
                        loading={loading}
                        pagination={false}
                        size="small"
                        locale={{ emptyText: <Empty description={isTrashBin ? t('files.trash_empty') : t('files.folder_empty')} /> }}
                        onRow={(record) => ({
                            onDoubleClick: () => record.isDirectory ? handleNavigate(record.path) : openEditor(record),
                            onContextMenu: (e) => handleContextMenu(record, e)
                        })}
                    />
                ) : (
                    <div style={{ padding: '16px', background: darkMode ? '#141414' : '#fff', borderRadius: '8px', minHeight: '300px' }}>
                        {filteredFiles.length === 0 ? (
                            <Empty description={isTrashBin ? t('files.trash_empty') : t('files.folder_empty')} />
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                                {filteredFiles.map(file => {
                                    const isSelected = selectedRowKeys.includes(file.path);
                                    return (
                                        <div
                                            key={file.path}
                                            style={{
                                                width: '100px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                background: isSelected ? (darkMode ? '#177ddc' : '#e6f7ff') : 'transparent',
                                                border: isSelected ? '1px solid #1890ff' : '1px solid transparent'
                                            }}
                                            onClick={(e) => {
                                                if (e.ctrlKey) {
                                                    const newKeys = isSelected
                                                        ? selectedRowKeys.filter(k => k !== file.path)
                                                        : [...selectedRowKeys, file.path];
                                                    setSelectedRowKeys(newKeys);
                                                } else {
                                                    setSelectedRowKeys([file.path]);
                                                }
                                            }}
                                            onDoubleClick={() => file.isDirectory ? handleNavigate(file.path) : openEditor(file)}
                                            onContextMenu={(e) => { handleContextMenu(file, e); if (!selectedRowKeys.includes(file.path)) setSelectedRowKeys([file.path]); }}
                                        >
                                            {file.isDirectory ? (
                                                <FolderFilled style={{ fontSize: '48px', color: '#faad14', marginBottom: '8px' }} />
                                            ) : (
                                                <FileOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '8px' }} />
                                            )}
                                            <Text
                                                ellipsis={{ tooltip: file.name }}
                                                style={{
                                                    maxWidth: '100%',
                                                    textAlign: 'center',
                                                    color: darkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                {file.name}
                                            </Text>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Status Bar */}
                <div style={{
                    padding: '8px 16px',
                    background: darkMode ? '#1f1f1f' : '#f5f5f5',
                    borderTop: `1px solid ${darkMode ? '#303030' : '#e0e0e0'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: darkMode ? 'rgba(255,255,255,0.65)' : '#666',
                    borderRadius: '0 0 8px 8px'
                }}>
                    <span>
                        {selectedRowKeys.length > 0
                            ? t('files.items_selected', { count: selectedRowKeys.length })
                            : t('files.total_files', { count: filteredFiles.length })}
                    </span>
                    <span>
                        {/* Future: Total size calculation could go here */}
                    </span>
                </div>
            </Space>

            <Modal title={t('files.rename_move')} open={isRenameModalVisible} onOk={handleRename} onCancel={() => setIsRenameModalVisible(false)} destroyOnHidden>
                <Input value={pathValue} onChange={(e) => setPathValue(e.target.value)} />
            </Modal>

            <Modal title={t('files.new_folder')} open={isNewFolderModalVisible} onOk={handleCreateFolder} onCancel={() => setIsNewFolderModalVisible(false)} destroyOnHidden>
                <Input value={pathValue} onChange={(e) => setPathValue(e.target.value)} />
            </Modal>

            <Modal title={t('files.upload_title')} open={isUploadModalVisible} onCancel={() => setIsUploadModalVisible(false)} footer={null} destroyOnHidden width={600}>
                <Upload.Dragger
                    name="files"
                    action={`${API_URL}/api/files/${serverId}/upload?path=${currentPath}`}
                    multiple
                    showUploadList={true}
                    onChange={(info) => {
                        if (info.file.status === 'done') {
                            loadFiles(currentPath);
                            messageApi.success(`${info.file.name} ${t('files.upload_success')}`);
                        } else if (info.file.status === 'error') {
                            messageApi.error(`${info.file.name} ${t('files.upload_fail')}`);
                        }
                    }}
                >
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">{t('files.upload_drop')}</p>
                    <p className="ant-upload-hint">{t('files.upload_hint')}</p>
                </Upload.Dragger>
            </Modal>

            <Modal title={t('files.archive')} open={isArchiveModalVisible} onOk={handleArchive} onCancel={() => setIsArchiveModalVisible(false)} destroyOnHidden>
                <Input placeholder={t('files.archive_name')} value={archiveName} onChange={(e) => setArchiveName(e.target.value)} addonAfter=".zip" />
            </Modal>
        </div>
    );
};

export default FileManager;
