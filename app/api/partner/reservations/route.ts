export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerContext } from '@/app/api/partner/_utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/partner/reservations
 * 대리점장의 예약 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const { profile } = await requirePartnerContext();

    // 대리점장인 경우 팀 판매원들의 ID 목록 조회
    let teamAgentIds: number[] = [];
    if (profile.type === 'BRANCH_MANAGER') {
      const teamRelations = await prisma.affiliateRelation.findMany({
        where: {
          managerId: profile.id,
          status: 'ACTIVE',
        },
        select: {
          agentId: true,
        },
      });
      teamAgentIds = teamRelations
        .map(r => r.agentId)
        .filter((id): id is number => id !== null);
    }

    // 대리점장/판매원이 관리하는 Lead 조회
    // 대리점장인 경우: 자신이 managerId인 Lead + 팀 판매원들이 agentId인 Lead
    // 판매원인 경우: 자신이 agentId인 Lead
    const managedLeads = await prisma.affiliateLead.findMany({
      where: {
        OR: [
          { managerId: profile.id },
          { agentId: profile.id },
          // 대리점장인 경우 팀 판매원들이 관리하는 Lead도 포함
          ...(profile.type === 'BRANCH_MANAGER' && teamAgentIds.length > 0
            ? [{ agentId: { in: teamAgentIds } }]
            : []),
        ],
      },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        source: true,
      },
    });

    // 전화번호를 사용하여 User ID 찾기
    const managedUserIds = new Set<number>();
    
    // 전화번호로 매칭
    const uniquePhoneDigits = new Set<string>();
    managedLeads.forEach(lead => {
      const phone = lead.customerPhone;
      if (phone) {
        const digits = phone.replace(/[^0-9]/g, '');
        if (digits.length >= 10) {
          uniquePhoneDigits.add(digits);
        }
      }
    });

    if (uniquePhoneDigits.size > 0) {
      // 전화번호 변형 생성 (하이픈 포함/미포함)
      const phoneVariants = new Set<string>();
      uniquePhoneDigits.forEach(digits => {
        phoneVariants.add(digits); // 숫자만
        if (digits.length === 11) {
          phoneVariants.add(`${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`); // 010-1234-5678
        } else if (digits.length === 10) {
          phoneVariants.add(`${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`); // 010-123-4567
        }
      });

      const usersFromPhones = await prisma.user.findMany({
        where: {
          phone: { in: Array.from(phoneVariants) },
        },
        select: {
          id: true,
        },
      });
      usersFromPhones.forEach(user => managedUserIds.add(user.id));
    }

    const userIdArray = Array.from(managedUserIds);

    // 예약 목록 조회 (대리점장/판매원이 관리하는 고객의 예약)
    // 빈 배열일 때는 쿼리를 실행하지 않음
    let reservations: any[] = [];
    if (userIdArray.length > 0) {
      reservations = await prisma.reservation.findMany({
        where: {
          userId: { in: userIdArray },
        },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              customerSource: true,
              role: true,
              customerStatus: true,
              userTrips: {
                select: {
                  id: true,
                  cruiseName: true,
                  startDate: true,
                  endDate: true,
                },
                orderBy: {
                  startDate: 'desc',
                },
                take: 1,
              },
            },
          },
          Trip: {
            include: {
              Product: {
                select: {
                  cruiseLine: true,
                  shipName: true,
                  packageName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100, // 최대 100개
      });
    }

    // Customer 인터페이스 매핑 로직 (가이드 참고)
    const determineCustomerType = (customerSource: string | null, role: string | null): 'test' | 'cruise-guide' | 'mall' | 'prospect' | 'partner' | 'admin' | undefined => {
      if (customerSource === 'admin' || role === 'admin') {
        return 'admin';
      } else if (customerSource === 'mall-admin') {
        return 'admin';
      } else if (customerSource === 'mall-signup' || role === 'community') {
        return 'mall';
      } else if (customerSource === 'test-guide' || customerSource === 'test') {
        return 'test';
      } else if (customerSource === 'cruise-guide') {
        return 'cruise-guide';
      } else if (customerSource === 'affiliate-manual' || customerSource === 'product-inquiry' || customerSource === 'phone-consultation') {
        return 'prospect';
      }
      if (role === 'admin') {
        return 'admin';
      }
      return 'prospect';
    };

    // Lead 정보 조회 (affiliateOwnership을 위해)
    const leadMap = new Map<number, any>();
    if (managedLeads.length > 0) {
      const leadIds = managedLeads.map(l => l.id);
      const leadsWithProfiles = await prisma.affiliateLead.findMany({
        where: { id: { in: leadIds } },
        include: {
          AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile: {
            select: {
              id: true,
              displayName: true,
              affiliateCode: true,
              branchLabel: true,
            },
          },
          AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile: {
            select: {
              id: true,
              displayName: true,
              affiliateCode: true,
              branchLabel: true,
            },
          },
        },
      });
      leadsWithProfiles.forEach(lead => {
        // userId나 customerId로 매핑
        if (lead.userId) {
          leadMap.set(lead.userId, lead);
        }
        if (lead.customerId) {
          leadMap.set(lead.customerId, lead);
        }
      });
    }

    return NextResponse.json({
      ok: true,
      reservations: reservations.map((r) => {
        const user = r.User;
        const lead = user ? leadMap.get(user.id) : null;
        
        // Customer 인터페이스 매핑
        const customerType = user 
          ? determineCustomerType(user.customerSource, user.role)
          : 'prospect';
        
        // status 매핑
        let status: 'active' | 'package' | 'dormant' | 'locked' | 'test-locked' | undefined = 'active';
        if (user?.customerStatus) {
          const dbStatus = user.customerStatus;
          if (dbStatus === 'purchase_confirmed') {
            status = 'package';
          } else if (['active', 'package', 'dormant', 'locked', 'test-locked'].includes(dbStatus)) {
            status = dbStatus as typeof status;
          }
        }
        
        // affiliateOwnership 구성
        let affiliateOwnership: {
          ownerType: 'HQ' | 'BRANCH_MANAGER' | 'SALES_AGENT';
          ownerName: string | null;
          managerProfile: any | null;
        } | null = null;
        
        if (lead) {
          const agentProfile = lead.AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile;
          const managerProfile = lead.AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile;
          
          if (lead.agentId === profile.id && agentProfile) {
            affiliateOwnership = {
              ownerType: 'SALES_AGENT' as const,
              ownerName: agentProfile.displayName || null,
              managerProfile: managerProfile ? {
                id: managerProfile.id,
                displayName: managerProfile.displayName,
                affiliateCode: managerProfile.affiliateCode,
                branchLabel: managerProfile.branchLabel,
              } : null,
            };
          } else if (lead.managerId === profile.id && managerProfile) {
            affiliateOwnership = {
              ownerType: 'BRANCH_MANAGER' as const,
              ownerName: managerProfile.displayName || null,
              managerProfile: null,
            };
          }
        }
        
        // trips 매핑
        const trips = user?.userTrips?.map(trip => ({
          id: trip.id,
          cruiseName: trip.cruiseName,
          startDate: trip.startDate ? trip.startDate.toISOString() : null,
          endDate: trip.endDate ? trip.endDate.toISOString() : null,
        })) || [];
        
        return {
          id: r.id,
          totalPeople: r.totalPeople,
          pnrStatus: r.pnrStatus,
          createdAt: r.createdAt.toISOString(),
          user: {
            ...user,
            customerType,
            status,
            role: (user?.role as 'user' | 'admin' | undefined) || 'user',
            affiliateOwnership,
            trips,
          },
          trip: r.Trip ? {
            id: r.Trip.id,
            departureDate: r.Trip.departureDate?.toISOString() || null,
            product: r.Trip.Product,
          } : null,
        };
      }),
    });
  } catch (error: any) {
    console.error('GET /api/partner/reservations error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      status: error.status,
    });
    return NextResponse.json(
      { 
        ok: false, 
        message: error.message || '예약 목록 조회에 실패했습니다.',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

