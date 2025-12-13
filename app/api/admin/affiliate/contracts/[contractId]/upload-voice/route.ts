export const dynamic = 'force-dynamic';

// app/api/admin/affiliate/contracts/[contractId]/upload-voice/route.ts
// 어필리에이트 계약서 음성 파일 업로드 API (보안 강화)

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 인증 확인
async function requireAdmin() {
  const cookieStore = await cookies();
  const sid = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      select: { User: { select: { id: true, role: true, name: true } } },
    });

    if (!session?.User || session.User.role !== 'admin') return null;
    return session.User;
  } catch (error) {
    console.error('[Upload Voice] Session error:', error);
    return null;
  }
}

// ========== 보안 상수 ==========
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
];

const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg', 'webm'];

// 파일명 sanitize (경로 조작 방지)
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
    .replace(/\.{2,}/g, '.') // 연속된 점 제거
    .replace(/^\./, '') // 시작 점 제거
    .substring(0, 255); // 파일명 길이 제한
}

/**
 * POST: 음성 파일 업로드
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    // 1. 관리자 인증 확인
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    const { contractId } = params;

    // 2. 계약서 존재 확인
    const contract = await prisma.affiliateContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      return NextResponse.json(
        { ok: false, error: '계약서를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 3. FormData에서 파일 추출
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: '파일을 업로드해주세요' },
        { status: 400 }
      );
    }

    // ========== 보안 검증 시작 ==========

    // 4. MIME 타입 검증 (오디오 파일만 허용)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: '지원하는 파일 형식: MP3, WAV, M4A, OGG, WebM',
          received: file.type,
        },
        { status: 400 }
      );
    }

    // 5. 파일 크기 제한 (50MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          ok: false,
          error: '파일 크기는 50MB를 초과할 수 없습니다',
          size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
        },
        { status: 400 }
      );
    }

    // 6. 파일 확장자 화이트리스트 검증
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          ok: false,
          error: '허용되지 않는 파일 확장자입니다',
          allowed: ALLOWED_EXTENSIONS.join(', '),
        },
        { status: 400 }
      );
    }

    // 7. 파일명 sanitize (경로 조작 방지)
    const sanitizedFileName = sanitizeFileName(file.name);
    const finalFileName = sanitizedFileName || 'voice_' + Date.now() + '.' + ext;

    // ========== 보안 검증 종료 ==========

    // 8. 파일 저장 디렉토리 설정
    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'affiliate',
      'contracts',
      contractId
    );

    // 디렉토리 생성 (존재하지 않으면)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 9. 파일 저장 경로
    const timestamp = Date.now();
    const uniqueFileName = timestamp + '_' + finalFileName;
    const filePath = path.join(uploadDir, uniqueFileName);

    // 10. 파일 버퍼 읽기 및 저장
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    // 11. DB에 파일 정보 저장
    const fileUrl = '/uploads/affiliate/contracts/' + contractId + '/' + uniqueFileName;

    const updatedContract = await prisma.affiliateContract.update({
      where: { id: contractId },
      data: {
        voiceRecordingUrl: fileUrl,
        updatedAt: new Date(),
      },
    });

    // 12. 업로드 로그 기록
    console.log('[Voice Upload Success]', {
      contractId,
      fileName: uniqueFileName,
      size: file.size,
      type: file.type,
      uploadedBy: admin.id,
      adminName: admin.name,
    });

    return NextResponse.json({
      ok: true,
      data: {
        url: fileUrl,
        fileName: uniqueFileName,
        size: file.size,
        type: file.type,
        contract: {
          id: updatedContract.id,
          voiceRecordingUrl: updatedContract.voiceRecordingUrl,
        },
      },
    });
  } catch (error: any) {
    console.error('[Voice Upload Error]:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || '파일 업로드 중 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 음성 파일 삭제
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    // 1. 관리자 인증 확인
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    const { contractId } = params;

    // 2. 계약서 조회
    const contract = await prisma.affiliateContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      return NextResponse.json(
        { ok: false, error: '계약서를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (!contract.voiceRecordingUrl) {
      return NextResponse.json(
        { ok: false, error: '삭제할 음성 파일이 없습니다' },
        { status: 400 }
      );
    }

    // 3. 파일 시스템에서 삭제
    const filePath = path.join(process.cwd(), 'public', contract.voiceRecordingUrl);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn('[File Delete Warning]:', error);
      // 파일이 이미 없어도 계속 진행
    }

    // 4. DB에서 URL 제거
    await prisma.affiliateContract.update({
      where: { id: contractId },
      data: {
        voiceRecordingUrl: null,
        updatedAt: new Date(),
      },
    });

    console.log('[Voice Delete Success]', {
      contractId,
      deletedBy: admin.id,
      adminName: admin.name,
    });

    return NextResponse.json({
      ok: true,
      message: '음성 파일이 삭제되었습니다',
    });
  } catch (error: any) {
    console.error('[Voice Delete Error]:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || '파일 삭제 중 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}
