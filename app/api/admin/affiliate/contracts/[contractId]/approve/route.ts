export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { updateContractStatus } from '@/app/api/affiliate/contracts/route';
import { profileInclude } from '@/app/api/admin/affiliate/profiles/shared';
import { randomBytes } from 'crypto';

function requireAdmin(role?: string | null) {
  if (role !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 });
  }
  return null;
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

/**
 * 파트너 아이디 생성 (숫자만 증가)
 * - 대리점장: boss1, boss2, boss3...
 * - 판매원: user1, user2, user3...
 * phone 필드에 저장됨
 */
async function generatePartnerId(type: 'BRANCH_MANAGER' | 'SALES_AGENT', name: string): Promise<string> {
  const prefix = type === 'BRANCH_MANAGER' ? 'boss' : 'user';
  
  // phone 필드에서 해당 prefix 형식 찾기 (이름 포함/미포함 모두)
  const existing = await prisma.user.findMany({
    where: {
      phone: {
        startsWith: prefix,
      },
    },
    select: { phone: true },
  });

  const used = new Set<number>();
  existing.forEach((record) => {
    if (!record.phone) return;
    // boss1 또는 boss1-홍길동 형식 모두 체크
    const match = record.phone.match(new RegExp(`^${prefix}(\\d{1,5})(?:-.*)?$`, 'i'));
    if (match) {
      const num = Number(match[1]);
      if (!Number.isNaN(num)) {
        used.add(num);
      }
    }
  });

  // 1부터 시작해서 사용 가능한 번호 찾기
  for (let i = 1; i <= 99999; i += 1) {
    if (!used.has(i)) {
      // 숫자만 반환 (이름 제거)
      return `${prefix}${i}`;
    }
  }

  throw new Error(`사용 가능한 ${type === 'BRANCH_MANAGER' ? '대리점장' : '판매원'} 아이디가 없습니다.`);
}

function generateAffiliateCode(name: string, id: number) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12);
  const suffix = randomBytes(2).toString('hex');
  return `AFF-${slug || 'partner'}-${suffix}-${id}`.toUpperCase();
}

export async function POST(req: NextRequest, { params }: { params: { contractId: string } }) {
  try {
    const contractId = Number(params.contractId);
    if (!contractId || Number.isNaN(contractId)) {
      return NextResponse.json({ ok: false, message: 'Invalid contract ID' }, { status: 400 });
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      console.error('[Approve Contract] No session user');
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { role: true } });
    console.log('[Approve Contract] Admin check:', { userId: sessionUser.id, role: admin?.role });
    if (!admin) {
      console.error('[Approve Contract] Admin user not found:', sessionUser.id);
      return NextResponse.json({ ok: false, message: 'Admin user not found' }, { status: 403 });
    }
    const guard = requireAdmin(admin.role);
    if (guard) {
      console.error('[Approve Contract] Admin access denied:', { userId: sessionUser.id, role: admin.role });
      return guard;
    }

    const contract = await prisma.affiliateContract.findUnique({
      where: { id: contractId },
      include: {
        User_AffiliateContract_userIdToUser: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ ok: false, message: 'Contract not found' }, { status: 404 });
    }

    if (contract.status === 'approved') {
      return NextResponse.json({ ok: false, message: '이미 승인된 계약입니다.' }, { status: 400 });
    }

    // 계약서 타입 결정
    const sourceMeta = (contract.metadata ?? {}) as Record<string, any>;
    const contractType = sourceMeta?.contractType as string | undefined;
    const invitedByProfileId = contract.invitedByProfileId || (sourceMeta?.invitedByProfileId as number | undefined);
    console.log('[Approve Contract] Contract info:', {
      contractId,
      contractType,
      invitedByProfileId,
      contractInvitedByProfileId: contract.invitedByProfileId,
      metadataInvitedByProfileId: sourceMeta?.invitedByProfileId,
    });
    
    // contractType이 있으면 우선 사용, 없으면 invitedByProfileId로 판단
    let partnerType: 'BRANCH_MANAGER' | 'SALES_AGENT' = 'SALES_AGENT';
    if (contractType === 'BRANCH_MANAGER') {
      partnerType = 'BRANCH_MANAGER';
    } else if (contractType === 'CRUISE_STAFF' || contractType === 'PRIMARKETER') {
      // 크루즈스탭과 프리마케터는 판매원 아이디로 생성되지만 타입은 SALES_AGENT
      partnerType = 'SALES_AGENT';
    } else if (!invitedByProfileId) {
      // contractType이 없고 invitedByProfileId도 없으면 대리점장
      partnerType = 'BRANCH_MANAGER';
    }

    // 파트너 아이디 생성 (이름 포함: boss1-홍길동, user1-김철수...)
    const partnerId = await generatePartnerId(partnerType, contract.name);

    let userId = contract.userId;
    let userRecord = contract.User_AffiliateContract_userIdToUser
      ? await prisma.user.findUnique({
          where: { id: contract.userId! },
          select: { id: true, phone: true, mallUserId: true, mallNickname: true, role: true, password: true },
        })
      : null;

    // 기존 사용자가 있고 이미 boss1/user1 형식이면 그대로 사용 (이름 포함/미포함 모두)
    const partnerIdPattern = partnerType === 'BRANCH_MANAGER' ? /^boss\d+(-.*)?$/i : /^user\d+(-.*)?$/i;
    if (userId && userRecord && userRecord.phone?.match(partnerIdPattern)) {
      // 이미 파트너 아이디가 있으면 그대로 사용
    } else if (!userId) {
      // 기존 사용자 확인 (phone으로)
      const normalizedPhone = normalizePhone(contract.phone);
      const digitsPhone = contract.phone.replace(/[^0-9]/g, '');
      
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ phone: normalizedPhone }, { phone: digitsPhone }],
        },
        select: { id: true, phone: true, mallUserId: true, mallNickname: true, role: true, password: true },
      });

      if (existingUser) {
        userId = existingUser.id;
        userRecord = existingUser;
        await prisma.affiliateContract.update({
          where: { id: contractId },
          data: { userId: existingUser.id },
        });
      } else {
        // 신규 사용자 생성: phone 필드에 user1, user2... 저장, 비밀번호 1101
        // 유효기간 60일 설정
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 60); // 60일 후
        const expiresAtStr = expiresAt.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        
        const newUser = await prisma.user.create({
          data: {
            name: contract.name,
            phone: partnerId, // phone 필드에 user1, user2... 저장
            email: contract.email || undefined,
            password: '1101', // 비밀번호 1101로 고정
            role: 'community',
            customerSource: 'affiliate-contract-approval',
            customerStatus: 'pending',
            adminMemo: `Auto-created from affiliate contract approval by admin ${sessionUser.id}. Valid until ${expiresAtStr}`,
            mallUserId: partnerId, // mallUserId에도 동일하게 저장 (호환성)
            mallNickname: contract.name,
          },
          select: { id: true, phone: true, mallUserId: true, mallNickname: true, role: true, password: true },
        });
        userId = newUser.id;
        userRecord = newUser;
        await prisma.affiliateContract.update({ where: { id: contractId }, data: { userId: newUser.id } });
      }
    }

    if (!userId) {
      return NextResponse.json({ ok: false, message: '연결된 사용자 정보가 없습니다.' }, { status: 400 });
    }

    if (!userRecord) {
      userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, phone: true, mallUserId: true, mallNickname: true, role: true, password: true },
      });
    }

    if (!userRecord) {
      return NextResponse.json({ ok: false, message: '사용자 정보를 불러올 수 없습니다.' }, { status: 404 });
    }

    // phone 필드가 boss1/user1 형식이 아니면 업데이트
    // 유효기간 60일 설정
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60); // 60일 후
    
    const updateData: Record<string, unknown> = {};
    if (!userRecord.phone || !userRecord.phone.match(partnerIdPattern)) {
      updateData.phone = partnerId;
      updateData.mallUserId = partnerId; // 호환성을 위해 mallUserId도 업데이트
    }
    if (!userRecord.mallNickname) {
      updateData.mallNickname = contract.name;
    }
    if (userRecord.role !== 'community') {
      updateData.role = 'community';
    }
    // 비밀번호가 1101이 아니면 1101로 설정
    if (userRecord.password !== '1101') {
      updateData.password = '1101';
      // 비밀번호 변경 이벤트 기록
      await prisma.passwordEvent.create({
        data: {
          userId: userRecord.id,
          from: userRecord.password,
          to: '1101',
          reason: `계약서 승인 시 자동 설정 (관리자 ID: ${sessionUser.id})`,
        },
      });
    }
    
    // User 모델에는 metadata 필드가 없으므로 adminMemo에 유효기간 정보 저장
    const expiresAtStr = expiresAt.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    const accountInfo = `계약서 승인 (${new Date().toISOString().split('T')[0]}) - 유효기간: ${expiresAtStr} (관리자 ID: ${sessionUser.id})`;
    
    // updateData에 adminMemo 추가 (기존 메모가 있으면 추가)
    if (Object.keys(updateData).length > 0) {
      const existingMemo = (userRecord as any).adminMemo || '';
      updateData.adminMemo = existingMemo 
        ? `${existingMemo}\n${accountInfo}`
        : accountInfo;
      
      const updated = await prisma.user.update({
        where: { id: userRecord.id },
        data: updateData,
        select: { phone: true, mallUserId: true, mallNickname: true, role: true, password: true },
      });
      userRecord = { ...userRecord, ...updated };
    }

    const finalPartnerId = userRecord.phone || partnerId;

    const existingProfile = await prisma.affiliateProfile.findUnique({ 
      where: { userId },
      include: profileInclude,
    });

    let profile;
    const now = new Date();

    if (existingProfile) {
      // 기존 프로필이 있으면 업데이트
      console.log('[Approve Contract] 기존 프로필 발견, 업데이트 진행:', {
        profileId: existingProfile.id,
        existingType: existingProfile.type,
        newType: partnerType,
        invitedByProfileId,
      });

      const updateData: Record<string, unknown> = {
        type: partnerType, // 타입 업데이트
        status: 'ACTIVE', // 상태 활성화
        displayName: contract.name, // 표시명 업데이트
        nickname: contract.name, // 닉네임 업데이트
        contactPhone: contract.phone, // 연락처 업데이트
        contactEmail: contract.email || null, // 이메일 업데이트
        bankName: contract.bankName || null, // 은행명 업데이트
        bankAccount: contract.bankAccount || null, // 계좌번호 업데이트
        bankAccountHolder: contract.bankAccountHolder || null, // 예금주 업데이트
        contractStatus: 'SIGNED', // 계약 상태: 서명됨
        contractSignedAt: now, // 계약 서명일
        published: true, // 노출: 활성화
        publishedAt: now, // 노출 시작일
        updatedAt: now, // 수정일
      };

      // branchLabel 업데이트 (대리점장인 경우만)
      if (partnerType === 'BRANCH_MANAGER' && !invitedByProfileId) {
        updateData.branchLabel = contract.name;
      }

      // landingSlug 업데이트
      if (finalPartnerId) {
        updateData.landingSlug = finalPartnerId;
      }

      // metadata 업데이트
      const existingMetadata = (existingProfile.metadata as Record<string, any>) || {};
      updateData.metadata = {
        ...existingMetadata,
        invitedByProfileId: invitedByProfileId || existingMetadata.invitedByProfileId,
        approvedAt: now.toISOString(),
        approvedBy: sessionUser.id,
        contractId: contractId,
      };

      profile = await prisma.affiliateProfile.update({
        where: { id: existingProfile.id },
        data: updateData as any,
        include: profileInclude,
      });

      console.log('[Approve Contract] 기존 프로필 업데이트 완료:', {
        profileId: profile.id,
        type: profile.type,
      });
    } else {
      // 기존 프로필이 없으면 새로 생성
      const affiliateCode = generateAffiliateCode(contract.name, contract.id);

      // 프로필 생성 시 모든 필수 필드 채우기
      const payload: Record<string, unknown> = {
      userId: userId, // userId 직접 사용 (connect 대신)
      affiliateCode,
      type: partnerType,
      status: 'ACTIVE', // 상태: 활성
      displayName: contract.name, // 표시명
      branchLabel: invitedByProfileId ? null : (partnerType === 'BRANCH_MANAGER' ? contract.name : undefined), // 지점명 (대리점장인 경우)
      nickname: contract.name, // 닉네임
      contactPhone: contract.phone, // 연락처
      contactEmail: contract.email || null, // 이메일
      bankName: contract.bankName || null, // 은행명
      bankAccount: contract.bankAccount || null, // 계좌번호
      bankAccountHolder: contract.bankAccountHolder || null, // 예금주
      withholdingRate: 3.3, // 원천징수율
      contractStatus: 'SIGNED', // 계약 상태: 서명됨
      contractSignedAt: now, // 계약 서명일
      published: true, // 노출: 활성화
      publishedAt: now, // 노출 시작일
      updatedAt: now, // 수정일 (필수 필드)
      metadata: invitedByProfileId
        ? {
            invitedByProfileId,
            createdAt: now.toISOString(),
            createdBy: sessionUser.id,
          }
        : {
            createdAt: now.toISOString(),
            createdBy: sessionUser.id,
          },
    };

    // landingSlug는 phone 필드의 user1, user2... 사용
    if (!payload.landingSlug && finalPartnerId) {
      payload.landingSlug = finalPartnerId;
    }

      profile = await prisma.affiliateProfile.create({
        data: payload as any,
        include: profileInclude,
      });

      console.log('[Approve Contract] 새 프로필 생성 완료:', {
        profileId: profile.id,
        type: profile.type,
        affiliateCode: profile.affiliateCode,
      });
    }

    // AffiliateRelation 생성/업데이트 (기존 프로필이든 새 프로필이든 모두 처리)
    if (invitedByProfileId) {
      console.log('[Approve Contract] Creating/Updating AffiliateRelation:', {
        managerId: invitedByProfileId,
        agentId: profile.id,
        profileType: profile.type,
        isExistingProfile: !!existingProfile,
      });
      const relationNow = new Date();
      const relation = await prisma.affiliateRelation.upsert({
        where: {
          managerId_agentId: {
            managerId: invitedByProfileId,
            agentId: profile.id,
          },
        },
        create: {
          managerId: invitedByProfileId,
          agentId: profile.id,
          status: 'ACTIVE',
          connectedAt: relationNow,
          updatedAt: relationNow, // 필수 필드
        },
        update: {
          status: 'ACTIVE',
          connectedAt: relationNow,
          disconnectedAt: null,
          updatedAt: relationNow, // 필수 필드
        },
      });
      console.log('[Approve Contract] AffiliateRelation created/updated:', relation);
    } else {
      console.log('[Approve Contract] No invitedByProfileId, skipping AffiliateRelation creation');
    }

    await updateContractStatus(contractId, 'approved', sessionUser.id, {
      contractSignedAt: new Date(),
      invitedByProfileId: invitedByProfileId ?? null,
      metadata: {
        ...(contract.metadata || {}),
        affiliateProfileId: profile.id,
        partnerId: finalPartnerId, // user1, user2... 형식의 아이디
      },
    });

    // 관리자 승인은 아이디 생성만 수행 (PDF 전송은 대리점장이 완료 승인 시 수행)
    // 계약자에게 완료된 계약서 PDF 전송은 하지 않음

    return NextResponse.json({ ok: true, profile, profileId: profile.id });
  } catch (error: any) {
    console.error(`POST /api/admin/affiliate/contracts/${params.contractId}/approve error:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[Approve Contract] Error details:', { errorMessage, errorStack });
    return NextResponse.json(
      {
        ok: false,
        message: `계약 승인 중 오류가 발생했습니다: ${errorMessage}`,
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
