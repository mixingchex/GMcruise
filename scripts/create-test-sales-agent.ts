import prisma from '../lib/prisma';
import { hashPassword } from '../lib/crypto';
// @ts-expect-error - crypto는 Node.js 환경에서 사용 가능
import { randomBytes } from 'crypto';

/**
 * 테스트용 판매원 계정 생성
 * - 전화번호: 01024958013
 * - 비밀번호: 0000
 * - 판매원 프로필 및 계약 생성
 * - 대리점장과 연결
 * - 샘플 고객 DB 및 판매 기록 생성
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
  console.log('🚀 테스트용 판매원 계정 생성 시작...\n');

  try {
    const phone = '01024958013';
    const password = '0000';
    const name = '테스트판매원';

    // 1. User 생성 또는 업데이트
    console.log('1️⃣ User 생성/업데이트 중...');
    let user = await prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      const hashedPassword = await hashPassword(password);
      user = await prisma.user.create({
        data: {
          phone,
          password: hashedPassword,
          name,
          email: `test-sales-agent-${Date.now()}@test.local`,
          role: 'community',
          onboarded: true,
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ User 생성 완료 (ID: ${user.id}, 이름: ${user.name}, 전화번호: ${user.phone})`);
    } else {
      const hashedPassword = await hashPassword(password);
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          password: hashedPassword,
          role: 'community',
          onboarded: true,
        },
      });
      console.log(`   ✅ User 업데이트 완료 (ID: ${user.id}, 이름: ${user.name}, 전화번호: ${user.phone})`);
    }

    // 2. AffiliateProfile 생성 또는 업데이트
    console.log('\n2️⃣ AffiliateProfile 생성/업데이트 중...');
    let profile = await prisma.affiliateProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      const affiliateCode = await generateAffiliateCode(name, user.id);
      profile = await prisma.affiliateProfile.create({
        data: {
          userId: user.id,
          affiliateCode,
          type: 'SALES_AGENT',
          status: 'ACTIVE',
          displayName: name,
          nickname: name,
          contactPhone: phone,
          contactEmail: user.email || `test-sales-agent-${user.id}@test.local`,
          contractStatus: 'SIGNED',
          contractSignedAt: new Date(),
          onboardedAt: new Date(),
          published: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateProfile 생성 완료 (ID: ${profile.id}, Code: ${affiliateCode})`);
    } else {
      const affiliateCode = await generateAffiliateCode(name, user.id);
      profile = await prisma.affiliateProfile.update({
        where: { id: profile.id },
        data: {
          affiliateCode,
          displayName: name,
          nickname: name,
          status: 'ACTIVE',
          contractStatus: 'SIGNED',
        },
      });
      console.log(`   ✅ AffiliateProfile 업데이트 완료 (ID: ${profile.id}, Code: ${affiliateCode})`);
    }

    // 3. 대리점장 찾기 또는 생성
    console.log('\n3️⃣ 대리점장 찾기/생성 중...');
    let branchManager = await prisma.affiliateProfile.findFirst({
      where: {
        type: 'BRANCH_MANAGER',
        status: 'ACTIVE',
      },
      include: {
        User: {
          select: { id: true },
        },
      },
    });

    if (!branchManager) {
      // 대리점장이 없으면 생성
      console.log('   ⚠️  대리점장이 없어서 생성합니다...');
      const managerName = '테스트대리점장';
      const managerPhone = '01000000000';
      const managerPassword = '0000';

      let managerUser = await prisma.user.findFirst({
        where: { phone: managerPhone },
      });

      if (!managerUser) {
        const hashedManagerPassword = await hashPassword(managerPassword);
        managerUser = await prisma.user.create({
          data: {
            phone: managerPhone,
            password: hashedManagerPassword,
            name: managerName,
            email: `test-branch-manager-${Date.now()}@test.local`,
            role: 'community',
            onboarded: true,
            updatedAt: new Date(),
          },
        });
      }

      const managerCode = await generateAffiliateCode(managerName, managerUser.id);
      branchManager = await prisma.affiliateProfile.create({
        data: {
          userId: managerUser.id,
          affiliateCode: managerCode,
          type: 'BRANCH_MANAGER',
          status: 'ACTIVE',
          displayName: managerName,
          nickname: managerName,
          contactPhone: managerPhone,
          contactEmail: managerUser.email || `test-branch-manager-${managerUser.id}@test.local`,
          branchLabel: '테스트지점',
          contractStatus: 'SIGNED',
          contractSignedAt: new Date(),
          onboardedAt: new Date(),
          published: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ 대리점장 생성 완료 (ID: ${branchManager.id}, Code: ${managerCode})`);
    } else {
      console.log(`   ✅ 기존 대리점장 사용 (ID: ${branchManager.id}, 이름: ${branchManager.displayName})`);
    }

    // 4. AffiliateContract 생성 또는 업데이트
    console.log('\n4️⃣ AffiliateContract 생성/업데이트 중...');
    const now = new Date();

    let contract = await prisma.affiliateContract.findFirst({
      where: {
        userId: user.id,
        status: { in: ['approved', 'completed'] },
      },
    });

    if (!contract) {
      contract = await prisma.affiliateContract.create({
        data: {
          userId: user.id,
          name: `${name} 계약`,
          residentId: '123456-1234567',
          phone: phone,
          email: user.email || `test-sales-agent-${user.id}@test.local`,
          address: '서울시 강남구 테스트동 123-45',
          consentPrivacy: true,
          consentNonCompete: true,
          consentDbUse: true,
          consentPenalty: true,
          status: 'approved',
          reviewedAt: new Date(),
          reviewerId: branchManager.User.id,
          contractSignedAt: new Date(),
          invitedByProfileId: branchManager.id,
          updatedAt: new Date(),
          metadata: {
            isTest: true,
            createdBy: 'test-script',
            startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
            endDate: new Date(now.getFullYear() + 1, now.getMonth(), 0).toISOString(),
          },
        },
      });
      console.log(`   ✅ AffiliateContract 생성 완료 (ID: ${contract.id}, 상태: ${contract.status})`);
    } else {
      contract = await prisma.affiliateContract.update({
        where: { id: contract.id },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
          contractSignedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateContract 업데이트 완료 (ID: ${contract.id}, 상태: ${contract.status})`);
    }

    // 5. AffiliateRelation 생성 또는 업데이트
    console.log('\n5️⃣ AffiliateRelation 생성/업데이트 중...');
    let relation = await prisma.affiliateRelation.findUnique({
      where: {
        managerId_agentId: {
          managerId: branchManager.id,
          agentId: profile.id,
        },
      },
    });

    if (!relation) {
      relation = await prisma.affiliateRelation.create({
        data: {
          managerId: branchManager.id,
          agentId: profile.id,
          status: 'ACTIVE',
          connectedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateRelation 생성 완료 (ID: ${relation.id})`);
    } else {
      relation = await prisma.affiliateRelation.update({
        where: { id: relation.id },
        data: {
          status: 'ACTIVE',
          connectedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateRelation 업데이트 완료 (ID: ${relation.id})`);
    }

    // 6. AffiliateLink 생성 또는 찾기
    console.log('\n6️⃣ AffiliateLink 생성/확인 중...');
    let link = await prisma.affiliateLink.findFirst({
      where: {
        agentId: profile.id,
        status: 'ACTIVE',
      },
    });

    if (!link) {
      const linkCode = `link-${profile.affiliateCode}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      link = await prisma.affiliateLink.create({
        data: {
          code: linkCode,
          title: '기본 링크',
          agentId: profile.id,
          managerId: branchManager.id,
          status: 'ACTIVE',
          issuedById: branchManager.User.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`   ✅ AffiliateLink 생성 완료 (ID: ${link.id}, Code: ${link.code})`);
    } else {
      console.log(`   ✅ 기존 AffiliateLink 사용 (ID: ${link.id}, Code: ${link.code})`);
    }

    // 7. 샘플 고객 DB 및 판매 기록 생성
    console.log('\n7️⃣ 샘플 고객 DB 및 판매 기록 생성 중...');
    const sampleNames = ['김철수', '이영희', '박민수', '최지영', '정수진', '한소영', '윤동현', '강미영'];
    const samplePhones = [
      '01011111111', '01022222222', '01033333333', '01044444444',
      '01055555555', '01066666666', '01077777777', '01088888888',
    ];

    let createdLeads = 0;
    let createdSales = 0;

    for (let i = 0; i < sampleNames.length; i++) {
      const customerName = sampleNames[i];
      const customerPhone = samplePhones[i];
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // Lead 생성 또는 업데이트
      let lead = await prisma.affiliateLead.findFirst({
        where: { customerPhone },
      });

      const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];
      const leadStatus = leadStatuses[Math.floor(Math.random() * leadStatuses.length)];

      if (!lead) {
        lead = await prisma.affiliateLead.create({
          data: {
            linkId: link.id,
            customerName,
            customerPhone,
            status: leadStatus,
            source: 'test',
            managerId: branchManager.id,
            agentId: profile.id,
            createdAt,
            updatedAt: createdAt,
            metadata: {
              isTest: true,
              createdBy: 'test-script',
            },
          },
        });
        createdLeads++;
      } else {
        lead = await prisma.affiliateLead.update({
          where: { id: lead.id },
          data: {
            customerName,
            status: leadStatus,
            managerId: branchManager.id,
            agentId: profile.id,
            updatedAt: new Date(),
          },
        });
      }

      // 일부 리드는 판매로 전환 (50% 확률)
      if (leadStatus === 'CONVERTED' || Math.random() > 0.5) {
        const saleAmount = Math.floor(Math.random() * 2000000) + 3000000; // 300만~500만
        const costAmount = Math.floor(saleAmount * 0.7);
        const netRevenue = saleAmount - costAmount;
        const branchCommission = Math.floor(netRevenue * 0.1);
        const salesCommission = Math.floor(netRevenue * 0.05);
        const withholdingAmount = Math.floor(salesCommission * 0.033);

        const saleStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
        const saleStatus = saleStatuses[Math.floor(Math.random() * saleStatuses.length)];

        const productCodes = ['CRUISE-2025-001', 'CRUISE-2025-002', 'CRUISE-2025-003'];
        const productCode = productCodes[Math.floor(Math.random() * productCodes.length)];

        let sale = await prisma.affiliateSale.findFirst({
          where: { leadId: lead.id },
        });

        if (!sale) {
          sale = await prisma.affiliateSale.create({
            data: {
              linkId: link.id,
              leadId: lead.id,
              productCode,
              cabinType: ['인테리어', '오션뷰', '발코니', '스위트'][Math.floor(Math.random() * 4)],
              fareCategory: ['일반', '프리미엄', 'VIP'][Math.floor(Math.random() * 3)],
              headcount: Math.floor(Math.random() * 3) + 1,
              saleAmount,
              costAmount,
              netRevenue,
              branchCommission,
              salesCommission,
              withholdingAmount,
              status: saleStatus,
              saleDate: new Date(createdAt.getTime() + Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
              managerId: branchManager.id,
              agentId: profile.id,
              createdAt,
              updatedAt: createdAt,
              metadata: {
                isTest: true,
                createdBy: 'test-script',
                commissionProcessed: false,
              },
            },
          });
          createdSales++;
        } else {
          await prisma.affiliateSale.update({
            where: { id: sale.id },
            data: {
              managerId: branchManager.id,
              agentId: profile.id,
              saleAmount,
              costAmount,
              netRevenue,
              branchCommission,
              salesCommission,
              withholdingAmount,
              status: saleStatus,
              updatedAt: new Date(),
            },
          });
        }
      }
    }

    console.log(`   ✅ ${createdLeads}개의 AffiliateLead 생성/업데이트 완료`);
    console.log(`   ✅ ${createdSales}개의 AffiliateSale 생성/업데이트 완료`);

    console.log('\n✅ 테스트용 판매원 계정 생성 완료!\n');
    console.log('📋 생성된 데이터 요약:');
    console.log(`   판매원: ${name} (${phone})`);
    console.log(`   프로필 ID: ${profile.id}`);
    console.log(`   계약 ID: ${contract.id}`);
    console.log(`   대리점장: ${branchManager.displayName} (ID: ${branchManager.id})`);
    console.log(`   고객(Leads): ${createdLeads}개`);
    console.log(`   판매(Sales): ${createdSales}개\n`);
    console.log('🔑 로그인 정보:');
    console.log(`   전화번호: ${phone}`);
    console.log(`   비밀번호: ${password}\n`);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ 스크립트 실행 실패:', e);
    // @ts-ignore - process는 Node.js 환경에서 사용 가능
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

