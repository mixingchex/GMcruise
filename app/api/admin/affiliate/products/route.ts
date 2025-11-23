import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import type { PricingMatrixRow } from './shared';
import { productInclude, serializeProduct, toSafeInt, parseLayoutPricing } from './shared';

const SESSION_COOKIE = 'cg.sid.v2';

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
    console.error('[Admin Affiliate Products] Auth check error:', error);
    return false;
  }
}

function normalizeNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.round(num);
}

interface TierInput {
  cabinType: string;
  saleAmount?: number | null;
  costAmount?: number | null;
  hqShareAmount?: number | null;
  branchShareAmount?: number | null;
  salesShareAmount?: number | null;
  overrideAmount?: number | null;
  currency?: string | null;
  metadata?: Prisma.JsonValue;
  pricingRowId?: string | null;
  fareCategory?: string | null;
  fareLabel?: string | null;
}

interface CreateAffiliateProductBody {
  productCode: string;
  title: string;
  cruiseProductId?: number | null;
  status?: string;
  currency?: string;
  defaultSaleAmount?: number | null;
  defaultCostAmount?: number | null;
  defaultNetRevenue?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isPublished?: boolean;
  tiers?: TierInput[];
  metadata?: Prisma.JsonValue;
}

function validateBody(body: CreateAffiliateProductBody) {
  if (!body.productCode?.trim()) {
    throw new Error('상품 코드를 입력해 주세요.');
  }
  if (!body.title?.trim()) {
    throw new Error('상품명을 입력해 주세요.');
  }
  if (!body.effectiveFrom) {
    throw new Error('적용 시작일을 입력해 주세요.');
  }
}

export async function GET() {
  try {
    // 관리자 권한 확인
    const sid = cookies().get(SESSION_COOKIE)?.value;
    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    console.log('[admin/affiliate/products][GET] Starting fetch...');
    
    const products = await prisma.affiliateProduct.findMany({
      include: productInclude,
      orderBy: { updatedAt: 'desc' },
    });

    console.log('[admin/affiliate/products][GET] Found products:', products.length);

    const productCodes = products.map((product) => product.productCode);
    const contentLayouts = productCodes.length
      ? await prisma.mallProductContent.findMany({
          where: { productCode: { in: productCodes } },
          select: { productCode: true, layout: true },
        })
      : [];

    console.log('[admin/affiliate/products][GET] Found content layouts:', contentLayouts.length);

    const pricingMatrixMap = new Map<string, PricingMatrixRow[]>();
    contentLayouts.forEach((entry) => {
      try {
        const layoutValue = entry.layout;
        pricingMatrixMap.set(entry.productCode, parseLayoutPricing(layoutValue));
      } catch (parseError) {
        console.error(`[admin/affiliate/products][GET] Error parsing layout for ${entry.productCode}:`, parseError);
        pricingMatrixMap.set(entry.productCode, []);
      }
    });

    const serializedProducts = products.map((product) => {
      try {
        return serializeProduct(product, pricingMatrixMap.get(product.productCode) ?? []);
      } catch (serializeError) {
        console.error(`[admin/affiliate/products][GET] Error serializing product ${product.productCode}:`, serializeError);
        // 기본 상품 정보만 반환
        return {
          id: product.id,
          productCode: product.productCode,
          title: product.title,
          status: product.status,
          currency: product.currency,
          defaultSaleAmount: product.defaultSaleAmount,
          defaultCostAmount: product.defaultCostAmount,
          defaultNetRevenue: product.defaultNetRevenue,
          isPublished: product.isPublished,
          publishedAt: product.publishedAt,
          effectiveFrom: product.effectiveFrom,
          effectiveTo: product.effectiveTo,
          updatedAt: product.updatedAt,
          cruiseProduct: product.cruiseProduct,
          commissionTiers: Array.isArray(product.commissionTiers) ? product.commissionTiers : [],
          pricingMatrix: [],
          stats: {
            totalLinks: 0,
            activeLinks: 0,
            totalConfirmedSales: 0,
            totalConfirmedAmount: 0,
          },
        };
      }
    });

    console.log('[admin/affiliate/products][GET] Successfully serialized products');
    
    return NextResponse.json({
      ok: true,
      products: serializedProducts,
    });
  } catch (error: any) {
    console.error('[admin/affiliate/products][GET] error', error);
    console.error('[admin/affiliate/products][GET] error stack:', error?.stack);
    console.error('[admin/affiliate/products][GET] error message:', error?.message);
    console.error('[admin/affiliate/products][GET] error name:', error?.name);
    
    // Prisma 에러 상세 정보
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('[admin/affiliate/products][GET] Prisma error code:', (error as any).code);
      console.error('[admin/affiliate/products][GET] Prisma error meta:', (error as any).meta);
    }
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : '상품 데이터를 불러오는 중 오류가 발생했습니다.';
    
    return NextResponse.json({ 
      ok: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 관리자 권한 확인
    const sid = cookies().get(SESSION_COOKIE)?.value;
    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    const data = (await request.json()) as CreateAffiliateProductBody;
    validateBody(data);

    const tiers = (data.tiers ?? []).map((tier) => ({
      cabinType: tier.cabinType,
      saleAmount: toSafeInt(tier.saleAmount),
      costAmount: toSafeInt(tier.costAmount),
      hqShareAmount: toSafeInt(tier.hqShareAmount),
      branchShareAmount: toSafeInt(tier.branchShareAmount),
      salesShareAmount: toSafeInt(tier.salesShareAmount),
      overrideAmount: toSafeInt(tier.overrideAmount),
      currency: tier.currency ?? data.currency ?? 'KRW',
      metadata: tier.metadata ?? undefined,
      pricingRowId: tier.pricingRowId ?? undefined,
      fareCategory: tier.fareCategory ?? undefined,
      fareLabel: tier.fareLabel ?? undefined,
    }));

    const isPublished = data.isPublished ?? true;

    const product = await prisma.affiliateProduct.create({
      data: {
        productCode: data.productCode.trim(),
        title: data.title.trim(),
        cruiseProductId: data.cruiseProductId ?? undefined,
        status: data.status ?? 'active',
        currency: data.currency ?? 'KRW',
        defaultSaleAmount: toSafeInt(data.defaultSaleAmount),
        defaultCostAmount: toSafeInt(data.defaultCostAmount),
        defaultNetRevenue: toSafeInt(data.defaultNetRevenue),
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
        metadata: data.metadata ?? undefined,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        commissionTiers: tiers.length
          ? {
              create: tiers,
            }
          : undefined,
      },
      include: productInclude,
    });

    const pricingMatrix = await prisma.mallProductContent.findUnique({
      where: { productCode: product.productCode },
      select: { layout: true },
    });

    return NextResponse.json(
      { ok: true, product: serializeProduct(product, parseLayoutPricing(pricingMatrix?.layout)) },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('[admin/affiliate/products][POST] error', error);
    const message = error instanceof Error ? error.message : '상품을 저장하는 중 오류가 발생했습니다.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
