export interface UserInfo {
    id: string;
    email: string;
    name?: string;
    role: string;
}

export interface AuthResponse {
    success: boolean;
    data: {
        token: string;
        user: UserInfo;
    };
}

export interface LoginCredentials {
    email: string;
    password?: string;
}

export interface RegisterCredentials {
    email: string;
    password?: string;
    name?: string;
}
