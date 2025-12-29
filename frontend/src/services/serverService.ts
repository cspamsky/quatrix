import api from './api';

const API_URL = '/api/servers';

export const serverService = {
    async getMyServers() {
        const response = await api.get(`${API_URL}/`);
        return response.data;
    },

    async createServer(data: {
        name: string;
        description?: string;
        gsltToken: string;
        steamAuthKey?: string;
        rconPassword?: string;
        maxPlayers?: number;
        map?: string;
        port?: number;
        vacEnabled?: boolean;
        installPath?: string;
    }) {
        const response = await api.post(`${API_URL}/`, data);
        return response.data;
    },

    async startServer(id: string) {
        const response = await api.post(`${API_URL}/${id}/start`, {});
        return response.data;
    },

    async stopServer(id: string) {
        const response = await api.post(`${API_URL}/${id}/stop`, {});
        return response.data;
    },

    async forceStopServer(id: string) {
        const response = await api.post(`${API_URL}/${id}/force-stop`, {});
        return response.data;
    },

    async restartServer(id: string) {
        const response = await api.post(`${API_URL}/${id}/restart`, {});
        return response.data;
    },

    async deleteServer(id: string) {
        const response = await api.delete(`${API_URL}/${id}`);
        return response.data;
    },

    async validateServer(id: string) {
        const response = await api.post(`${API_URL}/${id}/validate`, {});
        return response.data;
    },

    async updateServer(id: string, data: {
        name?: string;
        description?: string;
        gsltToken?: string;
        steamAuthKey?: string;
        rconPassword?: string;
        maxPlayers?: number;
        map?: string;
        workshopCollection?: string;
        workshopMapId?: string;
        vacEnabled?: boolean;
        port?: number;
    }) {
        const response = await api.put(`${API_URL}/${id}`, data);
        return response.data;
    },
};
