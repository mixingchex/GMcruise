
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGoogleDriveConnection() {
    console.log('Testing Google Drive Connection...');

    const clientEmail =
        process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ||
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey =
        process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ||
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    console.log('Environment Variables Check:');
    console.log('- GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ? 'Set' : 'Missing');
    console.log('- GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'Set' : 'Missing');
    console.log('- GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY:', process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'Set' : 'Missing');
    console.log('- GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:', process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'Set' : 'Missing');

    if (!clientEmail || !privateKey) {
        console.error('ERROR: Google Drive Service Account credentials are missing.');
        return;
    }

    try {
        // Private key processing logic from app/api/admin/cruise-photos/route.ts
        let processedKey = privateKey;

        if ((processedKey.startsWith('"') && processedKey.endsWith('"')) ||
            (processedKey.startsWith("'") && processedKey.endsWith("'"))) {
            processedKey = processedKey.slice(1, -1);
        }

        if (processedKey.includes('\\n')) {
            processedKey = processedKey.replace(/\\n/g, '\n');
        }

        processedKey = processedKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        console.log('Private Key processed successfully.');
        console.log('- Length:', processedKey.length);
        console.log('- Starts with:', processedKey.substring(0, 30));
        console.log('- Ends with:', processedKey.substring(processedKey.length - 30));

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: clientEmail,
                private_key: processedKey,
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        const drive = google.drive({ version: 'v3', auth });

        console.log('Attempting to list files from Google Drive...');
        const response = await drive.files.list({
            pageSize: 5,
            fields: 'files(id, name)',
        });

        console.log('Connection Successful!');
        console.log('Files found:', response.data.files?.length || 0);
        if (response.data.files && response.data.files.length > 0) {
            response.data.files.forEach(file => {
                console.log(`- ${file.name} (${file.id})`);
            });
        }

    } catch (error: any) {
        console.error('Connection Failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testGoogleDriveConnection();
