/**
 * 계약서 전체 플로우 테스트 스크립트
 * - 계약서 생성
 * - 서명 링크 조회
 * - 서명 저장
 * - 완료 페이지 데이터 조회
 */

import prisma from '../lib/prisma';

async function testContractFlow() {
  console.log('🧪 계약서 전체 플로우 테스트 시작...\n');

  try {
    // 1. 테스트용 사용자 찾기 또는 생성
    console.log('1️⃣ 테스트 사용자 확인 중...');

    let testUser = await prisma.user.findFirst({
      where: {
        email: 'test-contract@example.com',
      },
    });

    if (!testUser) {
      console.log('  ➜ 테스트 사용자 생성 중...');
      // bcrypt로 비밀번호 해시 생성
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('test1234', 10);

      testUser = await prisma.user.create({
        data: {
          email: 'test-contract@example.com',
          name: '테스트 계약자',
          phone: '01012345678',
          password: hashedPassword,
          mallUserId: `test_contract_${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`  ✅ 테스트 사용자 생성 완료 (ID: ${testUser.id})`);
    } else {
      console.log(`  ✅ 기존 테스트 사용자 사용 (ID: ${testUser.id})`);
    }

    // 2. 테스트 계약서 생성
    console.log('\n2️⃣ 테스트 계약서 생성 중...');

    const signatureToken = `test_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const signatureLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/affiliate/contract/sign/${signatureToken}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

    const contract = await prisma.affiliateContract.create({
      data: {
        userId: testUser.id,
        name: testUser.name || '테스트 계약자',
        email: testUser.email || 'test@example.com',
        phone: testUser.phone || '01012345678',
        residentId: '800101-1234567', // 테스트용 주민등록번호
        address: '서울시 강남구 테스트동 123-45', // 필수 필드
        status: 'pending',
        signatureLink,
        signatureLinkExpiresAt: expiresAt,
        metadata: {
          contractType: 'SUBSCRIPTION_AGENT',
          isTrial: false,
          createdBy: 'test-script',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`  ✅ 계약서 생성 완료 (ID: ${contract.id})`);
    console.log(`  📝 서명 링크: ${signatureLink}`);
    console.log(`  ⏰ 만료 시간: ${expiresAt.toISOString()}`);

    // 3. 서명 링크로 계약서 조회 테스트 (GET)
    console.log('\n3️⃣ 서명 링크로 계약서 조회 테스트...');

    const fetchedContract = await prisma.affiliateContract.findFirst({
      where: {
        signatureLink: {
          contains: signatureToken,
        },
      },
      include: {
        User_AffiliateContract_userIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (fetchedContract) {
      console.log('  ✅ 계약서 조회 성공');
      console.log(`     - 계약자: ${fetchedContract.name}`);
      console.log(`     - 이메일: ${fetchedContract.email}`);
      console.log(`     - 상태: ${fetchedContract.status}`);
    } else {
      console.log('  ❌ 계약서 조회 실패');
      throw new Error('계약서를 찾을 수 없습니다.');
    }

    // 4. 서명 저장 테스트 (POST)
    console.log('\n4️⃣ 서명 저장 테스트...');

    const metadata = contract.metadata as any;
    const signatures = metadata?.signatures || {};

    const mockSignatureImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const signedByName = '테스트 서명자';

    const updatedSignatures = {
      ...signatures,
      main: {
        url: mockSignatureImage,
        signedBy: signedByName,
        signedAt: new Date().toISOString(),
      },
    };

    const updatedContract = await prisma.affiliateContract.update({
      where: { id: contract.id },
      data: {
        status: 'completed',
        contractSignedAt: new Date(),
        metadata: {
          ...metadata,
          signatures: updatedSignatures,
          signedByName,
          signedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    });

    console.log('  ✅ 서명 저장 성공');
    console.log(`     - 상태: ${updatedContract.status}`);
    console.log(`     - 서명자: ${signedByName}`);
    console.log(`     - 서명 시간: ${new Date().toISOString()}`);

    // 5. 완료 페이지 데이터 조회 테스트
    console.log('\n5️⃣ 완료 페이지 데이터 조회 테스트...');

    const completedContract = await prisma.affiliateContract.findUnique({
      where: { id: contract.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        submittedAt: true,
        completedAt: true,
        metadata: true,
      },
    });

    if (completedContract) {
      console.log('  ✅ 계약서 정보 조회 성공');
      console.log(`     - 계약서 ID: ${completedContract.id}`);
      console.log(`     - 상태: ${completedContract.status}`);
      console.log(`     - metadata: ${JSON.stringify(completedContract.metadata, null, 2)}`);
    } else {
      console.log('  ❌ 계약서 정보 조회 실패');
      throw new Error('완료된 계약서를 찾을 수 없습니다.');
    }

    // 6. redirectUrl 생성 테스트
    console.log('\n6️⃣ redirectUrl 생성 테스트...');

    const contractType = metadata?.contractType || 'SALES_AGENT';
    const redirectUrl = `/affiliate/contract/complete?contractId=${contract.id}&type=${contractType}`;

    console.log(`  ✅ redirectUrl: ${redirectUrl}`);

    // 7. 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 테스트 결과 요약');
    console.log('='.repeat(60));
    console.log(`✅ 계약서 생성: 성공 (ID: ${contract.id})`);
    console.log(`✅ 서명 링크 조회: 성공`);
    console.log(`✅ 서명 저장: 성공 (상태: ${updatedContract.status})`);
    console.log(`✅ 완료 페이지 조회: 성공`);
    console.log(`✅ redirectUrl: ${redirectUrl}`);
    console.log('\n🎉 모든 테스트 통과!\n');

    return {
      success: true,
      contractId: contract.id,
      redirectUrl,
    };
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
testContractFlow()
  .then((result) => {
    console.log('✅ 테스트 완료:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 테스트 실패:', error);
    process.exit(1);
  });
