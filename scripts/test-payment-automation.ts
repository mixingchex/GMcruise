import 'dotenv/config';
import { ensureTripFolder, ensureApisSheet, recordPaymentToPurchasedList, initApisSheetRows, uploadCertificateToDrive } from '../lib/google-automation';
import { generateCertificatePng } from '../lib/certificate-generator';
import fs from 'fs';
import path from 'path';

async function testAutomation() {
    console.log('🚀 Starting Payment Automation Test...');

    const testData = {
        productName: 'Test Cruise Product',
        departureDate: '2025-12-25',
        customerName: 'Test User',
        customerPhone: '010-1234-5678',
        amount: 1000000,
        headcount: 2,
        orderId: 'TEST-ORDER-12345',
        managerName: 'Test Manager',
        channel: 'Test Channel'
    };

    try {
        // 1. Test Google Drive & Sheets
        console.log('\n📂 Testing Google Drive & Sheets...');
        const folderId = await ensureTripFolder(testData.productName, testData.departureDate);
        console.log('✅ Folder created/found:', folderId);

        const sheetId = await ensureApisSheet(folderId, testData.productName, testData.departureDate);
        console.log('✅ APIS Sheet created/found:', sheetId);

        await recordPaymentToPurchasedList(testData);
        console.log('✅ Payment recorded to Purchased List');

        await initApisSheetRows(sheetId, testData);
        console.log('✅ APIS Sheet initialized with rows');

        // 2. Test Certificate Generation
        console.log('\n🖼️ Testing Certificate Generation...');
        const pngBuffer = await generateCertificatePng({
            customerName: testData.customerName,
            birthDate: '1990-01-01',
            productName: testData.productName,
            paymentAmount: testData.amount,
            paymentDate: '2025-12-05',
            orderId: testData.orderId,
            managerName: testData.managerName
        });

        const outputPath = path.join(process.cwd(), 'test-certificate.png');
        fs.writeFileSync(outputPath, pngBuffer);
        console.log(`✅ Certificate PNG generated and saved to: ${outputPath}`);

        // 3. Test Drive Upload
        console.log('\n☁️ Testing Certificate Upload to Drive...');
        const fileId = await uploadCertificateToDrive(pngBuffer, `TEST_CERT_${testData.customerName}_${testData.departureDate}.png`);
        console.log(`✅ Certificate uploaded to Drive. File ID: ${fileId}`);

        console.log('\n✨ All tests passed successfully!');
    } catch (error) {
        console.error('\n❌ Test failed:', error);
    }
}

testAutomation();
