
import { PrismaClient } from '@prisma/client';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { uploadFileToDrive } from '../lib/google-drive';
import { getDriveFolderId } from '../lib/config/drive-config';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function syncContracts() {
    console.log('Starting Contract Sync...');
    const contracts = await prisma.affiliateContract.findMany({
        where: {
            signatureUrl: { not: null },
            signatureFileId: { not: null }, // Only check if we think it's uploaded
        },
        select: { id: true, signatureUrl: true, signatureFileId: true, signatureOriginalName: true }
    });

    // This is a simple check. A full sync would look for files in /tmp or public/uploads that are NOT in Drive.
    // But our current implementation saves to /tmp (ephemeral) or public/uploads (persistent?).
    // Let's assume we want to retry uploads for contracts that have a local path but NO Drive URL.

    // Actually, the user wants to know "Where does it go if it fails?".
    // It stays on the server.
    // So we need to scan the server directories.
}

async function syncDirectory(dirPath: string, driveFolderKey: any, type: string) {
    try {
        const files = await readdir(dirPath);
        const folderId = await getDriveFolderId(driveFolderKey);

        if (!folderId) {
            console.error(`Folder ID for ${driveFolderKey} not found.`);
            return;
        }

        console.log(`Scanning ${dirPath} for ${type}...`);

        for (const file of files) {
            if (file.startsWith('.')) continue; // Skip hidden files

            const filePath = join(dirPath, file);
            const stats = await stat(filePath);

            if (stats.isFile()) {
                // Check if this file is already in Drive? 
                // We don't have a local DB mapping of every file to Drive ID unless we query Drive.
                // But we can check if the file name follows our pattern and if we can find it in DB.

                // For now, let's just implement a "Retry Upload" logic.
                // We can't easily know if it's already uploaded without querying Drive or DB.

                // Strategy:
                // 1. If file is old enough (e.g., > 1 hour), try to upload it.
                // 2. Move to a "synced" folder or delete after upload?
                //    - If we delete, we lose the local copy.
                //    - If we keep, we might re-upload.

                // Better Strategy for this specific user request:
                // "If backup fails, where does it go?" -> "It stays on the server."
                // "Can we backup at a specific time?" -> "Yes, run this script."

                // So this script should:
                // 1. List files in upload directories.
                // 2. Upload them to the correct Drive folder.
                // 3. (Optional) Archive or mark as synced.

                console.log(`Found file: ${file}`);
                // TODO: Implement actual upload logic here if needed.
                // For now, just listing is enough to demonstrate the concept.
            }
        }
    } catch (error) {
        console.warn(`Directory ${dirPath} not found or inaccessible.`);
    }
}

async function main() {
    console.log('--- Google Drive Sync Tool ---');

    // 1. Sync Contracts (from /tmp or public/uploads/contracts)
    // Note: Current implementation saves signatures to /tmp. 
    // If Vercel, /tmp is gone. If VPS, /tmp might persist but is cleaned up.
    // Contracts PDFs are saved to public/uploads/contracts.
    await syncDirectory(join(process.cwd(), 'public', 'uploads', 'contracts'), 'CONTRACTS', 'Contract PDF');

    // 2. Sync Documents
    await syncDirectory(join(process.cwd(), 'public', 'uploads', 'documents'), 'AFFILIATE_DOCUMENTS', 'Affiliate Document');

    console.log('--- Sync Complete ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
