export const dynamic = 'force-dynamic';

// app/api/admin/mall/products/[productCode]/route.ts
// MallProductContent의 layout 필드 업데이트

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cg.sid.v2';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ productCode: string }> }
) {
  try {
    // SAVE-01: cg.sid.v2 쿠키 기반 인증 (메인 PUT과 동일한 방식)
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sid) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { User: { select: { role: true } } },
    });
    if (session?.User.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // SAVE-02: Next.js 15 async params
    const { productCode } = await params;
    const { layout } = await req.json();

    if (!layout) {
      return NextResponse.json({ ok: false, message: 'Layout data required' }, { status: 400 });
    }

    // 기존 MallProductContent 조회
    const existingContent = await prisma.mallProductContent.findUnique({
      where: { productCode },
      select: { layout: true },
    });

    // 기존 layout과 병합 (기존 데이터 유지)
    let mergedLayout = layout;
    if (existingContent?.layout) {
      const existingLayout = typeof existingContent.layout === 'string'
        ? JSON.parse(existingContent.layout)
        : existingContent.layout;
      mergedLayout = {
        ...existingLayout,
        ...layout,
      };
    }

    // MallProductContent 업데이트 또는 생성
    const productContent = await prisma.mallProductContent.upsert({
      where: { productCode },
      update: {
        layout: mergedLayout,
        updatedAt: new Date(),
      },
      create: {
        productCode,
        layout: mergedLayout,
        isActive: true,
        updatedAt: new Date(), // SAVE-03: create 시 updatedAt 명시
      },
    });

    return NextResponse.json({ ok: true, productContent });
  } catch (error) {
    console.error('PUT /api/admin/mall/products/[productCode] error:', error);
    return NextResponse.json({ ok: false, message: 'Server error' }, { status: 500 });
  }
}
