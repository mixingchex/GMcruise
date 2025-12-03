const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { id: 3 },
        select: { id: true, name: true, role: true, mallUserId: true }
    });
    console.log(JSON.stringify(user));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
