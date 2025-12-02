'use client';

import { useState, useEffect } from 'react';
import { FiX, FiUser, FiPhone, FiMail, FiCalendar, FiLock, FiUnlock, FiPackage, FiShoppingCart, FiDollarSign, FiFileText, FiPlus, FiSave, FiInfo, FiCheckCircle } from 'react-icons/fi';

interface CustomerDetail {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  isLocked: boolean;
  isHibernated: boolean;
  customerStatus: string | null;
  role: string | null;
  mallUserId: string | null;
  mallNickname: string | null;
  kakaoChannelAdded: boolean;
  kakaoChannelAddedAt: string | null;
  pwaGenieInstalledAt: string | null;
  pwaMallInstalledAt: string | null;
  currentPassword: string | null;
  trips: Array<{
    id: number;
    cruiseName: string | null;
    companionType: string | null;
    destination: any;
    startDate: string | null;
    endDate: string | null;
    status: string | null;
    Reservation?: Array<{
      id: number;
      tripId: number;
      totalPeople: number;
      passportStatus: string;
      Traveler?: Array<{
        id: number;
        engGivenName: string | null;
        engSurname: string | null;
        korName: string | null;
        passportNo: string | null;
        birthDate: string | null;
        expiryDate: string | null;
      }>;
    }>;
  }>;
  reservations?: Array<{
    id: number;
    tripId: number;
    totalPeople: number;
    passportStatus: string;
    Traveler?: Array<{
      id: number;
      engGivenName: string | null;
      engSurname: string | null;
      korName: string | null;
      passportNo: string | null;
      birthDate: string | null;
      expiryDate: string | null;
    }>;
  }>;
  refundHistory?: Array<{
    id: number;
    amount: number;
    reason: string;
    createdAt: string;
    productName?: string;
    tripId?: number;
  }>;
  apisInfo?: {
    spreadsheetId: string | null;
    googleFolderId: string | null;
    tripId: number | null;
  };
}

interface Props {
  customerId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerDetailModal({ customerId, isOpen, onClose }: Props) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassportForm, setShowPassportForm] = useState(false);
  const [passportForm, setPassportForm] = useState({
    korName: '',
    engGivenName: '',
    engSurname: '',
    passportNo: '',
    sex: '', // 성별 추가
    birthDate: '',
    issueDate: '', // 발급일 추가
    expiryDate: '',
    reservationId: null as number | null,
  });
  const [passportScanned, setPassportScanned] = useState(false); // 여권 스캔 완료 여부
  const [isScanning, setIsScanning] = useState(false); // 스캔 중 상태

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen && customerId) {
      loadCustomerDetail();
    }
  }, [isOpen, customerId]);

  const loadCustomerDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${customerId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('고객 정보를 불러올 수 없습니다.');
      }

      const data = await response.json();
      if (!data.ok || !data.user) {
        throw new Error(data.error || '고객 정보를 불러올 수 없습니다.');
      }

      // 디버깅: 여권 정보 확인
      if (process.env.NODE_ENV === 'development') {
        const tripsWithReservations = data.user.trips?.map((trip: any) => ({
          id: trip.id,
          cruiseName: trip.cruiseName,
          reservationsCount: trip.Reservation?.length || 0,
          reservations: trip.Reservation?.map((res: any) => ({
            id: res.id,
            totalPeople: res.totalPeople,
            travelersCount: res.Traveler?.length || 0,
            travelersWithPassport: res.Traveler?.filter((t: any) => t.passportNo && t.passportNo.trim() !== '')?.length || 0,
            travelers: res.Traveler?.map((t: any) => ({
              id: t.id,
              korName: t.korName,
              engName: `${t.engGivenName || ''} ${t.engSurname || ''}`.trim(),
              passportNo: t.passportNo,
              passportImage: t.passportImage, // 여권 이미지 포함
              hasPassport: !!(t.passportNo && t.passportNo.trim() !== ''),
            })),
          })) || [],
        })) || [];

        console.log('[CustomerDetailModal] Customer data:', {
          id: data.user.id,
          tripsCount: data.user.trips?.length || 0,
          reservationsCount: data.user.reservations?.length || 0,
          reservations: data.user.reservations?.map((res: any) => ({
            id: res.id,
            totalPeople: res.totalPeople,
            travelersCount: res.Traveler?.length || 0,
            travelersWithPassport: res.Traveler?.filter((t: any) => t.passportNo && t.passportNo.trim() !== '')?.length || 0,
            travelers: res.Traveler?.map((t: any) => ({
              id: t.id,
              korName: t.korName,
              engName: `${t.engGivenName || ''} ${t.engSurname || ''}`.trim(),
              passportNo: t.passportNo,
              passportImage: t.passportImage, // 여권 이미지 포함
              hasPassport: !!(t.passportNo && t.passportNo.trim() !== ''),
            })),
          })),
          tripsWithReservations,
        });
      }

      setCustomer(data.user);
    } catch (err) {
      console.error('[CustomerDetailModal] Error loading customer:', err);
      setError(err instanceof Error ? err.message : '고객 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-brand-red text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">고객 상세 정보</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">로딩 중...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!loading && !error && customer && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <section className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FiUser size={20} />
                  기본 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">이름</label>
                    <p className="font-medium">{customer.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">전화번호</label>
                    <p className="font-medium">{customer.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">이메일</label>
                    <p className="font-medium">{customer.email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">비밀번호</label>
                    <p className="font-medium font-mono">{customer.currentPassword || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">역할</label>
                    <p className="font-medium">
                      {customer.role === 'community' ? '크루즈몰' : customer.role === 'user' ? '크루즈가이드' : customer.role || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">크루즈몰 ID</label>
                    <p className="font-medium">{customer.mallUserId || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">크루즈몰 닉네임</label>
                    <p className="font-medium">{customer.mallNickname || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">상태</label>
                    <p className="font-medium">
                      {customer.isLocked ? '🔒 잠금' : customer.isHibernated ? '💤 동면' : customer.customerStatus || '활성'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">가입일</label>
                    <p className="font-medium">{new Date(customer.createdAt).toLocaleString('ko-KR')}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">최근 활동</label>
                    <p className="font-medium">
                      {customer.lastActiveAt ? new Date(customer.lastActiveAt).toLocaleString('ko-KR') : '-'}
                    </p>
                  </div>
                </div>
              </section>

              {/* 서비스 이용 정보 */}
              <section className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FiPackage size={20} />
                  서비스 이용 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">카카오 채널</label>
                    <p className="font-medium">
                      {customer.kakaoChannelAdded ? (
                        <span className="text-green-600">
                          ✓ 추가됨 {customer.kakaoChannelAddedAt && `(${new Date(customer.kakaoChannelAddedAt).toLocaleDateString('ko-KR')})`}
                        </span>
                      ) : (
                        <span className="text-gray-400">미추가</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">PWA 설치</label>
                    <div className="font-medium">
                      {customer.pwaGenieInstalledAt && (
                        <div className="text-pink-600">
                          📲 지니: {new Date(customer.pwaGenieInstalledAt).toLocaleDateString('ko-KR')}
                        </div>
                      )}
                      {customer.pwaMallInstalledAt && (
                        <div className="text-blue-600">
                          📲 몰: {new Date(customer.pwaMallInstalledAt).toLocaleDateString('ko-KR')}
                        </div>
                      )}
                      {!customer.pwaGenieInstalledAt && !customer.pwaMallInstalledAt && (
                        <span className="text-gray-400">미설치</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* APIS 정보 */}
              {customer.apisInfo && (customer.apisInfo.spreadsheetId || customer.apisInfo.googleFolderId) && (
                <section className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiFileText size={20} />
                    APIS 등록 정보
                  </h3>
                  <div className="space-y-2">
                    {customer.apisInfo.spreadsheetId && (
                      <div>
                        <label className="text-sm text-gray-600">스프레드시트 ID</label>
                        <p className="font-mono text-sm break-all">{customer.apisInfo.spreadsheetId}</p>
                      </div>
                    )}
                    {customer.apisInfo.googleFolderId && (
                      <div>
                        <label className="text-sm text-gray-600">구글 폴더 ID</label>
                        <p className="font-mono text-sm break-all">{customer.apisInfo.googleFolderId}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 구매 상품 정보 */}
              {(customer.reservations && customer.reservations.length > 0) ||
                (customer.trips && customer.trips.some(t => t.Reservation && t.Reservation.length > 0)) ? (
                <section className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiShoppingCart size={20} />
                    구매 상품 정보
                  </h3>
                  <div className="space-y-4">
                    {customer.trips?.map((trip) => {
                      const reservations = trip.Reservation || [];
                      if (reservations.length === 0) return null;

                      return (
                        <div key={trip.id} className="border border-green-200 rounded-lg p-4 bg-white">
                          <div className="font-semibold mb-2">{trip.cruiseName || '여행 정보'}</div>
                          <div className="text-sm text-gray-600 mb-3">
                            {trip.startDate && trip.endDate && (
                              <div>
                                {new Date(trip.startDate).toLocaleDateString('ko-KR')} ~ {new Date(trip.endDate).toLocaleDateString('ko-KR')}
                              </div>
                            )}
                            {trip.destination && (
                              <div>
                                목적지: {Array.isArray(trip.destination) ? trip.destination.join(', ') : trip.destination}
                              </div>
                            )}
                            {trip.companionType && (
                              <div>동반자: {trip.companionType}</div>
                            )}
                          </div>
                          {reservations.map((res) => (
                            <div key={res.id} className="mt-3 pt-3 border-t border-gray-200">
                              <div className="text-sm">
                                <div className="font-medium">예약 ID: {res.id}</div>
                                <div>인원: {res.totalPeople}명</div>
                                <div>여권 상태: {res.passportStatus}</div>
                                {res.Traveler && res.Traveler.length > 0 && (
                                  <div className="mt-2">
                                    <div className="font-medium mb-1">여행자 정보:</div>
                                    {res.Traveler.map((traveler: any) => (
                                      <div key={traveler.id} className="ml-4 text-xs text-gray-600 mb-2">
                                        {traveler.korName || `${traveler.engGivenName || ''} ${traveler.engSurname || ''}`.trim() || '이름 없음'}
                                        {traveler.passportNo && ` (여권: ${traveler.passportNo})`}
                                        {traveler.passportImage && (
                                          <div className="mt-1 flex gap-1">
                                            <button
                                              onClick={() => {
                                                const img = new Image();
                                                img.src = traveler.passportImage;
                                                const w = window.open();
                                                if (w) {
                                                  w.document.write(`<img src="${traveler.passportImage}" style="max-width: 100%; height: auto;" />`);
                                                }
                                              }}
                                              className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                            >
                                              이미지 보기
                                            </button>
                                            <button
                                              onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = traveler.passportImage;
                                                link.download = `passport_${traveler.passportNo || 'unknown'}.jpg`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                              }}
                                              className="px-2 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                            >
                                              다운로드
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {customer.reservations?.map((res) => (
                      <div key={res.id} className="border border-green-200 rounded-lg p-4 bg-white">
                        <div className="font-semibold mb-2">예약 ID: {res.id}</div>
                        <div className="text-sm">
                          <div>인원: {res.totalPeople}명</div>
                          <div>여권 상태: {res.passportStatus}</div>
                          {res.Traveler && res.Traveler.length > 0 && (
                            <div className="mt-2">
                              <div className="font-medium mb-1">여행자 정보:</div>
                              {res.Traveler.map((traveler: any) => (
                                <div key={traveler.id} className="ml-4 text-xs text-gray-600 mb-2">
                                  {traveler.korName || `${traveler.engGivenName || ''} ${traveler.engSurname || ''}`.trim() || '이름 없음'}
                                  {traveler.passportNo && ` (여권: ${traveler.passportNo})`}
                                  {traveler.passportImage && (
                                    <div className="mt-1 flex gap-1">
                                      <button
                                        onClick={() => {
                                          const img = new Image();
                                          img.src = traveler.passportImage;
                                          const w = window.open();
                                          if (w) {
                                            w.document.write(`<img src="${traveler.passportImage}" style="max-width: 100%; height: auto;" />`);
                                          }
                                        }}
                                        className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                      >
                                        이미지 보기
                                      </button>
                                      <button
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = traveler.passportImage;
                                          link.download = `passport_${traveler.passportNo || 'unknown'}.jpg`;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }}
                                        className="px-2 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                      >
                                        다운로드
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiShoppingCart size={20} />
                    구매 상품 정보
                  </h3>
                  <p className="text-gray-500">구매한 상품이 없습니다.</p>
                </section>
              )}

              {/* 환불 이력 */}
              {customer.refundHistory && customer.refundHistory.length > 0 ? (
                <section className="bg-red-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiDollarSign size={20} />
                    환불 이력
                  </h3>
                  <div className="space-y-3">
                    {customer.refundHistory.map((refund) => (
                      <div key={refund.id} className="border border-red-200 rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-red-600">
                              {refund.productName || `여행 ID: ${refund.tripId || 'N/A'}`}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              환불 금액: {refund.amount.toLocaleString('ko-KR')}원
                            </div>
                            {refund.reason && (
                              <div className="text-sm text-gray-700 mt-2">
                                사유: {refund.reason}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(refund.createdAt).toLocaleString('ko-KR')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FiDollarSign size={20} />
                    환불 이력
                  </h3>
                  <p className="text-gray-500">환불 이력이 없습니다.</p>
                </section>
              )}

              {/* 여권 정보 (문자기록) */}
              <section className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FiFileText size={20} />
                  여권 정보
                </h3>
                {(() => {
                  // 모든 여행의 Reservation에서 Traveler 정보 수집
                  const allTravelers: Array<{
                    name: string;
                    passportNo: string | null;
                    birthDate: string | null;
                    expiryDate: string | null;
                    tripName: string;
                    reservationId: number;
                  }> = [];

                  // 디버깅: trips의 Reservation 확인
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[CustomerDetailModal] Collecting passport info:', {
                      tripsCount: customer.trips?.length || 0,
                      trips: customer.trips?.map((trip: any) => ({
                        id: trip.id,
                        cruiseName: trip.cruiseName,
                        reservationsCount: trip.Reservation?.length || 0,
                        reservations: trip.Reservation?.map((res: any) => ({
                          id: res.id,
                          totalPeople: res.totalPeople,
                          travelersCount: res.Traveler?.length || 0,
                          travelers: res.Traveler?.map((t: any) => ({
                            id: t.id,
                            korName: t.korName,
                            engName: `${t.engGivenName || ''} ${t.engSurname || ''}`.trim(),
                            passportNo: t.passportNo,
                            hasPassport: !!(t.passportNo && t.passportNo.trim() !== ''),
                          })),
                        })),
                      })),
                    });
                  }

                  // trips에서 여권 정보 수집 (passportNo가 있는 Traveler만)
                  customer.trips?.forEach((trip) => {
                    if (trip.Reservation && Array.isArray(trip.Reservation)) {
                      trip.Reservation.forEach((res) => {
                        if (res.Traveler && Array.isArray(res.Traveler)) {
                          res.Traveler.forEach((traveler) => {
                            // passportNo가 있는 Traveler만 수집
                            if (traveler.passportNo && traveler.passportNo.trim() !== '') {
                              const name = traveler.korName ||
                                `${traveler.engGivenName || ''} ${traveler.engSurname || ''}`.trim() ||
                                '이름 없음';
                              allTravelers.push({
                                name,
                                passportNo: traveler.passportNo,
                                birthDate: traveler.birthDate,
                                expiryDate: traveler.expiryDate,
                                tripName: trip.cruiseName || '여행 정보',
                                reservationId: res.id,
                              });
                            }
                          });
                        }
                      });
                    }
                  });

                  // reservations에서 여권 정보 수집 (passportNo가 있는 Traveler만)
                  customer.reservations?.forEach((res) => {
                    res.Traveler?.forEach((traveler) => {
                      // passportNo가 있는 Traveler만 수집
                      if (traveler.passportNo && traveler.passportNo.trim() !== '') {
                        const name = traveler.korName ||
                          `${traveler.engGivenName || ''} ${traveler.engSurname || ''}`.trim() ||
                          '이름 없음';
                        allTravelers.push({
                          name,
                          passportNo: traveler.passportNo,
                          birthDate: traveler.birthDate,
                          expiryDate: traveler.expiryDate,
                          tripName: '예약 정보',
                          reservationId: res.id,
                        });
                      }
                    });
                  });

                  if (allTravelers.length === 0) {
                    return <p className="text-gray-500">등록된 여권 정보가 없습니다.</p>;
                  }

                  return (
                    <div className="space-y-3">
                      {allTravelers.map((traveler, index) => {
                        const expiryDate = traveler.expiryDate ? new Date(traveler.expiryDate) : null;
                        const now = new Date();
                        const sixMonthsLater = new Date();
                        sixMonthsLater.setMonth(now.getMonth() + 6);

                        let statusColor = 'text-gray-700';
                        let statusText = '';
                        if (expiryDate) {
                          if (expiryDate < now) {
                            statusColor = 'text-red-600 font-bold';
                            statusText = ' (만료됨)';
                          } else if (expiryDate < sixMonthsLater) {
                            statusColor = 'text-orange-600 font-semibold';
                            statusText = ' (만료 임박)';
                          } else {
                            statusColor = 'text-green-600';
                            statusText = ' (유효)';
                          }
                        }

                        return (
                          <div key={index} className="bg-white border border-yellow-200 rounded-lg p-4">
                            <div className="font-medium text-gray-800 mb-2">
                              {traveler.name} - {traveler.tripName} (예약 ID: {traveler.reservationId})
                            </div>
                            <div className="text-sm space-y-1 text-gray-600">
                              {traveler.passportNo ? (
                                <div>여권번호: <span className="font-mono">{traveler.passportNo}</span></div>
                              ) : (
                                <div className="text-red-600">여권번호: 미등록</div>
                              )}
                              {traveler.birthDate && (
                                <div>생년월일: {new Date(traveler.birthDate).toLocaleDateString('ko-KR')}</div>
                              )}
                              {expiryDate && (
                                <div className={statusColor}>
                                  만료일: {expiryDate.toLocaleDateString('ko-KR')}{statusText}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* 수동 여권 등록 버튼 */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowPassportForm(!showPassportForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiPlus size={16} />
                    {showPassportForm ? '취소' : '수동 여권 등록'}
                  </button>
                </div>

                {/* 수동 여권 등록 폼 */}
                {showPassportForm && (
                  <div className="mt-4 bg-white border-2 border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-4">여권 스캔 및 정보 입력</h4>

                    {/* 여권 스캔 필수 안내 */}
                    {!passportScanned && (
                      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                          <FiInfo size={18} />
                          <span>여권 스캔 필수 (OCR 자동 인식)</span>
                        </div>
                        <p className="text-sm text-yellow-700 mb-2">
                          수동 여권 등록은 반드시 여권 이미지를 스캔하여 정보를 추출해야 합니다.
                          Jaminai AI가 자동으로 여권 정보를 읽어 입력합니다.
                        </p>
                        <div className="text-xs text-yellow-600 space-y-1">
                          <div>💡 <strong>촬영 팁:</strong></div>
                          <ul className="ml-4 list-disc space-y-0.5">
                            <li>밝은 곳에서 촬영하세요</li>
                            <li>여권을 평평하게 놓고 정면에서 촬영하세요</li>
                            <li>반사광이 텍스트를 가리지 않도록 주의하세요</li>
                            <li>모든 텍스트가 보이도록 전체를 촬영하세요</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* 여권 이미지 업로드 */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        여권 이미지 업로드 * (필수)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          try {
                            setIsScanning(true);

                            // FormData 생성
                            const formData = new FormData();
                            formData.append('file', file);

                            // Jaminai (Gemini) API로 여권 스캔
                            const response = await fetch('/api/passport/scan', {
                              method: 'POST',
                              body: formData,
                            });

                            const data = await response.json();

                            if (data.ok && data.data) {
                              // 스캔 성공 - 폼에 데이터 자동 입력
                              setPassportForm({
                                ...passportForm,
                                korName: data.data.korName || '',
                                engGivenName: data.data.engGivenName || '',
                                engSurname: data.data.engSurname || '',
                                passportNo: data.data.passportNo || '',
                                sex: data.data.sex || '', // 성별
                                birthDate: data.data.dateOfBirth || '',
                                issueDate: data.data.dateOfIssue || '', // 발급일
                                expiryDate: data.data.passportExpiryDate || '',
                              });
                              setPassportScanned(true);

                              // 경고 메시지 표시 (일부 정보 누락 시)
                              if (data.warnings) {
                                alert(`✅ 여권 스캔 완료!\n\n⚠️ ${data.warnings}\n\n아래 정보를 확인하고 누락된 부분을 입력해주세요.`);
                              } else {
                                alert('✅ 여권 스캔 완료! 모든 정보가 추출되었습니다.\n\n정보를 확인하고 필요시 수정하세요.');
                              }
                            } else {
                              // 에러 메시지 표시
                              const errorMsg = data.error || '여권 스캔에 실패했습니다. 선명한 이미지를 업로드해주세요.';
                              alert(`❌ 스캔 실패\n\n${errorMsg}`);
                            }
                          } catch (err) {
                            console.error('[Passport Scan Error]', err);
                            alert('여권 스캔 중 오류가 발생했습니다.');
                          } finally {
                            setIsScanning(false);
                          }
                        }}
                        disabled={isScanning}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      {isScanning && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 text-blue-700">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <div>
                              <div className="font-medium">Jaminai AI로 여권 스캔 중...</div>
                              <div className="text-xs text-blue-600 mt-0.5">OCR 자동 인식 처리 중입니다</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {passportScanned && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700">
                            <FiCheckCircle size={18} />
                            <div>
                              <div className="font-medium">여권 스캔 완료 ✓</div>
                              <div className="text-xs text-green-600 mt-0.5">
                                아래 정보를 확인하고 누락된 부분이 있으면 수정해주세요
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">한국 이름 *</label>
                        <input
                          type="text"
                          value={passportForm.korName}
                          onChange={(e) => setPassportForm({ ...passportForm, korName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="홍길동"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">영문 이름 (Given Name)</label>
                        <input
                          type="text"
                          value={passportForm.engGivenName}
                          onChange={(e) => setPassportForm({ ...passportForm, engGivenName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Gildong"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">영문 성 (Surname) *</label>
                        <input
                          type="text"
                          value={passportForm.engSurname}
                          onChange={(e) => setPassportForm({ ...passportForm, engSurname: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="HONG"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">여권번호 *</label>
                        <input
                          type="text"
                          value={passportForm.passportNo}
                          onChange={(e) => setPassportForm({ ...passportForm, passportNo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="M12345678"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">성별 *</label>
                        <select
                          value={passportForm.sex}
                          onChange={(e) => setPassportForm({ ...passportForm, sex: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">선택</option>
                          <option value="M">남성 (M)</option>
                          <option value="F">여성 (F)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">생년월일 *</label>
                        <input
                          type="date"
                          value={passportForm.birthDate}
                          onChange={(e) => setPassportForm({ ...passportForm, birthDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">여권 발급일</label>
                        <input
                          type="date"
                          value={passportForm.issueDate}
                          onChange={(e) => setPassportForm({ ...passportForm, issueDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">만료일 *</label>
                        <input
                          type="date"
                          value={passportForm.expiryDate}
                          onChange={(e) => setPassportForm({ ...passportForm, expiryDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={async () => {
                          // 여권 스캔 필수 체크
                          if (!passportScanned) {
                            alert('⚠️ 여권 이미지를 먼저 스캔해주세요. 수동 여권 등록은 반드시 여권 스캔이 필요합니다.');
                            return;
                          }

                          // 여권 등록 API 호출
                          try {
                            const response = await fetch(`/api/admin/customers/${customerId}/passport`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify(passportForm),
                            });
                            const data = await response.json();
                            if (data.ok) {
                              alert('✅ 여권 정보가 등록되었습니다.');
                              setShowPassportForm(false);
                              setPassportForm({
                                korName: '',
                                engGivenName: '',
                                engSurname: '',
                                passportNo: '',
                                sex: '',
                                birthDate: '',
                                issueDate: '',
                                expiryDate: '',
                                reservationId: null,
                              });
                              setPassportScanned(false);
                              loadCustomerDetail(); // 정보 다시 로드
                            } else {
                              alert(data.error || '여권 등록에 실패했습니다.');
                            }
                          } catch (err) {
                            console.error('[CustomerDetailModal] Passport registration error:', err);
                            alert('여권 등록 중 오류가 발생했습니다.');
                          }
                        }}
                        disabled={!passportScanned}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${passportScanned
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                      >
                        <FiSave size={16} />
                        저장 {!passportScanned && '(여권 스캔 필수)'}
                      </button>
                      <button
                        onClick={() => {
                          setShowPassportForm(false);
                          setPassportForm({
                            korName: '',
                            engGivenName: '',
                            engSurname: '',
                            passportNo: '',
                            sex: '',
                            birthDate: '',
                            issueDate: '',
                            expiryDate: '',
                            reservationId: null,
                          });
                          setPassportScanned(false);
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

