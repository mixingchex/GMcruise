// scripts/check_user1_info.ts
// user1의 개인몰 정보 확인 스크립트

import prisma from '../lib/prisma';

async function checkUser1Info() {
  try {
    // user1 찾기 (mallUserId로 검색)
    const user = await prisma.user.findFirst({
      where: {
        mallUserId: 'user1',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        mallUserId: true,
        mallNickname: true,
        role: true,
        customerStatus: true,
        customerSource: true,
        testModeStartedAt: true,
        AffiliateProfile: {
          select: {
            id: true,
            type: true,
            affiliateCode: true,
            displayName: true,
            branchLabel: true,
            status: true,
            profileTitle: true,
            landingAnnouncement: true,
            welcomeMessage: true,
          },
        },
      },
    });

    if (!user) {
      console.log('❌ user1을 찾을 수 없습니다.');
      return;
    }

    console.log('\n✅ user1 정보:');
    console.log('═'.repeat(60));
    console.log(`📱 사용자 ID: ${user.id}`);
    console.log(`📝 이름: ${user.name || '미설정'}`);
    console.log(`📧 이메일: ${user.email || '미설정'}`);
    console.log(`📞 전화번호: ${user.phone || '미설정'}`);
    console.log(`🏪 개인몰 ID: ${user.mallUserId || '미설정'}`);
    console.log(`🎭 개인몰 닉네임: ${user.mallNickname || '미설정'}`);
    console.log(`🔑 역할: ${user.role}`);
    console.log(`📊 고객 상태: ${user.customerStatus || '미설정'}`);
    console.log(`🎯 유입 경로: ${user.customerSource || '미설정'}`);
    console.log(`⏰ 테스트 모드: ${user.testModeStartedAt ? '활성' : '비활성'}`);

    if (user.AffiliateProfile) {
      console.log('\n🔹 어필리에이트 프로필:');
      console.log('─'.repeat(60));
      console.log(`  Profile ID: ${user.AffiliateProfile.id}`);
      console.log(`  타입: ${user.AffiliateProfile.type}`);
      console.log(`  어필리에이트 코드: ${user.AffiliateProfile.affiliateCode || '미설정'}`);
      console.log(`  표시 이름: ${user.AffiliateProfile.displayName || '미설정'}`);
      console.log(`  지점 라벨: ${user.AffiliateProfile.branchLabel || '미설정'}`);
      console.log(`  상태: ${user.AffiliateProfile.status}`);
      console.log(`  프로필 타이틀: ${user.AffiliateProfile.profileTitle || '미설정'}`);
    } else {
      console.log('\n❌ 어필리에이트 프로필이 없습니다.');
    }

    // 개인몰 URL 출력
    if (user.mallUserId) {
      console.log('\n🌐 개인몰 URL:');
      console.log('─'.repeat(60));
      console.log(`  상점: http://localhost:3000/${user.mallUserId}/shop`);
      console.log(`  대시보드: http://localhost:3000/${user.mallUserId}/dashboard`);
      console.log(`  고객관리: http://localhost:3000/${user.mallUserId}/customers`);
      console.log(`  결제: http://localhost:3000/${user.mallUserId}/payment`);
    }

    // 판매원 대시보드 URL
    if (user.AffiliateProfile) {
      console.log('\n🏢 판매원 대시보드:');
      console.log('─'.repeat(60));
      console.log(`  URL: http://localhost:3000/partner/${user.AffiliateProfile.id}`);
    }

    // 개인몰에 등록된 상품 확인
    if (user.AffiliateProfile) {
      const personalLinks = await prisma.affiliateLink.findMany({
        where: {
          AND: [
            { status: 'ACTIVE' },
            {
              OR: [
                { productCode: { not: null } },
                { affiliateProductId: { not: null } },
              ],
            },
            {
              OR: [
                { managerId: null, agentId: null },
                { agentId: user.AffiliateProfile.id },
                { managerId: user.AffiliateProfile.id },
              ],
            },
          ],
        },
        select: {
          id: true,
          productCode: true,
          affiliateProductId: true,
          AffiliateProduct: {
            select: {
              productCode: true,
              title: true,
            },
          },
        },
        take: 10,
      });

      console.log('\n📦 개인몰 등록 상품:');
      console.log('─'.repeat(60));
      if (personalLinks.length > 0) {
        personalLinks.forEach((link, index) => {
          const productCode = link.productCode || link.AffiliateProduct?.productCode;
          const title = link.AffiliateProduct?.title || productCode;
          console.log(`  ${index + 1}. ${productCode} - ${title}`);
        });
      } else {
        console.log('  ❌ 등록된 상품이 없습니다.');
      }
    }

    // 최근 판매 기록 확인
    if (user.AffiliateProfile) {
      const recentSales = await prisma.affiliateSale.findMany({
        where: {
          OR: [
            { agentId: user.AffiliateProfile.id },
            { managerId: user.AffiliateProfile.id },
          ],
        },
        orderBy: { saleDate: 'desc' },
        take: 5,
        select: {
          id: true,
          productCode: true,
          saleAmount: true,
          netRevenue: true,
          branchCommission: true,
          salesCommission: true,
          status: true,
          saleDate: true,
        },
      });

      console.log('\n💰 최근 판매 기록 (최대 5개):');
      console.log('─'.repeat(60));
      if (recentSales.length > 0) {
        recentSales.forEach((sale, index) => {
          console.log(`  ${index + 1}. [${sale.status}] ${sale.productCode}`);
          console.log(`     판매액: ${sale.saleAmount?.toLocaleString()}원`);
          console.log(`     수수료: ${sale.salesCommission?.toLocaleString()}원 / ${sale.branchCommission?.toLocaleString()}원`);
          console.log(`     일자: ${sale.saleDate?.toLocaleDateString('ko-KR')}`);
        });
      } else {
        console.log('  📭 판매 기록이 없습니다.');
      }
    }

    // 고객(Lead) 수 확인
    if (user.AffiliateProfile) {
      const leadCount = await prisma.affiliateLead.count({
        where: {
          OR: [
            { agentId: user.AffiliateProfile.id },
            { managerId: user.AffiliateProfile.id },
          ],
        },
      });

      console.log('\n👥 고객 수:');
      console.log('─'.repeat(60));
      console.log(`  총 ${leadCount}명의 고객이 등록되어 있습니다.`);
    }

    console.log('\n═'.repeat(60));
    console.log('✅ 정보 조회 완료\n');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser1Info();
