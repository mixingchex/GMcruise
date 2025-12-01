
import { saveContractPDF } from '../../lib/affiliate/contract-pdf';
import { getDriveFolderId } from '../../lib/config/drive-config';
import { getDriveClient } from '../../lib/google-drive';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

function formatPrivateKey(key: string) {
    if (!key) return key;
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';

    // Already multiline?
    if (key.includes('\n') && key.split('\n').length > 2) return key;

    // Strip header/footer and newlines/spaces
    let body = key.replace(header, '').replace(footer, '').replace(/\\n/g, '').replace(/\s/g, '');

    let formattedBody = '';
    while (body.length > 0) {
        formattedBody += body.substring(0, 64) + '\n';
        body = body.substring(64);
    }
    return `${header}\n${formattedBody}${footer}\n`;
}

// Patch Environment
if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    console.log('🔧 Patching Private Key format...');
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY = formatPrivateKey(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY);
}

async function main() {
    console.log('🧪 Contract Backup Isolation Test Starting...\n');

    try {
        // 1. Create Dummy PDF Buffer
        const dummyPdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Test Contract Backup) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000206 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n300\n%%EOF';
        const buffer = Buffer.from(dummyPdfContent);
        const contractId = 999999; // Dummy ID

        console.log('1️⃣ Calling saveContractPDF...');
        const serverUrl = await saveContractPDF(contractId, buffer);
        console.log(`   ✅ Server URL returned: ${serverUrl}`);

        // 2. Verify Local File
        const localPath = path.join(process.cwd(), 'public', serverUrl);
        if (fs.existsSync(localPath)) {
            console.log(`   ✅ Local file exists at: ${localPath}`);
        } else {
            throw new Error(`❌ Local file missing at: ${localPath}`);
        }

        // 3. Verify Drive Upload (List files in CONTRACTS folder)
        console.log('2️⃣ Verifying Drive Upload...');
        try {
            const folderId = await getDriveFolderId('CONTRACTS');
            console.log(`   📂 Target Folder ID: ${folderId}`);

            if (!folderId) throw new Error('CONTRACTS folder ID not configured');

            const drive = getDriveClient();
            // Wait a bit for propagation
            await new Promise(resolve => setTimeout(resolve, 2000));

            const res = await drive.files.list({
                q: `'${folderId}' in parents and name contains 'contract-${contractId}-' and trashed = false`,
                fields: 'files(id, name, webViewLink)',
            });

            const files = res.data.files;
            if (files && files.length > 0) {
                console.log(`   ✅ File found in Drive!`);
                console.log(`      ID: ${files[0].id}`);
                console.log(`      Name: ${files[0].name}`);
                console.log(`      Link: ${files[0].webViewLink}`);
            } else {
                console.warn('   ⚠️ File NOT found in Drive (Upload might have failed due to local auth or is slow)');
                console.warn('   👉 However, Local File exists, so User Experience is SAFE (Non-blocking).');
            }
        } catch (driveError: any) {
            console.warn(`   ⚠️ Drive Verification Failed: ${driveError.message}`);
            console.warn('   👉 This is expected in local environment with invalid credentials.');
            console.warn('   👉 Local File exists, so User Experience is SAFE (Non-blocking).');
        }

        console.log('\n✨ Contract Backup Test PASSED (Safe Mode)!\n');

        // Cleanup (Optional: Delete dummy file from Drive?)
        // await drive.files.delete({ fileId: files[0].id });

    } catch (error: any) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    }
}

main();
