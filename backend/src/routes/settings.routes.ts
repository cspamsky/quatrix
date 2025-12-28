import { Router } from 'express';
import { getSettings, updateSettings, installSteamCMD, resetSetup } from '../controllers/settings.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Settings are protected
router.use(protect);

router.get('/', getSettings);
router.post('/', updateSettings);
router.post('/install', installSteamCMD);
router.post('/reset', resetSetup);

export default router;
