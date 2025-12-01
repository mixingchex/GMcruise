#!/usr/bin/env tsx
/**
 * boss1 대리점장 대시보드 전체 API 엔드포인트 종합 테스트
 * 모든 빠른메뉴 기능 검증
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
const BASE_URL = 'http://localhost:3000';

const testResults: Array<{
    feature: string;
    api: string;
    status: '✅ PASS' | '❌ FAIL' | '⚠️ WARNING';
    message: string;
    details?: any;
}> = [];

function logTest(feature: string, api: string, status: '✅ PASS' | '❌ FAIL' | '⚠️ WARNING', message: string, details?: any) {
    testResults.push({ feature, api, status, message, details });
    console.log(`${status} [${feature}] ${api}`);
    console.log(`   ${message}`);
    if (details) {
        console.log(`   상세:`, JSON.stringify(details, null, 2));
    }
}

async function main() {
    console.log('════════════════════════════════════════════════════════════');
    console.log('  🧪 boss1 대리점장 대시보드 전체 기능 종합 테스트');
    console.log('  모든 빠른메뉴 기능 검증');
    console.log('════════════════════════════════════════════════════════════\n');

    let sessionCookie = '';
    let boss1Profile: any = null;

    try {
        // 0. boss1 프로필 조회
        const boss1User = await prisma.user.findFirst({
            where: { OR: [{ phone: 'boss1' }, { mallUserId: 'boss1' }] },
            include: { AffiliateProfile: true },
        });

        if (!boss1User || !boss1User.AffiliateProfile) {
            console.error('❌ boss1 사용자 또는 프로필을 찾을 수 없습니다.');
            return;
        }

        boss1Profile = boss1User.AffiliateProfile;
        console.log(`✅ boss1 프로필: ID ${boss1Profile.id}, Type: ${boss1Profile.type}\n`);

        // 1. 로그인
        console.log('📌 1. 로그인\n');
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: 'boss1', password: '1101', mode: 'partner' }),
        });

        if (!loginRes.ok) {
            logTest('로그인', 'POST /api/auth/login', '❌ FAIL', `로그인 실패 (${loginRes.status})`);
            return;
        }

        const loginData = await loginRes.json();
        const setCookie = loginRes.headers.get('set-cookie');
        if (setCookie) {
            sessionCookie = setCookie.split(';')[0];
        }

        logTest('로그인', 'POST /api/auth/login', '✅ PASS', '로그인 성공', {
            partnerId: loginData.partnerId,
            hasSession: !!sessionCookie,
        });

        if (!sessionCookie) {
            console.log('\n⚠️ 세션 쿠키를 얻지 못했습니다.');
            return;
        }

        // 2. 대시보드 통계
        console.log('\n📌 2. 대시보드 통계\n');
        const dashboardRes = await fetch(`${BASE_URL}/api/partner/dashboard`, {
            headers: { Cookie: sessionCookie },
        });

        if (!dashboardRes.ok) {
            logTest('대시보드 통계', 'GET /api/partner/dashboard', '❌ FAIL', `조회 실패 (${dashboardRes.status})`);
        } else {
            const dashboardData = await dashboardRes.json();
            logTest('대시보드 통계', 'GET /api/partner/dashboard', '✅ PASS', '통계 조회 성공', {
                ok: dashboardData.ok,
                hasStats: !!dashboardData.stats,
            });
        }

        // 3. 고객 목록 조회 (기본)
        console.log('\n📌 3. 고객 목록 조회\n');
        const customersRes = await fetch(`${BASE_URL}/api/partner/customers?page=1&limit=10`, {
            headers: { Cookie: sessionCookie },
        });

        if (!customersRes.ok) {
            logTest('고객 목록', 'GET /api/partner/customers', '❌ FAIL', `조회 실패 (${customersRes.status})`);
        } else {
            const customersData = await customersRes.json();
            logTest('고객 목록', 'GET /api/partner/customers', '✅ PASS', '고객 목록 조회 성공', {
                count: customersData.customers?.length || 0,
                total: customersData.pagination?.total || 0,
            });
        }

        // 4. 고객 목록 조회 (검색)
        console.log('\n📌 4. 고객 검색\n');
        const searchRes = await fetch(`${BASE_URL}/api/partner/customers?q=전&page=1&limit=10`, {
            headers: { Cookie: sessionCookie },
        });

        if (!searchRes.ok) {
            logTest('고객 검색', 'GET /api/partner/customers?q=전', '❌ FAIL', `검색 실패 (${searchRes.status})`);
        } else {
            const searchData = await searchRes.json();
            logTest('고객 검색', 'GET /api/partner/customers?q=전', '✅ PASS', '고객 검색 성공', {
                count: searchData.customers?.length || 0,
            });
        }

        // 5. 고객 목록 조회 (상태 필터)
        console.log('\n📌 5. 고객 상태 필터\n');
        const statusRes = await fetch(`${BASE_URL}/api/partner/customers?status=NEW&page=1&limit=10`, {
            headers: { Cookie: sessionCookie },
        });

        if (!statusRes.ok) {
            logTest('고객 상태 필터', 'GET /api/partner/customers?status=NEW', '❌ FAIL', `필터 실패 (${statusRes.status})`);
        } else {
            const statusData = await statusRes.json();
            logTest('고객 상태 필터', 'GET /api/partner/customers?status=NEW', '✅ PASS', '상태 필터 성공', {
                count: statusData.customers?.length || 0,
            });
        }

        // 6. B2B 잠재고객 조회
        console.log('\n📌 6. B2B 잠재고객 조회\n');
        const b2bRes = await fetch(`${BASE_URL}/api/partner/customers?source=b2b&page=1&limit=10`, {
            headers: { Cookie: sessionCookie },
        });

        if (!b2bRes.ok) {
            logTest('B2B 잠재고객', 'GET /api/partner/customers?source=b2b', '❌ FAIL', `조회 실패 (${b2bRes.status})`);
        } else {
            const b2bData = await b2bRes.json();
            logTest('B2B 잠재고객', 'GET /api/partner/customers?source=b2b', '✅ PASS', 'B2B 고객 조회 성공', {
                count: b2bData.customers?.length || 0,
            });
        }

        // 7. 판매원 목록
        console.log('\n📌 7. 판매원 목록\n');
        const agentsRes = await fetch(`${BASE_URL}/api/partner/agents`, {
            headers: { Cookie: sessionCookie },
        });

        if (!agentsRes.ok) {
            logTest('판매원 목록', 'GET /api/partner/agents', '❌ FAIL', `조회 실패 (${agentsRes.status})`);
        } else {
            const agentsData = await agentsRes.json();
            logTest('판매원 목록', 'GET /api/partner/agents', '✅ PASS', '판매원 목록 조회 성공', {
                count: agentsData.agents?.length || 0,
            });
        }

        // 8. 링크 목록
        console.log('\n📌 8. 링크 목록\n');
        const linksRes = await fetch(`${BASE_URL}/api/partner/links`, {
            headers: { Cookie: sessionCookie },
        });

        if (!linksRes.ok) {
            logTest('링크 목록', 'GET /api/partner/links', '❌ FAIL', `조회 실패 (${linksRes.status})`);
        } else {
            const linksData = await linksRes.json();
            logTest('링크 목록', 'GET /api/partner/links', '✅ PASS', '링크 목록 조회 성공', {
                count: linksData.links?.length || 0,
            });
        }

        // 9. 랜딩페이지 목록
        console.log('\n📌 9. 랜딩페이지 목록\n');
        const landingRes = await fetch(`${BASE_URL}/api/partner/landing-pages`, {
            headers: { Cookie: sessionCookie },
        });

        if (!landingRes.ok) {
            logTest('랜딩페이지', 'GET /api/partner/landing-pages', '❌ FAIL', `조회 실패 (${landingRes.status})`);
        } else {
            const landingData = await landingRes.json();
            logTest('랜딩페이지', 'GET /api/partner/landing-pages', '✅ PASS', '랜딩페이지 조회 성공', {
                count: landingData.pages?.length || 0,
            });
        }

        // 10. 예약메시지 목록
        console.log('\n📌 10. 예약메시지 목록\n');
        const messagesRes = await fetch(`${BASE_URL}/api/partner/scheduled-messages`, {
            headers: { Cookie: sessionCookie },
        });

        if (!messagesRes.ok) {
            logTest('예약메시지', 'GET /api/partner/scheduled-messages', '❌ FAIL', `조회 실패 (${messagesRes.status})`);
        } else {
            const messagesData = await messagesRes.json();
            logTest('예약메시지', 'GET /api/partner/scheduled-messages', '✅ PASS', '예약메시지 조회 성공', {
                count: messagesData.messages?.length || 0,
            });
        }

        // 11. 고객 그룹 목록
        console.log('\n📌 11. 고객 그룹 목록\n');
        const groupsRes = await fetch(`${BASE_URL}/api/partner/customer-groups`, {
            headers: { Cookie: sessionCookie },
        });

        if (!groupsRes.ok) {
            logTest('고객 그룹', 'GET /api/partner/customer-groups', '❌ FAIL', `조회 실패 (${groupsRes.status})`);
        } else {
            const groupsData = await groupsRes.json();
            logTest('고객 그룹', 'GET /api/partner/customer-groups', '✅ PASS', '고객 그룹 조회 성공', {
                count: groupsData.groups?.length || 0,
            });
        }

        // 12. 매출 내역
        console.log('\n📌 12. 매출 내역\n');
        const statementsRes = await fetch(`${BASE_URL}/api/partner/statements`, {
            headers: { Cookie: sessionCookie },
        });

        if (!statementsRes.ok) {
            logTest('매출 내역', 'GET /api/partner/statements', '❌ FAIL', `조회 실패 (${statementsRes.status})`);
        } else {
            const statementsData = await statementsRes.json();
            logTest('매출 내역', 'GET /api/partner/statements', '✅ PASS', '매출 내역 조회 성공', {
                ok: statementsData.ok,
            });
        }

    } catch (error: any) {
        console.error('\n❌ 테스트 실행 중 오류:', error.message);
    } finally {
        await prisma.$disconnect();
    }

    // 결과 요약
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('  📊 전체 테스트 결과 요약');
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
        console.log('❌ 실패한 테스트:\n');
        testResults
            .filter((r) => r.status === '❌ FAIL')
            .forEach((r) => {
                console.log(`  - [${r.feature}] ${r.api}`);
                console.log(`    ${r.message}\n`);
            });
    }

    if (passedTests === totalTests) {
        console.log('🎉 모든 테스트 통과! boss1 대시보드 기능이 정상 작동합니다.\n');
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
