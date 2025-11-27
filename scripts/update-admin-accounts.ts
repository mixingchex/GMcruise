/**
 * 관리자 계정 정보 업데이트 스크립트
 * 
 * 사용법:
 * npx tsx scripts/update-admin-accounts.ts
 */

import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function updateAdminAccounts() {
  try {
    console.log('관리자 계정 업데이트 시작...\n');

    // 관리자 1: 모니카
    const admin1Phone = '01024958013';
    const admin1Name = '모니카';
    const admin1Password = '0313';

    // 관리자 2: 저스틴
    const admin2Phone = '01038609161';
    const admin2Name = '저스틴';
    const admin2Password = '0313';

    // 관리자 1 업데이트
    console.log(`[1] 관리자 1 업데이트 중... (전화번호: ${admin1Phone})`);
    const admin1 = await prisma.user.findFirst({
      where: {
        phone: admin1Phone,
        role: 'admin',
      },
    });

    if (admin1) {
      // 비밀번호 해시
      const hashedPassword = await bcrypt.hash(admin1Password, 10);
      
      await prisma.user.update({
        where: { id: admin1.id },
        data: {
          name: admin1Name,
          phone: admin1Phone,
          password: hashedPassword,
        },
      });
      console.log(`✅ 관리자 1 업데이트 완료: ${admin1Name} (ID: ${admin1.id})`);
    } else {
      console.log(`⚠️  관리자 1을 찾을 수 없습니다. (전화번호: ${admin1Phone})`);
    }

    // 관리자 2 업데이트
    console.log(`\n[2] 관리자 2 업데이트 중... (전화번호: ${admin2Phone})`);
    const admin2 = await prisma.user.findFirst({
      where: {
        phone: admin2Phone,
        role: 'admin',
      },
    });

    if (admin2) {
      // 비밀번호 해시
      const hashedPassword = await bcrypt.hash(admin2Password, 10);
      
      await prisma.user.update({
        where: { id: admin2.id },
        data: {
          name: admin2Name,
          phone: admin2Phone,
          password: hashedPassword,
        },
      });
      console.log(`✅ 관리자 2 업데이트 완료: ${admin2Name} (ID: ${admin2.id})`);
    } else {
      console.log(`⚠️  관리자 2를 찾을 수 없습니다. (전화번호: ${admin2Phone})`);
    }

    console.log('\n✅ 모든 관리자 계정 업데이트 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
updateAdminAccounts()
  .then(() => {
    console.log('\n스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('스크립트 실행 실패:', error);
    process.exit(1);
  });

