'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface ReservationInfo {
  id: number;
  trip: {
    productCode: string;
    shipName: string;
    departureDate: string;
  };
  totalPeople: number;
  cabinType: string | null;
  paymentAmount: number | null;
}

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('reservationId');
  
  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!reservationId) {
      alert('예약 정보를 찾을 수 없습니다.');
      router.push('/');
      return;
    }

    // 예약 정보 조회
    fetch(`/api/reservations/${reservationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.reservation) {
          setReservation(data.reservation);
        } else {
          alert('예약 정보를 불러올 수 없습니다.');
          router.push('/');
        }
      })
      .catch((error) => {
        console.error('예약 정보 조회 실패:', error);
        alert('예약 정보를 불러오는 중 오류가 발생했습니다.');
        router.push('/');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [reservationId, router]);

  const handleLaterRequest = async () => {
    if (!reservationId) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/reservations/${reservationId}/passport-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'LATER' }),
      });

      const data = await response.json();
      if (data.ok) {
        setShowModal(true);
      } else {
        alert('요청 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
      alert('요청 처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-800">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 성공 메시지 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            결제가 완료되었습니다!
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            예약번호: <span className="font-semibold text-indigo-600">{reservationId}</span>
          </p>
          <p className="text-lg text-gray-600 mb-6">
            여행 준비를 위해 여권을 등록해주세요.
          </p>

          {/* 예약 정보 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h2 className="font-semibold text-gray-900 mb-2">예약 정보</h2>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">선박:</span> {reservation.trip.shipName}
              </p>
              <p>
                <span className="font-medium">출발일:</span>{' '}
                {new Date(reservation.trip.departureDate).toLocaleDateString('ko-KR')}
              </p>
              <p>
                <span className="font-medium">인원:</span> {reservation.totalPeople}명
              </p>
              {reservation.cabinType && (
                <p>
                  <span className="font-medium">객실:</span> {reservation.cabinType}
                </p>
              )}
              {reservation.paymentAmount && (
                <p>
                  <span className="font-medium">결제금액:</span>{' '}
                  {reservation.paymentAmount.toLocaleString()}원
                </p>
              )}
            </div>
          </div>

          {/* 버튼 3개 */}
          <div className="space-y-3">
            {/* 1. 지금 바로 등록하기 (권장) - 임시로 예약ID 사용 (추후 토큰으로 전환 예정) */}
            <Link
              href={`/customer/passport/${reservationId}`}
              className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 text-center"
            >
              <span className="text-2xl mr-2">🚀</span>
              지금 바로 여권 등록하기
            </Link>

            {/* 2. 챗봇으로 도움받기 */}
            <Link
              href={`/?openChat=true`}
              className="block w-full bg-white border-2 border-indigo-300 text-indigo-700 font-semibold py-4 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 text-center"
            >
              <span className="text-2xl mr-2">🤖</span>
              챗봇으로 도움받기
            </Link>

            {/* 3. 준비 후 상담원 문의 */}
            <button
              onClick={handleLaterRequest}
              disabled={submitting}
              className="block w-full bg-gray-100 border-2 border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl mr-2">📞</span>
              {submitting ? '처리 중...' : '준비 후 나중에 등록'}
            </button>
          </div>
        </div>

        {/* 안내 문구 */}
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-sm text-gray-600">
            💡 <strong>팁:</strong> 여권 등록을 완료하시면 여행 준비가 더욱 원활해집니다.
            <br />
            궁금한 점이 있으시면 챗봇을 이용해주세요!
          </p>
        </div>
      </div>

      {/* 모달 (상담원 문의 완료) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📞</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              요청이 접수되었습니다
            </h2>
            <p className="text-gray-600 mb-6">
              담당자가 확인 후 연락드리겠습니다.
              <br />
              여권 등록은 나중에 진행하실 수 있습니다.
            </p>
            <button
              onClick={() => {
                setShowModal(false);
                router.push('/');
              }}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

