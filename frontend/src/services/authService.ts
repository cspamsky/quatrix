import api from './api';
import { LoginCredentials, RegisterCredentials, AuthResponse, UserInfo } from '../types/auth';

export const authService = {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const response = await api.post('/api/auth/login', credentials);
        return response.data;
    },

    async register(credentials: RegisterCredentials): Promise<AuthResponse> {
        const response = await api.post('/api/auth/register', credentials);
        return response.data;
    },

    async getMe(): Promise<{ success: boolean; data: { user: UserInfo } }> {
        const response = await api.get('/api/auth/me');
        return response.data;
    },

    async changePassword(data: any): Promise<{ success: boolean; message: string }> {
        const response = await api.post('/api/auth/change-password', data);
        return response.data;
    },
};
