export const dynamic = 'force-dynamic';

// app/api/community/upload/route.ts
// 커뮤니티 이미지 업로드 API

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { uploadFileToDrive } from '@/lib/google-drive';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    // 로그인 확인
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploadType = formData.get('type') as string | null; // 'review', 'post', 또는 'comment'

    if (!file) {
      return NextResponse.json(
        { ok: false, error: '파일을 제공해주세요.' },
        { status: 400 }
      );
    }

    // 파일 크기 확인
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: '파일 크기는 10MB를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: `지원하지 않는 파일 형식입니다. (${file.type})` },
        { status: 400 }
      );
    }

    // 파일명 생성 (타임스탬프 + 랜덤 + 원본 파일명)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${random}_${originalName}`;

    // 파일 버퍼 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Google Drive 리뷰 폴더 ID 가져오기
    const reviewsFolderId = process.env.GOOGLE_DRIVE_UPLOADS_REVIEWS_FOLDER_ID;
    
    if (!reviewsFolderId) {
      return NextResponse.json(
        { ok: false, error: 'Google Drive 리뷰 폴더 ID가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // Google Drive에 업로드
    const uploadResult = await uploadFileToDrive({
      folderId: reviewsFolderId,
      fileName: filename,
      mimeType: file.type,
      buffer,
      makePublic: true, // 공개 링크로 제공
    });

    if (!uploadResult.ok || !uploadResult.url) {
      return NextResponse.json(
        { ok: false, error: uploadResult.error || '파일 업로드 실패' },
        { status: 500 }
      );
    }

    const driveUrl = uploadResult.url;

    return NextResponse.json({
      ok: true,
      url: driveUrl, // Google Drive URL
      filename,
      size: file.size,
      type: file.type,
      fileId: uploadResult.fileId,
    });
  } catch (error) {
    console.error('[Community Upload API] Error:', error);
    return NextResponse.json(
      { ok: false, error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
