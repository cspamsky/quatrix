import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const servers = await prisma.server.findMany();
    console.log(JSON.stringify(servers, null, 2));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
}).finally(() => prisma.$disconnect());
