import { NextResponse } from 'next/server';

// ⬇️ 절대법칙: Prisma 사용 API는 반드시 nodejs runtime과 force-dynamic 필요
export const runtime = 'nodejs';        // Edge Runtime 금지 (Prisma 사용)
export const dynamic = 'force-dynamic'; // 동적 데이터는 캐시 X

import prisma from '@/lib/prisma';

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

    console.log('[My Contract API] Fetching contract for userId:', userId);

    // 세션 사용자 정보 가져오기 (phone, mallUserId 확인용)
    const sessionUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, mallUserId: true }
    });

    console.log('[My Contract API] Session user:', { id: sessionUser?.id, phone: sessionUser?.phone, mallUserId: sessionUser?.mallUserId });

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

    console.log('[My Contract API] Completed/approved contract found by userId:', contract ? { id: contract.id, status: contract.status } : 'null');

    // userId로 조회되지 않았고, phone이나 mallUserId가 있으면 그것으로도 조회
    if (!contract && sessionUser?.phone) {
      // phone으로 사용자 찾기
      const userByPhone = await prisma.user.findFirst({
        where: { phone: sessionUser.phone },
        select: { id: true }
      });

      if (userByPhone && userByPhone.id !== userId) {
        console.log('[My Contract API] Found different user by phone:', { userId: userByPhone.id, phone: sessionUser.phone });
        
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

        console.log('[My Contract API] Completed/approved contract found by phone user:', contract ? { id: contract.id, status: contract.status } : 'null');
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

        console.log('[My Contract API] Completed/approved contract found by phone field:', contract ? { id: contract.id, status: contract.status } : 'null');
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

    // fallback도 없으면 phone으로 조회
    if (!fallbackContract && sessionUser?.phone) {
      // phone으로 사용자 찾기
      const userByPhone = await prisma.user.findFirst({
        where: { phone: sessionUser.phone },
        select: { id: true }
      });

      if (userByPhone && userByPhone.id !== userId) {
        fallbackContract = await prisma.affiliateContract.findFirst({
          where: { userId: userByPhone.id },
          orderBy: { createdAt: 'desc' },
          include: {
            User_AffiliateContract_userIdToUser: {
              select: { name: true, email: true, phone: true }
            }
          }
        });
      }

      // phone으로 직접 계약서 조회
      if (!fallbackContract) {
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
    }

    console.log('[My Contract API] Fallback contract found:', fallbackContract ? { id: fallbackContract.id, status: fallbackContract.status } : 'null');

    // 모든 상태의 계약서 개수 확인 (디버깅용)
    const allContractsCount = await prisma.affiliateContract.count({
      where: { userId }
    });
    console.log('[My Contract API] Total contracts for userId', userId, ':', allContractsCount);
    
    // phone으로도 개수 확인
    if (sessionUser?.phone) {
      const contractsByPhone = await prisma.affiliateContract.count({
        where: { phone: sessionUser.phone }
      });
      console.log('[My Contract API] Total contracts for phone', sessionUser.phone, ':', contractsByPhone);
    }

    // Prisma 관계 필드명을 프론트엔드 형식으로 변환
    const formattedContract = fallbackContract ? {
      ...fallbackContract,
      user: fallbackContract.User_AffiliateContract_userIdToUser,
      // PDF URL을 metadata에서 추출하여 직접 접근 가능하도록 추가
      pdfUrl: (fallbackContract.metadata as any)?.pdfUrl || null,
    } : null;

    return NextResponse.json({ 
      ok: true, 
      contract: formattedContract
    });
  } catch (error: any) {
    console.error('[My Contract API] Error:', error);
    return NextResponse.json({ 
        ok: false,
        error: 'Internal Server Error', 
        details: error.message 
    }, { status: 500 });
  }
}
