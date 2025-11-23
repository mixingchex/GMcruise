import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// .env 파일 로드
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

// DATABASE_URL_TEST를 우선적으로 사용 (테스트 DB에 관리자 계정 생성)
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  console.log('✅ DATABASE_URL_TEST를 사용하여 테스트 DB에 관리자 계정을 생성합니다.');
}

if (!process.env.DATABASE_URL) {
  console.error('❌ 오류: DATABASE_URL 또는 DATABASE_URL_TEST 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  // 지정된 관리자 계정 2명
  const admins = [
    { name: '관리자', phone: '01024958013', password: '0313' },
    { name: '관리자2', phone: '01038609161', password: '0313' },
  ];

  for (const admin of admins) {
    // 기존 관리자 계정 확인
    const existingAdmin = await prisma.user.findFirst({
      where: {
        name: admin.name,
        phone: admin.phone,
        role: 'admin',
      },
    });

    if (existingAdmin) {
      console.log(`✅ 관리자 계정이 이미 존재합니다: ${admin.name} (${admin.phone})`);
      
      // 비밀번호가 다르면 업데이트
      if (existingAdmin.password !== admin.password) {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { password: admin.password },
        });
        console.log(`✅ 비밀번호가 업데이트되었습니다: ${admin.name}`);
      }
    } else {
      // 관리자 계정 생성
      try {
        const newAdmin = await prisma.user.create({
          data: {
            name: admin.name,
            phone: admin.phone,
            password: admin.password,
            role: 'admin',
            onboarded: true,
            loginCount: 0,
            updatedAt: new Date(),
          },
        });
        
        console.log(`✅ 관리자 계정이 생성되었습니다: ${admin.name} (${admin.phone})`);
        console.log(`   ID: ${newAdmin.id}`);
      } catch (createError: any) {
        // 중복 오류면 이미 존재하는 것
        if (createError?.code === 'P2002') {
          console.log(`⚠️  관리자 계정이 이미 존재합니다: ${admin.name} (${admin.phone})`);
        } else {
          console.error(`❌ 관리자 계정 생성 실패: ${admin.name}`, createError);
        }
      }
    }
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

