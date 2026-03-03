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

    // 원본 상품 조회 (MallProductContent + AffiliateProduct 포함)
    const original = await prisma.cruiseProduct.findUnique({
      where: { productCode },
      include: {
        MallProductContent: true,
        AffiliateProduct: true,
      },
    });

    if (!original) {
      return NextResponse.json({ ok: false, error: '원본 상품을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 새 상품 코드 생성: 원본 PREFIX 유지 + 새 4자리 랜덤 숫자
    // 예) REC-MD-1400 복사 → REC-MD-4521 (REC-MD PREFIX 유지)
    const now = new Date();

    // PREFIX 추출: 마지막 '-XXXX'(숫자로 시작하는 세그먼트) 제거
    const parts = productCode.split('-');
    const lastPart = parts[parts.length - 1];
    const isLastPartNumeric = parts.length > 1 && /^\d+$/.test(lastPart); // 전체가 숫자인 세그먼트만 제거
    const prefix = isLastPartNumeric ? parts.slice(0, -1).join('-') : productCode;

    // 랜덤 4자리 숫자 (1000~9999) — P2002 중복 충돌 시 재시도 안내
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newProductCode = `${prefix}-${randomNum}`;

    // 트랜잭션으로 CruiseProduct + MallProductContent + AffiliateProduct 함께 복사
    // (사전 중복 체크 없이 트랜잭션 내에서 P2002 에러로 처리 — TOCTOU 방지)
    try {
      await prisma.$transaction(async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, createdAt, updatedAt, MallProductContent, AffiliateProduct, ...rest } = original;

        // CruiseProduct 복사 — 원본 판매상태 그대로 유지 (몰 노출 여부 보존)
        const newProduct = await tx.cruiseProduct.create({
          data: {
            ...rest,
            productCode: newProductCode,
            packageName: `[복사] ${original.packageName}`,
            saleStatus: original.saleStatus, // 원본이 '판매중'이면 복사본도 즉시 몰 노출
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
              isActive: MallProductContent.isActive, // 원본 활성화 상태 그대로 복사
              updatedAt: now,
            },
          });
        }

        // AffiliateProduct 복사 — 원본 어필리에이트 상품이 있으면 새 코드로 함께 생성
        // (크루즈몰 노출을 위해 AffiliateProduct 존재 필수)
        if (AffiliateProduct && AffiliateProduct.length > 0) {
          for (const ap of AffiliateProduct) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _apId, createdAt: _apCreatedAt, updatedAt: _apUpdatedAt, effectiveFrom: _ef, effectiveTo: _et, ...apRest } = ap;
            await tx.affiliateProduct.create({
              data: {
                ...apRest,
                productCode: newProductCode,
                cruiseProductId: newProduct.id,
                effectiveFrom: new Date(now.getTime() - 1000), // 1초 전 — 즉시 몰 노출 보장 (lte: now 조건 통과)
                effectiveTo: null,
                updatedAt: now,
                // 복사본은 항상 즉시 활성화 (원본 상태 무관하게 몰 노출 보장)
                status: 'active',
                isPublished: true,
              },
            });
          }
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
      message: `상품이 복사되었습니다. 새 상품 코드: ${newProductCode}`,
    });
  } catch (error) {
    console.error('[Product Copy] Error:', error);
    return NextResponse.json(
      { ok: false, error: '상품 복사 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
