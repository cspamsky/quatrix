
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: API_URL,
});

// Request interceptor for API calls
api.interceptors.request.use(
    (config) => {
        // Try to get token from Zustand store first, then fall back to localStorage
        const token = useAuthStore.getState().token ||
            JSON.parse(localStorage.getItem('quatrix-auth') || '{}')?.state?.token;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for API calls
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized error - clear auth and redirect
            useAuthStore.getState().logout();
            // Optional: window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
