
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userId = 3; // Based on the logs: Session user: { id: 3, name: '전혜선' }

    console.log(`Checking user ${userId}...`);
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        console.log('User not found!');
        return;
    }

    console.log('Current user:', user);

    if (user.role !== 'admin') {
        console.log('Updating user role to admin...');
        const updated = await prisma.user.update({
            where: { id: userId },
            data: { role: 'admin' },
        });
        console.log('User updated:', updated);
    } else {
        console.log('User is already admin.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
