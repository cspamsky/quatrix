import Rcon from 'rcon-srcds';
import { logger } from '../utils/logger';

interface RconConnection {
    client: Rcon;
    serverId: string;
    host: string;
    port: number;
    password: string;
    isConnecting?: boolean;
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
                password,
            });

            logger.info(`RCON connected to ${serverId} at ${host}:${port}`);
        } catch (error: any) {
            logger.error(`RCON connection failed for ${serverId}: ${error.message}`);
            throw new Error(`RCON connection failed: ${error.message}`);
        }
    }

    /**
     * Execute a command via RCON with auto-reconnect attempt
     */
    public async execute(serverId: string, command: string, isRetry: boolean = false): Promise<string> {
        const connection = this.connections.get(serverId);
        if (!connection) {
            throw new Error('RCON not connected. Please connect first.');
        }

        try {
            const response = await connection.client.execute(command);
            logger.debug(`RCON [${serverId}] Command: ${command} | Response: ${response}`);
            return typeof response === 'string' ? response : String(response);
        } catch (error: any) {
            // If connection failed, try one reconnect if this isn't already a retry
            if (!isRetry && (error.message.includes('broken pipe') || error.message.includes('ECONNRESET') || error.message.includes('not authenticated') || error.message.includes('timeout'))) {
                logger.warn(`RCON connection lost for ${serverId}, attempting auto-reconnect...`);
                try {
                    await this.connect(serverId, connection.host, connection.port, connection.password);
                    return await this.execute(serverId, command, true);
                } catch (reconnectError: any) {
                    logger.error(`RCON auto-reconnect failed for ${serverId}: ${reconnectError.message}`);
                    throw new Error(`RCON connection lost and auto-reconnect failed.`);
                }
            }

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
                // Some versions might not have disconnect() or error out if already closed
                if (connection.client && typeof connection.client.disconnect === 'function') {
                    connection.client.disconnect();
                }
                this.connections.delete(serverId);
                logger.info(`RCON disconnected from ${serverId}`);
            } catch (error: any) {
                logger.error(`RCON disconnect error for ${serverId}: ${error.message}`);
                this.connections.delete(serverId); // Always remove from map
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
        const serverIds = Array.from(this.connections.keys());
        for (const serverId of serverIds) {
            await this.disconnect(serverId);
        }
    }
}

export const rconService = new RconService();
