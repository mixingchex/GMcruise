import { NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Google Drive 인증 테스트 API
 * GET /api/test/google-drive-auth
 * 
 * Vercel 환경에서 Google Drive 인증이 제대로 작동하는지 테스트합니다.
 */
export async function GET() {
  try {
    console.log('[Google Drive Auth Test] 시작...');
    
    // 1. 환경 변수 확인
    const privateKeyEnv = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
    
    if (!privateKeyEnv) {
      return NextResponse.json({
        ok: false,
        error: 'GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY 환경 변수가 없습니다.',
        step: 'env_check',
      }, { status: 500 });
    }
    
    if (!clientEmail) {
      return NextResponse.json({
        ok: false,
        error: 'GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL 환경 변수가 없습니다.',
        step: 'env_check',
      }, { status: 500 });
    }
    
    console.log('[Google Drive Auth Test] 환경 변수 확인 완료');
    console.log(`[Google Drive Auth Test] Client Email: ${clientEmail}`);
    console.log(`[Google Drive Auth Test] Private Key 길이: ${privateKeyEnv.length}자`);
    
    // 2. Private Key 형식 확인
    const hasBegin = privateKeyEnv.includes('-----BEGIN PRIVATE KEY-----');
    const hasEnd = privateKeyEnv.includes('-----END PRIVATE KEY-----');
    
    if (!hasBegin || !hasEnd) {
      return NextResponse.json({
        ok: false,
        error: 'Private Key 형식이 올바르지 않습니다. -----BEGIN PRIVATE KEY-----와 -----END PRIVATE KEY-----가 필요합니다.',
        step: 'key_format_check',
        hasBegin,
        hasEnd,
      }, { status: 500 });
    }
    
    console.log('[Google Drive Auth Test] Private Key 형식 확인 완료');
    
    // 3. Google Drive 클라이언트 생성 및 인증 테스트
    try {
      const drive = getDriveClient();
      console.log('[Google Drive Auth Test] Drive 클라이언트 생성 완료');
      
      // 간단한 API 호출로 인증 테스트 (about API는 인증만 확인)
      const aboutResponse = await drive.about.get({
        fields: 'user',
      });
      
      console.log('[Google Drive Auth Test] Google Drive API 호출 성공!');
      
      return NextResponse.json({
        ok: true,
        message: 'Google Drive 인증 테스트 성공!',
        data: {
          clientEmail,
          privateKeyLength: privateKeyEnv.length,
          hasBegin,
          hasEnd,
          authenticatedUser: aboutResponse.data.user?.emailAddress || 'N/A',
        },
      });
    } catch (authError: any) {
      console.error('[Google Drive Auth Test] 인증 오류:', authError);
      
      let errorMessage = authError.message || 'Unknown error';
      let errorDetails: any = {
        step: 'auth_test',
        error: errorMessage,
      };
      
      // JWT Signature 오류인 경우
      if (errorMessage.includes('JWT') || errorMessage.includes('invalid_grant') || errorMessage.includes('Invalid JWT')) {
        errorDetails.suggestion = 'JWT Signature 오류입니다. Private Key의 줄바꿈 문자를 확인하세요.';
        errorDetails.checklist = [
          'Private Key가 전체 복사되었는지 확인 (-----BEGIN PRIVATE KEY-----부터 -----END PRIVATE KEY-----까지)',
          'Vercel 환경 변수에서 Private Key가 올바르게 저장되었는지 확인',
          '환경 변수 추가 후 재배포했는지 확인',
        ];
      }
      
      return NextResponse.json({
        ok: false,
        error: 'Google Drive 인증 실패',
        ...errorDetails,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Google Drive Auth Test] 예상치 못한 오류:', error);
    return NextResponse.json({
      ok: false,
      error: error.message || '예상치 못한 오류가 발생했습니다.',
      step: 'unexpected_error',
    }, { status: 500 });
  }
}

