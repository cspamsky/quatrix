import { serverService } from './src/services/server.service';
import { prisma } from './src/utils/prisma';

async function main() {
    const server = await prisma.server.findFirst();
    if (!server) {
        console.log('No server found');
        return;
    }
    const userId = server.ownerId;
    console.log(`Starting server ${server.id} for user ${userId}...`);
    await serverService.startServer(server.id, userId);
    console.log('Server started successfully');
}

main().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
}).finally(() => prisma.$disconnect());
