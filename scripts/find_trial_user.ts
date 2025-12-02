// scripts/find_trial_user.ts
// 3일 체험 계정 찾기

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== 체험 계정 검색 ===\n');

  // "체험" 또는 "trial" 포함하는 사용자 검색
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: '체험' } },
        { name: { contains: 'trial' } },
        { mallUserId: { contains: 'trial' } },
        { mallUserId: { contains: 'test' } },
        { phone: { contains: '체험' } },
      ]
    },
    select: {
      id: true,
      name: true,
      phone: true,
      mallUserId: true,
      role: true,
      AffiliateProfile: {
        select: {
          id: true,
          type: true,
          affiliateCode: true,
        }
      }
    },
    take: 20
  });

  if (users.length === 0) {
    console.log('체험 계정을 찾을 수 없습니다.');

    // 대신 모든 mallUserId가 있는 사용자 10명 출력
    console.log('\n=== mallUserId가 있는 사용자 (처음 10명) ===');
    const allUsers = await prisma.user.findMany({
      where: { mallUserId: { not: null } },
      select: {
        id: true,
        name: true,
        phone: true,
        mallUserId: true,
        role: true,
      },
      take: 10
    });

    allUsers.forEach(u => {
      console.log(`ID: ${u.id}, Name: ${u.name}, Phone: ${u.phone}, MallUserId: ${u.mallUserId}, Role: ${u.role}`);
    });
  } else {
    users.forEach(u => {
      console.log(`ID: ${u.id}`);
      console.log(`  Name: ${u.name}`);
      console.log(`  Phone: ${u.phone}`);
      console.log(`  MallUserId: ${u.mallUserId}`);
      console.log(`  Role: ${u.role}`);
      if (u.AffiliateProfile) {
        console.log(`  AffiliateProfile: type=${u.AffiliateProfile.type}, code=${u.AffiliateProfile.affiliateCode}`);
      }
      console.log('');
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
