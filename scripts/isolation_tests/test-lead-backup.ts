
import { appendB2BLeadToSheet } from '../../lib/google/b2b-backup';

async function main() {
    console.log('🧪 Lead Backup Isolation Test Starting...\n');

    try {
        const dummyLead = {
            name: 'Test Lead',
            phone: '010-0000-0000',
            partnerName: 'Test Partner',
            source: 'TEST_SCRIPT',
            createdAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            notes: 'This is a test lead from isolation script.'
        };

        console.log('1️⃣ Calling appendB2BLeadToSheet...');
        console.log('   Data:', dummyLead);

        const result = await appendB2BLeadToSheet(dummyLead);

        if (result.ok) {
            console.log('   ✅ Backup Success!');
            if (result.spreadsheetUrl) {
                console.log(`      Spreadsheet URL: ${result.spreadsheetUrl}`);
            }
        } else {
            throw new Error(`❌ Backup Failed: ${result.error}`);
        }

        console.log('\n✨ Lead Backup Test PASSED!\n');

    } catch (error: any) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    }
}

main();
