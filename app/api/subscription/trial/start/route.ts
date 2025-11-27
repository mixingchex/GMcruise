export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSheetsClient } from '@/lib/google-sheets';
import { google } from 'googleapis';

// 구글 스프레드시트에 잠재고객 정보 저장
async function saveToProspectSpreadsheet(name: string, phone: string) {
  try {
    const spreadsheetId = process.env.SUBSCRIPTION_PROSPECTS_SPREADSHEET_ID;
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
      // 헤더 추가
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['이름', '연락처', '가입일시', '상태']],
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
        values: [[name, phone, formattedDate, '무료 체험 중']],
      },
    });

    console.log('[Subscription Trial] 구글 스프레드시트에 잠재고객 정보 저장 완료:', { name, phone });
    return { ok: true };
  } catch (error: any) {
    console.error('[Subscription Trial] 구글 스프레드시트 저장 실패:', error);
    // 스프레드시트 저장 실패해도 계속 진행
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

    console.log('[Subscription Trial] 무료 체험 시작 요청:', { name, phone: normalizedPhone });

    // 기존 사용자 확인 (동일 연락처)
    let user = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
      },
    });

    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7일 무료 체험

    if (user) {
      // 기존 사용자: 기존 계약서 확인
      const existingContract = await prisma.affiliateContract.findFirst({
        where: {
          userId: user.id,
          metadata: {
            path: ['contractType'],
            equals: 'SUBSCRIPTION_AGENT',
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (existingContract) {
        const metadata = existingContract.metadata as any || {};
        const isTrial = metadata.isTrial === true;
        const contractTrialEndDate = metadata.trialEndDate ? new Date(metadata.trialEndDate) : null;

        // 무료 체험이 아직 유효한 경우
        if (isTrial && contractTrialEndDate && now < contractTrialEndDate) {
          console.log('[Subscription Trial] 기존 무료 체험 계정 사용:', { userId: user.id });
          
          // 구글 스프레드시트에 저장 (중복 방지 로직은 나중에 추가 가능)
          await saveToProspectSpreadsheet(name, normalizedPhone);

          return NextResponse.json({
            ok: true,
            mallUserId: user.mallUserId || 'trial',
            message: '기존 무료 체험 계정으로 로그인합니다.',
          });
        }
      }
    } else {
      // 신규 사용자: 임시 계정 생성 (아이디/비밀번호 없이)
      const tempMallUserId = `trial_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      user = await prisma.user.create({
        data: {
          name,
          phone: normalizedPhone,
          mallUserId: tempMallUserId,
          password: '', // 비밀번호 없음
          email: `${tempMallUserId}@trial.cruisedot.co.kr`,
        },
      });

      console.log('[Subscription Trial] 신규 임시 계정 생성:', { userId: user.id, mallUserId: tempMallUserId });
    }

    // AffiliateProfile 생성 또는 확인
    let affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
    });

    if (!affiliateProfile) {
      affiliateProfile = await prisma.affiliateProfile.create({
        data: {
          userId: user.id,
          affiliateCode: `TRIAL-${user.id}-${Date.now()}`,
          type: 'SALES_AGENT',
          status: 'ACTIVE',
          displayName: name,
          nickname: name,
          landingSlug: user.mallUserId || undefined,
          updatedAt: now,
        },
      });
    }

    // 정액제 계약서 생성 (7일 무료 체험)
    const contractEndDate = new Date(now);
    contractEndDate.setDate(contractEndDate.getDate() + 7);

    await prisma.affiliateContract.create({
      data: {
        userId: user.id,
        name,
        residentId: '000000-0000000', // 임시
        phone: normalizedPhone,
        email: user.email || `${user.mallUserId}@trial.cruisedot.co.kr`,
        address: '무료 체험 계정',
        status: 'completed',
        metadata: {
          contractType: 'SUBSCRIPTION_AGENT',
          isTrial: true,
          trialEndDate: trialEndDate.toISOString(),
          userInfo: {
            name,
            phone: normalizedPhone,
          },
        },
        contractStartDate: now,
        contractEndDate: contractEndDate,
        submittedAt: now,
        updatedAt: now,
      },
    });

    // 구글 스프레드시트에 잠재고객 정보 저장
    await saveToProspectSpreadsheet(name, normalizedPhone);

    console.log('[Subscription Trial] 무료 체험 시작 완료:', { userId: user.id, name, phone: normalizedPhone });

    return NextResponse.json({
      ok: true,
      mallUserId: user.mallUserId,
      message: '7일 무료 체험이 시작되었습니다.',
    });
  } catch (error: any) {
    console.error('[Subscription Trial] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || '무료 체험 시작에 실패했습니다.' },
      { status: 500 }
    );
  }
}

