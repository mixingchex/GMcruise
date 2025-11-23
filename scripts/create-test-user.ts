import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userName = '전혜선';
  const userPhone = '01024958013';
  const userPassword = '3800';

  console.log('=== 테스트 사용자 생성/업데이트 ===\n');
  console.log(`이름: ${userName}`);
  console.log(`전화번호: ${userPhone}`);
  console.log(`비밀번호: ${userPassword}\n`);

  // 기존 사용자 확인 (전화번호로)
  const existingUser = await prisma.user.findFirst({
    where: {
      phone: userPhone,
    },
  });

  if (existingUser) {
    console.log('✅ 기존 사용자 발견:');
    console.log(`   ID: ${existingUser.id}`);
    console.log(`   이름: ${existingUser.name}`);
    console.log(`   전화번호: ${existingUser.phone}`);
    console.log(`   역할: ${existingUser.role}`);
    console.log(`   비밀번호: ${existingUser.password ? '***' : 'null'}`);
    console.log(`   온보딩: ${existingUser.onboarded}`);
    console.log(`   고객 상태: ${existingUser.customerStatus || 'null'}`);
    console.log(`   고객 소스: ${existingUser.customerSource || 'null'}\n`);

    // 일반 사용자로 업데이트
    if (existingUser.role !== 'user' || existingUser.name !== userName || existingUser.password !== userPassword) {
      console.log('📝 사용자 정보 업데이트 중...');
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: userName,
          phone: userPhone,
          password: userPassword,
          role: 'user',
          customerStatus: 'active',
          customerSource: 'cruise-guide',
          isLocked: false,
          isHibernated: false,
          onboarded: false, // 온보딩은 관리자 패널에서 설정
        },
      });
      console.log('✅ 사용자 정보가 업데이트되었습니다.\n');
    } else {
      console.log('ℹ️  사용자 정보가 이미 올바르게 설정되어 있습니다.\n');
    }
  } else {
    console.log('📝 신규 사용자 생성 중...');
    const newUser = await prisma.user.create({
      data: {
        name: userName,
        phone: userPhone,
        password: userPassword,
        role: 'user',
        customerStatus: 'active',
        customerSource: 'cruise-guide',
        onboarded: false, // 온보딩은 관리자 패널에서 설정
        loginCount: 0,
      },
    });
    
    console.log('✅ 사용자가 생성되었습니다.');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   이름: ${newUser.name}`);
    console.log(`   전화번호: ${newUser.phone}`);
    console.log(`   역할: ${newUser.role}\n`);
  }

  // 최종 확인
  const finalUser = await prisma.user.findFirst({
    where: {
      phone: userPhone,
      name: userName,
      password: userPassword,
      role: 'user',
    },
    select: {
      id: true,
      name: true,
      phone: true,
      password: true,
      role: true,
      onboarded: true,
      customerStatus: true,
      customerSource: true,
    },
  });

  if (finalUser) {
    console.log('✅ 최종 확인: 로그인 가능한 사용자입니다.');
    console.log(`   ID: ${finalUser.id}`);
    console.log(`   이름: ${finalUser.name}`);
    console.log(`   전화번호: ${finalUser.phone}`);
    console.log(`   역할: ${finalUser.role}`);
    console.log(`   온보딩: ${finalUser.onboarded}`);
    console.log(`   고객 상태: ${finalUser.customerStatus || 'null'}`);
    console.log(`   고객 소스: ${finalUser.customerSource || 'null'}\n`);
    console.log('📌 다음 단계:');
    console.log('   1. 관리자 패널에서 온보딩 설정 (필요한 경우)');
    console.log('   2. 로그인 페이지에서 다음 정보로 로그인:');
    console.log(`      - 이름: ${userName}`);
    console.log(`      - 전화번호: ${userPhone}`);
    console.log(`      - 비밀번호: ${userPassword}`);
  } else {
    console.log('❌ 오류: 사용자를 찾을 수 없습니다.');
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

