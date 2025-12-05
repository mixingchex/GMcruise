'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// INIStdPay 전역 타입 선언
declare global {
  interface Window {
    INIStdPay?: {
      pay: (formId: string) => void;
    };
  }
}

// 비상용 기본값 (API 데이터 없을 때 사용)
const FALLBACK = {
  mid: 'wpcrdot200', // 운영 MID
  price: 1000,
  goodname: '크루즈 여행 상품',
  buyername: '방문자',
  buyertel: '010-0000-0000',
  buyeremail: 'no-email@cruisedot.co.kr',
  currency: 'WON',
  payViewType: 'overlay',
  gopaymethod: 'Card',
  charset: 'UTF-8'
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isMobile, setIsMobile] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [autoLaunched, setAutoLaunched] = useState(false);

  // 1. URL 데이터 수신 (API 호출 X -> 404 에러 원천 차단)
  const orderId = searchParams.get('orderId') || `ord_${Date.now()}`;
  const goodname = searchParams.get('goodname') ? decodeURIComponent(searchParams.get('goodname')!) : FALLBACK.goodname;
  const price = searchParams.get('price') || String(FALLBACK.price);
  const buyername = searchParams.get('buyername') ? decodeURIComponent(searchParams.get('buyername')!) : FALLBACK.buyername;
  const buyertel = searchParams.get('buyertel') || FALLBACK.buyertel;
  const buyeremail = searchParams.get('buyeremail') || FALLBACK.buyeremail;

  // 어필리에이트 추적 정보
  const partnerId = searchParams.get('partnerId') || '';
  const productCode = searchParams.get('productCode') || '';

  // PC용 추적 데이터 (merchantData)
  const merchantData = `partnerId=${partnerId}&productCode=${productCode}`;

  // 보안 데이터 (임시 생성 - 실제 운영 시 서버에서 받아야 함)
  const timestamp = String(Date.now());
  const mKey = ""; // 클라이언트에서 생성 불가 시 빈값 (화면 띄우기 우선)
  const signature = "";

  // 2. 모바일 감지 및 스크립트 로드
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    setIsMobile(isMobileDevice);

    // PC일 때만 스크립트 로드
    if (!isMobileDevice) {
      const script = document.createElement('script');
      script.src = 'https://stdpay.paywelcome.co.kr/stdjs/INIStdPay.js';
      script.onload = () => setIsScriptLoaded(true);
      document.head.appendChild(script);
    } else {
      setIsScriptLoaded(true); // 모바일은 스크립트 없이 바로 준비 완료
    }
  }, []);

  // 3. 자동 실행 (Auto-Launch) - 5060 고객 편의
  useEffect(() => {
    if (isScriptLoaded && !autoLaunched) {
      const timer = setTimeout(() => {
        handlePayment();
        setAutoLaunched(true);
      }, 800); // 0.8초 후 자동 실행
      return () => clearTimeout(timer);
    }
  }, [isScriptLoaded, autoLaunched]);

  // 4. 결제 실행 핸들러
  const handlePayment = () => {
    if (isMobile) {
      // === [Mobile] 동적 폼 생성 및 리다이렉트 ===
      const form = document.createElement('form');
      form.method = 'POST';
      form.acceptCharset = 'euc-kr';
      form.action = 'https://mobile.paywelcome.co.kr/smart/wcard/';

      const params: Record<string, string> = {
        P_MID: FALLBACK.mid,
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
        // [중요] 모바일은 P_NOTI에 파트너 정보 숨김
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
      // === [PC] Overlay 팝업 실행 ===
      if (typeof window.INIStdPay === 'undefined') {
        // 로드 안됐으면 재시도 알림
        return;
      }
      // 표준 폼 ID 찾아서 실행
      if (document.getElementById('SendPayForm_id')) {
        window.INIStdPay.pay('SendPayForm_id');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-blue-600 mb-2">결제 진행 중</h2>
        <p className="text-gray-500 mb-6 text-sm">
          잠시만 기다려주세요.<br />결제창이 자동으로 열립니다.
        </p>

        {/* PC용 표준 폼 (화면에 보이지 않음) */}
        {!isMobile && (
          <form id="SendPayForm_id" name="SendPayForm_id" style={{ display: 'none' }}>
            <input type="hidden" name="mid" value={FALLBACK.mid} />
            <input type="hidden" name="oid" value={orderId} />
            <input type="hidden" name="goodname" value={goodname} />
            <input type="hidden" name="price" value={price} />
            <input type="hidden" name="buyername" value={buyername} />
            <input type="hidden" name="buyertel" value={buyertel} />
            <input type="hidden" name="buyeremail" value={buyeremail} />
            <input type="hidden" name="timestamp" value={timestamp} />
            <input type="hidden" name="currency" value={FALLBACK.currency} />
            <input type="hidden" name="payViewType" value="overlay" />
            <input type="hidden" name="gopaymethod" value={FALLBACK.gopaymethod} />
            <input type="hidden" name="charset" value={FALLBACK.charset} />
            <input type="hidden" name="signature" value={signature} />
            <input type="hidden" name="mKey" value={mKey} />
            <input type="hidden" name="acceptmethod" value="HPP(1):below1000" />

            {/* PC용 파트너 정보 */}
            <input type="hidden" name="merchantData" value={merchantData} />

            <input type="hidden" name="returnUrl" value="https://www.cruisedot.co.kr/api/payment/return" />
            <input type="hidden" name="closeUrl" value="https://www.cruisedot.co.kr/payment/close" />
          </form>
        )}

        <button
          type="button"
          onClick={handlePayment}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
        >
          결제창이 안 뜨면 클릭하세요
        </button>
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
