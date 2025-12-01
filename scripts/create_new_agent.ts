// scripts/create_new_agent.ts
// 새 판매원 생성 스크립트

import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function createNewAgent() {
  try {
    const timestamp = Date.now().toString().slice(-4);
    const mallUserId = `testagent${timestamp}`; // 고유한 개인몰 ID
    const name = `테스트판매원${timestamp}`;
    const email = `testagent${timestamp}@example.com`;
    const phone = `010-${timestamp}-8888`;
    const password = '1111'; // 테스트 비밀번호
    const branchLabel = '테스트지점';

    // 1. 기존 사용자 확인
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { mallUserId },
          { email },
          { phone },
        ],
      },
    });

    if (existingUser) {
      console.log('❌ 이미 존재하는 사용자입니다:', {
        mallUserId: existingUser.mallUserId,
        email: existingUser.email,
        phone: existingUser.phone,
      });
      return;
    }

    // 2. 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. User 생성
    const user = await prisma.user.create({
      data: {
        mallUserId,
        mallNickname: name,
        name,
        email,
        phone,
        password: hashedPassword,
        role: 'user',
        customerStatus: 'active',
        customerSource: 'admin-manual',
        updatedAt: new Date(),
      },
    });

    console.log('✅ User 생성 완료:', {
      id: user.id,
      mallUserId: user.mallUserId,
      name: user.name,
    });

    // 4. 어필리에이트 코드 생성
    const affiliateCode = `AFF-${mallUserId.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 5. AffiliateProfile 생성
    const profile = await prisma.affiliateProfile.create({
      data: {
        userId: user.id,
        type: 'SALES_AGENT',
        affiliateCode,
        displayName: name,
        branchLabel,
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });

    console.log('✅ AffiliateProfile 생성 완료:', {
      id: profile.id,
      type: profile.type,
      affiliateCode: profile.affiliateCode,
    });

    // 6. 기본 상품 링크 생성 (선택사항)
    const defaultProducts = ['SAMPLE-015', 'SAMPLE-014'];

    for (const productCode of defaultProducts) {
      // AffiliateProduct 찾기
      const affiliateProduct = await prisma.affiliateProduct.findFirst({
        where: {
          productCode,
          isPublished: true,
        },
      });

      if (affiliateProduct) {
        await prisma.affiliateLink.create({
          data: {
            affiliateProductId: affiliateProduct.id,
            productCode,
            agentId: profile.id,
            status: 'ACTIVE',
            createdById: user.id,
          },
        });
        console.log(`✅ 상품 링크 생성: ${productCode}`);
      }
    }

    console.log('\n🎉 새 판매원 생성 완료!');
    console.log('═'.repeat(60));
    console.log('📱 로그인 정보:');
    console.log(`   계정: ${mallUserId}`);
    console.log(`   비밀번호: ${password}`);
    console.log('\n🌐 접속 URL:');
    console.log(`   개인몰: http://localhost:3000/${mallUserId}/shop`);
    console.log(`   대시보드: http://localhost:3000/partner/${profile.id}`);
    console.log(`   판매원 로그인: http://localhost:3000/partner`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createNewAgent();
