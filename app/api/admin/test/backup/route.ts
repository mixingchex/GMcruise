import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { manualRunDatabaseBackup } from '@/lib/scheduler/databaseBackup';

export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'cg.sid.v2';

/**
 * 데이터베이스 백업 테스트 API
 * GET /api/admin/test/backup
 * 
 * 관리자가 백업을 즉시 실행하고 결과를 확인합니다.
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

    console.log(`[Backup Test] Started by ${session.User.name} (${session.User.id})`);
    
    // 백업 실행
    const result = await manualRunDatabaseBackup();

    return NextResponse.json({
      ok: true,
      message: '백업 테스트가 완료되었습니다.',
      data: result,
    });
  } catch (error: any) {
    console.error('[Backup Test] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || '백업 테스트 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}










