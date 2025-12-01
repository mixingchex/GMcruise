
import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

function getDriveClient() {
    const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
        throw new Error('Google Drive credentials missing');
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
    });

    return google.drive({ version: 'v3', auth });
}

async function findFolderId(drive: any, folderName: string) {
    try {
        const response = await drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
            fields: 'files(id, name, parents)',
        });

        const files = response.data.files;
        if (files && files.length > 0) {
            console.log(`Found folder '${folderName}':`, files[0].id);
            return files[0].id;
        } else {
            console.log(`Folder '${folderName}' not found.`);
            return null;
        }
    } catch (error) {
        console.error(`Error searching for ${folderName}:`, error);
        return null;
    }
}

async function main() {
    try {
        const drive = getDriveClient();

        // Search for the missing folders
        const contractsId = await findFolderId(drive, 'contracts-pdfs');
        const affiliateDocsId = await findFolderId(drive, 'Affiliate_Documents');

        // Update SystemConfig if found
        if (contractsId) {
            console.log('Updating CONTRACTS config...');
            await prisma.systemConfig.upsert({
                where: { configKey: 'google_drive_contracts_folder_id' },
                update: { configValue: contractsId, category: 'drive_config' },
                create: {
                    configKey: 'google_drive_contracts_folder_id',
                    configValue: contractsId,
                    description: 'Google Drive Folder ID for CONTRACTS',
                    category: 'drive_config'
                },
            });
        }

        if (affiliateDocsId) {
            console.log('Updating AFFILIATE_DOCUMENTS config...');
            await prisma.systemConfig.upsert({
                where: { configKey: 'google_drive_affiliate_documents_folder_id' },
                update: { configValue: affiliateDocsId, category: 'drive_config' },
                create: {
                    configKey: 'google_drive_affiliate_documents_folder_id',
                    configValue: affiliateDocsId,
                    description: 'Google Drive Folder ID for AFFILIATE_DOCUMENTS',
                    category: 'drive_config'
                },
            });
        }

        console.log('---------------------------------------------------');
        console.log('FOUND IDs (Please add these to Vercel Environment Variables):');
        if (contractsId) console.log(`GOOGLE_DRIVE_CONTRACTS_FOLDER_ID=${contractsId}`);
        else console.log('GOOGLE_DRIVE_CONTRACTS_FOLDER_ID=NOT_FOUND (Please create folder "contracts-pdfs" manually)');

        if (affiliateDocsId) console.log(`GOOGLE_DRIVE_AFFILIATE_DOCUMENTS_FOLDER_ID=${affiliateDocsId}`);
        else console.log('GOOGLE_DRIVE_AFFILIATE_DOCUMENTS_FOLDER_ID=NOT_FOUND (Please create folder "Affiliate_Documents" manually)');
        console.log('---------------------------------------------------');

    } catch (error) {
        console.error('Script failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
