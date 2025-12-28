import { create } from 'zustand';
import { SystemStats } from '../types/monitor';
import { socketService } from '../services/socket.service';

interface MonitorState {
    stats: SystemStats | null;
    isConnected: boolean;
    startMonitoring: () => void;
    stopMonitoring: () => void;
}

export const useMonitorStore = create<MonitorState>((set) => ({
    stats: null,
    isConnected: false,

    startMonitoring: () => {
        const socket = socketService.connect();

        if (socket.connected) {
            set({ isConnected: true });
        }

        socket.on('connect', () => {
            set({ isConnected: true });
        });

        socket.on('disconnect', () => {
            set({ isConnected: false });
        });

        socket.on('system:stats', (stats: SystemStats) => {
            set({ stats });
        });
    },

    stopMonitoring: () => {
        socketService.off('system:stats');
    }
}));
