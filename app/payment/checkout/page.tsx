'use client';

// ============================================
// 결제 체크아웃 페이지 v11.0
// ============================================
// 핵심: URL 데이터 최우선, API 호출 완전 제거
// 1. URL에서 데이터 수신 (goodname, price, buyername 등)
// 2. 폼에 바인딩 (action/method 없음 - 페이지 이동 방지)
// 3. 0.5초 후 자동 결제창 실행 (50~60대 고객 배려)
// 4. merchantData에 partnerId + productCode 포함
// ============================================

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiCreditCard, FiSmartphone } from 'react-icons/fi';

// INIStdPay 전역 타입 선언
declare global {
  interface Window {
    INIStdPay?: {
      pay: (formId: string) => void;
    };
  }
}

// 상수
const MID = 'wpcrdot200';
const SIGN_KEY = 'SGI2dkFzRFc1WHp6K1VTOFVUS3dGdz09';
const MOBILE_PAYMENT_URL = 'https://mobile.paywelcome.co.kr/smart/wcard/';
const BASE_URL = 'https://www.cruisedot.co.kr';

// SHA-256 해시 생성 (클라이언트)
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function PaymentCheckoutContent() {
  const searchParams = useSearchParams();

  // ============================================
  // URL에서 데이터 수신 (핵심!)
  // ============================================
  const orderId = searchParams.get('orderId') || `ORD_${Date.now()}`;
  const goodname = searchParams.get('goodname') || '크루즈 여행 상품';
  const price = parseInt(searchParams.get('price') || '1000') || 1000;
  const buyername = searchParams.get('buyername') || '고객';
  const buyertel = searchParams.get('buyertel') || '010-0000-0000';
  const buyeremail = searchParams.get('buyeremail') || '';
  const productCode = searchParams.get('productCode') || '';
  const partnerId = searchParams.get('partnerId') || '';

  // 상태
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mKey, setMKey] = useState('');
  const [signature, setSignature] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const autoLaunchedRef = useRef(false);

  // merchantData (어필리에이트 추적용)
  const merchantData = `partnerId=${partnerId}&productCode=${productCode}`;

  // 콜백 URL
  const returnUrl = `${BASE_URL}/api/payment/return`;
  const closeUrl = `${BASE_URL}/payment/failed?reason=closed`;
  const notiUrl = `${BASE_URL}/api/payment/notify`;
  const callbackUrl = `${BASE_URL}/api/payment/callback`;

  // P_NOTI (모바일 어필리에이트 추적용)
  const pNoti = `partnerId=${partnerId}&productCode=${productCode}`;

  // ============================================
  // 1. 클라이언트 마운트 + 모바일 감지
  // ============================================
  useEffect(() => {
    setIsClient(true);
    const ua = navigator.userAgent.toLowerCase();
    const mobile = ['android', 'iphone', 'ipad', 'mobile'].some(k => ua.includes(k));
    setIsMobile(mobile);
    console.log('[Checkout v11.0] isMobile:', mobile);
  }, []);

  // ============================================
  // 2. 서명 생성 (PC용)
  // ============================================
  useEffect(() => {
    if (!isClient) return;

    const generate = async () => {
      try {
        const ts = String(Date.now());
        setTimestamp(ts);

        const mKeyHash = await sha256(SIGN_KEY);
        setMKey(mKeyHash);

        const signString = `mKey=${mKeyHash}&oid=${orderId}&price=${price}&timestamp=${ts}`;
        const sig = await sha256(signString);
        setSignature(sig);

        console.log('[Checkout v11.0] Signature generated');
      } catch (err) {
        console.error('[Checkout v11.0] Signature error:', err);
      }
    };

    generate();
  }, [isClient, orderId, price]);

  // ============================================
  // 3. INIStdPay.js 로드 (PC 전용)
  // ============================================
  useEffect(() => {
    if (!isClient) return;

    if (isMobile) {
      setScriptLoaded(true);
      return;
    }

    if (window.INIStdPay) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://stdpay.paywelcome.co.kr/stdjs/INIStdPay.js';
    script.async = false;
    script.onload = () => {
      setTimeout(() => {
        if (window.INIStdPay) {
          setScriptLoaded(true);
          console.log('[Checkout v11.0] INIStdPay loaded');
        }
      }, 300);
    };
    document.head.appendChild(script);
  }, [isClient, isMobile]);

  // ============================================
  // 4. 자동 결제창 실행
  // ============================================
  useEffect(() => {
    if (!isClient || !scriptLoaded || !mKey || !signature || autoLaunchedRef.current || isProcessing) return;

    console.log('[Checkout v11.0] Auto-launch payment (0.5s delay)...');
    autoLaunchedRef.current = true;

    setTimeout(() => {
      handlePayment();
    }, 500);
  }, [isClient, scriptLoaded, mKey, signature, isProcessing]);

  // ============================================
  // 결제 실행
  // ============================================
  const handlePayment = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    console.log('[Checkout v11.0] handlePayment called, isMobile:', isMobile);
    console.log('[Checkout v11.0] Data:', { orderId, goodname, price, buyername, partnerId, productCode });

    // 모바일 결제
    if (isMobile) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.acceptCharset = 'euc-kr';
      form.action = MOBILE_PAYMENT_URL;

      const params: Record<string, string> = {
        P_MID: MID,
        P_OID: orderId,
        P_AMT: String(price),
        P_UNAME: buyername,
        P_GOODS: goodname,
        P_MOBILE: buyertel,
        P_EMAIL: buyeremail,
        P_NEXT_URL: callbackUrl,
        P_NOTI_URL: notiUrl,
        P_HPP_METHOD: '1',
        P_RESERVED: 'twotrs_isp=Y&block_isp=Y&twotrs_bank=Y&apprun_check=Y',
        P_CHARSET: 'utf8',
        P_NOTI: pNoti, // 어필리에이트 정보
      };

      Object.entries(params).forEach(([k, v]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = v;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      return;
    }

    // PC 결제
    if (!window.INIStdPay) {
      alert('결제 모듈 로딩 중... 잠시 후 다시 시도해주세요.');
      setIsProcessing(false);
      return;
    }

    console.log('[Checkout v11.0] Calling INIStdPay.pay()');
    window.INIStdPay.pay('SendPayForm_id');
  };

  // ============================================
  // 렌더링
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">

        {/* PC 전용 폼 (숨김) */}
        <form id="SendPayForm_id" name="SendPayForm_id" onSubmit={(e) => e.preventDefault()}>
          {/* 결제 데이터 */}
          <input type="hidden" name="goodname" value={goodname} />
          <input type="hidden" name="price" value={price} />
          <input type="hidden" name="oid" value={orderId} />
          <input type="hidden" name="buyername" value={buyername} />
          <input type="hidden" name="buyertel" value={buyertel} />
          <input type="hidden" name="buyeremail" value={buyeremail} />

          {/* 시스템 설정 (하드코딩) */}
          <input type="hidden" name="mid" value={MID} />
          <input type="hidden" name="currency" value="WON" />
          <input type="hidden" name="payViewType" value="overlay" />
          <input type="hidden" name="gopaymethod" value="Card" />
          <input type="hidden" name="charset" value="UTF-8" />
          <input type="hidden" name="acceptmethod" value="below1000" />

          {/* 어필리에이트 추적 */}
          <input type="hidden" name="merchantData" value={merchantData} />

          {/* 보안 */}
          <input type="hidden" name="timestamp" value={timestamp} />
          <input type="hidden" name="signature" value={signature} />
          <input type="hidden" name="mKey" value={mKey} />

          {/* 콜백 URL */}
          <input type="hidden" name="returnUrl" value={returnUrl} />
          <input type="hidden" name="closeUrl" value={closeUrl} />
          <input type="hidden" name="notiurl" value={notiUrl} />
        </form>

        {/* 로딩 */}
        {!isClient && (
          <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">결제 준비 중...</p>
            </div>
          </div>
        )}

        {/* 결제 카드 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {isMobile && <FiSmartphone className="w-5 h-5" />}
              결제하기
              <span className="text-xs font-normal opacity-80">
                {isMobile ? '(Mobile v11)' : '(PC v11)'}
              </span>
            </h1>
          </div>

          <div className="p-6">
            {/* 주문 정보 */}
            <div className="border-b pb-4 mb-4">
              <h2 className="font-semibold text-gray-800 mb-3">주문 정보</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">상품명</span>
                  <span className="font-medium text-right max-w-[200px] truncate">{goodname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">주문번호</span>
                  <span className="font-mono text-xs text-gray-600">{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">구매자</span>
                  <span className="font-medium">{buyername}</span>
                </div>
              </div>
            </div>

            {/* 결제 금액 */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">결제 금액</span>
                <span className="text-2xl font-bold text-blue-600">
                  {price.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 상태 표시 */}
            <div className="mb-4 space-y-1 text-sm">
              <div className={scriptLoaded ? 'text-green-600' : 'text-orange-600'}>
                {scriptLoaded ? '✅ 결제 모듈 준비 완료' : '⏳ 결제 모듈 로딩 중...'}
              </div>
              <div className={mKey && signature ? 'text-green-600' : 'text-orange-600'}>
                {mKey && signature ? '✅ 보안 서명 완료' : '⏳ 보안 서명 생성 중...'}
              </div>
              {partnerId && (
                <div className="text-blue-600">✅ 판매원 연결됨 ({partnerId})</div>
              )}
            </div>

            {/* 결제 버튼 */}
            <button
              type="button"
              onClick={handlePayment}
              disabled={isProcessing || !scriptLoaded || !mKey}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  결제창 여는 중...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FiCreditCard className="w-5 h-5" />
                  {price.toLocaleString()}원 결제하기
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 디버그 (개발용) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-800 text-green-400 rounded-lg p-4 text-xs font-mono">
            <div className="text-gray-400 mb-2">// Debug v11.0</div>
            <div>orderId: {orderId}</div>
            <div>goodname: {goodname}</div>
            <div>price: {price}</div>
            <div>buyername: {buyername}</div>
            <div>partnerId: {partnerId || '(없음)'}</div>
            <div>productCode: {productCode || '(없음)'}</div>
            <div>isMobile: {String(isMobile)}</div>
            <div>scriptLoaded: {String(scriptLoaded)}</div>
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
