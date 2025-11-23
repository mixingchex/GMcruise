import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      return NextResponse.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 });
    }

    const userId = sessionUser.id;

    // 사용자 프로필 확인
    const userProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: userId },
      select: { id: true, type: true },
    });

    const isBranchManager = userProfile?.type === 'BRANCH_MANAGER';

    // 사용자의 AffiliateContract 조회 (실제 계약서 정보)
    let contract = await prisma.affiliateContract.findFirst({
      where: {
        userId: userId,
      },
      include: {
        User_AffiliateContract_userIdToUser: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            mallUserId: true,
            mallNickname: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // 대리점장인 경우: 자신이 초대한 판매원들의 완료된 계약서도 포함
    let completedAgentContracts: any[] = [];
    if (isBranchManager && userProfile) {
      const agentContracts = await prisma.affiliateContract.findMany({
        where: {
          invitedByProfileId: userProfile.id,
          status: 'completed',
        },
        include: {
          User_AffiliateContract_userIdToUser: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              mallUserId: true,
              mallNickname: true,
            },
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
      });
      completedAgentContracts = agentContracts;
    }

    // 대리점장이고 자신의 계약서가 없지만 완료된 판매원 계약서가 있는 경우
    if (isBranchManager && !contract && completedAgentContracts.length > 0) {
      // 첫 번째 완료된 판매원 계약서를 기본으로 표시
      contract = completedAgentContracts[0] as any;
    }

    if (!contract) {
      return NextResponse.json({ 
        ok: true, 
        contract: null,
        completedAgentContracts: isBranchManager ? completedAgentContracts : [],
      });
    }

    // 담당 멘토 정보 조회
    let mentorInfo = null;
    if (contract.invitedByProfileId) {
      // 계약서에 invitedByProfileId가 있으면 그게 담당 멘토 (대리점장)
      const mentorProfile = await prisma.affiliateProfile.findUnique({
        where: { id: contract.invitedByProfileId },
        select: {
          id: true,
          displayName: true,
          affiliateCode: true,
          branchLabel: true,
          contactPhone: true,
          contactEmail: true,
          type: true,
        },
      });
      if (mentorProfile) {
        mentorInfo = {
          id: mentorProfile.id,
          displayName: mentorProfile.displayName,
          affiliateCode: mentorProfile.affiliateCode,
          branchLabel: mentorProfile.branchLabel,
          contactPhone: mentorProfile.contactPhone,
          contactEmail: mentorProfile.contactEmail,
          type: mentorProfile.type,
        };
      }
    } else {
      // 판매원인 경우 AffiliateRelation에서 대리점장 찾기
      const userProfile = await prisma.affiliateProfile.findFirst({
        where: { userId: userId },
        select: { id: true, type: true },
      });
      if (userProfile?.type === 'SALES_AGENT') {
        const relation = await prisma.affiliateRelation.findFirst({
          where: {
            agentId: userProfile.id,
            status: 'ACTIVE',
          },
          include: {
            AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile: {
              select: {
                id: true,
                displayName: true,
                affiliateCode: true,
                branchLabel: true,
                contactPhone: true,
                contactEmail: true,
                type: true,
              },
            },
          },
        });
        if (relation?.AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile) {
          const mentor = relation.AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile;
          mentorInfo = {
            id: mentor.id,
            displayName: mentor.displayName,
            affiliateCode: mentor.affiliateCode,
            branchLabel: mentor.branchLabel,
            contactPhone: mentor.contactPhone,
            contactEmail: mentor.contactEmail,
            type: mentor.type,
          };
        }
      } else if (userProfile?.type === 'BRANCH_MANAGER') {
        // 대리점장인 경우 본인이 담당 멘토
        const selfProfile = await prisma.affiliateProfile.findUnique({
          where: { id: userProfile.id },
          select: {
            id: true,
            displayName: true,
            affiliateCode: true,
            branchLabel: true,
            contactPhone: true,
            contactEmail: true,
            type: true,
          },
        });
        if (selfProfile) {
          mentorInfo = {
            id: selfProfile.id,
            displayName: selfProfile.displayName,
            affiliateCode: selfProfile.affiliateCode,
            branchLabel: selfProfile.branchLabel,
            contactPhone: selfProfile.contactPhone,
            contactEmail: selfProfile.contactEmail,
            type: selfProfile.type,
          };
        }
      }
    }

    // 아이디/비밀번호 정보 조회 (승인된 계약서인 경우)
    let accountInfo = null;
    if (contract.status === 'approved' || contract.status === 'completed') {
      const user = contract.User_AffiliateContract_userIdToUser;
      if (user?.mallUserId) {
        // 비밀번호는 metadata에 저장되어 있을 수 있음
        const metadata = contract.metadata as any;
        accountInfo = {
          mallUserId: user.mallUserId,
          mallNickname: user.mallNickname || null,
          password: metadata?.generatedPassword || metadata?.password || null,
          passwordGeneratedAt: metadata?.passwordGeneratedAt || null,
        };
      }
    }

    // 재계약 갱신일 계산
    const metadata = contract.metadata as any;
    let renewalDate = metadata?.renewalDate ? new Date(metadata.renewalDate) : null;
    
    // 재계약 갱신일이 없으면 승인일 또는 접수일로부터 1년 계산
    if (!renewalDate && (contract.status === 'approved' || contract.status === 'completed')) {
      const baseDate = contract.reviewedAt || contract.submittedAt;
      if (baseDate) {
        renewalDate = new Date(baseDate);
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
      }
    }

    // 프론트엔드 형식에 맞게 변환
    const formattedContract = {
      id: contract.id,
      userId: contract.userId,
      name: contract.name,
      phone: contract.phone,
      email: contract.email || contract.User_AffiliateContract_userIdToUser?.email || null,
      address: contract.address || '',
      bankName: contract.bankName || null,
      bankAccount: contract.bankAccount || null,
      bankAccountHolder: contract.bankAccountHolder || null,
      status: contract.status,
      submittedAt: contract.submittedAt?.toISOString() || null,
      reviewedAt: contract.reviewedAt?.toISOString() || null,
      consentPrivacy: true, // 기본값
      consentNonCompete: true, // 기본값
      consentDbUse: true, // 기본값
      consentPenalty: true, // 기본값
      metadata: {
        ...metadata,
        renewalDate: renewalDate?.toISOString() || null,
      },
      mentor: mentorInfo,
      accountInfo: accountInfo, // 아이디/비밀번호 정보 추가
    };

    // 대리점장인 경우 완료된 판매원 계약서 목록도 반환
    const formattedAgentContracts = completedAgentContracts.map((agentContract: any) => {
      const agentMetadata = agentContract.metadata as any;
      const agentAccountInfo = (agentContract.status === 'approved' || agentContract.status === 'completed') && agentContract.User_AffiliateContract_userIdToUser?.mallUserId ? {
        mallUserId: agentContract.User_AffiliateContract_userIdToUser.mallUserId,
        mallNickname: agentContract.User_AffiliateContract_userIdToUser.mallNickname || null,
        password: agentMetadata?.generatedPassword || agentMetadata?.password || null,
        passwordGeneratedAt: agentMetadata?.passwordGeneratedAt || null,
      } : null;

      return {
        id: agentContract.id,
        userId: agentContract.userId,
        name: agentContract.name,
        phone: agentContract.phone,
        email: agentContract.email || agentContract.User_AffiliateContract_userIdToUser?.email || null,
        status: agentContract.status,
        submittedAt: agentContract.submittedAt?.toISOString() || null,
        completedAt: agentMetadata?.completedAt || null,
        metadata: agentContract.metadata,
        accountInfo: agentAccountInfo,
        user: agentContract.User_AffiliateContract_userIdToUser,
      };
    });

    return NextResponse.json({ 
      ok: true, 
      contract: formattedContract,
      completedAgentContracts: isBranchManager ? formattedAgentContracts : [],
    });
  } catch (error: any) {
    console.error('[GET /api/affiliate/my-contract] error:', error);
    return NextResponse.json({ ok: false, message: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
