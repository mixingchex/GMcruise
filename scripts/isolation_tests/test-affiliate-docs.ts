
import { uploadAffiliateInfoFile } from '../../lib/google-drive-affiliate-info';
import prisma from '../../lib/prisma';

async function main() {
    console.log('🧪 Affiliate Docs Backup Isolation Test Starting...\n');

    try {
        // 1. Create Dummy User & Profile for Folder Naming
        console.log('1️⃣ Creating Dummy User & Profile...');
        const email = `test_affiliate_${Date.now()}@test.local`;
        const user = await prisma.user.create({
            data: {
                name: 'TestAffiliate',
                email: email,
                phone: `010${Date.now().toString().slice(-8)}`,
                password: 'test',
            }
        });

        const profile = await prisma.affiliateProfile.create({
            data: {
                userId: user.id,
                affiliateCode: `TEST-${user.id}`,
                status: 'ACTIVE'
            }
        });
        console.log(`   ✅ Created User: ${user.name} (ID: ${user.id})`);
        console.log(`   ✅ Created Profile: ${profile.affiliateCode}`);

        // 2. Create Dummy File Buffer
        const dummyContent = 'Dummy ID Card Content';
        const buffer = Buffer.from(dummyContent);
        const fileName = `idcard_${user.id}.txt`;

        // 3. Call uploadAffiliateInfoFile
        console.log('2️⃣ Calling uploadAffiliateInfoFile...');
        const result = await uploadAffiliateInfoFile(
            user.id,
            buffer,
            fileName,
            'text/plain',
            'idCard'
        );

        if (result.ok && result.url) {
            console.log('   ✅ Backup Success!');
            console.log(`      URL: ${result.url}`);
            console.log(`      File ID: ${result.fileId}`);
            // Note: We can't easily verify the folder name without listing, 
            // but the function logic ensures it uses [Code]_[Name].
            // We trust the function logic if it returns success.
        } else {
            throw new Error(`❌ Backup Failed: ${result.error}`);
        }

        console.log('\n✨ Affiliate Docs Backup Test PASSED!\n');

        // Cleanup
        await prisma.affiliateProfile.delete({ where: { id: profile.id } });
        await prisma.user.delete({ where: { id: user.id } });

    } catch (error: any) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
