export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { redirect } from 'next/navigation';
import { PartnerApiError, requirePartnerContext } from '@/app/api/partner/_utils';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import PartnerDashboard from './PartnerDashboard';

export default async function PartnerDashboardPage({ params }: { params: { partnerId: string } }) {
  try {
    const partnerId = params.partnerId;
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      redirect('/partner');
    }

    // Check if admin
    const isAdmin = sessionUser.role === 'admin';

    // For non-admin users, require partner context
    let profile;
    if (!isAdmin) {
      const context = await requirePartnerContext();
      profile = context.profile;

      // If not viewing own dashboard, redirect to own dashboard
      if (profile.User?.mallUserId !== partnerId) {
        redirect(`/partner/${profile.User?.mallUserId ?? ''}/dashboard`);
      }
    }

    // Fetch the target user by mallUserId
    const targetUser = await prisma.user.findFirst({
      where: { mallUserId: partnerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        mallUserId: true,
        mallNickname: true,
      },
    });

    if (!targetUser?.mallUserId) {
      redirect('/partner');
    }

    // Fetch the target user's profile
    let targetProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: targetUser.id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            mallUserId: true,
            mallNickname: true,
          },
        },
        AffiliateRelation_AffiliateRelation_agentIdToAffiliateProfile: {
          where: { status: 'ACTIVE' },
          select: {
            managerId: true,
            AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile: {
              select: {
                id: true,
                affiliateCode: true,
                type: true,
                displayName: true,
                branchLabel: true,
                contactPhone: true,
                contactEmail: true,
              },
            },
          },
        },
      },
    });

    // AffiliateProfile이 없으면 생성 (기존 사용자 대응)
    if (!targetProfile && targetUser.id === sessionUser.id) {
      const isBoss = targetUser.phone?.toLowerCase().startsWith('boss') || targetUser.mallUserId?.toLowerCase().startsWith('boss');
      const { randomBytes } = await import('crypto');
      const affiliateCode = `AFF-${(targetUser.mallUserId || partnerId).toUpperCase()}-${randomBytes(2)
        .toString('hex')
        .toUpperCase()}`;
      const now = new Date();
      
      try {
        targetProfile = await prisma.affiliateProfile.create({
          data: {
            userId: targetUser.id,
            affiliateCode,
            type: isBoss ? 'BRANCH_MANAGER' : 'SALES_AGENT',
            status: 'ACTIVE',
            displayName: targetUser.mallNickname || targetUser.mallUserId || '파트너',
            nickname: targetUser.mallNickname || targetUser.mallUserId || '파트너',
            branchLabel: null,
            landingSlug: targetUser.mallUserId || partnerId || undefined,
            landingAnnouncement: '파트너 전용 샘플 계정입니다.',
            welcomeMessage: '반갑습니다! 파트너몰 테스트 계정입니다.',
            updatedAt: now,
          },
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                mallUserId: true,
                mallNickname: true,
              },
            },
            AffiliateRelation_AffiliateRelation_agentIdToAffiliateProfile: {
              where: { status: 'ACTIVE' },
              select: {
                managerId: true,
                AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile: {
                  select: {
                    id: true,
                    affiliateCode: true,
                    type: true,
                    displayName: true,
                    branchLabel: true,
                    contactPhone: true,
                    contactEmail: true,
                  },
                },
              },
            },
          },
        });
      } catch (createError: any) {
        console.error('[Partner Dashboard] AffiliateProfile 생성 실패:', createError);
        // 중복 키 에러인 경우 다시 조회
        if (createError?.code === 'P2002') {
          targetProfile = await prisma.affiliateProfile.findFirst({
            where: { userId: targetUser.id },
            include: {
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  mallUserId: true,
                  mallNickname: true,
                },
              },
              AffiliateRelation_AffiliateRelation_agentIdToAffiliateProfile: {
                where: { status: 'ACTIVE' },
                select: {
                  managerId: true,
                  AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile: {
                    select: {
                      id: true,
                      affiliateCode: true,
                      type: true,
                      displayName: true,
                      branchLabel: true,
                      contactPhone: true,
                      contactEmail: true,
                    },
                  },
                },
              },
            },
          });
        }
      }
    }

    if (!targetProfile) {
      redirect('/partner');
    }

    return <PartnerDashboard user={targetUser} profile={targetProfile} />;
  } catch (error) {
    if (error instanceof PartnerApiError && error.status === 401) {
      redirect('/partner');
    }
    redirect('/partner');
  }
}
