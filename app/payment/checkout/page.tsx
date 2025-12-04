'use client';

// ============================================
// 결제 체크아웃 페이지 v7.0 (오프라인 모드 - API 미사용)
// ============================================
// 목표: API 호출 없이 순수 하드코딩 데이터로 결제창 테스트
// ============================================

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiCreditCard } from 'react-icons/fi';

// INIStdPay 전역 타입 선언
declare global {
  interface Window {
    INIStdPay?: {
      pay: (formId: string) => void;
    };
  }
}

function PaymentCheckoutContent() {
  const searchParams = useSearchParams();

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // 하드코딩 데이터 (API 미사용)
  const testOid = `TEST_${Date.now()}`;
  const testTimestamp = String(Date.now());

  // ============================================
  // 1. 클라이언트 마운트 + 모바일 감지
  // ============================================
  useEffect(() => {
    setIsClient(true);
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'mobile'];
    setIsMobile(mobileKeywords.some(keyword => userAgent.includes(keyword)));
    console.log('[Checkout v7] 오프라인 모드 - API 미사용');
  }, []);

  // ============================================
  // 2. PC 전용: INIStdPay.js 스크립트 로드
  // ============================================
  useEffect(() => {
    if (!isClient || isMobile) {
      if (isMobile) setScriptLoaded(true);
      return;
    }

    console.log('[Checkout v7] Loading INIStdPay.js...');

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
      console.log('[Checkout v7] Script loaded');
      setTimeout(() => {
        if (window.INIStdPay) {
          setScriptLoaded(true);
          console.log('[Checkout v7] INIStdPay ready');
        }
      }, 500);
    };

    script.onerror = () => {
      console.error('[Checkout v7] Script load failed');
    };

    document.head.appendChild(script);
  }, [isClient, isMobile]);

  // ============================================
  // [4단계: 결제 실행] - 오프라인 모드
  // ============================================
  const handlePayment = () => {
    if (isPaymentProcessing) return;

    console.log('[Checkout v7] Payment clicked');

    // 스크립트 로드 체크
    if (typeof window.INIStdPay === 'undefined') {
      alert('결제 시스템을 불러오는 중입니다. 잠시 후 다시 클릭해주세요.');
      return;
    }

    // 폼이 있는지 최종 확인 후 실행
    const form = document.getElementById('SendPayForm_id');
    if (form) {
      setIsPaymentProcessing(true);
      console.log('[Checkout v7] Calling INIStdPay.pay()...');
      window.INIStdPay.pay('SendPayForm_id'); // 무조건 실행
    } else {
      alert('결제 폼 생성 중입니다. 새로고침 해주세요.');
    }
  };

  // 클라이언트 로드 대기
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // 메인 렌더링 (API 없이 즉시 렌더링)
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">

        {/* ============================================
            [하드코딩 폼] API 연동 없이 무조건 결제창 띄우기 테스트
            ⚠️ action, method 속성 절대 금지
            ============================================ */}
        {!isMobile && (
          <form
            id="SendPayForm_id"
            name="SendPayForm_id"
            onSubmit={(e) => e.preventDefault()}
          >
            {/* API 연동 없이 무조건 1000원 결제창 띄우기 테스트 */}
            <input type="hidden" name="goodname" value="테스트 상품 (API 미사용)" />
            <input type="hidden" name="price" value="1000" />
            <input type="hidden" name="mid" value="wpcrdot200" />
            <input type="hidden" name="oid" value={testOid} />
            <input type="hidden" name="timestamp" value={testTimestamp} />
            <input type="hidden" name="currency" value="WON" />
            <input type="hidden" name="payViewType" value="overlay" />
            <input type="hidden" name="gopaymethod" value="Card" />
            <input type="hidden" name="charset" value="UTF-8" />
            <input type="hidden" name="buyername" value="테스트고객" />
            <input type="hidden" name="buyertel" value="010-0000-0000" />
            <input type="hidden" name="buyeremail" value="test@test.com" />
            <input type="hidden" name="mKey" value="" />
            <input type="hidden" name="signature" value="" />
          </form>
        )}

        {/* 결제 정보 카드 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4">
            <h1 className="text-xl font-bold text-white">
              결제 테스트 <span className="text-xs font-normal text-red-200">(v7.0 오프라인)</span>
            </h1>
            <p className="text-red-100 text-sm mt-1">
              API 미사용 - 하드코딩 모드
            </p>
          </div>

          <div className="p-6">
            {/* 테스트 안내 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>⚠️ 테스트 모드</strong><br/>
                API 호출 없이 하드코딩된 데이터로 결제창 테스트 중입니다.<br/>
                실제 결제가 진행되지 않습니다.
              </p>
            </div>

            {/* 주문 정보 (하드코딩) */}
            <div className="border-b pb-4 mb-4">
              <h2 className="font-semibold text-gray-800 mb-3">주문 정보</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">상품명</span>
                  <span className="font-medium">테스트 상품 (API 미사용)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">주문번호</span>
                  <span className="font-mono text-xs">{testOid}</span>
                </div>
              </div>
            </div>

            {/* 결제 금액 (하드코딩) */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">결제 금액</span>
                <span className="text-2xl font-bold text-blue-600">1,000원</span>
              </div>
            </div>

            {/* 스크립트 로딩 상태 */}
            <div className="mb-4 text-sm">
              <span className={scriptLoaded ? 'text-green-600' : 'text-orange-600'}>
                {scriptLoaded ? '✅ INIStdPay.js 로드 완료' : '⏳ INIStdPay.js 로딩 중...'}
              </span>
            </div>

            {/* 결제 버튼 - type="button" 필수! */}
            <button
              type="button"
              onClick={handlePayment}
              disabled={isPaymentProcessing || !scriptLoaded}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isPaymentProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  결제창 여는 중...
                </span>
              ) : !scriptLoaded ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  결제 모듈 로딩 중...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FiCreditCard className="w-5 h-5" />
                  1,000원 결제하기 (테스트)
                </span>
              )}
            </button>

            {/* 안내 문구 */}
            <p className="text-xs text-gray-500 text-center mt-4">
              결제 버튼을 누르면 웰컴페이먼츠 결제창이 열립니다.
            </p>
          </div>
        </div>
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
