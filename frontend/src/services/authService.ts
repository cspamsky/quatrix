import axios from 'axios';
import { LoginCredentials, RegisterCredentials, AuthResponse, UserInfo } from '../types/auth';

const API_URL = '/api/auth';

export const authService = {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const response = await axios.post(`${API_URL}/login`, credentials);
        return response.data;
    },

    async register(credentials: RegisterCredentials): Promise<AuthResponse> {
        const response = await axios.post(`${API_URL}/register`, credentials);
        return response.data;
    },

    async getMe(token: string): Promise<{ success: boolean; data: { user: UserInfo } }> {
        const response = await axios.get(`${API_URL}/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    },

    async changePassword(data: any): Promise<{ success: boolean; message: string }> {
        const token = JSON.parse(localStorage.getItem('quatrix-auth') || '{}')?.state?.token;
        const response = await axios.post(`${API_URL}/change-password`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    },
};
