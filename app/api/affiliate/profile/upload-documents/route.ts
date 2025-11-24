import { NextRequest, NextResponse } from 'next/server';

// ⬇️ 절대법칙: 파일 업로드 API는 반드시 nodejs runtime과 force-dynamic 필요
export const runtime = 'nodejs';        // Edge Runtime 금지 (파일 시스템 접근 필요)
export const dynamic = 'force-dynamic'; // 이미지/파일 업로드는 캐시 X

import { getSession } from '@/lib/session';

import prisma from '@/lib/prisma';

import { uploadFileToDrive } from '@/lib/google-drive';

import { writeFile, mkdir } from 'fs/promises';

import { existsSync } from 'fs';

import { join } from 'path';



// ★ 엘런님이 지정한 구글 드라이브 폴더 ID ★

const FOLDER_IDS: Record<string, string> = {

  'ID_CARD': '1DFWpAiS-edjiBym5Y5AonDOl2wXyuDV0',  

  'BANKBOOK': '1IjNSTTTBjU9NZE6fm6DeAAHBx4puWCRl' 

};



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

    const documentType = (rawType === 'BANKBOOK') ? 'BANKBOOK' : 'ID_CARD';

    const targetFolderId = FOLDER_IDS[documentType];



    // 1단계: 서버에 먼저 저장 (안정성 확보)

    const buffer = Buffer.from(await file.arrayBuffer());

    const timestamp = Date.now();

    const random = Math.random().toString(36).substring(2, 8);

    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    const localFileName = `${documentType.toLowerCase()}_${session.userId}_${timestamp}_${random}_${originalName}`;

    

    // 업로드 디렉토리 확인/생성

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'documents');

    if (!existsSync(uploadDir)) {

      await mkdir(uploadDir, { recursive: true });

    }

    const filepath = join(uploadDir, localFileName);

    await writeFile(filepath, buffer);

    const serverUrl = `/uploads/documents/${localFileName}`;

    console.log('[Upload Documents] 파일이 서버에 저장되었습니다:', serverUrl);



    // 2단계: 구글 드라이브 백업 (실패해도 계속 진행)

    let backupUrl: string | null = null;

    let backupError: string | null = null;

    try {

      const backupResult = await uploadFileToDrive({

        folderId: targetFolderId,

        fileName: `${session.userId}_${documentType}_${file.name}`,

        mimeType: file.type,

        buffer: buffer,

        makePublic: false, // 개인정보는 공개하지 않음

      });



      if (backupResult.ok && backupResult.url) {

        backupUrl = backupResult.url;

        console.log('[Upload Documents] 구글 드라이브 백업 성공:', backupUrl);

      } else {

        backupError = backupResult.error || '구글 드라이브 백업 실패';

        console.warn('[Upload Documents] 구글 드라이브 백업 실패 (서버 저장은 성공):', backupError);

      }

    } catch (backupErr: any) {

      backupError = backupErr?.message || '구글 드라이브 백업 중 오류 발생';

      console.warn('[Upload Documents] 구글 드라이브 백업 중 오류 (서버 저장은 성공):', backupError);

      // 백업 실패해도 서버 저장은 성공했으므로 계속 진행

    }



    // 서버 URL을 기본으로 사용 (백업 URL은 metadata에 저장)

    const fileUrl = serverUrl;



    // DB 저장 (서버 URL 저장, 백업 URL은 metadata에)

    const userIdInt = parseInt(String(session.userId), 10);

    const profile = await prisma.affiliateProfile.findFirst({ where: { userId: userIdInt } });

    

    if (!profile) {

      // 프로필이 없으면 파일은 서버에 저장되었지만 DB에는 저장되지 않음

      console.warn('[Upload Documents] 프로필이 없어서 DB에 저장하지 못했습니다. 파일은 서버에 저장되었습니다:', serverUrl);

      return NextResponse.json({ 

        ok: false, 

        error: '어필리에이트 프로필이 없습니다. 프로필을 먼저 생성해주세요.',

        url: serverUrl, // 서버에 저장된 파일 URL은 반환

        warning: '파일은 서버에 저장되었지만 프로필이 없어 DB에 저장하지 못했습니다.'

      }, { status: 400 });

    }

    

    if (fileUrl) {

      const metadata: any = {};

      if (backupUrl) {

        metadata.backupUrl = backupUrl;

        metadata.backedUpAt = new Date().toISOString();

      }

      if (backupError) {

        metadata.backupError = backupError;

      }

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
