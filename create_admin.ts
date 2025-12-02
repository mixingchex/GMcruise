
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const phone = '01000000000';
    const password = '1234';

    // Phone is not unique, so we can't use upsert with phone directly if it's not @unique
    // Assuming we want to create if not exists
    const existing = await prisma.user.findFirst({ where: { phone } });

    let user;
    if (existing) {
        user = await prisma.user.update({
            where: { id: existing.id },
            data: { role: 'ADMIN', password, updatedAt: new Date() }
        });
    } else {
        user = await prisma.user.create({
            data: {
                phone,
                password,
                name: 'Test Admin',
                role: 'ADMIN',
                onboarded: true,
                mallUserId: 'admin_test',
                updatedAt: new Date()
            }
        });
    }

    console.log('Created admin user:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
