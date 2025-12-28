import axios from 'axios';

const API_URL = '/api/servers';

// Common header helper
const getHeader = () => {
    const token = JSON.parse(localStorage.getItem('quatrix-auth') || '{}')?.state?.token;
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const serverService = {
    async getMyServers() {
        const response = await axios.get(`${API_URL}/`, getHeader());
        return response.data;
    },

    async createServer(data: { name: string; description?: string; gsltToken: string }) {
        const response = await axios.post(`${API_URL}/`, data, getHeader());
        return response.data;
    },

    async startServer(id: string) {
        const response = await axios.post(`${API_URL}/${id}/start`, {}, getHeader());
        return response.data;
    },

    async stopServer(id: string) {
        const response = await axios.post(`${API_URL}/${id}/stop`, {}, getHeader());
        return response.data;
    },

    async deleteServer(id: string) {
        const response = await axios.delete(`${API_URL}/${id}`, getHeader());
        return response.data;
    },

    async validateServer(id: string) {
        const response = await axios.post(`${API_URL}/${id}/validate`, {}, getHeader());
        return response.data;
    },

    async updateServer(id: string, data: { name?: string; description?: string }) {
        const response = await axios.put(`${API_URL}/${id}`, data, getHeader());
        return response.data;
    },
};
