'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiExternalLink,
  FiSend,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiEdit,
  FiSave,
  FiMail,
  FiCalendar,
  FiFilter,
  FiCopy,
  FiMessageSquare,
  FiDollarSign,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';
import { csrfFetch } from '@/lib/csrf-client';

type Traveler = {
  id: number;
  korName: string | null;
  engSurname: string | null;
  engGivenName: string | null;
  passportNo: string | null;
  nationality: string | null;
  birthDate: string | null;
  issueDate: string | null;   // 여권생성일
  expiryDate: string | null;
  gender: string | null;
  residentNum: string | null; // 주민번호
  roomNumber: number | null;
  hasPassportImage: boolean;
  notes: string | null;       // 비고
};

type Payment = {
  id: number;
  orderId: string;
  amount: number;
  status: string;
  paidAt: string | null;
  cancelledAt: string | null;
  pgTransactionId: string | null;
  buyerName: string;
  buyerTel: string;
  payMethod: string | null;
};

type AffiliateInfo = {
  id: number;
  displayName: string | null;
  type: string | null;
};

type LinkInfo = {
  id: number;
  code: string;
  title: string | null;
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
    spreadsheetId: string | null;
    shipName: string | null;
    googleFolderId: string | null;
    product: {
      cruiseLine: string | null;
      shipName: string | null;
      packageName: string | null;
    } | null;
  } | null;
  travelers?: Traveler[];
  // 판매원 정보
  agent?: AffiliateInfo | null;
  // 대리점장 정보
  manager?: AffiliateInfo | null;
  // 판매 채널 정보
  salesChannel?: string;
  salesChannelDetail?: string;
  // 판매 링크 정보
  link?: LinkInfo | null;
  passportSubmission?: {
    id: number;
    token: string;
    isSubmitted: boolean;
    submittedAt: string | null;
  } | null;
  // 결제 정보 추가
  payment?: Payment | null;
  saleStatus?: string | null;
  saleRefundedAt?: string | null;
  saleDate?: string | null;
};

const APIS_TEMPLATE_URL = 'https://docs.google.com/spreadsheets/d/1Le6IPNzyvMqpn-6ZnqgvH0JTQ8O5rKymWMU_pkfbQ5Q/edit?gid=0#gid=0';
const APIS_FOLDER_URL = 'https://drive.google.com/drive/folders/185t2eIIPDsEm-QW9KmhTbxkrywFJhGdk';

export default function AdminPurchasedCustomersPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [syncingApis, setSyncingApis] = useState<number | null>(null);
  const [sendingPassportRequest, setSendingPassportRequest] = useState<number | null>(null);
  const [editingTraveler, setEditingTraveler] = useState<number | null>(null);
  const [travelerForm, setTravelerForm] = useState<Partial<Traveler>>({});
  const [savingTraveler, setSavingTraveler] = useState(false);

  // PNR 전송 모달
  const [showPnrModal, setShowPnrModal] = useState(false);
  const [pnrReservation, setPnrReservation] = useState<Reservation | null>(null);
  const [pnrLink, setPnrLink] = useState<string>('');
  const [pnrMessage, setPnrMessage] = useState<string>('');
  const [loadingPnr, setLoadingPnr] = useState(false);
  const [sendingPnr, setSendingPnr] = useState(false);

  // 월별 필터링
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // 형식: "2025-01"
  const [filterType, setFilterType] = useState<'departure' | 'created'>('departure'); // 출발일 or 예약일 기준

  // 환불 모달
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReservation, setRefundReservation] = useState<Reservation | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  // 여행계약서 모달
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractReservation, setContractReservation] = useState<Reservation | null>(null);
  const [contractResult, setContractResult] = useState<{ signUrl: string; emailSent: boolean; message: string } | null>(null);
  const [sendingContract, setSendingContract] = useState(false);
  const [contractAlreadySigned, setContractAlreadySigned] = useState(false);
  const [resendReason, setResendReason] = useState('');
  const [resettingContract, setResettingContract] = useState(false);

  const loadReservations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/purchased-customers', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setReservations(data.reservations || []);
      } else {
        showError(data.error || '예약 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('예약 목록 로드 실패:', error);
      showError('예약 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const handleOpenDetailModal = async (reservation: Reservation) => {
    try {
      setLoadingDetail(true);
      setSelectedReservation(reservation);
      const response = await fetch(`/api/admin/purchased-customers/${reservation.id}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setSelectedReservation(data.reservation);
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

  // PNR 전송 모달 열기
  const handleOpenPnrModal = async (reservation: Reservation) => {
    try {
      setLoadingPnr(true);
      setPnrReservation(reservation);
      setShowPnrModal(true);

      // PNR 링크 및 메시지 가져오기
      const response = await fetch(`/api/admin/pnr-request/send?reservationId=${reservation.id}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.ok) {
        setPnrLink(data.link);
        setPnrMessage(data.message);
      } else {
        showError(data.message || 'PNR 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('PNR 정보 로드 실패:', error);
      showError('PNR 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoadingPnr(false);
    }
  };

  // PNR 링크 복사
  const handleCopyPnrLink = async () => {
    try {
      await navigator.clipboard.writeText(pnrLink);
      showSuccess('PNR 링크가 클립보드에 복사되었습니다.');
    } catch (error) {
      showError('링크 복사에 실패했습니다.');
    }
  };

  // PNR 메시지 전체 복사
  const handleCopyPnrMessage = async () => {
    try {
      await navigator.clipboard.writeText(pnrMessage);
      showSuccess('PNR 메시지가 클립보드에 복사되었습니다.');
    } catch (error) {
      showError('메시지 복사에 실패했습니다.');
    }
  };

  // PNR 문자 발송
  const handleSendPnrSms = async () => {
    if (!pnrReservation) return;

    if (!confirm(`${pnrReservation.user?.name || '고객'}님에게 PNR 입력 요청 문자를 발송하시겠습니까?`)) return;

    try {
      setSendingPnr(true);
      const response = await fetch('/api/admin/pnr-request/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reservationId: pnrReservation.id,
          messageBody: pnrMessage,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        showSuccess('PNR 요청 문자가 발송되었습니다.');
        setShowPnrModal(false);
        loadReservations();
      } else {
        showError(data.result?.error || data.message || 'PNR 문자 발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('PNR 문자 발송 실패:', error);
      showError('PNR 문자 발송 중 오류가 발생했습니다.');
    } finally {
      setSendingPnr(false);
    }
  };

  // 여행계약서 발송 모달 열기 + 계약서 생성/갱신 요청
  const handleOpenContractModal = async (reservation: Reservation) => {
    setContractReservation(reservation);
    setContractResult(null);
    setContractAlreadySigned(false);
    setResendReason('');
    setShowContractModal(true);
    setSendingContract(true);
    try {
      // 현재 계약서 상태 먼저 확인
      const checkRes = await csrfFetch(`/api/admin/travel-contracts/${reservation.id}`, { method: 'GET' });
      if (!checkRes.ok) {
        throw new Error(`계약서 상태 확인 실패 (${checkRes.status})`);
      }
      const checkData = await checkRes.json();

      if (checkData.ok && checkData.contract?.status === 'signed') {
        // 이미 서명된 계약서 → 재발송 UI 표시
        setContractAlreadySigned(true);
        setSendingContract(false);
        return;
      }

      // 서명 전이거나 계약서 없음 → 계약서 생성/갱신 및 이메일 발송
      const res = await csrfFetch(`/api/admin/travel-contracts/${reservation.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setContractResult({ signUrl: data.signUrl, emailSent: data.emailSent, message: data.message });
      } else {
        showError(data.error || '계약서 생성에 실패했습니다.');
        setShowContractModal(false);
        setContractReservation(null);
        setContractResult(null);
      }
    } catch {
      showError('계약서 생성 중 오류가 발생했습니다.');
      setShowContractModal(false);
      setContractReservation(null);
      setContractResult(null);
      setContractAlreadySigned(false);
    } finally {
      setSendingContract(false);
    }
  };

  // 서명 취소 후 재발송
  const handleResetAndResend = async () => {
    if (!contractReservation) return;
    setResettingContract(true);
    try {
      const resetRes = await csrfFetch(`/api/admin/travel-contracts/${contractReservation.id}`, {
        method: 'PUT',
        body: JSON.stringify({ reason: resendReason.trim() || undefined }),
      });
      const resetData = await resetRes.json();
      if (!resetData.ok) {
        showError(resetData.error || '계약서 취소에 실패했습니다.');
        return;
      }

      setContractAlreadySigned(false);
      setSendingContract(true);

      const res = await csrfFetch(`/api/admin/travel-contracts/${contractReservation.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setContractResult({ signUrl: data.signUrl, emailSent: data.emailSent, message: data.message });
      } else {
        showError(data.error || '계약서 재발송에 실패했습니다.');
        setShowContractModal(false);
        setContractReservation(null);
        setContractResult(null);
      }
    } catch {
      showError('계약서 재발송 중 오류가 발생했습니다.');
      setShowContractModal(false);
      setContractReservation(null);
      setContractResult(null);
      setContractAlreadySigned(false);
    } finally {
      setResettingContract(false);
      setSendingContract(false);
    }
  };

  // 서명 링크 복사
  const handleCopyContractLink = async () => {
    if (!contractResult?.signUrl) return;
    try {
      await navigator.clipboard.writeText(contractResult.signUrl);
      showSuccess('서명 링크가 복사되었습니다.');
    } catch {
      showError('링크 복사에 실패했습니다.');
    }
  };

  // 카카오톡 메시지 복사
  const handleCopyKakaoMessage = async () => {
    if (!contractResult?.signUrl || !contractReservation) return;
    const customerName = contractReservation.user?.name || '고객';
    const productName = contractReservation.trip?.product?.packageName || '상품';
    const message = `[크루즈닷] 여행계약서 서명 요청

안녕하세요, ${customerName}님!
${productName} 여행계약서 서명을 요청드립니다.

아래 링크에서 내용 확인 후 서명해주세요:
${contractResult.signUrl}

문의: 크루즈닷 010-3289-3800`;
    try {
      await navigator.clipboard.writeText(message);
      showSuccess('카카오톡 메시지가 복사되었습니다. 카카오톡에 붙여넣기 하세요!');
    } catch {
      showError('메시지 복사에 실패했습니다.');
    }
  };

  // 환불 모달 열기
  const handleOpenRefundModal = (reservation: Reservation) => {
    if (!reservation.payment) {
      showError('결제 정보가 없습니다.');
      return;
    }
    if (reservation.payment.status === 'cancelled' || reservation.payment.cancelledAt) {
      showError('이미 환불된 결제입니다.');
      return;
    }
    if (reservation.payment.status !== 'paid') {
      showError(`결제 상태가 '${reservation.payment.status}'입니다.`);
      return;
    }
    setRefundReservation(reservation);
    setRefundReason('');
    setShowRefundModal(true);
  };

  // 환불 처리
  const handleRefund = async () => {
    if (!refundReservation?.payment) return;

    if (!confirm(`정말 ${refundReservation.user?.name || '고객'}님의 결제(${refundReservation.payment.amount.toLocaleString()}원)를 환불하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      setProcessingRefund(true);
      const response = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          paymentId: refundReservation.payment.id,
          reason: refundReason || '관리자 환불 처리',
        }),
      });

      const data = await response.json();

      if (data.ok) {
        showSuccess(`환불이 완료되었습니다. (${refundReservation.payment.amount.toLocaleString()}원)`);
        setShowRefundModal(false);
        setRefundReservation(null);
        loadReservations();
      } else {
        showError(data.error || '환불 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('환불 처리 실패:', error);
      showError('환불 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleSyncApis = async (reservationId: number) => {
    if (!confirm('APIS 데이터를 Google Sheets에 동기화하시겠습니까?')) return;

    try {
      setSyncingApis(reservationId);
      const response = await fetch(`/api/partner/reservations/${reservationId}/sync-apis`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        showSuccess('APIS 데이터가 동기화되었습니다.');
        loadReservations();
        // 모달이 열려있으면 새로고침
        if (showDetailModal && selectedReservation?.id === reservationId) {
          handleOpenDetailModal(selectedReservation);
        }
      } else {
        showError(data.error || 'APIS 동기화에 실패했습니다.');
      }
    } catch (error) {
      console.error('APIS 동기화 실패:', error);
      showError('APIS 동기화 중 오류가 발생했습니다.');
    } finally {
      setSyncingApis(null);
    }
  };

  const handleSendPassportRequest = async (reservation: Reservation) => {
    if (!reservation.user?.phone) {
      showError('고객 전화번호가 없습니다.');
      return;
    }
    if (!confirm(`${reservation.user.name || '고객'}님에게 여권 등록 요청을 보내시겠습니까?`)) return;

    try {
      setSendingPassportRequest(reservation.id);
      const response = await fetch('/api/admin/passport-request/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userIds: [reservation.user.id],
        }),
      });
      const data = await response.json();
      if (data.ok) {
        showSuccess('여권 등록 요청이 발송되었습니다.');
        loadReservations();
      } else {
        showError(data.error || '여권 요청 발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('여권 요청 발송 실패:', error);
      showError('여권 요청 발송 중 오류가 발생했습니다.');
    } finally {
      setSendingPassportRequest(null);
    }
  };

  const handleEditTraveler = (traveler: Traveler) => {
    setEditingTraveler(traveler.id);
    setTravelerForm({
      korName: traveler.korName || '',
      engSurname: traveler.engSurname || '',
      engGivenName: traveler.engGivenName || '',
      passportNo: traveler.passportNo || '',
      nationality: traveler.nationality || '',
      birthDate: traveler.birthDate || '',
      issueDate: traveler.issueDate || '',    // 여권생성일
      expiryDate: traveler.expiryDate || '',
      gender: traveler.gender || '',
      residentNum: traveler.residentNum || '', // 주민번호
      roomNumber: traveler.roomNumber || null, // 객실 번호
      notes: traveler.notes || '',             // 비고
    });
  };

  // 여행자 추가
  const [addingTraveler, setAddingTraveler] = useState(false);
  const handleAddTraveler = async () => {
    if (!selectedReservation) return;

    try {
      setAddingTraveler(true);
      const response = await fetch(`/api/admin/travelers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reservationId: selectedReservation.id,
          korName: '',
          roomNumber: 1,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        showSuccess('여행자가 추가되었습니다.');
        // 상세 모달 새로고침
        handleOpenDetailModal(selectedReservation);
      } else {
        showError(data.error || '여행자 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('여행자 추가 실패:', error);
      showError('여행자 추가 중 오류가 발생했습니다.');
    } finally {
      setAddingTraveler(false);
    }
  };

  // 여행자 삭제
  const [deletingTraveler, setDeletingTraveler] = useState<number | null>(null);
  const handleDeleteTraveler = async (travelerId: number) => {
    if (!confirm('정말 이 여행자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      setDeletingTraveler(travelerId);
      const response = await fetch(`/api/admin/travelers/${travelerId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        showSuccess('여행자가 삭제되었습니다.');
        // 상세 모달 새로고침
        if (selectedReservation) {
          handleOpenDetailModal(selectedReservation);
        }
      } else {
        showError(data.error || '여행자 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('여행자 삭제 실패:', error);
      showError('여행자 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingTraveler(null);
    }
  };

  const handleSaveTraveler = async (travelerId: number) => {
    try {
      setSavingTraveler(true);
      const response = await fetch(`/api/admin/travelers/${travelerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(travelerForm),
      });
      const data = await response.json();
      if (data.ok) {
        showSuccess('여행자 정보가 저장되었습니다.');
        setEditingTraveler(null);
        // 상세 모달 새로고침
        if (selectedReservation) {
          handleOpenDetailModal(selectedReservation);
        }
      } else {
        showError(data.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('여행자 정보 저장 실패:', error);
      showError('저장 중 오류가 발생했습니다.');
    } finally {
      setSavingTraveler(false);
    }
  };

  // APIS 완성도 계산 (필수 필드: 영문이름, 여권번호, 생년월일, 만료일)
  const getApisCompletionStatus = (travelers?: Traveler[]) => {
    if (!travelers || travelers.length === 0) return { complete: 0, total: 0, percentage: 0 };

    let complete = 0;
    for (const t of travelers) {
      const hasRequiredFields =
        t.engSurname && t.engGivenName &&
        t.passportNo &&
        t.birthDate &&
        t.expiryDate;
      if (hasRequiredFields) complete++;
    }

    return {
      complete,
      total: travelers.length,
      percentage: Math.round((complete / travelers.length) * 100),
    };
  };

  // 월별로 사용 가능한 옵션 생성
  const getAvailableMonths = () => {
    const months = new Set<string>();
    reservations.forEach((r) => {
      // 출발일 기준
      if (r.trip?.departureDate) {
        const date = new Date(r.trip.departureDate);
        months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      }
      // 예약일 기준
      if (r.createdAt) {
        const date = new Date(r.createdAt);
        months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return Array.from(months).sort().reverse(); // 최신순 정렬
  };

  const availableMonths = getAvailableMonths();

  const filteredReservations = reservations.filter((reservation) => {
    // 월별 필터링
    if (selectedMonth) {
      let dateToCheck: string | null = null;

      if (filterType === 'departure') {
        dateToCheck = reservation.trip?.departureDate || null;
      } else {
        dateToCheck = reservation.createdAt;
      }

      if (dateToCheck) {
        const date = new Date(dateToCheck);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthStr !== selectedMonth) return false;
      } else {
        return false; // 날짜가 없으면 필터에서 제외
      }
    }

    // 검색어 필터링
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      reservation.user?.name?.toLowerCase().includes(search) ||
      reservation.user?.phone?.includes(search) ||
      reservation.user?.email?.toLowerCase().includes(search) ||
      reservation.trip?.product?.packageName?.toLowerCase().includes(search) ||
      reservation.agent?.displayName?.toLowerCase().includes(search) ||
      reservation.salesChannel?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: reservations.length,
    withPassport: reservations.filter(r => {
      const status = getApisCompletionStatus(r.travelers);
      return status.percentage === 100;
    }).length,
    pendingPassport: reservations.filter(r => {
      const status = getApisCompletionStatus(r.travelers);
      return status.percentage < 100;
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <section className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
              <span className="text-4xl">🛒</span>
              구매 고객관리
            </h1>
            <p className="mt-2 text-base text-gray-600">
              구매 고객의 APIS 정보를 관리하고, 여권 요청을 보내고, Google Sheets와 동기화할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={APIS_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-semibold shadow-md hover:bg-purple-700 transition-colors"
            >
              <FiExternalLink />
              APIS 폴더
            </a>
            <a
              href={APIS_TEMPLATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white font-semibold shadow-md hover:bg-green-700 transition-colors"
            >
              <FiExternalLink />
              APIS 템플릿
            </a>
            <button
              onClick={loadReservations}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
          </div>
        </div>
      </section>

      {/* 통계 카드 */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-lg border-2 border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">전체 예약</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <FiUser className="text-4xl text-slate-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg border-2 border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-700 mb-1">APIS 완료</p>
              <p className="text-3xl font-bold text-green-900">{stats.withPassport}</p>
            </div>
            <FiCheckCircle className="text-4xl text-green-500" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl shadow-lg border-2 border-yellow-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-yellow-700 mb-1">APIS 대기</p>
              <p className="text-3xl font-bold text-yellow-900">{stats.pendingPassport}</p>
            </div>
            <FiAlertCircle className="text-4xl text-yellow-500" />
          </div>
        </div>
      </section>

      {/* 검색 및 월별 필터 */}
      <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 검색 */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="고객명, 전화번호, 이메일, 상품명, 판매원으로 검색..."
              className="w-full rounded-xl border-2 border-gray-200 pl-12 pr-4 py-3 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 월별 필터 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'departure' | 'created')}
                className="rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="departure">출발일 기준</option>
                <option value="created">예약일 기준</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <FiCalendar className="text-gray-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">전체 월</option>
                {availableMonths.map((month) => {
                  const [year, m] = month.split('-');
                  return (
                    <option key={month} value={month}>
                      {year}년 {parseInt(m)}월
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedMonth && (
              <button
                onClick={() => setSelectedMonth('')}
                className="rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
              >
                필터 초기화
              </button>
            )}
          </div>
        </div>

        {/* 필터 결과 표시 */}
        {(selectedMonth || searchTerm) && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <span>검색 결과:</span>
            <span className="font-semibold text-blue-600">{filteredReservations.length}건</span>
            {selectedMonth && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                {filterType === 'departure' ? '출발일' : '예약일'}: {selectedMonth.split('-')[0]}년 {parseInt(selectedMonth.split('-')[1])}월
              </span>
            )}
            {searchTerm && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                검색어: {searchTerm}
              </span>
            )}
          </div>
        )}
      </section>

      {/* 예약 목록 */}
      <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="text-gray-600">예약 목록을 불러오는 중...</p>
            </div>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-600">예약 정보가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">고객 정보</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">상품 정보</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">결제 정보</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">판매원</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">APIS 상태</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReservations.map((reservation) => {
                  const apisStatus = getApisCompletionStatus(reservation.travelers);
                  return (
                    <tr key={reservation.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900">{reservation.user?.name || '이름 없음'}</p>
                          <p className="text-sm text-gray-500">{reservation.user?.phone || '전화번호 없음'}</p>
                          <p className="text-xs text-gray-400">총 {reservation.totalPeople}명</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {reservation.trip ? (
                          <div className="space-y-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {reservation.trip.product?.cruiseLine} {reservation.trip.shipName || reservation.trip.product?.shipName}
                            </p>
                            <p className="text-xs text-gray-500">{reservation.trip.product?.packageName}</p>
                            {reservation.trip.departureDate && (
                              <p className="text-xs text-blue-600">
                                출발: {new Date(reservation.trip.departureDate).toLocaleDateString('ko-KR')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm">상품 정보 없음</p>
                        )}
                      </td>
                      {/* 결제 정보 */}
                      <td className="px-4 py-4">
                        {reservation.payment ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-900 text-sm">
                              {reservation.payment.amount.toLocaleString()}원
                            </p>
                            <div className="flex items-center gap-1 flex-wrap">
                              {reservation.payment.status === 'cancelled' || reservation.saleRefundedAt ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                  환불완료
                                </span>
                              ) : reservation.payment.status === 'paid' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  결제완료
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                  {reservation.payment.status}
                                </span>
                              )}
                              {/* 결제 방법 */}
                              {reservation.payment.payMethod && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  {reservation.payment.payMethod === 'card' || reservation.payment.payMethod === 'CARD' ? '카드' :
                                   reservation.payment.payMethod === 'bank' || reservation.payment.payMethod === 'BANK' ? '계좌이체' :
                                   reservation.payment.payMethod === 'vbank' || reservation.payment.payMethod === 'VBANK' ? '가상계좌' :
                                   reservation.payment.payMethod}
                                </span>
                              )}
                            </div>
                            {reservation.payment.paidAt && (
                              <p className="text-xs text-gray-500">
                                결제: {new Date(reservation.payment.paidAt).toLocaleString('ko-KR')}
                              </p>
                            )}
                            {reservation.saleRefundedAt && (
                              <p className="text-xs text-red-500">
                                환불: {new Date(reservation.saleRefundedAt).toLocaleDateString('ko-KR')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm">결제 정보 없음</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {/* 판매 채널 */}
                          <div className="flex items-center gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              reservation.link
                                ? 'bg-blue-100 text-blue-700'
                                : reservation.agent
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-700'
                            }`}>
                              {reservation.salesChannel || '직접 판매'}
                            </span>
                          </div>
                          {/* 판매원 */}
                          {reservation.agent && (
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">판매원:</span> {reservation.agent.displayName || '-'}
                            </p>
                          )}
                          {/* 대리점장 */}
                          {reservation.manager && (
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">대리점장:</span> {reservation.manager.displayName || '-'}
                            </p>
                          )}
                          {/* 링크 코드 */}
                          {reservation.link && (
                            <p className="text-xs text-blue-500 font-mono">
                              코드: {reservation.link.code}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${apisStatus.percentage === 100 ? 'bg-green-500' : apisStatus.percentage > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${apisStatus.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600">{apisStatus.percentage}%</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {apisStatus.complete}/{apisStatus.total}명 완료
                          </p>
                          {reservation.trip?.spreadsheetId && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              시트 생성됨
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            onClick={() => handleOpenDetailModal(reservation)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
                            title="상세정보 보기"
                          >
                            <FiEye className="text-xs" />
                            상세
                          </button>
                          {/* PNR 먼저, 그 다음 여권 요청 (순서 중요) */}
                          {reservation.trip && (
                            <button
                              onClick={() => handleOpenPnrModal(reservation)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                              title="1. PNR 전송 (먼저 실행)"
                            >
                              <FiSend className="text-xs" />
                              1.PNR
                            </button>
                          )}
                          <button
                            onClick={() => handleSendPassportRequest(reservation)}
                            disabled={sendingPassportRequest === reservation.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                            title="2. 여권 요청 보내기 (PNR 전송 후)"
                          >
                            {sendingPassportRequest === reservation.id ? (
                              <FiRefreshCw className="animate-spin text-xs" />
                            ) : (
                              <FiMail className="text-xs" />
                            )}
                            2.여권
                          </button>
                          {reservation.trip?.spreadsheetId && (
                            <a
                              href={`https://docs.google.com/spreadsheets/d/${reservation.trip.spreadsheetId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                              title="APIS 시트 열기"
                            >
                              <FiExternalLink className="text-xs" />
                              시트
                            </a>
                          )}
                          {/* 계약서 보내기 */}
                          <button
                            onClick={() => handleOpenContractModal(reservation)}
                            disabled={sendingContract || resettingContract}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            title="여행계약서 보내기"
                          >
                            <FiMessageSquare className="text-xs" />
                            계약서
                          </button>
                          {/* 환불 버튼 - 결제완료 상태일 때만 표시 */}
                          {reservation.payment && reservation.payment.status === 'paid' && !reservation.saleRefundedAt && (
                            <button
                              onClick={() => handleOpenRefundModal(reservation)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                              title="환불 처리"
                            >
                              <FiDollarSign className="text-xs" />
                              환불
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 상세 정보 모달 */}
      {showDetailModal && selectedReservation && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailModal(false);
              setSelectedReservation(null);
              setEditingTraveler(null);
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
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReservation(null);
                  setEditingTraveler(null);
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
                        <p className="text-base text-gray-900">{selectedReservation.user?.name || '미입력'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">전화번호</p>
                        <p className="text-base text-gray-900">{selectedReservation.user?.phone || '미입력'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">이메일</p>
                        <p className="text-base text-gray-900">{selectedReservation.user?.email || '미입력'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">APIS 완성도</p>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const status = getApisCompletionStatus(selectedReservation.travelers);
                            return (
                              <>
                                <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${status.percentage === 100 ? 'bg-green-500' : status.percentage > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${status.percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold">{status.percentage}%</span>
                                <span className="text-sm text-gray-500">({status.complete}/{status.total}명)</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 상품 정보 */}
                  {selectedReservation.trip && (
                    <div className="rounded-lg border border-gray-200 bg-blue-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">구매 상품 정보</h4>
                        {selectedReservation.trip.spreadsheetId && (
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${selectedReservation.trip.spreadsheetId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            <FiExternalLink className="text-sm" />
                            APIS 시트 열기
                          </a>
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-gray-500">크루즈 라인</p>
                          <p className="text-base text-gray-900">{selectedReservation.trip.product?.cruiseLine || '미입력'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">선박명</p>
                          <p className="text-base text-gray-900">{selectedReservation.trip.shipName || selectedReservation.trip.product?.shipName || '미입력'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">패키지명</p>
                          <p className="text-base text-gray-900">{selectedReservation.trip.product?.packageName || '미입력'}</p>
                        </div>
                        {selectedReservation.trip.departureDate && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">출발일</p>
                            <p className="text-base text-gray-900">
                              {new Date(selectedReservation.trip.departureDate).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-500">총 인원</p>
                          <p className="text-base text-gray-900">{selectedReservation.totalPeople}명</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 여행자 정보 (APIS) - 수정 가능 */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900">여행자 정보 (APIS) - 클릭하여 수정</h4>
                      <button
                        onClick={handleAddTraveler}
                        disabled={addingTraveler}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {addingTraveler ? <FiRefreshCw className="animate-spin" /> : '+'}
                        여행자 추가
                      </button>
                    </div>
                    {selectedReservation.travelers && selectedReservation.travelers.length > 0 ? (
                      <div className="space-y-4">
                        {selectedReservation.travelers.map((traveler, index) => (
                          <div key={traveler.id || index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <h5 className="font-semibold text-gray-900">
                                {index === 0 ? '대표자' : `동행자 ${index}`}
                                {traveler.roomNumber && (
                                  <span className="ml-2 text-sm font-normal text-gray-500">
                                    (방 {traveler.roomNumber})
                                  </span>
                                )}
                              </h5>
                              {editingTraveler === traveler.id ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSaveTraveler(traveler.id)}
                                    disabled={savingTraveler}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {savingTraveler ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
                                    저장
                                  </button>
                                  <button
                                    onClick={() => setEditingTraveler(null)}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-500 text-white text-sm font-medium hover:bg-gray-600"
                                  >
                                    취소
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditTraveler(traveler)}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                                  >
                                    <FiEdit />
                                    수정
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTraveler(traveler.id)}
                                    disabled={deletingTraveler === traveler.id}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                                  >
                                    {deletingTraveler === traveler.id ? <FiRefreshCw className="animate-spin" /> : <FiX />}
                                    삭제
                                  </button>
                                </div>
                              )}
                            </div>

                            {editingTraveler === traveler.id ? (
                              <div className="grid gap-3 md:grid-cols-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-500">한글 성명</label>
                                  <input
                                    type="text"
                                    value={travelerForm.korName || ''}
                                    onChange={(e) => setTravelerForm({ ...travelerForm, korName: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">영문 성 (Surname)</label>
                                  <input
                                    type="text"
                                    value={travelerForm.engSurname || ''}
                                    onChange={(e) => setTravelerForm({ ...travelerForm, engSurname: e.target.value.toUpperCase() })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="HONG"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">영문 이름 (Given Name)</label>
                                  <input
                                    type="text"
                                    value={travelerForm.engGivenName || ''}
                                    onChange={(e) => setTravelerForm({ ...travelerForm, engGivenName: e.target.value.toUpperCase() })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="GILDONG"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">주민번호</label>
                                  <input
                                    type="text"
                                    value={travelerForm.residentNum || ''}
                                    onChange={(e) => setTravelerForm({ ...travelerForm, residentNum: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="000000-0000000"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">성별</label>
                                  <select
                                    value={travelerForm.gender || ''}
                                    onChange={(e) => setTravelerForm({ ...travelerForm, gender: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                  >
                                    <option value="">선택</option>
                                    <option value="M">남성 (M)</option>
                                    <option value="F">여성 (F)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">생년월일 (YYYY-MM-DD)</label>
                                  <input
                                    type="date"
                                    value={travelerForm.birthDate || ''}
                                    onChange={(e) => setTravelerForm({ ...travelerForm, birthDate: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">여권번호</label>
                                  <input
                                    type="text"
                                    value={travelerForm.passportNo || ''}
                                    onChange={(e) => setTravelerForm({ ...travelerForm, passportNo: e.target.value.toUpperCase() })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="M12345678"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">국적</label>
                                  <input
                                    type="text"
                                    value={travelerForm.nationality || ''}
                                    onChange={(e) => setTravelerForm({ ...travelerForm, nationality: e.target.value.toUpperCase() })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="KOR"
                                    maxLength={3}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">여권 생성일 (YYYY-MM-DD)</label>
                                  <input
                                    type="date"
                                    value={travelerForm.issueDate || ''}
                                    onChange={(e) => setTravelerForm({ ...travelerForm, issueDate: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">여권 만료일 (YYYY-MM-DD)</label>
                                  <input
                                    type="date"
                                    value={travelerForm.expiryDate || ''}
                                    onChange={(e) => setTravelerForm({ ...travelerForm, expiryDate: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">객실 번호</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={travelerForm.roomNumber || ''}
                                    onChange={(e) => setTravelerForm({ ...travelerForm, roomNumber: parseInt(e.target.value) || null })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="1"
                                  />
                                </div>
                                {/* 비고 - 전체 너비 */}
                                <div className="md:col-span-3">
                                  <label className="text-sm font-medium text-gray-500">비고 (뒤늦게 일행 신청 등 메모)</label>
                                  <textarea
                                    value={travelerForm.notes || ''}
                                    onChange={(e) => setTravelerForm({ ...travelerForm, notes: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    rows={2}
                                    placeholder="예: 뒤늦게 신청한 일행, 여권 갱신 예정 등"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="grid gap-3 md:grid-cols-4">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">한글 성명</p>
                                    <p className="text-base text-gray-900">{traveler.korName || <span className="text-red-500">미입력</span>}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">영문 성 (Surname)</p>
                                    <p className="text-base text-gray-900">{traveler.engSurname || <span className="text-red-500">미입력</span>}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">영문 이름 (Given Name)</p>
                                    <p className="text-base text-gray-900">{traveler.engGivenName || <span className="text-red-500">미입력</span>}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">주민번호</p>
                                    <p className="text-base text-gray-900">{traveler.residentNum || <span className="text-red-500">미입력</span>}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">성별</p>
                                    <p className="text-base text-gray-900">
                                      {traveler.gender === 'M' ? '남성 (M)' : traveler.gender === 'F' ? '여성 (F)' : <span className="text-red-500">미입력</span>}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">생년월일</p>
                                    <p className="text-base text-gray-900">{traveler.birthDate || <span className="text-red-500">미입력</span>}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">여권번호</p>
                                    <p className="text-base text-gray-900">{traveler.passportNo || <span className="text-red-500">미입력</span>}</p>
                                    {traveler.hasPassportImage && (
                                      <button
                                        onClick={async () => {
                                          try {
                                            const res = await csrfFetch(`/api/admin/traveler/${traveler.id}/passport-link`);
                                            const data = await res.json();
                                            if (data.ok && data.url) {
                                              window.open(data.url, '_blank', 'noopener,noreferrer');
                                            } else {
                                              showError(data.message || '여권 이미지를 불러올 수 없습니다.');
                                            }
                                          } catch {
                                            showError('여권 이미지 불러오기 실패');
                                          }
                                        }}
                                        className="mt-1 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                      >
                                        <FiEye className="text-xs" /> 여권 이미지
                                      </button>
                                    )}
                                    {selectedReservation.trip?.googleFolderId && (
                                      <button
                                        onClick={async () => {
                                          try {
                                            const res = await csrfFetch(`/api/admin/trips/${selectedReservation.trip!.id}/passport-folder`);
                                            const data = await res.json();
                                            if (data.ok && data.folderUrl) {
                                              window.open(data.folderUrl, '_blank', 'noopener,noreferrer');
                                            } else {
                                              showError(data.message || 'Drive 폴더를 찾을 수 없습니다.');
                                            }
                                          } catch {
                                            showError('Drive 폴더 열기 실패');
                                          }
                                        }}
                                        className="mt-1 text-xs text-gray-600 hover:text-gray-700 flex items-center gap-1"
                                      >
                                        <FiExternalLink className="text-xs" /> Drive 폴더
                                      </button>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">국적</p>
                                    <p className="text-base text-gray-900">{traveler.nationality || <span className="text-red-500">미입력</span>}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">여권 생성일</p>
                                    <p className="text-base text-gray-900">{traveler.issueDate || <span className="text-red-500">미입력</span>}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">여권 만료일</p>
                                    <p className="text-base text-gray-900">{traveler.expiryDate || <span className="text-red-500">미입력</span>}</p>
                                  </div>
                                </div>
                                {/* 비고 표시 - 전체 너비 */}
                                {traveler.notes && (
                                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                                    <p className="text-sm font-medium text-yellow-800">비고</p>
                                    <p className="text-sm text-yellow-700">{traveler.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
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

            {/* 하단 버튼 - PNR 먼저, 그 다음 여권 요청 순서 */}
            <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReservation(null);
                  setEditingTraveler(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                닫기
              </button>
              {selectedReservation.trip?.spreadsheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${selectedReservation.trip.spreadsheetId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <FiExternalLink />
                  APIS 시트 열기
                </a>
              )}
              {/* 1. PNR 전송 먼저 */}
              {selectedReservation.trip && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleOpenPnrModal(selectedReservation);
                  }}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                >
                  <FiSend />
                  1. PNR 전송
                </button>
              )}
              {/* 2. 여권 요청은 PNR 전송 후 */}
              <button
                onClick={() => handleSendPassportRequest(selectedReservation)}
                disabled={sendingPassportRequest === selectedReservation.id}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {sendingPassportRequest === selectedReservation.id ? (
                  <FiRefreshCw className="animate-spin" />
                ) : (
                  <FiMail />
                )}
                2. 여권 요청 보내기
              </button>
              {/* 3. 여행계약서 발송 */}
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleOpenContractModal(selectedReservation);
                }}
                disabled={sendingContract || resettingContract}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                <FiMessageSquare />
                3. 계약서 보내기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PNR 전송 모달 */}
      {showPnrModal && pnrReservation && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPnrModal(false);
              setPnrReservation(null);
            }
          }}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-green-50 px-6 py-4">
              <div>
                <h3 className="text-xl font-bold text-green-800">PNR 정보 입력 요청</h3>
                <p className="text-sm text-green-600 mt-1">
                  {pnrReservation.user?.name || '고객'}님에게 PNR 입력 링크를 전송합니다
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPnrModal(false);
                  setPnrReservation(null);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* 내용 */}
            <div className="px-6 py-6">
              {loadingPnr ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-r-transparent"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 고객 정보 */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="mb-3 text-lg font-semibold text-gray-900">고객 정보</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-gray-500">이름</p>
                        <p className="text-base text-gray-900">{pnrReservation.user?.name || '미입력'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">전화번호</p>
                        <p className="text-base text-gray-900">{pnrReservation.user?.phone || '미입력'}</p>
                      </div>
                    </div>
                  </div>

                  {/* PNR 링크 */}
                  <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-semibold text-green-800">PNR 입력 링크</h4>
                      <button
                        onClick={handleCopyPnrLink}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        <FiCopy className="text-sm" />
                        링크 복사
                      </button>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <p className="text-sm text-gray-700 break-all font-mono">{pnrLink}</p>
                    </div>
                  </div>

                  {/* 메시지 내용 */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">발송 메시지</h4>
                      <button
                        onClick={handleCopyPnrMessage}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-600 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
                      >
                        <FiCopy className="text-sm" />
                        메시지 복사
                      </button>
                    </div>
                    <textarea
                      value={pnrMessage}
                      onChange={(e) => setPnrMessage(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-green-500 focus:outline-none"
                      rows={10}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      메시지 내용을 수정할 수 있습니다. 수정 후 문자 발송 버튼을 눌러주세요.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 하단 버튼 */}
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-4">
              <div className="text-sm text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <FiMessageSquare className="text-blue-500" />
                  알리고 SMS로 발송됩니다
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowPnrModal(false);
                    setPnrReservation(null);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSendPnrSms}
                  disabled={sendingPnr || !pnrLink}
                  className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {sendingPnr ? (
                    <FiRefreshCw className="animate-spin" />
                  ) : (
                    <FiSend />
                  )}
                  문자 발송
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 여행계약서 모달 */}
      {showContractModal && contractReservation && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !sendingContract && !resettingContract) {
              setShowContractModal(false);
              setContractReservation(null);
              setContractResult(null);
              setContractAlreadySigned(false);
              setResendReason('');
            }
          }}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-indigo-50 px-6 py-4 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-indigo-800">여행계약서 보내기</h3>
                <p className="text-sm text-indigo-600 mt-1">
                  {contractReservation.user?.name || '고객'}님 · {contractReservation.trip?.product?.packageName || '상품'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!sendingContract && !resettingContract) {
                    setShowContractModal(false);
                    setContractReservation(null);
                    setContractResult(null);
                    setContractAlreadySigned(false);
                    setResendReason('');
                  }
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
                disabled={sendingContract || resettingContract}
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* 내용 */}
            <div className="px-6 py-6">
              {sendingContract ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4 text-indigo-700">
                  <FiRefreshCw className="animate-spin text-4xl" />
                  <p className="font-semibold">계약서 생성 중...</p>
                </div>
              ) : contractAlreadySigned ? (
                <div className="space-y-5">
                  {/* 이미 서명된 상태 안내 */}
                  <div className="flex items-start gap-3 rounded-lg p-4 bg-blue-50 border border-blue-200">
                    <FiCheckCircle className="text-blue-600 text-xl flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-800">이미 서명이 완료된 계약서입니다</p>
                      <p className="text-sm mt-0.5 text-blue-700">
                        서명을 취소하고 새 계약서를 재발송할 수 있습니다.<br />
                        취소 시 기존 서명 데이터는 모두 삭제됩니다.
                      </p>
                    </div>
                  </div>

                  {/* 취소 사유 입력 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      취소 사유 <span className="text-gray-400 font-normal">(선택)</span>
                    </label>
                    <input
                      type="text"
                      value={resendReason}
                      onChange={(e) => setResendReason(e.target.value)}
                      placeholder="예: 계약 내용 수정 필요"
                      maxLength={200}
                      disabled={resettingContract}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                    />
                  </div>

                  {/* 재발송 버튼 */}
                  <button
                    onClick={handleResetAndResend}
                    disabled={resettingContract}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {resettingContract ? (
                      <><FiRefreshCw className="animate-spin" /> 처리 중...</>
                    ) : (
                      <><FiSend /> 서명 취소 후 재발송</>
                    )}
                  </button>
                </div>
              ) : contractResult ? (
                <div className="space-y-5">
                  {/* 이메일 발송 결과 */}
                  <div className={`flex items-start gap-3 rounded-lg p-4 ${contractResult.emailSent ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    {contractResult.emailSent ? (
                      <FiCheckCircle className="text-green-600 text-xl flex-shrink-0 mt-0.5" />
                    ) : (
                      <FiAlertCircle className="text-yellow-600 text-xl flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-semibold ${contractResult.emailSent ? 'text-green-800' : 'text-yellow-800'}`}>
                        {contractResult.emailSent ? '이메일 발송 완료' : '이메일 미발송 (이메일 없음)'}
                      </p>
                      <p className={`text-sm mt-0.5 ${contractResult.emailSent ? 'text-green-700' : 'text-yellow-700'}`}>
                        {contractResult.emailSent
                          ? `${contractReservation.user?.email}로 서명 요청 이메일을 발송했습니다.`
                          : '고객 이메일이 없어 카카오톡으로 링크를 전달해주세요.'}
                      </p>
                    </div>
                  </div>

                  {/* 서명 링크 */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">서명 링크</p>
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="flex-1 text-xs text-gray-600 truncate font-mono">{contractResult.signUrl}</p>
                      <button
                        onClick={handleCopyContractLink}
                        className="flex-shrink-0 inline-flex items-center gap-1 rounded-md bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300 transition-colors"
                      >
                        <FiCopy className="text-xs" />
                        링크 복사
                      </button>
                    </div>
                  </div>

                  {/* 카카오톡 메시지 복사 */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">카카오톡으로 보내기</p>
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-gray-700 whitespace-pre-wrap font-mono text-xs leading-relaxed">
{`[크루즈닷] 여행계약서 서명 요청

안녕하세요, ${contractReservation.user?.name || '고객'}님!
${contractReservation.trip?.product?.packageName || '상품'} 여행계약서 서명을 요청드립니다.

아래 링크에서 내용 확인 후 서명해주세요:
${contractResult.signUrl}

문의: 크루즈닷 010-3289-3800`}
                    </div>
                    <button
                      onClick={handleCopyKakaoMessage}
                      className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-bold text-yellow-900 hover:bg-yellow-500 transition-colors"
                    >
                      <FiCopy />
                      카카오톡 메시지 복사
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 하단 버튼 */}
            {!sendingContract && !resettingContract && (contractResult || contractAlreadySigned) && (
              <div className="flex items-center justify-end border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowContractModal(false);
                    setContractReservation(null);
                    setContractResult(null);
                    setContractAlreadySigned(false);
                    setResendReason('');
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 환불 모달 */}
      {showRefundModal && refundReservation && refundReservation.payment && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRefundModal(false);
              setRefundReservation(null);
            }
          }}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-red-50 px-6 py-4 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-red-800">환불 처리</h3>
                <p className="text-sm text-red-600 mt-1">
                  결제 취소 후 되돌릴 수 없습니다
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundReservation(null);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* 내용 */}
            <div className="px-6 py-6 space-y-6">
              {/* 결제 정보 */}
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                <h4 className="mb-3 text-lg font-semibold text-red-800">결제 정보</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-500">고객명</p>
                    <p className="text-base text-gray-900">{refundReservation.user?.name || refundReservation.payment.buyerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">연락처</p>
                    <p className="text-base text-gray-900">{refundReservation.user?.phone || refundReservation.payment.buyerTel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">결제 금액</p>
                    <p className="text-2xl font-bold text-red-600">{refundReservation.payment.amount.toLocaleString()}원</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">결제일</p>
                    <p className="text-base text-gray-900">
                      {refundReservation.payment.paidAt
                        ? new Date(refundReservation.payment.paidAt).toLocaleDateString('ko-KR')
                        : '-'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">주문번호</p>
                    <p className="text-sm text-gray-700 font-mono">{refundReservation.payment.orderId}</p>
                  </div>
                </div>
              </div>

              {/* 환불 사유 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  환불 사유 (선택)
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-200 p-3 text-sm focus:border-red-500 focus:outline-none"
                  rows={3}
                  placeholder="환불 사유를 입력하세요 (선택사항)"
                />
              </div>

              {/* 경고 메시지 */}
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                <div className="flex items-start gap-3">
                  <FiAlertCircle className="text-yellow-600 text-xl flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800">주의사항</p>
                    <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside space-y-1">
                      <li>환불 처리 후에는 취소할 수 없습니다.</li>
                      <li>정산 내역에 환불 금액이 마이너스로 반영됩니다.</li>
                      <li>고객에게 환불 완료 안내가 필요할 수 있습니다.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundReservation(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRefund}
                disabled={processingRefund}
                className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {processingRefund ? (
                  <FiRefreshCw className="animate-spin" />
                ) : (
                  <FiDollarSign />
                )}
                {processingRefund ? '처리 중...' : '환불 처리'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
