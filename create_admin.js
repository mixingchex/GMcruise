
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const phone = '01000000000';
    const password = '1234';

    const user = await prisma.user.upsert({
        where: { phone },
        update: { role: 'admin', password },
        create: {
            phone,
            password,
            name: 'Test Admin',
            role: 'admin',
            onboarded: true,
            mallUserId: 'admin_test'
        }
    });

    console.log('Created admin user:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
