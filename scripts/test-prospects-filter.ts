/**
 * 잠재고객 필터 자동 테스트 스크립트
 * 
 * 실행 방법:
 * cd /home/userhyeseon28/projects/cruise-guide
 * pnpm tsx scripts/test-prospects-filter.ts
 */

import prisma from '../lib/prisma';

async function testProspectsFilter() {
  console.log('🧪 잠재고객 필터 자동 테스트 시작...\n');

  // 1. 잠재고객 필터 테스트
  console.log('📋 테스트 1: 잠재고객 필터 (구매확정 제외)');
  const customerStatusFilter = {
    OR: [
      { customerStatus: null },
      { customerStatus: { not: 'purchase_confirmed' } }
    ]
  };

  const prospects = await prisma.user.findMany({
    where: {
      role: 'user',
      ...customerStatusFilter
    },
    select: {
      id: true,
      name: true,
      phone: true,
      customerStatus: true,
      customerSource: true
    },
    orderBy: { name: 'asc' },
    take: 20
  });

  console.log(`✅ 잠재고객 개수: ${prospects.length}명`);
  console.log('   샘플:');
  prospects.slice(0, 5).forEach(u => {
    console.log(`   - ${u.name || '이름없음'} (${u.phone}) [status: ${u.customerStatus || 'null'}, source: ${u.customerSource || 'null'}]`);
  });

  // 2. 구매확정 고객 제외 확인
  console.log('\n📋 테스트 2: 구매확정 고객 제외 확인');
  const purchaseConfirmed = await prisma.user.findMany({
    where: {
      role: 'user',
      customerStatus: 'purchase_confirmed'
    },
    select: {
      id: true,
      name: true,
      phone: true
    },
    take: 10
  });

  const prospectsIds = new Set(prospects.map(u => u.id));
  const purchaseIds = purchaseConfirmed.map(u => u.id);
  const overlap = purchaseIds.filter(id => prospectsIds.has(id));

  if (overlap.length > 0) {
    console.log(`❌ 오류: 구매확정 고객 ${overlap.length}명이 잠재고객 목록에 포함되어 있습니다!`);
    purchaseConfirmed.forEach(u => {
      if (prospectsIds.has(u.id)) {
        console.log(`   - ${u.name || '이름없음'} (${u.phone})`);
      }
    });
  } else {
    console.log(`✅ 성공: 구매확정 고객 ${purchaseConfirmed.length}명이 모두 제외되었습니다.`);
  }

  // 3. UserTrip이 있는 잠재고객 포함 확인
  console.log('\n📋 테스트 3: UserTrip이 있는 잠재고객 포함 확인');
  const usersWithTrips = await prisma.user.findMany({
    where: {
      role: 'user',
      ...customerStatusFilter,
      UserTrip: {
        some: {}
      }
    },
    select: {
      id: true,
      name: true,
      phone: true,
      customerStatus: true
    },
    take: 10
  });

  console.log(`✅ UserTrip이 있는 잠재고객: ${usersWithTrips.length}명`);
  usersWithTrips.forEach(u => {
    const inResults = prospectsIds.has(u.id);
    console.log(`   - ${u.name || '이름없음'} (${u.phone}) [status: ${u.customerStatus || 'null'}] ${inResults ? '✅ 포함됨' : '❌ 제외됨'}`);
  });

  // 4. 검색어 필터 테스트
  console.log('\n📋 테스트 4: 검색어 필터 테스트');
  const searchTerm = 'sdf';
  const searchFilter = {
    OR: [
      { name: { contains: searchTerm } },
      { phone: { contains: searchTerm } }
    ]
  };

  const searchResults = await prisma.user.findMany({
    where: {
      role: 'user',
      AND: [
        customerStatusFilter,
        searchFilter
      ]
    },
    select: {
      id: true,
      name: true,
      phone: true,
      customerStatus: true
    },
    take: 10
  });

  console.log(`✅ 검색어 "${searchTerm}" 결과: ${searchResults.length}명`);
  searchResults.forEach(u => {
    console.log(`   - ${u.name || '이름없음'} (${u.phone}) [status: ${u.customerStatus || 'null'}]`);
  });

  // 5. 구매확정 고객 검색어 일치 확인
  const purchaseWithSearch = await prisma.user.findMany({
    where: {
      role: 'user',
      customerStatus: 'purchase_confirmed',
      OR: [
        { name: { contains: searchTerm } },
        { phone: { contains: searchTerm } }
      ]
    },
    select: {
      id: true,
      name: true,
      phone: true
    }
  });

  const searchResultsIds = new Set(searchResults.map(u => u.id));
  const purchaseSearchIds = purchaseWithSearch.map(u => u.id);
  const searchOverlap = purchaseSearchIds.filter(id => searchResultsIds.has(id));

  if (searchOverlap.length > 0) {
    console.log(`❌ 오류: 검색 결과에 구매확정 고객이 포함되어 있습니다!`);
  } else {
    console.log(`✅ 성공: 검색 결과에 구매확정 고객이 포함되지 않습니다.`);
  }

  // 최종 결과
  console.log('\n' + '='.repeat(50));
  console.log('📊 최종 테스트 결과');
  console.log('='.repeat(50));
  console.log(`✅ 잠재고객 필터: ${prospects.length}명 표시`);
  console.log(`✅ 구매확정 고객 제외: ${overlap.length === 0 ? '성공' : '실패'}`);
  console.log(`✅ UserTrip 있는 잠재고객 포함: ${usersWithTrips.length}명`);
  console.log(`✅ 검색 필터: ${searchOverlap.length === 0 ? '성공' : '실패'}`);
  console.log('='.repeat(50));

  if (overlap.length === 0 && searchOverlap.length === 0) {
    console.log('\n🎉 모든 테스트 통과! 잠재고객 필터가 정상 작동합니다.');
  } else {
    console.log('\n⚠️  일부 테스트 실패. 위의 오류를 확인해주세요.');
  }

  await prisma.$disconnect();
}

testProspectsFilter().catch((error) => {
  console.error('❌ 테스트 실행 중 오류 발생:', error);
  process.exit(1);
});

