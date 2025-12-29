import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    await prisma.server.updateMany({
        data: { status: 'STOPPED' }
    });
    console.log('All servers set to STOPPED');
}
main().catch(console.error).finally(() => prisma.$disconnect());
