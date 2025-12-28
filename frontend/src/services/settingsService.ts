import axios from 'axios';

interface Settings {
    id: number;
    steamcmdPath: string | null;
    serversPath: string | null;
    isConfigured: boolean;
}

const API_URL = '/api/settings';

const getHeader = () => {
    const token = JSON.parse(localStorage.getItem('quatrix-auth') || '{}')?.state?.token;
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const settingsService = {
    async getSettings(): Promise<{ success: boolean; data: Settings }> {
        const response = await axios.get(`${API_URL}/`, getHeader());
        return response.data;
    },

    async updateSettings(data: { steamcmdPath: string; serversPath: string }): Promise<{ success: boolean; data: Settings }> {
        const response = await axios.post(`${API_URL}/`, data, getHeader());
        return response.data;
    },

    async installSteamCMD(): Promise<{ success: boolean; message: string }> {
        const response = await axios.post(`${API_URL}/install`, {}, getHeader());
        return response.data;
    },

    async resetSetup(): Promise<{ success: boolean; message: string }> {
        const response = await axios.post(`${API_URL}/reset`, {}, getHeader());
        return response.data;
    },
};
