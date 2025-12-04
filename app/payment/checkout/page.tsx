'use client';

// 결제 체크아웃 페이지
// PC: INIStdPay.js Overlay Popup 방식 (매뉴얼 정석)
// Mobile: Form Submit으로 PG 결제 페이지 이동

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FiCreditCard, FiSmartphone, FiDollarSign, FiCheckCircle } from 'react-icons/fi';

type PaymentMethod = 'CARD' | 'BANK' | 'VBANK' | 'MOBILE';
type EasyPayCode = 'KAKAOPAY' | 'TOSSPAY' | 'PAYCO' | 'LPAY' | 'NAVERPAY';

interface PaymentData {
  orderId: string;
  amount: number;
  productName: string;
  buyerName: string;
  buyerTel: string;
  buyerEmail: string;
  productCode: string;
  metadata: any;
}

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
  const router = useRouter();

  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CARD');
  const [selectedEasyPay, setSelectedEasyPay] = useState<EasyPayCode[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [scriptStatus, setScriptStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  // PC용 폼 데이터
  const [pcFormData, setPcFormData] = useState<Record<string, string> | null>(null);

  // 클라이언트 마운트 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 모바일 감지
  useEffect(() => {
    if (!isClient) return;
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'mobile', 'webos', 'blackberry'];
      return mobileKeywords.some(keyword => userAgent.includes(keyword));
    };
    const mobile = checkMobile();
    setIsMobile(mobile);
    console.log('[Checkout] Device:', mobile ? 'Mobile' : 'PC');
  }, [isClient]);

  // PC 전용: INIStdPay.js 스크립트 로드 (운영 환경 URL 하드코딩)
  useEffect(() => {
    if (!isClient || isMobile === null || isMobile) {
      // Mobile은 스크립트 불필요
      if (isMobile) setScriptStatus('loaded');
      return;
    }

    console.log('[Checkout] PC: Loading INIStdPay.js...');

    // 이미 로드된 경우
    if (window.INIStdPay) {
      console.log('[Checkout] INIStdPay already exists');
      setScriptStatus('loaded');
      return;
    }

    // 운영 환경 URL 하드코딩 (매뉴얼 정석 - 절대 변경 금지)
    const SCRIPT_URL = 'https://stdpay.paywelcome.co.kr/stdjs/INIStdPay.js';

    // 기존 스크립트 제거 후 재로드
    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = false; // 동기 로드로 확실하게
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      console.log('[Checkout] INIStdPay.js script loaded');
      // 약간의 딜레이 후 객체 확인
      setTimeout(() => {
        if (window.INIStdPay && typeof window.INIStdPay.pay === 'function') {
          console.log('[Checkout] INIStdPay.pay function confirmed');
          setScriptStatus('loaded');
        } else {
          console.warn('[Checkout] INIStdPay object not ready, retrying...');
          // 재시도
          setTimeout(() => {
            if (window.INIStdPay) {
              setScriptStatus('loaded');
            } else {
              console.error('[Checkout] INIStdPay failed to initialize');
              setScriptStatus('error');
            }
          }, 500);
        }
      }, 200);
    };

    script.onerror = (e) => {
      console.error('[Checkout] INIStdPay.js load error:', e);
      setScriptStatus('error');
    };

    document.head.appendChild(script);
  }, [isClient, isMobile]);

  // 결제 데이터 로드
  useEffect(() => {
    if (!isClient || isMobile === null) return;

    const loadPaymentData = async () => {
      try {
        const orderId = searchParams.get('orderId');
        console.log('[Checkout] Loading orderId:', orderId);

        if (!orderId) {
          setError('주문 정보가 없습니다.');
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/payment/prepare?orderId=${orderId}&isMobile=${isMobile}`);
        const data = await response.json();

        if (!data.ok) {
          setError(data.error || '결제 정보를 불러올 수 없습니다.');
          setIsLoading(false);
          return;
        }

        setPaymentData(data.payment);

        // PC인 경우 폼 데이터도 미리 세팅
        if (!isMobile && data.formData) {
          setPcFormData(data.formData);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('[Checkout] Load error:', err);
        setError('결제 정보를 불러오는 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };

    loadPaymentData();
  }, [isClient, isMobile, searchParams]);

  // 결제 수단 선택
  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
  };

  // 간편결제 토글
  const toggleEasyPay = (code: EasyPayCode) => {
    setSelectedEasyPay(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // 결제 실행 - 버튼 클릭 시 무조건 실행
  const handlePayment = useCallback(async () => {
    if (!paymentData || isPaymentProcessing) return;

    console.log('[Checkout] Payment button clicked, isMobile:', isMobile);

    // PC 환경: 스크립트 로드 최종 확인
    if (!isMobile) {
      if (!window.INIStdPay || typeof window.INIStdPay.pay !== 'function') {
        // 스크립트가 아직 로드 안 됐으면 재시도 안내
        alert('결제 모듈을 불러오는 중입니다.\n잠시 후 다시 시도해주세요.\n\n계속 안 되면 페이지를 새로고침(F5) 해주세요.');
        // 스크립트 재로드 시도
        setScriptStatus('loading');
        const script = document.createElement('script');
        script.src = 'https://stdpay.paywelcome.co.kr/stdjs/INIStdPay.js';
        script.onload = () => {
          setTimeout(() => {
            if (window.INIStdPay) setScriptStatus('loaded');
          }, 200);
        };
        document.head.appendChild(script);
        return;
      }
    }

    setIsPaymentProcessing(true);

    try {
      // 결제 폼 데이터 요청
      const response = await fetch('/api/payment/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: paymentData.orderId,
          payMethod: selectedMethod,
          easyPayCodes: selectedEasyPay,
          isMobile,
        }),
      });

      const data = await response.json();
      console.log('[Checkout] Prepare response:', data.ok);

      if (!data.ok) {
        alert(data.error || '결제 준비 중 오류가 발생했습니다.');
        setIsPaymentProcessing(false);
        return;
      }

      if (isMobile) {
        // === Mobile: Form Submit ===
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.paymentUrl;
        form.acceptCharset = 'euc-kr';
        form.style.display = 'none';

        Object.entries(data.formData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        console.log('[Checkout] Mobile: Submitting to', data.paymentUrl);
        form.submit();
      } else {
        // === PC: INIStdPay Overlay ===
        console.log('[Checkout] PC: Setting up form data...');

        // 기존 폼 제거
        const existingForm = document.getElementById('SendPayForm_id');
        if (existingForm) {
          existingForm.remove();
        }

        // 새 폼 생성 (action 없음, method 없음 - 페이지 이동 완전 차단)
        const form = document.createElement('form');
        form.id = 'SendPayForm_id';
        form.name = 'SendPayForm_id';
        form.style.display = 'none';
        // action, method 속성 없음 - 폼이 직접 전송되는 것을 원천 차단

        Object.entries(data.formData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });

        document.body.appendChild(form);

        // INIStdPay.pay() 호출 (Overlay Popup)
        console.log('[Checkout] PC: Calling INIStdPay.pay("SendPayForm_id")');

        try {
          window.INIStdPay!.pay('SendPayForm_id');
        } catch (payError) {
          console.error('[Checkout] INIStdPay.pay error:', payError);
          alert('결제창을 여는 중 오류가 발생했습니다.\n페이지를 새로고침 후 다시 시도해주세요.');
          setIsPaymentProcessing(false);
        }
      }

    } catch (err) {
      console.error('[Checkout] Payment error:', err);
      alert('결제 처리 중 오류가 발생했습니다.');
      setIsPaymentProcessing(false);
    }
  }, [paymentData, selectedMethod, selectedEasyPay, isMobile, isPaymentProcessing]);

  // 로딩 화면
  if (!isClient || isMobile === null || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">결제 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 화면
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">결제 오류</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!paymentData) return null;

  // PC에서 스크립트 로딩 중일 때 표시
  const isScriptReady = isMobile || scriptStatus === 'loaded';
  const showScriptLoading = !isMobile && scriptStatus === 'loading';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* 결제 정보 카드 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
            <h1 className="text-xl font-bold text-white">결제하기</h1>
            <p className="text-blue-100 text-sm mt-1">
              {isMobile ? '모바일 결제' : 'PC 결제'}
            </p>
          </div>

          <div className="p-6">
            {/* 주문 정보 */}
            <div className="border-b pb-4 mb-4">
              <h2 className="font-semibold text-gray-800 mb-3">주문 정보</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">상품명</span>
                  <span className="font-medium">{paymentData.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">주문번호</span>
                  <span className="font-mono text-xs">{paymentData.orderId}</span>
                </div>
              </div>
            </div>

            {/* 구매자 정보 */}
            <div className="border-b pb-4 mb-4">
              <h2 className="font-semibold text-gray-800 mb-3">구매자 정보</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">이름</span>
                  <span>{paymentData.buyerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">연락처</span>
                  <span>{paymentData.buyerTel}</span>
                </div>
                {paymentData.buyerEmail && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">이메일</span>
                    <span>{paymentData.buyerEmail}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 결제 금액 */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">결제 금액</span>
                <span className="text-2xl font-bold text-blue-600">
                  {paymentData.amount.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 결제 수단 선택 */}
            <div className="mb-6">
              <h2 className="font-semibold text-gray-800 mb-3">결제 수단 선택</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleMethodSelect('CARD')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMethod === 'CARD'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FiCreditCard className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <span className="text-sm font-medium">신용/체크카드</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodSelect('BANK')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMethod === 'BANK'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FiDollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
                  <span className="text-sm font-medium">계좌이체</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodSelect('VBANK')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMethod === 'VBANK'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FiCheckCircle className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <span className="text-sm font-medium">가상계좌</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodSelect('MOBILE')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedMethod === 'MOBILE'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FiSmartphone className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                  <span className="text-sm font-medium">휴대폰결제</span>
                </button>
              </div>
            </div>

            {/* 간편결제 선택 */}
            {selectedMethod === 'CARD' && (
              <div className="mb-6">
                <h2 className="font-semibold text-gray-800 mb-3">간편결제 (선택)</h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    { code: 'KAKAOPAY' as EasyPayCode, name: '카카오페이', color: 'bg-yellow-400' },
                    { code: 'TOSSPAY' as EasyPayCode, name: '토스페이', color: 'bg-blue-500' },
                    { code: 'NAVERPAY' as EasyPayCode, name: '네이버페이', color: 'bg-green-500' },
                    { code: 'PAYCO' as EasyPayCode, name: '페이코', color: 'bg-red-500' },
                    { code: 'LPAY' as EasyPayCode, name: 'L페이', color: 'bg-pink-500' },
                  ].map(pay => (
                    <button
                      type="button"
                      key={pay.code}
                      onClick={() => toggleEasyPay(pay.code)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedEasyPay.includes(pay.code)
                          ? `${pay.color} text-white`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pay.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 결제 버튼 - type="button" 필수 (폼 전송 차단) */}
            <button
              type="button"
              onClick={handlePayment}
              disabled={isPaymentProcessing}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isPaymentProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  결제창 여는 중...
                </span>
              ) : showScriptLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  결제 모듈 준비 중...
                </span>
              ) : (
                `${paymentData.amount.toLocaleString()}원 결제하기`
              )}
            </button>

            {/* 안내 문구 */}
            <p className="text-xs text-gray-500 text-center mt-4">
              결제 버튼을 누르면 결제창이 열립니다.
            </p>

            {/* 스크립트 로드 오류 시 안내 */}
            {!isMobile && scriptStatus === 'error' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  결제 모듈 로드에 문제가 있습니다.<br/>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-yellow-600 underline font-medium"
                  >
                    페이지 새로고침
                  </button>
                  을 해보세요.
                </p>
              </div>
            )}
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
        <p className="mt-4 text-gray-600">결제 페이지를 불러오는 중...</p>
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
