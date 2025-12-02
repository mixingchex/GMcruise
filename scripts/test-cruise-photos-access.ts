
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Finding a partner user...');
    const partnerUser = await prisma.user.findFirst({
        where: {
            AffiliateProfile: {
                isNot: null
            }
        },
        include: {
            AffiliateProfile: true
        }
    });

    if (!partnerUser) {
        console.log('No partner user found.');
        return;
    }

    console.log(`Found partner user: ${partnerUser.name} (${partnerUser.email}) ID: ${partnerUser.id}`);
    console.log(`Role: ${partnerUser.role}`);
    console.log(`AffiliateProfile:`, partnerUser.AffiliateProfile);

    console.log('Testing access logic...');

    // Simulate API call logic
    const { GET } = await import('../app/api/admin/cruise-photos/route');

    // Mock Request
    const req = {
        url: 'http://localhost:3000/api/admin/cruise-photos?folder=',
        nextUrl: {
            searchParams: new URLSearchParams({ folder: '' })
        }
    } as any;

    console.log('Calling GET handler...');
    try {
        const response = await GET(req);
        const data = await response.json();
        console.log('API Response Status:', response.status);
        console.log('API Response OK:', data.ok);
        console.log('Folders count:', data.folders?.length);
        console.log('First 3 folders:', data.folders?.slice(0, 3));
        console.log('Images count:', data.images?.length);
    } catch (error) {
        console.error('API Call Failed:', error);
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
