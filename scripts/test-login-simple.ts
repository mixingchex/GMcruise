#!/usr/bin/env tsx
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

async function testLogin() {
    console.log('Testing login API...\n');

    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: 'boss1',
                password: '1101',
                mode: 'partner',
            }),
        });

        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        const data = await response.json();
        console.log('\nResponse body:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('\n✅ Login successful!');
        } else {
            console.log('\n❌ Login failed');
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

testLogin();
