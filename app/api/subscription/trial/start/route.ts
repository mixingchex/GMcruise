export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// OPTIONS 핸들러 (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// GET 핸들러 (API 상태 확인)
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Subscription Trial Start API is running',
    methods: ['GET', 'POST', 'OPTIONS'],
  });
}

export async function POST(req: NextRequest) {
  try {
    // Lazy import to avoid module loading issues in production
    const prisma = (await import('@/lib/prisma')).default;
    const { name, phone, partnerId, source } = await req.json();

    if (!name || !phone) {
      return NextResponse.json(
        { ok: false, error: '이름과 연락처를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 연락처 정규화 (숫자만 추출)
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { ok: false, error: '올바른 연락처를 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log('[Subscription Trial] 3일 무료 체험 시작:', { name, phone: normalizedPhone, partnerId });

    // 3일 체험 정보 생성
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 3);

    // DB에 AffiliateLead로 저장 (중복 허용 - 매번 새 리드 생성)
    try {
      const createData: any = {
        customerName: name,
        customerPhone: normalizedPhone,
        status: 'NEW',
        source: source || 'B2B_LANDING',
        metadata: {
          trialStartedAt: now.toISOString(),
          trialExpiresAt: trialEndDate.toISOString(),
        },
        updatedAt: new Date(),
      };

      // 파트너 이름 결정 (스프레드시트 백업용)
      let partnerName = '본사';
      let finalSource = 'B2B_LANDING_ADMIN';

      // 파트너 할당 로직
      if (partnerId) {
        // 1. Admin Phone Numbers Check
        if (partnerId === '01024958013' || partnerId === '01038609161') {
          console.log('[Subscription Trial] Admin Partner ID detected:', partnerId);
          createData.managerId = null;
          createData.agentId = null;
          createData.source = 'B2B_LANDING_ADMIN';
          finalSource = 'B2B_LANDING_ADMIN';
          partnerName = '본사';
        } else {
          // 2. Regular Partner Assignment
          const partnerIdNum = Number(partnerId);
          const whereClause: any = { status: 'ACTIVE' };

          if (!isNaN(partnerIdNum)) {
            whereClause.id = partnerIdNum;
          } else {
            whereClause.OR = [
              { affiliateCode: partnerId },
              { landingSlug: partnerId },
              { User: { phone: partnerId } }
            ];
          }

          const partner = await prisma.affiliateProfile.findFirst({
            where: whereClause,
            select: { id: true, type: true, displayName: true, userId: true }
          });

          if (partner) {
            if (partner.type === 'BRANCH_MANAGER') {
              createData.managerId = partner.id;
            } else if (partner.type === 'SALES_AGENT') {
              createData.agentId = partner.id;
              const relation = await prisma.affiliateRelation.findFirst({
                where: { agentId: partner.id, status: 'ACTIVE' },
                select: { managerId: true }
              });
              if (relation) {
                createData.managerId = relation.managerId;
              }
            }
            createData.source = 'B2B_LANDING';
            finalSource = 'B2B_LANDING';

            // 파트너 이름 조회 (계약서 실명 우선)
            const contract = await prisma.affiliateContract.findFirst({
              where: { userId: partner.userId, status: 'approved' },
              select: { name: true },
            });
            partnerName = contract?.name || partner.displayName || '파트너';
          }
        }
      }

      // 새 리드 생성 (중복 허용)
      const newLead = await prisma.affiliateLead.create({
        data: createData
      });
      console.log('[Subscription Trial] 신규 리드 생성 완료:', newLead.id);

      // Google 스프레드시트에 B2B 잠재고객 백업 (비동기, 선택적)
      const createdAtStr = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

      // googleapis 모듈이 없을 수 있으므로 try-catch로 안전하게 처리
      try {
        const { appendB2BLeadToSheet } = await import('@/lib/google/b2b-backup');
        appendB2BLeadToSheet({
          name,
          phone: normalizedPhone,
          partnerName,
          source: finalSource,
          createdAt: createdAtStr,
          notes: '3일 무료 체험 시작',
        }).catch(err => {
          console.error('[Subscription Trial] 스프레드시트 백업 실패:', err);
        });
      } catch (sheetErr) {
        console.warn('[Subscription Trial] 스프레드시트 모듈 로드 실패 (무시됨):', sheetErr);
      }

    } catch (dbError) {
      console.error('[Subscription Trial] DB 저장 실패:', dbError);
      // DB 저장 실패해도 클라이언트 체험은 시작되도록 진행
    }

    const trialSession = {
      name,
      phone: normalizedPhone,
      startedAt: now.toISOString(),
      expiresAt: trialEndDate.toISOString(),
      trialId: `trial_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    console.log('[Subscription Trial] 체험 세션 생성:', trialSession);

    return NextResponse.json({
      ok: true,
      trial: trialSession,
      message: '3일 무료 체험이 시작되었습니다!',
      redirectUrl: '/trial/dashboard',
    });
  } catch (error: any) {
    console.error('[Subscription Trial] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || '무료 체험 시작에 실패했습니다.' },
      { status: 500 }
    );
  }
}
