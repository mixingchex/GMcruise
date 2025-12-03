'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiSend,
  FiMessageSquare,
  FiLink,
  FiX,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiCalendar,
  FiPhone,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

type PartnerInfo = {
  profileId: number;
  type: 'BRANCH_MANAGER' | 'SALES_AGENT' | 'HQ';
  displayName: string | null;
  branchLabel: string | null;
  mallUserId: string;
  shareLinks: {
    mall: string;
    tracked: string;
    landing: string | null;
  };
  manager: {
    label: string | null;
    affiliateCode: string | null;
    branchLabel: string | null;
    mallUserId: string | null;
  } | null;
  teamAgents: Array<{
    id: number;
    displayName: string | null;
    affiliateCode: string | null;
    mallUserId: string | null;
  }>;
};

type Reservation = {
  id: number;
  totalPeople: number;
  pnrStatus: string;
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  trip: {
    id: number;
    departureDate: string | null;
    product: {
      cruiseLine: string | null;
      shipName: string | null;
      packageName: string | null;
    } | null;
  } | null;
};

type PurchasedCustomersClientProps = {
  partner: PartnerInfo;
};

export default function PurchasedCustomersClient({ partner }: PurchasedCustomersClientProps) {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.partnerId as string;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [passportMessage, setPassportMessage] = useState('');
  const [passportPhone, setPassportPhone] = useState('');
  const [sendingPassport, setSendingPassport] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'iphone' | 'samsung' | null>(null);
  const [showChatbotModal, setShowChatbotModal] = useState(false);
  const [chatbotLink, setChatbotLink] = useState('');
  const [chatbotMessage, setChatbotMessage] = useState('');
  const [sendingChatbot, setSendingChatbot] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [reservationDetail, setReservationDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/partner/reservations`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setReservations(data.reservations || []);
      } else {
        showError(data.message || '예약 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('예약 목록 로드 실패:', error);
      showError('예약 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPassportModal = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    const passportUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/customer/passport/${reservation.id}`;
    const customerName = reservation.user?.name || '고객';
    const defaultMessage = `안녕하세요 ${customerName}님. 여권 정보를 등록해주시기 바랍니다. 아래 링크를 클릭해주세요.\n\n${passportUrl}`;
    setPassportMessage(defaultMessage);
    setPassportPhone(reservation.user?.phone || '');
    setShowPassportModal(true);
  };

  const handleSendPassportMessage = async () => {
    if (!passportPhone || !passportMessage.trim() || !selectedReservation) {
      showError('전화번호와 메시지를 입력해주세요.');
      return;
    }

    try {
      setSendingPassport(true);
      const response = await fetch('/api/partner/customers/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: passportPhone.replace(/[^0-9]/g, ''),
          message: passportMessage,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || '문자 발송에 실패했습니다.');
      }

      showSuccess('여권 등록 링크가 발송되었습니다.');
      setShowPassportModal(false);
      setPreviewDevice(null);
    } catch (error: any) {
      console.error('여권 메시지 발송 오류:', error);
      showError(error.message || '문자 발송 중 오류가 발생했습니다.');
    } finally {
      setSendingPassport(false);
    }
  };

  const handleCopyPassportLink = async () => {
    if (!selectedReservation) return;
    const passportUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/customer/passport/${selectedReservation.id}`;
    try {
      await navigator.clipboard.writeText(passportUrl);
      showSuccess('링크가 복사되었습니다.');
    } catch (error) {
      showError('링크 복사에 실패했습니다.');
    }
  };

  const handleOpenChatbotModal = async (reservation: Reservation) => {
    setSelectedReservation(reservation);

    // 여권 챗봇 플로우 확인 및 생성
    try {
      // 먼저 기존 플로우 확인
      const checkResponse = await fetch('/api/admin/chat-bot/flows', {
        credentials: 'include',
      });
      const checkData = await checkResponse.json();

      let passportFlow = null;
      if (checkData.ok && Array.isArray(checkData.flows)) {
        passportFlow = checkData.flows.find((f: any) => f.name === '여권 등록 챗봇');
      }

      // 플로우가 없으면 생성
      if (!passportFlow) {
        const createResponse = await fetch('/api/admin/chat-bot/create-passport-flow', {
          method: 'POST',
          credentials: 'include',
        });
        const createData = await createResponse.json();

        if (createData.ok && createData.shareToken) {
          passportFlow = { shareToken: createData.shareToken };
        } else {
          showError('여권 챗봇 플로우를 생성할 수 없습니다.');
          return;
        }
      }

      // 챗봇 링크 생성
      const chatbotUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/chat-bot/share/${passportFlow.shareToken || passportFlow.shareToken}`;
      setChatbotLink(chatbotUrl);

      const customerName = reservation.user?.name || '고객';
      const defaultMessage = `안녕하세요 ${customerName}님. 여권 등록을 도와드리는 챗봇입니다. 아래 링크를 클릭하여 여권 이미지를 업로드해주세요.\n\n${chatbotUrl}`;
      setChatbotMessage(defaultMessage);
      setShowChatbotModal(true);
    } catch (error) {
      console.error('챗봇 모달 열기 오류:', error);
      showError('챗봇 링크를 생성하는 중 오류가 발생했습니다.');
    }
  };

  const handleSendChatbotMessage = async () => {
    if (!chatbotMessage.trim() || !selectedReservation) {
      showError('메시지를 입력해주세요.');
      return;
    }

    try {
      setSendingChatbot(true);
      const response = await fetch('/api/partner/customers/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: (selectedReservation.user?.phone || '').replace(/[^0-9]/g, ''),
          message: chatbotMessage,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || '문자 발송에 실패했습니다.');
      }

      showSuccess('여권 챗봇 링크가 발송되었습니다.');
      setShowChatbotModal(false);
      setPreviewDevice(null);
    } catch (error: any) {
      console.error('챗봇 메시지 발송 오류:', error);
      showError(error.message || '문자 발송 중 오류가 발생했습니다.');
    } finally {
      setSendingChatbot(false);
    }
  };

  const handleCopyChatbotLink = async () => {
    try {
      await navigator.clipboard.writeText(chatbotLink);
      showSuccess('챗봇 링크가 복사되었습니다.');
    } catch (error) {
      showError('링크 복사에 실패했습니다.');
    }
  };

  const handleOpenDetailModal = async (reservation: Reservation) => {
    try {
      setLoadingDetail(true);
      setSelectedReservation(reservation);
      const response = await fetch(`/api/partner/reservations/${reservation.id}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setReservationDetail(data.reservation);
        setShowDetailModal(true);
      } else {
        showError(data.error || '예약 상세 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('예약 상세 정보 로드 실패:', error);
      showError('예약 상세 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredReservations = reservations.filter((reservation) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      reservation.user?.name?.toLowerCase().includes(search) ||
      reservation.user?.phone?.includes(search) ||
      reservation.user?.email?.toLowerCase().includes(search) ||
      reservation.trip?.product?.packageName?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/partner/${partnerId}/dashboard`)}
            className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft />
            <span>대시보드로 돌아가기</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">구매고객관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            예약한 고객들의 정보를 관리하고 여권 등록 링크를 발송할 수 있습니다.
          </p>
        </div>

        {/* 검색 */}
        <div className="mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="고객명, 전화번호, 이메일, 상품명으로 검색..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* 예약 목록 */}
        {loading ? (
          <div className="flex items-center justify-center rounded-lg bg-white p-12 shadow">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="text-gray-600">예약 목록을 불러오는 중...</p>
            </div>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-600">예약 정보가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {reservation.user?.name || '이름 없음'}
                      </h3>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                        {reservation.pnrStatus || '예약'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FiPhone className="text-gray-400" />
                        <span>{reservation.user?.phone || '전화번호 없음'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiUser className="text-gray-400" />
                        <span>{reservation.user?.email || '이메일 없음'}</span>
                      </div>
                      {reservation.trip && (
                        <div className="flex items-center gap-2">
                          <FiCalendar className="text-gray-400" />
                          <span>
                            {reservation.trip.product?.cruiseLine} {reservation.trip.product?.shipName}
                            {reservation.trip.departureDate && (
                              <> • {new Date(reservation.trip.departureDate).toLocaleDateString('ko-KR')}</>
                            )}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        총 {reservation.totalPeople}명 • 예약일: {new Date(reservation.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={() => handleOpenDetailModal(reservation)}
                      className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
                    >
                      <FiUser />
                      <span>상세정보 (APIS)</span>
                    </button>
                    <button
                      onClick={() => handleOpenPassportModal(reservation)}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                      <FiSend />
                      <span>여권 보내기</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 여권 보내기 모달 */}
        {showPassportModal && selectedReservation && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPassportModal(false);
                setPreviewDevice(null);
              }
            }}
          >
            <div
              className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                <h3 className="text-xl font-bold text-gray-900">여권 보내기</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowPassportModal(false);
                    setPreviewDevice(null);
                  }}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              {/* 내용 */}
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 왼쪽: 메시지 입력 */}
                  <div className="space-y-4">
                    <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-1">고객 정보</p>
                      <p className="text-sm text-blue-800">{selectedReservation.user?.name || '이름 없음'}</p>
                      <p className="text-sm text-blue-800">{selectedReservation.user?.phone || '전화번호 없음'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        전화번호 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={passportPhone}
                        onChange={(e) => setPassportPhone(e.target.value)}
                        placeholder="010-1234-5678"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        메시지 내용 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={passportMessage}
                        onChange={(e) => setPassportMessage(e.target.value)}
                        rows={10}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="여권 등록 링크가 포함된 메시지를 입력하세요."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopyPassportLink}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <FiLink />
                        <span>링크 복사</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('iphone')}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <span>📱</span>
                        <span>아이폰 미리보기</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('samsung')}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <span>📱</span>
                        <span>삼성 미리보기</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendPassportMessage}
                      disabled={sendingPassport || !passportPhone || !passportMessage.trim()}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {sendingPassport ? (
                        <>
                          <FiRefreshCw className="animate-spin" />
                          <span>발송 중...</span>
                        </>
                      ) : (
                        <>
                          <FiSend />
                          <span>문자 보내기</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 오른쪽: 스마트폰 미리보기 */}
                  <div className="flex items-center justify-center">
                    {previewDevice ? (
                      <div className={`relative ${previewDevice === 'iphone' ? 'w-[375px]' : 'w-[360px]'}`}>
                        {/* 스마트폰 프레임 */}
                        <div className={`relative ${previewDevice === 'iphone' ? 'bg-black rounded-[3rem] p-2' : 'bg-gray-800 rounded-[2.5rem] p-1.5'}`}>
                          {/* 노치 (아이폰만) */}
                          {previewDevice === 'iphone' && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[30px] bg-black rounded-b-[1.5rem] z-10"></div>
                          )}

                          {/* 화면 */}
                          <div className={`bg-white ${previewDevice === 'iphone' ? 'rounded-[2.5rem]' : 'rounded-[2rem]'} overflow-hidden`}>
                            {/* 상태바 */}
                            <div className={`${previewDevice === 'iphone' ? 'h-11 pt-2' : 'h-8 pt-1'} bg-white flex items-center justify-between px-4 text-xs font-semibold`}>
                              <span>9:41</span>
                              <div className="flex items-center gap-1">
                                <span>📶</span>
                                <span>📶</span>
                                <span>🔋</span>
                              </div>
                            </div>

                            {/* 메시지 내용 */}
                            <div className="h-[600px] bg-gray-50 p-4 overflow-y-auto">
                              <div className="space-y-3">
                                {/* 받은 메시지 */}
                                <div className="flex justify-start">
                                  <div className="max-w-[80%] rounded-2xl bg-white border border-gray-200 px-4 py-3 shadow-sm">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                                      {passportMessage || '메시지 내용을 입력하세요.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 min-h-[400px]">
                        <div className="text-center text-gray-500">
                          <p className="text-lg mb-2">📱</p>
                          <p className="text-sm">미리보기 버튼을 클릭하면</p>
                          <p className="text-sm">스마트폰 화면을 확인할 수 있습니다</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 여권 챗봇 보내기 모달 */}
        {showChatbotModal && selectedReservation && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowChatbotModal(false);
                setPreviewDevice(null);
              }
            }}
          >
            <div
              className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                <h3 className="text-xl font-bold text-gray-900">여권채팅봇 보내기</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowChatbotModal(false);
                    setPreviewDevice(null);
                  }}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              {/* 내용 */}
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 왼쪽: 메시지 입력 */}
                  <div className="space-y-4">
                    <div className="rounded-xl bg-green-50 p-4 border border-green-200">
                      <p className="text-sm font-semibold text-green-900 mb-1">고객 정보</p>
                      <p className="text-sm text-green-800">{selectedReservation.user?.name || '이름 없음'}</p>
                      <p className="text-sm text-green-800">{selectedReservation.user?.phone || '전화번호 없음'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        챗봇 링크
                      </label>
                      <div className="mb-3 rounded-lg bg-white border border-green-300 p-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">링크 URL</p>
                        <p className="text-xs text-gray-900 break-all font-mono">
                          {chatbotLink}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        메시지 내용 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={chatbotMessage}
                        onChange={(e) => setChatbotMessage(e.target.value)}
                        rows={10}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                        placeholder="여권 챗봇 링크가 포함된 메시지를 입력하세요."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopyChatbotLink}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <FiLink />
                        <span>링크 복사</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('iphone')}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <span>📱</span>
                        <span>아이폰 미리보기</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('samsung')}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <span>📱</span>
                        <span>삼성 미리보기</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendChatbotMessage}
                      disabled={sendingChatbot || !chatbotMessage.trim()}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {sendingChatbot ? (
                        <>
                          <FiRefreshCw className="animate-spin" />
                          <span>발송 중...</span>
                        </>
                      ) : (
                        <>
                          <FiSend />
                          <span>문자 보내기</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 오른쪽: 스마트폰 미리보기 */}
                  <div className="flex items-center justify-center">
                    {previewDevice ? (
                      <div className={`relative ${previewDevice === 'iphone' ? 'w-[375px]' : 'w-[360px]'}`}>
                        {/* 스마트폰 프레임 */}
                        <div className={`relative ${previewDevice === 'iphone' ? 'bg-black rounded-[3rem] p-2' : 'bg-gray-800 rounded-[2.5rem] p-1.5'}`}>
                          {/* 노치 (아이폰만) */}
                          {previewDevice === 'iphone' && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[30px] bg-black rounded-b-[1.5rem] z-10"></div>
                          )}

                          {/* 화면 */}
                          <div className={`bg-white ${previewDevice === 'iphone' ? 'rounded-[2.5rem]' : 'rounded-[2rem]'} overflow-hidden`}>
                            {/* 상태바 */}
                            <div className={`${previewDevice === 'iphone' ? 'h-11 pt-2' : 'h-8 pt-1'} bg-white flex items-center justify-between px-4 text-xs font-semibold`}>
                              <span>9:41</span>
                              <div className="flex items-center gap-1">
                                <span>📶</span>
                                <span>📶</span>
                                <span>🔋</span>
                              </div>
                            </div>

                            {/* 메시지 내용 */}
                            <div className="h-[600px] bg-gray-50 p-4 overflow-y-auto">
                              <div className="space-y-3">
                                {/* 받은 메시지 */}
                                <div className="flex justify-start">
                                  <div className="max-w-[80%] rounded-2xl bg-white border border-gray-200 px-4 py-3 shadow-sm">
                                    <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                                      {chatbotMessage || '메시지 내용을 입력하세요.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 min-h-[400px]">
                        <div className="text-center text-gray-500">
                          <p className="text-lg mb-2">📱</p>
                          <p className="text-sm">미리보기 버튼을 클릭하면</p>
                          <p className="text-sm">스마트폰 화면을 확인할 수 있습니다</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 상세정보 (APIS) 모달 */}
        {showDetailModal && reservationDetail && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDetailModal(false);
                setReservationDetail(null);
              }
            }}
          >
            <div
              className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                <h3 className="text-xl font-bold text-gray-900">구매고객 상세정보 (APIS)</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    setReservationDetail(null);
                  }}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              {/* 내용 */}
              <div className="px-6 py-6">
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 고객 정보 */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h4 className="mb-3 text-lg font-semibold text-gray-900">고객 정보</h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-gray-500">이름</p>
                          <p className="text-base text-gray-900">{reservationDetail.user?.name || '미입력'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">전화번호</p>
                          <p className="text-base text-gray-900">{reservationDetail.user?.phone || '미입력'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">이메일</p>
                          <p className="text-base text-gray-900">{reservationDetail.user?.email || '미입력'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">PNR 상태</p>
                          <p className="text-base text-gray-900">{reservationDetail.pnrStatus || '미입력'}</p>
                        </div>
                      </div>
                    </div>

                    {/* 상품 정보 */}
                    {reservationDetail.trip?.product && (
                      <div className="rounded-lg border border-gray-200 bg-blue-50 p-4">
                        <h4 className="mb-3 text-lg font-semibold text-gray-900">구매 상품 정보</h4>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-sm font-medium text-gray-500">크루즈 라인</p>
                            <p className="text-base text-gray-900">{reservationDetail.trip.product.cruiseLine || '미입력'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">선박명</p>
                            <p className="text-base text-gray-900">{reservationDetail.trip.product.shipName || '미입력'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">패키지명</p>
                            <p className="text-base text-gray-900">{reservationDetail.trip.product.packageName || '미입력'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">상품 코드</p>
                            <p className="text-base text-gray-900">{reservationDetail.trip.product.productCode || '미입력'}</p>
                          </div>
                          {reservationDetail.trip.departureDate && (
                            <div>
                              <p className="text-sm font-medium text-gray-500">출발일</p>
                              <p className="text-base text-gray-900">
                                {new Date(reservationDetail.trip.departureDate).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-500">총 인원</p>
                            <p className="text-base text-gray-900">{reservationDetail.totalPeople}명</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 여행자 정보 (APIS) */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <h4 className="mb-3 text-lg font-semibold text-gray-900">여행자 정보 (APIS)</h4>
                      {reservationDetail.travelers && reservationDetail.travelers.length > 0 ? (
                        <div className="space-y-4">
                          {reservationDetail.travelers.map((traveler: any, index: number) => (
                            <div key={traveler.id || index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <h5 className="font-semibold text-gray-900">
                                  {index === 0 ? '대표자' : `동행자 ${index}`}
                                  {traveler.roomNumber && (
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                      (방 {traveler.roomNumber})
                                    </span>
                                  )}
                                </h5>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <p className="text-sm font-medium text-gray-500">한글 성명</p>
                                  <p className="text-base text-gray-900">{traveler.korName || '미입력'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">영문 이름</p>
                                  <p className="text-base text-gray-900">
                                    {traveler.engSurname && traveler.engGivenName
                                      ? `${traveler.engSurname} ${traveler.engGivenName}`
                                      : '미입력'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">여권번호</p>
                                  <p className="text-base text-gray-900">
                                    {/* 본사(HQ)만 여권번호 전체 표시, 판매원/대리점장은 마스킹 처리 */}
                                    {partner.type === 'HQ'
                                      ? (traveler.passportNo || '미입력')
                                      : (traveler.passportNo ? traveler.passportNo.replace(/.(?=.{4})/g, '*') : '미입력')}
                                  </p>
                                  {/* 본사(HQ)만 여권 이미지 확인 가능 */}
                                  {traveler.passportImage && partner.type === 'HQ' && (
                                    <div className="mt-2 flex gap-2">
                                      <button
                                        onClick={() => {
                                          const img = new Image();
                                          img.src = traveler.passportImage;
                                          const w = window.open();
                                          if (w) {
                                            w.document.write(`<img src="${traveler.passportImage}" style="max-width: 100%; height: auto;" />`);
                                          }
                                        }}
                                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                      >
                                        이미지 보기
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">생년월일</p>
                                  <p className="text-base text-gray-900">{traveler.dateOfBirth || '미입력'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">여권 만료일</p>
                                  <p className="text-base text-gray-900">{traveler.passportExpiryDate || '미입력'}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">국적</p>
                                  <p className="text-base text-gray-900">{traveler.nationality || '미입력'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">여행자 정보가 없습니다.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 하단 버튼 */}
              <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    setReservationDetail(null);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('PNR 데이터를 전송하시겠습니까?')) return;
                    try {
                      const res = await fetch(`/api/partner/reservations/${reservationDetail.id}/sync-apis`, {
                        method: 'POST',
                      });
                      const data = await res.json();
                      if (data.ok) {
                        alert('PNR 데이터 전송이 요청되었습니다.');
                      } else {
                        alert(data.error || '전송 실패');
                      }
                    } catch (e) {
                      alert('전송 중 오류가 발생했습니다.');
                    }
                  }}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                >
                  PNR 전송
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

