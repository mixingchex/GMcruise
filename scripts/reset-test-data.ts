import prisma from '../lib/prisma';
import { randomBytes } from 'crypto';

/**
 * 테스트 데이터 리셋 및 테스트 계정 생성
 * - 모든 AffiliateContract 삭제
 * - 모든 AffiliateProfile 삭제
 * - 판매원 user1 생성
 * - 대리점장 boss1 생성
 */

async function generateAffiliateCode(name: string, id: number) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12);
  const suffix = randomBytes(2).toString('hex');
  return `AFF-${slug || 'partner'}-${suffix}-${id}`.toUpperCase();
}

async function main() {
  console.log('🧹 테스트 데이터 리셋 시작...\n');

  try {
    // 1. 모든 AffiliateContract 삭제
    console.log('1️⃣ AffiliateContract 삭제 중...');
    const deletedContracts = await prisma.affiliateContract.deleteMany({});
    console.log(`   ✅ ${deletedContracts.count}개 계약서 삭제 완료\n`);

    // 2. 모든 AffiliateProfile 삭제 (관련 데이터도 함께 삭제됨)
    console.log('2️⃣ AffiliateProfile 삭제 중...');
    const deletedProfiles = await prisma.affiliateProfile.deleteMany({});
    console.log(`   ✅ ${deletedProfiles.count}개 프로필 삭제 완료\n`);

    // 3. 기존 user1, boss1 찾기 및 업데이트/생성
    console.log('3️⃣ 테스트 계정 생성/업데이트 중...');
    // 파트너 계정은 비밀번호를 평문 '1101'로 저장 (파트너 로그인에서 평문 비교)
    
    // 4. 판매원 user1 생성 또는 업데이트
    console.log('4️⃣ 판매원 user1 생성/업데이트 중...');
    const existingUser1 = await prisma.user.findFirst({
      where: { phone: { startsWith: 'user1' } },
    });

    let salesAgentUser;
    if (existingUser1) {
      salesAgentUser = await prisma.user.update({
        where: { id: existingUser1.id },
        data: {
          phone: 'user1-테스트판매원',
          email: 'user1@test.local',
          name: '테스트 판매원',
          password: '1101', // 평문 비밀번호 (파트너 로그인용)
          role: 'community', // 파트너는 community role
          mallUserId: 'user1', // 로그인용 짧은 ID
          mallNickname: '테스트 판매원',
          onboarded: true,
        },
      });
      console.log(`   ✅ User 업데이트 완료 (ID: ${salesAgentUser.id}, phone: ${salesAgentUser.phone})`);
    } else {
      salesAgentUser = await prisma.user.create({
        data: {
          phone: 'user1-테스트판매원',
          email: 'user1@test.local',
          name: '테스트 판매원',
          password: '1101', // 평문 비밀번호 (파트너 로그인용)
          role: 'community', // 파트너는 community role
          mallUserId: 'user1', // 로그인용 짧은 ID
          mallNickname: '테스트 판매원',
          onboarded: true,
        },
      });
      console.log(`   ✅ User 생성 완료 (ID: ${salesAgentUser.id}, phone: ${salesAgentUser.phone})`);
    }

    // AffiliateProfile 생성 또는 업데이트
    const existingSalesAgentProfile = await prisma.affiliateProfile.findUnique({
      where: { userId: salesAgentUser.id },
    });

    let salesAgentProfile;
    if (existingSalesAgentProfile) {
      const salesAgentCode = await generateAffiliateCode('테스트판매원', salesAgentUser.id);
      salesAgentProfile = await prisma.affiliateProfile.update({
        where: { id: existingSalesAgentProfile.id },
        data: {
          affiliateCode: salesAgentCode,
          type: 'SALES_AGENT',
          status: 'ACTIVE',
          displayName: '테스트 판매원',
          nickname: '테스트 판매원',
          contactPhone: '010-0000-0001',
          contractStatus: 'SIGNED',
          contractSignedAt: new Date(),
          onboardedAt: new Date(),
          published: true,
          publishedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateProfile 업데이트 완료 (ID: ${salesAgentProfile.id}, Code: ${salesAgentCode})\n`);
    } else {
      const salesAgentCode = await generateAffiliateCode('테스트판매원', salesAgentUser.id);
      salesAgentProfile = await prisma.affiliateProfile.create({
        data: {
          userId: salesAgentUser.id,
          affiliateCode: salesAgentCode,
          type: 'SALES_AGENT',
          status: 'ACTIVE',
          displayName: '테스트 판매원',
          nickname: '테스트 판매원',
          contactPhone: '010-0000-0001',
          contractStatus: 'SIGNED',
          contractSignedAt: new Date(),
          onboardedAt: new Date(),
          published: true,
          publishedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateProfile 생성 완료 (ID: ${salesAgentProfile.id}, Code: ${salesAgentCode})\n`);
    }

    // 5. 대리점장 boss1 생성 또는 업데이트
    console.log('5️⃣ 대리점장 boss1 생성/업데이트 중...');
    const existingBoss1 = await prisma.user.findFirst({
      where: { phone: { startsWith: 'boss1' } },
    });

    let branchManagerUser;
    if (existingBoss1) {
      branchManagerUser = await prisma.user.update({
        where: { id: existingBoss1.id },
        data: {
          phone: 'boss1-테스트대리점장',
          email: 'boss1@test.local',
          name: '테스트 대리점장',
          password: '1101', // 평문 비밀번호 (파트너 로그인용)
          role: 'community', // 파트너는 community role
          mallUserId: 'boss1', // 로그인용 짧은 ID
          mallNickname: '테스트 대리점장',
          onboarded: true,
        },
      });
      console.log(`   ✅ User 업데이트 완료 (ID: ${branchManagerUser.id}, phone: ${branchManagerUser.phone})`);
    } else {
      branchManagerUser = await prisma.user.create({
        data: {
          phone: 'boss1-테스트대리점장',
          email: 'boss1@test.local',
          name: '테스트 대리점장',
          password: '1101', // 평문 비밀번호 (파트너 로그인용)
          role: 'community', // 파트너는 community role
          mallUserId: 'boss1', // 로그인용 짧은 ID
          mallNickname: '테스트 대리점장',
          onboarded: true,
        },
      });
      console.log(`   ✅ User 생성 완료 (ID: ${branchManagerUser.id}, phone: ${branchManagerUser.phone})`);
    }

    // AffiliateProfile 생성 또는 업데이트
    const existingBranchManagerProfile = await prisma.affiliateProfile.findUnique({
      where: { userId: branchManagerUser.id },
    });

    let branchManagerProfile;
    if (existingBranchManagerProfile) {
      const branchManagerCode = await generateAffiliateCode('테스트대리점장', branchManagerUser.id);
      branchManagerProfile = await prisma.affiliateProfile.update({
        where: { id: existingBranchManagerProfile.id },
        data: {
          affiliateCode: branchManagerCode,
          type: 'BRANCH_MANAGER',
          status: 'ACTIVE',
          displayName: '테스트 대리점장',
          nickname: '테스트 대리점장',
          contactPhone: '010-0000-0002',
          contractStatus: 'SIGNED',
          contractSignedAt: new Date(),
          onboardedAt: new Date(),
          published: true,
          publishedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateProfile 업데이트 완료 (ID: ${branchManagerProfile.id}, Code: ${branchManagerCode})\n`);
    } else {
      const branchManagerCode = await generateAffiliateCode('테스트대리점장', branchManagerUser.id);
      branchManagerProfile = await prisma.affiliateProfile.create({
        data: {
          userId: branchManagerUser.id,
          affiliateCode: branchManagerCode,
          type: 'BRANCH_MANAGER',
          status: 'ACTIVE',
          displayName: '테스트 대리점장',
          nickname: '테스트 대리점장',
          contactPhone: '010-0000-0002',
          contractStatus: 'SIGNED',
          contractSignedAt: new Date(),
          onboardedAt: new Date(),
          published: true,
          publishedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateProfile 생성 완료 (ID: ${branchManagerProfile.id}, Code: ${branchManagerCode})\n`);
    }

    console.log('✅ 테스트 데이터 리셋 완료!\n');
    console.log('📋 생성된 계정 정보:');
    console.log(`   판매원: user1-테스트판매원 / 비밀번호: 1101`);
    console.log(`   대리점장: boss1-테스트대리점장 / 비밀번호: 1101\n`);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ 스크립트 실행 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

