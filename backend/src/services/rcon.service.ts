import Rcon from 'rcon-srcds';
import { logger } from '../utils/logger';

interface RconConnection {
    client: Rcon;
    serverId: string;
    host: string;
    port: number;
}

class RconService {
    private connections: Map<string, RconConnection> = new Map();

    /**
     * Connect to a server via RCON
     */
    public async connect(serverId: string, host: string, port: number, password: string): Promise<void> {
        try {
            // Disconnect existing connection if any
            await this.disconnect(serverId);

            const RconConstructor: any = (Rcon as any).default || Rcon;
            const client = new RconConstructor({
                host,
                port,
                timeout: 5000,
            });

            await client.authenticate(password);

            this.connections.set(serverId, {
                client,
                serverId,
                host,
                port,
            });

            logger.info(`RCON connected to ${serverId} at ${host}:${port}`);
        } catch (error: any) {
            logger.error(`RCON connection failed for ${serverId}: ${error.message}`);
            throw new Error(`RCON connection failed: ${error.message}`);
        }
    }

    /**
     * Execute a command via RCON
     */
    public async execute(serverId: string, command: string): Promise<string> {
        const connection = this.connections.get(serverId);
        if (!connection) {
            throw new Error('RCON not connected. Please connect first.');
        }

        try {
            const response = await connection.client.execute(command);
            logger.debug(`RCON [${serverId}] Command: ${command} | Response: ${response}`);
            return typeof response === 'string' ? response : String(response);
        } catch (error: any) {
            logger.error(`RCON command failed for ${serverId}: ${error.message}`);
            throw new Error(`RCON command failed: ${error.message}`);
        }
    }

    /**
     * Disconnect from RCON
     */
    public async disconnect(serverId: string): Promise<void> {
        const connection = this.connections.get(serverId);
        if (connection) {
            try {
                connection.client.disconnect();
                this.connections.delete(serverId);
                logger.info(`RCON disconnected from ${serverId}`);
            } catch (error: any) {
                logger.error(`RCON disconnect error for ${serverId}: ${error.message}`);
            }
        }
    }

    /**
     * Check if connected
     */
    public isConnected(serverId: string): boolean {
        return this.connections.has(serverId);
    }

    /**
     * Get connection info
     */
    public getConnection(serverId: string): RconConnection | undefined {
        return this.connections.get(serverId);
    }

    /**
     * Disconnect all connections
     */
    public async disconnectAll(): Promise<void> {
        const promises = Array.from(this.connections.keys()).map(serverId =>
            this.disconnect(serverId)
        );
        await Promise.all(promises);
    }
}

export const rconService = new RconService();
