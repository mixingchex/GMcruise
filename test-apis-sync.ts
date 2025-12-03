import { syncApisSpreadsheet } from './lib/google-sheets';

async function main() {
    const tripId = 1; // Replace with actual ID if different
    console.log(`Testing APIS sync for Trip ID: ${tripId}`);
    const result = await syncApisSpreadsheet(tripId);
    console.log('Result:', result);
}

main().catch(console.error);
