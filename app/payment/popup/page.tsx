'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * 웰컴페이먼츠 PC 결제 - 팝업 처리 페이지
 *
 * 매뉴얼 설명:
 * - popupUrl: 팝업 형태로 결제창이 열릴 때 사용되는 URL
 * - 이 페이지는 결제 진행 중 팝업창에 표시됨
 * - 결제 완료 후 결과를 부모창에 전달하고 닫힘
 */
function PopupContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'processing' | 'complete' | 'error'>('loading');
  const [message, setMessage] = useState('결제 처리 중...');

  useEffect(() => {
    console.log('[Payment Popup] Page loaded');
    console.log('[Payment Popup] Search params:', Object.fromEntries(searchParams.entries()));

    // URL 파라미터에서 결제 결과 확인
    const resultCode = searchParams.get('resultCode') || searchParams.get('P_STATUS');
    const resultMsg = searchParams.get('resultMsg') || searchParams.get('P_RMESG1');

    if (resultCode) {
      // 결제 결과가 있는 경우
      if (resultCode === '0000' || resultCode === '00') {
        setStatus('complete');
        setMessage('결제가 완료되었습니다!');

        // 부모창에 결과 전달
        if (window.opener) {
          try {
            window.opener.postMessage({
              type: 'PAYMENT_COMPLETE',
              resultCode,
              resultMsg,
              data: Object.fromEntries(searchParams.entries())
            }, '*');

            // 2초 후 팝업 닫기
            setTimeout(() => {
              window.close();
            }, 2000);
          } catch (e) {
            console.error('[Payment Popup] Failed to notify opener:', e);
          }
        }
      } else {
        setStatus('error');
        setMessage(resultMsg || '결제 처리 중 오류가 발생했습니다.');

        // 부모창에 에러 전달
        if (window.opener) {
          try {
            window.opener.postMessage({
              type: 'PAYMENT_ERROR',
              resultCode,
              resultMsg,
              data: Object.fromEntries(searchParams.entries())
            }, '*');
          } catch (e) {
            console.error('[Payment Popup] Failed to notify opener:', e);
          }
        }
      }
    } else {
      // 결제 진행 중
      setStatus('processing');
      setMessage('결제를 진행하고 있습니다...');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          {/* 상태별 아이콘 */}
          {status === 'loading' || status === 'processing' ? (
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
          ) : status === 'complete' ? (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          {/* 메시지 */}
          <h1 className={`text-xl font-bold mb-2 ${
            status === 'complete' ? 'text-green-600' :
            status === 'error' ? 'text-red-600' : 'text-gray-800'
          }`}>
            {status === 'complete' ? '결제 완료' :
             status === 'error' ? '결제 실패' : '결제 처리 중'}
          </h1>
          <p className="text-gray-500 mb-6">{message}</p>

          {/* 버튼 (에러 상태일 때만 표시) */}
          {status === 'error' && (
            <div className="space-y-3">
              <button
                onClick={() => window.close()}
                className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>
          )}

          {/* 완료 상태 안내 */}
          {status === 'complete' && (
            <p className="text-sm text-gray-400">
              잠시 후 창이 자동으로 닫힙니다...
            </p>
          )}
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
        <p className="mt-4 text-gray-600">로딩 중...</p>
      </div>
    </div>
  );
}

export default function PaymentPopupPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PopupContent />
    </Suspense>
  );
}
