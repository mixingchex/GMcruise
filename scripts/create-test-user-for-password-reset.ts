// scripts/create-test-user-for-password-reset.ts
// 비밀번호 찾기 테스트용 샘플 사용자 생성

import prisma from '../lib/prisma';

async function main() {
  console.log('🔐 비밀번호 찾기 테스트용 사용자 생성 시작...\n');

  try {
    const testUserData = {
      name: '전혜선',
      phone: '01024958013',
      email: 'hyeseon28@naver.com',
      password: '3800', // 크루즈몰 기본 비밀번호
      role: 'community' as const,
      customerSource: 'mall-signup' as const,
      mallUserId: 'test_user_001', // 아이디로 표시될 값
    };

    // 1. 기존 사용자 확인
    console.log('1️⃣ 기존 사용자 확인 중...');
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: testUserData.phone },
          { email: testUserData.email },
        ],
      },
    });

    if (existingUser) {
      console.log(`   ⚠️  이미 존재하는 사용자 발견: ID ${existingUser.id}`);
      console.log(`   이름: ${existingUser.name}`);
      console.log(`   전화번호: ${existingUser.phone}`);
      console.log(`   이메일: ${existingUser.email || '없음'}`);
      console.log(`   역할: ${existingUser.role}`);
      console.log(`   고객 소스: ${existingUser.customerSource || '없음'}`);
      
      // 이메일이 다른 사용자에게 사용 중인지 확인
      const emailUser = await prisma.user.findFirst({
        where: {
          email: testUserData.email,
          id: { not: existingUser.id },
        },
      });

      if (emailUser) {
        console.log(`\n   ⚠️  이메일 ${testUserData.email}이 다른 사용자(ID: ${emailUser.id})에게 사용 중입니다.`);
        console.log(`   기존 사용자(ID: ${existingUser.id})의 정보만 업데이트합니다.`);
      }

      // 기존 사용자 정보 업데이트 (이메일은 조건부로)
      console.log('\n2️⃣ 기존 사용자 정보 업데이트 중...');
      const updateData: any = {
        name: testUserData.name,
        role: testUserData.role,
        customerSource: testUserData.customerSource,
        mallUserId: testUserData.mallUserId,
        password: testUserData.password, // 평문 비밀번호 저장
      };

      // 이메일이 다른 사용자에게 사용 중이 아니면 업데이트
      if (!emailUser) {
        updateData.email = testUserData.email;
      } else {
        console.log(`   ⚠️  이메일은 기존 값 유지: ${existingUser.email || '없음'}`);
      }

      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: updateData,
      });

      console.log(`   ✅ 사용자 정보 업데이트 완료: ID ${updatedUser.id}`);

      // PasswordEvent 생성 (비밀번호 찾기용)
      console.log('\n3️⃣ PasswordEvent 생성 중...');
      const passwordEvent = await prisma.passwordEvent.create({
        data: {
          userId: updatedUser.id,
          reason: '회원가입',
          from: '', // 이전 비밀번호 (없음)
          to: testUserData.password, // 평문 비밀번호 저장
        },
      });

      console.log(`   ✅ PasswordEvent 생성 완료: ID ${passwordEvent.id}`);
      console.log(`   저장된 비밀번호: ${passwordEvent.to}`);

      console.log('\n✨ 테스트 사용자 준비 완료!');
      console.log('\n📋 테스트 정보:');
      console.log(`   이름: ${testUserData.name}`);
      console.log(`   연락처: ${testUserData.phone}`);
      console.log(`   이메일: ${testUserData.email}`);
      console.log(`   아이디: ${testUserData.mallUserId}`);
      console.log(`   비밀번호: ${testUserData.password}`);
      console.log('\n🧪 테스트 방법:');
      console.log('   1. http://localhost:3000/mall/find-password 접속');
      console.log('   2. 이름: 전혜선, 연락처: 01024958013 입력');
      console.log('   3. 아이디 찾기 클릭');
      console.log('   4. 이메일: hyeseon28@naver.com 입력');
      console.log('   5. 비밀번호 전송 클릭');
      console.log('   6. hyeseon28@naver.com 이메일 확인\n');

      await prisma.$disconnect();
      return;
    }

    // 2. 새 사용자 생성
    console.log('2️⃣ 새 사용자 생성 중...');
    const newUser = await prisma.user.create({
      data: {
        name: testUserData.name,
        phone: testUserData.phone,
        email: testUserData.email,
        password: testUserData.password, // 평문 비밀번호 저장
        role: testUserData.role,
        customerSource: testUserData.customerSource,
        mallUserId: testUserData.mallUserId,
      },
    });

    console.log(`   ✅ 사용자 생성 완료: ID ${newUser.id}`);

    // 3. PasswordEvent 생성 (비밀번호 찾기용)
    console.log('\n3️⃣ PasswordEvent 생성 중...');
    const passwordEvent = await prisma.passwordEvent.create({
      data: {
        userId: newUser.id,
        reason: '회원가입',
        from: '', // 이전 비밀번호 (없음)
        to: testUserData.password, // 평문 비밀번호 저장
      },
    });

    console.log(`   ✅ PasswordEvent 생성 완료: ID ${passwordEvent.id}`);
    console.log(`   저장된 비밀번호: ${passwordEvent.to}`);

    console.log('\n✨ 테스트 사용자 생성 완료!');
    console.log('\n📋 테스트 정보:');
    console.log(`   이름: ${testUserData.name}`);
    console.log(`   연락처: ${testUserData.phone}`);
    console.log(`   이메일: ${testUserData.email}`);
    console.log(`   아이디: ${testUserData.mallUserId}`);
    console.log(`   비밀번호: ${testUserData.password}`);
    console.log('\n🧪 테스트 방법:');
    console.log('   1. http://localhost:3000/mall/find-password 접속');
    console.log('   2. 이름: 전혜선, 연락처: 01024958013 입력');
    console.log('   3. 아이디 찾기 클릭');
    console.log('   4. 이메일: hyeseon28@naver.com 입력');
    console.log('   5. 비밀번호 전송 클릭');
    console.log('   6. hyeseon28@naver.com 이메일 확인\n');

  } catch (error: any) {
    console.error('\n❌ 에러 발생:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

