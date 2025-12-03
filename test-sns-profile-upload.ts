
import { getDriveFolderId } from './lib/config/drive-config';
import { uploadFileToDrive } from './lib/google-drive';
import { getGoogleAuth } from './lib/google-drive';

async function testSnsProfileUpload() {
    console.log('=== SNS Profile Upload Isolation Test ===');

    try {
        // 1. Verify Auth
        console.log('1. Verifying Google Auth...');
        const auth = getGoogleAuth();
        console.log('   Auth initialized successfully.');

        // 2. Get PROFILES Folder ID
        console.log('2. Getting PROFILES Folder ID...');
        const profilesFolderId = await getDriveFolderId('PROFILES');
        console.log(`   PROFILES Folder ID: ${profilesFolderId}`);

        if (!profilesFolderId) {
            throw new Error('PROFILES folder ID is missing in configuration.');
        }

        if (profilesFolderId !== '13roFq5i51155_DG4MR74dqyWrR6GRAG9') {
            console.warn(`   WARNING: Configured ID (${profilesFolderId}) does not match user requested ID (13roFq5i51155_DG4MR74dqyWrR6GRAG9).`);
        } else {
            console.log('   Folder ID matches user request.');
        }

        // 3. Simulate File Upload
        console.log('3. Simulating File Upload...');
        const dummyContent = 'This is a test file for SNS Profile Upload Isolation Test.';
        const buffer = Buffer.from(dummyContent);
        const fileName = `test-sns-profile-${Date.now()}.txt`;

        const uploadResult = await uploadFileToDrive({
            folderId: profilesFolderId,
            fileName,
            mimeType: 'text/plain',
            buffer,
            makePublic: true,
        });

        if (!uploadResult.ok || !uploadResult.fileId) {
            throw new Error(`Upload failed: ${uploadResult.error}`);
        }

        console.log(`   Upload successful!`);
        console.log(`   File ID: ${uploadResult.fileId}`);
        console.log(`   URL: ${uploadResult.url}`);

        // 4. Verify Visibility (Proxy URL Logic)
        console.log('4. Verifying Visibility Logic...');
        const fileId = uploadResult.fileId;
        const proxyUrl = `/api/admin/mall/google-drive-image?fileId=${fileId}`;
        console.log(`   Constructed Proxy URL: ${proxyUrl}`);
        console.log('   (Note: This script cannot test the actual HTTP response of the proxy, but confirms the ID is available for it.)');

        console.log('=== Test Passed ===');

    } catch (error: any) {
        console.error('=== Test Failed ===');
        console.error(error);
        process.exit(1);
    }
}

testSnsProfileUpload();
