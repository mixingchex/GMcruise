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
  const [isSignatureLoaded, setIsSignatureLoaded] = useState(false);

  // [상태] 결제 수단 선택 (기본값: 카드)
  // Card(신용카드), DirectBank(계좌이체), VBank(가상계좌), HPP(휴대폰)
  const [payMethod, setPayMethod] = useState('Card');

  // 보안 데이터 (서버에서 받아옴)
  const [timestamp, setTimestamp] = useState('');
  const [mKey, setMKey] = useState('');
  const [signature, setSignature] = useState('');

  // ============================================
  // 1. 데이터 수신 (API 호출 X, URL 파라미터만 사용)
  // ============================================
  const orderId = searchParams.get('orderId') || `ord_${Date.now()}`;
  const goodname = searchParams.get('goodname') ? decodeURIComponent(searchParams.get('goodname')!) : '기본 상품';
  const price = searchParams.get('price') || '1000';
  const buyername = searchParams.get('buyername') ? decodeURIComponent(searchParams.get('buyername')!) : '방문자';
  const buyertel = searchParams.get('buyertel') || '01000000000';
  const buyeremail = searchParams.get('buyeremail') || 'test@test.com';

  // 추적 데이터 (파트너 실적용)
  const partnerId = searchParams.get('partnerId') || '';
  const productCode = searchParams.get('productCode') || '';
  const merchantData = `partnerId=${partnerId}&productCode=${productCode}`;

  // ============================================
  // 2. 초기화 (PC: 스크립트 로드 + 서명 생성 / Mobile: 바로 준비)
  // ============================================
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobile = /android|iphone|ipad|ipod/i.test(userAgent);
    setIsMobile(mobile);

    if (!mobile) {
      // PC: 웰컴페이먼츠 스크립트 로드
      const script = document.createElement('script');
      script.src = 'https://stdpay.paywelcome.co.kr/stdjs/INIStdPay.js';
      script.onload = () => setIsScriptLoaded(true);
      document.head.appendChild(script);

      // PC: 서명 생성 API 호출
      fetch('/api/payment/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, price }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setTimestamp(data.timestamp);
            setMKey(data.mKey);
            setSignature(data.signature);
            setIsSignatureLoaded(true);
            console.log('[Checkout] Signature loaded:', { orderId, price });
          } else {
            console.error('[Checkout] Signature error:', data.error);
          }
        })
        .catch((err) => {
          console.error('[Checkout] Signature fetch error:', err);
        });
    } else {
      // Mobile: 스크립트/서명 불필요
      setIsScriptLoaded(true);
      setIsSignatureLoaded(true);
    }
  }, [orderId, price]);

  // ============================================
  // 3. 결제 실행 핸들러 (PC/Mobile 분기)
  // ============================================
  const handlePayment = () => {
    // 디버깅: 현재 상태 확인
    console.log('[Checkout] Payment clicked:', {
      isMobile,
      isScriptLoaded,
      isSignatureLoaded,
      timestamp,
      mKey: mKey ? `${mKey.substring(0, 10)}...` : 'empty',
      signature: signature ? `${signature.substring(0, 10)}...` : 'empty',
      orderId,
      price,
      payMethod,
    });

    if (isMobile) {
      // === Mobile: 동적 폼 생성 후 POST 전송 ===
      const form = document.createElement('form');
      form.method = 'POST';
      form.acceptCharset = 'euc-kr';
      form.action = 'https://mobile.paywelcome.co.kr/smart/wcard/';

      const params: Record<string, string> = {
        P_MID: 'wpcrdot200',
        P_OID: orderId,
        P_AMT: price,                    // price -> P_AMT
        P_UNAME: buyername,
        P_GOODS: goodname,               // goodname -> P_GOODS
        P_MOBILE: buyertel,
        P_EMAIL: buyeremail,
        P_NEXT_URL: 'https://www.cruisedot.co.kr/api/payment/callback',
        P_NOTI_URL: 'https://www.cruisedot.co.kr/api/payment/notify',
        P_HPP_METHOD: '1',
        P_CHARSET: 'utf8',
        P_NOTI: merchantData             // partnerId 포함
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
      // === PC: Overlay 팝업 실행 ===
      if (typeof window.INIStdPay === 'undefined') {
        console.error('[Checkout] INIStdPay not loaded');
        alert('결제 모듈 로딩 중... 잠시 후 다시 클릭해주세요.');
        return;
      }

      // 서명 데이터 확인
      if (!signature || !mKey || !timestamp) {
        console.error('[Checkout] Missing signature data:', { signature: !!signature, mKey: !!mKey, timestamp: !!timestamp });
        alert('결제 서명 데이터 로딩 중... 잠시 후 다시 클릭해주세요.');
        return;
      }

      const form = document.getElementById('SendPayForm_id') as HTMLFormElement;
      if (form) {
        // 폼 데이터 디버깅
        const formData = new FormData(form);
        console.log('[Checkout] Form data before payment:');
        formData.forEach((value, key) => {
          if (key === 'mKey' || key === 'signature') {
            console.log(`  ${key}: ${String(value).substring(0, 20)}...`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        });

        console.log('[Checkout] Calling INIStdPay.pay()...');
        window.INIStdPay.pay('SendPayForm_id');
      } else {
        console.error('[Checkout] Form not found: SendPayForm_id');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* 헤더 */}
        <div className="bg-blue-600 px-6 py-4">
          <h1 className="text-xl font-bold text-white">결제하기</h1>
        </div>

        <div className="p-6 space-y-6">
          {/* 주문 정보 요약 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="font-bold text-gray-700 mb-2">주문 정보</h2>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">상품명</span>
              <span className="font-medium truncate max-w-[200px]">{goodname}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">구매자</span>
              <span className="font-medium">{buyername}</span>
            </div>
            <div className="flex justify-between text-lg mt-3 pt-3 border-t">
              <span className="font-bold text-gray-800">결제 금액</span>
              <span className="font-bold text-blue-600">{parseInt(price).toLocaleString()}원</span>
            </div>
          </div>

          {/* 결제 수단 선택 UI (4가지) */}
          <div>
            <h3 className="font-bold text-gray-700 mb-3">결제 수단 선택</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayMethod('Card')}
                className={`p-4 border-2 rounded-lg font-medium transition-all ${
                  payMethod === 'Card'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                신용카드
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('DirectBank')}
                className={`p-4 border-2 rounded-lg font-medium transition-all ${
                  payMethod === 'DirectBank'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                계좌이체
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('VBank')}
                className={`p-4 border-2 rounded-lg font-medium transition-all ${
                  payMethod === 'VBank'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                가상계좌
              </button>
              <button
                type="button"
                onClick={() => setPayMethod('HPP')}
                className={`p-4 border-2 rounded-lg font-medium transition-all ${
                  payMethod === 'HPP'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                휴대폰
              </button>
            </div>
          </div>

          {/* 결제하기 버튼 */}
          <button
            onClick={handlePayment}
            disabled={!isMobile && (!isScriptLoaded || !isSignatureLoaded)}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {!isMobile && (!isScriptLoaded || !isSignatureLoaded)
              ? '결제 준비 중...'
              : `${parseInt(price).toLocaleString()}원 결제하기`}
          </button>

          {/* 안내 문구 */}
          <p className="text-xs text-gray-400 text-center">
            웰컴페이먼츠를 통한 안전한 결제
          </p>
        </div>

        {/* === PC용 표준 폼 (Hidden) === */}
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

            {/* 선택된 결제 수단 적용 */}
            <input type="hidden" name="gopaymethod" value={payMethod} />

            {/* payViewType: overlay 고정 */}
            <input type="hidden" name="payViewType" value="overlay" />
            <input type="hidden" name="charset" value="UTF-8" />
            <input type="hidden" name="acceptmethod" value="HPP(1):below1000" />

            {/* partnerId 포함 */}
            <input type="hidden" name="merchantData" value={merchantData} />

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
