
import { steamcmdService } from './src/services/steamcmd.service';
import { prisma } from './src/utils/prisma';
import { logger } from './src/utils/logger';

async function verifyServer() {
    const serverId = '082114aa-a92f-4836-a0ab-2df405032771';
    console.log(`Verifying server ${serverId}...`);

    try {
        await steamcmdService.installOrUpdateServer(serverId, (data) => {
            console.log(data.trim());
        });
        console.log('Verification complete.');

        // Update status to STOPPED so user can try again
        await prisma.server.update({
            where: { id: serverId },
            data: { status: 'STOPPED' }
        });

    } catch (e) {
        console.error('Verification failed:', e);
    }
}

verifyServer()
    .catch(console.error)
    .finally(() => process.exit(0));
