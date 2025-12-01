
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for Branch Managers...');

    const bosses = await prisma.user.findMany({
        where: {
            OR: [
                { phone: { startsWith: 'boss' } },
                { mallUserId: { startsWith: 'boss' } }
            ]
        },
        include: {
            AffiliateProfile: true
        },
        orderBy: {
            id: 'asc'
        }
    });

    console.log(`Found ${bosses.length} potential boss accounts.`);

    bosses.forEach(boss => {
        console.log(`- User: ${boss.phone} / ${boss.mallUserId} (ID: ${boss.id})`);
        if (boss.AffiliateProfile) {
            console.log(`  Profile: ${boss.AffiliateProfile.type} (ID: ${boss.AffiliateProfile.id})`);
        } else {
            console.log(`  WARNING: No AffiliateProfile found.`);
        }
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
