// app/api/affiliate/contract/sign/route.ts
// 싸인 링크 토큰으로 계약서 조회 및 싸인 저장

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET: 토큰으로 계약서 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { ok: false, message: '토큰이 필요합니다.' },
        { status: 400 }
      );
    }

    // signatureLink에 토큰이 포함된 계약서 찾기
    // signatureLink 형식: "https://domain.com/affiliate/contract/sign?token=TOKEN"
    const contract = await prisma.affiliateContract.findFirst({
      where: {
        signatureLink: {
          contains: token,
        },
      },
      include: {
        User_AffiliateContract_userIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!contract) {
      return NextResponse.json(
        { ok: false, message: '유효하지 않은 토큰입니다.' },
        { status: 404 }
      );
    }

    // 만료 시간 체크
    if (contract.signatureLinkExpiresAt) {
      const expiresAt = new Date(contract.signatureLinkExpiresAt);
      const now = new Date();
      if (now > expiresAt) {
        return NextResponse.json(
          { ok: false, message: '싸인 링크가 만료되었습니다. 관리자에게 새 링크를 요청해주세요.' },
          { status: 410 } // 410 Gone
        );
      }
    }

    // 이미 서명된 경우 체크
    if (contract.signatureUrl && contract.signatureFileId) {
      return NextResponse.json({
        ok: true,
        contract: {
          ...contract,
          user: contract.User_AffiliateContract_userIdToUser,
          signed: true,
        },
        message: '이미 서명이 완료된 계약서입니다.',
      });
    }

    return NextResponse.json({
      ok: true,
      contract: {
        id: contract.id,
        name: contract.name,
        phone: contract.phone,
        email: contract.email,
        status: contract.status,
        metadata: contract.metadata,
        signatureLink: contract.signatureLink,
        signatureLinkExpiresAt: contract.signatureLinkExpiresAt,
        user: contract.User_AffiliateContract_userIdToUser,
        // 계약서 타입 정보 추가 (metadata에서 가져오기)
        contractType: (contract.metadata as any)?.contractType || 'SALES_AGENT',
      },
    });
  } catch (error) {
    logger.error('[api/affiliate/contract/sign][GET] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: '계약서 조회 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}

// POST: 싸인 저장
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { ok: false, message: '토큰이 필요합니다.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { 
      signatureUrl, 
      signatureFileId, 
      signatureOriginalName, 
      signedByName,
      consentPrivacy,
      consentNonCompete,
      consentDbUse,
      consentPenalty,
      consentRefund,
    } = body;

    if (!signatureUrl || !signatureFileId) {
      return NextResponse.json(
        { ok: false, message: '싸인 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // 필수 동의 항목 검증
    if (!consentPrivacy || !consentNonCompete || !consentDbUse || !consentPenalty) {
      return NextResponse.json(
        { ok: false, message: '모든 필수 동의 항목에 동의해주세요.' },
        { status: 400 }
      );
    }

    // 토큰으로 계약서 찾기
    const contract = await prisma.affiliateContract.findFirst({
      where: {
        signatureLink: {
          contains: token,
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { ok: false, message: '유효하지 않은 토큰입니다.' },
        { status: 404 }
      );
    }

    // 만료 시간 체크
    if (contract.signatureLinkExpiresAt) {
      const expiresAt = new Date(contract.signatureLinkExpiresAt);
      const now = new Date();
      if (now > expiresAt) {
        return NextResponse.json(
          { ok: false, message: '싸인 링크가 만료되었습니다.' },
          { status: 410 }
        );
      }
    }

    // 이미 서명된 경우 체크
    if (contract.signatureUrl && contract.signatureFileId) {
      return NextResponse.json(
        { ok: false, message: '이미 서명이 완료된 계약서입니다.' },
        { status: 400 }
      );
    }

    // 환불 조항 체크 (계약서 타입별로 필요)
    const contractType = (contract.metadata as any)?.contractType || 'SALES_AGENT';
    const hasRefundConsent = ['SALES_AGENT', 'CRUISE_STAFF', 'PRIMARKETER', 'BRANCH_MANAGER'].includes(contractType);
    if (hasRefundConsent && !consentRefund) {
      return NextResponse.json(
        { ok: false, message: '환불 조항에 동의해주세요.' },
        { status: 400 }
      );
    }

    // 계약서에 싸인 저장 (필수 동의 항목도 함께 저장)
    const existingMetadata = contract.metadata || {};
    const updatedContract = await prisma.affiliateContract.update({
      where: { id: contract.id },
      data: {
        signatureUrl,
        signatureFileId,
        signatureOriginalName: signatureOriginalName || null,
        contractSignedAt: new Date(),
        // 필수 동의 항목도 함께 저장 (스키마에 정의된 필드)
        consentPrivacy: !!consentPrivacy,
        consentNonCompete: !!consentNonCompete,
        consentDbUse: !!consentDbUse,
        consentPenalty: !!consentPenalty,
        metadata: {
          ...existingMetadata,
          signed: true,
          signedByName: signedByName || null,
          signedAt: new Date().toISOString(),
          // 필수 동의 항목을 metadata에도 저장 (기존 방식과 호환성 유지)
          consents: {
            consentPrivacy: !!consentPrivacy,
            consentNonCompete: !!consentNonCompete,
            consentDbUse: !!consentDbUse,
            consentPenalty: !!consentPenalty,
            consentRefund: consentRefund ? !!consentRefund : false,
          },
        },
        updatedAt: new Date(),
      },
    });

    logger.log(`[api/affiliate/contract/sign][POST] Signature saved:`, {
      contractId: contract.id,
      name: contract.name,
    });

    return NextResponse.json({
      ok: true,
      contract: updatedContract,
      message: '서명이 성공적으로 저장되었습니다.',
    });
  } catch (error) {
    logger.error('[api/affiliate/contract/sign][POST] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: '서명 저장 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}

