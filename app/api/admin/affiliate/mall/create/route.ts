export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { hashPassword, SYSTEM_PASSWORDS } from '@/lib/password';

// 관리자 권한 확인
function requireAdmin(role?: string | null) {
  if (role !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 });
  }
  return null;
}

// 파트너 아이디 생성 (user1, user2, boss1, boss2...)
async function generatePartnerId(type: 'BRANCH_MANAGER' | 'SALES_AGENT'): Promise<string> {
  const prefix = type === 'BRANCH_MANAGER' ? 'boss' : 'user';

  // 기존 phone 필드에서 같은 prefix 패턴 찾기
  const existingRecords = await prisma.user.findMany({
    where: {
      phone: {
        startsWith: prefix,
      },
    },
    select: { phone: true },
  });

  const used = new Set<number>();
  for (const record of existingRecords) {
    const match = record.phone?.match(new RegExp(`^${prefix}(\\d{1,5})(?:-.*)?$`, 'i'));
    if (match) {
      used.add(parseInt(match[1], 10));
    }
  }

  // 사용 가능한 번호 찾기
  for (let i = 1; i <= 99999; i += 1) {
    if (!used.has(i)) {
      return `${prefix}${i}`;
    }
  }

  throw new Error('사용 가능한 파트너 ID가 없습니다.');
}

// 어필리에이트 코드 생성
function generateAffiliateCode(name: string, id: number): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 12);
  const suffix = randomBytes(2).toString('hex');
  return `AFF-${slug || 'partner'}-${suffix}-${id}`.toUpperCase();
}

/**
 * POST: 판매몰 생성
 * 새로운 User + AffiliateProfile 생성
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { role: true } });
    const guard = requireAdmin(admin?.role);
    if (guard) return guard;

    const body = await req.json();
    const { userId, name, phone, email, type, branchLabel, managerProfileId } = body;

    // 필수 필드 검증
    if (!name || !phone) {
      return NextResponse.json({ ok: false, message: '이름과 연락처는 필수입니다.' }, { status: 400 });
    }

    const partnerType = type || 'BRANCH_MANAGER';

    // 파트너 아이디 생성
    const partnerId = await generatePartnerId(partnerType);
    const hashedPw = await hashPassword(SYSTEM_PASSWORDS.TRIAL);

    let user;
    let profile;

    // 트랜잭션으로 User + AffiliateProfile 생성
    const result = await prisma.$transaction(async (tx) => {
      // 1. User 생성 또는 업데이트
      if (userId) {
        // 기존 사용자 업데이트
        user = await tx.user.update({
          where: { id: userId },
          data: {
            mallUserId: partnerId,
            phone: partnerId, // phone 필드를 파트너 ID로 사용
          },
        });
      } else {
        // 새 사용자 생성
        user = await tx.user.create({
          data: {
            name,
            phone: partnerId, // phone 필드를 파트너 ID로 사용
            email: email || null,
            mallUserId: partnerId,
            password: hashedPw,
            role: 'community',
          },
        });
      }

      // 2. AffiliateProfile 생성
      const affiliateCode = generateAffiliateCode(name, user.id);

      profile = await tx.affiliateProfile.create({
        data: {
          userId: user.id,
          type: partnerType,
          status: 'ACTIVE',
          displayName: name,
          nickname: name,
          contactPhone: phone,
          contactEmail: email || null,
          affiliateCode,
          landingSlug: partnerId,
          branchLabel: branchLabel || null,
          published: true,
          contractStatus: 'SIGNED',
          metadata: {
            createdBy: sessionUser.id,
            createdAt: new Date().toISOString(),
            createdVia: 'mall-create-api',
          },
        },
      });

      // 3. 판매원인 경우 대리점장 관계 설정
      if (partnerType === 'SALES_AGENT' && managerProfileId) {
        await tx.affiliateRelation.create({
          data: {
            managerId: managerProfileId,
            agentId: profile.id,
            status: 'ACTIVE',
          },
        });
      }

      // 4. 자동 링크 생성 (모든 활성 상품에 대해)
      const activeProducts = await tx.affiliateProduct.findMany({
        where: {
          status: 'active',
          isPublished: true,
        },
        select: { id: true, name: true },
      });

      for (const product of activeProducts) {
        const timestamp = Date.now();
        const randomId = randomBytes(3).toString('hex');
        const linkCode = `LINK-${timestamp}-${randomId}`.toUpperCase();

        await tx.affiliateLink.create({
          data: {
            code: linkCode,
            productId: product.id,
            title: `${name} - ${product.name}`,
            ...(partnerType === 'BRANCH_MANAGER'
              ? { managerId: profile.id }
              : { agentId: profile.id }),
            issuedById: sessionUser.id,
            status: 'ACTIVE',
          },
        });
      }

      return { user, profile, linksCreated: activeProducts.length };
    });

    const mallUrl = `/${result.user.mallUserId}/shop`;
    const dashboardUrl = `/${result.user.mallUserId}/dashboard`;

    console.log('[Mall Create] 판매몰 생성 완료:', {
      userId: result.user.id,
      profileId: result.profile.id,
      partnerId,
      mallUrl,
      linksCreated: result.linksCreated,
    });

    return NextResponse.json({
      ok: true,
      message: '판매몰이 성공적으로 생성되었습니다.',
      user: {
        id: result.user.id,
        mallUserId: result.user.mallUserId,
      },
      profile: {
        id: result.profile.id,
        affiliateCode: result.profile.affiliateCode,
        type: result.profile.type,
      },
      mallUrl,
      dashboardUrl,
      linksCreated: result.linksCreated,
    });
  } catch (error: any) {
    console.error('[Mall Create] 오류:', error);
    return NextResponse.json(
      { ok: false, message: error.message || '판매몰 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
