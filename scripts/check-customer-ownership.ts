/**
 * 대리점장/판매원 고객 소유권 연결 상태 확인 스크립트
 * 
 * 실행 방법:
 * npx tsx scripts/check-customer-ownership.ts
 */

import { PrismaClient } from '@prisma/client';
import { getAffiliateOwnershipForUsers } from '../lib/affiliate/customer-ownership';

const prisma = new PrismaClient();

async function checkCustomerOwnership() {
  console.log('🔍 대리점장/판매원 고객 소유권 연결 상태 확인\n');

  try {
    // 1. 모든 대리점장 조회
    const managers = await prisma.affiliateProfile.findMany({
      where: {
        type: 'BRANCH_MANAGER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        displayName: true,
        nickname: true,
        affiliateCode: true,
        branchLabel: true,
        contactPhone: true,
      },
      orderBy: {
        displayName: 'asc',
      },
    });

    console.log(`📊 총 ${managers.length}명의 대리점장 발견\n`);

    // 2. 모든 판매원 조회
    const agents = await prisma.affiliateProfile.findMany({
      where: {
        type: 'SALES_AGENT',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        displayName: true,
        nickname: true,
        affiliateCode: true,
        branchLabel: true,
        contactPhone: true,
      },
      orderBy: {
        displayName: 'asc',
      },
    });

    console.log(`📊 총 ${agents.length}명의 판매원 발견\n`);

    // 3. 관리자 제외한 모든 고객 조회
    const customers = await prisma.user.findMany({
      where: {
        role: { not: 'admin' },
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    console.log(`📊 총 ${customers.length}명의 고객 발견\n`);

    // 4. 각 고객의 소유권 확인
    const ownershipMap = await getAffiliateOwnershipForUsers(
      customers.map(c => ({ id: c.id, phone: c.phone }))
    );

    // 5. 대리점장별 고객 수 집계
    const managerCustomerCount: Record<number, number> = {};
    const managerCustomerList: Record<number, Array<{ id: number; name: string | null }>> = {};

    // 6. 판매원별 고객 수 집계
    const agentCustomerCount: Record<number, number> = {};
    const agentCustomerList: Record<number, Array<{ id: number; name: string | null }>> = {};

    let totalWithOwnership = 0;
    let totalWithoutOwnership = 0;

    customers.forEach(customer => {
      const ownership = ownershipMap.get(customer.id);
      
      if (!ownership) {
        totalWithoutOwnership++;
        return;
      }

      totalWithOwnership++;

      if (ownership.ownerType === 'BRANCH_MANAGER' && ownership.ownerProfileId) {
        const managerId = ownership.ownerProfileId;
        managerCustomerCount[managerId] = (managerCustomerCount[managerId] || 0) + 1;
        if (!managerCustomerList[managerId]) {
          managerCustomerList[managerId] = [];
        }
        managerCustomerList[managerId].push({ id: customer.id, name: customer.name });
      } else if (ownership.ownerType === 'SALES_AGENT' && ownership.ownerProfileId) {
        const agentId = ownership.ownerProfileId;
        agentCustomerCount[agentId] = (agentCustomerCount[agentId] || 0) + 1;
        if (!agentCustomerList[agentId]) {
          agentCustomerList[agentId] = [];
        }
        agentCustomerList[agentId].push({ id: customer.id, name: customer.name });
      }
    });

    // 7. 결과 출력
    console.log('📈 소유권 연결 통계:\n');
    console.log(`  - 소유권 있음: ${totalWithOwnership}명`);
    console.log(`  - 소유권 없음: ${totalWithoutOwnership}명 (본사 직속)\n`);

    console.log('🏢 대리점장별 고객 분포:\n');
    managers.forEach(manager => {
      const count = managerCustomerCount[manager.id] || 0;
      const name = manager.nickname || manager.displayName || '미지정';
      console.log(`  - 대리점장${name} (${manager.affiliateCode || '코드없음'}): ${count}명`);
      if (count > 0 && managerCustomerList[manager.id]) {
        console.log(`    고객 목록: ${managerCustomerList[manager.id].map(c => c.name || `ID:${c.id}`).join(', ')}`);
      }
    });

    console.log('\n👤 판매원별 고객 분포:\n');
    agents.forEach(agent => {
      const count = agentCustomerCount[agent.id] || 0;
      const name = agent.nickname || agent.displayName || '미지정';
      console.log(`  - 판매원${name} (${agent.affiliateCode || '코드없음'}): ${count}명`);
      if (count > 0 && agentCustomerList[agent.id]) {
        console.log(`    고객 목록: ${agentCustomerList[agent.id].map(c => c.name || `ID:${c.id}`).join(', ')}`);
      }
    });

    // 8. 소유권이 없는 고객 목록 (본사 직속)
    if (totalWithoutOwnership > 0) {
      console.log('\n🏛️ 본사 직속 고객 (소유권 없음):\n');
      customers.forEach(customer => {
        const ownership = ownershipMap.get(customer.id);
        if (!ownership) {
          console.log(`  - ${customer.name || '이름없음'} (ID: ${customer.id}, 전화: ${customer.phone || '없음'})`);
        }
      });
    }

    console.log('\n✅ 확인 완료!\n');
    console.log('💡 관리자 패널에서 고객 이름 옆에 "대리점장전혜선", "판매원홍길동" 형식의 딱지가 표시됩니다.');

  } catch (error) {
    console.error('❌ 확인 중 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
checkCustomerOwnership()
  .then(() => {
    console.log('\n🎉 모든 작업이 완료되었습니다!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });

