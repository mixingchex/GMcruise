export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';
import { hashPassword, SYSTEM_PASSWORDS } from '@/lib/password';

// [WO-ADM-03] MarketingCustomer status 화이트리스트
// SharedCustomerDetailModal DEFAULT_STATUS_OPTIONS와 동기화 (7개 값)
const VALID_MARKETING_CUSTOMER_STATUSES = [
  'NEW', 'CONTACTED', 'IN_PROGRESS', 'PURCHASED',
  'REFUNDED', 'TEST_GUIDE', 'CLOSED',
] as const;

// [WO-QA-03] 날짜 필터 헬퍼 — 3중 중복 제거
// [WO-QA-04] isNaN 유효성 검증 포함
function buildCreatedAtFilter(
  inflowDateStart: string | null,
  inflowDateEnd: string | null,
  daySearch: string | null
): { gte?: Date; lte?: Date } | null {
  const filter: { gte?: Date; lte?: Date } = {};

  if (inflowDateStart) {
    const d = new Date(inflowDateStart);
    if (!isNaN(d.getTime())) filter.gte = d;
  }
  if (inflowDateEnd) {
    const d = new Date(inflowDateEnd);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      filter.lte = d;
    }
  }
  // inflowDateStart 없을 때만 daySearch로 gte 설정 (inflowDateStart 우선)
  if (daySearch && !filter.gte) {
    const days = parseInt(daySearch, 10);
    if (!isNaN(days) && days > 0) {
      const d = new Date();
      d.setDate(d.getDate() - days);
      filter.gte = d;
    }
  }

  return Object.keys(filter).length > 0 ? filter : null;
}

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

    if (!session || !session.User) return false;
    // [WO-SEC-18] 세션 만료 체크
    if (session.expiresAt && session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: sid } }).catch(() => {});
      return false;
    }
    return session.User.role === 'admin';
  } catch (error) {
    console.error('[Marketing Customers] Auth check error:', error);
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    
    if (!sid) {
      return NextResponse.json({ 
        ok: false, 
        error: '인증이 필요합니다.' 
      }, { status: 403 });
    }

    const isAdmin = await checkAdminAuth(sid);
    if (!isAdmin) {
      return NextResponse.json({ 
        ok: false, 
        error: '관리자 권한이 필요합니다.' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    // [WO-ADM-01 일관성] mall-customers와 동일한 NaN guard 패턴 적용
    const pageRaw = parseInt(searchParams.get('page') || '1');
    const limitRaw = parseInt(searchParams.get('limit') || '50');
    const page = isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const limit = isNaN(limitRaw) || limitRaw < 1 ? 50 : Math.min(limitRaw, 200); // DoS 방어: 최대 200
    const status = searchParams.get('status');
    const accountId = searchParams.get('accountId');
    const search = searchParams.get('search');
    const includeGroups = searchParams.get('includeGroups');
    const includeGroupsOperator = searchParams.get('includeGroupsOperator') || 'OR';
    const excludeGroups = searchParams.get('excludeGroups');
    const inflowDateStart = searchParams.get('inflowDateStart');
    const inflowDateEnd = searchParams.get('inflowDateEnd');
    const daySearch = searchParams.get('daySearch');

    const skip = (page - 1) * limit;

    // 필터 조건 구성
    const where: any = {};
    
    if (status && status !== 'ALL') {
      // [WO-ADM-03] 화이트리스트 검증 — 비정의 status값 필터 무시 (전체 조회)
      if ((VALID_MARKETING_CUSTOMER_STATUSES as readonly string[]).includes(status)) {
        where.status = status;
      }
    }

    if (accountId) {
      // [WO-ADM-02] parseInt NaN 검증
      const accountIdInt = parseInt(accountId, 10);
      if (!isNaN(accountIdInt)) {
        where.accountId = accountIdInt;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    // [WO-QA-03+04] 날짜 필터 헬퍼 적용 — 중복 제거 + isNaN 검증
    const createdAtFilter = buildCreatedAtFilter(inflowDateStart, inflowDateEnd, daySearch);
    if (createdAtFilter) where.createdAt = createdAtFilter;

    // 고객 목록 조회 - MarketingCustomer와 User 테이블 모두 조회
    let marketingCustomers: any[] = [];
    let userCustomers: any[] = [];
    
    try {
      // MarketingCustomer 테이블 조회
      marketingCustomers = await prisma.marketingCustomer.findMany({
        where,
        include: {
          MarketingAccount: {
            select: {
              accountName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      });
    } catch (dbError: any) {
      // 테이블이 없는 경우 처리
      if (dbError?.message?.includes('does not exist') || dbError?.code === 'P2021') {
        console.error('[Marketing Customers] MarketingCustomer table does not exist. Using User table only.');
        marketingCustomers = [];
      } else {
        throw dbError;
      }
    }

    // MarketingCustomer가 없거나 적은 경우, User 테이블에서도 조회
    // 랜딩페이지로 유입된 고객 등이 User 테이블에만 있을 수 있음
    // User skip 계산을 위해 MarketingCustomer 총 개수 사전 조회
    const marketingTotalCount = await prisma.marketingCustomer.count({ where }).catch(() => 0);

    if (marketingCustomers.length < limit) {
      try {
        // User 테이블에서 랜딩페이지/마케팅 관련 고객 조회
        const userWhere: any = {
          role: { not: 'admin' },
          OR: [
            { customerSource: 'landing-page' },
            { customerSource: 'affiliate-manual' },
            { customerSource: 'affiliate-lead' },
            { customerSource: null }, // customerSource가 없는 고객도 포함
          ],
        };

        // 검색 조건 적용
        if (search) {
          userWhere.AND = [
            {
              OR: [
                { name: { contains: search } },
                { phone: { contains: search } },
                { email: { contains: search } },
              ],
            },
          ];
        }

        // [WO-QA-03+04] 날짜 필터 헬퍼 적용
        const userDateFilter = buildCreatedAtFilter(inflowDateStart, inflowDateEnd, daySearch);
        if (userDateFilter) {
          if (!userWhere.AND) userWhere.AND = [];
          userWhere.AND.push({ createdAt: userDateFilter });
        }

        // User skip: 전체 MarketingCustomer 수 기준으로 계산 (page 2+ 중복 방지)
        const userSkip = Math.max(0, skip - marketingTotalCount);

        const users = await prisma.user.findMany({
          where: userWhere,
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            customerSource: true,
            customerStatus: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: userSkip,
          take: limit - marketingCustomers.length,
        });

        // User를 MarketingCustomer 형식으로 변환
        // [WO-ADM-04] 음수 ID 사용 — MarketingCustomer (양수) ID와 충돌 방지
        userCustomers = users.map(user => ({
          id: -(user.id), // 음수: MarketingCustomer ID(양수)와 절대 충돌 없음
          name: user.name,
          phone: user.phone,
          email: user.email,
          source: user.customerSource || 'user',
          status: user.customerStatus === 'active' ? 'NEW' : user.customerStatus?.toUpperCase() || 'NEW',
          notes: null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          MarketingAccount: null,
        }));
      } catch (userError) {
        console.error('[Marketing Customers] User query error:', userError);
        userCustomers = [];
      }
    }

    // 두 결과 합치기
    const customers = [...marketingCustomers, ...userCustomers];

    // 고객의 phone과 email 목록 수집
    const phones = customers.map(c => c.phone).filter((p): p is string => Boolean(p) && typeof p === 'string');
    const emails = customers.map(c => c.email).filter((e): e is string => Boolean(e) && typeof e === 'string');

    // User와 그룹 정보 일괄 조회 (phone이나 email이 있을 때만)
    let users: any[] = [];
    if (phones.length > 0 || emails.length > 0) {
      const orConditions: any[] = [];
      if (phones.length > 0) {
        orConditions.push({ phone: { in: phones } });
      }
      if (emails.length > 0) {
        orConditions.push({ email: { in: emails } });
      }

      if (orConditions.length > 0) {
        try {
          users = await prisma.user.findMany({
            where: {
              OR: orConditions,
            },
            include: {
              CustomerGroupMember: {
                include: {
                  CustomerGroup: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                    },
                  },
                },
              },
            },
          });
        } catch (userError) {
          console.error('[Marketing Customers] User query error:', userError);
          // User 조회 실패해도 계속 진행 (그룹 정보만 없음)
          users = [];
        }
      }
    }

    // phone/email로 User 매핑
    const userMap = new Map<string, typeof users[0]>();
    users.forEach(user => {
      if (user.phone && typeof user.phone === 'string') {
        userMap.set(user.phone, user);
      }
      if (user.email && typeof user.email === 'string') {
        userMap.set(user.email, user);
      }
    });

    // 그룹 필터링
    const includeGroupIds = includeGroups ? includeGroups.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
    const excludeGroupIds = excludeGroups ? excludeGroups.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];

    // 고객의 phone 목록으로 AffiliateLead 조회 (대리점장 정보 확인용)
    const customerPhonesForLead = customers
      .map(c => c.phone)
      .filter((p): p is string => Boolean(p) && typeof p === 'string');
    
    const affiliateLeadsMap = new Map<string, {
      managerId: number | null;
      agentId: number | null;
      managerName: string | null;
      agentName: string | null;
      leadId: number;
    }>();

    if (customerPhonesForLead.length > 0) {
      try {
        const leads = await prisma.affiliateLead.findMany({
          where: {
            customerPhone: { in: customerPhonesForLead },
          },
          include: {
            AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile: {
              select: {
                id: true,
                displayName: true,
                branchLabel: true,
              },
            },
            AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        });

        leads.forEach(lead => {
          if (lead.customerPhone) {
            affiliateLeadsMap.set(lead.customerPhone, {
              managerId: lead.managerId,
              agentId: lead.agentId,
              managerName: lead.AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile?.displayName || 
                          lead.AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile?.branchLabel || null,
              agentName: lead.AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile?.displayName || null,
              leadId: lead.id,
            });
          }
        });
      } catch (leadError) {
        console.error('[Marketing Customers] AffiliateLead query error:', leadError);
      }
    }

    // 고객 데이터 변환 및 필터링
    let filteredCustomers = customers.map((customer) => {
      // User 찾기
      let user = null;
      if (customer.phone && typeof customer.phone === 'string') {
        user = userMap.get(customer.phone);
      }
      if (!user && customer.email && typeof customer.email === 'string') {
        user = userMap.get(customer.email);
      }
      
      const customerGroups = user?.CustomerGroupMember?.map(m => m.CustomerGroup).filter(Boolean) || [];

      // AffiliateLead 정보 확인
      const leadInfo = customer.phone ? affiliateLeadsMap.get(customer.phone) : null;
      const ownerName = leadInfo?.managerName || leadInfo?.agentName || null;

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        source: customer.source,
        status: customer.status,
        notes: customer.notes,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        account: customer.MarketingAccount,
        groups: customerGroups,
        ownerName: ownerName, // 대리점장/판매원 이름
        leadId: leadInfo?.leadId || null, // AffiliateInteraction 조회용
      };
    });

    // 포함 그룹 필터
    if (includeGroupIds.length > 0) {
      filteredCustomers = filteredCustomers.filter(customer => {
        const customerGroupIds = customer.groups
          .filter(g => g && g.id)
          .map(g => g.id);
        if (includeGroupsOperator === 'AND') {
          return includeGroupIds.every(id => customerGroupIds.includes(id));
        } else {
          return includeGroupIds.some(id => customerGroupIds.includes(id));
        }
      });
    }

    // 제외 그룹 필터
    if (excludeGroupIds.length > 0) {
      filteredCustomers = filteredCustomers.filter(customer => {
        const customerGroupIds = customer.groups
          .filter(g => g && g.id)
          .map(g => g.id);
        return !excludeGroupIds.some(id => customerGroupIds.includes(id));
      });
    }

    // 총 개수 계산
    let total = 0;
    try {
      const marketingCount = marketingTotalCount; // 중복 DB 호출 방지 (140번째 줄에서 이미 조회됨)

      // userCount도 동일한 검색/날짜 필터 적용 (페이지네이션 total 일치)
      const userCountWhere: any = {
        role: { not: 'admin' },
        OR: [
          { customerSource: 'landing-page' },
          { customerSource: 'affiliate-manual' },
          { customerSource: 'affiliate-lead' },
          { customerSource: null },
        ],
      };
      if (search) {
        userCountWhere.AND = [{ OR: [{ name: { contains: search } }, { phone: { contains: search } }, { email: { contains: search } }] }];
      }
      // [WO-QA-03+04] 날짜 필터 헬퍼 적용
      const countDateFilter = buildCreatedAtFilter(inflowDateStart, inflowDateEnd, daySearch);
      if (countDateFilter) {
        if (!userCountWhere.AND) userCountWhere.AND = [];
        userCountWhere.AND.push({ createdAt: countDateFilter });
      }

      const userCount = await prisma.user.count({ where: userCountWhere }).catch(() => 0);
      total = marketingCount + userCount;
    } catch (countError) {
      console.error('[Marketing Customers] Count error:', countError);
      total = includeGroups || excludeGroups ? filteredCustomers.length : customers.length;
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      ok: true,
      data: {
        customers: filteredCustomers,
        total,
        totalPages,
        currentPage: page,
      },
    });
  } catch (error) {
    console.error('[Marketing Customers] Error:', error);
    console.error('[Marketing Customers] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // [WO-ADM-04] 내부 에러 메시지 클라이언트 노출 금지 — OWASP A05
    return NextResponse.json({
      ok: false,
      error: '데이터를 불러오는데 실패했습니다.',
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    
    if (!sid) {
      return NextResponse.json({ 
        ok: false, 
        error: '인증이 필요합니다.' 
      }, { status: 403 });
    }

    const isAdmin = await checkAdminAuth(sid);
    if (!isAdmin) {
      return NextResponse.json({ 
        ok: false, 
        error: '관리자 권한이 필요합니다.' 
      }, { status: 403 });
    }

    const body = await req.json();
    const { accountId, name, email, phone, source, notes, groupIds } = body;

    // 기본 계정 찾기 (accountId가 없으면 첫 번째 계정 사용)
    let account;
    if (accountId) {
      account = await prisma.marketingAccount.findUnique({
        where: { id: accountId },
      });
    } else {
      // accountId가 없으면 첫 번째 계정 사용
      account = await prisma.marketingAccount.findFirst();
    }

    if (!account) {
      // 계정이 없으면 자동 생성 (accountCode @unique, ownerId 필수)
      const adminSession = await prisma.session.findUnique({
        where: { id: sid },
        select: { userId: true },
      });
      // [WO-ADM-02] null guard: 세션 레이스 컨디션(동시 로그아웃 등) 대비
      if (!adminSession?.userId) {
        return NextResponse.json({
          ok: false,
          error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.',
        }, { status: 401 });
      }
      account = await prisma.marketingAccount.create({
        data: {
          accountName: '기본 계정',
          accountCode: `DEFAULT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ownerId: adminSession.userId,
          maxCustomers: 999999999, // 무제한
          currentCustomerCount: 0,
          updatedAt: new Date(),
        },
      });
    }

    // 고객 수 제한 제거 (무제한)

    // 고객 생성
    const customer = await prisma.marketingCustomer.create({
      data: {
        accountId: account.id,
        name,
        email,
        phone,
        source,
        notes,
        status: 'NEW',
        leadScore: 0,
      },
    });

    // 계정의 고객 수 업데이트
    await prisma.marketingAccount.update({
      where: { id: account.id },
      data: {
        currentCustomerCount: {
          increment: 1,
        },
      },
    });

    // 그룹에 추가 (phone 또는 email로 User 찾아서 그룹에 추가)
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      let user = null;
      if (phone) {
        user = await prisma.user.findFirst({
          where: { phone },
        });
      }
      
      if (!user && email) {
        user = await prisma.user.findFirst({
          where: { email },
        });
      }

      // User가 없으면 생성
      if (!user && phone) {
        user = await prisma.user.create({
          data: {
            name: name || null,
            phone,
            email: email || null,
            role: 'user',
            password: await hashPassword(SYSTEM_PASSWORDS.TEMP), // [WO-PAY-15 일관성] SYSTEM_PASSWORDS.TEMP 사용
          },
        });
      }

      if (user) {
        // 각 그룹에 추가
        for (const groupId of groupIds) {
          try {
            await prisma.customerGroupMember.upsert({
              where: {
                groupId_userId: {
                  groupId,
                  userId: user.id,
                },
              },
              create: {
                groupId,
                userId: user.id,
                addedBy: (await prisma.session.findFirst({
                  where: { id: sid },
                  select: { userId: true },
                }))?.userId || null,
              },
              update: {},
            });
          } catch (error) {
            console.error(`Failed to add user to group ${groupId}:`, error);
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      data: customer,
    });
  } catch (error) {
    console.error('[Marketing Customers] Create error:', error);
    return NextResponse.json({
      ok: false,
      error: '고객 생성에 실패했습니다.',
    }, { status: 500 });
  }
}
