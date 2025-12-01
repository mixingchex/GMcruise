import { getDriveClient, findOrCreateFolder } from '@/lib/google-drive';
import dotenv from 'dotenv';

dotenv.config();

async function setupBackupFolder() {
    console.log('🔍 Setting up "Backups" folder...');

    const drive = getDriveClient();
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '0AJVz1C-KYWR0Uk9PVA';

    try {
        // 1. Find or Create "Backups" folder in Root
        const backupFolder = await findOrCreateFolder('Backups', rootFolderId);

        if (!backupFolder.ok || !backupFolder.folderId) {
            throw new Error('Failed to create Backups folder');
        }

        console.log(`✅ "Backups" Folder ID: ${backupFolder.folderId}`);

        // 2. Create subfolders for organization (Optional, but good for structure)
        const subfolders = ['B2B_Leads', 'Sales_Data', 'Settlements', 'Leads', 'APIS'];

        for (const sub of subfolders) {
            const subRes = await findOrCreateFolder(sub, backupFolder.folderId);
            console.log(`   - ${sub}: ${subRes.folderId}`);
        }

        console.log('\n⚠️  Please update lib/config/drive-config.ts with the "Backups" Folder ID if you want it to be the default.');

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

setupBackupFolder();
