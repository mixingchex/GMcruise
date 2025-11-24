// scripts/create-sample-customers.ts
// 파트너 대시보드용 샘플 고객 데이터 생성 스크립트

import prisma from '../lib/prisma';

const sampleCustomers = [
  {
    customerName: '김민수',
    customerPhone: '010-1234-5678',
    status: 'IN_PROGRESS' as const,
    source: 'partner-manual',
    notes: '일본 크루즈 관심 있음. 2인 여행 예정.',
    nextActionAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2일 후
  },
  {
    customerName: '이영희',
    customerPhone: '010-2345-6789',
    status: 'CONTACTED' as const,
    source: 'partner-manual',
    notes: '대만 크루즈 문의. 예산 200만원대.',
    nextActionAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1일 후
  },
  {
    customerName: '박준호',
    customerPhone: '010-3456-7890',
    status: 'IN_PROGRESS' as const,
    source: 'partner-manual',
    notes: '가족 여행(4인) 계획 중. 3월 출발 희망.',
  },
  {
    customerName: '최수진',
    customerPhone: '010-4567-8901',
    status: 'CONTACTED' as const,
    source: 'partner-manual',
    notes: '신혼여행으로 크루즈 검토 중.',
    nextActionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3일 후
  },
  {
    customerName: '정다은',
    customerPhone: '010-5678-9012',
    status: 'IN_PROGRESS' as const,
    source: 'partner-manual',
    notes: '친구들과 함께 5명 여행 계획. MSC 벨리시마 관심.',
    nextActionAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5일 후
  },
  {
    customerName: '강태영',
    customerPhone: '010-6789-0123',
    status: 'NEW' as const,
    source: 'partner-manual',
    notes: '첫 크루즈 여행. 상세 안내 필요.',
  },
  {
    customerName: '윤서연',
    customerPhone: '010-7890-1234',
    status: 'CONTACTED' as const,
    source: 'partner-manual',
    notes: '부모님 모시고 가는 여행. 편안한 선박 선호.',
    nextActionAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4일 후
  },
  {
    customerName: '임동욱',
    customerPhone: '010-8901-2345',
    status: 'IN_PROGRESS' as const,
    source: 'partner-manual',
    notes: '비즈니스 클래스 문의. 프리미엄 크루즈 관심.',
  },
  // 전화 상담 신청 고객 (phone-consultation)
  {
    customerName: '홍길동',
    customerPhone: '010-9999-0001',
    status: 'NEW' as const,
    source: 'phone-consultation',
    notes: '크루즈몰에서 전화상담 신청. 로얄캐리비안 관심.',
    nextActionAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1일 후
  },
  {
    customerName: '김영희',
    customerPhone: '010-9999-0002',
    status: 'NEW' as const,
    source: 'phone-consultation',
    notes: '크루즈몰에서 전화상담 신청. MSC 벨리시마 문의.',
    nextActionAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1일 후
  },
  {
    customerName: '이철수',
    customerPhone: '010-9999-0003',
    status: 'NEW' as const,
    source: 'phone-consultation',
    notes: '크루즈몰에서 전화상담 신청. 일본 크루즈 문의.',
    nextActionAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2일 후
  },
  // 상품 문의 고객 (product-inquiry)
  {
    customerName: '박지민',
    customerPhone: '010-8888-0001',
    status: 'NEW' as const,
    source: 'product-inquiry',
    notes: '상품 상세페이지에서 상담 신청. 코스타 베네치아 문의.',
    nextActionAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1일 후
  },
  {
    customerName: '최민지',
    customerPhone: '010-8888-0002',
    status: 'NEW' as const,
    source: 'product-inquiry',
    notes: '상품 상세페이지에서 상담 신청. 대만 크루즈 관심.',
    nextActionAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1일 후
  },
  {
    customerName: '정수현',
    customerPhone: '010-8888-0003',
    status: 'NEW' as const,
    source: 'product-inquiry',
    notes: '상품 상세페이지에서 상담 신청. 가족 여행 문의.',
    nextActionAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2일 후
  },
  // 크루즈몰에서 온 고객 (mall-로 시작하는 source)
  {
    customerName: '강동원',
    customerPhone: '010-7777-0001',
    status: 'NEW' as const,
    source: 'mall-shop',
    notes: '크루즈몰 쇼핑몰에서 문의. 프리미엄 크루즈 관심.',
    nextActionAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1일 후
  },
  {
    customerName: '송혜교',
    customerPhone: '010-7777-0002',
    status: 'NEW' as const,
    source: 'mall-landing',
    notes: '크루즈몰 랜딩페이지에서 문의. 일본 크루즈 관심.',
    nextActionAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1일 후
  },
];

async function main() {
  console.log('👥 파트너 대시보드용 샘플 고객 데이터 생성 시작...\n');

  try {
    // 1. 활성 파트너 프로필 찾기 (boss1 우선, 없으면 첫 번째 활성 프로필)
    console.log('1️⃣ 파트너 프로필 확인 중...');
    
    // 먼저 boss1 사용자 찾기
    const boss1User = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: { contains: 'boss1' } },
          { email: { contains: 'boss1' } },
          { mallUserId: 'boss1' },
        ],
      },
    });

    let profile: { id: number; type: string; affiliateCode: string; userId: number } | null = null;
    
    if (boss1User) {
      // boss1 사용자의 활성 프로필 찾기
      profile = await prisma.affiliateProfile.findFirst({
        where: {
          userId: boss1User.id,
          status: 'ACTIVE',
        },
        select: { id: true, type: true, affiliateCode: true, userId: true },
      });
    }

    // boss1 프로필이 없으면 첫 번째 활성 프로필 사용
    if (!profile) {
      profile = await prisma.affiliateProfile.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true, type: true, affiliateCode: true, userId: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!profile) {
      console.log('   ⚠️  활성 파트너 프로필을 찾을 수 없습니다.');
      console.log('   💡 먼저 파트너 프로필을 생성해주세요.\n');
      return;
    }

    // profile이 null이 아님을 보장
    const activeProfile = profile;

    const profileUser = await prisma.user.findUnique({
      where: { id: activeProfile.userId },
      select: { id: true, name: true, phone: true },
    });

    console.log(`   ✅ 사용자: ${profileUser?.name || profileUser?.phone || 'Unknown'} (ID: ${profileUser?.id})`);
    console.log(`   ✅ 프로필 ID: ${activeProfile.id}`);
    console.log(`   ✅ 타입: ${activeProfile.type}`);
    console.log(`   ✅ 어필리에이트 코드: ${activeProfile.affiliateCode}\n`);

    // 2. 기존 고객 수 확인
    const existingCount = await prisma.affiliateLead.count({
      where: {
        OR: [{ managerId: activeProfile.id }, { agentId: activeProfile.id }],
      },
    });
    console.log(`2️⃣ 기존 고객 수: ${existingCount}명\n`);

    // 3. 샘플 고객 생성
    console.log('3️⃣ 샘플 고객 생성 중...\n');
    let createdCount = 0;
    let skippedCount = 0;

    for (const customer of sampleCustomers) {
      try {
        // 동일한 전화번호로 이미 존재하는지 확인
        const existing = await prisma.affiliateLead.findFirst({
          where: {
            customerPhone: customer.customerPhone,
            OR: [{ managerId: activeProfile.id }, { agentId: activeProfile.id }],
          },
        });

        if (existing) {
          console.log(`   ⏭️  건너뜀: ${customer.customerName} (${customer.customerPhone}) - 이미 존재함`);
          skippedCount++;
          continue;
        }

        // 고객 생성
        const now = new Date();
        const lead = await prisma.affiliateLead.create({
          data: {
            customerName: customer.customerName,
            customerPhone: customer.customerPhone,
            status: customer.status,
            source: customer.source,
            notes: customer.notes,
            nextActionAt: customer.nextActionAt,
            updatedAt: now,
            managerId: activeProfile.type === 'BRANCH_MANAGER' ? activeProfile.id : undefined,
            agentId: activeProfile.type === 'SALES_AGENT' ? activeProfile.id : undefined,
          },
        });

        console.log(`   ✅ 생성: ${customer.customerName} (${customer.customerPhone}) - ${customer.status}`);
        createdCount++;
      } catch (error: any) {
        console.error(`   ❌ 실패: ${customer.customerName} - ${error.message}`);
      }
    }

    console.log('\n✨ 샘플 고객 데이터 생성 완료!');
    console.log(`   ✅ 생성: ${createdCount}명`);
    console.log(`   ⏭️  건너뜀: ${skippedCount}명`);
    console.log(`   📊 총 고객 수: ${existingCount + createdCount}명\n`);
  } catch (error: any) {
    console.error('\n❌ 에러 발생:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

