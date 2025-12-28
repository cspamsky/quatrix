import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient({
    log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
    ],
});

// Log Prisma queries in development
if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e: any) => {
        logger.debug(`Query: ${e.query}`);
        logger.debug(`Duration: ${e.duration}ms`);
    });
}

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
    logger.info('Prisma disconnected');
});

export { prisma };
