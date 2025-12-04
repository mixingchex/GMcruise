'use client';

// 결제 체크아웃 페이지
// PC: INIStdPay.js를 이용한 Overlay Popup 방식 (매뉴얼 정석)
// Mobile: 순수 Form Submit으로 PG 결제 페이지로 이동

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
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

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
    console.log('[Checkout] Device detected:', mobile ? 'Mobile' : 'PC');
  }, [isClient]);

  // PC 전용: INIStdPay.js 스크립트 로드 (운영 환경 URL 하드코딩)
  useEffect(() => {
    if (!isClient || isMobile === null || isMobile) return;

    // PC 환경에서만 스크립트 로드
    console.log('[Checkout] Loading INIStdPay.js for PC...');

    // 이미 로드된 경우 체크
    if (window.INIStdPay) {
      console.log('[Checkout] INIStdPay already loaded');
      setIsScriptLoaded(true);
      return;
    }

    // 운영 환경 URL 하드코딩 (매뉴얼 정석)
    const scriptUrl = 'https://stdpay.paywelcome.co.kr/stdjs/INIStdPay.js';

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;

    script.onload = () => {
      console.log('[Checkout] INIStdPay.js loaded successfully');
      // 스크립트 로드 후 실제 객체 확인
      setTimeout(() => {
        if (window.INIStdPay) {
          console.log('[Checkout] INIStdPay object confirmed');
          setIsScriptLoaded(true);
          setScriptError(null);
        } else {
          console.error('[Checkout] INIStdPay object not found after script load');
          setScriptError('결제 모듈 초기화에 실패했습니다. 페이지를 새로고침 해주세요.');
        }
      }, 100);
    };

    script.onerror = () => {
      console.error('[Checkout] INIStdPay.js load failed');
      setScriptError('결제 모듈을 불러오지 못했습니다. 광고 차단 기능을 끄거나 페이지를 새로고침 해주세요.');
      setIsScriptLoaded(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup은 하지 않음 (스크립트 유지)
    };
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
        setIsLoading(false);

        console.log('[Checkout] Payment ready:', {
          orderId: data.payment.orderId,
          amount: data.payment.amount,
          isMobile,
        });
      } catch (err) {
        console.error('[Checkout] Payment data load error:', err);
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

  // 결제 실행
  const handlePayment = useCallback(async () => {
    if (!paymentData || isPaymentProcessing) return;

    // PC 환경: INIStdPay 스크립트 로드 여부 확인 (매뉴얼 방어 코드 - 필수!)
    if (!isMobile) {
      if (typeof window.INIStdPay === 'undefined') {
        alert('결제 모듈(INIStdPay.js)이 로드되지 않았습니다.\n새로고침 하거나, 브라우저의 [광고 차단 확장프로그램]을 꺼주세요.');
        return; // 절대 진행하지 말 것
      }
    }

    setIsPaymentProcessing(true);

    try {
      // 결제 수단에 따른 폼 데이터 재요청
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

      if (isMobile) {
        // Mobile: Form Submit 방식으로 PG 페이지로 이동
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
        console.log('[Checkout] Mobile: Submitting form to:', data.paymentUrl);
        form.submit();
      } else {
        // PC: INIStdPay.pay() 호출 (Overlay Popup 방식 - 매뉴얼 정석)
        // 폼 데이터를 state에 저장하여 렌더링
        setPcFormData(data.formData);

        // React 렌더링 완료 후 INIStdPay.pay() 호출
        setTimeout(() => {
          const formElement = document.getElementById('SendPayForm_id');
          if (!formElement) {
            console.error('[Checkout] PC: Form element not found');
            setError('결제 폼을 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
            setIsPaymentProcessing(false);
            return;
          }

          // 다시 한번 INIStdPay 확인 (Safety Guard)
          if (typeof window.INIStdPay === 'undefined') {
            alert('결제 모듈(INIStdPay.js)이 로드되지 않았습니다.\n새로고침 하거나, 브라우저의 [광고 차단 확장프로그램]을 꺼주세요.');
            setIsPaymentProcessing(false);
            return;
          }

          console.log('[Checkout] PC: Calling INIStdPay.pay("SendPayForm_id")');
          window.INIStdPay.pay('SendPayForm_id');
        }, 100);
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
        {/* PC 스크립트 로드 오류 경고 */}
        {!isMobile && scriptError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 text-sm">{scriptError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-yellow-600 underline text-sm"
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
              {!isMobile && isScriptLoaded && ' ✓ 결제 모듈 준비됨'}
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

            {/* PC용 결제 폼 (매뉴얼 정석: id="SendPayForm_id", action 없음, onSubmit 방지) */}
            {!isMobile && pcFormData && (
              <form
                id="SendPayForm_id"
                name="SendPayForm_id"
                method="POST"
                acceptCharset="UTF-8"
                onSubmit={(e) => e.preventDefault()}
                style={{ display: 'none' }}
              >
                {Object.entries(pcFormData).map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value} />
                ))}
              </form>
            )}

            {/* 결제 버튼 - type="button"으로 폼 자동 제출 방지 (매뉴얼 정석) */}
            <button
              type="button"
              onClick={handlePayment}
              disabled={isPaymentProcessing || (!isMobile && !isScriptLoaded && !scriptError)}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPaymentProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  {isMobile ? '결제 페이지로 이동 중...' : '결제창 열기 중...'}
                </span>
              ) : !isMobile && !isScriptLoaded && !scriptError ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  결제 모듈 로딩 중...
                </span>
              ) : (
                `${paymentData.amount.toLocaleString()}원 결제하기`
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              {isMobile
                ? '결제 버튼 클릭 시 결제 페이지로 이동합니다.'
                : '결제 버튼 클릭 시 결제창이 팝업으로 열립니다.'}
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
