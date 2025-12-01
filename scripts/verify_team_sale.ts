// scripts/verify_team_sale.ts
// 대리점 팀 판매 결과 검증

import prisma from '../lib/prisma';

async function verifyTeamSale() {
  try {
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: 37 },
      select: {
        id: true,
        externalOrderCode: true,
        managerId: true,
        agentId: true,
        saleAmount: true,
        branchCommission: true,
        salesCommission: true,
        overrideCommission: true,
        AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile: {
          select: {
            displayName: true,
            User: { select: { mallUserId: true } },
          },
        },
        AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: {
          select: {
            displayName: true,
            User: { select: { mallUserId: true } },
          },
        },
      },
    });

    if (!sale) {
      console.log('❌ Sale ID 37을 찾을 수 없습니다.');
      return;
    }

    console.log('='.repeat(80));
    console.log('🎯 대리점 팀 판매 결과 검증 (Sale ID: 37)');
    console.log('='.repeat(80));
    console.log('\n📋 기본 정보:');
    console.log(`   Order: ${sale.externalOrderCode}`);
    console.log(`   판매액: ${(sale.saleAmount || 0).toLocaleString()}원`);

    console.log('\n👥 파트너 정보:');
    const managerUserId = sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile?.User?.mallUserId || 'null';
    const managerName = sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile?.displayName || 'null';
    const agentUserId = sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile?.User?.mallUserId || 'null';
    const agentName = sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile?.displayName || 'null';

    console.log(`   대리점장: ${managerUserId} (${managerName})`);
    console.log(`   판매원: ${agentUserId} (${agentName})`);

    console.log('\n💰 수당 내역:');
    console.log(`   대리점 수당: ${(sale.branchCommission || 0).toLocaleString()}원`);
    console.log(`   판매원 수당: ${(sale.salesCommission || 0).toLocaleString()}원`);
    console.log(`   오버라이드: ${(sale.overrideCommission || 0).toLocaleString()}원`);

    console.log('\n✅ 검증 결과:');

    let allPassed = true;

    if (sale.managerId && sale.agentId) {
      console.log('   ✅ 판매원과 대리점장 모두 설정됨!');
    } else {
      console.log(`   ❌ managerId: ${sale.managerId}, agentId: ${sale.agentId}`);
      allPassed = false;
    }

    if (sale.salesCommission === 200000) {
      console.log('   ✅ 판매원 수당 정확: 200,000원');
    } else {
      console.log(`   ❌ 판매원 수당 불일치: 예상 200,000원, 실제 ${(sale.salesCommission || 0).toLocaleString()}원`);
      allPassed = false;
    }

    if (sale.overrideCommission === 100000) {
      console.log('   ✅ 오버라이드 정확: 100,000원');
    } else {
      console.log(`   ❌ 오버라이드 불일치: 예상 100,000원, 실제 ${(sale.overrideCommission || 0).toLocaleString()}원`);
      allPassed = false;
    }

    console.log('\n📊 대리점장 최종 수당:');
    console.log(`   오버라이드: ${(sale.overrideCommission || 0).toLocaleString()}원`);
    console.log(`   (직접 판매 시: ${(sale.branchCommission || 0).toLocaleString()}원)`);

    console.log('\n' + '='.repeat(80));

    if (allPassed) {
      console.log('🎉 모든 검증 통과! 오버라이드 수당이 정확하게 계산되었습니다.');
    } else {
      console.log('⚠️  일부 검증 실패. 위 내용을 확인하세요.');
    }

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTeamSale();
