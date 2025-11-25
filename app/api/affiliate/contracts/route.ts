export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createHash, randomBytes } from 'crypto';

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

function maskResidentId(front: string, back: string) {
  const f = front.trim();
  const b = back.trim();
  if (f.length === 6 && b.length === 7) {
    return `${f}-${b[0]}******`;
  }
  return `${f}-${b}`;
}

export async function updateContractStatus(
  contractId: number,
  status: string,
  reviewerId?: number,
  data: Record<string, any> = {},
) {
  return prisma.affiliateContract.update({
    where: { id: contractId },
    data: {
      status,
      reviewerId: reviewerId ?? null,
      reviewedAt: new Date(),
      ...data,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ ok: false, message: 'application/json 요청이 필요합니다.' }, { status: 400 });
    }

    const data = await req.json();

    const name = (data.name ?? '').toString().trim();
    const phoneRaw = (data.phone ?? '').toString().trim();
    const email = (data.email ?? '').toString().trim();
    const address = (data.address ?? '').toString().trim();
    const residentIdFront = (data.residentIdFront ?? '').toString().trim();
    const residentIdBack = (data.residentIdBack ?? '').toString().trim();
    const bankName = (data.bankName ?? '').toString().trim();
    const bankAccount = (data.bankAccount ?? '').toString().trim();
    const bankAccountHolder = (data.bankAccountHolder ?? '').toString().trim();
    const signatureUrl = (data.signatureUrl ?? '').toString().trim();
    const signatureOriginalName = (data.signatureOriginalName ?? '').toString().trim();
    const signatureFileId = (data.signatureFileId ?? '').toString().trim();
    const educationSignatureUrl = (data.educationSignatureUrl ?? '').toString().trim();
    const educationSignatureOriginalName = (data.educationSignatureOriginalName ?? '').toString().trim();
    const educationSignatureFileId = (data.educationSignatureFileId ?? '').toString().trim();
    const b2bSignatureUrl = (data.b2bSignatureUrl ?? '').toString().trim();
    const b2bSignatureOriginalName = (data.b2bSignatureOriginalName ?? '').toString().trim();
    const b2bSignatureFileId = (data.b2bSignatureFileId ?? '').toString().trim();
    const contractType = (data.contractType ?? 'SALES_AGENT').toString().trim();
    const invitedByProfileIdRaw = data.invitedByProfileId;
    const consentPrivacy = Boolean(data.consentPrivacy);
    const consentNonCompete = Boolean(data.consentNonCompete);
    const consentDbUse = Boolean(data.consentDbUse);
    const consentPenalty = Boolean(data.consentPenalty);
    const consentRefund = Boolean(data.consentRefund);

    let invitedByProfileId: number | null = null;

    // 1. 기본 정보 필수 검증
    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, message: '성명을 입력해주세요.' }, { status: 400 });
    }
    if (!phoneRaw || !phoneRaw.trim()) {
      return NextResponse.json({ ok: false, message: '연락처를 입력해주세요.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ ok: false, message: '이메일을 입력해주세요.' }, { status: 400 });
    }
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ ok: false, message: '올바른 이메일 형식을 입력해주세요.' }, { status: 400 });
    }
    if (!residentIdFront || !residentIdFront.trim() || !residentIdBack || !residentIdBack.trim()) {
      return NextResponse.json({ ok: false, message: '주민등록번호를 입력해주세요.' }, { status: 400 });
    }
    // 주민등록번호 형식 검증
    if (residentIdFront.trim().length !== 6) {
      return NextResponse.json({ ok: false, message: '주민등록번호 앞자리는 6자리여야 합니다.' }, { status: 400 });
    }
    if (residentIdBack.trim().length !== 7) {
      return NextResponse.json({ ok: false, message: '주민등록번호 뒷자리는 7자리여야 합니다.' }, { status: 400 });
    }
    if (!address || !address.trim()) {
      return NextResponse.json({ ok: false, message: '주소를 입력해주세요.' }, { status: 400 });
    }

    // 2. 정산 계좌번호 필수 검증
    if (!bankName || !bankName.trim()) {
      return NextResponse.json({ ok: false, message: '은행명을 입력해주세요.' }, { status: 400 });
    }
    if (!bankAccount || !bankAccount.trim()) {
      return NextResponse.json({ ok: false, message: '계좌번호를 입력해주세요.' }, { status: 400 });
    }
    if (!bankAccountHolder || !bankAccountHolder.trim()) {
      return NextResponse.json({ ok: false, message: '예금주를 입력해주세요.' }, { status: 400 });
    }

    // 3. 필수 동의 항목 검증
    if (!consentPrivacy) {
      return NextResponse.json({ ok: false, message: '개인정보 처리 동의에 체크해주세요.' }, { status: 400 });
    }
    if (!consentNonCompete) {
      return NextResponse.json({ ok: false, message: '경업금지 조항 동의에 체크해주세요.' }, { status: 400 });
    }
    if (!consentDbUse) {
      return NextResponse.json({ ok: false, message: 'DB 활용 동의에 체크해주세요.' }, { status: 400 });
    }
    if (!consentPenalty) {
      return NextResponse.json({ ok: false, message: '위약금 조항 동의에 체크해주세요.' }, { status: 400 });
    }
    if (!consentRefund) {
      return NextResponse.json({ ok: false, message: '환불 조항 동의에 체크해주세요.' }, { status: 400 });
    }

    // 4. 계약서 타입별 필수 싸인 검증
    if (contractType === 'BRANCH_MANAGER') {
      if (!b2bSignatureUrl || !b2bSignatureFileId) {
        return NextResponse.json({ ok: false, message: '크루즈닷 계약서 싸인을 입력해주세요.' }, { status: 400 });
      }
    } else if (contractType === 'CRUISE_STAFF' || contractType === 'PRIMARKETER') {
      if (!educationSignatureUrl || !educationSignatureFileId) {
        return NextResponse.json({ ok: false, message: '크루즈닷 계약서 싸인을 입력해주세요.' }, { status: 400 });
      }
    } else {
      // 판매원 (SALES_AGENT)
      if (!signatureUrl || !signatureFileId) {
        return NextResponse.json({ ok: false, message: '크루즈닷 계약서 싸인을 입력해주세요.' }, { status: 400 });
      }
    }

    const phone = normalizePhone(phoneRaw);

    // invitedByProfileId 파싱 및 검증
    if (invitedByProfileIdRaw !== undefined && invitedByProfileIdRaw !== null) {
      const parsed = Number(invitedByProfileIdRaw);
      if (!Number.isNaN(parsed) && parsed > 0) {
        invitedByProfileId = parsed;
      }
    }

    console.log('[Contract API] invitedByProfileId 처리:', {
      invitedByProfileIdRaw,
      invitedByProfileId,
    });

    const existing = await prisma.affiliateContract.findFirst({
      where: {
        phone,
        status: { in: ['submitted', 'in_review', 'approved'] },
      },
    });

    if (existing) {
      return NextResponse.json({ ok: false, message: '이미 접수된 계약 신청이 있습니다.', contractId: existing.id }, { status: 409 });
    }

    // 계약서 제출 시에는 사용자 계정을 생성하지 않음
    // 승인 시에만 사용자 계정이 자동 생성됨
    let user = await prisma.user.findFirst({ where: { phone } });
    let isNewUser = false;
    let userId: number | null = null;

    if (user) {
      // 기존 사용자가 있으면 연결
      userId = user.id;
      if (!user.name && name) {
        await prisma.user.update({ where: { id: user.id }, data: { name } });
      }
    }
    // 기존 사용자가 없어도 계약서는 생성 가능 (승인 시 사용자 계정 생성됨)

    const residentMasked = maskResidentId(residentIdFront, residentIdBack);
    const residentHash = createHash('sha256').update(`${residentIdFront}${residentIdBack}`).digest('hex');

    // invitedByProfileId 검증: 프로필이 존재하고 대리점장인지 확인
    if (invitedByProfileId && invitedByProfileId > 0) {
      const profileExists = await prisma.affiliateProfile.findUnique({ 
        where: { id: invitedByProfileId },
        select: { 
          id: true, 
          type: true, 
          status: true,
          displayName: true,
          nickname: true,
          affiliateCode: true,
        },
      });
      if (!profileExists) {
        console.error('[Contract API] invitedByProfileId에 해당하는 프로필이 없음:', {
          invitedByProfileId,
        });
        invitedByProfileId = null;
      } else if (profileExists.type !== 'BRANCH_MANAGER') {
        console.warn('[Contract API] invitedByProfileId가 대리점장이 아님:', {
          invitedByProfileId,
          profileType: profileExists.type,
          profileStatus: profileExists.status,
        });
        invitedByProfileId = null;
      } else {
        console.log('[Contract API] ✅ 대리점장 멘토 확인 성공 - 계약서가 올바른 대리점장에게 연결됩니다:', {
          invitedByProfileId,
          type: profileExists.type,
          displayName: profileExists.displayName,
          nickname: profileExists.nickname,
          affiliateCode: profileExists.affiliateCode,
          contractName: name,
          contractPhone: phone,
        });
      }
    } else {
      console.log('[Contract API] invitedByProfileId가 없음 - 본사 직접 신청으로 처리');
    }

    const newContract = await prisma.affiliateContract.create({
      data: {
        userId: userId, // 기존 사용자가 있으면 연결, 없으면 null (승인 시 생성됨)
        name,
        residentId: residentMasked,
        phone,
        email: email || null,
        address,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        bankAccountHolder: bankAccountHolder || null,
        idCardPath: null,
        idCardOriginalName: null,
        bankbookPath: null,
        bankbookOriginalName: null,
        invitedByProfileId: invitedByProfileId || null,
        status: 'submitted', // 제출 상태로 설정 (승인 전까지 아이디/비밀번호 생성 안 함)
        submittedAt: new Date(), // 제출 시간 기록
        updatedAt: new Date(), // 업데이트 시간 기록
        consentPrivacy,
        consentNonCompete,
        consentDbUse,
        consentPenalty,
        metadata: {
          residentIdHash: residentHash,
          source: invitedByProfileId ? 'branch-invite' : 'public-form',
          willCreateUserOnApproval: !userId, // 승인 시 사용자 계정 생성 여부
          contractType: contractType, // 계약서 타입 저장
          signatures: {
            // 싸인은 1개만 저장 (계약서 타입에 따라)
            main: contractType === 'SALES_AGENT' ? {
              url: signatureUrl || null,
              originalName: signatureOriginalName || null,
              fileId: signatureFileId || null,
            } : null,
            education: (contractType === 'CRUISE_STAFF' || contractType === 'PRIMARKETER') ? {
              url: educationSignatureUrl || null,
              originalName: educationSignatureOriginalName || null,
              fileId: educationSignatureFileId || null,
            } : null,
            b2b: contractType === 'BRANCH_MANAGER' ? {
              url: b2bSignatureUrl || null,
              originalName: b2bSignatureOriginalName || null,
              fileId: b2bSignatureFileId || null,
            } : null,
          },
        },
      },
    });

    // 서명이 완료된 경우 본사에 PDF 전송 (비동기)
    if (signatureUrl || educationSignatureUrl || b2bSignatureUrl) {
      import('@/lib/affiliate/contract-email')
        .then(({ sendContractPDFToHeadOffice }) => {
          sendContractPDFToHeadOffice(newContract.id).catch((err) => {
            console.error('[Contract] PDF 전송 실패:', err);
          });
        })
        .catch((err) => {
          console.error('[Contract] PDF 전송 모듈 로드 실패:', err);
        });
    }

    return NextResponse.json({ 
      ok: true, 
      contractId: newContract.id,
      contractType: contractType,
    });
  } catch (error) {
    console.error('POST /api/affiliate/contracts error:', error);
    return NextResponse.json({ ok: false, message: 'Server error' }, { status: 500 });
  }
}
