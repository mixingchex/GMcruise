// scripts/create-sales-confirmation-test-data.ts
// 판매 확정 프로세스 테스트 데이터 생성 스크립트

import prisma from '../lib/prisma';

async function main() {
  console.log('🧪 판매 확정 프로세스 테스트 데이터 생성 시작...\n');

  try {
    // 1. 관리자 계정 찾기 또는 생성
    console.log('1️⃣ 관리자 계정 확인 중...');
    let admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true, name: true, phone: true },
    });

    if (!admin) {
      console.log('   ⚠️  관리자 계정이 없습니다. 관리자 계정을 먼저 생성해주세요.');
      console.log('   💡 예: npx tsx scripts/create-admin.ts\n');
      return;
    }
    console.log(`   ✅ 관리자: ${admin.name} (ID: ${admin.id})\n`);

    // 2. 대리점장(boss1) 계정 찾기
    console.log('2️⃣ 대리점장(boss1) 계정 확인 중...');
    let branchManager = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: { startsWith: 'boss1' } },
          { email: 'boss1@test.local' },
          { mallUserId: 'boss1' },
        ],
      },
      include: {
        AffiliateProfile: {
          select: { id: true, type: true, affiliateCode: true },
        },
      },
    });

    if (!branchManager) {
      console.log('   ⚠️  대리점장(boss1) 계정이 없습니다.');
      console.log('   💡 scripts/create-affiliate-test-data.ts를 먼저 실행하세요.\n');
      return;
    }
    console.log(`   ✅ 대리점장: ${branchManager.name} (ID: ${branchManager.id})`);
    console.log(`   ✅ 프로필 ID: ${branchManager.AffiliateProfile?.id}`);
    console.log(`   ✅ 어필리에이트 코드: ${branchManager.AffiliateProfile?.affiliateCode}\n`);

    const managerProfileId = branchManager.AffiliateProfile!.id;

    // 3. 판매원 계정 찾기 (선택사항)
    console.log('3️⃣ 판매원 계정 확인 중...');
    let salesAgent = await prisma.user.findFirst({
      where: {
        role: 'user',
        AffiliateProfile: {
          type: 'SALES_AGENT',
        },
      },
      include: {
        AffiliateProfile: {
          select: { id: true, type: true, affiliateCode: true },
        },
      },
    });

    let agentProfileId: number | null = null;
    if (salesAgent) {
      console.log(`   ✅ 판매원: ${salesAgent.name} (ID: ${salesAgent.id})`);
      console.log(`   ✅ 프로필 ID: ${salesAgent.AffiliateProfile?.id}\n`);
      agentProfileId = salesAgent.AffiliateProfile!.id;
    } else {
      console.log('   ℹ️  판매원 계정이 없습니다. (선택사항)\n');
    }

    // 4. AffiliateProduct 찾기 또는 생성
    console.log('4️⃣ 어필리에이트 상품 확인 중...');
    let product = await prisma.affiliateProduct.findFirst({
      select: { id: true, productCode: true, title: true },
    });

    if (!product) {
      console.log('   ⚠️  어필리에이트 상품이 없습니다. 테스트 상품을 생성합니다...');
      product = await prisma.affiliateProduct.create({
        data: {
          productCode: 'TEST-PRODUCT-001',
          title: '테스트 크루즈 상품',
          effectiveFrom: new Date(), // 필수 필드
          updatedAt: new Date(), // 필수 필드
        },
        select: { id: true, productCode: true, title: true },
      });
      console.log(`   ✅ 테스트 상품 생성: ${product.productCode}\n`);
    } else {
      console.log(`   ✅ 상품: ${product.title} (${product.productCode})\n`);
    }

    // 5. 테스트 판매 데이터 생성
    console.log('5️⃣ 테스트 판매 데이터 생성 중...');

    // 시나리오 1: PENDING 상태 - 대리점장 판매 (확정 요청 가능)
    const sale1 = await prisma.affiliateSale.create({
      data: {
        managerId: managerProfileId, // 대리점장 판매
        affiliateProductId: product.id,
        productCode: product.productCode,
        saleAmount: 1000000, // 100만원
        status: 'PENDING',
        saleDate: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`   ✅ 판매 #${sale1.id}: PENDING 상태 (대리점장 판매, 확정 요청 가능)`);

    // 시나리오 1-2: PENDING 상태 - 판매원 판매 (있는 경우)
    if (agentProfileId) {
      const sale1_2 = await prisma.affiliateSale.create({
        data: {
          agentId: agentProfileId,
          managerId: managerProfileId, // 대리점장 소속
          affiliateProductId: product.id,
          productCode: product.productCode,
          saleAmount: 1500000, // 150만원
          status: 'PENDING',
          saleDate: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ 판매 #${sale1_2.id}: PENDING 상태 (판매원 판매, 확정 요청 가능)`);
    }

    // 시나리오 2: PENDING_APPROVAL 상태 - 대리점장 판매 (관리자 승인 대기)
    const sale2 = await prisma.affiliateSale.create({
      data: {
        managerId: managerProfileId, // 대리점장 판매
        affiliateProductId: product.id,
        productCode: product.productCode,
        saleAmount: 2000000, // 200만원
        status: 'PENDING_APPROVAL',
        saleDate: new Date(),
        submittedById: branchManager.id,
        submittedAt: new Date(),
        audioFileGoogleDriveUrl: 'https://drive.google.com/file/d/test123/view',
        audioFileName: 'test-recording.mp3',
        updatedAt: new Date(),
      },
    });
    console.log(`   ✅ 판매 #${sale2.id}: PENDING_APPROVAL 상태 (대리점장 판매, 승인 대기)`);

    // 시나리오 3: APPROVED 상태 - 대리점장 판매 (이미 승인됨)
    const sale3 = await prisma.affiliateSale.create({
      data: {
        managerId: managerProfileId, // 대리점장 판매
        affiliateProductId: product.id,
        productCode: product.productCode,
        saleAmount: 3000000, // 300만원
        status: 'APPROVED',
        saleDate: new Date(),
        submittedById: branchManager.id,
        submittedAt: new Date(Date.now() - 86400000), // 1일 전
        approvedById: admin.id,
        approvedAt: new Date(),
        audioFileGoogleDriveUrl: 'https://drive.google.com/file/d/test456/view',
        audioFileName: 'approved-recording.mp3',
        confirmedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`   ✅ 판매 #${sale3.id}: APPROVED 상태 (대리점장 판매, 이미 승인됨)`);

    // 시나리오 4: REJECTED 상태 - 대리점장 판매 (거부됨, 재요청 가능)
    const sale4 = await prisma.affiliateSale.create({
      data: {
        managerId: managerProfileId, // 대리점장 판매
        affiliateProductId: product.id,
        productCode: product.productCode,
        saleAmount: 1500000, // 150만원
        status: 'REJECTED',
        saleDate: new Date(),
        rejectedById: admin.id,
        rejectedAt: new Date(),
        rejectionReason: '녹음 파일이 불명확합니다. 다시 녹음해주세요.',
        updatedAt: new Date(),
      },
    });
    console.log(`   ✅ 판매 #${sale4.id}: REJECTED 상태 (대리점장 판매, 거부됨, 재요청 가능)`);

    console.log('\n✨ 테스트 데이터 생성 완료!\n');

    // 6. 테스트 가이드 출력
    console.log('📋 테스트 가이드:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n1️⃣ 대리점장(boss1) 대시보드 테스트:');
    console.log(`   - 대리점장 계정으로 로그인: ${branchManager.phone || branchManager.name}`);
    console.log(`   - 대시보드 접속: /partner/${branchManager.mallUserId || branchManager.phone}/dashboard`);
    console.log(`   - "내 판매 목록" 섹션에서 다음 판매들을 확인:`);
    console.log(`     • 판매 #${sale1.id}: PENDING → "확정 요청" 버튼 클릭`);
    console.log(`     • 판매 #${sale2.id}: PENDING_APPROVAL → "상세 보기" 버튼 클릭`);
    console.log(`     • 판매 #${sale3.id}: APPROVED → "상세 보기" 버튼 클릭`);
    console.log(`     • 판매 #${sale4.id}: REJECTED → "확정 요청" 버튼 클릭 (재요청)`);
    
    if (salesAgent) {
      console.log('\n2️⃣ 판매원 대시보드 테스트 (선택사항):');
      console.log(`   - 판매원 계정으로 로그인: ${salesAgent.phone || salesAgent.name}`);
      console.log(`   - 대시보드 접속: /partner/${salesAgent.mallUserId || salesAgent.phone}/dashboard`);
    }

    console.log('\n3️⃣ 관리자 승인 대기 페이지 테스트:');
    console.log(`   - 관리자 계정으로 로그인: ${admin.phone || admin.name}`);
    console.log(`   - 승인 대기 페이지 접속: /admin/affiliate/sales-confirmation/pending`);
    console.log(`   - 판매 #${sale2.id} 확인 (PENDING_APPROVAL 상태)`);
    console.log(`   - "승인" 또는 "거부" 버튼 클릭`);

    console.log('\n4️⃣ 데이터베이스 확인:');
    console.log(`   - 판매 상태 확인: SELECT id, status, "submittedAt", "approvedAt" FROM "AffiliateSale" WHERE id IN (${sale1.id}, ${sale2.id}, ${sale3.id}, ${sale4.id});`);
    console.log(`   - 수당 레저 확인: SELECT * FROM "CommissionLedger" WHERE "saleId" = ${sale3.id};`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error: any) {
    console.error('❌ 에러 발생:', error);
    if (error.message) {
      console.error('   메시지:', error.message);
    }
    if (error.stack) {
      console.error('   스택:', error.stack);
    }
    // @ts-ignore - process는 Node.js 환경에서 사용 가능
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

