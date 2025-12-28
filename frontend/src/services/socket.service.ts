/// <reference types="vite/client" />
import { io, Socket } from 'socket.io-client';

class SocketService {
    private socket: Socket | null = null;
    private static instance: SocketService;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public connect(): Socket {
        if (this.socket?.connected) return this.socket;

        const url = import.meta.env.VITE_API_URL || 'http://localhost:3000';

        console.log(`[SocketService] Connecting to ${url}...`);

        this.socket = io(url, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('[SocketService] Connected successfully');
        });

        this.socket.on('connect_error', (err) => {
            console.error('[SocketService] Connection error:', err);
        });

        this.socket.on('disconnect', (reason) => {
            console.warn('[SocketService] Disconnected:', reason);
        });

        return this.socket;
    }

    public getSocket(): Socket | null {
        return this.socket;
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Subscribe to a specific event
     */
    public on<T>(event: string, callback: (data: T) => void): void {
        if (!this.socket) this.connect();
        this.socket?.on(event, callback);
    }

    /**
     * Unsubscribe from a specific event
     */
    public off<T>(event: string, callback?: (data: T) => void): void {
        this.socket?.off(event, callback);
    }

    /**
     * Emit an event
     */
    public emit<T>(event: string, data: T): void {
        if (!this.socket) this.connect();
        this.socket?.emit(event, data);
    }
}

export const socketService = SocketService.getInstance();
