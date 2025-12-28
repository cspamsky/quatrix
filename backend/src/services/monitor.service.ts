import systeminformation from 'systeminformation';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger.js';

class MonitorService {
    private io: SocketIOServer | null = null;
    private interval: NodeJS.Timeout | null = null;
    private readonly UPDATE_INTERVAL = 2000; // 2 seconds

    /**
     * Initialize the monitoring service with Socket.IO instance
     */
    init(io: SocketIOServer) {
        this.io = io;
        this.startMonitoring();
        logger.info('📊 MonitorService: Initialized');
    }

    /**
     * Start the periodic monitoring interval
     */
    private startMonitoring() {
        if (this.interval) clearInterval(this.interval);

        this.interval = setInterval(async () => {
            try {
                if (!this.io) return;
                const stats = await this.getSystemStats();
                this.io.emit('system:stats', stats);
            } catch (error) {
                logger.error('MonitorService: Error fetching system stats:', error);
            }
        }, this.UPDATE_INTERVAL);
    }

    /**
     * Fetch current system statistics
     */
    async getSystemStats() {
        try {
            const [cpu, mem, disk, fs] = await Promise.all([
                systeminformation.currentLoad(),
                systeminformation.mem(),
                systeminformation.fsSize(),
                systeminformation.fsStats()
            ]);

            // Filter for the main disk (usually C: or /)
            // For now, we take the first one or the one with biggest size
            const mainDisk = disk.length > 0 ? disk[0] : { size: 0, used: 0, use: 0 };

            return {
                timestamp: Date.now(),
                cpu: {
                    load: Math.round(cpu.currentLoad),
                    cores: cpu.cpus.map(c => Math.round(c.load)),
                    user: cpu.currentLoadUser,
                    system: cpu.currentLoadSystem
                },
                memory: {
                    total: mem.total,
                    used: mem.active,
                    free: mem.available,
                    percentage: Math.round((mem.active / mem.total) * 100)
                },
                disk: {
                    total: mainDisk.size,
                    used: mainDisk.used,
                    percentage: Math.round(mainDisk.use)
                },
                uptime: process.uptime()
            };
        } catch (error) {
            logger.error('Failed to get system stats', error);
            throw error;
        }
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

export const monitorService = new MonitorService();
