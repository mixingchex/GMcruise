#!/usr/bin/env tsx
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

const BASE_URL = 'http://localhost:3000';

async function testImagePageAccess() {
    console.log('Testing Image Management Page Access...\n');

    try {
        // 1. Login as boss1
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: 'boss1', password: '1101', mode: 'partner' }),
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status}`);
        }

        const setCookie = loginRes.headers.get('set-cookie');
        const sessionCookie = setCookie ? setCookie.split(';')[0] : '';

        if (!sessionCookie) {
            throw new Error('No session cookie received');
        }
        console.log('✅ Login successful');

        // 2. Check if page exists (Next.js pages return 200)
        // Note: Since it's a client component page, we can't fully test rendering, 
        // but we can check if the route returns 200 OK (not 404).
        // However, Next.js app router pages are rendered on server.
        // Let's check the API endpoint it uses instead to verify permissions.

        console.log('\nChecking API permissions...');
        const apiRes = await fetch(`${BASE_URL}/api/admin/images?folder=images`, {
            headers: { Cookie: sessionCookie },
        });

        if (apiRes.ok) {
            const data = await apiRes.json();
            console.log('✅ /api/admin/images access: OK');
            console.log(`   Found ${data.images?.length || 0} images`);
        } else {
            console.log(`❌ /api/admin/images access: Failed (${apiRes.status})`);
            const text = await apiRes.text();
            console.log(`   Response: ${text}`);
        }

        const cruiseApiRes = await fetch(`${BASE_URL}/api/admin/cruise-photos?folder=`, {
            headers: { Cookie: sessionCookie },
        });

        if (cruiseApiRes.ok) {
            const data = await cruiseApiRes.json();
            console.log('✅ /api/admin/cruise-photos access: OK');
            console.log(`   Found ${data.images?.length || 0} cruise photos`);
        } else {
            console.log(`❌ /api/admin/cruise-photos access: Failed (${cruiseApiRes.status})`);
            const text = await cruiseApiRes.text();
            console.log(`   Response: ${text}`);
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

testImagePageAccess();
