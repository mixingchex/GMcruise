export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import dayjs from 'dayjs';

const SESSION_COOKIE = 'cg.sid.v2';

/**
 * 지급명세서 테스트 API
 * GET /api/admin/test/payslip?period=YYYY-MM
 * 
 * 테스트용 지급명세서를 생성합니다.
 */
export async function GET(req: Request) {
  try {
    // 관리자 권한 확인
    const sid = cookies().get(SESSION_COOKIE)?.value;
    
    if (!sid) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true, name: true },
        },
      },
    });

    if (!session?.User || session.User.role !== 'admin') {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 쿼리 파라미터에서 period 가져오기
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || dayjs().subtract(1, 'month').format('YYYY-MM');

    console.log(`[Payslip Test] Generating test payslip for ${period} by ${session.User.name}`);

    // 지급명세서 생성 API 호출
    // 서버 사이드 API route에서 내부 API 호출 시 절대 URL 필요
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const generateResponse = await fetch(`${baseUrl}/api/admin/payslips/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${SESSION_COOKIE}=${sid}`,
      },
      body: JSON.stringify({ period }),
    });

    const generateData = await generateResponse.json();

    if (!generateResponse.ok || !generateData.ok) {
      return NextResponse.json({
        ok: false,
        error: generateData.error || '지급명세서 생성에 실패했습니다.',
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `${period} 지급명세서 테스트 생성 완료`,
      data: generateData.data,
    });
  } catch (error: any) {
    console.error('[Payslip Test] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || '지급명세서 테스트 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}






















