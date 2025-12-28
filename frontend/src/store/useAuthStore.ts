import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserInfo } from '../types/auth';

interface AuthState {
    user: UserInfo | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: UserInfo, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
            logout: () => set({ user: null, token: null, isAuthenticated: false }),
        }),
        {
            name: 'quatrix-auth',
        }
    )
);
