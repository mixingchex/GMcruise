/**
 * boss2~boss5 파트너 데이터 확인 스크립트
 * 실행: npx ts-node scripts/check-partner-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPartners() {
  // boss2~boss5 사용자 조회
  const users = await prisma.user.findMany({
    where: {
      phone: {
        in: ['boss2', 'boss3', 'boss4', 'boss5']
      }
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      mallUserId: true,
    }
  });

  console.log('=== boss2~boss5 사용자 목록 ===');
  console.log(JSON.stringify(users, null, 2));

  // 각 사용자의 계약서 조회
  for (const user of users) {
    const contract = await prisma.affiliateContract.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        bankName: true,
        bankAccount: true,
        metadata: true,
      }
    });
    console.log(`\n=== ${user.phone} 계약서 ===`);
    console.log(JSON.stringify(contract, null, 2));

    // 프로필 조회
    const profile = await prisma.affiliateProfile.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        affiliateCode: true,
        displayName: true,
        type: true,
      }
    });
    console.log(`\n=== ${user.phone} 프로필 ===`);
    console.log(JSON.stringify(profile, null, 2));

    // 문서 조회
    if (profile) {
      const docs = await prisma.affiliateDocument.findMany({
        where: { profileId: profile.id },
        select: {
          documentType: true,
          filePath: true,
          fileName: true,
          status: true,
          metadata: true,
        }
      });
      console.log(`\n=== ${user.phone} 문서 ===`);
      console.log(JSON.stringify(docs, null, 2));
    }
  }

  await prisma.$disconnect();
}

checkPartners().catch(console.error);
