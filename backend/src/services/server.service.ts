import { prisma } from '../utils/prisma';
import fs from 'fs';
import { steamcmdService } from './steamcmd.service';
import { processService } from './process.service';
import { terminalService } from './terminal.service';
import { ApiError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

class ServerService {
    private readonly DEFAULT_PORT_START = 27015;
    private readonly DEFAULT_PORT_END = 27115;

    /**
     * List all servers for a user
     */
    public async getServersByUser(userId: string) {
        return prisma.server.findMany({
            where: { ownerId: userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Create a new server record and start installation
     */
    public async createServer(userId: string, data: {
        name: string;
        description?: string;
        gsltToken: string;
        steamAuthKey?: string;
        rconPassword?: string;
        maxPlayers?: number;
        map?: string;
    }) {
        // 1. Allocate ports
        const port = await this.allocatePort();
        const rconPort = port + 1000; // Common convention

        // 2. RCON password
        const rconPassword = data.rconPassword || Math.random().toString(36).slice(-10);

        // 3. Create DB record
        const server = await prisma.server.create({
            data: {
                name: data.name,
                description: data.description,
                ownerId: userId,
                port,
                rconPort,
                rconPassword,
                gsltToken: data.gsltToken,
                steamAuthKey: data.steamAuthKey,
                maxPlayers: data.maxPlayers || 10,
                map: data.map || 'de_dust2',
                status: 'CREATING',
                installPath: steamcmdService.getServerPath('pending') // Temporary
            }
        });

        // 4. Update install path with actual ID
        const actualPath = steamcmdService.getServerPath(server.id);
        await prisma.server.update({
            where: { id: server.id },
            data: { installPath: actualPath }
        });

        // 5. Start installation in background
        this.installServerBackground(server.id);

        return server;
    }

    /**
     * Start a CS2 server
     */
    public async startServer(serverId: string, userId: string) {
        const server = await this.getServerAndVerifyOwner(serverId, userId);

        if (server.status === 'CREATING') {
            throw new ApiError(400, 'Server is still being installed');
        }

        if (processService.isRunning(serverId)) {
            throw new ApiError(400, 'Server is already running');
        }

        await prisma.server.update({
            where: { id: serverId },
            data: { status: 'STARTING', lastStartedAt: new Date() }
        });

        try {
            await processService.startServer({
                id: server.id,
                port: server.port,
                map: server.map,
                maxPlayers: server.maxPlayers,
                gameMode: server.gameMode,
                gsltToken: server.gsltToken,
                steamAuthKey: server.steamAuthKey || undefined,
                rconPassword: server.rconPassword,
                workshopCollection: server.workshopCollection || undefined,
                workshopMapId: server.workshopMapId || undefined
            });

            await prisma.server.update({
                where: { id: serverId },
                data: { status: 'RUNNING' }
            });
        } catch (error: any) {
            await prisma.server.update({
                where: { id: serverId },
                data: { status: 'ERROR' }
            });
            throw new ApiError(500, `Failed to start server: ${error.message}`);
        }
    }

    /**
     * Stop a CS2 server
     */
    public async stopServer(serverId: string, userId: string) {
        const server = await this.getServerAndVerifyOwner(serverId, userId);

        if (!processService.isRunning(serverId)) {
            // If DB says running but process is gone, sync it
            if (server.status === 'RUNNING') {
                await prisma.server.update({
                    where: { id: serverId },
                    data: { status: 'STOPPED' }
                });
            }
            return;
        }

        await prisma.server.update({
            where: { id: serverId },
            data: { status: 'STOPPING' }
        });

        await processService.stopServer(serverId);

        await prisma.server.update({
            where: { id: serverId },
            data: { status: 'STOPPED', lastStoppedAt: new Date() }
        });
    }

    /**
     * Restart a CS2 server
     */
    public async restartServer(serverId: string, userId: string) {
        try {
            logger.info(`Restarting server ${serverId}...`);
            await this.stopServer(serverId, userId);

            // Wait for 1.5s to ensure OS ports are released
            await new Promise(resolve => setTimeout(resolve, 1500));

            await this.startServer(serverId, userId);
            logger.info(`Server ${serverId} restarted successfully.`);
        } catch (error: any) {
            throw new ApiError(500, `Restart failed: ${error.message}`);
        }
    }

    /**
     * Delete a server and cleanup all resources
     */
    public async deleteServer(serverId: string, userId: string) {
        const server = await this.getServerAndVerifyOwner(serverId, userId);

        logger.info(`Requested deletion for server: ${server.name} (${serverId})`);

        // 1. Stop server if running
        if (processService.isRunning(serverId)) {
            logger.info(`Stopping running process for server ${serverId}`);
            await processService.stopServer(serverId);
        }

        // 2. Stop installation if active
        steamcmdService.stopInstallation(serverId);

        // 3. Wait a bit for file handles to release (especially on Windows)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 4. Delete files from disk with retry logic
        const installPath = server.installPath;
        if (installPath && fs.existsSync(installPath)) {
            let deleted = false;
            let attempts = 0;
            const maxAttempts = 5;

            while (!deleted && attempts < maxAttempts) {
                try {
                    logger.info(`Attempting to delete server files at: ${installPath} (Attempt ${attempts + 1})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1))); // Increasing delay
                    fs.rmSync(installPath, { recursive: true, force: true });
                    deleted = true;
                    logger.info(`Successfully deleted server files.`);
                } catch (err: any) {
                    attempts++;
                    logger.warn(`Failed to delete files (Attempt ${attempts}): ${err.message}`);
                    if (attempts === maxAttempts) {
                        logger.error(`Gave up deleting files at ${installPath} after ${maxAttempts} attempts.`);
                    }
                }
            }
        } else {
            logger.warn(`Server install path not found or already gone: ${installPath}`);
        }

        // 5. Delete from database
        await prisma.server.delete({
            where: { id: serverId }
        });

        logger.info(`Server record deleted from DB: ${server.name} (${serverId})`);
        return { success: true };
    }

    /**
     * Validate server files (Verify integrity)
     */
    public async validateServer(serverId: string, userId: string) {
        const server = await this.getServerAndVerifyOwner(serverId, userId);

        if (processService.isRunning(serverId)) {
            throw new ApiError(400, 'Cannot validate files while server is running. Stop it first.');
        }

        if (server.status === 'CREATING' || server.status === 'INSTALLING') {
            throw new ApiError(400, 'Server is currently installing');
        }

        await prisma.server.update({
            where: { id: serverId },
            data: { status: 'CREATING' }
        });

        this.installServerBackground(server.id);

        return { success: true, message: 'Server verification started' };
    }

    /**
     * Update server details
     */
    public async updateServer(serverId: string, userId: string, data: {
        name?: string;
        description?: string;
        gsltToken?: string;
        steamAuthKey?: string;
        rconPassword?: string;
        maxPlayers?: number;
        map?: string;
        workshopCollection?: string;
        workshopMapId?: string;
    }) {
        await this.getServerAndVerifyOwner(serverId, userId);

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.workshopCollection !== undefined) updateData.workshopCollection = data.workshopCollection;
        if (data.workshopMapId !== undefined) updateData.workshopMapId = data.workshopMapId;
        if (data.gsltToken !== undefined) updateData.gsltToken = data.gsltToken;
        if (data.steamAuthKey !== undefined) updateData.steamAuthKey = data.steamAuthKey;
        if (data.map !== undefined) updateData.map = data.map;
        if (data.maxPlayers !== undefined) {
            updateData.maxPlayers = data.maxPlayers ? parseInt(data.maxPlayers as any) : undefined;
        }

        if (data.rconPassword) {
            updateData.rconPassword = data.rconPassword;
        }

        return prisma.server.update({
            where: { id: serverId },
            data: updateData
        });
    }

    // --- Helpers ---

    private async allocatePort(): Promise<number> {
        const usedPorts = await prisma.server.findMany({ select: { port: true } });
        const usedPortSet = new Set(usedPorts.map(s => s.port));

        for (let port = this.DEFAULT_PORT_START; port <= this.DEFAULT_PORT_END; port++) {
            if (!usedPortSet.has(port)) return port;
        }
        throw new ApiError(500, 'No available ports in range');
    }

    private async installServerBackground(serverId: string) {
        try {
            terminalService.streamOutput(serverId, '\x1b[32m[Quatrix] Starting server file validation...\x1b[0m\n');

            await steamcmdService.installOrUpdateServer(serverId, (data) => {
                terminalService.streamOutput(serverId, data);

                // Parse progress from SteamCMD output
                const match = data.match(/progress:\s*(\d+(\.\d+)?)/);
                if (match) {
                    const percent = parseFloat(match[1]);
                    terminalService.sendProgress(serverId, percent);
                }
            });

            const exists = await prisma.server.findUnique({ where: { id: serverId } });
            if (exists) {
                terminalService.streamOutput(serverId, '\n\x1b[32m[Quatrix] Validation/Update completed successfully!\x1b[0m\n');
                await prisma.server.update({
                    where: { id: serverId },
                    data: { status: 'STOPPED' }
                });
            }
        } catch (error: any) {
            const exists = await prisma.server.findUnique({ where: { id: serverId } });
            if (exists) {
                terminalService.streamOutput(serverId, `\n\x1b[31m[Quatrix] Validation failed: ${error.message}\x1b[0m\n`);
                logger.error(`Background validation failed for server ${serverId}:`, error);
                await prisma.server.update({
                    where: { id: serverId },
                    data: { status: 'ERROR' }
                });
            } else {
                logger.info(`Validation for server ${serverId} failed/stopped, but server record is already gone. Skipping status update.`);
            }
        }
    }

    private async getServerAndVerifyOwner(serverId: string, userId: string) {
        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (!server) throw new ApiError(404, 'Server not found');
        if (server.ownerId !== userId) throw new ApiError(403, 'Unauthorized');
        return server;
    }
}

export const serverService = new ServerService();
