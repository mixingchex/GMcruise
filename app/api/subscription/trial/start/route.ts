export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import prisma from '@/lib/prisma';

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
    // 비동기로 처리하여 응답 속도 개선 (실패해도 DB 저장은 진행)
    saveToProspectSpreadsheet(name, normalizedPhone).catch(err => {
      console.error('[Subscription Trial] 스프레드시트 저장 실패 (백그라운드):', err);
    });

    // 7일 체험 정보 생성
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    // DB에 AffiliateLead로 저장 (또는 업데이트)
    try {
      // 기존 리드 확인
      const existingLead = await prisma.affiliateLead.findFirst({
        where: {
          customerPhone: normalizedPhone,
          status: { not: 'CANCELLED' }
        }
      });

      if (existingLead) {
        // 이미 존재하는 경우, 메타데이터에 체험 정보 업데이트
        await prisma.affiliateLead.update({
          where: { id: existingLead.id },
          data: {
            metadata: {
              ...(existingLead.metadata as any || {}),
              trialStartedAt: now.toISOString(),
              trialExpiresAt: trialEndDate.toISOString(),
              lastTrialUpdate: now.toISOString(),
            },
            // 소스가 없는 경우에만 업데이트 (기존 소스 유지)
            source: existingLead.source || 'TRIAL_DASHBOARD',
            // 상태가 NEW라면 CONTACTED나 다른 상태로 변경할 수도 있지만, 일단 유지하거나 필요시 변경
          }
        });
        console.log('[Subscription Trial] 기존 리드 업데이트 완료:', existingLead.id);
      } else {
        // 신규 리드 생성
        const newLead = await prisma.affiliateLead.create({
          data: {
            customerName: name,
            customerPhone: normalizedPhone,
            status: 'NEW',
            source: 'TRIAL_DASHBOARD', // 시스템 상담 신청 (체험)
            metadata: {
              trialStartedAt: now.toISOString(),
              trialExpiresAt: trialEndDate.toISOString(),
            }
          }
        });
        console.log('[Subscription Trial] 신규 리드 생성 완료:', newLead.id);
      }
    } catch (dbError) {
      console.error('[Subscription Trial] DB 저장 실패:', dbError);
      // DB 저장 실패해도 클라이언트 체험은 시작되도록 할지, 에러를 낼지 결정.
      // 여기서는 에러 로그만 남기고 진행 (클라이언트 로컬스토리지 기반으로라도 동작하게)
    }

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
