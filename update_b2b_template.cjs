
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('Reading template from file...');
    // Read the file content directly to avoid import issues and ensure we get the latest content
    const templatePath = path.join(__dirname, 'lib/constants/b2b-landing-template.ts');
    let templateContent = fs.readFileSync(templatePath, 'utf8');

    // Extract the template string using regex or string manipulation
    // Assuming the file format is: export const DEFAULT_B2B_LANDING_TEMPLATE = `...`;
    const match = templateContent.match(/export const DEFAULT_B2B_LANDING_TEMPLATE = `([\s\S]*)`;/);

    if (!match) {
        console.error('Could not extract template from file!');
        process.exit(1);
    }

    const template = match[1];

    console.log('Updating B2B_LANDING_TEMPLATE in SystemConfig...');

    const updated = await prisma.systemConfig.upsert({
        where: { configKey: 'B2B_LANDING_TEMPLATE' },
        update: {
            configValue: template,
            updatedAt: new Date(),
        },
        create: {
            configKey: 'B2B_LANDING_TEMPLATE',
            configValue: template,
            description: 'B2B Partner Landing Page HTML Template (Global Default)',
            category: 'landing_page',
            updatedAt: new Date(),
        },
    });

    console.log('Successfully updated template!');
    console.log('Updated at:', updated.updatedAt);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
