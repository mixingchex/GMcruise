import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const requestedLimit = parseInt(searchParams.get('limit') ?? `${DEFAULT_PAGE_SIZE}`, 10) || DEFAULT_PAGE_SIZE;
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return phone;
  return phone.replace(/[^0-9]/g, '');
}

export async function GET(req: NextRequest) {
  try {
    console.log('[admin/affiliate/leads][GET] Request started');
    
    // 인증 확인
    let sessionUser: { id: number; role: string | null } | null = null;
    try {
      const sid = cookies().get('cg.sid.v2')?.value;
      if (sid) {
        const sess = await prisma.session.findUnique({
          where: { id: sid },
          select: { User: { select: { id: true, role: true } } },
        });
        if (sess?.User) {
          sessionUser = { id: sess.User.id, role: sess.User.role };
        }
      }
      console.log('[admin/affiliate/leads][GET] Session check result:', sessionUser ? 'found' : 'null');
    } catch (authError: any) {
      console.error('[admin/affiliate/leads][GET] Auth error:', authError);
      console.error('[admin/affiliate/leads][GET] Auth error message:', authError?.message);
      return NextResponse.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 });
    }

    if (!sessionUser) {
      console.log('[admin/affiliate/leads][GET] No session user');
      return NextResponse.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 });
    }

    if (sessionUser.role !== 'admin') {
      console.log('[admin/affiliate/leads][GET] Not admin, role:', sessionUser.role);
      return NextResponse.json({ ok: false, message: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    console.log('[admin/affiliate/leads][GET] Admin authenticated, proceeding with query');

    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePagination(searchParams);

    // 필터 파라미터
    const customerName = searchParams.get('customerName')?.trim() || null;
    const customerPhone = searchParams.get('customerPhone')?.trim() || null;
    const status = searchParams.get('status') || null;
    const managerId = searchParams.get('managerId') ? parseInt(searchParams.get('managerId')!, 10) : null;
    const agentId = searchParams.get('agentId') ? parseInt(searchParams.get('agentId')!, 10) : null;

    // WHERE 조건 구성
    const where: Prisma.AffiliateLeadWhereInput = {};

    // 검색 조건 (이름 또는 전화번호)
    if (customerName || customerPhone) {
      const searchConditions: Prisma.AffiliateLeadWhereInput[] = [];
      
      if (customerName) {
        searchConditions.push({
          customerName: { contains: customerName },
        });
      }
      
      if (customerPhone) {
        const normalizedPhone = normalizePhone(customerPhone);
        if (normalizedPhone) {
          searchConditions.push({
            customerPhone: { contains: normalizedPhone },
          });
        }
      }

      if (searchConditions.length > 0) {
        where.OR = searchConditions;
      }
    }

    // 상태 필터
    if (status) {
      where.status = status as any;
    }

    // 담당자 필터
    if (managerId) {
      where.managerId = managerId;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    // 총 개수 조회
    let total = 0;
    let leads: any[] = [];
    
    try {
      console.log('[admin/affiliate/leads][GET] Counting leads with where:', JSON.stringify(where));
      total = await prisma.affiliateLead.count({ where });
      console.log('[admin/affiliate/leads][GET] Count result:', total);
    } catch (countError: any) {
      console.error('[admin/affiliate/leads][GET] Count error:', countError);
      console.error('[admin/affiliate/leads][GET] Count error message:', countError?.message);
      console.error('[admin/affiliate/leads][GET] Count error code:', countError?.code);
      throw countError;
    }

    // Leads 조회
    try {
      console.log('[admin/affiliate/leads][GET] Fetching leads, skip:', skip, 'take:', limit);
      leads = await prisma.affiliateLead.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: {
        AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile: {
          select: {
            id: true,
            affiliateCode: true,
            displayName: true,
            branchLabel: true,
          },
        },
        AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile: {
          select: {
            id: true,
            affiliateCode: true,
            displayName: true,
            branchLabel: true,
          },
        },
        _count: {
          select: {
            AffiliateInteraction: true,
            AffiliateSale: true,
          },
        },
      },
    });
      console.log('[admin/affiliate/leads][GET] Query successful, found', leads.length, 'leads');
    } catch (queryError: any) {
      console.error('[admin/affiliate/leads][GET] Query error:', queryError);
      console.error('[admin/affiliate/leads][GET] Query error message:', queryError?.message);
      console.error('[admin/affiliate/leads][GET] Query error code:', queryError?.code);
      console.error('[admin/affiliate/leads][GET] Query error meta:', queryError?.meta);
      if (queryError?.stack) {
        console.error('[admin/affiliate/leads][GET] Query error stack:', queryError.stack);
      }
      throw queryError;
    }

    // 응답 데이터 형식화
    console.log('[admin/affiliate/leads][GET] Starting to format', leads.length, 'leads');
    const formattedLeads = leads.map((lead: any) => {
      try {
        const manager = lead.AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile;
        const agent = lead.AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile;
        
        const formatDate = (date: any) => {
          if (!date) return null;
          try {
            if (date instanceof Date) {
              return date.toISOString();
            }
            const parsed = new Date(date);
            if (isNaN(parsed.getTime())) {
              return null;
            }
            return parsed.toISOString();
          } catch {
            return null;
          }
        };

        const formatted = {
          id: lead.id,
          customerName: lead.customerName || null,
          customerPhone: lead.customerPhone || null,
          status: lead.status || null,
          passportRequestedAt: formatDate(lead.passportRequestedAt),
          passportCompletedAt: formatDate(lead.passportCompletedAt),
          lastContactedAt: formatDate(lead.lastContactedAt),
          createdAt: formatDate(lead.createdAt) || new Date().toISOString(),
          manager: manager
            ? {
                id: manager.id || null,
                affiliateCode: manager.affiliateCode || null,
                displayName: manager.displayName || null,
              }
            : null,
          agent: agent
            ? {
                id: agent.id || null,
                affiliateCode: agent.affiliateCode || null,
                displayName: agent.displayName || null,
              }
            : null,
          _count: {
            interactions: (lead._count?.AffiliateInteraction ?? 0) || 0,
            sales: (lead._count?.AffiliateSale ?? 0) || 0,
          },
        };
        return formatted;
      } catch (itemError: any) {
        console.error(`[admin/affiliate/leads][GET] Error formatting lead ${lead?.id || 'unknown'}:`, itemError);
        console.error(`[admin/affiliate/leads][GET] Lead data:`, JSON.stringify(lead, null, 2).substring(0, 200));
        // 기본 정보만 반환
        return {
          id: lead?.id || 0,
          customerName: lead?.customerName || null,
          customerPhone: lead?.customerPhone || null,
          status: lead?.status || null,
          passportRequestedAt: null,
          passportCompletedAt: null,
          lastContactedAt: null,
          createdAt: (() => {
            try {
              if (lead?.createdAt instanceof Date) {
                return lead.createdAt.toISOString();
              }
              if (lead?.createdAt) {
                const parsed = new Date(lead.createdAt);
                if (!isNaN(parsed.getTime())) {
                  return parsed.toISOString();
                }
              }
              return new Date().toISOString();
            } catch {
              return new Date().toISOString();
            }
          })(),
          manager: null,
          agent: null,
          _count: {
            interactions: 0,
            sales: 0,
          },
        };
      }
    });
    console.log('[admin/affiliate/leads][GET] Formatted', formattedLeads.length, 'leads successfully');
    
    return NextResponse.json({
      ok: true,
      leads: formattedLeads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[admin/affiliate/leads][GET] Error:', error);
    console.error('[admin/affiliate/leads][GET] Error message:', error?.message);
    console.error('[admin/affiliate/leads][GET] Error code:', error?.code);
    console.error('[admin/affiliate/leads][GET] Error meta:', error?.meta);
    if (error?.stack) {
      console.error('[admin/affiliate/leads][GET] Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        ok: false, 
        message: '고객 목록을 불러오지 못했습니다.',
        error: error?.message || String(error),
        ...(process.env.NODE_ENV === 'development' ? { 
          details: {
            message: error?.message,
            code: error?.code,
            meta: error?.meta,
            stack: error?.stack,
          }
        } : {})
      },
      { status: 500 }
    );
  }
}





