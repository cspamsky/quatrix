/// <reference types="vite/client" />
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getAuthHeader = () => {
    const authData = localStorage.getItem('quatrix-auth');
    if (!authData) return {};
    try {
        const token = JSON.parse(authData)?.state?.token;
        return { Authorization: `Bearer ${token}` };
    } catch (e) {
        return {};
    }
};

export interface FileEntry {
    name: string;
    isDirectory: boolean;
    size: number;
    modified: string;
    path: string;
}

export const fileService = {
    async listFiles(serverId: string, path: string = '') {
        const response = await axios.get<{ files: FileEntry[], currentPath: string }>(
            `${API_URL}/api/files/${serverId}/list`,
            {
                params: { path },
                headers: getAuthHeader()
            }
        );
        return response.data;
    },

    async getFileContent(serverId: string, path: string) {
        const response = await axios.get<{ content: string }>(
            `${API_URL}/api/files/${serverId}/read`,
            {
                params: { path },
                headers: getAuthHeader()
            }
        );
        return response.data;
    },

    async saveFileContent(serverId: string, path: string, content: string) {
        const response = await axios.post<{ success: boolean }>(
            `${API_URL}/api/files/${serverId}/write`,
            { path, content },
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    async deletePaths(serverId: string, paths: string[]) {
        const response = await axios.post<{ success: boolean }>(
            `${API_URL}/api/files/${serverId}/delete`,
            { paths },
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    async createDirectory(serverId: string, path: string) {
        const response = await axios.post<{ success: boolean }>(
            `${API_URL}/api/files/${serverId}/mkdir`,
            { path },
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    async renamePath(serverId: string, oldPath: string, newPath: string) {
        const response = await axios.post<{ success: boolean }>(
            `${API_URL}/api/files/${serverId}/rename`,
            { oldPath, newPath },
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    async downloadFile(serverId: string, path: string) {
        window.open(`${API_URL}/api/files/${serverId}/download?path=${encodeURIComponent(path)}`, '_blank');
    },

    async recyclePaths(serverId: string, paths: string[]) {
        const response = await axios.post<{ success: boolean }>(
            `${API_URL}/api/files/${serverId}/recycle`,
            { paths },
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    async restorePaths(serverId: string, paths: string[]) {
        const response = await axios.post<{ success: boolean }>(
            `${API_URL}/api/files/${serverId}/restore`,
            { paths },
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    async emptyTrash(serverId: string) {
        const response = await axios.post<{ success: boolean }>(
            `${API_URL}/api/files/${serverId}/empty-trash`,
            {},
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    async archivePaths(serverId: string, paths: string[], outputName: string) {
        const response = await axios.post<{ success: boolean }>(
            `${API_URL}/api/files/${serverId}/archive`,
            { paths, outputName },
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    async unzipPath(serverId: string, path: string) {
        const response = await axios.post<{ success: boolean }>(
            `${API_URL}/api/files/${serverId}/unzip`,
            { path },
            { headers: getAuthHeader() }
        );
        return response.data;
    }
};
