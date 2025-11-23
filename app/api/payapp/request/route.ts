// app/api/payapp/request/route.ts
// PayApp 결제 요청 API

import { NextResponse } from 'next/server';
import { payappApiPost, getContractPrice, getContractGoodName } from '@/lib/payapp';
import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'affiliate-payment-pages.json');

// 설정 파일 읽기
async function readPaymentPagesSettings(): Promise<any> {
  try {
    const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // 파일이 없으면 기본값 반환
    return { configs: [] };
  }
}

// 계약서 타입별 결제 링크 가져오기 (리드젠 링크만)
async function getPaymentLink(contractType: string): Promise<string | null> {
  try {
    const settings = await readPaymentPagesSettings();
    const configs = settings.configs || [];
    const config = configs.find((c: any) => c.contractType === contractType);
    return config?.paymentLink || null;
  } catch (error) {
    console.error('[PayApp Request] Settings read error:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contractId, contractType, phone, name } = body;

    if (!contractId || !contractType || !phone) {
      return NextResponse.json(
        { ok: false, message: '필수 파라메터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 관리자가 설정한 결제 페이지 설정 가져오기
    const settings = await readPaymentPagesSettings();
    const configs = settings.configs || [];
    const config = configs.find((c: any) => c.contractType === contractType);

    if (config) {
      // 우리 쪽 결제 페이지 사용 (랜딩페이지 이미지 포함)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
      // 계약서 정보를 쿼리 파라미터로 전달
      const queryParams = new URLSearchParams({
        contractId: String(contractId),
        phone: phone.replace(/[^0-9]/g, ''),
        name: name || '',
      });
      const ourPaymentPageUrl = `${baseUrl}/affiliate/payment/${contractType}?${queryParams.toString()}`;
      
      console.log('[PayApp Request API] 우리 쪽 결제 페이지 사용:', {
        contractType,
        ourPaymentPageUrl,
        hasImage: !!config.imageUrl,
        contractId,
      });
      
      return NextResponse.json({
        ok: true,
        payurl: ourPaymentPageUrl,
        source: 'our-payment-page',
        fallbackLink: config.paymentLink, // 리드젠 링크는 백업용
      });
    }

    // 설정이 없으면 기존 리드젠 링크 사용
    const paymentLink = await getPaymentLink(contractType);
    if (paymentLink) {
      console.log('[PayApp Request API] 관리자 설정 리드젠 링크 사용:', {
        contractType,
        paymentLink,
      });
      return NextResponse.json({
        ok: true,
        payurl: paymentLink,
        source: 'admin-config',
      });
    }

    // 설정된 링크가 없으면 기존 PayApp API 사용
    const payappUserid = process.env.PAYAPP_USERID;
    const payappLinkkey = process.env.PAYAPP_LINKKEY;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3030';

    if (!payappUserid || !payappLinkkey) {
      console.error('[PayApp Request] 환경변수 누락:', {
        hasUserid: !!payappUserid,
        hasLinkkey: !!payappLinkkey,
      });
      return NextResponse.json(
        { ok: false, message: 'PayApp 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.' },
        { status: 500 }
      );
    }

    const price = getContractPrice(contractType);
    const goodname = getContractGoodName(contractType);

    if (price === 0) {
      return NextResponse.json(
        { ok: false, message: '유효하지 않은 계약서 타입입니다.' },
        { status: 400 }
      );
    }

    // 결제 요청 파라메터
    const params = {
      cmd: 'payrequest',
      userid: payappUserid,
      goodname: `${goodname} - ${name}`,
      price: price,
      recvphone: phone.replace(/[^0-9]/g, ''), // 숫자만 추출
      memo: `${goodname} 계약서 결제`,
      reqaddr: 0,
      feedbackurl: `${baseUrl}/api/payapp/feedback`,
      var1: String(contractId), // 계약서 ID
      var2: contractType, // 계약서 타입
      smsuse: 'n', // SMS 발송 안함
      returnurl: `${baseUrl}/affiliate/contract/success?contractId=${contractId}`,
      openpaytype: 'card', // 카드번호 입력 결제만 (기존 리드젠과 동일)
      checkretry: 'y', // feedbackurl 재시도
      skip_cstpage: 'y', // 매출전표 페이지 이동 안함
    };

    console.log('[PayApp Request API] 결제 요청 파라메터:', {
      cmd: params.cmd,
      userid: params.userid,
      goodname: params.goodname,
      price: params.price,
      recvphone: params.recvphone,
      feedbackurl: params.feedbackurl,
      returnurl: params.returnurl,
    });

    const result = await payappApiPost(params);

    console.log('[PayApp Request API] PayApp 응답:', result);

    if (result.state === '1') {
      // 결제 요청 성공
      console.log('[PayApp Request API] 결제 요청 성공:', {
        mul_no: result.mul_no,
        payurl: result.payurl,
      });
      return NextResponse.json({
        ok: true,
        mul_no: result.mul_no,
        payurl: result.payurl,
        qrurl: result.qrurl,
        source: 'payapp-api',
      });
    } else {
      // 결제 요청 실패
      console.error('[PayApp Request API] 결제 요청 실패:', {
        state: result.state,
        errorMessage: result.errorMessage,
        errno: result.errno,
      });
      return NextResponse.json(
        {
          ok: false,
          message: result.errorMessage || '결제 요청에 실패했습니다.',
          errno: result.errno,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[PayApp Request API] Error:', error);
    return NextResponse.json(
      { ok: false, message: error?.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

