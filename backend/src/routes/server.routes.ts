import { Router } from 'express';
import {
    getMyServers,
    createServer,
    startServer,
    stopServer,
    deleteServer,
    validateServer,
    updateServer
} from '../controllers/server.controller';
import {
    listFiles,
    getFileContent,
    saveFileContent
} from '../controllers/file.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// All server routes are protected
router.use(protect);

router.get('/', getMyServers);
router.post('/', createServer);
router.post('/:id/start', startServer);
router.post('/:id/stop', stopServer);
router.post('/:id/validate', validateServer);
router.put('/:id', updateServer);
router.delete('/:id', deleteServer);

// File management routes
router.get('/:id/files', listFiles);
router.get('/:id/files/:filename', getFileContent);
router.put('/:id/files/:filename', saveFileContent);

export default router;
