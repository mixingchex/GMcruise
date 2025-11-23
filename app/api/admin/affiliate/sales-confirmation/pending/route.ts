// app/api/admin/affiliate/sales-confirmation/pending/route.ts
// 승인 대기 목록 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인
async function checkAdminAuth() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true },
        },
      },
    });

    if (!session || !session.User) return null;
    if (session.User.role !== 'admin') return null;
    return session.User;
  } catch (error) {
    return null;
  }
}

/**
 * GET: 승인 대기 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 2. 승인 대기 판매 조회
    const pendingSales = await prisma.affiliateSale.findMany({
      where: {
        status: 'PENDING_APPROVAL',
      },
      select: {
        id: true,
        productCode: true,
        saleAmount: true,
        saleDate: true,
        submittedAt: true,
        audioFileGoogleDriveUrl: true,
        audioFileName: true,
        audioFileType: true,
        AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile: {
          select: {
            id: true,
            displayName: true,
            nickname: true,
            affiliateCode: true,
            User: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile: {
          select: {
            id: true,
            displayName: true,
            nickname: true,
            affiliateCode: true,
            User: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        AffiliateLead: {
          select: {
            id: true,
            customerName: true,
            customerPhone: true,
          },
        },
        AffiliateProduct: {
          select: {
            productCode: true,
            title: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'asc', // 오래된 것부터
      },
    });

    return NextResponse.json({
      ok: true,
      sales: pendingSales.map((sale) => ({
        id: sale.id,
        productCode: sale.productCode,
        productTitle: sale.AffiliateProduct?.title,
        saleAmount: sale.saleAmount,
        saleDate: sale.saleDate,
        submittedAt: sale.submittedAt,
        audioFileGoogleDriveUrl: sale.audioFileGoogleDriveUrl,
        audioFileName: sale.audioFileName,
        audioFileType: sale.audioFileType,
        agent: sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile
          ? {
              name:
                sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile.displayName ||
                sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile.nickname ||
                sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile.User?.name ||
                null,
              code: sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile.affiliateCode,
              phone: sale.AffiliateProfile_AffiliateSale_agentIdToAffiliateProfile.User?.phone || null,
            }
          : null,
        manager: sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile
          ? {
              name:
                sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile.displayName ||
                sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile.nickname ||
                sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile.User?.name ||
                null,
              code: sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile.affiliateCode,
              phone: sale.AffiliateProfile_AffiliateSale_managerIdToAffiliateProfile.User?.phone || null,
            }
          : null,
        customer: sale.AffiliateLead
          ? {
              id: sale.AffiliateLead.id,
              customerName: sale.AffiliateLead.customerName,
              customerPhone: sale.AffiliateLead.customerPhone,
            }
          : null,
      })),
      count: pendingSales.length,
    });
  } catch (error: any) {
    console.error('[Sales Confirmation Pending] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}



