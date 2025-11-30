
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Trial Extension Logic Verification...');

    // 1. Create a dummy lead
    const phone = '01099998888';
    const name = 'Test Trial User';

    // Clean up existing test user
    await prisma.affiliateLead.deleteMany({
        where: { customerPhone: phone }
    });

    console.log('Creating test lead...');
    const lead = await prisma.affiliateLead.create({
        data: {
            customerName: name,
            customerPhone: phone,
            status: 'NEW',
            source: 'TRIAL_DASHBOARD',
            metadata: {
                trialStartedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // Started 10 days ago
                trialExpiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Expired 3 days ago
            },
            updatedAt: new Date(),
        }
    });

    console.log('Test lead created:', lead.id, lead.metadata);

    // 2. Simulate Extension Logic (from API route)
    console.log('Simulating extension...');
    const days = 7;
    const currentMetadata = lead.metadata as any || {};
    const currentExpiresAt = currentMetadata.trialExpiresAt ? new Date(currentMetadata.trialExpiresAt) : new Date();

    // Logic from API: if expired, start from now. if not, add to current expiration.
    const baseDate = currentExpiresAt < new Date() ? new Date() : currentExpiresAt;
    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + days);

    console.log('Current Expires At:', currentExpiresAt);
    console.log('Base Date:', baseDate);
    console.log('New Expires At:', newExpiresAt);

    // 3. Update DB
    const updatedLead = await prisma.affiliateLead.update({
        where: { id: lead.id },
        data: {
            metadata: {
                ...currentMetadata,
                trialExpiresAt: newExpiresAt.toISOString(),
                lastTrialExtensionBy: 'system-test',
                lastTrialExtensionAt: new Date().toISOString(),
            }
        }
    });

    console.log('Lead updated:', updatedLead.metadata);

    // 4. Verify
    const updatedMetadata = updatedLead.metadata as any;
    const updatedExpiresAt = new Date(updatedMetadata.trialExpiresAt);

    // Allow for small time difference (execution time)
    const expectedExpiresAt = new Date();
    expectedExpiresAt.setDate(expectedExpiresAt.getDate() + days);

    const diff = Math.abs(updatedExpiresAt.getTime() - expectedExpiresAt.getTime());

    if (diff < 10000) { // within 10 seconds
        console.log('SUCCESS: Trial expiration date updated correctly.');
    } else {
        console.error('FAILURE: Trial expiration date mismatch.');
        console.error('Expected (approx):', expectedExpiresAt);
        console.error('Actual:', updatedExpiresAt);
    }

    // Clean up
    await prisma.affiliateLead.delete({
        where: { id: lead.id }
    });
    console.log('Test lead cleaned up.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
