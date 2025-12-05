'use client';

// ============================================
// 결제 체크아웃 페이지 v8.3 (PC + Mobile 통합)
// ============================================
// 핵심 1: PC/Mobile 모두 동일한 Safe Data 사용
// 핵심 2: Mobile은 P_AMT, P_GOODS 등 모바일 전용 파라미터 사용
// 핵심 3: partnerId, productCode가 결제 후에도 유지 (DB 조회로 실적 연결)
// 핵심 4: API 실패해도 Fallback으로 결제 가능
// ============================================

import { useEffect, useState, Suspense, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiCreditCard, FiAlertTriangle, FiSmartphone } from 'react-icons/fi';

// INIStdPay 전역 타입 선언
declare global {
  interface Window {
    INIStdPay?: {
      pay: (formId: string) => void;
    };
  }
}

// ============================================
// [1단계: 비상용 값 정의 (Fallback Constants)]
// ============================================
const FALLBACK = {
  productName: '크루즈 여행 상품 (기본)',
  productCode: '',
  price: 1000,
  buyerName: '방문자',
  buyerTel: '010-0000-0000',
  buyerEmail: 'no-email@cruisedot.co.kr',
  mid: 'wpcrdot200', // 운영 MID
  signKey: 'SGI2dkFzRFc1WHp6K1VTOFVUS3dGdz09', // 운영 SignKey
  currency: 'WON',
  payViewType: 'overlay', // 팝업 차단 방지 필수
  gopaymethod: 'Card',
  charset: 'UTF-8',
};

// 모바일 결제 URL (하드코딩 - 안전장치)
const MOBILE_PAYMENT_URL = 'https://mobile.paywelcome.co.kr/smart/wcard/';

// 콜백 URL 설정 (절대경로 필수)
const BASE_URL = 'https://www.cruisedot.co.kr';

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return BASE_URL;
};

// ============================================
// [클라이언트 사이드 SHA-256 Signature 생성]
// ============================================
async function sha256Async(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// PC Web Signature 생성 (브라우저용)
async function generatePCSignatureClient(
  signKey: string,
  price: number,
  oid: string,
  timestamp: string
): Promise<{ mKey: string; signature: string }> {
  // 1. mKey = SHA-256(signKey)
  const mKey = await sha256Async(signKey);

  // 2. signature = SHA-256("mKey={mkey}&oid={주문번호}&price={금액}&timestamp={타임스탬프}")
  const signString = `mKey=${mKey}&oid=${oid}&price=${price}&timestamp=${timestamp}`;
  const signature = await sha256Async(signString);

  return { mKey, signature };
}

// ============================================
// 결제 데이터 타입
// ============================================
interface PaymentData {
  orderId: string;
  productName: string;
  amount: number;
  buyerName: string;
  buyerTel: string;
  buyerEmail: string;
  productCode: string;
  partnerId: string; // 판매원 ID (affiliateMallUserId)
  affiliateCode: string; // 어필리에이트 코드
}

function PaymentCheckoutContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  // Ref로 초기 oid 고정 (리렌더링 방지)
  const initialOidRef = useRef<string>(`temp_${Date.now()}`);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  // API에서 가져온 결제 데이터
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

  // mKey, signature 상태 (빈값이라도 폼에 들어감)
  const [mKey, setMKey] = useState('');
  const [signature, setSignature] = useState('');
  const [timestamp, setTimestamp] = useState('');

  // ============================================
  // [2단계: Safe Data Transformation]
  // API 데이터가 있으면 쓰고, 없으면 Fallback 사용
  // ============================================
  const safeGoodname = useMemo(() => {
    return paymentData?.productName
      ? paymentData.productName.replace(/["'<>]/g, '').substring(0, 80)
      : FALLBACK.productName;
  }, [paymentData?.productName]);

  const safePrice = useMemo(() => {
    return (paymentData?.amount && paymentData.amount >= 1000)
      ? paymentData.amount
      : FALLBACK.price;
  }, [paymentData?.amount]);

  const safeOid = useMemo(() => {
    return paymentData?.orderId || initialOidRef.current;
  }, [paymentData?.orderId]);

  const safeBuyerName = paymentData?.buyerName?.trim() || FALLBACK.buyerName;
  const safeBuyerTel = paymentData?.buyerTel?.trim() || FALLBACK.buyerTel;
  const safeBuyerEmail = paymentData?.buyerEmail?.trim() || FALLBACK.buyerEmail;

  // [중요] 실적 추적용 데이터 - DB에 이미 저장되어 있음
  const safeProductCode = paymentData?.productCode || FALLBACK.productCode;
  const safePartnerId = paymentData?.partnerId || '';
  const safeAffiliateCode = paymentData?.affiliateCode || '';

  // 타임스탬프 (로딩 중에도 값 유지)
  const safeTimestamp = timestamp || String(Date.now());

  // merchantData: 결제 후에도 파트너 정보 추적 가능하도록 (백업용)
  const merchantData = useMemo(() => {
    const data = [
      `partnerId=${safePartnerId}`,
      `productCode=${safeProductCode}`,
      `affiliateCode=${safeAffiliateCode}`,
    ].join('&');
    return data;
  }, [safePartnerId, safeProductCode, safeAffiliateCode]);

  // 콜백 URL (절대경로 사용)
  const baseUrl = getBaseUrl();
  const returnUrl = `${baseUrl}/api/payment/return`;
  const closeUrl = `${baseUrl}/payment/failed?reason=closed`;
  const notiUrl = `${baseUrl}/api/payment/notify`;
  const callbackUrl = `${baseUrl}/api/payment/callback`; // Mobile용

  // ============================================
  // 1. 클라이언트 마운트 + 모바일 감지
  // ============================================
  useEffect(() => {
    setIsClient(true);
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'mobile'];
    const detected = mobileKeywords.some(keyword => userAgent.includes(keyword));
    setIsMobile(detected);
    console.log('[Checkout v8.3] PC + Mobile 통합 모드, isMobile:', detected);
  }, []);

  // ============================================
  // 2. 결제 데이터 로드 (API 호출 + Fallback)
  // ============================================
  useEffect(() => {
    if (!isClient) return;

    const loadPaymentData = async () => {
      // orderId가 없으면 즉시 Fallback 모드
      if (!orderId) {
        console.log('[Checkout v8.3] orderId 없음 - Fallback 모드 활성화');
        setUseFallback(true);
        setIsLoading(false);
        return;
      }

      try {
        console.log('[Checkout v8.3] 결제 데이터 로드 시작:', orderId);

        const response = await fetch(`/api/payment/prepare?orderId=${orderId}&isMobile=${isMobile}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`API 응답 실패: ${response.status}`);
        }

        const result = await response.json();

        if (result.ok && result.payment) {
          console.log('[Checkout v8.3] API 데이터 로드 성공:', result.payment);

          // metadata에서 partnerId 추출 (결제 요청 시 저장됨)
          const metadata = result.payment.metadata || {};

          setPaymentData({
            orderId: result.payment.orderId,
            productName: result.payment.productName,
            amount: result.payment.amount,
            buyerName: result.payment.buyerName,
            buyerTel: result.payment.buyerTel,
            buyerEmail: result.payment.buyerEmail || '',
            productCode: result.payment.productCode || metadata.productCode || '',
            partnerId: metadata.partnerId || '', // URL partner 파라미터에서 저장됨
            affiliateCode: metadata.affiliateCode || '',
          });

          // 🔍 [검증 로그] 파트너 정보 확인
          console.log('[Checkout v8.3] Partner Info:', {
            productCode: result.payment.productCode || metadata.productCode,
            partnerId: metadata.partnerId,
            affiliateCode: metadata.affiliateCode,
          });

          setUseFallback(false);
        } else {
          throw new Error(result.error || '결제 정보를 찾을 수 없습니다');
        }
      } catch (err) {
        console.warn('[Checkout v8.3] API 로드 실패, Fallback 모드:', err);
        setError(err instanceof Error ? err.message : '데이터 로드 실패');
        setUseFallback(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadPaymentData();
  }, [isClient, orderId, isMobile]);

  // ============================================
  // 3. mKey, signature 생성 (클라이언트 마운트 후)
  // ============================================
  useEffect(() => {
    if (!isClient) return;

    const generateSignatures = async () => {
      try {
        const ts = String(Date.now());
        setTimestamp(ts);

        const { mKey: generatedMKey, signature: generatedSignature } =
          await generatePCSignatureClient(
            FALLBACK.signKey,
            safePrice,
            safeOid,
            ts
          );

        setMKey(generatedMKey);
        setSignature(generatedSignature);
        console.log('[Checkout v8.3] Signature 생성 완료');
      } catch (err) {
        console.error('[Checkout v8.3] Signature 생성 실패:', err);
        // 실패해도 빈값으로 폼에 들어감 (JS 오류 방지)
      }
    };

    generateSignatures();
  }, [isClient, safePrice, safeOid]);

  // ============================================
  // 4. INIStdPay.js 스크립트 로드 (PC 전용)
  // ============================================
  useEffect(() => {
    if (!isClient) return;

    // 모바일은 스크립트 불필요 (Form Submit 방식)
    if (isMobile) {
      setScriptLoaded(true); // 모바일은 항상 ready
      console.log('[Checkout v8.3] Mobile - 스크립트 로드 스킵');
      return;
    }

    console.log('[Checkout v8.3] PC - Loading INIStdPay.js...');

    if (window.INIStdPay && typeof window.INIStdPay.pay === 'function') {
      setScriptLoaded(true);
      return;
    }

    const SCRIPT_URL = 'https://stdpay.paywelcome.co.kr/stdjs/INIStdPay.js';
    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = false;

    script.onload = () => {
      console.log('[Checkout v8.3] PC Script loaded');
      setTimeout(() => {
        if (window.INIStdPay) {
          setScriptLoaded(true);
          console.log('[Checkout v8.3] INIStdPay ready');
        }
      }, 500);
    };

    script.onerror = () => {
      console.error('[Checkout v8.3] PC Script load failed');
      // 실패해도 UI는 계속 표시
    };

    document.head.appendChild(script);
  }, [isClient, isMobile]);

  // ============================================
  // [4단계: 결제 실행] - PC/Mobile 분기
  // ============================================
  const handlePayment = () => {
    if (isPaymentProcessing) return;
    setIsPaymentProcessing(true);

    console.log('[Checkout v8.3] Payment clicked, isMobile:', isMobile);
    console.log('[Checkout v8.3] Form data:', {
      oid: safeOid,
      price: safePrice,
      productCode: safeProductCode,
      partnerId: safePartnerId,
      merchantData,
      mKey: mKey ? '설정됨' : '미설정',
      signature: signature ? '설정됨' : '미설정',
    });

    // ============================================
    // [Mobile 결제] - Form Submit 방식
    // ============================================
    if (isMobile) {
      console.log('[Checkout v8.3] Mobile 결제 시작...');

      // 1. 동적 폼 생성
      const form = document.createElement('form');
      form.method = 'POST';
      form.acceptCharset = 'euc-kr'; // 모바일 필수 인코딩
      form.action = MOBILE_PAYMENT_URL; // URL 하드코딩 (안전장치)

      // 2. [핵심] PC 변수명 -> Mobile 변수명 매핑 (매뉴얼 11p 기준)
      const mobileParams: Record<string, string> = {
        P_MID: FALLBACK.mid,           // 상점 ID
        P_OID: safeOid,                // 주문번호
        P_AMT: String(safePrice),      // 결제금액 (PC: price -> Mobile: P_AMT)
        P_UNAME: safeBuyerName,        // 구매자명 (PC: buyername -> Mobile: P_UNAME)
        P_GOODS: safeGoodname,         // 상품명 (PC: goodname -> Mobile: P_GOODS)
        P_MOBILE: safeBuyerTel,        // 휴대전화
        P_EMAIL: safeBuyerEmail,       // 이메일

        // 3. 필수 URL 및 설정 (절대경로 필수!)
        P_NEXT_URL: callbackUrl,       // 결과 수신 URL (절대경로)
        P_NOTI_URL: notiUrl,           // 통보 URL
        P_HPP_METHOD: '1',             // 휴대폰 결제 시 컨텐츠 구분 (필수)
        P_RESERVED: 'twotrs_isp=Y&block_isp=Y&twotrs_bank=Y&apprun_check=Y', // 앱 연동 필수 옵션
        P_CHARSET: 'utf8',             // 결과는 utf8로 받음
      };

      // 4. Input 태그 생성 및 폼에 추가
      Object.entries(mobileParams).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      // 5. 보안 데이터 (mKey, Signature) 추가
      // API가 죽어서 값이 없어도 빈 값으로라도 보내야 폼 전송이 됨
      const mKeyInput = document.createElement('input');
      mKeyInput.type = 'hidden';
      mKeyInput.name = 'mkey'; // 모바일은 소문자 mkey 주의 (매뉴얼 10p)
      mKeyInput.value = mKey || '';
      form.appendChild(mKeyInput);

      const signInput = document.createElement('input');
      signInput.type = 'hidden';
      signInput.name = 'P_SIGNATURE'; // 모바일은 P_SIGNATURE
      signInput.value = signature || '';
      form.appendChild(signInput);

      // 6. 🔍 [디버그 로그] 모바일 폼 데이터 확인
      console.log('[Checkout v8.3] Mobile Form Params:', mobileParams);
      console.log('[Checkout v8.3] Mobile mKey:', mKey ? '설정됨' : '미설정');
      console.log('[Checkout v8.3] Mobile P_NEXT_URL:', callbackUrl);

      // 7. 제출 (페이지 이동)
      document.body.appendChild(form);
      form.submit();
      return;
    }

    // ============================================
    // [PC 결제] - INIStdPay.pay() 방식
    // ============================================
    console.log('[Checkout v8.3] PC 결제 시작...');

    // 스크립트 로드 체크
    if (typeof window.INIStdPay === 'undefined') {
      alert('결제 시스템을 불러오는 중입니다. 잠시 후 다시 클릭해주세요.');
      setIsPaymentProcessing(false);
      return;
    }

    // 폼이 있는지 최종 확인 후 실행
    const form = document.getElementById('SendPayForm_id');
    if (form) {
      console.log('[Checkout v8.3] Calling INIStdPay.pay()...');
      window.INIStdPay.pay('SendPayForm_id'); // 무조건 실행
    } else {
      // 만약 폼이 없으면 강제로라도 다시 그림 (비상 복구)
      alert('결제 폼 생성 중입니다. 새로고침 해주세요.');
      setIsPaymentProcessing(false);
    }
  };

  // 폼 준비 완료 여부 (모바일은 항상 ready, PC는 스크립트 체크)
  const isFormReady = isMobile ? !isLoading : scriptLoaded;

  // ============================================
  // 메인 렌더링
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">

        {/* ============================================
            [PC 전용 폼] - 조건부 렌더링 금지!
            API 로딩 중이라도 이 폼은 무조건 화면에 박혀있어야 함
            주의: action, method 속성 절대 금지
            ============================================ */}
        <form
          id="SendPayForm_id"
          name="SendPayForm_id"
          onSubmit={(e) => e.preventDefault()}
        >
          {/* 1. 결제 필수 정보 (변환된 Safe Data 사용) */}
          <input type="hidden" name="goodname" value={safeGoodname} />
          <input type="hidden" name="price" value={safePrice} />
          <input type="hidden" name="oid" value={safeOid} />
          <input type="hidden" name="buyername" value={safeBuyerName} />
          <input type="hidden" name="buyertel" value={safeBuyerTel} />
          <input type="hidden" name="buyeremail" value={safeBuyerEmail} />

          {/* 2. 시스템 고정 정보 */}
          <input type="hidden" name="mid" value={FALLBACK.mid} />
          <input type="hidden" name="currency" value={FALLBACK.currency} />
          <input type="hidden" name="payViewType" value={FALLBACK.payViewType} />
          <input type="hidden" name="gopaymethod" value={FALLBACK.gopaymethod} />
          <input type="hidden" name="charset" value="UTF-8" />

          {/* 3. 데이터 추적용 (중요: 실적 연결 고리) */}
          <input type="hidden" name="merchantData" value={merchantData} />

          {/* 4. 보안 데이터 (서버 통신 실패 시 빈값이라도 넣어서 JS 오류 방지) */}
          <input type="hidden" name="timestamp" value={safeTimestamp} />
          <input type="hidden" name="signature" value={signature || ''} />
          <input type="hidden" name="mKey" value={mKey || ''} />

          {/* 5. 콜백 URL */}
          <input type="hidden" name="returnUrl" value={returnUrl} />
          <input type="hidden" name="closeUrl" value={closeUrl} />
          <input type="hidden" name="notiurl" value={notiUrl} />
        </form>

        {/* 로딩 오버레이 */}
        {(!isClient || isLoading) && (
          <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">결제 정보 로딩 중...</p>
            </div>
          </div>
        )}

        {/* 결제 정보 카드 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className={`px-6 py-4 ${useFallback
            ? 'bg-gradient-to-r from-orange-500 to-red-500'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}
          >
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {isMobile && <FiSmartphone className="w-5 h-5" />}
              결제하기
              <span className="text-xs font-normal opacity-80">
                {useFallback ? '(비상 모드)' : isMobile ? '(Mobile v8.3)' : '(PC v8.3)'}
              </span>
            </h1>
            <p className="text-white/80 text-sm mt-1">
              {useFallback
                ? '기본 결제 정보로 진행됩니다'
                : '웰컴페이먼츠 안전 결제'}
            </p>
          </div>

          <div className="p-6">
            {/* Fallback 모드 안내 */}
            {useFallback && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <FiAlertTriangle className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-orange-800 text-sm">
                    <strong>비상 결제 모드</strong><br/>
                    주문 정보를 불러올 수 없어 기본값으로 진행합니다.
                    {error && <div className="mt-1 text-xs opacity-75">({error})</div>}
                  </div>
                </div>
              </div>
            )}

            {/* 주문 정보 */}
            <div className="border-b pb-4 mb-4">
              <h2 className="font-semibold text-gray-800 mb-3">주문 정보</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">상품명</span>
                  <span className="font-medium text-right max-w-[200px] truncate">
                    {safeGoodname}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">주문번호</span>
                  <span className="font-mono text-xs text-gray-600">
                    {safeOid}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">구매자</span>
                  <span className="font-medium">{safeBuyerName}</span>
                </div>
                {safeProductCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">상품코드</span>
                    <span className="font-mono text-xs text-gray-600">{safeProductCode}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 결제 금액 */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">결제 금액</span>
                <span className="text-2xl font-bold text-blue-600">
                  {safePrice.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 상태 표시 */}
            <div className="mb-4 space-y-1 text-sm">
              {isMobile ? (
                <div className="text-green-600">
                  ✅ 모바일 결제 준비 완료
                </div>
              ) : (
                <div className={scriptLoaded ? 'text-green-600' : 'text-orange-600'}>
                  {scriptLoaded ? '✅ 결제 모듈 준비 완료' : '⏳ 결제 모듈 로딩 중...'}
                </div>
              )}
              <div className={mKey && signature ? 'text-green-600' : 'text-orange-600'}>
                {mKey && signature ? '✅ 보안 서명 생성 완료' : '⏳ 보안 서명 생성 중...'}
              </div>
              {safePartnerId && (
                <div className="text-blue-600">
                  ✅ 판매원 연결됨
                </div>
              )}
            </div>

            {/* 결제 버튼 */}
            <button
              type="button"
              onClick={handlePayment}
              disabled={isPaymentProcessing || !isFormReady}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isPaymentProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  {isMobile ? '결제 페이지 이동 중...' : '결제창 여는 중...'}
                </span>
              ) : !isFormReady ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  결제 준비 중...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isMobile ? <FiSmartphone className="w-5 h-5" /> : <FiCreditCard className="w-5 h-5" />}
                  {safePrice.toLocaleString()}원 결제하기
                </span>
              )}
            </button>

            {/* 안내 문구 */}
            <p className="text-xs text-gray-500 text-center mt-4">
              {isMobile
                ? '결제 버튼을 누르면 모바일 결제 페이지로 이동합니다.'
                : '결제 버튼을 누르면 웰컴페이먼츠 결제창이 열립니다.'}
            </p>
          </div>
        </div>

        {/* 디버그 정보 (개발용) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-800 text-green-400 rounded-lg p-4 text-xs font-mono overflow-auto">
            <div className="mb-2 text-gray-400">// Debug Info (v8.3 PC + Mobile)</div>
            <div className="text-cyan-400 font-bold">isMobile: {String(isMobile)}</div>
            <div>orderId: {orderId || 'null'}</div>
            <div>safeOid: {safeOid}</div>
            <div>safePrice: {safePrice}</div>
            <div className="text-yellow-400">productCode: {safeProductCode || '(없음)'}</div>
            <div className="text-yellow-400">partnerId: {safePartnerId || '(없음)'}</div>
            <div className="text-yellow-400">affiliateCode: {safeAffiliateCode || '(없음)'}</div>
            <div className="text-cyan-400">merchantData: {merchantData}</div>
            <div>useFallback: {String(useFallback)}</div>
            <div>isLoading: {String(isLoading)}</div>
            <div>scriptLoaded: {String(scriptLoaded)}</div>
            <div>isFormReady: {String(isFormReady)}</div>
            <div>mKey: {mKey ? mKey.substring(0, 16) + '...' : '(empty)'}</div>
            <div>signature: {signature ? signature.substring(0, 16) + '...' : '(empty)'}</div>
            <div>timestamp: {safeTimestamp}</div>
            {isMobile && (
              <>
                <div className="text-pink-400 mt-2">--- Mobile Params ---</div>
                <div>P_NEXT_URL: {callbackUrl}</div>
                <div>P_NOTI_URL: {notiUrl}</div>
              </>
            )}
          </div>
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

export default function PaymentCheckoutPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentCheckoutContent />
    </Suspense>
  );
}
