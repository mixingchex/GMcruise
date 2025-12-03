import { NextRequest, NextResponse } from 'next/server';

// ⬇️ 절대법칙: 파일 업로드 API는 반드시 nodejs runtime과 force-dynamic 필요
export const runtime = 'nodejs';        // Edge Runtime 금지 (파일 시스템 접근 필요)
export const dynamic = 'force-dynamic'; // 이미지/파일 업로드는 캐시 X

import { getSession } from '@/lib/session';

import prisma from '@/lib/prisma';

import { uploadFileToDrive } from '@/lib/google-drive';
import { uploadAffiliateInfoFile } from '@/lib/google-drive-affiliate-info';

const targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';



// GET: 문서 목록 조회
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userIdInt = parseInt(String(session.userId), 10);
    const profile = await prisma.affiliateProfile.findFirst({
      where: { userId: userIdInt }
    });

    if (!profile) {
      return NextResponse.json({ ok: true, documents: [] });
    }

    const documents = await prisma.affiliateDocument.findMany({
      where: { profileId: profile.id },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json({
      ok: true,
      documents: documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        filePath: doc.filePath,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        status: doc.status,
        uploadedAt: doc.uploadedAt?.toISOString() || null,
        reviewedAt: doc.reviewedAt?.toISOString() || null,
        isApproved: doc.status === 'APPROVED',
      }))
    });
  } catch (error: any) {
    console.error('[GET Documents API Error]', error);
    return NextResponse.json({
      ok: false,
      error: error?.message || '문서 목록을 불러오는 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}

// POST: 파일 업로드
export async function POST(req: NextRequest) {

  try {

    const session = await getSession();

    if (!session?.userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });



    const formData = await req.formData();

    const file = formData.get('file') as File;

    const rawType = (formData.get('documentType') as string || '').toUpperCase();



    if (!file || !rawType) {

      return NextResponse.json({ ok: false, error: '파일과 문서 타입이 필요합니다.' }, { status: 400 });

    }



    // 타입 정규화
    const documentType = (rawType === 'BANKBOOK') ? 'bankbook' : 'idCard';

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const localFileName = `${documentType.toLowerCase()}_${session.userId}_${timestamp}_${random}_${originalName}`;

    // Google Drive에 직접 저장 (Vercel 서버리스 환경에서는 로컬 저장 불가)
    let driveUrl: string | null = null;
    let driveError: string | null = null;

    try {
      // 판매원별 폴더 구조로 저장
      const fileType = documentType === 'idCard' ? 'idCard' : 'bankbook';
      const driveResult = await uploadAffiliateInfoFile(
        session.userId,
        buffer,
        `${documentType}_${file.name}`,
        file.type,
        fileType
      );

      if (driveResult.ok && driveResult.url) {
        driveUrl = driveResult.url;
        console.log('[Upload Documents] 구글 드라이브 저장 성공 (판매원별 폴더):', driveUrl);
      } else {
        // 폴더 구조 저장 실패 시 에러 반환 (Fallback 제거)
        driveError = driveResult.error || '구글 드라이브 저장 실패 (폴더 구조 생성 실패)';
        console.error('[Upload Documents] 구글 드라이브 저장 실패:', driveError);
        // Fallback logic removed to ensure files go to the correct location
      }
    } catch (driveErr: any) {
      driveError = driveErr?.message || '구글 드라이브 저장 중 오류 발생';
      console.error('[Upload Documents] 구글 드라이브 저장 중 오류:', driveError);
    }

    // Drive URL이 없으면 에러 반환
    if (!driveUrl) {
      return NextResponse.json({
        ok: false,
        error: driveError || '파일 저장에 실패했습니다.'
      }, { status: 500 });
    }

    // Drive URL을 기본 URL로 사용
    const fileUrl = driveUrl;



    // DB 저장 (서버 URL 저장, 백업 URL은 metadata에)

    const userIdInt = parseInt(String(session.userId), 10);

    const profile = await prisma.affiliateProfile.findFirst({ where: { userId: userIdInt } });



    if (!profile) {

      console.warn('[Upload Documents] 프로필이 없어서 DB에 저장하지 못했습니다.');

      return NextResponse.json({

        ok: false,

        error: '어필리에이트 프로필이 없습니다. 프로필을 먼저 생성해주세요.'

      }, { status: 400 });

    }



    if (fileUrl) {

      const metadata: any = {
        uploadedToDrive: true,
        driveUrl: driveUrl,
        uploadedAt: new Date().toISOString()
      };

      const existing = await prisma.affiliateDocument.findFirst({

        where: { profileId: profile.id, documentType }

      });



      if (existing) {

        await prisma.affiliateDocument.update({

          where: { id: existing.id },

          data: {

            filePath: fileUrl,

            fileName: file.name,

            fileSize: file.size,

            status: 'UPLOADED',

            // updatedAt 필드가 없으므로 제거

            metadata: Object.keys(metadata).length > 0 ? metadata : undefined

          }

        });

      } else {

        await prisma.affiliateDocument.create({

          data: {

            profileId: profile.id,

            documentType,

            filePath: fileUrl,

            fileName: file.name,

            fileSize: file.size,

            status: 'UPLOADED',

            metadata: Object.keys(metadata).length > 0 ? metadata : undefined

          }

        });

      }

    }



    return NextResponse.json({

      ok: true,

      success: true,

      url: fileUrl,

      message: '완료되었습니다'

    });



  } catch (error: any) {

    console.error('[Upload API Error]', error);

    console.error('[Upload API Error] Stack:', error?.stack);

    console.error('[Upload API Error] Details:', {

      message: error?.message,

      code: error?.code,

      response: error?.response?.data,

    });

    // JWT 관련 에러인 경우 더 자세한 메시지 제공

    if (error?.message?.includes('JWT') || error?.message?.includes('invalid_grant') || error?.message?.includes('Invalid JWT Signature')) {

      return NextResponse.json({

        ok: false,

        error: `Google Drive 인증 실패: ${error?.message || 'Invalid JWT Signature'}. 환경변수 GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY 또는 GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY의 줄바꿈 문자(\\n) 처리를 확인해주세요.`

      }, { status: 500 });

    }

    return NextResponse.json({

      ok: false,

      error: error?.message || '문서 업로드 중 오류가 발생했습니다.'

    }, { status: 500 });

  }

}
