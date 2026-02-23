'use client';

import { useEffect } from 'react';

/**
 * 웰컴페이먼츠 PC 결제 - 닫기 처리 페이지
 *
 * 매뉴얼 설명:
 * - closeUrl: 결제창 닫기 버튼 클릭 시 이동 URL
 * - 결제 취소/중단 시 이 페이지로 리다이렉트됨
 * - 부모창(overlay)을 닫고 원래 페이지로 돌아감
 */
export default function PaymentClosePage() {
  useEffect(() => {
    console.log('[Payment Close] 결제창 닫힘');

    // 1. overlay 모드: window.parent로 메시지 전송
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'PAYMENT_CLOSED' }, '*');
      } catch (e) {
        console.error('[Close] parent postMessage 실패', e);
      }
    }

    // 2. 팝업 모드: window.opener로 메시지 전송
    if (window.opener) {
      try {
        window.opener.postMessage({ type: 'PAYMENT_CLOSED' }, '*');
        setTimeout(() => window.close(), 300);
        return;
      } catch (e) {
        console.error('[Close] opener postMessage 실패', e);
      }
    }

    // 3. 폴백: history.back() 또는 checkout 페이지로
    const timer = setTimeout(() => {
      if (document.referrer && document.referrer.includes('/payment/checkout')) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          {/* 아이콘 */}
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          {/* 메시지 */}
          <h1 className="text-xl font-bold text-gray-800 mb-2">결제가 취소되었습니다</h1>
          <p className="text-gray-500 mb-6">
            결제창을 닫았거나 결제를 취소하셨습니다.<br />
            잠시 후 메인 페이지로 이동합니다.
          </p>

          {/* 버튼 */}
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 결제하기
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              메인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
