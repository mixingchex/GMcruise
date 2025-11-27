import prisma from '../lib/prisma';

async function checkAdminLogin() {
  try {
    const name = '모니카';
    const phone = '01024958013';
    const password = '0313';

    console.log('=== 관리자 로그인 계정 확인 ===\n');
    console.log('입력값:');
    console.log(`  이름: "${name}"`);
    console.log(`  전화번호: "${phone}"`);
    console.log(`  비밀번호: "${password}"`);
    console.log('');

    // 정규화
    const normalizedName = name.trim();
    const normalizedPhone = phone.replace(/[-\s]/g, '');

    console.log('정규화된 값:');
    console.log(`  이름: "${normalizedName}"`);
    console.log(`  전화번호: "${normalizedPhone}"`);
    console.log('');

    // 모든 관리자 계정 조회
    const allAdmins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        name: true,
        phone: true,
        password: true,
        loginCount: true,
        customerSource: true,
      },
    });

    console.log(`전체 관리자 계정 수: ${allAdmins.length}\n`);

    if (allAdmins.length === 0) {
      console.log('❌ 관리자 계정이 없습니다!');
      return;
    }

    console.log('=== 모든 관리자 계정 목록 ===');
    allAdmins.forEach((admin, index) => {
      const adminName = admin.name?.trim() || '';
      const adminPhone = admin.phone?.replace(/[-\s]/g, '') || '';
      const nameMatch = adminName === normalizedName;
      const phoneMatch = adminPhone === normalizedPhone;
      const passwordMatch = admin.password === password;

      console.log(`\n[${index + 1}] ID: ${admin.id}`);
      console.log(`    이름: "${admin.name}" (정규화: "${adminName}") ${nameMatch ? '✅' : '❌'}`);
      console.log(`    전화번호: "${admin.phone}" (정규화: "${adminPhone}") ${phoneMatch ? '✅' : '❌'}`);
      console.log(`    비밀번호: "${admin.password}" ${passwordMatch ? '✅' : '❌'}`);
      console.log(`    로그인 횟수: ${admin.loginCount}`);
      console.log(`    customerSource: ${admin.customerSource || 'null'}`);
      console.log(`    매칭 여부: ${nameMatch && phoneMatch && passwordMatch ? '✅ 매칭됨' : '❌ 불일치'}`);
    });

    // 정규화된 값으로 관리자 계정 찾기
    const adminUser = allAdmins.find(admin => {
      const adminName = admin.name?.trim() || '';
      const adminPhone = admin.phone?.replace(/[-\s]/g, '') || '';
      return adminName === normalizedName && adminPhone === normalizedPhone;
    });

    console.log('\n=== 검색 결과 ===');
    if (adminUser) {
      console.log('✅ 계정을 찾았습니다!');
      console.log(`   ID: ${adminUser.id}`);
      console.log(`   이름: "${adminUser.name}"`);
      console.log(`   전화번호: "${adminUser.phone}"`);
      console.log(`   비밀번호: "${adminUser.password}"`);
      console.log(`   비밀번호 일치: ${adminUser.password === password ? '✅' : '❌'}`);
      
      if (adminUser.password !== password) {
        console.log('\n❌ 비밀번호가 일치하지 않습니다!');
        console.log(`   입력한 비밀번호: "${password}"`);
        console.log(`   저장된 비밀번호: "${adminUser.password}"`);
        console.log(`   비밀번호 길이: 입력=${password.length}, 저장=${adminUser.password?.length || 0}`);
      } else {
        console.log('\n✅ 모든 정보가 일치합니다! 로그인이 가능해야 합니다.');
      }
    } else {
      console.log('❌ 계정을 찾을 수 없습니다!');
      console.log('\n가능한 원인:');
      console.log('  1. 이름이 정확히 일치하지 않음');
      console.log('  2. 전화번호가 정확히 일치하지 않음');
      console.log('  3. role이 "admin"이 아님');
    }

    // 전화번호로만 검색 (참고용)
    console.log('\n=== 전화번호로만 검색 (참고) ===');
    const phoneOnlyUsers = await prisma.user.findMany({
      where: {
        phone: {
          contains: '01024958013',
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        password: true,
      },
    });

    if (phoneOnlyUsers.length > 0) {
      phoneOnlyUsers.forEach((user, index) => {
        console.log(`\n[${index + 1}] ID: ${user.id}`);
        console.log(`    이름: "${user.name}"`);
        console.log(`    전화번호: "${user.phone}"`);
        console.log(`    role: "${user.role}"`);
        console.log(`    비밀번호: "${user.password}"`);
      });
    } else {
      console.log('전화번호로 검색된 계정이 없습니다.');
    }

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminLogin();
