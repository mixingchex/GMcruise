
import { getDriveClient } from './lib/google-drive';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testDriveConnection() {
    console.log('Testing Google Drive Connection...');

    const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
    console.log(`Shared Drive ID present: ${!!sharedDriveId}`);

    try {
        const drive = getDriveClient();
        console.log('Drive client initialized.');

        // List files to verify auth
        console.log('Listing files (with supportsAllDrives)...');

        const listOptions: any = {
            pageSize: 5,
            fields: 'files(id, name, mimeType, size)',
            q: "mimeType contains 'image/' and trashed = false",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        };

        if (sharedDriveId && sharedDriveId !== 'root') {
            listOptions.corpora = 'drive';
            listOptions.driveId = sharedDriveId;
            listOptions.includeItemsFromAllDrives = true;
            listOptions.supportsAllDrives = true;
        }

        const res = await drive.files.list(listOptions);

        const files = res.data.files;
        if (files && files.length) {
            console.log(`Found ${files.length} images.`);
            files.forEach((file) => {
                console.log(`${file.name} (${file.id}) - ${file.mimeType} - ${file.size} bytes`);
            });

            // Try to fetch the first file
            const fileToFetch = files[0];
            console.log(`\nAttempting to fetch content for: ${fileToFetch.name} (${fileToFetch.id})`);

            try {
                const response = await drive.files.get({
                    fileId: fileToFetch.id!,
                    alt: 'media',
                    supportsAllDrives: true, // Important for shared drives
                }, {
                    responseType: 'arraybuffer'
                });

                console.log(`Fetch successful! Status: ${response.status}`);
                console.log(`Data length: ${(response.data as ArrayBuffer).byteLength} bytes`);
            } catch (fetchError: any) {
                console.error('Error fetching file content:', fetchError.message);
            }

        } else {
            console.log('No images found.');
        }
        console.log('Test completed.');
    } catch (error: any) {
        console.error('Connection failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testDriveConnection();
