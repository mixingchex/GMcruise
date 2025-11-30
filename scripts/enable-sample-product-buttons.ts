/**
 * 샘플 상품의 버튼 3개 (상담신청, 결제, 채팅봇) 모두 활성화 스크립트
 * 
 * 실행 방법:
 * npx tsx scripts/enable-sample-product-buttons.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableSampleProductButtons() {
  console.log('🔘 샘플 상품 버튼 활성화 시작...\n');

  try {
    // 1. 샘플 상품들 조회
    const sampleProducts = await prisma.cruiseProduct.findMany({
      where: {
        OR: [
          { productCode: { startsWith: 'SAMPLE-' } },
          { productCode: { startsWith: 'LOTTE_' } },
          { productCode: { startsWith: 'CRUISEDOT_' } },
          { productCode: { startsWith: 'DOUBLEU_' } },
          { isMainProduct: true },
        ],
      },
      select: {
        id: true,
        productCode: true,
        packageName: true,
      },
    });

    console.log(`📊 총 ${sampleProducts.length}개 샘플 상품 발견\n`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const product of sampleProducts) {
      // MallProductContent 확인
      const existingContent = await prisma.mallProductContent.findUnique({
        where: { productCode: product.productCode },
      });

      // contactOptions 설정: 모든 버튼 활성화
      const contactOptions = {
        payment: true,      // 💳 결제하기 버튼
        phoneCall: true,    // 📞 전화상담 버튼
        aiChatbot: true,    // 🤖 AI 지니 채팅봇 버튼
      };

      if (existingContent) {
        // 기존 레코드 업데이트
        const existingLayout = typeof existingContent.layout === 'string'
          ? JSON.parse(existingContent.layout)
          : existingContent.layout || {};

        const newLayout = {
          ...existingLayout,
          contactOptions,
        };

        await prisma.mallProductContent.update({
          where: { productCode: product.productCode },
          data: {
            layout: newLayout,
            updatedAt: new Date(),
          },
        });

        console.log(`✅ ${product.productCode}: 버튼 설정 업데이트 완료`);
        updatedCount++;
      } else {
        // 새 레코드 생성
        await prisma.mallProductContent.create({
          data: {
            productCode: product.productCode,
            layout: {
              contactOptions,
            },
            isActive: true,
            updatedAt: new Date(),
          },
        });

        console.log(`🆕 ${product.productCode}: 새로운 버튼 설정 생성 완료`);
        createdCount++;
      }
    }

    console.log(`\n📊 버튼 활성화 완료:`);
    console.log(`   🆕 새로 생성: ${createdCount}개`);
    console.log(`   ✅ 업데이트: ${updatedCount}개`);
    console.log(`\n🎉 완료! 이제 상품 상세 페이지에서 3개 버튼이 모두 표시됩니다:`);
    console.log(`   💳 결제하기`);
    console.log(`   📞 전화상담`);
    console.log(`   🤖 AI 지니 채팅봇`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
enableSampleProductButtons()
  .then(() => {
    console.log('\n✨ 스크립트 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 실행 실패:', error);
    process.exit(1);
  });


