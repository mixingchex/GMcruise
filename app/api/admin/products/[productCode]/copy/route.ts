export const dynamic = 'force-dynamic';

// app/api/admin/products/[productCode]/copy/route.ts
// 상품 복사 API — 기존 상품을 새 productCode로 복사

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cg.sid.v2';

async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  if (!sid) return false;
  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { User: { select: { role: true, } } },
    });
    // 세션 만료 체크
    if (session?.expiresAt && session.expiresAt < new Date()) return false;
    return session?.User?.role === 'admin';
  } catch {
    return false;
  }
}

// POST /api/admin/products/[productCode]/copy
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ productCode: string }> }
) {
  try {
    const { productCode } = await params;
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;

    const isAdmin = await checkAdminAuth(sid);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 원본 상품 조회 (MallProductContent 포함)
    const original = await prisma.cruiseProduct.findUnique({
      where: { productCode },
      include: { MallProductContent: true },
    });

    if (!original) {
      return NextResponse.json({ ok: false, error: '원본 상품을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 새 상품 코드 생성: 원본코드_COPY_YYYYMMDDHHMMSS
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const newProductCode = `${productCode}_COPY_${timestamp}`;

    // 트랜잭션으로 CruiseProduct + MallProductContent 함께 복사
    // (사전 중복 체크 없이 트랜잭션 내에서 P2002 에러로 처리 — TOCTOU 방지)
    try {
      await prisma.$transaction(async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, createdAt, updatedAt, MallProductContent, ...rest } = original;

        await tx.cruiseProduct.create({
          data: {
            ...rest,
            productCode: newProductCode,
            packageName: `[복사] ${original.packageName}`,
            saleStatus: '판매중지', // 복사 상품은 기본 판매중지로 생성
            itineraryPattern: original.itineraryPattern ?? {},
            tags: original.tags ?? [],
            updatedAt: now,
          },
        });

        // MallProductContent 복사 (있는 경우) — fonts, customCss 포함 전체 복사
        if (MallProductContent) {
          await tx.mallProductContent.create({
            data: {
              productCode: newProductCode,
              layout: MallProductContent.layout ?? {},
              thumbnail: MallProductContent.thumbnail,
              images: MallProductContent.images ?? [],
              videos: MallProductContent.videos ?? [],
              fonts: MallProductContent.fonts ?? undefined,
              customCss: MallProductContent.customCss ?? undefined,
              isActive: false, // 복사 상품은 비활성으로 생성
              updatedAt: now,
            },
          });
        }
      });
    } catch (txError: unknown) {
      // 중복 productCode 처리 (Prisma P2002)
      if (txError && typeof txError === 'object' && 'code' in txError && (txError as { code: string }).code === 'P2002') {
        return NextResponse.json({ ok: false, error: '복사 코드가 이미 존재합니다. 다시 시도해주세요.' }, { status: 409 });
      }
      throw txError;
    }

    return NextResponse.json({
      ok: true,
      newProductCode,
      message: `상품이 복사되었습니다. 새 상품 코드: ${newProductCode}\n※ 크루즈몰 노출을 위해 어필리에이트 상품 등록이 필요합니다.`,
    });
  } catch (error) {
    console.error('[Product Copy] Error:', error);
    return NextResponse.json(
      { ok: false, error: '상품 복사 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
