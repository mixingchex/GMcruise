'use client';

// ============================================
// 결제 체크아웃 페이지 v6.0 (Data Transformation + Fallback)
// ============================================
// 핵심 원칙:
// 1. API 실패해도 비상용 값(Fallback)으로 결제 진행
// 2. 데이터 변환(Transformation)으로 안전한 값 보장
// 3. 폼(Form)은 무조건 렌더링
// 4. 페이지 이동 절대 차단
// ============================================

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FiCreditCard, FiSmartphone, FiDollarSign, FiCheckCircle } from 'react-icons/fi';

type PaymentMethod = 'CARD' | 'BANK' | 'VBANK' | 'MOBILE';
type EasyPayCode = 'KAKAOPAY' | 'TOSSPAY' | 'PAYCO' | 'LPAY' | 'NAVERPAY';

// ============================================
// 비상용 값 정의 (Fallback Constants)
// ============================================
const FALLBACK = {
  productName: '크루즈 여행 상품 (기본)',
  price: 1000,
  buyerName: '방문자',
  buyerTel: '010-0000-0000',
  buyerEmail: 'no-email@cruisedot.co.kr',
  mid: 'wpcrdot200',
  currency: 'WON',
  charset: 'UTF-8',
  payViewType: 'overlay',
  gopaymethod: 'Card',
};

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

    // ⚠️ 전역 폼 전송 차단 (페이지 이동 원천 봉쇄)
    // 어떤 폼이든 submit 이벤트가 발생하면 차단
    const blockFormSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      // 결제 폼인 경우에만 차단 (다른 폼은 정상 동작)
      if (form.id === 'SendPayForm_id' || form.name === 'SendPayForm_id') {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Checkout] Global form submit blocked for:', form.id);
        return false;
      }
    };

    document.addEventListener('submit', blockFormSubmit, true);

    return () => {
      document.removeEventListener('submit', blockFormSubmit, true);
    };
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
  // ⚠️ 핵심: 이 스크립트 로드가 실패해도 페이지는 계속 동작해야 함
  useEffect(() => {
    if (!isClient || isMobile === null || isMobile) {
      // Mobile은 스크립트 불필요
      if (isMobile) setScriptStatus('loaded');
      return;
    }

    // 스크립트 로드를 try-catch로 감싸서 절대 에러 전파 안함
    const loadScript = () => {
      try {
        console.log('[Checkout] PC: Loading INIStdPay.js...');

        // 이미 로드된 경우
        if (window.INIStdPay && typeof window.INIStdPay.pay === 'function') {
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

        script.onload = () => {
          console.log('[Checkout] INIStdPay.js script loaded');
          // 약간의 딜레이 후 객체 확인
          setTimeout(() => {
            try {
              if (window.INIStdPay && typeof window.INIStdPay.pay === 'function') {
                console.log('[Checkout] INIStdPay.pay function confirmed');
                setScriptStatus('loaded');
              } else {
                console.warn('[Checkout] INIStdPay object not ready, retrying...');
                // 재시도 (최대 3회)
                let retryCount = 0;
                const retryInterval = setInterval(() => {
                  retryCount++;
                  if (window.INIStdPay && typeof window.INIStdPay.pay === 'function') {
                    clearInterval(retryInterval);
                    setScriptStatus('loaded');
                  } else if (retryCount >= 3) {
                    clearInterval(retryInterval);
                    console.error('[Checkout] INIStdPay failed after retries');
                    setScriptStatus('error');
                  }
                }, 500);
              }
            } catch (e) {
              console.warn('[Checkout] Script init check error:', e);
              setScriptStatus('error');
            }
          }, 300);
        };

        script.onerror = (e) => {
          console.error('[Checkout] INIStdPay.js load error:', e);
          setScriptStatus('error');
          // ⚠️ 페이지 이동 없이 alert만 표시
          alert('결제 모듈을 불러오는데 실패했습니다.\n페이지를 새로고침(F5) 해주세요.');
        };

        document.head.appendChild(script);
      } catch (e) {
        console.error('[Checkout] Script loading exception:', e);
        setScriptStatus('error');
        // ⚠️ 페이지 이동 없이 alert만 표시
        alert('결제 모듈 로드 중 오류가 발생했습니다.\n페이지를 새로고침(F5) 해주세요.');
      }
    };

    loadScript();
  }, [isClient, isMobile]);

  // ============================================
  // 결제 데이터 로드 + 데이터 변환 (Transformation with Fallback)
  // ⚠️ 핵심: API 실패해도 비상용 값으로 폼 렌더링 보장
  // ============================================
  useEffect(() => {
    if (!isClient || isMobile === null) return;

    const loadPaymentData = async () => {
      const orderId = searchParams.get('orderId');
      console.log('[Checkout v6] Loading orderId:', orderId);

      // orderId 없으면 임시 주문번호 생성
      const safeOid = orderId || `temp_${Date.now()}`;

      // ============================================
      // [1단계] 데이터 긁어오기 (Try-Catch 필수)
      // API가 죽어도(404) 코드는 죽으면 안 됨
      // ============================================
      let rawPayment: any = null;
      let rawFormData: any = null;

      try {
        const response = await fetch(`/api/payment/prepare?orderId=${safeOid}&isMobile=${isMobile}`);

        if (response.ok) {
          const data = await response.json();
          if (data.ok) {
            rawPayment = data.payment;
            rawFormData = data.formData;
            console.log('[Checkout v6] API 성공, 데이터 수신');
          } else {
            console.warn('[Checkout v6] API 응답 실패:', data.error);
          }
        } else {
          console.warn('[Checkout v6] API 응답 실패, 상태:', response.status);
        }
      } catch (e) {
        console.warn('[Checkout v6] 데이터 로딩 실패, 비상 모드로 전환합니다.', e);
      }

      // ============================================
      // [2단계] 데이터 자동 변환 (Transformation with Fallback)
      // 여기가 핵심! 비상용 값 적용
      // ============================================

      // A. 상품 정보 변환
      const safeGoodname = rawPayment?.productName
        ? String(rawPayment.productName).replace(/["'<>]/g, '') // 특수문자 제거
        : FALLBACK.productName;

      const safePrice = rawPayment?.amount && rawPayment.amount >= 1000
        ? rawPayment.amount
        : FALLBACK.price; // 0원이거나 없으면 1000원으로 고정

      // B. 고객 정보 변환
      const safeBuyerName = rawPayment?.buyerName || FALLBACK.buyerName;
      const safeBuyerTel = rawPayment?.buyerTel || FALLBACK.buyerTel;
      const safeBuyerEmail = rawPayment?.buyerEmail || FALLBACK.buyerEmail;

      // C. 주문번호 및 보안 데이터
      const safeTimestamp = rawFormData?.timestamp || String(Date.now());

      console.log('[Checkout v6] 변환된 데이터:', {
        goodname: safeGoodname,
        price: safePrice,
        buyerName: safeBuyerName,
        oid: safeOid,
      });

      // ============================================
      // [3단계] 변환된 안전한 데이터로 상태 업데이트
      // ============================================
      const safePaymentData: PaymentData = {
        orderId: safeOid,
        amount: safePrice,
        productName: safeGoodname,
        buyerName: safeBuyerName,
        buyerTel: safeBuyerTel,
        buyerEmail: safeBuyerEmail,
        productCode: rawPayment?.productCode || '',
        metadata: rawPayment?.metadata || {},
      };

      setPaymentData(safePaymentData);

      // PC인 경우 폼 데이터도 미리 세팅 (비상용 값 적용)
      if (!isMobile) {
        const safeFormData: Record<string, string> = {
          mid: rawFormData?.mid || FALLBACK.mid,
          oid: safeOid,
          price: String(safePrice),
          goodname: safeGoodname,
          buyername: safeBuyerName,
          buyertel: safeBuyerTel,
          buyeremail: safeBuyerEmail,
          currency: rawFormData?.currency || FALLBACK.currency,
          charset: rawFormData?.charset || FALLBACK.charset,
          payViewType: FALLBACK.payViewType, // 항상 overlay
          gopaymethod: rawFormData?.gopaymethod || FALLBACK.gopaymethod,
          timestamp: safeTimestamp,
          signature: rawFormData?.signature || '',
          mKey: rawFormData?.mKey || '',
          returnUrl: rawFormData?.returnUrl || '',
          closeUrl: rawFormData?.closeUrl || '',
          notiurl: rawFormData?.notiurl || '',
          acceptmethod: rawFormData?.acceptmethod || '',
          quotabase: rawFormData?.quotabase || '',
          only_easypay: rawFormData?.only_easypay || '',
        };
        setPcFormData(safeFormData);
        console.log('[Checkout v6] PC 폼 데이터 준비 완료');
      }

      // 로딩 완료 (에러 없이!)
      setIsLoading(false);
    };

    // 안전하게 호출 (전역 에러 방지)
    loadPaymentData().catch((e) => {
      console.error('[Checkout v6] Unhandled error:', e);
      // ⚠️ 에러가 발생해도 기본값으로 폼 렌더링
      setPaymentData({
        orderId: `emergency_${Date.now()}`,
        amount: FALLBACK.price,
        productName: FALLBACK.productName,
        buyerName: FALLBACK.buyerName,
        buyerTel: FALLBACK.buyerTel,
        buyerEmail: FALLBACK.buyerEmail,
        productCode: '',
        metadata: {},
      });
      setIsLoading(false);
    });
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

  // ============================================
  // [4단계: 결제 실행]
  // ============================================
  const handlePayment = useCallback(async () => {
    // 중복 클릭 방지
    if (isPaymentProcessing) return;

    console.log('[Checkout v6] Payment button clicked, isMobile:', isMobile);

    if (isMobile) {
      // === Mobile: Form Submit ===
      setIsPaymentProcessing(true);

      try {
        const response = await fetch('/api/payment/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: paymentData?.orderId,
            payMethod: selectedMethod,
            easyPayCodes: selectedEasyPay,
            isMobile: true,
          }),
        });

        if (!response.ok) {
          alert('결제 정보를 불러오는데 실패했습니다. 다시 시도해주세요.');
          setIsPaymentProcessing(false);
          return;
        }

        const data = await response.json();
        if (!data.ok || !data.formData || !data.paymentUrl) {
          alert('결제 준비 중 오류가 발생했습니다.');
          setIsPaymentProcessing(false);
          return;
        }

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.paymentUrl;
        form.acceptCharset = 'euc-kr';
        form.style.display = 'none';

        Object.entries(data.formData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value || '');
          form.appendChild(input);
        });

        document.body.appendChild(form);
        console.log('[Checkout v6] Mobile: Submitting to', data.paymentUrl);
        form.submit();
      } catch (err) {
        console.error('[Checkout v6] Mobile payment error:', err);
        alert('결제 처리 중 오류가 발생했습니다.');
        setIsPaymentProcessing(false);
      }
    } else {
      // === PC: INIStdPay.pay() 호출 ===

      // 스크립트 로드 체크
      if (typeof window.INIStdPay === 'undefined') {
        alert('결제 시스템을 불러오는 중입니다. 잠시 후 다시 클릭해주세요.');
        return;
      }

      // 폼이 있는지 최종 확인 후 실행
      const form = document.getElementById('SendPayForm_id');
      if (form) {
        setIsPaymentProcessing(true);
        window.INIStdPay.pay('SendPayForm_id'); // 무조건 실행
        console.log('[Checkout v6] INIStdPay.pay() called');
      } else {
        alert('결제 폼 생성 중입니다. 새로고침 해주세요.');
      }
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

  // ⚠️ 에러 화면 제거 - 비상용 값으로 항상 폼 렌더링
  // error 상태는 더 이상 화면 차단에 사용하지 않음

  if (!paymentData) return null;

  // PC에서 스크립트 로딩 중일 때 표시
  const isScriptReady = isMobile || scriptStatus === 'loaded';
  const showScriptLoading = !isMobile && scriptStatus === 'loading';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">

        {/* ============================================
            [3단계: 폼 완성 (빈칸 없음)]
            PC용 결제 폼 - 웰컴페이먼츠 표준 구조
            ⚠️ action, method 속성 절대 금지
            ⚠️ ID는 반드시 'SendPayForm_id'
            ============================================ */}
        {!isMobile && pcFormData && (
          <form
            id="SendPayForm_id"
            name="SendPayForm_id"
            onSubmit={(e) => e.preventDefault()}
          >
            {/* --------------------------------------------------------- */}
            {/* 1. 고정 데이터 (절대 변하지 않음) */}
            <input type="hidden" name="mid" value="wpcrdot200" />
            <input type="hidden" name="currency" value="WON" />
            <input type="hidden" name="payViewType" value="overlay" />
            <input type="hidden" name="gopaymethod" value="Card" />
            <input type="hidden" name="charset" value="UTF-8" />
            {/* --------------------------------------------------------- */}

            {/* 2. 변환된 안전 데이터 (자동 변환된 값 삽입) */}
            <input type="hidden" name="goodname" value={pcFormData.goodname || paymentData.productName || FALLBACK.productName} />
            <input type="hidden" name="price" value={pcFormData.price || String(paymentData.amount || FALLBACK.price)} />
            <input type="hidden" name="oid" value={pcFormData.oid || paymentData.orderId} />
            <input type="hidden" name="buyername" value={pcFormData.buyername || paymentData.buyerName || FALLBACK.buyerName} />
            <input type="hidden" name="buyertel" value={pcFormData.buyertel || paymentData.buyerTel || FALLBACK.buyerTel} />
            <input type="hidden" name="buyeremail" value={pcFormData.buyeremail || paymentData.buyerEmail || FALLBACK.buyerEmail} />
            <input type="hidden" name="timestamp" value={pcFormData.timestamp || String(Date.now())} />

            {/* 3. 보안 데이터 (서버에서 받아오되, 없으면 빈값이라도 넣어서 JS 오류 방지) */}
            <input type="hidden" name="signature" value={pcFormData.signature || ""} />
            <input type="hidden" name="mKey" value={pcFormData.mKey || ""} />

            {/* 4. 콜백 URL (선택) */}
            <input type="hidden" name="returnUrl" value={pcFormData.returnUrl || ''} />
            <input type="hidden" name="closeUrl" value={pcFormData.closeUrl || ''} />
            {pcFormData.notiurl && <input type="hidden" name="notiurl" value={pcFormData.notiurl} />}
            {pcFormData.acceptmethod && <input type="hidden" name="acceptmethod" value={pcFormData.acceptmethod} />}
            {pcFormData.quotabase && <input type="hidden" name="quotabase" value={pcFormData.quotabase} />}
            {pcFormData.only_easypay && <input type="hidden" name="only_easypay" value={pcFormData.only_easypay} />}
          </form>
        )}

        {/* 결제 정보 카드 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
            <h1 className="text-xl font-bold text-white">
              결제하기 <span className="text-xs font-normal text-blue-200">(v6.0)</span>
            </h1>
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
