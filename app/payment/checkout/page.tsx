'use client';

// 결제 체크아웃 페이지 (PC/Mobile 자동 감지)
// 웰컴페이먼츠 PG 연동
// - PC: INIStdPay.js 스크립트 로드 후 INIStdPay.pay('form_id') 호출
// - Mobile: EUC-KR charset Form Submit (Action URL로 직접 이동)

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

function PaymentCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pcFormRef = useRef<HTMLFormElement>(null);
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
  const [pcScriptLoaded, setPcScriptLoaded] = useState(false);
  const [isPaymentReady, setIsPaymentReady] = useState(false);

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

  // PC용 INIStdPay.js 스크립트 로드
  useEffect(() => {
    if (!isClient || isMobile === null || isMobile) return;

    // PC 환경에서만 스크립트 로드
    const scriptId = 'inistdpay-script';
    if (document.getElementById(scriptId)) {
      setPcScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://stdpay.paywelcome.co.kr/stdjs/INIStdPay.js';
    script.charset = 'UTF-8';
    script.async = true;

    script.onload = () => {
      console.log('[Checkout] INIStdPay.js loaded successfully');
      setPcScriptLoaded(true);
    };

    script.onerror = () => {
      console.error('[Checkout] Failed to load INIStdPay.js');
      setError('결제 스크립트를 불러오는데 실패했습니다. 페이지를 새로고침해주세요.');
    };

    document.head.appendChild(script);

    return () => {
      // cleanup은 하지 않음 (스크립트가 한 번 로드되면 유지)
    };
  }, [isClient, isMobile]);

  // 결제 데이터 로드
  useEffect(() => {
    if (!isClient || isMobile === null) return;

    const loadPaymentData = async () => {
      try {
        const orderId = searchParams.get('orderId');
        console.log('[Checkout] Loading payment data for orderId:', orderId, 'isMobile:', isMobile);

        if (!orderId) {
          console.error('[Checkout] No orderId in searchParams');
          setError('주문 정보가 없습니다.');
          setIsLoading(false);
          return;
        }

        // 결제 정보 API 호출 (isMobile 정보 포함)
        const response = await fetch(`/api/payment/prepare?orderId=${orderId}&isMobile=${isMobile}`);
        const data = await response.json();
        console.log('[Checkout] API response:', data);

        if (!data.ok) {
          console.error('[Checkout] API error:', data.error);
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

  // 결제 준비 완료 상태 체크
  useEffect(() => {
    if (!paymentData || !formData || Object.keys(formData).length === 0) {
      setIsPaymentReady(false);
      return;
    }

    if (isMobile) {
      // 모바일은 폼 데이터만 있으면 준비 완료
      setIsPaymentReady(true);
    } else {
      // PC는 스크립트까지 로드되어야 준비 완료
      setIsPaymentReady(pcScriptLoaded);
    }
  }, [paymentData, formData, isMobile, pcScriptLoaded]);

  // 결제 수단 선택
  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
  };

  // 간편결제 선택 토글
  const toggleEasyPay = (code: EasyPayCode) => {
    setSelectedEasyPay(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  // 결제 시작
  const handlePayment = useCallback(async () => {
    if (!paymentData) return;

    setIsLoading(true);

    try {
      // 선택된 옵션으로 결제 폼 데이터 재요청
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
      console.log('[Checkout] Payment prepare response:', data);

      if (!data.ok) {
        setError(data.error || '결제 준비 중 오류가 발생했습니다.');
        setIsLoading(false);
        return;
      }

      // 폼 데이터 및 URL 업데이트
      setFormData(data.formData);
      setPaymentUrl(data.paymentUrl);

      // 잠시 후 결제 실행
      setTimeout(() => {
        if (isMobile) {
          // Mobile: Form Submit
          if (mobileFormRef.current) {
            console.log('[Checkout] Mobile form submit to:', data.paymentUrl);
            mobileFormRef.current.action = data.paymentUrl;
            mobileFormRef.current.submit();
          }
        } else {
          // PC: INIStdPay.pay() 호출
          if (window.INIStdPay) {
            console.log('[Checkout] Calling INIStdPay.pay("pc_payment_form")');
            window.INIStdPay.pay('pc_payment_form');
          } else {
            console.error('[Checkout] INIStdPay not loaded');
            setError('결제 스크립트가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
            setIsLoading(false);
          }
        }
      }, 100);
    } catch (err) {
      console.error('Payment prepare error:', err);
      setError('결제 준비 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  }, [paymentData, selectedMethod, selectedEasyPay, isMobile]);

  // 로딩 중 (클라이언트 마운트 전이거나 데이터 로딩 중)
  // SSR과 CSR 결과가 동일하도록 클라이언트 마운트 전까지 로딩 화면 표시
  // 이렇게 하면 Hydration Mismatch 방지됨 (SSR/CSR 모두 동일한 로딩 UI)
  if (!isClient || isMobile === null || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">결제 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러
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

  // 이 시점에서는 isClient=true, isMobile이 결정됨 (Hydration 완료 후)
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" suppressHydrationWarning>
      <div className="max-w-lg mx-auto">
        {/* 디버그 정보 (개발용) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs" suppressHydrationWarning>
            <p><strong>Device:</strong> {isMobile ? 'Mobile' : 'PC'}</p>
            <p><strong>Script Loaded:</strong> {pcScriptLoaded ? 'Yes' : 'No'}</p>
            <p><strong>Payment Ready:</strong> {isPaymentReady ? 'Yes' : 'No'}</p>
            <p><strong>Payment URL:</strong> {paymentUrl}</p>
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

            {/* 간편결제 선택 (카드 선택 시) */}
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
                <p className="text-xs text-gray-500 mt-2">
                  * 선택하지 않으면 모든 간편결제가 표시됩니다.
                </p>
              </div>
            )}

            {/* PC 스크립트 로딩 상태 표시 */}
            {!isMobile && !pcScriptLoaded && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-700">
                결제 모듈을 불러오는 중입니다...
              </div>
            )}

            {/* 결제 버튼 */}
            <button
              onClick={handlePayment}
              disabled={!isPaymentReady}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentData.amount.toLocaleString()}원 결제하기
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              결제 진행 시 웰컴페이먼츠 결제창으로 이동합니다.
            </p>
          </div>
        </div>

        {/* PC용 결제 폼 (INIStdPay.pay() 호출용) */}
        {!isMobile && (
          <form
            id="pc_payment_form"
            ref={pcFormRef}
            method="POST"
            acceptCharset="UTF-8"
            style={{ display: 'none' }}
          >
            {Object.entries(formData).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>
        )}

        {/* Mobile용 결제 폼 (Form Submit용) */}
        {/*
          중요 (매뉴얼 1.13 주의사항):
          - 요청(Request): 반드시 EUC-KR 인코딩으로 전송해야 함
          - P_CHARSET=utf8: 응답(Response) 수신 시 인코딩 설정
          - acceptCharset="euc-kr"로 설정하여 한글 데이터가 깨지지 않도록 함
        */}
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

// 로딩 컴포넌트
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

// Suspense로 감싼 메인 컴포넌트
export default function PaymentCheckoutPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentCheckoutContent />
    </Suspense>
  );
}
