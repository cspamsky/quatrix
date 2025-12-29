import api from './api';

interface Settings {
    id: number;
    steamcmdPath: string | null;
    serversPath: string | null;
    isConfigured: boolean;
}

const API_URL = '/api/settings';

export const settingsService = {
    async getSettings(): Promise<{ success: boolean; data: Settings }> {
        const response = await api.get(`${API_URL}/`);
        return response.data;
    },

    async updateSettings(data: { steamcmdPath: string; serversPath: string }): Promise<{ success: boolean; data: Settings }> {
        const response = await api.post(`${API_URL}/`, data);
        return response.data;
    },

    async installSteamCMD(): Promise<{ success: boolean; message: string }> {
        const response = await api.post(`${API_URL}/install`, {});
        return response.data;
    },

    async resetSetup(): Promise<{ success: boolean; message: string }> {
        const response = await api.post(`${API_URL}/reset`, {});
        return response.data;
    },
};
