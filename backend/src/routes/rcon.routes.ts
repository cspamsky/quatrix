import { Router, Request, Response } from 'express';
import { rconService } from '../services/rcon.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Connect to RCON
 */
router.post('/:serverId/connect', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const { host, port, password } = req.body;

        if (!host || !port || !password) {
            return res.status(400).json({ error: 'Host, port, and password are required' });
        }

        await rconService.connect(serverId, host, parseInt(port), password);
        res.json({ success: true, message: 'RCON connected successfully' });
    } catch (error: any) {
        logger.error(`RCON connect error: ${error.message}`);
        res.status(500).json({ error: error.message });
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
        res.json({ success: true, response });
    } catch (error: any) {
        logger.error(`RCON execute error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Disconnect RCON
 */
router.post('/:serverId/disconnect', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        await rconService.disconnect(serverId);
        res.json({ success: true, message: 'RCON disconnected' });
    } catch (error: any) {
        logger.error(`RCON disconnect error: ${error.message}`);
        res.status(500).json({ error: error.message });
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

        res.json({
            success: true,
            connected: isConnected,
            connection: connection ? {
                host: connection.host,
                port: connection.port,
            } : null,
        });
    } catch (error: any) {
        logger.error(`RCON status error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

export default router;
