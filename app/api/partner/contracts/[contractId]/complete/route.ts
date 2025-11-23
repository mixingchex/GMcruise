// app/api/partner/contracts/[contractId]/complete/route.ts
// 계약서 완료 승인 API (PDF 전송만, 아이디 생성 없음)
// 대리점장만 사용 가능

import { NextRequest, NextResponse } from 'next/server';
import { requirePartnerContext } from '@/app/api/partner/_utils';
import prisma from '@/lib/prisma';
import { sendContractPDFByEmail } from '@/lib/affiliate/contract-email';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const contractId = Number(resolvedParams.contractId);
    if (!contractId || Number.isNaN(contractId)) {
      return NextResponse.json({ ok: false, message: 'Invalid contract ID' }, { status: 400 });
    }

    const { profile } = await requirePartnerContext();

    // 대리점장만 사용 가능
    if (profile.type !== 'BRANCH_MANAGER') {
      return NextResponse.json(
        { ok: false, message: '대리점장만 계약서 완료 승인을 할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 계약서 조회
    const contract = await prisma.affiliateContract.findUnique({
      where: { id: contractId },
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
      return NextResponse.json({ ok: false, message: '계약서를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 계약서가 이미 완료된 경우
    if (contract.status === 'completed') {
      return NextResponse.json({ ok: false, message: '이미 완료된 계약서입니다.' }, { status: 400 });
    }

    // 계약서가 서명되지 않은 경우
    const metadata = contract.metadata as any;
    const signatures = metadata?.signatures || {};
    const hasSignature = signatures.main?.url || signatures.education?.url || signatures.b2b?.url;
    
    if (!hasSignature) {
      return NextResponse.json({ ok: false, message: '서명이 완료되지 않은 계약서입니다.' }, { status: 400 });
    }

    // 이메일 주소 확인
    const recipientEmail = contract.email || contract.User_AffiliateContract_userIdToUser?.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { ok: false, message: '계약서에 이메일 주소가 없습니다. 이메일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 계약서 상태를 'completed'로 변경 (아이디 생성 없음)
    await prisma.affiliateContract.update({
      where: { id: contractId },
      data: {
        status: 'completed',
        metadata: {
          ...metadata,
          completedBy: profile.id,
          completedAt: new Date().toISOString(),
        },
      },
    });

    // PDF 생성 및 이메일 전송
    const recipientName = contract.name || contract.User_AffiliateContract_userIdToUser?.name || '계약자';
    
    // 계약자에게 PDF 전송
    const pdfResult = await sendContractPDFByEmail(
      contractId,
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
      `
    );

    // 본사 이메일로도 PDF 전송 (비동기, 실패해도 계속 진행)
    const headOfficeEmail = process.env.HEAD_OFFICE_EMAIL || process.env.ADMIN_EMAIL || 'hyeseon28@gmail.com';
    sendContractPDFByEmail(
      contractId,
      headOfficeEmail,
      '크루즈닷 본사',
      `[계약서 완료] ${recipientName}님의 어필리에이트 계약서`,
      `
        <div style="font-family: 'Malgun Gothic', sans-serif; padding: 20px;">
          <h2>계약서가 완료되었습니다</h2>
          <p>${recipientName}님의 어필리에이트 계약서가 완료되어 PDF로 전송드립니다.</p>
          <p>계약서 내용과 서명을 확인하시기 바랍니다.</p>
        </div>
      `
    ).catch((err) => {
      console.error('[Contract Complete] 본사 이메일 전송 실패:', err);
    });

    if (!pdfResult.success) {
      console.error('[Contract Complete] PDF 전송 실패:', pdfResult.error);
      // PDF 전송 실패해도 계약서 상태는 업데이트됨
      return NextResponse.json({
        ok: true,
        message: '계약서가 완료되었으나 이메일 전송에 실패했습니다.',
        emailSent: false,
      });
    }

    // 계약서 타입 가져오기 (기존 metadata 변수 사용)
    const contractType = metadata?.contractType || 'SALES_AGENT';

    return NextResponse.json({
      ok: true,
      message: '계약서가 완료되었고 이메일로 전송되었습니다.',
      emailSent: true,
      redirectUrl: `/affiliate/contract/complete?contractId=${contractId}&type=${contractType}`,
    });
  } catch (error: any) {
    console.error(`[Contract Complete] error:`, error);
    return NextResponse.json(
      { ok: false, message: error.message || '계약서 완료 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

