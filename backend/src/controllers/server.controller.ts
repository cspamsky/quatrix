import { Request, Response, NextFunction } from 'express';
import { serverService } from '../services/server.service';
import { ApiError } from '../middleware/error.middleware';

export const getMyServers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const servers = await serverService.getServersByUser(userId);
        res.json({ success: true, data: servers });
    } catch (error) {
        next(error);
    }
};

export const createServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { name, description, gsltToken, steamAuthKey, rconPassword, maxPlayers, map } = req.body;

        if (!name || !gsltToken) {
            throw new ApiError(400, 'Name and GSLT Token are required');
        }

        const server = await serverService.createServer(userId, {
            name,
            description,
            gsltToken,
            steamAuthKey,
            rconPassword,
            maxPlayers: maxPlayers ? parseInt(maxPlayers) : undefined,
            map
        });
        res.status(201).json({ success: true, data: server });
    } catch (error) {
        next(error);
    }
};

export const startServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { id } = req.params;
        await serverService.startServer(id, userId);
        res.json({ success: true, message: 'Server starting...' });
    } catch (error) {
        next(error);
    }
};

export const stopServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { id } = req.params;
        await serverService.stopServer(id, userId);
        res.json({ success: true, message: 'Server stopping...' });
    } catch (error) {
        next(error);
    }
};

export const deleteServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { id } = req.params;
        await serverService.deleteServer(id, userId);
        res.json({ success: true, message: 'Server deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const validateServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { id } = req.params;
        const result = await serverService.validateServer(id, userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
export const updateServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { id } = req.params;
        const {
            name,
            description,
            gsltToken,
            steamAuthKey,
            rconPassword,
            maxPlayers,
            map,
            workshopCollection,
            workshopMapId
        } = req.body;

        const server = await serverService.updateServer(id, userId, {
            name,
            description,
            gsltToken,
            steamAuthKey,
            rconPassword,
            maxPlayers,
            map,
            workshopCollection,
            workshopMapId
        });
        res.json({ success: true, data: server });
    } catch (error) {
        next(error);
    }
};

export const restartServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { id } = req.params;
        await serverService.restartServer(id, userId);
        res.json({ success: true, message: 'Server restarting...' });
    } catch (error) {
        next(error);
    }
};
