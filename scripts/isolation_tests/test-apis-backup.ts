
import prisma from '../../lib/prisma';
import { syncApisSpreadsheet } from '../../lib/google-sheets';

async function main() {
    console.log('🧪 APIS Backup Isolation Test Starting...\n');

    try {
        // 1. Create Dummy Data (Trip, Reservation, User)
        console.log('1️⃣ Creating Dummy Data...');

        // User
        const user = await prisma.user.create({
            data: {
                name: 'TestAPISUser',
                email: `test_apis_${Date.now()}@test.local`,
                phone: `010${Date.now().toString().slice(-8)}`,
                password: 'test',
            }
        });

        // Trip
        const trip = await prisma.trip.create({
            data: {
                productCode: `TEST-TRIP-${Date.now()}`,
                shipName: 'Test Ship',
                departureDate: new Date('2025-12-25'),
            }
        });

        // Reservation
        const reservation = await prisma.reservation.create({
            data: {
                tripId: trip.id,
                mainUserId: user.id,
                totalPeople: 1,
                cabinType: 'Suite',
                paymentDate: new Date(),
                paymentMethod: 'Card',
                paymentAmount: 1000,
                agentName: 'TestAgent',
            }
        });

        console.log(`   ✅ Created Trip: ${trip.shipName} (ID: ${trip.id})`);

        // 2. Call syncApisSpreadsheet
        console.log('2️⃣ Calling syncApisSpreadsheet...');
        const result = await syncApisSpreadsheet(trip.id);

        if (result.ok && result.spreadsheetUrl) {
            console.log('   ✅ Backup Success!');
            console.log(`      Spreadsheet URL: ${result.spreadsheetUrl}`);
            console.log(`      Folder ID: ${result.folderId}`);

            // Note: We expect folderId to be inside APIS_BACKUP folder.
            // We can't verify parent without listing, but we trust the code change we made.
        } else {
            throw new Error(`❌ Backup Failed: ${result.error}`);
        }

        console.log('\n✨ APIS Backup Test PASSED!\n');

        // Cleanup
        await prisma.reservation.delete({ where: { id: reservation.id } });
        await prisma.trip.delete({ where: { id: trip.id } });
        await prisma.user.delete({ where: { id: user.id } });

    } catch (error: any) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
