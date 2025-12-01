
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') });

const TARGET_ROOT_FOLDER_ID = '0AJVz1C-KYWR0Uk9PVA';
const FOLDERS_TO_CREATE = ['Meeting_Recordings', 'B2B_DB_Backup', 'Passports'];

function getDriveClient() {
    const rawPrivateKey =
        process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ||
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
        process.env.GOOGLE_PRIVATE_KEY ||
        process.env.PRIVATE_KEY;

    const clientEmail =
        process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ||
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
        process.env.GOOGLE_CLIENT_EMAIL ||
        process.env.CLIENT_EMAIL;

    if (!rawPrivateKey || !clientEmail) {
        console.error('Missing Google Drive credentials in .env');
        process.exit(1);
    }

    console.log('Client Email:', clientEmail);
    console.log('Raw Key Length:', rawPrivateKey.length);
    console.log('Contains \\n literal:', rawPrivateKey.includes('\\n'));
    console.log('Contains newline char:', rawPrivateKey.includes('\n'));

    // Replace literal \n with actual newline
    const privateKey = rawPrivateKey
        .replace(/\\n/g, '\n')
        .replace(/^["']+|["']+$/g, '') // Remove surrounding quotes if any
        .trim();

    console.log('Processed Key Length:', privateKey.length);
    console.log('Processed Key Start:', privateKey.substring(0, 40));
    console.log('Processed Key End:', privateKey.substring(privateKey.length - 40));

    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        console.error('ERROR: Key does not contain BEGIN header');
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
    });

    return google.drive({ version: 'v3', auth });
}

async function createMissingFolders() {
    try {
        const drive = getDriveClient();
        console.log(`Checking folders in: ${TARGET_ROOT_FOLDER_ID}`);

        for (const folderName of FOLDERS_TO_CREATE) {
            // Check if folder exists
            const folderList = await drive.files.list({
                q: `'${TARGET_ROOT_FOLDER_ID}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                fields: 'files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });

            if (folderList.data.files && folderList.data.files.length > 0) {
                console.log(`✅ Folder already exists: ${folderName} (${folderList.data.files[0].id})`);
            } else {
                // Create folder
                const newFolder = await drive.files.create({
                    requestBody: {
                        name: folderName,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [TARGET_ROOT_FOLDER_ID],
                    },
                    fields: 'id',
                    supportsAllDrives: true,
                });
                console.log(`✨ Created folder: ${folderName} (${newFolder.data.id})`);
            }
        }
        console.log('Folder check complete.');
    } catch (error) {
        console.error('Error creating folders:', error);
    }
}

createMissingFolders();
