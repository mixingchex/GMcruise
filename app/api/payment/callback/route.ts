import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. PG사로부터 전달된 데이터 파싱
    const formData = await request.formData();
    const P_STATUS = formData.get('P_STATUS')?.toString();
    const P_TID = formData.get('P_TID')?.toString();
    const P_REQ_URL = formData.get('P_REQ_URL')?.toString();
    const P_RMESG1 = formData.get('P_RMESG1')?.toString() || '';

    console.log('[Payment Callback] Received:', { P_STATUS, P_TID, P_REQ_URL });

    // 2. 인증 실패 시 바로 실패 페이지로 이동
    if (P_STATUS !== '00') {
      // 한글 깨짐 방지를 위해 인코딩 처리 필요할 수 있음
      return NextResponse.redirect(new URL(`/payment/failed?message=AuthFailed`, request.url), 303);
    }

    // 3. [핵심] 인증 성공 시, PG사로 "승인 요청" 보내기 (Server-to-Server)
    if (P_REQ_URL && P_TID) {
      const approvalData = new URLSearchParams();
      approvalData.append('P_TID', P_TID);
      approvalData.append('P_MID', 'wpcrdot200'); // 운영 상점ID

      const approvalRes = await fetch(P_REQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=EUC-KR',
        },
        body: approvalData,
      });

      const approvalText = await approvalRes.text();
      console.log('[Payment Approval] Response:', approvalText);

      // 4. 승인 결과 확인 (P_STATUS=00 확인)
      const approvalParams = new URLSearchParams(approvalText);
      const finalStatus = approvalParams.get('P_STATUS');

      if (finalStatus === '00') {
        return NextResponse.redirect(new URL('/payment/success', request.url), 303);
      } else {
        return NextResponse.redirect(new URL(`/payment/failed?message=ApprovalFailed`, request.url), 303);
      }
    }

    return NextResponse.redirect(new URL('/payment/failed?message=InvalidRequest', request.url), 303);

  } catch (error) {
    console.error('[Payment Callback Error]', error);
    return NextResponse.redirect(new URL('/payment/failed?message=ServerError', request.url), 303);
  }
}
