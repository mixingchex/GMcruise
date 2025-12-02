// scripts/find_user_by_name.ts
// 이름으로 사용자 찾기

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const searchName = process.argv[2] || '크루즈';
  console.log(`=== "${searchName}" 검색 ===\n`);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: searchName } },
        { phone: { contains: searchName } },
      ]
    },
    select: {
      id: true,
      name: true,
      phone: true,
      mallUserId: true,
      role: true,
      password: true,
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
    console.log('사용자를 찾을 수 없습니다.');
  } else {
    users.forEach(u => {
      console.log(`ID: ${u.id}`);
      console.log(`  Name: ${u.name}`);
      console.log(`  Phone: ${u.phone}`);
      console.log(`  MallUserId: ${u.mallUserId}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  HasPassword: ${!!u.password}`);
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
