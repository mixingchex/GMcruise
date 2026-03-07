import { NextResponse } from 'next/server';

// ⬇️ 절대법칙: Prisma 사용 API는 반드시 nodejs runtime과 force-dynamic 필요
export const runtime = 'nodejs';        // Edge Runtime 금지 (Prisma 사용)
export const dynamic = 'force-dynamic'; // 동적 데이터는 캐시 X

import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

import { getSession } from '@/lib/session';

export async function GET(req: Request) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(String(session.userId), 10);
    if (isNaN(userId)) {
        return NextResponse.json({ ok: false, error: 'Invalid User ID' }, { status: 400 });
    }

    logger.debug('[My Contract API] Fetching contract', { userId });

    // 세션 사용자 정보 가져오기 (phone, mallUserId 확인용)
    const sessionUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, mallUserId: true }
    });

    logger.debug('[My Contract API] Session user', { userId: sessionUser?.id });

    // userId로 먼저 조회 (완료/승인된 계약서)
    let contract = await prisma.affiliateContract.findFirst({
      where: { 
        userId,
        status: { in: ['completed', 'approved'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        User_AffiliateContract_userIdToUser: {
          select: { name: true, email: true, phone: true }
        }
      }
    });

    logger.debug('[My Contract API] Completed/approved contract found by userId:');

    // userId로 조회되지 않았고, phone이나 mallUserId가 있으면 그것으로도 조회
    if (!contract && sessionUser?.phone) {
      // phone으로 사용자 찾기
      const userByPhone = await prisma.user.findFirst({
        where: { phone: sessionUser.phone },
        select: { id: true }
      });

      if (userByPhone && userByPhone.id !== userId) {
        logger.debug('[My Contract API] Found different user by phone:');
        
        contract = await prisma.affiliateContract.findFirst({
          where: { 
            userId: userByPhone.id,
            status: { in: ['completed', 'approved'] }
          },
          orderBy: { createdAt: 'desc' },
          include: {
            User_AffiliateContract_userIdToUser: {
              select: { name: true, email: true, phone: true }
            }
          }
        });

        logger.debug('[My Contract API] Completed/approved contract found by phone user:');
      }

      // phone으로 직접 계약서 조회 (수동 입력 계약서의 경우)
      if (!contract) {
        contract = await prisma.affiliateContract.findFirst({
          where: { 
            phone: sessionUser.phone,
            status: { in: ['completed', 'approved'] }
          },
          orderBy: { createdAt: 'desc' },
          include: {
            User_AffiliateContract_userIdToUser: {
              select: { name: true, email: true, phone: true }
            }
          }
        });

        logger.debug('[My Contract API] Completed/approved contract found by phone field:');
      }
    }

    // 완료/승인된 계약서가 없으면 다른 상태의 계약서도 조회
    let fallbackContract = contract || await prisma.affiliateContract.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        User_AffiliateContract_userIdToUser: {
          select: { name: true, email: true, phone: true }
        }
      }
    });

    // fallback: 계약서 phone 필드로 직접 조회 (본인 phone과 일치하는 계약서만)
    // ⚠️ IDOR 방어: 다른 userId 경유 조회 제거 — sessionUser 본인의 phone 기준으로만 조회
    if (!fallbackContract && sessionUser?.phone) {
      fallbackContract = await prisma.affiliateContract.findFirst({
        where: { phone: sessionUser.phone },
        orderBy: { createdAt: 'desc' },
        include: {
          User_AffiliateContract_userIdToUser: {
            select: { name: true, email: true, phone: true }
          }
        }
      });
    }

    // Prisma 관계 필드명을 프론트엔드 형식으로 변환
    // ⚠️ PII 보호: residentId, bankAccount, bankName, idCardPath, bankbookPath 제외
    // 파트너 본인도 API 응답으로 주민등록번호/계좌번호를 수신할 필요 없음
    const formattedContract = fallbackContract ? {
      id: fallbackContract.id,
      status: fallbackContract.status,
      contractType: (fallbackContract as any).contractType ?? null,
      signedAt: (fallbackContract as any).signedAt ?? null,
      createdAt: fallbackContract.createdAt,
      updatedAt: fallbackContract.updatedAt,
      user: fallbackContract.User_AffiliateContract_userIdToUser,
      pdfUrl: (fallbackContract.metadata as any)?.pdfUrl || null,
    } : null;

    return NextResponse.json({ 
      ok: true, 
      contract: formattedContract
    });
  } catch (error: unknown) {
    logger.error('[My Contract API] Error:', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ 
        ok: false,
        error: '계약서 조회 중 오류가 발생했습니다.',
    }, { status: 500 });
  }
}
