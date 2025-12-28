import { Request, Response, NextFunction } from 'express';
import { fileService } from '../services/file.service';

export const listFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { id } = req.params;
        const files = await fileService.listConfigFiles(id, userId);
        res.json({ success: true, data: files });
    } catch (error) {
        next(error);
    }
};

export const getFileContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { id, filename } = req.params;
        const content = await fileService.readFile(id, userId, filename);
        res.json({ success: true, data: content });
    } catch (error) {
        next(error);
    }
};

export const saveFileContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { id, filename } = req.params;
        const { content } = req.body;

        await fileService.writeFile(id, userId, filename, content);
        res.json({ success: true, message: 'File saved successfully' });
    } catch (error) {
        next(error);
    }
};
