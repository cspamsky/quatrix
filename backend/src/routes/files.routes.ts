import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, appendFileSync } from 'fs';
import { steamcmdService } from '../services/steamcmd.service';
import { logger } from '../utils/logger';
import multer from 'multer';

const router = Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: async (req, _file, cb) => {
        try {
            // Debug logging
            try {
                appendFileSync('upload_debug.log', `[${new Date().toISOString()}] URL: ${req.originalUrl} Params: ${JSON.stringify(req.params)}\n`);
            } catch (e) { }

            let { serverId } = req.params;

            // Fallback for ID if params missing (Multer middleware nuance)
            if (!serverId && req.originalUrl) {
                const match = req.originalUrl.match(/\/files\/([^\/]+)\/upload/);
                if (match) serverId = match[1];
            }

            if (!serverId) {
                logger.error('Upload failed: Server ID missing', { url: req.originalUrl });
                return cb(new Error('Server ID missing'), '');
            }

            const relativePath = req.query.path as string || '';
            const serverPath = steamcmdService.getServerPath(serverId);
            const targetPath = path.join(serverPath, relativePath);

            // Logging for debug
            logger.debug(`Upload target: ${targetPath} (Server: ${serverId})`);

            // Security: Ensure path is within server directory
            const resolvedPath = path.resolve(targetPath);
            const resolvedServerPath = path.resolve(serverPath);
            const safeBase = resolvedServerPath + path.sep;

            if (resolvedPath !== resolvedServerPath && !resolvedPath.startsWith(safeBase)) {
                logger.error(`Upload security denial: ${resolvedPath} outside ${resolvedServerPath}`);
                return cb(new Error('Access denied: Invalid path'), '');
            }

            // Ensure directory exists
            if (!existsSync(targetPath)) {
                await fs.mkdir(targetPath, { recursive: true });
            }

            cb(null, targetPath);
        } catch (error) {
            try {
                appendFileSync('upload_debug.log', `[${new Date().toISOString()}] ERROR: ${error}\n`);
            } catch (e) { }
            logger.error('Upload destination error:', error);
            cb(error as any, '');
        }
    },
    filename: (_req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

/**
 * List files in a server directory
 */
router.get('/:serverId/list', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { path: relativePath = '' } = req.query;

        const serverPath = steamcmdService.getServerPath(serverId);
        const targetPath = path.join(serverPath, relativePath as string);

        // Security: Ensure path is within server directory
        const resolvedPath = path.resolve(targetPath);
        const resolvedServerPath = path.resolve(serverPath);
        if (!resolvedPath.startsWith(resolvedServerPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!existsSync(resolvedPath)) {
            return res.status(404).json({ error: 'Directory not found' });
        }

        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Path is not a directory' });
        }

        const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
        const files = await Promise.all(
            entries.map(async (entry) => {
                const fullPath = path.join(resolvedPath, entry.name);
                try {
                    const stat = await fs.stat(fullPath);
                    return {
                        name: entry.name,
                        isDirectory: entry.isDirectory(),
                        size: stat.size,
                        modified: stat.mtime,
                        path: path.relative(serverPath, fullPath).replace(/\\/g, '/'),
                    };
                } catch (e) {
                    return null; // Skip files that are locked or inaccessible
                }
            })
        );

        const filteredFiles = files.filter(f => f !== null && f.name !== '.quatrix_trash');

        // Sort: directories first, then by name
        filteredFiles.sort((a, b) => {
            if (a!.isDirectory && !b!.isDirectory) return -1;
            if (!a!.isDirectory && b!.isDirectory) return 1;
            return a!.name.localeCompare(b!.name);
        });

        return res.json({ files: filteredFiles, currentPath: relativePath });
    } catch (error: any) {
        logger.error(`Error listing files: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Read file content
 */
router.get('/:serverId/read', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { path: relativePath } = req.query;

        if (!relativePath) {
            return res.status(400).json({ error: 'Path is required' });
        }

        const serverPath = steamcmdService.getServerPath(serverId);
        const targetPath = path.join(serverPath, relativePath as string);

        const resolvedPath = path.resolve(targetPath);
        const resolvedServerPath = path.resolve(serverPath);
        if (!resolvedPath.startsWith(resolvedServerPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const content = await fs.readFile(resolvedPath, 'utf-8');
        return res.json({ content, path: relativePath });
    } catch (error: any) {
        logger.error(`Error reading file: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Write file content
 */
router.post('/:serverId/write', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { path: relativePath, content } = req.body;

        if (!relativePath || content === undefined) {
            return res.status(400).json({ error: 'Path and content are required' });
        }

        const serverPath = steamcmdService.getServerPath(serverId);
        const targetPath = path.join(serverPath, relativePath);

        const resolvedPath = path.resolve(targetPath);
        const resolvedServerPath = path.resolve(serverPath);
        if (!resolvedPath.startsWith(resolvedServerPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await fs.writeFile(resolvedPath, content, 'utf-8');
        logger.info(`File written: ${relativePath} for server ${serverId}`);
        return res.json({ success: true, path: relativePath });
    } catch (error: any) {
        logger.error(`Error writing file: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Delete file or directory (supports bulk)
 */
router.post('/:serverId/delete', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { paths } = req.body; // Expect array of paths

        if (!paths || !Array.isArray(paths)) {
            return res.status(400).json({ error: 'Paths array is required' });
        }

        const serverPath = steamcmdService.getServerPath(serverId);
        const resolvedServerPath = path.resolve(serverPath);

        for (const relativePath of paths) {
            const targetPath = path.join(serverPath, relativePath);
            const resolvedPath = path.resolve(targetPath);

            if (!resolvedPath.startsWith(resolvedServerPath) || resolvedPath === resolvedServerPath) {
                logger.warn(`Attempted to delete protected path: ${resolvedPath}`);
                continue;
            }

            if (existsSync(resolvedPath)) {
                const stats = await fs.stat(resolvedPath);
                if (stats.isDirectory()) {
                    await fs.rm(resolvedPath, { recursive: true });
                } else {
                    await fs.unlink(resolvedPath);
                }
            }
        }

        return res.json({ success: true });
    } catch (error: any) {
        logger.error(`Error deleting: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Create directory
 */
router.post('/:serverId/mkdir', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { path: relativePath } = req.body;

        if (!relativePath) {
            return res.status(400).json({ error: 'Path is required' });
        }

        const serverPath = steamcmdService.getServerPath(serverId);
        const targetPath = path.join(serverPath, relativePath);

        const resolvedPath = path.resolve(targetPath);
        const resolvedServerPath = path.resolve(serverPath);
        if (!resolvedPath.startsWith(resolvedServerPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await fs.mkdir(resolvedPath, { recursive: true });
        return res.json({ success: true, path: relativePath });
    } catch (error: any) {
        logger.error(`Error creating directory: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Rename or Move
 */
router.post('/:serverId/rename', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { oldPath, newPath } = req.body;

        if (!oldPath || !newPath) {
            return res.status(400).json({ error: 'Old and new paths are required' });
        }

        const serverPath = steamcmdService.getServerPath(serverId);
        const resolvedServerPath = path.resolve(serverPath);

        const resolvedOld = path.resolve(path.join(serverPath, oldPath));
        const resolvedNew = path.resolve(path.join(serverPath, newPath));

        if (!resolvedOld.startsWith(resolvedServerPath) || !resolvedNew.startsWith(resolvedServerPath)) {
            const message = 'Access denied';
            return res.status(403).json({ error: message });
        }

        await fs.rename(resolvedOld, resolvedNew);
        return res.json({ success: true });
    } catch (error: any) {
        logger.error(`Error renaming: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Download file
 */
router.get('/:serverId/download', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { path: relativePath } = req.query;

        if (!relativePath) {
            return res.status(400).json({ error: 'Path is required' });
        }

        const serverPath = steamcmdService.getServerPath(serverId);
        const resolvedPath = path.resolve(path.join(serverPath, relativePath as string));
        const resolvedServerPath = path.resolve(serverPath);

        if (!resolvedPath.startsWith(resolvedServerPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const stats = await fs.stat(resolvedPath);
        if (stats.isDirectory()) {
            return res.status(400).json({ error: 'Cannot download directory directly. Use archive feature.' });
        }

        // res.download is a bit special as it streams, but better to return void here as express handles it?
        // Actually for the linter, standard practice:
        res.download(resolvedPath, path.basename(resolvedPath));
        return;
    } catch (error: any) {
        logger.error(`Error downloading: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Upload files
 */
router.post('/:serverId/upload', upload.array('files'), (_req: Request, res: Response) => {
    return res.json({ success: true, message: 'Files uploaded successfully' });
});

/**
 * Archive (Zip)
 */
router.post('/:serverId/archive', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { paths, outputName } = req.body;

        if (!paths || !Array.isArray(paths) || !outputName) {
            return res.status(400).json({ error: 'Paths array and outputName are required' });
        }

        const serverPath = steamcmdService.getServerPath(serverId);
        const resolvedServerPath = path.resolve(serverPath);

        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();

        for (const relativePath of paths) {
            const fullPath = path.join(serverPath, relativePath);
            const resolvedPath = path.resolve(fullPath);
            if (!resolvedPath.startsWith(resolvedServerPath)) continue;

            const stats = await fs.stat(resolvedPath);
            if (stats.isDirectory()) {
                zip.addLocalFolder(resolvedPath, relativePath);
            } else {
                zip.addLocalFile(resolvedPath, path.dirname(relativePath) === '.' ? '' : path.dirname(relativePath));
            }
        }

        const outPath = path.join(serverPath, outputName.endsWith('.zip') ? outputName : `${outputName}.zip`);
        zip.writeZip(outPath);

        return res.json({ success: true, path: path.relative(serverPath, outPath) });
    } catch (error: any) {
        logger.error(`Error archiving: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Unarchive (Unzip)
 */
router.post('/:serverId/unzip', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { path: relativePath } = req.body;

        if (!relativePath) {
            return res.status(400).json({ error: 'Path is required' });
        }

        const serverPath = steamcmdService.getServerPath(serverId);
        const fullPath = path.join(serverPath, relativePath);
        const resolvedPath = path.resolve(fullPath);
        const resolvedServerPath = path.resolve(serverPath);

        if (!resolvedPath.startsWith(resolvedServerPath) || !resolvedPath.endsWith('.zip')) {
            return res.status(400).json({ error: 'Invalid zip file' });
        }

        // Use createRequire for adm-zip compatibility in ESM
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const AdmZip = require('adm-zip');

        const zip = new AdmZip(resolvedPath);
        zip.extractAllTo(path.dirname(resolvedPath), true);

        return res.json({ success: true });
    } catch (error: any) {
        logger.error(`Error unzipping: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Recycle (Move to Trash)
 */
router.post('/:serverId/recycle', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { paths } = req.body;

        if (!paths || !Array.isArray(paths)) {
            return res.status(400).json({ error: 'Paths array is required' });
        }

        const serverPath = steamcmdService.getServerPath(serverId);
        const trashPath = path.join(serverPath, '.quatrix_trash');
        const resolvedServerPath = path.resolve(serverPath);

        // Ensure trash exists
        if (!existsSync(trashPath)) {
            await fs.mkdir(trashPath);
        }

        for (const relativePath of paths) {
            const fullPath = path.join(serverPath, relativePath);
            const resolvedPath = path.resolve(fullPath);

            if (!resolvedPath.startsWith(resolvedServerPath)) continue;

            // Prevent recycling the trash folder itself
            if (resolvedPath === path.resolve(trashPath)) continue;

            if (existsSync(resolvedPath)) {
                const basename = path.basename(resolvedPath);
                let targetName = basename;
                let targetPath = path.join(trashPath, targetName);

                // Handle duplicate names in trash
                let counter = 1;
                while (existsSync(targetPath)) {
                    const ext = path.extname(basename);
                    const name = path.basename(basename, ext);
                    targetName = `${name}_${counter}${ext}`;
                    targetPath = path.join(trashPath, targetName);
                    counter++;
                }

                await fs.rename(resolvedPath, targetPath);
            }
        }

        return res.json({ success: true });
    } catch (error: any) {
        logger.error(`Error recycling: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Restore from Trash
 */
router.post('/:serverId/restore', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { paths, destination } = req.body; // destination is optional, defaults to root

        if (!paths || !Array.isArray(paths)) {
            return res.status(400).json({ error: 'Paths array is required' });
        }

        const serverPath = steamcmdService.getServerPath(serverId);
        const trashPath = path.join(serverPath, '.quatrix_trash');
        const targetDir = destination ? path.join(serverPath, destination) : serverPath;

        for (const trashItem of paths) {
            const trashItemPath = path.join(trashPath, trashItem);
            if (!existsSync(trashItemPath)) continue;

            const targetPath = path.join(targetDir, trashItem);

            // If target exists, rename the restored file? Or strict fail? 
            // Let's safe-rename
            let finalPath = targetPath;
            if (existsSync(finalPath)) {
                // const basename = path.basename(trashPath); // Unused
                const ext = path.extname(trashItem);
                const name = path.basename(trashItem, ext);
                finalPath = path.join(targetDir, `${name}_restored_${Date.now()}${ext}`);
            }

            await fs.rename(trashItemPath, finalPath);
        }

        return res.json({ success: true });
    } catch (error: any) {
        logger.error(`Error restoring: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Empty Trash
 */
router.post('/:serverId/empty-trash', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const serverPath = steamcmdService.getServerPath(serverId);
        const trashPath = path.join(serverPath, '.quatrix_trash');

        if (existsSync(trashPath)) {
            const entries = await fs.readdir(trashPath);
            for (const entry of entries) {
                await fs.rm(path.join(trashPath, entry), { recursive: true, force: true });
            }
        }

        return res.json({ success: true });
    } catch (error: any) {
        logger.error(`Error emptying trash: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

export default router;
