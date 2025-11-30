
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    // Read the file containing the correct template
    const filePath = path.join(__dirname, 'app/b2b/[partnerId]/page.tsx');
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Extract DEFAULT_TEMPLATE
    // It starts with `const DEFAULT_TEMPLATE = \`` and ends with `\`;`
    const match = fileContent.match(/const DEFAULT_TEMPLATE = `([\s\S]*?)`;/);

    if (!match) {
        console.error('Could not find DEFAULT_TEMPLATE in file');
        process.exit(1);
    }

    const template = match[1];
    console.log('Extracted template length:', template.length);

    // Update SystemConfig
    const result = await prisma.systemConfig.upsert({
        where: { configKey: 'B2B_LANDING_TEMPLATE' },
        update: {
            configValue: template,
            updatedAt: new Date()
        },
        create: {
            configKey: 'B2B_LANDING_TEMPLATE',
            configValue: template,
            description: 'B2B Partner Landing Page HTML Template (Global Default)',
            category: 'landing_page',
            updatedAt: new Date()
        }
    });

    console.log('Updated SystemConfig successfully.');
    console.log('New config length:', result.configValue.length);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
