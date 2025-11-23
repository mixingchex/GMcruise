// app/admin/affiliate/customers/[leadId]/page.tsx
// 고객 상세 페이지 - 여권 요청, 상태 변경, 상호작용 기록

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  FiArrowLeft,
  FiEdit2,
  FiSave,
  FiX,
  FiUser,
  FiPhone,
  FiCalendar,
  FiFileText,
  FiUpload,
  FiPaperclip,
  FiCheckCircle,
  FiClock,
  FiMessageCircle,
  FiTrash2,
  FiDownload,
  FiImage,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

type AffiliateLead = {
  id: number;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  notes: string | null;
  passportRequestedAt: string | null;
  passportCompletedAt: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  manager: {
    id: number;
    affiliateCode: string | null;
    displayName: string | null;
  } | null;
  agent: {
    id: number;
    affiliateCode: string | null;
    displayName: string | null;
  } | null;
  interactions: Array<{
    id: number;
    interactionType: string;
    occurredAt: string;
    note: string | null;
    createdBy: {
      id: number;
      name: string | null;
    };
    media: Array<{
      id: number;
      fileName: string | null;
      fileSize: number | null;
      mimeType: string | null;
      storagePath: string;
    }>;
  }>;
  sales: Array<{
    id: number;
    externalOrderCode: string | null;
    productCode: string | null;
    saleAmount: number;
    costAmount: number | null;
    netRevenue: number | null;
    headcount: number | null;
    cabinType: string | null;
    fareCategory: string | null;
    status: string;
    saleDate: string | null;
    confirmedAt: string | null;
    refundedAt: string | null;
    cancellationReason: string | null;
    // 현금영수증 및 카드 계산 처리 필드
    receiptStatus: string | null;
    receiptProcessedAt: string | null;
    cardPaymentStatus: string | null;
    // APIS 정보
    audioFileGoogleDriveId: string | null;
    audioFileGoogleDriveUrl: string | null;
    audioFileName: string | null;
    audioFileType: string | null;
    submittedById: number | null;
    submittedAt: string | null;
    approvedById: number | null;
    approvedAt: string | null;
    rejectedById: number | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
    metadata: any;
    product: {
      productName: string | null;
    } | null;
    manager: {
      id: number;
      displayName: string | null;
      affiliateCode: string | null;
    } | null;
    agent: {
      id: number;
      displayName: string | null;
      affiliateCode: string | null;
    } | null;
  }>;
  passportSubmissions?: Array<{
    id: number;
    driveFolderUrl: string | null;
    submittedAt: string | null;
    guests: Array<{
      id: number;
      name: string;
      passportNumber: string | null;
      passportExpiryDate: string | null;
    }>;
  }>;
};

const STATUS_OPTIONS = [
  { value: 'NEW', label: '신규' },
  { value: 'CONTACTED', label: '연락됨' },
  { value: 'IN_PROGRESS', label: '진행중' },
  { value: 'PURCHASED', label: '구매완료' },
  { value: 'REFUNDED', label: '환불' },
  { value: 'CLOSED', label: '종료' },
  { value: 'TEST_GUIDE', label: '지니가이드 체험중' },
];

const INTERACTION_TYPES = [
  { value: 'PHONE_CALL', label: '전화 통화' },
  { value: 'EMAIL', label: '이메일' },
  { value: 'MESSAGE', label: '메시지' },
  { value: 'MEETING', label: '대면 미팅' },
  { value: 'NOTE', label: '메모' },
  { value: 'OTHER', label: '기타' },
];

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params?.leadId as string;

  const [lead, setLead] = useState<AffiliateLead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 환불/현금영수증/카드계산 모달 상태
  const [refundModal, setRefundModal] = useState<{ open: boolean; saleId: number | null }>({
    open: false,
    saleId: null,
  });
  const [refundReason, setRefundReason] = useState('');
  const [receiptModal, setReceiptModal] = useState<{ open: boolean; saleId: number | null }>({
    open: false,
    saleId: null,
  });
  const [cardPaymentModal, setCardPaymentModal] = useState<{ open: boolean; saleId: number | null }>({
    open: false,
    saleId: null,
  });
  const [productEndDates, setProductEndDates] = useState<Record<string, string | null>>({});

  // 편집 폼 상태
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerPhone: '',
  });

  // 상호작용 추가 폼 상태
  const [interactionForm, setInteractionForm] = useState({
    interactionType: 'PHONE_CALL',
    occurredAt: new Date().toISOString().slice(0, 16),
    note: '',
    files: [] as File[],
  });

  const loadLead = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/affiliate/leads/${leadId}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '고객 정보를 불러오지 못했습니다.');
      }
      setLead(json.lead);
      setEditForm({
        customerName: json.lead.customerName || '',
        customerPhone: json.lead.customerPhone || '',
      });
      
      // 여행 종료일 정보 가져오기
      if (json.lead.sales && json.lead.sales.length > 0) {
        const endDates: Record<string, string | null> = {};
        for (const sale of json.lead.sales) {
          if (sale.productCode && !endDates[sale.productCode]) {
            try {
              const productRes = await fetch(`/api/admin/affiliate/documents/product-info?productCode=${sale.productCode}`);
              const productJson = await productRes.json();
              if (productJson.ok && productJson.product?.endDate) {
                endDates[sale.productCode] = productJson.product.endDate;
              }
            } catch (error) {
              console.error('[CustomerDetail] Product end date fetch error:', error);
            }
          }
        }
        setProductEndDates(endDates);
      }
    } catch (error: any) {
      console.error('[CustomerDetail] load error', error);
      showError(error.message || '고객 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) {
      loadLead();
    }
  }, [leadId, loadLead]);

  // 여행 종료일이 지났는지 확인
  const isTravelEnded = (sale: AffiliateLead['sales'][0]): boolean => {
    if (!sale.productCode || !sale.saleDate) return false;
    const endDate = productEndDates[sale.productCode];
    if (!endDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const travelEnd = new Date(endDate);
    travelEnd.setHours(0, 0, 0, 0);
    return travelEnd < today;
  };

  // 환불 처리
  const handleRefund = async () => {
    if (!refundModal.saleId || !refundReason.trim()) {
      showError('환불 사유를 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/affiliate/sales/${refundModal.saleId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '환불 처리에 실패했습니다.');
      }

      showSuccess('환불 처리가 완료되었습니다. 고객 상태가 "환불처리"로 변경되었습니다.');
      setRefundModal({ open: false, saleId: null });
      setRefundReason('');
      loadLead();
    } catch (error: any) {
      console.error('[CustomerDetail] refund error', error);
      showError(error.message || '환불 처리 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 현금영수증 처리
  const handleReceiptProcess = async () => {
    if (!receiptModal.saleId) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/affiliate/sales/${receiptModal.saleId}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '현금영수증 처리에 실패했습니다.');
      }

      showSuccess('현금영수증 처리가 완료되었습니다.');
      setReceiptModal({ open: false, saleId: null });
      loadLead();
    } catch (error: any) {
      console.error('[CustomerDetail] receipt process error', error);
      showError(error.message || '현금영수증 처리 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 카드 계산 완료 처리
  const handleCardPaymentComplete = async (alsoProcessReceipt: boolean) => {
    if (!cardPaymentModal.saleId) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/affiliate/sales/${cardPaymentModal.saleId}/card-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptProcess: alsoProcessReceipt }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '카드 계산 완료 처리에 실패했습니다.');
      }

      showSuccess(
        alsoProcessReceipt
          ? '카드 계산 완료 및 현금영수증 처리가 완료되었습니다.'
          : '카드 계산 완료 처리가 완료되었습니다.'
      );
      setCardPaymentModal({ open: false, saleId: null });
      loadLead();
    } catch (error: any) {
      console.error('[CustomerDetail] card payment complete error', error);
      showError(error.message || '카드 계산 완료 처리 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomerInfo = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/affiliate/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: editForm.customerName || null,
          customerPhone: editForm.customerPhone || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '고객 정보 수정에 실패했습니다.');
      }

      showSuccess('고객 정보가 수정되었습니다.');
      setIsEditing(false);
      loadLead();
    } catch (error: any) {
      console.error('[CustomerDetail] save error', error);
      showError(error.message || '고객 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPassport = async () => {
    if (!confirm('고객에게 여권 요청을 전송하시겠습니까?')) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/affiliate/leads/${leadId}/request-passport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '여권 정보가 필요합니다.' }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '여권 요청에 실패했습니다.');
      }

      showSuccess('여권 요청이 전송되었습니다.');
      loadLead();
    } catch (error: any) {
      console.error('[CustomerDetail] passport request error', error);
      showError(error.message || '여권 요청 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/affiliate/leads/${leadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '상태 변경에 실패했습니다.');
      }

      showSuccess('고객 상태가 변경되었습니다.');
      loadLead();
    } catch (error: any) {
      console.error('[CustomerDetail] status change error', error);
      showError(error.message || '상태 변경 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddInteraction = async () => {
    try {
      setSaving(true);

      // 1. 상호작용 기록 생성
      const interactionRes = await fetch('/api/admin/affiliate/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: Number(leadId),
          interactionType: interactionForm.interactionType,
          occurredAt: new Date(interactionForm.occurredAt).toISOString(),
          note: interactionForm.note || null,
        }),
      });

      const interactionJson = await interactionRes.json();
      if (!interactionRes.ok || !interactionJson.ok) {
        throw new Error(interactionJson.message || '상호작용 기록 생성에 실패했습니다.');
      }

      const interactionId = interactionJson.interaction.id;

      // 2. 파일 업로드 (있는 경우)
      if (interactionForm.files.length > 0) {
        for (const file of interactionForm.files) {
          const formData = new FormData();
          formData.append('file', file);

          const uploadRes = await fetch(`/api/admin/affiliate/interactions/${interactionId}/upload`, {
            method: 'POST',
            body: formData,
          });

          const uploadJson = await uploadRes.json();
          if (!uploadRes.ok || !uploadJson.ok) {
            console.error('File upload failed:', uploadJson.message);
            // 파일 업로드 실패해도 상호작용 기록은 저장됨
          }
        }
      }

      showSuccess('상호작용 기록이 추가되었습니다.');
      setIsAddingInteraction(false);
      setInteractionForm({
        interactionType: 'PHONE_CALL',
        occurredAt: new Date().toISOString().slice(0, 16),
        note: '',
        files: [],
      });
      loadLead();
    } catch (error: any) {
      console.error('[CustomerDetail] add interaction error', error);
      showError(error.message || '상호작용 기록 추가 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setInteractionForm((prev) => ({
      ...prev,
      files: [...prev.files, ...files],
    }));
  };

  const removeFile = (index: number) => {
    setInteractionForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-50 text-blue-700';
      case 'CONTACTED':
        return 'bg-yellow-50 text-yellow-700';
      case 'IN_PROGRESS':
        return 'bg-purple-50 text-purple-700';
      case 'PURCHASED':
        return 'bg-emerald-50 text-emerald-700';
      case 'REFUNDED':
        return 'bg-red-50 text-red-700';
      case 'TEST_GUIDE':
        return 'bg-indigo-50 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    return STATUS_OPTIONS.find((opt) => opt.value === status)?.label || status;
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">고객 정보를 불러오는 중입니다...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8">
        <div className="text-center text-red-500">고객 정보를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          <FiArrowLeft className="text-base" />
          돌아가기
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900">고객 상세 정보</h1>
      </div>

      {/* 고객 기본 정보 */}
      <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">기본 정보</h2>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <FiEdit2 className="text-base" />
              수정
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    customerName: lead.customerName || '',
                    customerPhone: lead.customerPhone || '',
                  });
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <FiX className="text-base" />
                취소
              </button>
              <button
                onClick={handleSaveCustomerInfo}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:bg-blue-300"
              >
                <FiSave className="text-base" />
                저장
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">고객명</label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.customerName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, customerName: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            ) : (
              <div className="text-sm text-gray-900">{lead.customerName || '이름 없음'}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">전화번호</label>
            {isEditing ? (
              <input
                type="tel"
                value={editForm.customerPhone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            ) : (
              <div className="text-sm text-gray-900">{lead.customerPhone || '-'}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">담당자</label>
            <div className="space-y-2">
              {lead.manager && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                    대리점장
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {lead.manager.displayName || lead.manager.affiliateCode || '이름 없음'}
                  </span>
                </div>
              )}
              {lead.agent && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    판매원
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {lead.agent.displayName || lead.agent.affiliateCode || '이름 없음'}
                  </span>
                </div>
              )}
              {!lead.manager && !lead.agent && (
                <span className="text-sm text-gray-400">담당자 없음</span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">등록일</label>
            <div className="text-sm text-gray-900">
              {new Date(lead.createdAt).toLocaleString('ko-KR')}
            </div>
          </div>
        </div>
      </section>

      {/* 상태 및 여권 관리 */}
      <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">상태 관리</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">현재 상태</label>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(lead.status)}`}
              >
                {getStatusLabel(lead.status)}
              </span>
            </div>
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">여권 상태</label>
            {lead.passportCompletedAt ? (
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                  <FiCheckCircle />
                  완료됨
                </div>
                {/* 여권 이미지 표시 */}
                {lead.passportSubmissions && lead.passportSubmissions.length > 0 && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FiImage className="text-blue-500" />
                      여권 정보
                    </h4>
                    {lead.passportSubmissions.map((submission) => (
                      <div key={submission.id} className="space-y-2">
                        {submission.driveFolderUrl && (
                          <a
                            href={submission.driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            <FiDownload />
                            구글 드라이브 폴더 열기
                          </a>
                        )}
                        {submission.guests.length > 0 && (
                          <div className="space-y-1">
                            {submission.guests.map((guest) => (
                              <div key={guest.id} className="text-xs text-gray-600">
                                <span className="font-semibold">{guest.name}</span>
                                {guest.passportNumber && (
                                  <span className="ml-2">여권번호: {guest.passportNumber}</span>
                                )}
                                {guest.passportExpiryDate && (
                                  <span className="ml-2">
                                    만료일: {new Date(guest.passportExpiryDate).toLocaleDateString('ko-KR')}
                                    {(() => {
                                      const expiryDate = new Date(guest.passportExpiryDate);
                                      const sixMonthsLater = new Date();
                                      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
                                      if (expiryDate <= sixMonthsLater) {
                                        return (
                                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                            <FiClock className="text-xs" />
                                            만료 임박
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {submission.submittedAt && (
                          <div className="text-xs text-gray-500">
                            제출일: {new Date(submission.submittedAt).toLocaleString('ko-KR')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : lead.passportRequestedAt ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-700">
                <FiClock />
                요청됨 (본사 확인 대기중)
              </div>
            ) : (
              <button
                onClick={handleRequestPassport}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:bg-blue-300"
              >
                <FiFileText />
                여권 요청
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 상호작용 기록 */}
      <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">상호작용 기록</h2>
          {!isAddingInteraction && (
            <button
              onClick={() => setIsAddingInteraction(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
            >
              <FiMessageCircle />
              기록 추가
            </button>
          )}
        </div>

        {/* 상호작용 추가 폼 */}
        {isAddingInteraction && (
          <div className="mb-6 p-4 border border-blue-200 rounded-xl bg-blue-50">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    상호작용 유형
                  </label>
                  <select
                    value={interactionForm.interactionType}
                    onChange={(e) =>
                      setInteractionForm((prev) => ({ ...prev, interactionType: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {INTERACTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">발생 일시</label>
                  <input
                    type="datetime-local"
                    value={interactionForm.occurredAt}
                    onChange={(e) =>
                      setInteractionForm((prev) => ({ ...prev, occurredAt: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">메모</label>
                <textarea
                  value={interactionForm.note}
                  onChange={(e) =>
                    setInteractionForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="상호작용 내용을 입력하세요..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  파일 첨부 (녹음본, 카톡 스크린샷 등)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  accept="image/*,audio/*,video/*,application/pdf"
                />
                {interactionForm.files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {interactionForm.files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2 text-sm"
                      >
                        <span>{file.name}</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsAddingInteraction(false);
                    setInteractionForm({
                      interactionType: 'PHONE_CALL',
                      occurredAt: new Date().toISOString().slice(0, 16),
                      note: '',
                      files: [],
                    });
                  }}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  취소
                </button>
                <button
                  onClick={handleAddInteraction}
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {saving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 상호작용 목록 */}
        <div className="space-y-3">
          {lead.interactions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">상호작용 기록이 없습니다.</div>
          ) : (
            lead.interactions.map((interaction) => (
              <div
                key={interaction.id}
                className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {INTERACTION_TYPES.find((t) => t.value === interaction.interactionType)?.label ||
                          interaction.interactionType}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(interaction.occurredAt).toLocaleString('ko-KR')}
                      </span>
                      <span className="text-xs text-gray-500">
                        by {interaction.createdBy.name || 'Unknown'}
                      </span>
                    </div>
                    {interaction.note && (
                      <div className="text-sm text-gray-700 mb-2">{interaction.note}</div>
                    )}
                    {interaction.media.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {interaction.media.map((media) => (
                          <a
                            key={media.id}
                            href={media.storagePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            <FiPaperclip />
                            {media.fileName || '파일'}
                            {media.fileSize && (
                              <span className="text-gray-500">
                                ({(media.fileSize / 1024).toFixed(1)} KB)
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 구매 이력 */}
      {lead.sales.length > 0 && (
        <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">구매 이력</h2>
          <div className="space-y-4">
            {lead.sales.map((sale) => (
              <div
                key={sale.id}
                className="border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {sale.product?.productName || sale.productCode || '상품 정보 없음'}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          sale.status === 'PAID' || sale.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : sale.status === 'REFUNDED'
                            ? 'bg-red-50 text-red-700'
                            : sale.status === 'PENDING'
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {sale.status === 'PAID'
                          ? '지급완료'
                          : sale.status === 'CONFIRMED'
                          ? '확정됨'
                          : sale.status === 'REFUNDED'
                          ? '환불됨'
                          : sale.status === 'PENDING'
                          ? '대기중'
                          : sale.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">주문번호</div>
                        <div className="font-semibold text-gray-900">
                          {sale.externalOrderCode || `#${sale.id}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">상품코드</div>
                        <div className="font-semibold text-gray-900">{sale.productCode || '-'}</div>
                      </div>
                      {sale.saleDate && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">판매일자</div>
                          <div className="font-semibold text-gray-900">
                            {new Date(sale.saleDate).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                      )}
                      {sale.confirmedAt && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">확정일자</div>
                          <div className="font-semibold text-gray-900">
                            {new Date(sale.confirmedAt).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">판매금액</div>
                    <div className="text-lg font-bold text-gray-900">
                      {sale.saleAmount.toLocaleString()}원
                    </div>
                    {sale.netRevenue && (
                      <div className="text-xs text-gray-500 mt-1">
                        순이익: {sale.netRevenue.toLocaleString()}원
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                  {sale.headcount && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">인원수</div>
                      <div className="text-sm font-semibold text-gray-900">{sale.headcount}명</div>
                    </div>
                  )}
                  {sale.cabinType && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">객실타입</div>
                      <div className="text-sm font-semibold text-gray-900">{sale.cabinType}</div>
                    </div>
                  )}
                  {sale.fareCategory && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">요금카테고리</div>
                      <div className="text-sm font-semibold text-gray-900">{sale.fareCategory}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">담당자</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {sale.agent?.displayName || sale.manager?.displayName || '-'}
                    </div>
                  </div>
                </div>
                {sale.refundedAt && (
                  <div className="mt-3 pt-3 border-t border-red-200 bg-red-50 rounded-lg p-3">
                    <div className="text-xs text-red-600 font-semibold mb-1">환불 정보</div>
                    <div className="text-sm text-red-700">
                      환불일: {new Date(sale.refundedAt).toLocaleDateString('ko-KR')}
                    </div>
                    {sale.cancellationReason && (
                      <div className="text-sm text-red-700 mt-1">
                        사유: {sale.cancellationReason}
                      </div>
                    )}
                  </div>
                )}

                {/* APIS 정보 */}
                {(sale.audioFileGoogleDriveUrl ||
                  sale.submittedAt ||
                  sale.approvedAt ||
                  sale.rejectedAt) && (
                  <div className="mt-3 pt-3 border-t border-blue-200 bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 font-semibold mb-2">APIS 정보</div>
                    <div className="space-y-1 text-sm">
                      {sale.audioFileType && (
                        <div className="text-gray-700">
                          <span className="font-semibold">파일 타입:</span>{' '}
                          {sale.audioFileType === 'FIRST_CALL' ? '첫 콜' : sale.audioFileType === 'PASSPORT_GUIDE' ? '여권 안내' : sale.audioFileType}
                        </div>
                      )}
                      {sale.audioFileName && (
                        <div className="text-gray-700">
                          <span className="font-semibold">파일명:</span> {sale.audioFileName}
                        </div>
                      )}
                      {sale.audioFileGoogleDriveUrl && (
                        <div>
                          <a
                            href={sale.audioFileGoogleDriveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline"
                          >
                            <FiDownload className="text-xs" />
                            Google Drive에서 열기
                          </a>
                        </div>
                      )}
                      {sale.submittedAt && (
                        <div className="text-gray-700">
                          <span className="font-semibold">제출일:</span>{' '}
                          {new Date(sale.submittedAt).toLocaleString('ko-KR')}
                        </div>
                      )}
                      {sale.approvedAt && (
                        <div className="text-emerald-700">
                          <span className="font-semibold">승인일:</span>{' '}
                          {new Date(sale.approvedAt).toLocaleString('ko-KR')}
                        </div>
                      )}
                      {sale.rejectedAt && (
                        <div className="text-red-700">
                          <span className="font-semibold">거부일:</span>{' '}
                          {new Date(sale.rejectedAt).toLocaleString('ko-KR')}
                          {sale.rejectionReason && (
                            <span className="ml-2">(사유: {sale.rejectionReason})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 현금영수증 처리 완료 표시 */}
                {sale.receiptStatus === 'COMPLETED' && sale.receiptProcessedAt && (
                  <div className="mt-3 pt-3 border-t border-green-200 bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-green-600 font-semibold mb-1">현금영수증 처리완료</div>
                    <div className="text-sm text-green-700">
                      처리일: {new Date(sale.receiptProcessedAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                )}

                {/* 카드 계산 완료 표시 */}
                {sale.cardPaymentStatus === 'COMPLETED' && (
                  <div className="mt-3 pt-3 border-t border-blue-200 bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 font-semibold">카드계산완료</div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push(`/admin/affiliate/documents?saleId=${sale.id}`)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <FiFileText className="text-xs" />
                    서류 생성
                  </button>
                  
                  {/* 환불처리 버튼 (환불되지 않은 경우만) */}
                  {sale.status !== 'REFUNDED' && (
                    <button
                      onClick={() => setRefundModal({ open: true, saleId: sale.id })}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      환불처리
                    </button>
                  )}
                  
                  {sale.status === 'REFUNDED' && (
                    <button
                      onClick={() => router.push(`/admin/affiliate/refunds?saleId=${sale.id}`)}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      환불 상세
                    </button>
                  )}

                  {/* 현금영수증 처리 버튼 (여행 종료일이 지났고, 아직 처리되지 않은 경우) */}
                  {isTravelEnded(sale) && sale.receiptStatus !== 'COMPLETED' && (
                    <button
                      onClick={() => setReceiptModal({ open: true, saleId: sale.id })}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                    >
                      현금영수증 처리
                    </button>
                  )}

                  {/* 카드 계산 완료 버튼 (아직 처리되지 않은 경우) */}
                  {sale.cardPaymentStatus !== 'COMPLETED' && (
                    <button
                      onClick={() => setCardPaymentModal({ open: true, saleId: sale.id })}
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
                    >
                      카드계산 완료
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 환불처리 모달 */}
      {refundModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">환불 처리</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  환불 사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="환불 사유를 입력해주세요..."
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  환불 처리 시 고객 상태가 &quot;환불처리&quot;로 변경되어 판매원 및 대리점장에게 표시됩니다.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => {
                  setRefundModal({ open: false, saleId: null });
                  setRefundReason('');
                }}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                disabled={saving}
              >
                취소
              </button>
              <button
                onClick={handleRefund}
                disabled={saving || !refundReason.trim()}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-red-700 disabled:bg-red-300"
              >
                {saving ? '처리 중...' : '환불 처리'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 현금영수증 처리 모달 */}
      {receiptModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">현금영수증 처리</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-700">
                현금영수증 처리를 완료하시겠습니까?
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800">
                  처리 완료 후 &quot;현금영수증처리완료&quot;로 표시되며, 처리한 날짜가 함께 기록됩니다.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setReceiptModal({ open: false, saleId: null })}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                disabled={saving}
              >
                취소
              </button>
              <button
                onClick={handleReceiptProcess}
                disabled={saving}
                className="rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-green-700 disabled:bg-green-300"
              >
                {saving ? '처리 중...' : '현금영수증 처리완료'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카드 계산 완료 모달 */}
      {cardPaymentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">카드 계산 완료</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-700">
                카드 계산 완료 처리를 선택해주세요.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleCardPaymentComplete(false)}
                  disabled={saving}
                  className="w-full rounded-xl border-2 border-purple-600 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:bg-purple-50 disabled:opacity-50"
                >
                  카드계산완료
                </button>
                <button
                  onClick={() => handleCardPaymentComplete(true)}
                  disabled={saving}
                  className="w-full rounded-xl border-2 border-green-600 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:bg-green-50 disabled:opacity-50"
                >
                  현금영수증 처리
                </button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  &quot;현금영수증 처리&quot;를 선택하면 카드 계산 완료와 함께 현금영수증 처리도 함께 완료됩니다.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setCardPaymentModal({ open: false, saleId: null })}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                disabled={saving}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
