export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// 구글 스프레드시트에 잠재고객 정보 저장
async function saveToProspectSpreadsheet(name: string, phone: string) {
  try {
    const spreadsheetId = process.env.SUBSCRIPTION_PROSPECTS_SPREADSHEET_ID || '1Cpp7zgWK-Rf13VnnGagfsMMMpPGDhe9sFyYcrZN0ZQY';
    if (!spreadsheetId) {
      console.warn('[Subscription Trial] 구글 스프레드시트 ID가 설정되지 않았습니다.');
      return { ok: false, error: '스프레드시트 ID가 설정되지 않았습니다.' };
    }

    // Google Sheets 클라이언트 가져오기
    const credentials = {
      clientEmail: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    };

    if (!credentials.clientEmail || !credentials.privateKey) {
      console.warn('[Subscription Trial] 구글 인증 정보가 설정되지 않았습니다.');
      return { ok: false, error: '구글 인증 정보가 설정되지 않았습니다.' };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.clientEmail,
        private_key: credentials.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 헤더 확인 및 추가 (없으면)
    const headerRange = 'Prospects!A1:D1';
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });

    const headers = headerResponse.data.values?.[0] || [];
    if (headers.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['가입일시', '상태', '이름', '연락처']],
        },
      });
    }

    // 데이터 추가
    const now = new Date();
    const formattedDate = now.toLocaleString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Prospects!A:D',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[formattedDate, '7일 무료 체험', name, phone]],
      },
    });

    console.log('[Subscription Trial] 구글 스프레드시트에 잠재고객 정보 저장 완료:', { name, phone });
    return { ok: true };
  } catch (error: any) {
    console.error('[Subscription Trial] 구글 스프레드시트 저장 실패:', error);
    return { ok: false, error: error?.message };
  }
}

export async function POST(req: Request) {
  try {
    const { name, phone } = await req.json();

    if (!name || !phone) {
      return NextResponse.json(
        { ok: false, error: '이름과 연락처를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 연락처 정규화 (숫자만 추출)
    const normalizedPhone = phone.replace(/[^0-9]/g, '');

    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { ok: false, error: '올바른 연락처를 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log('[Subscription Trial] 7일 무료 체험 시작:', { name, phone: normalizedPhone });

    // 구글 스프레드시트에 잠재고객 정보 저장 (B2B 잠재고객 추적)
    await saveToProspectSpreadsheet(name, normalizedPhone);

    // 7일 체험 정보 생성 (클라이언트에서 localStorage에 저장할 데이터)
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    const trialSession = {
      name,
      phone: normalizedPhone,
      startedAt: now.toISOString(),
      expiresAt: trialEndDate.toISOString(),
      trialId: `trial_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    console.log('[Subscription Trial] 체험 세션 생성:', trialSession);

    return NextResponse.json({
      ok: true,
      trial: trialSession,
      message: '7일 무료 체험이 시작되었습니다!',
      redirectUrl: '/trial/dashboard',
    });
  } catch (error: any) {
    console.error('[Subscription Trial] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || '무료 체험 시작에 실패했습니다.' },
      { status: 500 }
    );
  }
}
