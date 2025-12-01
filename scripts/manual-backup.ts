
import { syncLeads, syncSales, syncSettlements, syncAllActiveTripsApis } from '@/lib/drive-sync';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

async function main() {
    console.log('🚀 Starting Manual Backup Execution...');

    try {
        // Ensure backup is enabled or just run it forcibly
        console.log('1️⃣ Syncing Leads...');
        await syncLeads();

        console.log('2️⃣ Syncing Sales...');
        await syncSales();

        console.log('3️⃣ Syncing Settlements & Payslips...');
        await syncSettlements();

        console.log('4️⃣ Syncing APIS...');
        await syncAllActiveTripsApis();

        console.log('✅ Manual Backup Completed Successfully!');
    } catch (error) {
        console.error('❌ Manual Backup Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
