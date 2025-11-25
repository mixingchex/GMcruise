export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// 본사 전화번호 목록 (전혜선, 배연성)
const HQ_PHONES = ['01024958013', '01038609161', '010-2495-8013', '010-3860-9161'];

/**
 * 전화번호가 본사인지 확인
 */
function isHQPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const normalized = phone.replace(/-/g, '');
  return HQ_PHONES.includes(normalized);
}

/**
 * GET /api/affiliate/my-mentor
 * 현재 로그인한 사용자의 담당 멘토 정보 조회
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 현재 사용자의 AffiliateProfile 조회 (전화번호 포함)
    const currentProfile = await prisma.affiliateProfile.findFirst({
      where: {
        userId: sessionUser.id,
      },
      select: {
        id: true,
        type: true,
        User: {
          select: {
            phone: true,
          },
        },
      },
    });

    if (!currentProfile) {
      // 프로필이 없으면 본사로 반환 (고정값)
      return NextResponse.json({
        ok: true,
        mentor: {
          name: '전혜선',
          phone: '01024958013',
          role: '본사',
          isBranchManager: false,
        },
      });
    }

    // 대리점장인 경우: 본사 전화번호인지 확인
    if (currentProfile.type === 'BRANCH_MANAGER') {
      const userPhone = currentProfile.User?.phone;
      
      // 본사 전화번호면 본사로 반환
      if (isHQPhone(userPhone)) {
        const normalizedPhone = userPhone?.replace(/-/g, '') || '';
        // 전혜선인지 배연성인지 확인
        if (normalizedPhone === '01024958013') {
          return NextResponse.json({
            ok: true,
            mentor: {
              name: '전혜선',
              phone: '01024958013',
              role: '본사',
              isBranchManager: false,
            },
          });
        } else if (normalizedPhone === '01038609161') {
          return NextResponse.json({
            ok: true,
            mentor: {
              name: '배연성',
              phone: '01038609161',
              role: '본사',
              isBranchManager: false,
            },
          });
        }
      }
      
      // 본사 전화번호가 아니면 본사가 담당 멘토 (고정값)
      return NextResponse.json({
        ok: true,
        mentor: {
          name: '전혜선',
          phone: '01024958013',
          role: '본사',
          isBranchManager: false,
        },
      });
    }

    // 판매원인 경우: AffiliateRelation에서 담당 대리점장 찾기
    if (currentProfile.type === 'SALES_AGENT') {
      const relation = await prisma.affiliateRelation.findFirst({
        where: {
          agentId: currentProfile.id,
          status: 'ACTIVE',
        },
        include: {
          AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile: {
            select: {
              id: true,
              displayName: true,
              contactPhone: true,
              type: true,
              User: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
          },
        },
      });

      if (relation && relation.AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile) {
        const managerProfile = relation.AffiliateProfile_AffiliateRelation_managerIdToAffiliateProfile;
        const mentorPhone = managerProfile.contactPhone || managerProfile.User?.phone || '';
        
        // 담당 멘토가 본사 전화번호인지 확인
        if (isHQPhone(mentorPhone)) {
          const normalizedPhone = mentorPhone.replace(/-/g, '');
          // 전혜선인지 배연성인지 확인
          if (normalizedPhone === '01024958013') {
            return NextResponse.json({
              ok: true,
              mentor: {
                name: '전혜선',
                phone: '01024958013',
                role: '본사',
                isBranchManager: false,
              },
            });
          } else if (normalizedPhone === '01038609161') {
            return NextResponse.json({
              ok: true,
              mentor: {
                name: '배연성',
                phone: '01038609161',
                role: '본사',
                isBranchManager: false,
              },
            });
          }
        }
        
        // 본사가 아니면 대리점장
        const mentorName = managerProfile.displayName || managerProfile.User?.name || '대리점장';

        return NextResponse.json({
          ok: true,
          mentor: {
            name: mentorName,
            phone: mentorPhone,
            role: '대리점장',
            isBranchManager: true,
            profileId: managerProfile.id,
          },
        });
      }
    }

    // 기본값: 본사 (고정값)
    return NextResponse.json({
      ok: true,
      mentor: {
        name: '전혜선',
        phone: '01024958013',
        role: '본사',
        isBranchManager: false,
      },
    });
  } catch (error: any) {
    console.error('[My Mentor API] Error:', error);
    return NextResponse.json(
      { ok: false, message: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
