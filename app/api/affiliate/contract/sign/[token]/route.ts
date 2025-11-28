export const dynamic = 'force-dynamic';

// app/api/affiliate/contract/sign/[token]/route.ts
// 계약서 서명 API (경로 파라미터 버전)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendContractPDFByEmail } from '@/lib/affiliate/contract-email';

// GET: 토큰으로 계약서 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { ok: false, message: '토큰이 필요합니다.' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // signatureLink에 토큰이 포함된 계약서 찾기
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
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 만료 시간 체크
    if (contract.signatureLinkExpiresAt) {
      const expiresAt = new Date(contract.signatureLinkExpiresAt);
      const now = new Date();
      if (now > expiresAt) {
        return NextResponse.json(
          { ok: false, message: '싸인 링크가 만료되었습니다. 관리자에게 새 링크를 요청해주세요.' },
          { status: 410, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 이미 서명된 경우 체크
    const metadata = contract.metadata as any;
    const signatures = metadata?.signatures || {};
    const hasSignature = signatures.main?.url || signatures.education?.url || signatures.b2b?.url;

    if (hasSignature) {
      return NextResponse.json({
        ok: true,
        contract: {
          ...contract,
          user: contract.User_AffiliateContract_userIdToUser,
          signed: true,
        },
        message: '이미 서명이 완료된 계약서입니다.',
      }, { headers: { 'Content-Type': 'application/json' } });
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
        contractType: metadata?.contractType || 'SALES_AGENT',
      },
    }, { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    logger.error('[Contract Sign GET] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: '계약서 조회 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST: 서명 저장
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { ok: false, message: '토큰이 필요합니다.' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { signatureImage, signedByName } = body;

    if (!signatureImage) {
      return NextResponse.json(
        { ok: false, message: '서명 이미지가 필요합니다.' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!signedByName?.trim()) {
      return NextResponse.json(
        { ok: false, message: '서명자 이름이 필요합니다.' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 토큰으로 계약서 찾기
    const contract = await prisma.affiliateContract.findFirst({
      where: {
        signatureLink: {
          contains: token,
        },
      },
      include: {
        User_AffiliateContract_userIdToUser: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { ok: false, message: '유효하지 않은 토큰입니다.' },
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 만료 시간 체크
    if (contract.signatureLinkExpiresAt) {
      const expiresAt = new Date(contract.signatureLinkExpiresAt);
      const now = new Date();
      if (now > expiresAt) {
        return NextResponse.json(
          { ok: false, message: '싸인 링크가 만료되었습니다.' },
          { status: 410, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 이미 서명된 경우 체크
    const metadata = contract.metadata as any;
    const signatures = metadata?.signatures || {};
    const hasSignature = signatures.main?.url || signatures.education?.url || signatures.b2b?.url;

    if (hasSignature) {
      return NextResponse.json(
        { ok: false, message: '이미 서명이 완료된 계약서입니다.' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 계약서 타입 확인
    const contractType = metadata?.contractType || 'SALES_AGENT';

    // 서명 정보 업데이트 (metadata.signatures에 base64 이미지 직접 저장)
    // 참고: 실제 프로덕션에서는 이미지를 별도 스토리지에 저장하는 것이 좋지만,
    // 현재 Firebase Storage가 설정되지 않은 상태이므로 base64로 직접 저장
    const updatedSignatures = {
      ...signatures,
      main: {
        url: signatureImage, // base64 이미지 데이터 직접 저장
        signedBy: signedByName.trim(),
        signedAt: new Date().toISOString(),
      },
    };

    // 계약서 업데이트
    const updatedContract = await prisma.affiliateContract.update({
      where: { id: contract.id },
      data: {
        status: 'completed', // 서명 완료 시 자동으로 completed 상태로 변경
        contractSignedAt: new Date(),
        metadata: {
          ...metadata,
          signatures: updatedSignatures,
          signedByName: signedByName.trim(),
          signedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    });

    logger.log(`[Contract Sign POST] Signature saved:`, {
      contractId: contract.id,
      name: contract.name,
      signedBy: signedByName.trim(),
    });

    // 이메일 주소 확인
    const recipientEmail = contract.email || contract.User_AffiliateContract_userIdToUser?.email;
    const recipientName = contract.name || contract.User_AffiliateContract_userIdToUser?.name || '계약자';

    // PDF 자동 전송 (비동기, 실패해도 서명 성공으로 처리)
    if (recipientEmail) {
      sendContractPDFByEmail(
        contract.id,
        recipientEmail,
        recipientName,
        `[계약서 완료] 어필리에이트 계약서`,
        `
          <div style="font-family: 'Malgun Gothic', sans-serif; padding: 20px;">
            <h2>계약서가 완료되었습니다</h2>
            <p>안녕하세요, ${recipientName}님,</p>
            <p>귀하의 어필리에이트 계약서가 완료되어 PDF로 전송드립니다.</p>
            <p>계약서 내용과 서명을 확인하시기 바랍니다.</p>
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              본 계약서는 전자적으로 생성되었으며, 서명이 포함되어 있습니다.
            </p>
          </div>
        `,
        'hyeseon28@gmail.com' // 본사 이메일 CC
      ).then((result) => {
        if (result.success) {
          logger.log(`[Contract Sign POST] PDF 이메일 전송 성공:`, { contractId: contract.id });
        } else {
          logger.error(`[Contract Sign POST] PDF 이메일 전송 실패:`, { contractId: contract.id, error: result.error });
        }
      }).catch((error) => {
        logger.error(`[Contract Sign POST] PDF 이메일 전송 오류:`, { contractId: contract.id, error });
      });
    }

    // 완료 페이지로 리다이렉트 URL 생성
    const redirectUrl = `/affiliate/contract/complete?contractId=${contract.id}&type=${contractType}`;

    return NextResponse.json({
      ok: true,
      message: '서명이 성공적으로 완료되었습니다.',
      contract: updatedContract,
      redirectUrl,
    }, { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    logger.error('[Contract Sign POST] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: '서명 저장 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
