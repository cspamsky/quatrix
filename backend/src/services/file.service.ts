import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/error.middleware';

class FileService {
    private readonly ALLOWED_EXTENSIONS = ['.cfg', '.txt', '.json'];
    private readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB

    /**
     * Get the absolute path to the server's config directory
     */
    private async getConfigPath(serverId: string, userId: string): Promise<string> {
        const server = await prisma.server.findUnique({ where: { id: serverId } });

        if (!server) throw new ApiError(404, 'Server not found');
        if (server.ownerId !== userId) throw new ApiError(403, 'Unauthorized');
        if (!server.installPath) throw new ApiError(400, 'Server not installed');

        // CS2 Config Path: game/csgo/cfg/
        const configPath = path.join(server.installPath, 'game', 'csgo', 'cfg');

        // Ensure directory exists
        try {
            await fs.access(configPath);
        } catch {
            throw new ApiError(404, 'Config directory not found');
        }

        return configPath;
    }

    /**
     * List editable configuration files
     */
    public async listConfigFiles(serverId: string, userId: string) {
        const configPath = await this.getConfigPath(serverId, userId);
        const files = await fs.readdir(configPath);

        const configFiles = await Promise.all(files.map(async (file) => {
            const filePath = path.join(configPath, file);
            const stat = await fs.stat(filePath);

            if (!stat.isFile()) return null;
            if (!this.ALLOWED_EXTENSIONS.includes(path.extname(file))) return null;

            return {
                name: file,
                size: stat.size,
                updatedAt: stat.mtime
            };
        }));

        return configFiles.filter(Boolean);
    }

    /**
     * Read content of a specific config file
     */
    public async readFile(serverId: string, userId: string, filename: string) {
        if (!this.isValidFilename(filename)) {
            throw new ApiError(400, 'Invalid filename');
        }

        const configPath = await this.getConfigPath(serverId, userId);
        const filePath = path.join(configPath, filename);

        // Security check: ensure path is within config dir
        if (!filePath.startsWith(configPath)) {
            throw new ApiError(403, 'Access denied');
        }

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            throw new ApiError(404, 'File not found');
        }
    }

    /**
     * Write content to a config file
     */
    public async writeFile(serverId: string, userId: string, filename: string, content: string) {
        if (!this.isValidFilename(filename)) {
            throw new ApiError(400, 'Invalid filename');
        }

        if (content.length > this.MAX_FILE_SIZE) {
            throw new ApiError(400, 'File too large');
        }

        const configPath = await this.getConfigPath(serverId, userId);
        const filePath = path.join(configPath, filename);

        // Security check
        if (!filePath.startsWith(configPath)) {
            throw new ApiError(403, 'Access denied');
        }

        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
    }

    private isValidFilename(filename: string): boolean {
        // Prevent directory traversal and invalid chars
        return /^[a-zA-Z0-9_.-]+$/.test(filename) &&
            !filename.includes('..') &&
            this.ALLOWED_EXTENSIONS.includes(path.extname(filename));
    }
}

export const fileService = new FileService();
