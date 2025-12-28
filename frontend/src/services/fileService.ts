/// <reference types="vite/client" />
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getAuthHeader = () => {
    const token = JSON.parse(localStorage.getItem('quatrix-auth') || '{}')?.state?.token;
    return { Authorization: `Bearer ${token}` };
};

export interface ConfigFile {
    name: string;
    size: number;
    updatedAt: string;
}

export const fileService = {
    async listFiles(serverId: string) {
        const response = await axios.get<{ success: boolean; data: ConfigFile[] }>(
            `${API_URL}/api/servers/${serverId}/files`,
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    async getFileContent(serverId: string, filename: string) {
        const response = await axios.get<{ success: boolean; data: string }>(
            `${API_URL}/api/servers/${serverId}/files/${filename}`,
            { headers: getAuthHeader() }
        );
        return response.data;
    },

    async saveFileContent(serverId: string, filename: string, content: string) {
        const response = await axios.put<{ success: boolean; message: string }>(
            `${API_URL}/api/servers/${serverId}/files/${filename}`,
            { content },
            { headers: getAuthHeader() }
        );
        return response.data;
    }
};
