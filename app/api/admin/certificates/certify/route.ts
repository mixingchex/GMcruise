export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';
import { hashPassword, SYSTEM_PASSWORDS } from '@/lib/password';
import { recordCustomerJourney } from '@/lib/customer-journey';

async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  try {
    if (!sid) return false;

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { User: true },
    });

    if (!session || !session.User) return false;
    // [WO-SEC-08] 세션 만료 체크
    if (session.expiresAt && session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: sid } }).catch(() => {});
      return false;
    }
    return session.User.role === 'admin';
  } catch (error) {
    console.error('[Certify] Auth check error:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    
    if (!sid) {
      return NextResponse.json(
        { ok: false, error: '인증이 필요합니다.' },
        { status: 403 }
      );
    }

    const isAdmin = await checkAdminAuth(sid);
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    body = await req.json();
    const { customerId, type, customerName, birthDate, refundAmount, refundDate } = body;

    if (!customerId || !type || !customerName || !birthDate) {
      return NextResponse.json(
        { ok: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 환불인증완료인 경우 환불금액과 환불일자 검증
    if (type === 'refund') {
      if (!refundAmount || (typeof refundAmount === 'number' && refundAmount <= 0)) {
        return NextResponse.json(
          { ok: false, error: '환불금액을 입력해주세요.' },
          { status: 400 }
        );
      }
      if (!refundDate || (typeof refundDate === 'string' && refundDate.trim() === '')) {
        return NextResponse.json(
          { ok: false, error: '환불일자를 선택해주세요.' },
          { status: 400 }
        );
      }
    }

    // 고객 정보 조회
    const customer = await prisma.user.findUnique({
      where: { id: parseInt(customerId) },
      include: {
        UserTrip: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { ok: false, error: '고객을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (type === 'purchase') {
      // 관리자 ID 조회 (고객 그룹 생성용)
      const adminUser = await prisma.user.findFirst({
        where: { role: 'admin' },
        select: { id: true },
      });

      if (!adminUser) {
        return NextResponse.json(
          { ok: false, error: '관리자 계정을 찾을 수 없습니다.' },
          { status: 500 }
        );
      }

      // [WO-DB-03] 구매확인인증 핵심 DB 변경을 트랜잭션으로 묶기
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: customer.id },
          data: { customerStatus: 'purchase_confirmed' },
        });

        let purchaseGroup = await tx.customerGroup.findFirst({
          where: { adminId: adminUser.id, name: '구매고객' },
        });

        if (!purchaseGroup) {
          purchaseGroup = await tx.customerGroup.create({
            data: {
              adminId: adminUser.id,
              name: '구매고객',
              description: '구매확인인증 처리된 고객 그룹',
              color: '#10B981',
              updatedAt: new Date(),
            },
          });
        }

        await tx.customerGroupMember.upsert({
          where: { groupId_userId: { groupId: purchaseGroup.id, userId: customer.id } },
          create: { groupId: purchaseGroup.id, userId: customer.id, addedBy: adminUser.id },
          update: {},
        });
      });

      // 고객 여정 기록: 트랜잭션 외부 (실패 시 무시)
      try {
        await recordCustomerJourney(customer.id, 'purchase', 'certificate_issued', {
          triggerDescription: '구매확인인증서 발급',
          metadata: { customerName, birthDate },
        });
      } catch (journeyError) {
        console.warn('[Certify] Failed to record customer journey (purchase):', journeyError);
      }

      return NextResponse.json({
        ok: true,
        message: '구매확인인증이 완료되었습니다.',
        customerStatus: 'purchase_confirmed',
      });
    } else if (type === 'refund') {
      // 환불인증완료 처리
      // 1. 고객 상태 변경: 구매한 여행 해지
      // 2. 크루즈가이드 지니: 활성 → 이용정지 (비밀번호 8300으로 변경)
      // 3. APIS(여권정보): 그대로 유지
      // 4. 환불 횟수 누적 (metadata에 저장)
      // 5. 구매고객 → 일반고객 (customerStatus로 관리)

      // 비밀번호 해시 생성
      const hashedPassword = await hashPassword(SYSTEM_PASSWORDS.LOCKED);

      // 환불 횟수 조회 및 증가 (metadata에서 관리)
      // User 모델에 metadata 필드가 없을 수 있으므로, 일단 기본값 사용
      let metadata: any = {};
      try {
        // customer 객체에서 metadata 확인 (Prisma가 자동으로 파싱)
        if ((customer as any).metadata) {
          metadata = typeof (customer as any).metadata === 'string' 
            ? JSON.parse((customer as any).metadata) 
            : (customer as any).metadata;
        }
      } catch (e) {
        console.warn('[Certify] Failed to parse metadata, using empty object');
        metadata = {};
      }
      
      // 환불 횟수 (metadata 필드 추가 시 DB에 누적 저장 가능, 현재는 recordCustomerJourney에만 전달)
      const refundCount = ((metadata.refundCount as number) || 0) + 1;

      // 관리자 ID 조회 (고객 그룹 생성용)
      const adminUser = await prisma.user.findFirst({
        where: { role: 'admin' },
        select: { id: true },
      });

      if (!adminUser) {
        return NextResponse.json(
          { ok: false, error: '관리자 계정을 찾을 수 없습니다.' },
          { status: 500 }
        );
      }

      // [WO-DB-03] 환불인증 핵심 DB 변경을 트랜잭션으로 묶기
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: customer.id },
          data: { customerStatus: 'refunded', password: hashedPassword },
        });

        await tx.passwordEvent.create({
          data: {
            userId: customer.id,
            from: customer.password || '',
            to: hashedPassword,
            reason: '환불인증완료 - 크루즈가이드 지니 이용정지',
          },
        });

        if (customer.UserTrip && customer.UserTrip.length > 0) {
          const latestTrip = customer.UserTrip[0];
          await tx.userTrip.update({
            where: { id: latestTrip.id },
            data: { status: 'cancelled' },
          });
        }

        let refundGroup = await tx.customerGroup.findFirst({
          where: { adminId: adminUser.id, name: '환불고객' },
        });

        if (!refundGroup) {
          refundGroup = await tx.customerGroup.create({
            data: {
              adminId: adminUser.id,
              name: '환불고객',
              description: '환불인증완료 처리된 고객 그룹',
              color: '#EF4444',
              updatedAt: new Date(),
            },
          });
        }

        await tx.customerGroupMember.upsert({
          where: { groupId_userId: { groupId: refundGroup.id, userId: customer.id } },
          create: { groupId: refundGroup.id, userId: customer.id, addedBy: adminUser.id },
          update: {},
        });
      });

      // 고객 여정 기록: 트랜잭션 외부 (실패 시 무시)
      try {
        await recordCustomerJourney(customer.id, 'refund', 'refund_processed', {
          triggerDescription: '환불인증완료 처리',
          metadata: { refundCount, refundAmount: refundAmount || 0, refundDate },
        });
      } catch (journeyError: any) {
        console.warn('[Certify] Failed to record customer journey:', journeyError);
        // 고객 여정 기록 실패해도 계속 진행
      }

      return NextResponse.json({
        ok: true,
        message: '환불인증완료가 처리되었습니다.',
        customerStatus: 'refunded',
        refundCount: refundCount,
      });
    } else {
      return NextResponse.json(
        { ok: false, error: '잘못된 인증서 타입입니다.' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[Certify] Error:', error);
    console.error('[Certify] Error stack:', error?.stack);
    console.error('[Certify] Error message:', error?.message);
    if (body) {
      try {
        console.error('[Certify] Request body:', JSON.stringify(body, null, 2));
      } catch (e) {
        console.error('[Certify] Failed to stringify request body');
      }
    }
    
    // 더 자세한 에러 메시지 반환
    const errorMessage = error?.message || '인증 처리 중 오류가 발생했습니다.';
    return NextResponse.json(
      { 
        ok: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
