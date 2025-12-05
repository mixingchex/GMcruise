'use client';

// ============================================
// 결제 체크아웃 페이지 v9.5 (모바일 실적 추적 완성)
// ============================================
// 핵심 1: URL 데이터 최우선 (API 호출 완전 제거)
// 핵심 2: payViewType="overlay" 하드코딩 (PC)
// 핵심 3: Auto-Launch로 즉시 결제창
// 핵심 4: PC - merchantData에 partnerId, productCode 포함
// 핵심 5: Mobile - P_NOTI 필드에 파트너 정보 전달 (실적 추적)
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

  // ============================================
  // [핵심 변경] URL 파라미터를 최우선으로 사용
  // API 404여도 URL에서 데이터를 직접 가져옴
  // ============================================
  const urlOrderId = searchParams.get('orderId');
  const urlGoodname = searchParams.get('goodname');
  const urlPrice = searchParams.get('price');
  const urlBuyername = searchParams.get('buyername');
  const urlBuyertel = searchParams.get('buyertel');
  const urlBuyeremail = searchParams.get('buyeremail');
  const urlProductCode = searchParams.get('productCode');
  const urlPartnerId = searchParams.get('partnerId');

  // Ref로 초기 oid 고정 (리렌더링 방지)
  const initialOidRef = useRef<string>(`temp_${Date.now()}`);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 자동 실행 여부 (1회만 실행)
  const [autoLaunched, setAutoLaunched] = useState(false);

  // API에서 가져온 결제 데이터 (보조용)
  const [apiPaymentData, setApiPaymentData] = useState<PaymentData | null>(null);

  // mKey, signature 상태 (빈값이라도 폼에 들어감)
  const [mKey, setMKey] = useState('');
  const [signature, setSignature] = useState('');
  const [timestamp, setTimestamp] = useState('');

  // ============================================
  // [2단계: Safe Data Transformation]
  // 우선순위: URL 파라미터 > API 데이터 > Fallback
  // ============================================
  const safeGoodname = useMemo(() => {
    // 1순위: URL 파라미터
    if (urlGoodname) {
      return decodeURIComponent(urlGoodname).replace(/["'<>]/g, '').substring(0, 80);
    }
    // 2순위: API 데이터
    if (apiPaymentData?.productName) {
      return apiPaymentData.productName.replace(/["'<>]/g, '').substring(0, 80);
    }
    // 3순위: Fallback
    return FALLBACK.productName;
  }, [urlGoodname, apiPaymentData?.productName]);

  const safePrice = useMemo(() => {
    // 1순위: URL 파라미터
    const urlPriceNum = urlPrice ? parseInt(urlPrice) : NaN;
    if (!isNaN(urlPriceNum) && urlPriceNum >= 1000) {
      return urlPriceNum;
    }
    // 2순위: API 데이터
    if (apiPaymentData?.amount && apiPaymentData.amount >= 1000) {
      return apiPaymentData.amount;
    }
    // 3순위: Fallback
    return FALLBACK.price;
  }, [urlPrice, apiPaymentData?.amount]);

  const safeOid = useMemo(() => {
    // 1순위: URL 파라미터
    if (urlOrderId) return urlOrderId;
    // 2순위: API 데이터
    if (apiPaymentData?.orderId) return apiPaymentData.orderId;
    // 3순위: 임시 생성
    return initialOidRef.current;
  }, [urlOrderId, apiPaymentData?.orderId]);

  // 1순위: URL > 2순위: API > 3순위: Fallback
  const safeBuyerName = urlBuyername
    ? decodeURIComponent(urlBuyername)
    : (apiPaymentData?.buyerName?.trim() || FALLBACK.buyerName);

  const safeBuyerTel = urlBuyertel || apiPaymentData?.buyerTel?.trim() || FALLBACK.buyerTel;
  const safeBuyerEmail = urlBuyeremail || apiPaymentData?.buyerEmail?.trim() || FALLBACK.buyerEmail;

  // [중요] 실적 추적용 데이터 - URL > API > 빈값
  const safeProductCode = urlProductCode || apiPaymentData?.productCode || '';
  const safePartnerId = urlPartnerId || apiPaymentData?.partnerId || '';
  const safeAffiliateCode = apiPaymentData?.affiliateCode || '';

  // ============================================
  // [핵심] URL에 결제 필수 데이터가 있는지 확인
  // goodname + price만 있으면 충분! (나머지는 Fallback 사용)
  // ============================================
  const hasUrlData = !!(urlGoodname && urlPrice);

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
    console.log('[Checkout v9.5] PC + Mobile 통합 모드, isMobile:', detected);
  }, []);

  // ============================================
  // 2. 결제 데이터 로드 (API 호출 완전 제거!)
  // 상세페이지에서 URL로 모든 데이터 전달받음
  // ============================================
  useEffect(() => {
    if (!isClient) return;

    console.log('========================================');
    console.log('[Checkout v9.5] 데이터 로드 시작');
    console.log('========================================');
    console.log('URL 파라미터 확인:');
    console.log('  urlGoodname:', urlGoodname);
    console.log('  urlPrice:', urlPrice);
    console.log('  urlOrderId:', urlOrderId);
    console.log('  urlBuyername:', urlBuyername);
    console.log('  urlProductCode:', urlProductCode);
    console.log('  urlPartnerId:', urlPartnerId);
    console.log('  hasUrlData:', hasUrlData);
    console.log('========================================');

    // URL에 goodname + price 있으면 즉시 진행 (API 호출 안함!)
    if (hasUrlData) {
      console.log('[Checkout v9.5] ✅ URL 데이터 있음 - 즉시 로딩 완료!');
    } else {
      console.log('[Checkout v9.5] ⚠️ URL 데이터 없음 - Fallback 사용');
    }

    // API 호출 없이 즉시 로딩 해제
    setIsLoading(false);
  }, [isClient, hasUrlData, urlOrderId, urlGoodname, urlPrice, urlBuyername, urlBuyertel, urlProductCode, urlPartnerId]);

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
        console.log('[Checkout v9.5] Signature 생성 완료');
      } catch (err) {
        console.error('[Checkout v9.5] Signature 생성 실패:', err);
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
      console.log('[Checkout v9.5] Mobile - 스크립트 로드 스킵');
      return;
    }

    console.log('[Checkout v9.5] PC - Loading INIStdPay.js...');

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
      console.log('[Checkout v9.5] PC Script loaded');
      setTimeout(() => {
        if (window.INIStdPay) {
          setScriptLoaded(true);
          console.log('[Checkout v9.5] INIStdPay ready');
        }
      }, 500);
    };

    script.onerror = () => {
      console.error('[Checkout v9.5] PC Script load failed');
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

    console.log('[Checkout v9.5] Payment clicked, isMobile:', isMobile);
    console.log('[Checkout v9.5] Form data:', {
      oid: safeOid,
      goodname: safeGoodname,
      price: safePrice,
      buyername: safeBuyerName,
      productCode: safeProductCode,
      partnerId: safePartnerId,
      merchantData,
    });

    // ============================================
    // [Mobile 결제] - Form Submit 방식
    // [v9.5] P_NOTI 필드에 파트너 정보 추가 (실적 추적용)
    // ============================================
    if (isMobile) {
      console.log('[Checkout v9.5] Mobile 결제 시작...');

      // 1. 동적 폼 생성 (모바일은 별도 폼 - SendPayForm_id와 충돌 방지)
      const mobileForm = document.createElement('form');
      mobileForm.method = 'POST';
      mobileForm.acceptCharset = 'euc-kr';
      mobileForm.action = MOBILE_PAYMENT_URL;

      // 2. [핵심] P_NOTI: 파트너 정보 전달 (결제 완료 후 실적 생성에 필수!)
      // 모바일은 merchantData를 못 쓰므로 P_NOTI 필드 활용
      const affiliateInfo = [
        `partnerId=${safePartnerId}`,
        `productCode=${safeProductCode}`,
        `affiliateCode=${safeAffiliateCode}`,
      ].join('&');

      // 3. [핵심] PC 변수명 -> Mobile 변수명 매핑
      const mobileParams: Record<string, string> = {
        P_MID: FALLBACK.mid,
        P_OID: safeOid,
        P_AMT: String(safePrice),
        P_UNAME: safeBuyerName,
        P_GOODS: safeGoodname,
        P_MOBILE: safeBuyerTel,
        P_EMAIL: safeBuyerEmail,
        P_NEXT_URL: callbackUrl,
        P_NOTI_URL: notiUrl,
        P_HPP_METHOD: '1',
        P_RESERVED: 'twotrs_isp=Y&block_isp=Y&twotrs_bank=Y&apprun_check=Y',
        P_CHARSET: 'utf8',
        // [v9.5 핵심] 파트너 정보 - Callback API에서 파싱하여 실적 생성
        P_NOTI: affiliateInfo,
      };

      Object.entries(mobileParams).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        mobileForm.appendChild(input);
      });

      // mKey, signature 추가
      const mKeyInput = document.createElement('input');
      mKeyInput.type = 'hidden';
      mKeyInput.name = 'mkey';
      mKeyInput.value = mKey || '';
      mobileForm.appendChild(mKeyInput);

      const signInput = document.createElement('input');
      signInput.type = 'hidden';
      signInput.name = 'P_SIGNATURE';
      signInput.value = signature || '';
      mobileForm.appendChild(signInput);

      console.log('[Checkout v9.5] Mobile Form Params:', mobileParams);
      console.log('[Checkout v9.5] P_NOTI (파트너 정보):', affiliateInfo);
      document.body.appendChild(mobileForm);
      mobileForm.submit();
      return;
    }

    // ============================================
    // [PC 결제] - INIStdPay.pay('SendPayForm_id') 호출
    // ============================================
    console.log('[Checkout v9.5] PC 결제 시작...');

    // 1. INIStdPay 스크립트 로드 확인
    if (!window.INIStdPay) {
      alert('보안 모듈 로딩 중... 잠시 후 다시 클릭해주세요.');
      setIsPaymentProcessing(false);
      return;
    }

    // 2. [핵심] Form ID가 정확한지 확인하고 호출
    const pcForm = document.getElementById('SendPayForm_id');
    if (!pcForm) {
      console.error('[Checkout v9.5] SendPayForm_id 폼을 찾을 수 없음!');
      alert('결제 폼 오류. 페이지를 새로고침 해주세요.');
      setIsPaymentProcessing(false);
      return;
    }

    // 3. INIStdPay.pay() 호출 - 폼 ID 정확히 전달
    console.log('[Checkout v9.5] Calling INIStdPay.pay("SendPayForm_id")...');
    window.INIStdPay.pay('SendPayForm_id');
  };

  // 폼 준비 완료 여부 (모바일은 항상 ready, PC는 스크립트 체크)
  const isFormReady = isMobile ? !isLoading : scriptLoaded;

  // ============================================
  // [v9.2] 자동 결제창 실행 (Auto-Launch)
  // URL 데이터가 있고, 준비 완료되면 자동으로 결제창 띄움
  // 50~60대 고객 편의를 위해 클릭 없이 바로 결제창!
  // ============================================
  useEffect(() => {
    // 조건: URL 데이터 있음 + 준비 완료 + 아직 자동실행 안함 + 처리 중 아님
    if (hasUrlData && isFormReady && !autoLaunched && !isPaymentProcessing && mKey && signature) {
      console.log('[Checkout v9.5] ✅ 자동 결제창 실행 (Auto-Launch)');
      setAutoLaunched(true);

      // 약간의 딜레이 후 실행 (UI 렌더링 완료 보장)
      setTimeout(() => {
        handlePayment();
      }, 500);
    }
  }, [hasUrlData, isFormReady, autoLaunched, isPaymentProcessing, mKey, signature]);

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

          {/* 2. 시스템 고정 정보 (하드코딩 - 절대 변경 금지!) */}
          <input type="hidden" name="mid" value="wpcrdot200" />
          <input type="hidden" name="currency" value="WON" />
          <input type="hidden" name="payViewType" value="overlay" />
          <input type="hidden" name="gopaymethod" value="Card" />
          <input type="hidden" name="charset" value="UTF-8" />
          <input type="hidden" name="acceptmethod" value="below1000" />

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
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {isMobile && <FiSmartphone className="w-5 h-5" />}
              결제하기
              <span className="text-xs font-normal opacity-80">
                {isMobile ? '(Mobile v9.5)' : '(PC v9.5)'}
              </span>
            </h1>
            <p className="text-white/80 text-sm mt-1">
              {hasUrlData ? 'URL 데이터로 진행' : '웰컴페이먼츠 안전 결제'}
            </p>
          </div>

          <div className="p-6">
            {/* API 에러 안내 (있어도 URL 데이터가 있으면 괜찮음) */}
            {error && !hasUrlData && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <FiAlertTriangle className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-orange-800 text-sm">
                    <strong>안내</strong><br/>
                    API 연결 오류가 있지만 결제는 진행 가능합니다.
                    <div className="mt-1 text-xs opacity-75">({error})</div>
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
            <div className="mb-2 text-gray-400">// Debug Info (v9.5 - 모바일 실적 추적 완성)</div>
            <div className="text-cyan-400 font-bold">isMobile: {String(isMobile)}</div>
            <div className="text-pink-400 font-bold">hasUrlData: {String(hasUrlData)}</div>
            <div className="mt-2 text-gray-400">--- URL Params ---</div>
            <div>urlOrderId: {urlOrderId || '(없음)'}</div>
            <div>urlGoodname: {urlGoodname || '(없음)'}</div>
            <div>urlPrice: {urlPrice || '(없음)'}</div>
            <div>urlBuyername: {urlBuyername || '(없음)'}</div>
            <div className="mt-2 text-gray-400">--- Safe Data (최종) ---</div>
            <div>safeOid: {safeOid}</div>
            <div>safeGoodname: {safeGoodname}</div>
            <div>safePrice: {safePrice}</div>
            <div>safeBuyerName: {safeBuyerName}</div>
            <div className="text-yellow-400">productCode: {safeProductCode || '(없음)'}</div>
            <div className="text-yellow-400">partnerId: {safePartnerId || '(없음)'}</div>
            <div className="text-cyan-400">merchantData: {merchantData}</div>
            <div className="mt-2 text-gray-400">--- Status ---</div>
            <div>isLoading: {String(isLoading)}</div>
            <div>scriptLoaded: {String(scriptLoaded)}</div>
            <div>isFormReady: {String(isFormReady)}</div>
            <div>mKey: {mKey ? '✓' : '✗'}</div>
            <div>signature: {signature ? '✓' : '✗'}</div>
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
