import { Router } from 'express';
import { register, login, getMe, changePassword } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Private routes
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);

export default router;
