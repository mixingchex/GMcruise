'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useRef } from 'react';
import { FiCheckCircle, FiHome, FiShoppingBag, FiMail, FiPhone } from 'react-icons/fi';
import { HiOutlineSparkles } from 'react-icons/hi';
import Link from 'next/link';

function PaymentSuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 다양한 파라미터에서 주문번호 추출
  const orderId = searchParams.get('orderId') || searchParams.get('oid') || searchParams.get('P_OID');
  const tid = searchParams.get('tid') || searchParams.get('P_TID');
  const sessionId = searchParams.get('sessionId');
  const productCode = searchParams.get('productCode');
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [orderData, setOrderData] = useState<{ amount: number; productName: string | null } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 표시할 주문번호 결정 (orderId 우선, 없으면 tid)
  const displayOrderId = orderId || tid || 'N/A';

  // 서버 검증: orderId가 있으면 결제 상태 확인 후 완료 화면 표시
  useEffect(() => {
    if (!orderId) {
      // orderId 없으면 결제 흐름 외부 접근 → 홈으로 리다이렉트
      router.replace('/');
      return;
    }

    const controller = new AbortController();

    fetch(`/api/payment/order/${orderId}`, { credentials: 'include', signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok || !data.order || data.order.status !== 'completed') {
          // 결제 미완료 또는 조회 실패 → 실패 페이지로 리다이렉트
          router.replace(`/payment/failed?orderId=${orderId}`);
          return;
        }
        setOrderData(data.order); // tracking에서 재사용
        setIsLoading(false);
        setShowConfetti(true);
        // confetti 효과 3초 후 제거
        timerRef.current = setTimeout(() => setShowConfetti(false), 3000);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return; // 언마운트로 인한 취소 무시
        // 네트워크 에러 시 실패 페이지로
        router.replace(`/payment/failed?orderId=${orderId}`);
      });

    return () => {
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [orderId, router]);

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

  // 구매 완료 이벤트 추적 (서버 검증 통과 후 실행, 검증에서 저장한 orderData 재사용)
  useEffect(() => {
    if (isLoading || !orderId || !productCode || !orderData) return;

    const runTracking = async () => {
      try {
        const { trackPurchase } = await import('@/lib/marketing/tracking');
        trackPurchase({
          transactionId: orderId,
          value: orderData.amount || 0,
          currency: 'KRW',
          items: [{
            item_id: productCode,
            item_name: orderData.productName || productCode,
            price: orderData.amount || 0,
            quantity: 1,
          }],
        });
      } catch (error) {
        console.error('[PaymentSuccessPage] Failed to track purchase:', error);
      }
    };

    runTracking();
  }, [isLoading, orderId, productCode, orderData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
      </div>

      {/* Confetti 효과 */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 50}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <HiOutlineSparkles
                className="text-yellow-400"
                size={16 + Math.random() * 16}
                style={{ opacity: 0.6 + Math.random() * 0.4 }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="container mx-auto max-w-xl relative z-10">
        {/* 메인 카드 */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/50">
          {/* 헤더 그라데이션 */}
          <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 px-8 py-10 text-center relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjEiIGN4PSIyMCIgY3k9IjIwIiByPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-30"></div>

            <div className="relative">
              {/* 성공 아이콘 */}
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-lg mb-5 animate-pulse">
                <FiCheckCircle className="text-emerald-500" size={56} />
              </div>

              <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                🎉 결제 완료!
              </h1>
              <p className="text-emerald-100 text-lg">
                크루즈 여행을 예약해주셔서 감사합니다
              </p>
            </div>
          </div>

          {/* 주문 정보 */}
          <div className="px-8 py-6">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-5 mb-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm font-medium">주문번호</span>
                <span className="font-mono text-lg font-bold text-gray-800 bg-white px-4 py-2 rounded-lg shadow-sm">
                  {displayOrderId}
                </span>
              </div>
            </div>

            {/* 이메일 안내 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 mb-5 border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FiMail className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">결제 확인</h3>
                  <p className="text-sm text-gray-600">
                    결제 내역은 이메일로 발송되었습니다.
                  </p>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    이메일을 기재하지 않은 고객님은 본사 매니저님께 요청해 주시면<br />
                    구매확인서를 보내드립니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 여권 정보 안내 */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-5 mb-6 border border-amber-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">
                  🛂
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 mb-2">여권 정보 등록 안내</h3>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    매니저님께 바로 여권 정보를 등록해주세요.<br />
                    곧 연락 드려 등록 링크를 전송해드립니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 연락처 안내 */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 mb-6 border border-purple-100">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FiPhone className="text-purple-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">문의사항</h3>
                  <p className="text-sm text-gray-600">
                    담당 매니저가 곧 연락드릴 예정입니다
                  </p>
                </div>
              </div>
            </div>

            {/* 버튼 그룹 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/"
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-2xl transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <FiHome size={20} />
                홈으로 가기
              </Link>
              <Link
                href="/products"
                className="flex-1 px-6 py-4 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold rounded-2xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <FiShoppingBag size={20} />
                다른 상품 보기
              </Link>
            </div>
          </div>

          {/* 푸터 */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-8 py-4 text-center border-t border-gray-100">
            <p className="text-xs text-gray-500">
              ✨ 즐거운 크루즈 여행 되세요! ✨
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    }>
      <PaymentSuccessPageContent />
    </Suspense>
  );
}
