#!/usr/bin/env tsx
/**
 * 모든 대리점장(boss) 대시보드 일괄 점검 스크립트
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const results: Record<string, { passed: number; failed: number; errors: string[] }> = {};

async function testBoss(identifier: string) {
    console.log(`\n════════════════════════════════════════════════════════════`);
    console.log(`  🧪 Testing Dashboard for: ${identifier}`);
    console.log(`════════════════════════════════════════════════════════════`);

    results[identifier] = { passed: 0, failed: 0, errors: [] };
    let sessionCookie = '';

    // 1. Login
    try {
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: identifier, password: '1101', mode: 'partner' }),
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status}`);
        }

        const setCookie = loginRes.headers.get('set-cookie');
        if (setCookie) {
            sessionCookie = setCookie.split(';')[0];
        }

        if (!sessionCookie) {
            throw new Error('No session cookie received');
        }

        console.log('✅ Login successful');
        results[identifier].passed++;
    } catch (e: any) {
        console.error(`❌ Login error: ${e.message}`);
        results[identifier].failed++;
        results[identifier].errors.push(`Login: ${e.message}`);
        return; // Stop if login fails
    }

    // Define endpoints to test
    const endpoints = [
        { name: 'Dashboard Stats', url: '/api/partner/dashboard' },
        { name: 'Customer List', url: '/api/partner/customers?page=1&limit=5' },
        { name: 'Customer Search', url: '/api/partner/customers?q=test' },
        { name: 'Customer Filter', url: '/api/partner/customers?status=NEW' },
        { name: 'B2B Prospects', url: '/api/partner/customers?source=b2b' },
        { name: 'Agent List', url: '/api/partner/agents' },
        { name: 'Link List', url: '/api/partner/links' },
        { name: 'Landing Pages', url: '/api/partner/landing-pages' },
        { name: 'Scheduled Messages', url: '/api/partner/scheduled-messages' },
        { name: 'Customer Groups', url: '/api/partner/customer-groups' },
        { name: 'Sales Statements', url: '/api/partner/statements' },
    ];

    for (const endpoint of endpoints) {
        try {
            const res = await fetch(`${BASE_URL}${endpoint.url}`, {
                headers: { Cookie: sessionCookie },
            });

            if (!res.ok) {
                throw new Error(`Status ${res.status}`);
            }

            const data = await res.json();
            if (data.ok === false) {
                throw new Error(data.message || 'Unknown error');
            }

            console.log(`✅ ${endpoint.name}: OK`);
            results[identifier].passed++;
        } catch (e: any) {
            console.error(`❌ ${endpoint.name}: Failed (${e.message})`);
            results[identifier].failed++;
            results[identifier].errors.push(`${endpoint.name}: ${e.message}`);
        }
    }
}

async function main() {
    console.log('Searching for Branch Managers...');

    const bosses = await prisma.user.findMany({
        where: {
            OR: [
                { phone: { startsWith: 'boss' } },
                { mallUserId: { startsWith: 'boss' } }
            ]
        },
        orderBy: { id: 'asc' }
    });

    console.log(`Found ${bosses.length} boss accounts. Starting tests...\n`);

    for (const boss of bosses) {
        const identifier = boss.phone || boss.mallUserId || '';
        if (identifier) {
            await testBoss(identifier);
        }
    }

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('  📊 Final Summary');
    console.log('════════════════════════════════════════════════════════════\n');

    let totalPassed = 0;
    let totalFailed = 0;

    Object.entries(results).forEach(([id, res]) => {
        const status = res.failed === 0 ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${id}: ${res.passed} passed, ${res.failed} failed`);
        if (res.failed > 0) {
            res.errors.forEach(err => console.log(`   - ${err}`));
        }
        totalPassed += res.passed;
        totalFailed += res.failed;
    });

    console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed`);

    if (totalFailed > 0) {
        process.exit(1);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());
