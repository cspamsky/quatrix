import { Router } from 'express';
import type { Request, Response } from 'express';
import { backupService } from '../services/BackupService.js';
import { taskService } from '../services/TaskService.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const upload = multer({ dest: 'data/temp/' });

const router = Router();

router.use(authenticateToken);

// List backups
router.get('/:serverId', (req: Request, res: Response) => {
  try {
    const serverId = req.params.serverId as string;
    if (!serverId || !/^[a-zA-Z0-9\-_]+$/.test(serverId)) {
      return res.status(400).json({ error: 'Invalid server ID format' });
    }
    const backups = backupService.getBackups(serverId);
    res.json(backups);
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Download backup
router.get('/:id/download', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const filePath = backupService.getBackupPath(id);
    res.download(filePath);
  } catch (error: unknown) {
    const err = error as Error;
    res.status(404).json({ error: err.message });
  }
});

// Create new backup
router.post('/:serverId/create', async (req: Request, res: Response) => {
  try {
    const serverId = req.params.serverId as string;
    if (!serverId || !/^[a-zA-Z0-9\-_]+$/.test(serverId)) {
      return res.status(400).json({ error: 'Invalid server ID format' });
    }
    const { comment, type } = req.body as { comment?: string; type?: string };

    // Create task
    const taskId = `backup_${Date.now()}`;
    taskService.createTask(taskId, 'backup_create', { serverId });

    // Start backup in background
    const backupType = (type === 'auto' ? 'auto' : 'manual') as 'manual' | 'auto';
    backupService
      .createBackup(serverId as string, backupType, comment || '', taskId)
      .catch((err) => {
        console.error('[API] Backup failed:', err);
      });

    res.json({ taskId, message: 'Backup process started.' });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Upload external backup
router.post('/:serverId/upload', upload.single('backup'), async (req: Request, res: Response) => {
  try {
    const serverId = req.params.serverId as string;
    if (!serverId || !/^[a-zA-Z0-9\-_]+$/.test(serverId)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid server ID format' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No backup file uploaded' });
    }

    const { comment } = req.body as { comment?: string };

    // Create task
    const taskId = `upload_${Date.now()}`;
    taskService.createTask(taskId, 'backup_upload', { serverId, filename: req.file.originalname });

    backupService
      .handleExternalUpload(serverId, req.file.path, req.file.originalname, comment, taskId)
      .then(() => {
        taskService.completeTask(taskId, 'tasks.messages.upload_success');
      })
      .catch((err: Error) => {
        console.error('[API] Upload failed:', err);
        taskService.failTask(taskId, 'tasks.messages.upload_failed');
      });

    res.json({ taskId, message: 'Backup upload started.' });
  } catch (error: unknown) {
    const err = error as Error;
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// Restore from backup
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Create task
    const taskId = `restore_${Date.now()}`;
    taskService.createTask(taskId, 'backup_restore', { backupId: id });

    // Start restore in background
    backupService.restoreBackup(id as string, taskId).catch((err) => {
      console.error('[API] Restore failed:', err);
    });

    res.json({ taskId, message: 'Restore process started.' });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

// Delete backup
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await backupService.deleteBackup(req.params.id as string);
    res.json({ message: 'Backup deleted.' });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({ error: err.message });
  }
});

export default router;
