export const dynamic = 'force-dynamic';

// app/api/payapp/feedback/route.ts
// PayApp 결제 완료 통보 (feedbackurl)

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    // PayApp은 application/x-www-form-urlencoded 형식으로 전송
    const contentType = req.headers.get('content-type');
    let body: Record<string, string> = {};

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        body[key] = value.toString();
      });
    } else {
      // JSON 형식도 지원
      body = await req.json();
    }

    const userid = body.userid;
    const linkkey = body.linkkey;
    const linkval = body.linkval;
    const pay_state = body.pay_state;
    const mul_no = body.mul_no;
    const var1 = body.var1; // contractId
    const var2 = body.var2; // contractType
    const price = body.price;
    const pay_date = body.pay_date;
    const pay_type = body.pay_type;

    // PayApp 설정 확인
    const payappUserid = process.env.PAYAPP_USERID;
    const payappLinkkey = process.env.PAYAPP_LINKKEY;
    const payappLinkval = process.env.PAYAPP_LINKVAL;

    // 보안 검증
    if (
      !payappUserid ||
      !payappLinkkey ||
      !payappLinkval ||
      userid !== payappUserid ||
      linkkey !== payappLinkkey ||
      linkval !== payappLinkval
    ) {
      console.error('[PayApp Feedback] 보안 검증 실패', {
        received: { userid, linkkey, linkval },
        expected: { payappUserid, payappLinkkey, payappLinkval },
      });
      return new NextResponse('FAIL', { status: 400 });
    }

    // var2로 랜딩페이지 결제인지 계약서 결제인지 구분
    const isLandingPagePayment = var2 && String(var2).startsWith('LP_');
    
    if (isLandingPagePayment) {
      // 랜딩페이지 결제 처리
      const orderId = var1; // var1에 orderId가 저장되어 있음
      const landingPageId = parseInt(String(var2).replace('LP_', '') || '0');
      
      if (!orderId) {
        console.error('[PayApp Feedback] 유효하지 않은 주문번호');
        return new NextResponse('FAIL', { status: 400 });
      }

      // orderId로 Payment 찾기
      const payment = await prisma.payment.findUnique({
        where: { orderId },
      });

      if (!payment) {
        console.error('[PayApp Feedback] 랜딩페이지 결제를 찾을 수 없습니다:', { orderId, mul_no, landingPageId });
        return new NextResponse('FAIL', { status: 404 });
      }

      // 결제 상태에 따른 처리
      switch (pay_state) {
        case '1':
          // 결제 요청
          console.log('[PayApp Feedback] 랜딩페이지 결제 요청:', mul_no, '주문번호:', orderId);
          break;

        case '4':
          // 결제 완료
          console.log('[PayApp Feedback] 랜딩페이지 결제 완료:', mul_no, '주문번호:', orderId);
          
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'completed',
              metadata: {
                ...(payment.metadata as any || {}),
                mul_no: mul_no,
                pay_date: pay_date,
                pay_type: pay_type,
                pay_state: 'completed',
              },
            },
          });
          break;

        case '8':
        case '32':
          // 요청 취소
          console.log('[PayApp Feedback] 랜딩페이지 결제 요청 취소:', mul_no);
          break;

        case '9':
        case '64':
          // 승인 취소
          console.log('[PayApp Feedback] 랜딩페이지 결제 승인 취소:', mul_no);
          
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'cancelled',
              metadata: {
                ...(payment.metadata as any || {}),
                pay_state: 'cancelled',
                cancel_date: new Date().toISOString(),
              },
            },
          });
          break;

        case '10':
          // 결제 대기 (가상계좌)
          console.log('[PayApp Feedback] 랜딩페이지 결제 대기:', mul_no);
          break;

        default:
          console.log('[PayApp Feedback] 랜딩페이지 결제 상태:', pay_state, mul_no);
      }
    } else {
      // 계약서 결제 처리 (기존 로직)
      const contractId = parseInt(var1 || '0');
      if (!contractId || isNaN(contractId)) {
        console.error('[PayApp Feedback] 유효하지 않은 계약서 ID');
        return new NextResponse('FAIL', { status: 400 });
      }

      // 계약서 조회
      const contract = await prisma.affiliateContract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        console.error('[PayApp Feedback] 계약서를 찾을 수 없습니다:', contractId);
        return new NextResponse('FAIL', { status: 404 });
      }

      // 결제 상태에 따른 처리
      switch (pay_state) {
        case '1':
          // 결제 요청
          console.log('[PayApp Feedback] 결제 요청:', mul_no);
          break;

        case '4':
          // 결제 완료
          console.log('[PayApp Feedback] 결제 완료:', mul_no, '계약서 ID:', contractId);
          
          // 계약서 메타데이터에 결제 정보 저장
          const metadata = contract.metadata as any || {};
          metadata.payment = {
            mul_no: mul_no,
            price: parseInt(price || '0'),
            pay_date: pay_date,
            pay_type: pay_type,
            pay_state: 'completed',
          };

          await prisma.affiliateContract.update({
            where: { id: contractId },
            data: {
              metadata: metadata,
            },
          });
          break;

        case '8':
        case '32':
          // 요청 취소
          console.log('[PayApp Feedback] 결제 요청 취소:', mul_no);
          break;

        case '9':
        case '64':
          // 승인 취소
          console.log('[PayApp Feedback] 결제 승인 취소:', mul_no);
          
          // 계약서 메타데이터에 취소 정보 저장
          const cancelMetadata = contract.metadata as any || {};
          cancelMetadata.payment = {
            ...cancelMetadata.payment,
            pay_state: 'cancelled',
            cancel_date: new Date().toISOString(),
          };

          await prisma.affiliateContract.update({
            where: { id: contractId },
            data: {
              metadata: cancelMetadata,
            },
          });
          break;

        case '10':
          // 결제 대기 (가상계좌)
          console.log('[PayApp Feedback] 결제 대기:', mul_no);
          break;

        default:
          console.log('[PayApp Feedback] 알 수 없는 결제 상태:', pay_state);
      }
    }

    // PayApp에 성공 응답 (반드시 'SUCCESS' 반환)
    return new NextResponse('SUCCESS', { status: 200 });
  } catch (error: any) {
    console.error('[PayApp Feedback] Error:', error);
    // 오류 발생 시에도 'SUCCESS' 반환 (재시도 방지)
    return new NextResponse('SUCCESS', { status: 200 });
  }
}
