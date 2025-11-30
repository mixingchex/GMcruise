
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const phone = '01012345678';

    console.log('Checking AffiliateLead...');
    const affiliateLead = await prisma.affiliateLead.findFirst({
        where: { customerPhone: phone },
        orderBy: { createdAt: 'desc' }
    });
    console.log('AffiliateLead:', affiliateLead ? 'FOUND' : 'NOT FOUND');
    if (affiliateLead) console.log(affiliateLead);

    console.log('Checking SystemConsultation...');
    const systemConsultation = await prisma.systemConsultation.findFirst({
        where: { name: 'Test System User' },
        orderBy: { createdAt: 'desc' }
    });
    console.log('SystemConsultation:', systemConsultation ? 'FOUND' : 'NOT FOUND');
    if (systemConsultation) console.log(systemConsultation);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
