#!/usr/bin/env tsx
/**
 * boss1 대리점장 대시보드 API 엔드포인트 격리 테스트
 * 
 * 채민관 CTO 디버깅 전략 적용:
 * - 실제 API 엔드포인트를 독립적으로 호출
 * - 로그인 후 실제 요청 흐름 테스트
 * - 각 API의 입력/출력 검증
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

const testResults: Array<{
    api: string;
    status: '✅ PASS' | '❌ FAIL' | '⚠️ WARNING';
    message: string;
    details?: any;
}> = [];

function logTest(api: string, status: '✅ PASS' | '❌ FAIL' | '⚠️ WARNING', message: string, details?: any) {
    testResults.push({ api, status, message, details });
    console.log(`${status} ${api}: ${message}`);
    if (details) {
        console.log(`   상세:`, JSON.stringify(details, null, 2));
    }
}

async function main() {
    console.log('════════════════════════════════════════════════════════════');
    console.log('  🧪 boss1 대리점장 대시보드 API 엔드포인트 테스트');
    console.log('  채민관 CTO 디버깅 전략: 격리된 API 호출 테스트');
    console.log('════════════════════════════════════════════════════════════\n');

    let sessionCookie = '';
    let boss1Profile: any = null;

    try {
        // ===================================
        // 0. 사전 준비: boss1 프로필 조회
        // ===================================
        console.log('\n📌 0. 사전 준비: boss1 프로필 정보 조회\n');

        const boss1User = await prisma.user.findFirst({
            where: { OR: [{ phone: 'boss1' }, { mallUserId: 'boss1' }] },
            include: {
                AffiliateProfile: true,
            },
        });

        if (!boss1User || !boss1User.AffiliateProfile) {
            console.error('❌ boss1 사용자 또는 프로필을 찾을 수 없습니다.');
            return;
        }

        boss1Profile = boss1User.AffiliateProfile;
        console.log(`✅ boss1 프로필 ID: ${boss1Profile.id}, Type: ${boss1Profile.type}`);

        // ===================================
        // 1. 로그인 API 테스트
        // ===================================
        console.log('\n📌 1. 로그인 API 테스트\n');

        try {
            const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier: 'boss1',
                    password: '1101',
                    mode: 'partner',
                }),
            });

            if (!loginResponse.ok) {
                logTest('POST /api/auth/login', '❌ FAIL', `로그인 실패 (${loginResponse.status})`);
            } else {
                const loginData = await loginResponse.json();
                const setCookieHeader = loginResponse.headers.get('set-cookie');

                if (setCookieHeader) {
                    sessionCookie = setCookieHeader.split(';')[0];
                }

                logTest('POST /api/auth/login', '✅ PASS', '로그인 성공', {
                    ok: loginData.ok,
                    role: loginData.user?.role,
                    hasSession: !!sessionCookie,
                });
            }
        } catch (err: any) {
            logTest('POST /api/auth/login', '❌ FAIL', '로그인 요청 실패', err.message);
            console.log('\n⚠️ 개발 서버가 실행 중인지 확인해주세요 (localhost:3000)');
            return;
        }

        if (!sessionCookie) {
            console.log('\n⚠️ 세션 쿠키를 얻지 못했습니다. API 테스트를 건너뜁니다.');
            return;
        }

        // ===================================
        // 2. 고객 목록 조회 API
        // ===================================
        console.log('\n📌 2. 고객 목록 조회 API 테스트\n');

        try {
            const customersResponse = await fetch(
                `http://localhost:3000/api/partner/${boss1Profile.id}/customers?page=1&limit=5`,
                {
                    method: 'GET',
                    headers: {
                        Cookie: sessionCookie,
                    },
                }
            );

            if (!customersResponse.ok) {
                logTest('GET /api/partner/customers', '❌ FAIL', `조회 실패 (${customersResponse.status})`);
            } else {
                const customersData = await customersResponse.json();
                logTest('GET /api/partner/customers', '✅ PASS', '고객 목록 조회 성공', {
                    customersCount: customersData.customers?.length || 0,
                    totalPages: customersData.pagination?.totalPages || 0,
                });
            }
        } catch (err: any) {
            logTest('GET /api/partner/customers', '❌ FAIL', 'API 요청 실패', err.message);
        }

        // ===================================
        // 3. B2B 잠재고객 조회 API
        // ===================================
        console.log('\n📌 3. B2B 잠재고객 조회 API 테스트\n');

        try {
            const b2bResponse = await fetch(
                `http://localhost:3000/api/partner/${boss1Profile.id}/b2b-prospects?page=1&limit=5`,
                {
                    method: 'GET',
                    headers: {
                        Cookie: sessionCookie,
                    },
                }
            );

            if (!b2bResponse.ok) {
                logTest('GET /api/partner/b2b-prospects', '❌ FAIL', `조회 실패 (${b2bResponse.status})`);
            } else {
                const b2bData = await b2bResponse.json();
                logTest('GET /api/partner/b2b-prospects', '✅ PASS', 'B2B 잠재고객 조회 성공', {
                    leadsCount: b2bData.leads?.length || 0,
                    totalPages: b2bData.pagination?.totalPages || 0,
                });
            }
        } catch (err: any) {
            logTest('GET /api/partner/b2b-prospects', '❌ FAIL', 'API 요청 실패', err.message);
        }

        // ===================================
        // 4. 대시보드 통계 API
        // ===================================
        console.log('\n📌 4. 대시보드 통계 API 테스트\n');

        try {
            const dashboardResponse = await fetch(
                `http://localhost:3000/api/partner/${boss1Profile.id}/dashboard`,
                {
                    method: 'GET',
                    headers: {
                        Cookie: sessionCookie,
                    },
                }
            );

            if (!dashboardResponse.ok) {
                logTest('GET /api/partner/dashboard', '❌ FAIL', `조회 실패 (${dashboardResponse.status})`);
            } else {
                const dashboardData = await dashboardResponse.json();
                logTest('GET /api/partner/dashboard', '✅ PASS', '대시보드 통계 조회 성공', {
                    hasStats: !!dashboardData.stats,
                    ok: dashboardData.ok,
                });
            }
        } catch (err: any) {
            logTest('GET /api/partner/dashboard', '❌ FAIL', 'API 요청 실패', err.message);
        }

        // ===================================
        // 5. 소속 판매원 목록 API
        // ===================================
        console.log('\n📌 5. 소속 판매원 목록 API 테스트\n');

        try {
            const agentsResponse = await fetch(
                `http://localhost:3000/api/partner/${boss1Profile.id}/agents`,
                {
                    method: 'GET',
                    headers: {
                        Cookie: sessionCookie,
                    },
                }
            );

            if (!agentsResponse.ok) {
                logTest('GET /api/partner/agents', '❌ FAIL', `조회 실패 (${agentsResponse.status})`);
            } else {
                const agentsData = await agentsResponse.json();
                logTest('GET /api/partner/agents', '✅ PASS', '판매원 목록 조회 성공', {
                    agentsCount: agentsData.agents?.length || 0,
                });
            }
        } catch (err: any) {
            logTest('GET /api/partner/agents', '❌ FAIL', 'API 요청 실패', err.message);
        }

        // ===================================
        // 6. 링크 목록 API
        // ===================================
        console.log('\n📌 6. 링크 목록 API 테스트\n');

        try {
            const linksResponse = await fetch(
                `http://localhost:3000/api/partner/${boss1Profile.id}/links`,
                {
                    method: 'GET',
                    headers: {
                        Cookie: sessionCookie,
                    },
                }
            );

            if (!linksResponse.ok) {
                logTest('GET /api/partner/links', '❌ FAIL', `조회 실패 (${linksResponse.status})`);
            } else {
                const linksData = await linksResponse.json();
                logTest('GET /api/partner/links', '✅ PASS', '링크 목록 조회 성공', {
                    linksCount: linksData.links?.length || 0,
                });
            }
        } catch (err: any) {
            logTest('GET /api/partner/links', '❌ FAIL', 'API 요청 실패', err.message);
        }

    } catch (error: any) {
        console.error('\n❌ 전체 API 테스트 실행 중 오류:', error);
    } finally {
        await prisma.$disconnect();
    }

    // ===================================
    // 📊 테스트 결과 요약
    // ===================================
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('  📊 API 테스트 결과 요약');
    console.log('════════════════════════════════════════════════════════════\n');

    const totalTests = testResults.length;
    const passedTests = testResults.filter((r) => r.status === '✅ PASS').length;
    const failedTests = testResults.filter((r) => r.status === '❌ FAIL').length;
    const warningTests = testResults.filter((r) => r.status === '⚠️ WARNING').length;

    console.log(`총 API 테스트: ${totalTests}개`);
    console.log(`✅ 성공: ${passedTests}개`);
    console.log(`❌ 실패: ${failedTests}개`);
    console.log(`⚠️ 경고: ${warningTests}개\n`);

    if (failedTests > 0) {
        console.log('실패한 API 테스트:');
        testResults
            .filter((r) => r.status === '❌ FAIL')
            .forEach((r) => {
                console.log(`  - ${r.api}: ${r.message}`);
            });
        console.log('');
    }

    console.log('════════════════════════════════════════════════════════════\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

main()
    .catch((error) => {
        console.error('❌ 스크립트 실행 중 치명적 오류:', error);
        process.exit(1);
    });
