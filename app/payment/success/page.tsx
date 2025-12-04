'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { FiCheckCircle, FiHome } from 'react-icons/fi';
import Link from 'next/link';

function PaymentSuccessPageContent() {
  const searchParams = useSearchParams();

  // 다양한 파라미터에서 주문번호 추출
  const orderId = searchParams.get('orderId') || searchParams.get('oid') || searchParams.get('P_OID');
  const tid = searchParams.get('tid') || searchParams.get('P_TID');
  const sessionId = searchParams.get('sessionId');
  const productCode = searchParams.get('productCode');
  const [isLoading, setIsLoading] = useState(true);

  // 표시할 주문번호 결정 (orderId 우선, 없으면 tid)
  const displayOrderId = orderId || tid || 'N/A';

  useEffect(() => {
    setIsLoading(false);
  }, [orderId]);

  useEffect(() => {
    if (!sessionId) return;

    const payload: Record<string, any> = {
      sessionId,
      paymentStatus: 'SUCCESS',
      paymentCompletedAt: new Date().toISOString(),
    };
    if (orderId) payload.paymentOrderId = orderId;
    if (productCode) payload.finalPageUrl = `/products/${productCode}/payment/success`;

    fetch('/api/chat-bot/session', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((error) => {
      console.error('[PaymentSuccessPage] Failed to update chat session:', error);
    });
  }, [sessionId, orderId, productCode]);

  // 구매 완료 이벤트 추적
  useEffect(() => {
    if (!orderId || !productCode) return;

    const trackPurchase = async () => {
      try {
        // 결제 정보 가져오기 (API에서 주문 정보 조회)
        const orderRes = await fetch(`/api/payment/order/${orderId}`, {
          credentials: 'include',
        });

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          if (orderData.ok && orderData.order) {
            const { trackPurchase } = await import('@/lib/marketing/tracking');
            trackPurchase({
              transactionId: orderId,
              value: orderData.order.amount || 0,
              currency: 'KRW',
              items: [{
                item_id: productCode,
                item_name: orderData.order.productName || productCode,
                price: orderData.order.amount || 0,
                quantity: 1,
              }],
            });
            return;
          }
        }

        // 주문 정보를 가져올 수 없는 경우 기본값으로 추적
        const { trackPurchase } = await import('@/lib/marketing/tracking');
        trackPurchase({
          transactionId: orderId,
          value: 0,
          currency: 'KRW',
          items: [{
            item_id: productCode,
            item_name: productCode,
            price: 0,
            quantity: 1,
          }],
        });
      } catch (error) {
        console.error('[PaymentSuccessPage] Failed to track purchase:', error);
      }
    };

    trackPurchase();
  }, [orderId, productCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <FiCheckCircle className="text-green-600" size={48} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">결제가 완료되었습니다!</h1>
            <p className="text-gray-600">주문번호: {displayOrderId}</p>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
            <p className="text-green-800 font-semibold">
              결제가 성공적으로 완료되었습니다.
            </p>
            <p className="text-sm text-green-700 mt-2">
              결제 내역은 이메일로 발송되었습니다.
            </p>
            <p className="text-xs text-green-600 mt-1">
              (이메일을 기재하지 않은 고객님은 본사 매니저님께 요청해 주시면 구매확인서를 보내드립니다.)
            </p>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">🛂 여권 정보 등록 안내</h3>
            <p className="text-sm text-yellow-800 mb-4">
              매니저님께 바로 여권 정보를 등록해주세요.<br />
              곧 연락 드려 등록 링크를 전송해드립니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/"
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FiHome size={20} />
              홈으로 가기
            </Link>
            <Link
              href="/products"
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
            >
              다른 상품 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">로딩 중...</div>}>
      <PaymentSuccessPageContent />
    </Suspense>
  );
}
