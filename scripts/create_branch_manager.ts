// scripts/create_branch_manager.ts
// 대리점장 생성 스크립트

import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function createBranchManager() {
  try {
    const mallUserId = 'boss1';
    const name = '대리점장1';
    const email = 'boss1@example.com';
    const phone = '010-9999-0001';
    const password = '1111';
    const branchLabel = '서울지점';

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
      console.log('✅ 이미 존재하는 사용자:', {
        mallUserId: existingUser.mallUserId,
        email: existingUser.email,
        phone: existingUser.phone,
      });

      // AffiliateProfile 확인
      const profile = await prisma.affiliateProfile.findFirst({
        where: { userId: existingUser.id },
      });

      if (profile) {
        console.log('✅ AffiliateProfile 존재:', {
          id: profile.id,
          type: profile.type,
          affiliateCode: profile.affiliateCode,
        });
        return;
      }
    }

    // 2. 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. User 생성 (또는 기존 사용자 사용)
    let user;
    if (existingUser) {
      user = existingUser;
    } else {
      user = await prisma.user.create({
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
    }

    // 4. 어필리에이트 코드 생성
    const affiliateCode = `AFF-BOSS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 5. AffiliateProfile 생성 (BRANCH_MANAGER)
    const profile = await prisma.affiliateProfile.create({
      data: {
        userId: user.id,
        type: 'BRANCH_MANAGER',
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
      branchLabel: profile.branchLabel,
    });

    // 6. 기본 상품 링크 생성
    const defaultProducts = ['SAMPLE-015', 'SAMPLE-014'];

    for (const productCode of defaultProducts) {
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
            managerId: profile.id,  // 대리점장은 managerId
            status: 'ACTIVE',
            createdById: user.id,
          },
        });
        console.log(`✅ 상품 링크 생성: ${productCode}`);
      }
    }

    console.log('\n🎉 대리점장 생성 완료!');
    console.log('═'.repeat(60));
    console.log('📱 로그인 정보:');
    console.log(`   계정: ${mallUserId}`);
    console.log(`   비밀번호: ${password}`);
    console.log('\n🌐 접속 URL:');
    console.log(`   개인몰: http://localhost:3000/${mallUserId}/shop`);
    console.log(`   대시보드: http://localhost:3000/partner/${profile.id}`);
    console.log(`   판매 내역: http://localhost:3000/partner/${profile.id}/sales`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBranchManager();
