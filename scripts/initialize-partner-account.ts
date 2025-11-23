/**
 * 판매원 계정 초기화/복제 스크립트
 * 
 * 사용법:
 * npx tsx scripts/initialize-partner-account.ts [옵션]
 * 
 * 옵션:
 *   --source-mall-id <ID>        : 복제할 소스 판매원 ID
 *   --new-mall-id <ID>           : 새 판매원 ID (생성할 ID)
 *   --clean                      : 테스트/샘플 데이터 삭제
 *   --keep-sms                   : SMS API 설정 유지 (기본값: 삭제)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Options {
  sourceMallId?: string;
  newMallId?: string;
  clean: boolean;
  keepSms: boolean;
}

function parseArgs(): Options {
  // @ts-ignore - process는 Node.js 전역 변수
  const args = (globalThis as any).process?.argv?.slice(2) || [];
  const options: Options = {
    clean: false,
    keepSms: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--source-mall-id':
        options.sourceMallId = args[++i];
        break;
      case '--new-mall-id':
        options.newMallId = args[++i];
        break;
      case '--clean':
        options.clean = true;
        break;
      case '--keep-sms':
        options.keepSms = true;
        break;
    }
  }

  return options;
}

async function cleanupTestData(userId: number, keepSms: boolean = false) {
  // user1 계정 보호 확인
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mallUserId: true, name: true },
  });

  if (!user) {
    throw new Error(`사용자 ID ${userId}를 찾을 수 없습니다.`);
  }

  if (user && (user.mallUserId === 'user1' || user.mallUserId === '1')) {
    console.error('❌ 오류: user1 계정은 학습용/테스트용으로 보존되어야 합니다.');
    console.error('   user1 계정의 데이터를 삭제할 수 없습니다.');
    throw new Error('user1 계정은 보호됩니다. --clean 옵션을 사용할 수 없습니다.');
  }

  console.log(`🧹 사용자 ID ${userId}의 테스트/샘플 데이터 삭제 중...`);

  // 1. 고객 그룹 삭제 (샘플/테스트 데이터)
  const groups = await prisma.affiliateLead.findMany({
    where: { agentId: userId },
    select: { id: true },
  });

  if (groups.length > 0) {
    // 고객 데이터 삭제
    await prisma.affiliateInteraction.deleteMany({
      where: {
        leadId: { in: groups.map(g => g.id) },
      },
    });

    await prisma.affiliateSale.deleteMany({
      where: {
        leadId: { in: groups.map(g => g.id) },
      },
    });

    await prisma.affiliateLead.deleteMany({
      where: { agentId: userId },
    });

    console.log(`  ✅ 고객 그룹 ${groups.length}개 삭제 완료`);
  }

  // 2. 예약 메시지 삭제
  const messages = await prisma.scheduledMessage.deleteMany({
    where: { adminId: userId },
  });
  if (messages.count > 0) {
    console.log(`  ✅ 예약 메시지 ${messages.count}개 삭제 완료`);
  }

  // 3. 링크 이벤트 삭제
  const links = await prisma.affiliateLink.findMany({
    where: { agentId: userId },
    select: { id: true },
  });

  if (links.length > 0) {
    await prisma.affiliateLinkEvent.deleteMany({
      where: {
        linkId: { in: links.map(l => l.id) },
      },
    });

    await prisma.affiliateLink.deleteMany({
      where: { agentId: userId },
    });

    console.log(`  ✅ 링크 ${links.length}개 삭제 완료`);
  }

  // 4. 랜딩 페이지 삭제
  const landingPages = await prisma.landingPage.deleteMany({
    where: { adminId: userId },
  });
  if (landingPages.count > 0) {
    console.log(`  ✅ 랜딩 페이지 ${landingPages.count}개 삭제 완료`);
  }

  // 5. SMS API 설정 삭제 (keepSms가 false인 경우)
  if (!keepSms) {
    // AffiliateProfile 찾기
    const affiliateProfile = await prisma.affiliateProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (affiliateProfile) {
      // PartnerSmsConfig 삭제 (profileId로 찾기)
      const partnerSmsConfig = await prisma.partnerSmsConfig.findUnique({
        where: { profileId: affiliateProfile.id },
      });
      if (partnerSmsConfig) {
        await prisma.partnerSmsConfig.delete({
          where: { profileId: affiliateProfile.id },
        });
        console.log(`  ✅ PartnerSmsConfig 삭제 완료`);
      }

      // AffiliateSmsConfig 삭제
      const affiliateSmsConfig = await prisma.affiliateSmsConfig.findUnique({
        where: { profileId: affiliateProfile.id },
      });
      if (affiliateSmsConfig) {
        await prisma.affiliateSmsConfig.delete({
          where: { profileId: affiliateProfile.id },
        });
        console.log(`  ✅ AffiliateSmsConfig 삭제 완료`);
      }
    }
  }

  console.log(`✅ 사용자 ID ${userId}의 테스트 데이터 삭제 완료\n`);
}

async function clonePartnerAccount(sourceMallId: string, newMallId: string) {
  console.log(`📋 판매원 계정 복제 시작...`);
  console.log(`  소스: ${sourceMallId}`);
  console.log(`  대상: ${newMallId}\n`);

  // user1 계정 보호 (복제 대상으로는 사용 가능하지만, 소스를 user1로 하는 것은 주의 필요)
  if (newMallId === 'user1' || newMallId === '1') {
    throw new Error('user1 계정은 학습용/테스트용으로 보존되어야 합니다. 다른 ID를 사용하세요.');
  }

  // 소스 사용자 찾기
  const sourceUser = await prisma.user.findFirst({
    where: {
      OR: [
        { mallUserId: sourceMallId },
        { phone: sourceMallId },
      ],
    },
    include: {
      AffiliateProfile: true,
    },
  });

  if (!sourceUser) {
    throw new Error(`소스 판매원 ID "${sourceMallId}"를 찾을 수 없습니다.`);
  }

  // 새 사용자 생성 (기본 정보만 복제)
  const newUser = await prisma.user.create({
    data: {
      name: sourceUser.name,
      phone: null, // 새 전화번호는 수동 입력 필요
      email: null, // 새 이메일은 수동 입력 필요
      password: 'qwe1', // 기본 비밀번호
      role: sourceUser.role || 'community',
      mallUserId: newMallId,
      onboarded: false,
      loginCount: 0,
    },
  });

  console.log(`  ✅ 새 사용자 생성 완료 (ID: ${newUser.id})`);

  // AffiliateProfile 복제 (기본 구조만)
  const sourceProfile = sourceUser.AffiliateProfile;
  if (sourceProfile) {
    const newProfile = await prisma.affiliateProfile.create({
      data: {
        userId: newUser.id,
        affiliateCode: newMallId,
        type: sourceProfile.type,
        displayName: sourceProfile.displayName || newMallId,
        status: 'ACTIVE',
        // SMS API 설정은 복제하지 않음 (개인이 등록해야 함)
        // PartnerSmsConfig와 AffiliateSmsConfig는 별도로 생성하지 않음
      },
    });

    console.log(`  ✅ 판매원 프로필 생성 완료`);
  }

  console.log(`✅ 판매원 계정 복제 완료!\n`);
  console.log(`📝 다음 단계:`);
  console.log(`  1. 새 판매원 계정에 로그인: /partner/${newMallId}/dashboard`);
  console.log(`  2. 전화번호와 이메일을 수정하세요`);
  console.log(`  3. SMS API 설정을 개인 계정으로 등록하세요`);
  console.log(`  4. 비밀번호를 변경하세요\n`);

  return newUser.id;
}

async function createNewPartnerAccount(mallId: string) {
  console.log(`📋 새 판매원 계정 생성 중...`);
  console.log(`  판매원 ID: ${mallId}\n`);

  // user1 계정 보호
  if (mallId === 'user1' || mallId === '1') {
    throw new Error('user1 계정은 학습용/테스트용으로 보존되어야 합니다. 다른 ID를 사용하세요.');
  }

  // 이미 존재하는지 확인
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { mallUserId: mallId },
        { phone: mallId },
      ],
    },
  });

  if (existing) {
    throw new Error(`판매원 ID "${mallId}"는 이미 존재합니다.`);
  }

  // 새 사용자 생성
  const newUser = await prisma.user.create({
    data: {
      name: `판매원_${mallId}`,
      phone: null,
      email: null,
      password: 'qwe1', // 기본 비밀번호
      role: 'community',
      mallUserId: mallId,
      onboarded: false,
      loginCount: 0,
    },
  });

  console.log(`  ✅ 새 사용자 생성 완료 (ID: ${newUser.id})`);

  // AffiliateProfile 생성
  const newProfile = await prisma.affiliateProfile.create({
    data: {
      userId: newUser.id,
      affiliateCode: mallId,
      type: 'SALES_AGENT',
      displayName: `판매원_${mallId}`,
      status: 'ACTIVE',
    },
  });

  console.log(`  ✅ 판매원 프로필 생성 완료`);
  console.log(`✅ 새 판매원 계정 생성 완료!\n`);
  console.log(`📝 다음 단계:`);
  console.log(`  1. 새 판매원 계정에 로그인: /partner/${mallId}/dashboard`);
  console.log(`  2. 전화번호와 이메일을 수정하세요`);
  console.log(`  3. SMS API 설정을 개인 계정으로 등록하세요`);
  console.log(`  4. 비밀번호를 변경하세요\n`);

  return newUser.id;
}

async function main() {
  const options = parseArgs();

  try {
    console.log('🚀 판매원 계정 초기화 스크립트 시작...\n');

    let userId: number | undefined;

    // 계정 복제 또는 생성
    if (options.sourceMallId && options.newMallId) {
      // 복제 모드
      userId = await clonePartnerAccount(options.sourceMallId, options.newMallId);
    } else if (options.newMallId) {
      // 새 계정 생성 모드
      userId = await createNewPartnerAccount(options.newMallId);
    } else {
      console.error('❌ 오류: --new-mall-id 또는 --source-mall-id와 --new-mall-id를 함께 지정해야 합니다.');
      console.log('\n사용법:');
      console.log('  # 새 계정 생성:');
      console.log('  npx tsx scripts/initialize-partner-account.ts --new-mall-id <새ID> [--clean]');
      console.log('  # 계정 복제:');
      console.log('  npx tsx scripts/initialize-partner-account.ts --source-mall-id <소스ID> --new-mall-id <새ID> [--clean]');
      // @ts-ignore - process는 Node.js 전역 변수
      (globalThis as any).process?.exit(1);
    }

    // 테스트 데이터 삭제
    if (options.clean && userId) {
      await cleanupTestData(userId, options.keepSms);
    }

    console.log('✅ 모든 작업 완료!\n');
  } catch (error: any) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
    // @ts-ignore - process는 Node.js 전역 변수
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

