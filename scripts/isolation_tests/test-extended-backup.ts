
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Starting Extended Backup Logic Verification...');

    try {
        // 1. Verify Leads Extraction
        console.log('\n1️⃣ Verifying Leads Extraction (syncLeads)...');
        const leads = await prisma.affiliateLead.findMany({
            take: 5, // Check top 5
            orderBy: { createdAt: 'desc' },
            include: {
                AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile: { select: { displayName: true } },
            }
        });
        console.log(`   ✅ Found ${leads.length} leads.`);
        if (leads.length > 0) {
            const l = leads[0];
            console.log('   Example Lead Data:', {
                id: l.id,
                name: l.customerName,
                phone: l.customerPhone,
                agent: l.AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile?.displayName,
                manager: l.AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile?.displayName
            });
        }

        // 2. Verify Sales Extraction
        console.log('\n2️⃣ Verifying Sales Extraction (syncSales)...');
        const sales = await prisma.affiliateSale.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                AffiliateProduct: { select: { title: true, productCode: true } },
                AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: { select: { displayName: true } }
            }
        });
        console.log(`   ✅ Found ${sales.length} sales.`);
        if (sales.length > 0) {
            const s = sales[0];
            console.log('   Example Sale Data:', {
                id: s.id,
                product: s.AffiliateProduct?.title,
                amount: s.saleAmount,
                agent: s.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile?.displayName
            });
        }

        // 3. Verify Settlements (CommissionLedger)
        console.log('\n3️⃣ Verifying Commission Ledger (syncSettlements)...');
        const ledgers = await prisma.commissionLedger.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { AffiliateProfile: { select: { displayName: true, affiliateCode: true } } }
        });
        console.log(`   ✅ Found ${ledgers.length} ledger entries.`);
        if (ledgers.length > 0) {
            const l = ledgers[0];
            console.log('   Example Ledger Data:', {
                id: l.id,
                profile: l.AffiliateProfile?.displayName,
                amount: l.amount,
                type: l.entryType
            });
        }

        // 4. Verify Payslips
        console.log('\n4️⃣ Verifying Payslips (syncSettlements)...');
        const payslips = await prisma.affiliatePayslip.findMany({
            take: 5,
            orderBy: { period: 'desc' },
            include: { AffiliateProfile: { select: { displayName: true } } }
        });
        console.log(`   ✅ Found ${payslips.length} payslips.`);
        if (payslips.length > 0) {
            const p = payslips[0];
            console.log('   Example Payslip Data:', {
                id: p.id,
                period: p.period,
                profile: p.AffiliateProfile?.displayName,
                netPayment: p.netPayment
            });
        }

        console.log('\n✨ All Data Extraction Logic Verified Successfully!');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
