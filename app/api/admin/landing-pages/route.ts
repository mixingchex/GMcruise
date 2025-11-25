export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

import { getSession } from '@/lib/session'; // 올바른 세션 경로



export async function GET(req: Request) {

  try {

    // 1. 관리자 권한 확인

    const session = await getSession();

    if (!session?.userId) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    }



    // userId를 숫자로 변환

    const userId = parseInt(String(session.userId), 10);

    

    const user = await prisma.user.findUnique({

      where: { id: userId },

      select: { role: true }

    });



    if (user?.role !== 'admin') {

      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    }



    // 2. 랜딩페이지 목록 조회 (없는 필드 제거, 표준 필드만 조회)

    const landingPages = await prisma.landingPage.findMany({

      orderBy: { createdAt: 'desc' },

      include: {

        // 작성자 정보 포함 (관계 필드명이 user인지 User인지 확인 필요, 보통 소문자 user 권장)

        // 안전하게 관계 필드 없이 조회하거나, 스키마에 맞게 user: true로 시도

        // 여기서는 에러 방지를 위해 기본 필드만 조회하고 필요시 관계 추가

      }

    });

    

    // 3. 데이터 가공 (필요한 경우)

    // DB에 pushNotificationEnabled가 없다면 smsNotification 등을 사용하거나 제외



    return NextResponse.json({ 

      ok: true, 

      landingPages 

    });



  } catch (error) {

    console.error('[Admin LandingPage API] Error:', error);

    return NextResponse.json({ 

      error: 'Internal Server Error', 

      details: String(error) 

    }, { status: 500 });

  }

}
