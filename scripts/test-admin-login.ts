import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// .env 파일 로드
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

// DATABASE_URL_TEST가 있으면 DATABASE_URL로 사용
if (process.env.DATABASE_URL_TEST && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

console.log('DATABASE_URL:', process.env.DATABASE_URL ? '설정됨' : '설정 안됨');
console.log('DATABASE_URL_TEST:', process.env.DATABASE_URL_TEST ? '설정됨' : '설정 안됨');

const prisma = new PrismaClient();

async function main() {
  // 관리자 계정 검색 테스트
  const testAdmin = await prisma.user.findFirst({
    where: {
      name: '관리자',
      phone: '01024958013',
      role: 'admin'
    },
    select: {
      id: true,
      name: true,
      phone: true,
      password: true,
    },
  });

  console.log('\n=== 관리자 계정 검색 결과 ===');
  if (testAdmin) {
    console.log('✅ 계정 찾음:');
    console.log(`   ID: ${testAdmin.id}`);
    console.log(`   이름: "${testAdmin.name}"`);
    console.log(`   전화번호: "${testAdmin.phone}"`);
    console.log(`   비밀번호: "${testAdmin.password}"`);
    console.log(`   비밀번호 일치 (0313): ${testAdmin.password === '0313'}`);
  } else {
    console.log('❌ 계정 없음');
    
    // 모든 관리자 계정 확인
    const allAdmins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true, name: true, phone: true },
    });
    console.log('\n=== DB의 모든 관리자 계정 ===');
    allAdmins.forEach(admin => {
      console.log(`   - ID: ${admin.id}, 이름: "${admin.name}", 전화번호: "${admin.phone}"`);
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });








