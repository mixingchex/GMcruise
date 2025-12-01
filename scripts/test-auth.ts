
import { getDriveClient } from '@/lib/google-drive';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('🔍 Testing Google Drive Auth...');

    try {
        const email = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
        const rawKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY || '';

        console.log('📧 Email:', email);
        console.log('🔑 Raw Key Length:', rawKey.length);
        console.log('🔑 Raw Key Start:', rawKey.substring(0, 50));

        // Simulate the replacement logic in google-drive.ts
        const processedKey = rawKey
            .replace(/^[\"\']+|[\"\']+$/g, '')
            .trim()
            .replace(/\\n/g, '\n');

        console.log('🔑 Processed Key Length:', processedKey.length);
        console.log('🔑 Processed Key Start:', processedKey.substring(0, 50));
        console.log('🔑 Processed Key Contains Real Newlines:', processedKey.includes('\n'));

        const drive = getDriveClient();
        const res = await drive.files.list({ pageSize: 1 });
        console.log('✅ Auth Success! File count:', res.data.files?.length);

    } catch (error: any) {
        console.error('❌ Auth Failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

main();
