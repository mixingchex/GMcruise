export const dynamic = 'force-dynamic';

// app/api/public/landing-pages/[slug]/payment/route.ts
// 랜딩페이지 결제 요청 API (로그인 불필요)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { payappApiPost } from '@/lib/payapp';

/**
 * POST: 랜딩페이지 결제 요청 처리
 * - PG 결제창으로 리다이렉트
 * - 본인인증은 PG에서 처리
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const slug = resolvedParams.slug;

    // 랜딩페이지 조회
    const landingPage = await prisma.landingPage.findUnique({
      where: {
        slug,
        isActive: true,
        isPublic: true,
      },
    });

    if (!landingPage) {
      return NextResponse.json(
        { ok: false, error: '랜딩페이지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 사업자 정보에서 상품 구매 설정 파싱
    const businessInfo = landingPage.businessInfo as any;
    const productPurchase = businessInfo?.productPurchase;

    if (!productPurchase || !productPurchase.enabled) {
      return NextResponse.json(
        { ok: false, error: '결제 기능이 활성화되지 않았습니다.' },
        { status: 400 }
      );
    }

    const sellingPrice = productPurchase.sellingPrice;
    if (!sellingPrice || Number(sellingPrice) <= 0) {
      return NextResponse.json(
        { ok: false, error: '결제 금액이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const paymentProvider = productPurchase.paymentProvider || 'welcomepay';
    const productName = productPurchase.productName || landingPage.title || '상품 구매';

    // 환경 변수에서 PG 설정 가져오기 (기존 결제 API와 동일한 방식)
    const pgSignkey = process.env.PG_SIGNKEY;
    const pgFieldEncryptIv = process.env.PG_FIELD_ENCRYPT_IV;
    const pgFieldEncryptKey = process.env.PG_FIELD_ENCRYPT_KEY;
    const pgMidAuth = process.env.PG_MID_AUTH;
    const pgMidNonAuth = process.env.PG_MID_NON_AUTH;
    const pgSignkeyNonAuth = process.env.PG_SIGNKEY_NON_AUTH;
    const pgFieldEncryptIvNonAuth = process.env.PG_FIELD_ENCRYPT_IV_NON_AUTH;
    const pgFieldEncryptKeyNonAuth = process.env.PG_FIELD_ENCRYPT_KEY_NON_AUTH;

    // 결제 방식 선택 (기본값: 인증 결제)
    const useNonAuth = productPurchase.paymentType === 'cardInput';
    const selectedMid = useNonAuth ? pgMidNonAuth : pgMidAuth;
    const selectedSignkey = useNonAuth ? pgSignkeyNonAuth : pgSignkey;
    const selectedFieldEncryptIv = useNonAuth ? pgFieldEncryptIvNonAuth : pgFieldEncryptIv;
    const selectedFieldEncryptKey = useNonAuth ? pgFieldEncryptKeyNonAuth : pgFieldEncryptKey;

    if (!selectedSignkey || !selectedFieldEncryptIv || !selectedFieldEncryptKey || !selectedMid) {
      console.error('[Landing Page Payment] PG 설정 누락:', {
        hasSignkey: !!selectedSignkey,
        hasFieldEncryptIv: !!selectedFieldEncryptIv,
        hasFieldEncryptKey: !!selectedFieldEncryptKey,
        hasMid: !!selectedMid,
        useNonAuth,
      });
      return NextResponse.json(
        { ok: false, error: 'PG 결제 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.' },
        { status: 500 }
      );
    }

    // 주문번호 생성
    const orderId = `LP_${landingPage.id}_${Date.now()}_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    // 어필리에이트 추적 정보 (쿠키에서)
    const cookies = req.cookies;
    const affiliateCode = cookies.get('affiliate_code')?.value || null;
    const affiliateMallUserId = cookies.get('affiliate_mall_user_id')?.value || null;

    // 메타데이터
    const metadata: any = {
      landingPageId: landingPage.id,
      landingPageSlug: slug,
      productName,
      paymentProvider,
      paymentType: productPurchase.paymentType || 'basic',
    };

    if (affiliateCode) {
      metadata.affiliateCode = affiliateCode;
    }
    if (affiliateMallUserId) {
      metadata.partnerId = affiliateMallUserId;
    }

    // 결제 요청 데이터 생성
    const paymentData = {
      mid: selectedMid,
      orderId,
      amount: parseInt(String(sellingPrice)),
      productName,
      returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payment/callback`,
      notifyUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payment/notify`,
    };

    // Signkey로 서명 생성
    const signData = `${paymentData.mid}${paymentData.orderId}${paymentData.amount}${selectedSignkey}`;
    const signature = crypto.createHash('sha256').update(signData).digest('hex').toUpperCase();

    // 결제 정보를 DB에 저장
    // 랜딩페이지 결제는 PG에서 본인인증을 하므로, 결제 요청 시점에는 구매자 정보가 없음
    // 결제 완료 후 콜백에서 구매자 정보가 업데이트됨
    await prisma.payment.create({
      data: {
        orderId,
        productCode: `LP_${landingPage.id}`, // 랜딩페이지 ID를 상품 코드로 사용
        productName,
        amount: paymentData.amount,
        currency: 'KRW',
        status: 'pending',
        pgProvider: paymentProvider === 'payapp' ? 'payapp' : 'welcomepayments',
        pgMid: selectedMid,
        affiliateCode,
        affiliateMallUserId,
        metadata,
        // 구매자 정보는 PG 본인인증 후 콜백에서 업데이트됨
        buyerName: '결제 대기중', // 임시 값
        buyerTel: '000-0000-0000', // 임시 값
      },
    });

    // 결제 페이지 URL 생성 (기존 결제 API와 동일한 방식)
    let paymentUrl = '';
    
    if (paymentProvider === 'welcomepay' || paymentProvider === 'welcomepayments') {
      const welcomePayUrl = process.env.NEXT_PUBLIC_WELCOME_PAY_URL || process.env.WELCOME_PAY_URL || '';
      if (!welcomePayUrl) {
        console.error('[Landing Page Payment] WelcomePay URL이 설정되지 않음');
        return NextResponse.json(
          { ok: false, error: '결제 프로바이더 URL이 설정되지 않았습니다. 관리자에게 문의해주세요.' },
          { status: 500 }
        );
      }
      
      const params = new URLSearchParams();
      params.append('mid', paymentData.mid);
      params.append('orderId', paymentData.orderId);
      params.append('amount', String(paymentData.amount));
      params.append('productName', paymentData.productName);
      params.append('returnUrl', paymentData.returnUrl);
      params.append('notifyUrl', paymentData.notifyUrl);
      params.append('signature', signature);
      params.append('fieldEncryptIv', selectedFieldEncryptIv);
      params.append('fieldEncryptKey', selectedFieldEncryptKey);
      
      if (metadata) {
        params.append('metadata', JSON.stringify(metadata));
      }
      
      paymentUrl = `${welcomePayUrl}?${params.toString()}`;
    } else if (paymentProvider === 'payapp') {
      // PayApp API를 통한 동적 결제 URL 생성
      const payappUserid = process.env.PAYAPP_USERID;
      const payappLinkkey = process.env.PAYAPP_LINKKEY;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

      if (!payappUserid || !payappLinkkey) {
        console.error('[Landing Page Payment] PayApp 설정 누락:', {
          hasUserid: !!payappUserid,
          hasLinkkey: !!payappLinkkey,
        });
        return NextResponse.json(
          { ok: false, error: 'PayApp 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.' },
          { status: 500 }
        );
      }

      // 요청 body에서 전화번호 받기 (선택사항)
      let requestBody: any = {};
      try {
        requestBody = await req.json().catch(() => ({}));
      } catch {
        // body가 없으면 빈 객체 사용
      }

      // 전화번호 처리 (요청에서 받거나 임시값 사용)
      // 페이앱 결제창에서 전화번호를 입력받을 수 있으므로, 없으면 임시값 사용
      const recvphone = requestBody.phone 
        ? requestBody.phone.replace(/[^0-9]/g, '') 
        : '01000000000'; // 임시 전화번호 (페이앱 결제창에서 실제 전화번호 입력)

      // PayApp API 호출
      const payappParams = {
        cmd: 'payrequest',
        userid: payappUserid,
        goodname: productName,
        price: paymentData.amount,
        recvphone: recvphone,
        memo: `${productName} 결제`,
        reqaddr: 0,
        feedbackurl: `${baseUrl}/api/payapp/feedback`,
        var1: orderId, // 주문번호 (결제 추적용)
        var2: `LP_${landingPage.id}`, // 랜딩페이지 ID (LP_ prefix로 구분)
        smsuse: 'n', // SMS 발송 안함
        returnurl: `${baseUrl}/api/payment/callback?orderId=${orderId}`,
        openpaytype: 'card', // 카드번호 입력 결제만
        checkretry: 'y', // feedbackurl 재시도
        skip_cstpage: 'y', // 매출전표 페이지 이동 안함
      };

      console.log('[Landing Page Payment] PayApp API 호출:', {
        cmd: payappParams.cmd,
        userid: payappParams.userid,
        goodname: payappParams.goodname,
        price: payappParams.price,
        recvphone: payappParams.recvphone,
        feedbackurl: payappParams.feedbackurl,
        returnurl: payappParams.returnurl,
      });

      const payappResult = await payappApiPost(payappParams);

      console.log('[Landing Page Payment] PayApp API 응답:', payappResult);

      if (payappResult.state === '1') {
        // 결제 요청 성공
        paymentUrl = payappResult.payurl || '';
        
        if (!paymentUrl) {
          console.error('[Landing Page Payment] PayApp에서 결제 URL을 받지 못함');
          return NextResponse.json(
            { ok: false, error: '결제 URL을 생성하지 못했습니다. 다시 시도해주세요.' },
            { status: 500 }
          );
        }

        // Payment 테이블에 mul_no 저장
        if (payappResult.mul_no) {
          await prisma.payment.update({
            where: { orderId },
            data: {
              metadata: {
                ...metadata,
                mul_no: payappResult.mul_no,
              },
            },
          });
        }

        console.log('[Landing Page Payment] PayApp 결제 URL 생성 성공:', {
          mul_no: payappResult.mul_no,
          payurl: paymentUrl,
        });
      } else {
        // 결제 요청 실패
        console.error('[Landing Page Payment] PayApp 결제 요청 실패:', {
          state: payappResult.state,
          errorMessage: payappResult.errorMessage,
          errno: payappResult.errno,
        });
        return NextResponse.json(
          {
            ok: false,
            error: payappResult.errorMessage || '결제 요청에 실패했습니다.',
            errno: payappResult.errno,
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { ok: false, error: `지원하지 않는 결제 프로바이더입니다: ${paymentProvider}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderId,
      paymentUrl,
      message: '결제 페이지로 이동합니다.',
    });
  } catch (error: any) {
    console.error('[Landing Page Payment] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || '결제 요청 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
