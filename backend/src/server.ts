import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error.middleware.js';
import { logger } from './utils/logger.js';
import { terminalService } from './services/terminal.service.js';
import { monitorService } from './services/monitor.service.js';
import authRoutes from './routes/auth.routes.js';
import serverRoutes from './routes/server.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import filesRoutes from './routes/files.routes.js';
import rconRoutes from './routes/rcon.routes.js';
import { processService } from './services/process.service.js';

// Load environment variables
dotenv.config();

const app: Application = express();
const httpServer = createServer(app);

// Socket.IO setup
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'];

const io = new SocketIOServer(httpServer, {
    cors: {
        origin: corsOrigins,
        credentials: true,
    },
});

// Initialize Services
terminalService.init(io);
monitorService.init(io);

// Middleware
app.use(helmet());
app.use(cors({
    origin: corsOrigins,
    credentials: true,
}));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/rcon', rconRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});

// Make io available to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, async () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔗 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);

    // Sync zombie server processes
    try {
        await processService.syncStatuses();
    } catch (err) {
        logger.error('Failed to sync server statuses on startup:', err);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

// Handle uncaught errors (prevents crash on ECONNRESET)
process.on('uncaughtException', (error: Error) => {
    if (error.message.includes('ECONNRESET') || error.message.includes('EPIPE')) {
        logger.warn(`Caught stream error: ${error.message}`);
    } else {
        logger.error('Uncaught Exception:', error);
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Rejection:', reason);
});

export { app, io };
