'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

// INIStdPay 전역 타입 선언
declare global {
  interface Window {
    INIStdPay?: {
      pay: (formId: string) => void;
    };
    // 웰컴페이먼츠 결제 결과 콜백 (매뉴얼 참조)
    INIStdPayClose?: () => void;
    INIStdPayFail?: (data: any) => void;
  }
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isSignatureLoaded, setIsSignatureLoaded] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  // [상태] 결제 수단 선택 (기본값: 카드)
  // Card(신용카드), DirectBank(계좌이체), VBank(가상계좌), HPP(휴대폰)
  const [payMethod, setPayMethod] = useState('Card');

  // 보안 데이터 (서버에서 받아옴)
  const [timestamp, setTimestamp] = useState('');
  const [mKey, setMKey] = useState('');
  const [signature, setSignature] = useState('');
  // signature 생성 시 사용된 orderId (일관성 보장)
  const [signedOrderId, setSignedOrderId] = useState('');

  // ============================================
  // 1. 데이터 수신 (API 호출 X, URL 파라미터만 사용)
  // useMemo로 안정적인 값 유지
  // ============================================
  const orderId = useMemo(() => {
    return searchParams.get('orderId') || `ord_${Date.now()}`;
  }, [searchParams]);

  const goodname = useMemo(() => {
    const raw = searchParams.get('goodname');
    return raw ? decodeURIComponent(raw) : '기본 상품';
  }, [searchParams]);

  const price = useMemo(() => {
    return searchParams.get('price') || '1000';
  }, [searchParams]);

  const buyername = useMemo(() => {
    const raw = searchParams.get('buyername');
    return raw ? decodeURIComponent(raw) : '방문자';
  }, [searchParams]);

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
    console.log('[Checkout] Component mounted');
    setIsMounted(true);

    // 웰컴페이먼츠 결제 콜백 함수 등록 (결제창 닫힘/실패 시 호출)
    window.INIStdPayClose = () => {
      console.log('[Checkout] INIStdPayClose called - 결제창 닫힘');
      // 결제창 닫힘 시 로딩/처리 상태 복구
      setIsPaymentProcessing(false);
    };
    window.INIStdPayFail = (data: any) => {
      console.error('[Checkout] INIStdPayFail called - 결제 실패:', data);
      // 결제 실패 시 로딩/처리 상태 복구
      setIsPaymentProcessing(false);
      alert('결제 오류: ' + JSON.stringify(data));
    };

    // PAYMENT_CLOSED postMessage 수신 핸들러 (overlay/팝업 모드 공통)
    const handlePaymentClosedMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PAYMENT_CLOSED') {
        console.log('[Checkout] PAYMENT_CLOSED message received - 결제창 닫힘');
        setIsPaymentProcessing(false);
      }
    };
    window.addEventListener('message', handlePaymentClosedMessage);

    const userAgent = navigator.userAgent.toLowerCase();
    const mobile = /android|iphone|ipad|ipod/i.test(userAgent);
    console.log('[Checkout] Device detection:', { userAgent: userAgent.substring(0, 50), mobile });
    setIsMobile(mobile);

    if (!mobile) {
      // PC: 웰컴페이먼츠 스크립트 로드
      console.log('[Checkout] Loading INIStdPay script...');
      const existingScript = document.querySelector('script[src*="INIStdPay"]');
      if (existingScript) {
        console.log('[Checkout] Script already exists');
        setIsScriptLoaded(true);
      } else {
        const script = document.createElement('script');
        script.src = 'https://stdpay.paywelcome.co.kr/stdjs/INIStdPay.js';
        script.onload = () => {
          console.log('[Checkout] INIStdPay script loaded successfully');
          setIsScriptLoaded(true);
        };
        script.onerror = (e) => {
          console.error('[Checkout] INIStdPay script load error:', e);
        };
        document.head.appendChild(script);
      }

      // PC: 서명 생성 API 호출
      // orderId를 로컬 변수로 캡처해서 일관성 보장
      const currentOrderId = orderId;
      const currentPrice = price;
      console.log('[Checkout] Fetching signature...', { orderId: currentOrderId, price: currentPrice });

      fetch('/api/payment/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: currentOrderId, price: currentPrice }),
      })
        .then((res) => {
          console.log('[Checkout] Signature API response status:', res.status);
          return res.json();
        })
        .then((data) => {
          console.log('[Checkout] Signature API response:', {
            ok: data.ok,
            hasTimestamp: !!data.timestamp,
            hasMKey: !!data.mKey,
            hasSignature: !!data.signature,
            timestamp: data.timestamp,
            mKeyPreview: data.mKey ? data.mKey.substring(0, 10) + '...' : 'none',
            signaturePreview: data.signature ? data.signature.substring(0, 10) + '...' : 'none'
          });
          if (data.ok) {
            setTimestamp(data.timestamp);
            setMKey(data.mKey);
            setSignature(data.signature);
            setSignedOrderId(currentOrderId); // signature 생성에 사용된 orderId 저장
            setIsSignatureLoaded(true);
            console.log('[Checkout] Signature loaded successfully for orderId:', currentOrderId);
          } else {
            console.error('[Checkout] Signature error:', data.error);
            alert('결제 서명 생성 실패: ' + (data.error || '알 수 없는 오류'));
          }
        })
        .catch((err) => {
          console.error('[Checkout] Signature fetch error:', err);
          alert('결제 서명 요청 실패: ' + err.message);
        });
    } else {
      // Mobile: 스크립트는 불필요하지만 서명은 필요!
      console.log('[Checkout] Mobile detected, fetching signature...');
      setIsScriptLoaded(true); // 모바일은 스크립트 불필요

      // 모바일도 signature API 호출 (P_TIMESTAMP, P_SIGNATURE 필요)
      // 중요: 모바일용 signature는 PC와 다른 형식이므로 isMobile: true 전달
      const currentOrderId = orderId;
      const currentPrice = price;
      console.log('[Checkout Mobile] Fetching signature...', { orderId: currentOrderId, price: currentPrice });

      fetch('/api/payment/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: currentOrderId, price: currentPrice, isMobile: true }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('[Checkout Mobile] Signature API response:', {
            ok: data.ok,
            hasTimestamp: !!data.timestamp,
            hasSignature: !!data.signature,
          });
          if (data.ok) {
            setTimestamp(data.timestamp);
            setMKey(data.mKey);
            setSignature(data.signature);
            setSignedOrderId(currentOrderId);
            setIsSignatureLoaded(true);
            console.log('[Checkout Mobile] Signature loaded successfully');
          } else {
            console.error('[Checkout Mobile] Signature error:', data.error);
            alert('결제 서명 생성 실패: ' + (data.error || '알 수 없는 오류'));
          }
        })
        .catch((err) => {
          console.error('[Checkout Mobile] Signature fetch error:', err);
          alert('결제 서명 요청 실패: ' + err.message);
        });
    }

    return () => {
      window.removeEventListener('message', handlePaymentClosedMessage);
    };
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

    setIsPaymentProcessing(true);

    if (isMobile) {
      // === Mobile: 동적 폼 생성 후 POST 전송 ===
      // 서명 데이터 확인 (필수!)
      if (!signature || !timestamp) {
        console.error('[Checkout Mobile] Missing signature data:', { signature: !!signature, timestamp: !!timestamp });
        setIsPaymentProcessing(false);
        alert('결제 서명 데이터 로딩 중... 잠시 후 다시 클릭해주세요.');
        return;
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.acceptCharset = 'euc-kr';
      form.action = 'https://mobile.paywelcome.co.kr/smart/wcard/';

      const params: Record<string, string> = {
        P_MID: 'wpcrdot200',
        P_OID: signedOrderId || orderId,
        P_AMT: price,
        P_UNAME: buyername,
        P_GOODS: goodname,
        P_MOBILE: buyertel,
        P_EMAIL: buyeremail,
        P_NEXT_URL: 'https://www.cruisedot.co.kr/api/payment/callback',
        P_NOTI_URL: 'https://www.cruisedot.co.kr/api/payment/notify',
        P_HPP_METHOD: '1',
        P_CHARSET: 'utf8',
        P_NOTI: merchantData,
        // 보안 필드 (필수!) - 웰컴페이먼츠 매뉴얼 v1.10.6 Page 13
        P_TIMESTAMP: timestamp,
        P_SIGNATURE: signature,
      };

      console.log('[Checkout Mobile] Form params:', {
        P_MID: params.P_MID,
        P_OID: params.P_OID,
        P_AMT: params.P_AMT,
        P_TIMESTAMP: params.P_TIMESTAMP,
        P_SIGNATURE: params.P_SIGNATURE ? `${params.P_SIGNATURE.substring(0, 10)}...` : 'MISSING',
      });

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
        setIsPaymentProcessing(false);
        alert('결제 모듈 로딩 중... 잠시 후 다시 클릭해주세요.');
        return;
      }

      // 서명 데이터 확인
      if (!signature || !mKey || !timestamp) {
        console.error('[Checkout] Missing signature data:', { signature: !!signature, mKey: !!mKey, timestamp: !!timestamp });
        setIsPaymentProcessing(false);
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

        // 폼 필드 값 직접 확인
        const formElements = form.elements;
        console.log('[Checkout] Form elements count:', formElements.length);
        console.log('[Checkout] Critical values:', {
          mid: (formElements.namedItem('mid') as HTMLInputElement)?.value,
          oid: (formElements.namedItem('oid') as HTMLInputElement)?.value,
          price: (formElements.namedItem('price') as HTMLInputElement)?.value,
          timestamp: (formElements.namedItem('timestamp') as HTMLInputElement)?.value,
          signatureExists: !!(formElements.namedItem('signature') as HTMLInputElement)?.value,
          mKeyExists: !!(formElements.namedItem('mKey') as HTMLInputElement)?.value,
        });

        console.log('[Checkout] Calling INIStdPay.pay()...');
        console.log('[Checkout] INIStdPay object:', window.INIStdPay);
        console.log('[Checkout] Form HTML:', form.outerHTML.substring(0, 500));

        try {
          // 폼 필드 값 최종 확인
          const midVal = (formElements.namedItem('mid') as HTMLInputElement)?.value;
          const oidVal = (formElements.namedItem('oid') as HTMLInputElement)?.value;
          const priceVal = (formElements.namedItem('price') as HTMLInputElement)?.value;
          const timestampVal = (formElements.namedItem('timestamp') as HTMLInputElement)?.value;
          const signatureVal = (formElements.namedItem('signature') as HTMLInputElement)?.value;
          const mKeyVal = (formElements.namedItem('mKey') as HTMLInputElement)?.value;

          console.log('[Checkout] === FINAL FORM CHECK ===');
          console.log('[Checkout] mid:', midVal);
          console.log('[Checkout] oid:', oidVal);
          console.log('[Checkout] price:', priceVal);
          console.log('[Checkout] timestamp:', timestampVal);
          console.log('[Checkout] signature (64 chars):', signatureVal?.length === 64 ? 'OK' : `WRONG: ${signatureVal?.length}`);
          console.log('[Checkout] mKey (64 chars):', mKeyVal?.length === 64 ? 'OK' : `WRONG: ${mKeyVal?.length}`);

          // 필수값 누락 체크
          if (!midVal || !oidVal || !priceVal || !timestampVal || !signatureVal || !mKeyVal) {
            const missing = [];
            if (!midVal) missing.push('mid');
            if (!oidVal) missing.push('oid');
            if (!priceVal) missing.push('price');
            if (!timestampVal) missing.push('timestamp');
            if (!signatureVal) missing.push('signature');
            if (!mKeyVal) missing.push('mKey');
            console.error('[Checkout] Missing required fields:', missing.join(', '));
            setIsPaymentProcessing(false);
            alert('필수 결제 정보가 누락되었습니다: ' + missing.join(', '));
            return;
          }

          window.INIStdPay.pay('SendPayForm_id');
          console.log('[Checkout] INIStdPay.pay() called successfully');
        } catch (payError) {
          console.error('[Checkout] INIStdPay.pay() error:', payError);
          setIsPaymentProcessing(false);
          alert('결제 호출 오류: ' + (payError instanceof Error ? payError.message : String(payError)));
        }
      } else {
        console.error('[Checkout] Form not found: SendPayForm_id');
        setIsPaymentProcessing(false);
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
            disabled={isPaymentProcessing || (!isMobile && (!isScriptLoaded || !isSignatureLoaded))}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {isPaymentProcessing
              ? '결제 진행 중...'
              : !isMobile && (!isScriptLoaded || !isSignatureLoaded)
              ? '결제 준비 중...'
              : `${parseInt(price).toLocaleString()}원 결제하기`}
          </button>

          {/* 안내 문구 */}
          <p className="text-xs text-gray-400 text-center">
            웰컴페이먼츠를 통한 안전한 결제
          </p>
        </div>

        {/* === PC용 표준 폼 (Hidden) - 항상 렌더링 === */}
        {/* 매뉴얼 Page 19-20 기준 필수 필드 포함 */}
        <form id="SendPayForm_id" name="SendPayForm_name" style={{ display: 'none' }}>
          {/* 필수 기본 필드 */}
          <input type="hidden" name="version" value="1.0" />
          <input type="hidden" name="mid" value="wpcrdot200" />
          <input type="hidden" name="oid" value={signedOrderId || orderId} />
          <input type="hidden" name="goodname" value={goodname} />
          <input type="hidden" name="price" value={price} />
          <input type="hidden" name="currency" value="WON" />

          {/* 구매자 정보 */}
          <input type="hidden" name="buyername" value={buyername} />
          <input type="hidden" name="buyertel" value={buyertel} />
          <input type="hidden" name="buyeremail" value={buyeremail} />

          {/* 보안 필드 (서버에서 생성) */}
          <input type="hidden" name="timestamp" value={timestamp} />
          <input type="hidden" name="signature" value={signature} />
          <input type="hidden" name="mKey" value={mKey} />

          {/* 결제 수단 (필수 - 매뉴얼 v1.10.9에서 필수로 변경됨) */}
          <input type="hidden" name="gopaymethod" value={payMethod} />

          {/* 결제창 설정 */}
          <input type="hidden" name="payViewType" value="overlay" />
          <input type="hidden" name="charset" value="UTF-8" />

          {/* 결제 옵션 */}
          <input type="hidden" name="acceptmethod" value="HPP(1):below1000:NOINT(3:6:12)" />

          {/* URL 설정 (필수) */}
          <input type="hidden" name="returnUrl" value="https://www.cruisedot.co.kr/api/payment/return" />
          <input type="hidden" name="closeUrl" value="https://www.cruisedot.co.kr/payment/close" />
          <input type="hidden" name="popupUrl" value="https://www.cruisedot.co.kr/payment/popup" />
          <input type="hidden" name="notiurl" value="https://www.cruisedot.co.kr/api/payment/notify" />

          {/* 가맹점 데이터 (선택) */}
          <input type="hidden" name="merchantData" value={merchantData} />
        </form>
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
