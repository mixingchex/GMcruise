
import { enqueueApisSync } from '@/lib/apis-sync-queue';
import prisma from '@/lib/prisma';

async function main() {
    console.log('Testing APIS Queue Import...');
    try {
        // Just check if we can access the model property on prisma client
        // @ts-ignore
        if (prisma.apisSyncQueue) {
            console.log('prisma.apisSyncQueue exists.');
        } else {
            console.log('prisma.apisSyncQueue DOES NOT exist.');
        }

        console.log('Calling enqueueApisSync (dry run)...');
        // We pass a dummy ID, it might fail logic but we want to see if it crashes on model access
        await enqueueApisSync('TRIP_SHEET', 999999);
        console.log('enqueueApisSync called without crashing.');
    } catch (e) {
        console.error('Error during test:', e);
    }
}

main();
