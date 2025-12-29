import { Server as SocketIOServer, Socket } from 'socket.io';
import Rcon from 'rcon-srcds';
import { processService } from './process.service';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

class TerminalService {
    private io: SocketIOServer | null = null;
    private rconConnections: Map<string, Rcon> = new Map();
    private terminalBuffers: Map<string, string[]> = new Map();
    private MAX_BUFFER_LINES = 500;

    /**
     * Initialize Terminal Service with Socket.io instance
     */
    public init(io: SocketIOServer) {
        this.io = io;
        this.setupSocketHandlers();
    }

    private setupSocketHandlers() {
        if (!this.io) return;

        this.io.on('connection', (socket: Socket) => {
            logger.info(`Terminal socket connection: ${socket.id}`);

            socket.on('terminal:join', async ({ serverId }) => {
                logger.info(`Client ${socket.id} joining terminal room for server ${serverId}`);
                socket.join(`terminal:${serverId}`);

                // Send buffered logs if available
                const buffer = this.terminalBuffers.get(serverId);
                if (buffer && buffer.length > 0) {
                    socket.emit('terminal:output', buffer.join(''));
                }

                // Check server status in DB
                const server = await prisma.server.findUnique({ where: { id: serverId } });
                if (server?.status === 'CREATING') {
                    if (!buffer || buffer.length === 0) {
                        socket.emit('terminal:output', '\x1b[33m[Quatrix] Server is currently being installed. Waiting for logs...\x1b[0m\n');
                    }
                }

                // If server is running, inform the client and ensure forwarding
                const isRunning = processService.isRunning(serverId);
                if (isRunning) {
                    socket.emit('terminal:status', { status: 'connected' });
                    this.attachOutputForwarding(serverId);
                }
            });

            socket.on('terminal:leave', ({ serverId }) => {
                socket.leave(`terminal:${serverId}`);
            });

            socket.on('terminal:command', async ({ serverId, command }) => {
                try {
                    const response = await this.executeCommand(serverId, command);
                    this.io?.to(`terminal:${serverId}`).emit('terminal:output', response + '\n');
                } catch (error: any) {
                    socket.emit('terminal:error', { message: error.message });
                }
            });

            socket.on('disconnect', () => {
                logger.info(`Terminal socket disconnected: ${socket.id}`);
            });
        });
    }

    /**
     * Forwards process stdout/stderr to the socket room
     */
    public attachOutputForwarding(serverId: string) {
        const process = processService.getProcess(serverId);
        if (!process) return;

        // Clear existing listeners to prevent duplication
        process.stdout?.removeAllListeners('data');
        process.stderr?.removeAllListeners('data');

        process.stdout?.on('data', (data) => {
            // Ensure compatibility with xterm.js by adding \r to \n
            const output = data.toString().replace(/\n/g, '\r\n');
            this.addToBuffer(serverId, output);
            this.io?.to(`terminal:${serverId}`).emit('terminal:output', output);
        });

        process.stderr?.on('data', (data) => {
            const output = `\x1b[31m${data.toString().replace(/\n/g, '\r\n')}\x1b[0m`;
            this.addToBuffer(serverId, output);
            this.io?.to(`terminal:${serverId}`).emit('terminal:output', output);
        });
    }

    private addToBuffer(serverId: string, data: string) {
        let buffer = this.terminalBuffers.get(serverId);
        if (!buffer) {
            buffer = [];
            this.terminalBuffers.set(serverId, buffer);
        }

        buffer.push(data);
        if (buffer.length > this.MAX_BUFFER_LINES) {
            buffer.shift();
        }
    }

    /**
     * Public method to stream arbitrary data to a server's terminal
     */
    public streamOutput(serverId: string, data: string) {
        // Data is already formatted in process.service.ts
        this.addToBuffer(serverId, data);
        this.io?.to(`terminal:${serverId}`).emit('terminal:output', data);
    }

    public sendProgress(serverId: string, percent: number) {
        this.io?.to(`terminal:${serverId}`).emit('terminal:progress', { percent });
    }

    /**
     * Clears the terminal buffer for a server
     */
    public clearBuffer(serverId: string) {
        this.terminalBuffers.delete(serverId);
    }

    /**
     * Executes a command via RCON if possible, otherwise falls back to stdin
     */
    public async executeCommand(serverId: string, command: string): Promise<string> {
        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (!server) throw new Error('Server not found');

        const process = processService.getProcess(serverId);
        if (!process) throw new Error('Server is not running');

        // Try RCON for game commands if it's running
        try {
            let rcon = this.rconConnections.get(serverId);
            if (!rcon || !rcon.isConnected()) {
                const RconConstructor: any = (Rcon as any).default || Rcon;
                const newRcon = new RconConstructor({
                    host: '127.0.0.1',
                    port: server.port,
                });
                await newRcon.authenticate(server.rconPassword);
                this.rconConnections.set(serverId, newRcon);
                rcon = newRcon;
            }
            const result = await (rcon as any).execute(command);
            return typeof result === 'string' ? result : String(result);
        } catch (error) {
            // Fallback to stdin if RCON fails
            logger.warn(`RCON failed for ${serverId}, falling back to stdin: ${error}`);
            process.stdin?.write(command + '\n');
            return `> ${command} (sent to stdin)`;
        }
    }
}

export const terminalService = new TerminalService();
