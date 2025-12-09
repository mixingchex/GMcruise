export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import prisma from '@/lib/prisma';

import { getGoogleAuth } from '@/lib/google-drive';

// 구글 스프레드시트에 잠재고객 정보 저장
async function saveToProspectSpreadsheet(name: string, phone: string) {
  try {
    const spreadsheetId = process.env.SUBSCRIPTION_PROSPECTS_SPREADSHEET_ID || '1Cpp7zgWK-Rf13VnnGagfsMMMpPGDhe9sFyYcrZN0ZQY';
    if (!spreadsheetId) {
      console.warn('[Subscription Trial] 구글 스프레드시트 ID가 설정되지 않았습니다.');
      return { ok: false, error: '스프레드시트 ID가 설정되지 않았습니다.' };
    }

    // Google Auth 공통 함수 사용
    const auth = getGoogleAuth();

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
        values: [[formattedDate, '3일 무료 체험', name, phone]],
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
    const { name, phone, partnerId, source } = await req.json();

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

    console.log('[Subscription Trial] 3일 무료 체험 시작:', { name, phone: normalizedPhone });

    // 구글 스프레드시트에 잠재고객 정보 저장 (B2B 잠재고객 추적)
    // 비동기로 처리하여 응답 속도 개선 (실패해도 DB 저장은 진행)
    saveToProspectSpreadsheet(name, normalizedPhone).catch(err => {
      console.error('[Subscription Trial] 스프레드시트 저장 실패 (백그라운드):', err);
    });

    // 3일 체험 정보 생성
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 3);

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
        const updateData: any = {
          metadata: {
            ...(existingLead.metadata as any || {}),
            trialStartedAt: now.toISOString(),
            trialExpiresAt: trialEndDate.toISOString(),
            lastTrialUpdate: now.toISOString(),
          },
          // 소스가 없는 경우에만 업데이트 (기존 소스 유지)
          source: existingLead.source || source || 'TRIAL_DASHBOARD',
          updatedAt: new Date(),
        };

        // 파트너 ID가 있고, 기존 리드에 담당자가 없는 경우 할당
        if (partnerId) {
          // 1. Admin Phone Numbers Check
          if (partnerId === '01024958013' || partnerId === '01038609161') {
            console.log('[Subscription Trial] Admin Partner ID detected (Update):', partnerId);
            updateData.managerId = null;
            updateData.agentId = null;
            updateData.source = 'B2B_LANDING_ADMIN';
          } else {
            // 2. Regular Partner Assignment
            const partnerIdNum = Number(partnerId);
            const whereClause: any = { status: 'ACTIVE' };

            if (!isNaN(partnerIdNum)) {
              whereClause.id = partnerIdNum;
            } else {
              whereClause.OR = [
                { affiliateCode: partnerId },
                { landingSlug: partnerId },
                { User: { phone: partnerId } }
              ];
            }

            const partner = await prisma.affiliateProfile.findFirst({
              where: whereClause
            });

            if (partner) {
              if (!existingLead.managerId && !existingLead.agentId) {
                if (partner.type === 'BRANCH_MANAGER') {
                  updateData.managerId = partner.id;
                } else if (partner.type === 'SALES_AGENT') {
                  updateData.agentId = partner.id;
                  // 판매원의 대리점장 찾기
                  const relation = await prisma.affiliateRelation.findFirst({
                    where: { agentId: partner.id, status: 'ACTIVE' },
                    select: { managerId: true }
                  });
                  if (relation) {
                    updateData.managerId = relation.managerId;
                  }
                }
                // 소스도 B2B_LANDING으로 업데이트 (파트너 유입이므로)
                updateData.source = 'B2B_LANDING';
              }
            }
          }
        }

        await prisma.affiliateLead.update({
          where: { id: existingLead.id },
          data: updateData
        });
        console.log('[Subscription Trial] 기존 리드 업데이트 완료:', existingLead.id);
      } else {
        // 신규 리드 생성
        const createData: any = {
          customerName: name,
          customerPhone: normalizedPhone,
          status: 'NEW',
          source: source || 'TRIAL_DASHBOARD', // 기본값
          metadata: {
            trialStartedAt: now.toISOString(),
            trialExpiresAt: trialEndDate.toISOString(),
          },
          updatedAt: new Date(),
        };

        // 파트너 할당 로직
        if (partnerId) {
          // 1. Admin Phone Numbers Check
          if (partnerId === '01024958013' || partnerId === '01038609161') {
            console.log('[Subscription Trial] Admin Partner ID detected (New):', partnerId);
            createData.managerId = null;
            createData.agentId = null;
            createData.source = 'B2B_LANDING_ADMIN';
          } else {
            // 2. Regular Partner Assignment
            const partnerIdNum = Number(partnerId);
            const whereClause: any = { status: 'ACTIVE' };

            if (!isNaN(partnerIdNum)) {
              whereClause.id = partnerIdNum;
            } else {
              whereClause.OR = [
                { affiliateCode: partnerId },
                { landingSlug: partnerId },
                { User: { phone: partnerId } }
              ];
            }

            const partner = await prisma.affiliateProfile.findFirst({
              where: whereClause
            });

            if (partner) {
              if (partner.type === 'BRANCH_MANAGER') {
                createData.managerId = partner.id;
              } else if (partner.type === 'SALES_AGENT') {
                createData.agentId = partner.id;
                const relation = await prisma.affiliateRelation.findFirst({
                  where: { agentId: partner.id, status: 'ACTIVE' },
                  select: { managerId: true }
                });
                if (relation) {
                  createData.managerId = relation.managerId;
                }
              }
              createData.source = 'B2B_LANDING'; // 파트너 유입
            }
          }
        }

        const newLead = await prisma.affiliateLead.create({
          data: createData
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
      message: '3일 무료 체험이 시작되었습니다!',
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
