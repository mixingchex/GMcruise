export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';
import { getGoogleDriveAuth } from '@/lib/google/drive';

// 구글 캘린더에 미팅 예약 생성
export async function POST(request: NextRequest) {
  try {
    const sid = cookies().get(SESSION_COOKIE)?.value;
    if (!sid) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { User: true },
    });

    if (!session || !session.User) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      meetingId, 
      title, 
      description, 
      startTime, 
      endTime, 
      meetingLink,
      accessToken 
    } = body;

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: '구글 캘린더 인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 구글 캘린더 API 클라이언트
    const oauth2Client = getGoogleDriveAuth();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 캘린더 이벤트 생성
    const event = {
      summary: title || '화상 회의',
      description: `${description || ''}\n\n미팅 링크: ${meetingLink}`,
      start: {
        dateTime: startTime,
        timeZone: 'Asia/Seoul',
      },
      end: {
        dateTime: endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(), // 기본 1시간
        timeZone: 'Asia/Seoul',
      },
      conferenceData: {
        createRequest: {
          requestId: `meeting-${meetingId}-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 하루 전
          { method: 'popup', minutes: 15 }, // 15분 전
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
    });

    return NextResponse.json({
      ok: true,
      event: {
        id: response.data.id,
        htmlLink: response.data.htmlLink,
        hangoutLink: response.data.hangoutLink,
      },
    });
  } catch (error) {
    console.error('[Google Calendar] Create error:', error);
    return NextResponse.json(
      { ok: false, error: '캘린더 이벤트 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
