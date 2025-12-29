import { Router, Request, Response } from 'express';
import { rconService } from '../services/rcon.service';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

const router = Router();

/**
 * Connect to RCON
 */
router.post('/:serverId/connect', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { password: passwordOverride } = req.body; // Optional override

        const server = await prisma.server.findUnique({
            where: { id: serverId },
            select: { port: true, rconPassword: true }
        });

        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const rconHost = '127.0.0.1';
        const rconPort = server.port;
        const rconPassword = passwordOverride || server.rconPassword;

        if (!rconPassword) {
            return res.status(400).json({ error: 'RCON password is not configured for this server' });
        }

        await rconService.connect(serverId, rconHost, rconPort, rconPassword);
        return res.json({ success: true, message: 'RCON connected successfully' });
    } catch (error: any) {
        logger.error(`RCON connect error: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Execute RCON command
 */
router.post('/:serverId/execute', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { command } = req.body;

        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        const response = await rconService.execute(serverId, command);
        return res.json({ success: true, response });
    } catch (error: any) {
        logger.error(`RCON execute error: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Disconnect RCON
 */
router.post('/:serverId/disconnect', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        await rconService.disconnect(serverId);
        return res.json({ success: true, message: 'RCON disconnected' });
    } catch (error: any) {
        logger.error(`RCON disconnect error: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Get RCON status
 */
router.get('/:serverId/status', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const isConnected = rconService.isConnected(serverId);
        const connection = rconService.getConnection(serverId);

        return res.json({
            success: true,
            connected: isConnected,
            connection: connection ? {
                host: connection.host,
                port: connection.port,
            } : null,
        });
    } catch (error: any) {
        logger.error(`RCON status error: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Get players list
 */
router.get('/:serverId/players', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { playerService } = await import('../services/player.service');
        const players = await playerService.getPlayers(serverId);
        res.json({ success: true, players });
    } catch (error: any) {
        logger.error(`Get players error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Kick player
 */
router.post('/:serverId/kick', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { userId, reason } = req.body;
        const { playerService } = await import('../services/player.service');
        const response = await playerService.kickPlayer(serverId, userId, reason);
        res.json({ success: true, response });
    } catch (error: any) {
        logger.error(`Kick player error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Ban player
 */
router.post('/:serverId/ban', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { userId, minutes, reason } = req.body;
        const { playerService } = await import('../services/player.service');
        const response = await playerService.banPlayer(serverId, userId, minutes, reason);
        res.json({ success: true, response });
    } catch (error: any) {
        logger.error(`Ban player error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

export default router;
