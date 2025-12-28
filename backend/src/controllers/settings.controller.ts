import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { steamcmdService } from '../services/steamcmd.service';

export const getSettings = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        let settings = await prisma.settings.findFirst();

        if (!settings) {
            settings = await prisma.settings.create({
                data: { id: 1, isConfigured: false }
            });
        }

        return res.json({ success: true, data: settings });
    } catch (error) {
        return next(error);
    }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { steamcmdPath, serversPath } = req.body;

        const settings = await prisma.settings.upsert({
            where: { id: 1 },
            update: {
                steamcmdPath,
                serversPath,
                isConfigured: !!(steamcmdPath && serversPath)
            },
            create: {
                id: 1,
                steamcmdPath,
                serversPath,
                isConfigured: !!(steamcmdPath && serversPath)
            }
        });

        // Refresh service paths
        await steamcmdService.loadSettings();

        return res.json({ success: true, data: settings });
    } catch (error) {
        return next(error);
    }
};

export const installSteamCMD = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        await steamcmdService.downloadSteamCMD();
        return res.json({ success: true, message: 'SteamCMD installed successfully' });
    } catch (error) {
        return next(error);
    }
};

export const resetSetup = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        await prisma.settings.update({
            where: { id: 1 },
            data: { isConfigured: false }
        });
        return res.json({ success: true, message: 'Setup wizard reset' });
    } catch (error) {
        return next(error);
    }
};
