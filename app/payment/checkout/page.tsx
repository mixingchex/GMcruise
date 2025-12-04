'use client';

// 결제 체크아웃 페이지 (PC/Mobile 자동 감지)
// 웰컴페이먼츠 PG 연동
// - PC: INIStdPay.js 스크립트 로드 후 INIStdPay.pay('SendPayForm_id') 호출
// - Mobile: EUC-KR charset Form Submit (Action URL로 직접 이동)
//
// 참고: PC_Web_manual 17페이지 Standard 방식 적용

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
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

// INIStdPay 글로벌 타입 선언
declare global {
  interface Window {
    INIStdPay?: {
      pay: (formId: string) => void;
    };
  }
}

// 환경 설정 (테스트/운영 분기)
const IS_PRODUCTION = process.env.NEXT_PUBLIC_WELCOMEPAY_PRODUCTION === 'true';
const PC_SCRIPT_URL = IS_PRODUCTION
  ? 'https://stdpay.paywelcome.co.kr/stdjs/INIStdPay.js'
  : 'https://tstdpay.paywelcome.co.kr/stdjs/INIStdPay.js';

function PaymentCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mobileFormRef = useRef<HTMLFormElement>(null);

  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [paymentUrl, setPaymentUrl] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CARD');
  const [selectedEasyPay, setSelectedEasyPay] = useState<EasyPayCode[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

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
    console.log('[Checkout] Device detected:', mobile ? 'Mobile' : 'PC');
  }, [isClient]);

  // PC용 INIStdPay.js 스크립트 로드 (매뉴얼 Standard 방식: document.createElement)
  useEffect(() => {
    if (!isClient || isMobile === null || isMobile) return;

    console.log('[Checkout] Loading PC script:', PC_SCRIPT_URL);

    // 이미 로드된 스크립트가 있는지 확인
    const existingScript = document.getElementById('INIStdPay_script');
    if (existingScript) {
      console.log('[Checkout] Script already exists, checking INIStdPay object');
      if (window.INIStdPay && typeof window.INIStdPay.pay === 'function') {
        console.log('[Checkout] INIStdPay already available');
        setIsScriptLoaded(true);
        return;
      }
    }

    // 매뉴얼 방식: document.createElement('script')
    const script = document.createElement('script');
    script.id = 'INIStdPay_script';
    script.type = 'text/javascript';
    script.src = PC_SCRIPT_URL;
    script.charset = 'UTF-8';

    script.onload = () => {
      console.log('[Checkout] Script onload fired');
      // INIStdPay 객체 확인 (재시도 로직)
      let retryCount = 0;
      const checkReady = () => {
        if (window.INIStdPay && typeof window.INIStdPay.pay === 'function') {
          console.log('[Checkout] INIStdPay object ready:', window.INIStdPay);
          setIsScriptLoaded(true);
          setScriptError(null);
        } else if (retryCount < 20) {
          retryCount++;
          console.log('[Checkout] Waiting for INIStdPay...', retryCount);
          setTimeout(checkReady, 100);
        } else {
          console.error('[Checkout] INIStdPay not available after retries');
          setScriptError('결제 모듈 초기화 실패. 페이지를 새로고침해주세요.');
        }
      };
      checkReady();
    };

    script.onerror = (e) => {
      console.error('[Checkout] Script load error:', e);
      setScriptError('결제 스크립트 로드 실패. 네트워크 연결을 확인해주세요.');
      setIsScriptLoaded(false);
    };

    document.head.appendChild(script);
    console.log('[Checkout] Script element appended to head');

  }, [isClient, isMobile]);

  // 결제 데이터 로드
  useEffect(() => {
    if (!isClient || isMobile === null) return;

    const loadPaymentData = async () => {
      try {
        const orderId = searchParams.get('orderId');
        console.log('[Checkout] Loading payment data for orderId:', orderId);

        if (!orderId) {
          setError('주문 정보가 없습니다.');
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/payment/prepare?orderId=${orderId}&isMobile=${isMobile}`);
        const data = await response.json();
        console.log('[Checkout] API response:', data);

        if (!data.ok) {
          setError(data.error || '결제 정보를 불러올 수 없습니다.');
          setIsLoading(false);
          return;
        }

        setPaymentData(data.payment);
        setFormData(data.formData);
        setPaymentUrl(data.paymentUrl);
        setIsLoading(false);
      } catch (err) {
        console.error('[Checkout] Payment data load error:', err);
        setError('결제 정보를 불러오는 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };

    loadPaymentData();
  }, [isClient, isMobile, searchParams]);

  // 결제 준비 완료 상태
  const isPaymentReady = paymentData && Object.keys(formData).length > 0 && (isMobile || isScriptLoaded);

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

  // 결제 실행
  const handlePayment = useCallback(async () => {
    if (!paymentData || isPaymentProcessing) return;

    setIsPaymentProcessing(true);

    try {
      // 폼 데이터 재요청
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
      console.log('[Checkout] Prepare response:', data);

      if (!data.ok) {
        setError(data.error || '결제 준비 중 오류가 발생했습니다.');
        setIsPaymentProcessing(false);
        return;
      }

      setFormData(data.formData);
      setPaymentUrl(data.paymentUrl);

      // DOM 업데이트 대기
      await new Promise(resolve => setTimeout(resolve, 300));

      if (isMobile) {
        // Mobile: Form Submit
        if (mobileFormRef.current) {
          console.log('[Checkout] Mobile form submit to:', data.paymentUrl);
          mobileFormRef.current.action = data.paymentUrl;
          mobileFormRef.current.submit();
        }
      } else {
        // PC: INIStdPay.pay() 호출 (매뉴얼 방식)
        const form = document.getElementById('SendPayForm_id');
        if (!form) {
          console.error('[Checkout] SendPayForm_id not found');
          setError('결제 폼을 찾을 수 없습니다.');
          setIsPaymentProcessing(false);
          return;
        }

        if (window.INIStdPay && typeof window.INIStdPay.pay === 'function') {
          console.log('[Checkout] Calling INIStdPay.pay("SendPayForm_id")');
          try {
            window.INIStdPay.pay('SendPayForm_id');
          } catch (e) {
            console.error('[Checkout] INIStdPay.pay error:', e);
            setError('결제창 호출 중 오류가 발생했습니다.');
            setIsPaymentProcessing(false);
          }
        } else {
          console.error('[Checkout] INIStdPay not available');
          setError('결제 모듈이 로드되지 않았습니다.');
          setIsPaymentProcessing(false);
        }
      }
    } catch (err) {
      console.error('[Checkout] Payment error:', err);
      setError('결제 처리 중 오류가 발생했습니다.');
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* 디버그 정보 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs">
            <p><strong>Device:</strong> {isMobile ? 'Mobile' : 'PC'}</p>
            <p><strong>Script URL:</strong> {PC_SCRIPT_URL}</p>
            <p><strong>Script Loaded:</strong> {isScriptLoaded ? 'Yes' : 'No'}</p>
            <p><strong>Script Error:</strong> {scriptError || 'None'}</p>
            <p><strong>Payment Ready:</strong> {isPaymentReady ? 'Yes' : 'No'}</p>
          </div>
        )}

        {/* 스크립트 에러 표시 */}
        {!isMobile && scriptError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 text-sm">{scriptError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-600 underline"
            >
              페이지 새로고침
            </button>
          </div>
        )}

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

            {/* PC 스크립트 로딩 표시 */}
            {!isMobile && !isScriptLoaded && !scriptError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-700">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent"></div>
                  결제 모듈을 불러오는 중입니다...
                </div>
              </div>
            )}

            {/* 결제 버튼 */}
            <button
              onClick={handlePayment}
              disabled={!isPaymentReady || isPaymentProcessing}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPaymentProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  결제 처리 중...
                </span>
              ) : (
                `${paymentData.amount.toLocaleString()}원 결제하기`
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              결제 진행 시 웰컴페이먼츠 결제창으로 이동합니다.
            </p>
          </div>
        </div>

        {/* PC용 결제 폼 (매뉴얼 필수: id="SendPayForm_id") */}
        {!isMobile && (
          <form
            id="SendPayForm_id"
            name="SendPayForm_id"
            method="POST"
            acceptCharset="UTF-8"
            style={{ display: 'none' }}
          >
            {Object.entries(formData).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>
        )}

        {/* Mobile용 결제 폼 */}
        {isMobile && (
          <form
            id="mobile_payment_form"
            ref={mobileFormRef}
            action={paymentUrl}
            method="POST"
            acceptCharset="euc-kr"
            style={{ display: 'none' }}
          >
            {Object.entries(formData).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
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
