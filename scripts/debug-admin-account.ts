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

if (!process.env.DATABASE_URL) {
  console.error('❌ 오류: DATABASE_URL 또는 DATABASE_URL_TEST 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('=== 관리자 계정 상세 디버깅 ===\n');
  
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl) {
    try {
      const urlParts = new URL(dbUrl);
      const dbName = urlParts.pathname.replace('/', '');
      console.log('연결 DB:', `${urlParts.username}@${urlParts.hostname}${urlParts.port ? ':' + urlParts.port : ''}/${dbName}`);
    } catch {
      console.log('연결 DB:', dbUrl.substring(0, 50) + '...');
    }
  }
  console.log('');
  
  // 전체 관리자 계정 조회
  const allAdmins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: {
      id: true,
      name: true,
      phone: true,
      password: true,
      role: true,
    },
  });
  
  console.log(`총 관리자 계정 수: ${allAdmins.length}\n`);
  
  if (allAdmins.length === 0) {
    console.log('❌ 관리자 계정이 없습니다!');
  } else {
    allAdmins.forEach((admin, idx) => {
      console.log(`--- 관리자 ${idx + 1} ---`);
      console.log(`ID: ${admin.id}`);
      console.log(`이름 (원본): "${admin.name}"`);
      console.log(`이름 (JSON): ${JSON.stringify(admin.name)}`);
      console.log(`이름 (문자 코드): [${admin.name?.split('').map(c => c.charCodeAt(0)).join(', ')}]`);
      console.log(`이름 (길이): ${admin.name?.length}`);
      console.log(`전화번호 (원본): "${admin.phone}"`);
      console.log(`전화번호 (JSON): ${JSON.stringify(admin.phone)}`);
      console.log(`전화번호 (문자 코드): [${admin.phone?.split('').map(c => c.charCodeAt(0)).join(', ')}]`);
      console.log(`전화번호 (길이): ${admin.phone?.length}`);
      console.log(`비밀번호: "${admin.password}"`);
      console.log(`비밀번호 길이: ${admin.password?.length}`);
      console.log('');
    });
  }
  
  // 특정 계정으로 검색 테스트
  console.log('=== 검색 테스트 ===\n');
  
  const testName = '관리자';
  const testPhone = '01024958013';
  
  console.log(`검색 조건:`);
  console.log(`  이름: "${testName}" (JSON: ${JSON.stringify(testName)})`);
  console.log(`  전화번호: "${testPhone}" (JSON: ${JSON.stringify(testPhone)})`);
  console.log(`  역할: "admin"\n`);
  
  const found = await prisma.user.findFirst({
    where: {
      name: testName,
      phone: testPhone,
      role: 'admin',
    },
    select: {
      id: true,
      name: true,
      phone: true,
      password: true,
    },
  });
  
  if (found) {
    console.log('✅ 검색 성공!');
    console.log(`  ID: ${found.id}`);
    console.log(`  이름: ${JSON.stringify(found.name)}`);
    console.log(`  전화번호: ${JSON.stringify(found.phone)}`);
    console.log(`  비밀번호 일치 (0313): ${found.password === '0313'}`);
  } else {
    console.log('❌ 검색 실패!');
    
    // 부분 검색
    const byName = await prisma.user.findMany({ where: { name: testName } });
    const byPhone = await prisma.user.findMany({ where: { phone: testPhone } });
    const byRole = await prisma.user.findMany({ where: { role: 'admin' } });
    
    console.log(`\n부분 검색 결과:`);
    console.log(`  이름으로 검색: ${byName.length}개`);
    byName.forEach(u => {
      console.log(`    - ID: ${u.id}, 이름: ${JSON.stringify(u.name)}, 전화번호: ${JSON.stringify(u.phone)}, 역할: ${u.role}`);
    });
    console.log(`  전화번호로 검색: ${byPhone.length}개`);
    byPhone.forEach(u => {
      console.log(`    - ID: ${u.id}, 이름: ${JSON.stringify(u.name)}, 전화번호: ${JSON.stringify(u.phone)}, 역할: ${u.role}`);
    });
    console.log(`  역할로 검색: ${byRole.length}개`);
    byRole.forEach(u => {
      console.log(`    - ID: ${u.id}, 이름: ${JSON.stringify(u.name)}, 전화번호: ${JSON.stringify(u.phone)}, 역할: ${u.role}`);
    });
  }
  
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ 오류 발생:', e);
  process.exit(1);
});






