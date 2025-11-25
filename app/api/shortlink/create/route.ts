export const dynamic = 'force-dynamic';

// app/api/shortlink/create/route.ts
// 숏링크 생성 API

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';
const SHORTLINKS_FILE = path.join(process.cwd(), 'data', 'shortlinks.json');

// 관리자 권한 확인
async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  if (!sid) return false;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { role: true },
        },
      },
    });

    return session?.User.role === 'admin';
  } catch (error) {
    console.error('[ShortLink] Auth check error:', error);
    return false;
  }
}

// 숏링크 파일 읽기
async function readShortLinks(): Promise<any> {
  try {
    const content = await fs.readFile(SHORTLINKS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // 파일이 없으면 기본값 반환
    return { links: [] };
  }
}

// 숏링크 파일 쓰기
async function writeShortLinks(data: any): Promise<void> {
  const dir = path.dirname(SHORTLINKS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SHORTLINKS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 랜덤 코드 생성
function generateShortCode(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * POST /api/shortlink/create
 * 숏링크 생성
 */
export async function POST(req: NextRequest) {
  try {
    const sid = cookies().get(SESSION_COOKIE)?.value;
    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 });
    }

    const { url, contractType } = await req.json();

    if (!url) {
      return NextResponse.json({ ok: false, message: 'URL이 필요합니다.' }, { status: 400 });
    }

    // 기존 숏링크 확인
    const data = await readShortLinks();
    const links = data.links || [];

    // 이미 같은 URL에 대한 숏링크가 있는지 확인
    const existingLink = links.find((link: any) => 
      link.url === url && link.contractType === contractType
    );

    if (existingLink) {
      // 환경 변수로 숏링크 도메인 설정, 없으면 현재 앱 도메인 사용
      const shortlinkDomain = process.env.SHORTLINK_DOMAIN || process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.cruisedot.co.kr';
      const shortUrl = `${shortlinkDomain}/p/${existingLink.code}`;
      return NextResponse.json({
        ok: true,
        code: existingLink.code,
        shortUrl,
        url: existingLink.url,
        message: '기존 숏링크를 반환했습니다.',
      });
    }

    // 새로운 코드 생성 (중복 확인)
    let code: string;
    let attempts = 0;
    do {
      code = generateShortCode(6);
      attempts++;
      if (attempts > 10) {
        code = generateShortCode(8); // 더 긴 코드 시도
      }
    } while (links.some((link: any) => link.code === code) && attempts < 20);

    // 숏링크 저장
    const newLink = {
      code,
      url,
      contractType: contractType || null,
      createdAt: new Date().toISOString(),
      clickCount: 0,
    };

    links.push(newLink);
    await writeShortLinks({ links });

    // 환경 변수로 숏링크 도메인 설정, 없으면 현재 앱 도메인 사용
    const shortlinkDomain = process.env.SHORTLINK_DOMAIN || process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://www.cruisedot.co.kr';
    const shortUrl = `${shortlinkDomain}/p/${code}`;

    console.log('[ShortLink] Created:', { code, url, shortUrl, contractType, shortlinkDomain });

    return NextResponse.json({
      ok: true,
      code,
      shortUrl,
      url,
      message: '숏링크가 생성되었습니다.',
    });
  } catch (error: any) {
    console.error('[ShortLink] Create error:', error);
    return NextResponse.json(
      { ok: false, message: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
