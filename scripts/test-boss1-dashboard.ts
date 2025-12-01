#!/usr/bin/env tsx
/**
 * boss1 대리점장 대시보드 기능별 격리 테스트 스크립트
 * 
 * 채민관 CTO 디버깅 전략 적용:
 * - 각 기능을 독립적으로 테스트
 * - 로그인이나 앞 단계 없이 기능만 격리해서 검증
 * - 입력/출력(Input/Output) 명확히 확인
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

// 테스트 결과 저장
const testResults: Array<{
    feature: string;
    status: '✅ PASS' | '❌ FAIL' | '⚠️ WARNING';
    message: string;
    error?: any;
}> = [];

function logTest(feature: string, status: '✅ PASS' | '❌ FAIL' | '⚠️ WARNING', message: string, error?: any) {
    testResults.push({ feature, status, message, error });
    console.log(`${status} ${feature}: ${message}`);
    if (error) {
        console.error(`   상세 오류:`, error.message || error);
    }
}

async function main() {
    console.log('════════════════════════════════════════════════════════════');
    console.log('  🧪 boss1 대리점장 대시보드 격리 기능 테스트');
    console.log('  채민관 CTO 디버깅 전략 적용');
    console.log('════════════════════════════════════════════════════════════\n');

    try {
        // ===================================
        // 1. boss1 프로필 확인 (기본 데이터)
        // ===================================
        console.log('\n📌 1. boss1 계정 기본 정보 확인\n');

        const boss1User = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: 'boss1' },
                    { mallUserId: 'boss1' },
                ],
            },
        });

        if (!boss1User) {
            logTest('boss1 계정', '❌ FAIL', 'boss1 사용자를 찾을 수 없습니다');
            console.log('\n⚠️ boss1 계정이 없어 나머지 테스트를 진행할 수 없습니다.');
            return;
        }

        logTest('boss1 계정', '✅ PASS', `ID: ${boss1User.id}, 이름: ${boss1User.name}`);

        const boss1Profile = await prisma.affiliateProfile.findUnique({
            where: { userId: boss1User.id },
            include: {
                User: true,
            },
        });

        if (!boss1Profile) {
            logTest('boss1 프로필', '❌ FAIL', 'AffiliateProfile을 찾을 수 없습니다');
            return;
        }

        logTest('boss1 프로필', '✅ PASS', `Profile ID: ${boss1Profile.id}, Type: ${boss1Profile.type}`);

        // ===================================
        // 2. 고객 목록 조회 (AffiliateLead 조회)
        // ===================================
        console.log('\n📌 2. 고객 목록 조회 기능 테스트\n');

        try {
            const myLeads = await prisma.affiliateLead.findMany({
                where: {
                    OR: [
                        { managerId: boss1Profile.id },
                        { agentId: boss1Profile.id },
                    ],
                },
                take: 5,
                include: {
                    AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile: {
                        select: {
                            id: true,
                            displayName: true,
                        },
                    },
                    AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile: {
                        select: {
                            id: true,
                            displayName: true,
                        },
                    },
                },
            });

            logTest(
                '고객 목록 조회',
                '✅ PASS',
                `총 ${myLeads.length}개 고객 조회 성공 (최대 5개 표시)`
            );

            // sharedToManagerId 필드 검증
            try {
                const sharedLeads = await prisma.affiliateLead.findFirst({
                    where: {
                        managerId: boss1Profile.id,
                    },
                    select: {
                        id: true,
                        sharedToManagerId: true,
                    },
                });

                logTest(
                    'sharedToManagerId 필드',
                    '✅ PASS',
                    `sharedToManagerId 필드 접근 가능 (값: ${sharedLeads?.sharedToManagerId ?? 'null'})`
                );
            } catch (err) {
                logTest(
                    'sharedToManagerId 필드',
                    '❌ FAIL',
                    'sharedToManagerId 필드 접근 실패',
                    err
                );
            }
        } catch (err) {
            logTest('고객 목록 조회', '❌ FAIL', '고객 조회 중 오류 발생', err);
        }

        // ===================================
        // 3. B2B 잠재고객 조회
        // ===================================
        console.log('\n📌 3. B2B 잠재고객 조회 기능 테스트\n');

        try {
            const b2bLeads = await prisma.affiliateLead.findMany({
                where: {
                    OR: [
                        { managerId: boss1Profile.id },
                        { agentId: boss1Profile.id },
                    ],
                    source: {
                        in: ['B2B_INFLOW', 'B2B_LANDING', 'TRIAL_DASHBOARD', 'B2B_LANDING_ADMIN'],
                    },
                },
                take: 5,
            });

            logTest(
                'B2B 잠재고객 조회',
                '✅ PASS',
                `총 ${b2bLeads.length}개 B2B 잠재고객 조회 성공`
            );
        } catch (err) {
            logTest('B2B 잠재고객 조회', '❌ FAIL', 'B2B 잠재고객 조회 중 오류 발생', err);
        }

        // ===================================
        // 4. 관리 중인 판매원 조회
        // ===================================
        console.log('\n📌 4. 관리 판매원 조회 기능 테스트\n');

        try {
            const managedAgents = await prisma.affiliateRelation.findMany({
                where: {
                    managerId: boss1Profile.id,
                    status: 'ACTIVE',
                },
                include: {
                    AffiliateProfile_AffiliateRelation_agentIdToAffiliateProfile: {
                        select: {
                            id: true,
                            displayName: true,
                            affiliateCode: true,
                            status: true,
                        },
                    },
                },
            });

            logTest(
                '관리 판매원 조회',
                '✅ PASS',
                `총 ${managedAgents.length}명의 판매원 조회 성공`
            );
        } catch (err) {
            logTest('관리 판매원 조회', '❌ FAIL', '판매원 조회 중 오류 발생', err);
        }

        // ===================================
        // 5. 매출 데이터 조회
        // ===================================
        console.log('\n📌 5. 매출 데이터 조회 기능 테스트\n');

        try {
            const sales = await prisma.affiliateSale.findMany({
                where: {
                    OR: [
                        { managerId: boss1Profile.id },
                        { agentId: boss1Profile.id },
                    ],
                },
                take: 5,
                orderBy: {
                    createdAt: 'desc',
                },
            });

            logTest('매출 데이터 조회', '✅ PASS', `총 ${sales.length}개 매출 조회 성공`);
        } catch (err) {
            logTest('매출 데이터 조회', '❌ FAIL', '매출 조회 중 오류 발생', err);
        }

        // ===================================
        // 6. 링크 목록 조회
        // ===================================
        console.log('\n📌 6. 링크 목록 조회 기능 테스트\n');

        try {
            const links = await prisma.affiliateLink.findMany({
                where: {
                    OR: [
                        { managerId: boss1Profile.id },
                        { agentId: boss1Profile.id },
                    ],
                },
                take: 5,
                orderBy: {
                    createdAt: 'desc',
                },
            });

            logTest('링크 목록 조회', '✅ PASS', `총 ${links.length}개 링크 조회 성공`);
        } catch (err) {
            logTest('링크 목록 조회', '❌ FAIL', '링크 조회 중 오류 발생', err);
        }

        // ===================================
        // 7. 공유 랜딩페이지 조회
        // ===================================
        console.log('\n📌 7. 공유 랜딩페이지 조회 기능 테스트\n');

        try {
            const sharedLandingPages = await prisma.sharedLandingPage.findMany({
                where: {
                    managerProfileId: boss1Profile.id,
                },
                include: {
                    LandingPage: {
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                        },
                    },
                },
            });

            logTest(
                '공유 랜딩페이지 조회',
                '✅ PASS',
                `총 ${sharedLandingPages.length}개 공유 랜딩페이지 조회 성공`
            );
        } catch (err) {
            logTest('공유 랜딩페이지 조회', '❌ FAIL', '공유 랜딩페이지 조회 중 오류 발생', err);
        }

        // ===================================
        // 8. 고객 그룹 조회
        // ===================================
        console.log('\n📌 8. 고객 그룹 조회 기능 테스트\n');

        try {
            const customerGroups = await prisma.partnerCustomerGroup.findMany({
                where: {
                    profileId: boss1Profile.id,
                },
                take: 5,
            });

            logTest('고객 그룹 조회', '✅ PASS', `총 ${customerGroups.length}개 그룹 조회 성공`);
        } catch (err) {
            logTest('고객 그룹 조회', '❌ FAIL', '고객 그룹 조회 중 오류 발생', err);
        }

    } catch (error: any) {
        console.error('\n❌ 전체 테스트 실행 중 오류 발생:', error);
    } finally {
        await prisma.$disconnect();
    }

    // ===================================
    // 📊 테스트 결과 요약
    // ===================================
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('  📊 테스트 결과 요약');
    console.log('════════════════════════════════════════════════════════════\n');

    const totalTests = testResults.length;
    const passedTests = testResults.filter((r) => r.status === '✅ PASS').length;
    const failedTests = testResults.filter((r) => r.status === '❌ FAIL').length;
    const warningTests = testResults.filter((r) => r.status === '⚠️ WARNING').length;

    console.log(`총 테스트: ${totalTests}개`);
    console.log(`✅ 성공: ${passedTests}개`);
    console.log(`❌ 실패: ${failedTests}개`);
    console.log(`⚠️ 경고: ${warningTests}개\n`);

    if (failedTests > 0) {
        console.log('실패한 테스트 목록:');
        testResults
            .filter((r) => r.status === '❌ FAIL')
            .forEach((r) => {
                console.log(`  - ${r.feature}: ${r.message}`);
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
