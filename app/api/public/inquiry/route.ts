export const dynamic = 'force-dynamic';

// app/api/public/inquiry/route.ts
// 구매 문의 API (로그인 불필요)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone, isValidPhone } from '@/lib/phone-utils';

/**
 * POST: 구매 문의 제출
 * 로그인 없이 접근 가능
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productCode, name, phone, passportNumber, message, isPhoneConsultation, actualName, actualPhone } = body;
    
    // 전화상담 신청인 경우 helpuser/helpphone으로 구분
    const isPhoneConsult = isPhoneConsultation === true || (name === 'helpuser' && phone === 'helpphone');
    const customerName = isPhoneConsult ? (actualName || name) : name;
    const customerPhone = isPhoneConsult ? (actualPhone || phone) : phone;

    // 필수 필드 검증 (passportNumber는 선택사항)
    if (!productCode || !customerName || !customerPhone) {
      return NextResponse.json(
        { ok: false, error: '필수 정보를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 전화번호 정규화 및 검증
    const normalizedPhone = normalizePhone(customerPhone);
    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      return NextResponse.json(
        { ok: false, error: '올바른 전화번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 24시간 내 중복 상담신청 체크 (스팸 방지)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentInquiry = await prisma.productInquiry.findFirst({
      where: {
        phone: normalizedPhone,
        productCode,
        createdAt: { gte: oneDayAgo }
      },
      select: { id: true, createdAt: true }
    });

    if (recentInquiry) {
      return NextResponse.json(
        {
          ok: false,
          error: '이미 24시간 이내에 동일한 상품에 대한 상담신청이 있습니다.',
          recentInquiryId: recentInquiry.id
        },
        { status: 409 }
      );
    }

    // 상품 존재 확인
    const product = await prisma.cruiseProduct.findUnique({
      where: { productCode },
      select: { id: true, packageName: true },
    });

    if (!product) {
      return NextResponse.json(
        { ok: false, error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 로그인된 사용자 ID 확인 (선택적)
    let userId: number | null = null;
    try {
      const { getSession } = await import('@/lib/session');
      const session = await getSession();
      if (session?.userId) {
        userId = parseInt(session.userId);
      }
    } catch (e) {
      // 세션 확인 실패해도 계속 진행 (비회원 문의 가능)
    }

    // 어필리에이트 코드 추적 (쿠키에서 읽기)
    const cookies = req.cookies;
    const affiliateCode = cookies.get('affiliate_code')?.value || null;
    const affiliateMallUserId = cookies.get('affiliate_mall_user_id')?.value || null;

    // 어필리에이트 프로필 찾기
    let managerId: number | null = null;
    let agentId: number | null = null;
    
    if (affiliateCode || affiliateMallUserId) {
      const profileWhere: any = {};
      if (affiliateCode) {
        profileWhere.affiliateCode = affiliateCode;
      } else if (affiliateMallUserId) {
        profileWhere.user = { mallUserId: affiliateMallUserId };
      }

      const affiliateProfile = await prisma.affiliateProfile.findFirst({
        where: {
          ...profileWhere,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          type: true,
          agentRelations: {
            where: { status: 'ACTIVE' },
            select: { managerId: true },
            take: 1,
          },
        },
      });

      if (affiliateProfile) {
        if (affiliateProfile.type === 'BRANCH_MANAGER') {
          managerId = affiliateProfile.id;
        } else if (affiliateProfile.type === 'SALES_AGENT') {
          agentId = affiliateProfile.id;
          // 판매원인 경우 대리점장 ID도 설정
          if (affiliateProfile.agentRelations.length > 0) {
            managerId = affiliateProfile.agentRelations[0].managerId;
          }
        }
      }
    }

    // ProductInquiry 테이블에 저장 (정규화된 전화번호 사용)
    const inquiry = await prisma.productInquiry.create({
      data: {
        productCode,
        userId,
        name: customerName,
        phone: normalizedPhone, // 정규화된 전화번호 저장
        passportNumber: passportNumber || null,
        message: message || null,
        status: 'pending'
      }
    });

    // 전화번호로 User 찾기 (CustomerNoteModal을 위해 필요)
    let userForLead: { id: number } | null = null;
    if (normalizedPhone) {
      userForLead = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
        select: { id: true },
      });
      
      // User가 없으면 생성 (고객 기록을 위해 필요)
      // 절대법칙: 크루즈몰 전화상담 버튼으로 이름과 연락처를 입력한 고객은 잠재고객(prospect)으로 저장
      if (!userForLead) {
        try {
          const newUser = await prisma.user.create({
            data: {
              name: customerName || null,
              phone: normalizedPhone,
              email: null,
              password: '1101', // 기본 비밀번호
              role: 'user',
              customerSource: isPhoneConsult ? 'phone-consultation' : 'product-inquiry', // 전화상담 신청은 phone-consultation으로 구분
              customerStatus: 'active',
              // 절대법칙: customerType을 prospect로 설정 (전화상담고객은 잠재고객)
              // customerType은 DB 스키마에 직접 필드가 없을 수 있으므로, customerSource로 구분
            },
            select: { id: true },
          });
          userForLead = newUser;
          console.log('[Public Inquiry API] User 생성 완료 (잠재고객):', newUser.id, isPhoneConsult ? '(전화상담)' : '(전화상담)');
        } catch (userError) {
          console.error('[Public Inquiry API] User 생성 실패:', userError);
          // User 생성 실패해도 계속 진행
        }
      } else {
        // 기존 User가 있는 경우에도 customerSource 업데이트 (전화상담으로 유입된 것으로 기록)
        try {
          await prisma.user.update({
            where: { id: userForLead.id },
            data: {
              customerSource: isPhoneConsult ? 'phone-consultation' : 'product-inquiry',
            },
          });
          console.log('[Public Inquiry API] 기존 User customerSource 업데이트 완료:', userForLead.id, isPhoneConsult ? '(전화상담)' : '(전화상담)');
        } catch (updateError) {
          console.error('[Public Inquiry API] User 업데이트 실패:', updateError);
          // 업데이트 실패해도 계속 진행
        }
      }
    }

    // AffiliateLead 생성 (어필리에이트 코드가 있는 경우)
    if (managerId || agentId) {
      try {
        await prisma.affiliateLead.create({
          data: {
            managerId: managerId || null,
            agentId: agentId || null,
            customerName: customerName,
            customerPhone: normalizedPhone, // 정규화된 전화번호 저장
            status: 'NEW',
            source: isPhoneConsult ? 'phone-consultation' : (affiliateMallUserId ? `mall-${affiliateMallUserId}` : 'product-inquiry'),
            metadata: {
              productCode,
              inquiryId: inquiry.id,
              affiliateCode,
              affiliateMallUserId,
              mallUserId: affiliateMallUserId, // 개인몰 ID 저장
              userId: userForLead?.id || null, // User ID 저장 (고객 기록용)
              isPhoneConsultation: isPhoneConsult, // 전화상담 신청 플래그
              actualName: customerName, // 실제 이름 저장
              actualPhone: customerPhone, // 실제 연락처 저장
            },
          },
        });
        console.log('[Public Inquiry API] AffiliateLead 생성 완료:', { managerId, agentId, customerName: customerName, userId: userForLead?.id, isPhoneConsult });
      } catch (leadError) {
        console.error('[Public Inquiry API] AffiliateLead 생성 실패:', leadError);
        // AffiliateLead 생성 실패해도 문의는 정상 처리
      }
    }

    // TODO: 관리자에게 알림 전송 (이메일, SMS, 푸시 알림 등)

    return NextResponse.json({
      ok: true,
      message: '문의가 접수되었습니다. 곧 연락드리겠습니다.',
      inquiryId: inquiry.id,
    });
  } catch (error) {
    console.error('[Public Inquiry API] POST error:', error);
    return NextResponse.json(
      { ok: false, error: '문의 접수 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
