'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// INIStdPay 전역 타입 선언
declare global {
  interface Window {
    INIStdPay?: {
      pay: (formId: string) => void;
    };
  }
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [autoLaunched, setAutoLaunched] = useState(false);

  // 1. [데이터 수신] URL 파라미터 최우선 사용 (API 호출 X)
  const orderId = searchParams.get('orderId') || `ord_${Date.now()}`;
  // 한글 깨짐 방지를 위해 decode 처리
  const goodname = searchParams.get('goodname') ? decodeURIComponent(searchParams.get('goodname')!) : '기본 상품';
  const price = searchParams.get('price') || '1000';
  const buyername = searchParams.get('buyername') ? decodeURIComponent(searchParams.get('buyername')!) : '방문자';
  const buyertel = searchParams.get('buyertel') || '010-0000-0000';
  const buyeremail = searchParams.get('buyeremail') || 'no-email@test.com';

  // 어필리에이트 및 자동화 추적 키
  const partnerId = searchParams.get('partnerId') || '';
  const productCode = searchParams.get('productCode') || '';

  // 2. [보안 데이터] (서버 연동 전 임시값 - 화면 띄우기용)
  const timestamp = String(Date.now());
  const mKey = ""; // 임시 빈값 (PG사 설정에 따라 필수일 수 있으나 일단 진행)
  const signature = "";

  // 3. [모바일 감지 및 스크립트 로드]
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobile = /android|iphone|ipad|ipod/i.test(userAgent);
    setIsMobile(mobile);

    if (!mobile) {
      // PC: 스크립트 로드
      const script = document.createElement('script');
      script.src = 'https://stdpay.paywelcome.co.kr/stdjs/INIStdPay.js';
      script.onload = () => setIsScriptLoaded(true);
      document.head.appendChild(script);
    } else {
      // Mobile: 스크립트 불필요
      setIsScriptLoaded(true);
    }
  }, []);

  // 4. [자동 실행] 5060 고객 편의 (Auto-Launch)
  useEffect(() => {
    if (isScriptLoaded && !autoLaunched) {
      const timer = setTimeout(() => {
        handlePayment();
        setAutoLaunched(true);
      }, 800); // 0.8초 후 자동 실행
      return () => clearTimeout(timer);
    }
  }, [isScriptLoaded, autoLaunched]);

  // 5. [결제 핸들러] PC/Mobile 분기
  const handlePayment = () => {
    if (isMobile) {
      // === Mobile: 동적 폼 생성 후 이동 ===
      const form = document.createElement('form');
      form.method = 'POST';
      form.acceptCharset = 'euc-kr';
      form.action = 'https://mobile.paywelcome.co.kr/smart/wcard/';

      const params: Record<string, string> = {
        P_MID: 'wpcrdot200',
        P_OID: orderId,
        P_AMT: price,
        P_UNAME: buyername,
        P_GOODS: goodname,
        P_MOBILE: buyertel,
        P_EMAIL: buyeremail,
        P_NEXT_URL: 'https://www.cruisedot.co.kr/api/payment/callback',
        P_NOTI_URL: 'https://www.cruisedot.co.kr/api/payment/notify',
        P_HPP_METHOD: '1',
        P_RESERVED: 'twotrs_isp=Y&block_isp=Y&twotrs_bank=Y&apprun_check=Y',
        P_CHARSET: 'utf8',
        // [중요] 실적 추적용 데이터 숨기기
        P_NOTI: `partnerId=${partnerId}&productCode=${productCode}`
      };

      Object.entries(params).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

    } else {
      // === PC: Overlay 팝업 ===
      if (typeof window.INIStdPay === 'undefined') return;

      // 폼 ID 확인 후 실행
      if (document.getElementById('SendPayForm_id')) {
        window.INIStdPay.pay('SendPayForm_id');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">결제 진행 중</h2>
        <p className="text-gray-600 mb-8">
          잠시만 기다려주세요.<br/>안전한 결제창을 불러오고 있습니다.
        </p>

        {/* 수동 클릭 버튼 */}
        <button
          onClick={handlePayment}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
        >
          결제창 열기
        </button>

        {/* === PC용 표준 폼 (화면에 보이지 않음) === */}
        {!isMobile && (
          <form id="SendPayForm_id" name="SendPayForm_id" style={{ display: 'none' }}>
            <input type="hidden" name="mid" value="wpcrdot200" />
            <input type="hidden" name="oid" value={orderId} />
            <input type="hidden" name="goodname" value={goodname} />
            <input type="hidden" name="price" value={price} />
            <input type="hidden" name="buyername" value={buyername} />
            <input type="hidden" name="buyertel" value={buyertel} />
            <input type="hidden" name="buyeremail" value={buyeremail} />
            <input type="hidden" name="timestamp" value={timestamp} />
            <input type="hidden" name="currency" value="WON" />

            {/* [핵심] Overlay 설정 및 추적 데이터 */}
            <input type="hidden" name="payViewType" value="overlay" />
            <input type="hidden" name="gopaymethod" value="Card" />
            <input type="hidden" name="charset" value="UTF-8" />
            <input type="hidden" name="acceptmethod" value="HPP(1):below1000" />
            <input type="hidden" name="merchantData" value={`partnerId=${partnerId}&productCode=${productCode}`} />

            <input type="hidden" name="signature" value={signature} />
            <input type="hidden" name="mKey" value={mKey} />

            <input type="hidden" name="returnUrl" value="https://www.cruisedot.co.kr/api/payment/return" />
            <input type="hidden" name="closeUrl" value="https://www.cruisedot.co.kr/payment/close" />
          </form>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">결제 페이지 로딩 중...</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutContent />
    </Suspense>
  );
}
