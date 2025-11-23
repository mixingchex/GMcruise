import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인
async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  if (!sid) return false;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { role: true },
        },
      },
    });

    return session?.User.role === 'admin';
  } catch (error) {
    console.error('[Admin Payment Pages Upload] Auth check error:', error);
    return false;
  }
}

/**
 * POST /api/admin/affiliate/payment-pages/upload
 * 결제 페이지 이미지 업로드
 */
export async function POST(req: NextRequest) {
  try {
    const sid = cookies().get(SESSION_COOKIE)?.value;
    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const contractType = formData.get('contractType') as string;

    if (!file) {
      return NextResponse.json({ ok: false, message: '파일이 없습니다.' }, { status: 400 });
    }

    if (!contractType) {
      return NextResponse.json({ ok: false, message: '계약서 타입이 없습니다.' }, { status: 400 });
    }

    // 파일 타입 검증 (MIME 타입 또는 확장자로 확인)
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (!file.type.startsWith('image/') && !allowedExtensions.includes(fileExt)) {
      return NextResponse.json({ 
        ok: false, 
        message: `이미지 파일만 업로드 가능합니다. (지원 형식: PNG, JPG, GIF, WEBP, 현재: ${file.type || fileExt})` 
      }, { status: 400 });
    }
    
    // PNG 파일의 경우 MIME 타입이 비어있을 수 있으므로 확장자로도 확인
    if (fileExt === 'png' && !file.type) {
      console.log('[Admin Payment Pages Upload] PNG 파일 감지 (MIME 타입 없음, 확장자로 확인)');
    }

    // 파일 크기 제한 (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ ok: false, message: '파일 크기는 10MB 이하여야 합니다.' }, { status: 400 });
    }

    // 파일 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 파일명 생성: payment-page-{contractType}-{timestamp}.{ext}
    const ext = file.name.split('.').pop() || 'png';
    const timestamp = Date.now();
    const fileName = `payment-page-${contractType}-${timestamp}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'payment-pages');
    const filePath = path.join(uploadDir, fileName);

    // 디렉토리 생성
    await mkdir(uploadDir, { recursive: true });

    // 파일 저장
    await writeFile(filePath, buffer);

    // URL 반환
    const url = `/payment-pages/${fileName}`;

    console.log('[Admin Payment Pages Upload] 파일 업로드 성공:', {
      contractType,
      fileName,
      url,
      size: file.size,
    });

    return NextResponse.json({
      ok: true,
      url,
      fileName,
      message: '이미지가 업로드되었습니다.',
    });
  } catch (error: any) {
    console.error('[Admin Payment Pages Upload] error:', error);
    return NextResponse.json(
      { ok: false, message: error?.message || '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


