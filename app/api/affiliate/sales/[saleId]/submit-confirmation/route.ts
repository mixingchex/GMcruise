// app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts
// 판매 확정 요청 제출 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

// 세션에서 사용자 정보 가져오기
async function getCurrentUser() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true },
        },
      },
    });

    if (!session || !session.User) return null;
    return session.User;
  } catch (error) {
    console.error('[Submit Confirmation] Session error:', error);
    return null;
  }
}

// 판매원/대리점장 권한 확인
async function checkAffiliateAuth(saleId: number, userId: number) {
  // 판매 정보 가져오기
  const sale = await prisma.affiliateSale.findUnique({
    where: { id: saleId },
    include: {
      AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: {
        select: { userId: true, type: true },
      },
      AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile: {
        select: { userId: true, type: true },
      },
    },
  });

  if (!sale) {
    return { allowed: false, reason: '판매를 찾을 수 없습니다' };
  }

  // 판매원인 경우: 본인 판매만 가능
  if (sale.agentId && sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile?.userId === userId) {
    return { allowed: true, profile: sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile };
  }

  // 대리점장인 경우: 본인 판매만 가능 (소속 판매원 판매는 불가)
  if (sale.managerId && sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile?.userId === userId) {
    return { allowed: true, profile: sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile };
  }

  return { allowed: false, reason: '본인의 판매만 확정 요청할 수 있습니다' };
}

/**
 * POST: 판매 확정 요청 제출
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 사용자 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 권한 확인 (본인 판매만)
    const authCheck = await checkAffiliateAuth(saleId, user.id);
    if (!authCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: authCheck.reason },
        { status: 403 }
      );
    }

    // 4. 판매 상태 확인 (이미 요청했거나 승인된 경우 불가)
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      select: { id: true, status: true },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (sale.status === 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '이미 승인 대기 중입니다' },
        { status: 400 }
      );
    }

    if (sale.status === 'APPROVED') {
      return NextResponse.json(
        { ok: false, error: '이미 승인된 판매입니다' },
        { status: 400 }
      );
    }

    // 5. 파일 업로드 처리
    const formData = await req.formData();
    const audioFile = formData.get('audioFile') as File | null;
    const audioFileType = formData.get('audioFileType') as string | null; // 'FIRST_CALL' 또는 'PASSPORT_GUIDE'

    if (!audioFile) {
      return NextResponse.json(
        { ok: false, error: '녹음 파일을 업로드해주세요' },
        { status: 400 }
      );
    }

    // 녹음 파일 타입 확인
    if (!audioFileType || (audioFileType !== 'FIRST_CALL' && audioFileType !== 'PASSPORT_GUIDE')) {
      return NextResponse.json(
        { ok: false, error: '녹음 파일 타입을 선택해주세요 (첫 콜 또는 여권 안내)' },
        { status: 400 }
      );
    }

    // 파일 크기 확인 (50MB 제한)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: '파일 크기는 50MB를 초과할 수 없습니다' },
        { status: 400 }
      );
    }

    // 파일 형식 확인 (MP3, WAV, M4A)
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { ok: false, error: '지원하는 파일 형식: MP3, WAV, M4A' },
        { status: 400 }
      );
    }

    // 6. Google Drive에 파일 업로드
    const { uploadFileToDrive } = await import('@/lib/google-drive');
    
    // 파일 버퍼 생성
    const fileBuffer = Buffer.from(await audioFile.arrayBuffer());
    
    // 파일명 생성 (중복 방지)
    const fileExtension = audioFile.name.split('.').pop() || 'mp3';
    const fileName = `sale_${saleId}_${audioFileType}_${Date.now()}.${fileExtension}`;
    
    // Google Drive 폴더 ID (환경 변수에서 가져오거나 기본값 사용)
    const audioFolderId = process.env.GOOGLE_DRIVE_AUDIO_FOLDER_ID || process.env.GOOGLE_DRIVE_PASSPORT_FOLDER_ID || null;
    
    // Google Drive에 업로드
    const uploadResult = await uploadFileToDrive({
      folderId: audioFolderId,
      fileName,
      mimeType: audioFile.type || 'audio/mpeg',
      buffer: fileBuffer,
      makePublic: false,
    });
    
    if (!uploadResult.ok || !uploadResult.url || !uploadResult.fileId) {
      console.error('[Submit Confirmation] Google Drive upload failed:', uploadResult.error);
      return NextResponse.json(
        { ok: false, error: uploadResult.error || '녹음 파일 업로드에 실패했습니다' },
        { status: 500 }
      );
    }

    // 7. 데이터베이스 업데이트
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'PENDING_APPROVAL',
        audioFileGoogleDriveId: uploadResult.fileId,
        audioFileGoogleDriveUrl: uploadResult.url,
        audioFileName: audioFile.name,
        audioFileType: audioFileType, // 녹음 파일 타입 저장
        submittedById: user.id,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      message: '판매 확정 요청이 제출되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
        audioFileUrl: updatedSale.audioFileGoogleDriveUrl,
      },
    });
  } catch (error: any) {
    console.error('[Submit Confirmation] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
