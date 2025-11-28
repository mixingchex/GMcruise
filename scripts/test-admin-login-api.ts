import prisma from '../lib/prisma';

async function testAdminLoginAPI() {
  try {
    const name = '모니카';
    const phone = '01024958013';
    const password = '0313';

    console.log('=== 관리자 로그인 API 로직 시뮬레이션 ===\n');
    console.log('입력값:');
    console.log(`  이름: "${name}"`);
    console.log(`  전화번호: "${phone}"`);
    console.log(`  비밀번호: "${password}"`);
    console.log('');

    // 입력값 정규화 (로그인 API와 동일)
    const normalizedName = name.trim();
    const normalizedPhone = phone.replace(/[-\s]/g, '');

    console.log('정규화된 값:');
    console.log(`  이름: "${normalizedName}"`);
    console.log(`  전화번호: "${normalizedPhone}"`);
    console.log('');

    // 모든 관리자 계정 조회 (로그인 API와 동일)
    const allAdmins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        password: true,
        loginCount: true,
        name: true,
        phone: true,
      },
    });

    console.log(`전체 관리자 계정 수: ${allAdmins.length}\n`);

    // 정규화된 값으로 관리자 계정 찾기 (로그인 API와 동일)
    let adminUser = allAdmins.find(admin => {
      const adminName = admin.name?.trim() || '';
      const adminPhone = admin.phone?.replace(/[-\s]/g, '') || '';
      return adminName === normalizedName && adminPhone === normalizedPhone;
    });

    console.log('=== 계정 검색 결과 ===');
    if (adminUser) {
      console.log('✅ 계정을 찾았습니다!');
      console.log(`   ID: ${adminUser.id}`);
      console.log(`   이름: "${adminUser.name}"`);
      console.log(`   전화번호: "${adminUser.phone}"`);
      console.log(`   비밀번호: "${adminUser.password}"`);
      console.log('');

      // 비밀번호 확인 (로그인 API와 동일)
      const isPasswordValid = adminUser.password === password;
      console.log('=== 비밀번호 확인 ===');
      console.log(`   저장된 비밀번호: "${adminUser.password}"`);
      console.log(`   입력한 비밀번호: "${password}"`);
      console.log(`   일치 여부: ${isPasswordValid ? '✅ 일치' : '❌ 불일치'}`);
      console.log(`   저장된 비밀번호 길이: ${adminUser.password?.length || 0}`);
      console.log(`   입력한 비밀번호 길이: ${password.length}`);

      if (!isPasswordValid) {
        console.log('\n❌ 비밀번호가 일치하지 않습니다!');
        console.log('\n비밀번호 비교 상세:');
        console.log(`   저장된 비밀번호 문자 코드: [${(adminUser.password || '').split('').map(c => c.charCodeAt(0)).join(', ')}]`);
        console.log(`   입력한 비밀번호 문자 코드: [${password.split('').map(c => c.charCodeAt(0)).join(', ')}]`);
      } else {
        console.log('\n✅ 비밀번호가 일치합니다!');
      }
    } else {
      console.log('❌ 계정을 찾을 수 없습니다!');
      console.log('\n가능한 원인:');
      console.log('  1. 이름이 정확히 일치하지 않음');
      console.log('  2. 전화번호가 정확히 일치하지 않음');
      console.log('  3. role이 "admin"이 아님');
    }

    // 디버깅: 모든 관리자 계정의 정규화된 값 출력
    console.log('\n=== 모든 관리자 계정 정규화 값 ===');
    allAdmins.forEach((admin, index) => {
      const adminName = admin.name?.trim() || '';
      const adminPhone = admin.phone?.replace(/[-\s]/g, '') || '';
      const nameMatch = adminName === normalizedName;
      const phoneMatch = adminPhone === normalizedPhone;
      
      console.log(`\n[${index + 1}] ID: ${admin.id}`);
      console.log(`    원본 이름: "${admin.name}"`);
      console.log(`    정규화 이름: "${adminName}" ${nameMatch ? '✅' : '❌'}`);
      console.log(`    원본 전화번호: "${admin.phone}"`);
      console.log(`    정규화 전화번호: "${adminPhone}" ${phoneMatch ? '✅' : '❌'}`);
      console.log(`    비밀번호: "${admin.password}"`);
      if (nameMatch && phoneMatch) {
        const passwordMatch = admin.password === password;
        console.log(`    비밀번호 일치: ${passwordMatch ? '✅' : '❌'}`);
      }
    });

  } catch (error) {
    console.error('오류 발생:', error);
    if (error instanceof Error) {
      console.error('오류 메시지:', error.message);
      console.error('오류 스택:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testAdminLoginAPI();


