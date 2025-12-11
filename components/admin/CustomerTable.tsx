'use client';

import { useState } from 'react';
import { FiEdit2, FiCheck, FiX, FiFileText, FiEye, FiClock } from 'react-icons/fi';
import CustomerStatusBadges from '@/components/CustomerStatusBadges';
// CustomerNoteModal 삭제됨 - CustomerDetailModal의 상담기록 탭으로 통합
import CustomerDetailModal from '@/components/admin/CustomerDetailModal';
import SharedCustomerDetailModal from '@/components/shared/SharedCustomerDetailModal';
import { Customer } from '@/types/customer';

type AffiliateOwnershipSource = 'self-profile' | 'lead-agent' | 'lead-manager' | 'fallback';

type AffiliateOwnership = {
  ownerType: 'HQ' | 'BRANCH_MANAGER' | 'SALES_AGENT';
  ownerProfileId: number | null;
  ownerName: string | null;
  ownerNickname: string | null;
  ownerAffiliateCode: string | null;
  ownerBranchLabel: string | null;
  ownerStatus: string | null;
  ownerPhone: string | null; // 담당자 연락처
  source: AffiliateOwnershipSource;
  managerProfile: {
    id: number;
    displayName: string | null;
    nickname: string | null;
    affiliateCode: string | null;
    branchLabel: string | null;
    status: string | null;
    contactPhone: string | null; // 대리점장 연락처
    type?: 'HQ' | 'BRANCH_MANAGER' | 'SALES_AGENT';
  } | null;
  leadId?: number | null; // AffiliateLead ID
  leadStatus?: string | null;
  leadCreatedAt?: string | null;
};

// 결제 정보 타입
type PaymentInfo = {
  id: number;
  orderId: string;
  amount: number;
  status: string;
  buyerName: string;
  buyerTel: string;
  productName: string | null;
  pgTransactionId: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  canRefund: boolean;
  saleStatus: string;
  saleAmount: number;
};

// CustomerTable에서 사용하는 확장 Customer 타입
interface AdminCustomer extends Omit<Customer, 'customerType' | 'affiliateOwnership'> {
  email?: string | null;
  createdAt?: string;
  lastActiveAt?: string | null;
  tripCount?: number;
  totalTripCount?: number;
  isHibernated?: boolean;
  isLocked?: boolean;
  customerStatus?: string | null;
  customerSource?: string | null; // 고객 유입 경로 (product-inquiry 등)
  isMallUser?: boolean;
  isLinked?: boolean; // 연동 여부 (크루즈 가이드 고객이 mallUserId를 가진 경우)
  mallUserId?: string | null;
  mallNickname?: string | null;
  kakaoChannelAdded?: boolean;
  kakaoChannelAddedAt?: string | null;
  pwaGenieInstalledAt?: string | null;
  pwaMallInstalledAt?: string | null;
  currentTripEndDate?: string | null;
  currentPassword?: string | null;
  testModeStartedAt?: string | null;
  customerType?: Customer['customerType'] | 'mall-admin'; // mall-admin 추가
  AffiliateProfile?: {
    id: number;
    type: 'BRANCH_MANAGER' | 'SALES_AGENT' | 'HQ';
    status: string;
    displayName: string | null;
    nickname: string | null;
    affiliateCode: string | null;
    branchLabel: string | null;
  } | null;
  trips: {
    id: number;
    cruiseName: string | null;
    companionType?: string | null;
    destination?: any;
    startDate: string | null;
    endDate: string | null;
  }[];
  daysRemaining?: number | null;
  affiliateOwnership?: AffiliateOwnership & {
    ownerNickname?: string | null; // ownerNickname 추가
  } | null;
  metadata?: any;
  updatedAt?: string;
  paymentInfo?: PaymentInfo | null; // 결제 정보 추가
}

interface Props {
  customers: AdminCustomer[];
  onRefresh?: () => void;
}

interface EditingField {
  customerId: number;
  field: string;
  value: any;
}

export default function CustomerTable({ customers, onRefresh }: Props) {
  const [processing, setProcessing] = useState<number | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [savingField, setSavingField] = useState<number | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<number | null>(null);
  // CustomerNoteModal 관련 state 삭제됨 - CustomerDetailModal의 상담기록 탭으로 통합
  // 공통 고객 상세 모달 (AffiliateLead 기반)
  const [showSharedDetailModal, setShowSharedDetailModal] = useState(false);
  const [sharedDetailLeadId, setSharedDetailLeadId] = useState<number | null>(null);

  // 환불 관련 상태
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedCustomerForRefund, setSelectedCustomerForRefund] = useState<AdminCustomer | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  // 환불 처리 핸들러
  const handleRefund = async () => {
    if (!selectedCustomerForRefund?.paymentInfo) return;

    if (!confirm(`정말 ${selectedCustomerForRefund.name || '고객'}님의 결제(${selectedCustomerForRefund.paymentInfo.amount.toLocaleString()}원)를 환불하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setIsRefunding(true);
    try {
      const response = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          paymentId: selectedCustomerForRefund.paymentInfo.id,
          reason: refundReason || '관리자 환불 처리',
        }),
      });

      const data = await response.json();

      if (data.ok) {
        alert(`✅ 환불이 완료되었습니다. (${selectedCustomerForRefund.paymentInfo.amount.toLocaleString()}원)`);
        setRefundModalOpen(false);
        setSelectedCustomerForRefund(null);
        setRefundReason('');
        if (onRefresh) {
          await onRefresh();
        } else {
          window.location.reload();
        }
      } else {
        alert(`❌ 환불 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('[CustomerTable] Refund error:', error);
      alert('❌ 환불 처리 중 오류가 발생했습니다.');
    } finally {
      setIsRefunding(false);
    }
  };

  // 환불 버튼 클릭 핸들러
  const handleOpenRefundModal = (customer: AdminCustomer) => {
    setSelectedCustomerForRefund(customer);
    setRefundReason('');
    setRefundModalOpen(true);
  };

  // 소유권 딱지 렌더링 함수 (고객 이름 옆에 표시)
  const renderOwnershipBadge = (customer: AdminCustomer) => {
    if (!customer.affiliateOwnership) {
      return null;
    }

    const ownership = customer.affiliateOwnership;
    let badgeLabel = '';
    let badgeColor = '';

    if (ownership.ownerType === 'BRANCH_MANAGER') {
      // 대리점장: "대리점장전혜선" 형식
      const name = ownership.ownerNickname || ownership.ownerName || '미지정';
      badgeLabel = `대리점장${name}`;
      badgeColor = 'bg-purple-100 text-purple-800 border-2 border-purple-400 font-bold';
    } else if (ownership.ownerType === 'SALES_AGENT') {
      // 판매원: "판매원홍길동" 형식
      const name = ownership.ownerNickname || ownership.ownerName || '미지정';
      badgeLabel = `판매원${name}`;
      badgeColor = 'bg-blue-100 text-blue-800 border-2 border-blue-400 font-bold';
      
      // 담당 대리점장 정보도 함께 표시
      if (ownership.managerProfile) {
        const managerName = ownership.managerProfile.nickname || ownership.managerProfile.displayName || '미지정';
        return (
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs ${badgeColor}`}>
              {badgeLabel}
            </span>
            <span className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-300 rounded-full text-xs">
              담당: {managerName}
            </span>
          </div>
        );
      }
    } else {
      return null;
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs ${badgeColor}`}>
        {badgeLabel}
      </span>
    );
  };

  // 상태 딱지 렌더링 함수
  const renderStatusBadges = (customer: AdminCustomer) => {
    const badges: Array<{ label: string; color: string }> = [];
    
    // 1. 관리자 딱지 (회색) - 최우선
    if (customer.customerType === 'admin' || customer.role === 'admin') {
      badges.push({ label: '관리자', color: 'bg-gray-100 text-gray-800 border border-gray-300' });
      return badges; // 관리자는 다른 딱지 표시 안 함
    }
    
    // 2. 파트너 딱지 (보라색/파란색) - 관리자 다음 우선순위
    if (customer.AffiliateProfile) {
      const profile = customer.AffiliateProfile;
      if (profile.type === 'BRANCH_MANAGER') {
        badges.push({ 
          label: '파트너 (대리점장)', 
          color: 'bg-purple-100 text-purple-800 border border-purple-300' 
        });
        if (profile.branchLabel) {
          badges.push({ 
            label: profile.branchLabel, 
            color: 'bg-purple-50 text-purple-700 border border-purple-200 text-xs' 
          });
        }
      } else if (profile.type === 'SALES_AGENT') {
        badges.push({ 
          label: '파트너 (판매원)', 
          color: 'bg-blue-100 text-blue-800 border border-blue-300' 
        });
        // 멘토 정보 표시
        if (customer.affiliateOwnership?.managerProfile) {
          const mentor = customer.affiliateOwnership.managerProfile;
          badges.push({ 
            label: `멘토: ${mentor.nickname || mentor.displayName || '미지정'}`, 
            color: 'bg-purple-50 text-purple-700 border border-purple-200 text-xs' 
          });
        } else if (customer.affiliateOwnership?.ownerType === 'HQ') {
          badges.push({ 
            label: '멘토: 본사', 
            color: 'bg-purple-50 text-purple-700 border border-purple-200 text-xs' 
          });
        }
      }
      return badges; // 파트너는 다른 딱지 표시 안 함
    }
    
    // 3. 관리자크루즈몰 딱지 (보라색)
    if (customer.customerType === 'mall-admin') {
      badges.push({ label: '관리자크루즈몰', color: 'bg-purple-100 text-purple-800 border border-purple-300' });
      return badges; // 관리자크루즈몰은 다른 딱지 표시 안 함
    }
    
    // 4. 테스트 고객 딱지 (주황색) - 크루즈가이드 지니 3일 체험
    // customerStatus: 'test', customerSource: 'test-guide' → 명확히 구분
    if (customer.customerType === 'test' || (customer.customerStatus === 'test' && customer.customerSource === 'test-guide')) {
      if (customer.status === 'test-locked' || customer.customerStatus === 'test-locked') {
        badges.push({ label: '3일체험 잠금', color: 'bg-gray-100 text-gray-800 border border-gray-300' });
      } else {
        badges.push({ label: '크루즈닷 3일 체험', color: 'bg-orange-100 text-orange-800 border border-orange-300 font-semibold' });
      }
      return badges; // 테스트 고객은 다른 딱지 표시 안 함
    }
    
    // 5. 전화상담 신청 고객 딱지 (분홍색) - 절대법칙: 크루즈몰 전화상담 버튼으로 이름과 연락처를 입력한 고객 (helpuser/helpphone)
    if (customer.customerSource === 'phone-consultation' || customer.customerSource === 'product-inquiry') {
      badges.push({ label: '전화상담신청', color: 'bg-pink-200 text-pink-900 border border-pink-400 font-bold' });
      // 전화상담 신청 고객은 잠재고객이지만, 전화상담신청 딱지가 우선 표시됨
    }
    
    // 6. 잠재고객 딱지 (노란색)
    if (customer.customerType === 'prospect' && customer.customerSource !== 'product-inquiry' && customer.customerSource !== 'phone-consultation') {
      badges.push({ label: '잠재고객', color: 'bg-yellow-100 text-yellow-800 border border-yellow-300' });
      return badges; // 잠재고객은 다른 딱지 표시 안 함
    }
    
    // 7. 크루즈몰 고객 딱지 (초록색)
    if (customer.customerType === 'mall') {
      badges.push({ label: '크루즈몰', color: 'bg-green-100 text-green-800 border border-green-300' });
    }
    
    // 8. 크루즈가이드 고객 딱지 (파란색) - 크루즈가이드 지니 (결제 고객)
    // customerStatus: 'active', customerSource: 'cruise-guide' → 명확히 구분
    if (customer.customerType === 'cruise-guide' || (customer.customerStatus === 'active' && customer.customerSource === 'cruise-guide')) {
      badges.push({ label: '크루즈닷 (결제)', color: 'bg-blue-100 text-blue-800 border border-blue-300 font-semibold' });
    }
    
    // 9. 통합 딱지 (보라색) - 연동된 고객
    if (customer.isLinked) {
      badges.push({ label: '통합', color: 'bg-purple-100 text-purple-800 border border-purple-300' });
    }
    
    // 10. 인증서 딱지 (구매확인서발동/환불인증완료)
    // 인증서 상태 표시
    if (customer.customerStatus === 'purchase_confirmed') {
      badges.push({ label: '구매인증서', color: 'bg-indigo-100 text-indigo-800 border border-indigo-300' });
    } else if (customer.customerStatus === 'refunded') {
      badges.push({ label: '환불인증서', color: 'bg-red-100 text-red-800 border border-red-300' });
    }

    // 11. 지니 상태 딱지 (크루즈가이드 또는 크루즈몰 고객의 지니 상태)
    if (customer.status) {
      if (customer.status === 'active' || customer.status === 'package') {
        badges.push({ label: '활성', color: 'bg-blue-100 text-blue-800 border border-blue-300' });
      } else if (customer.status === 'locked') {
        badges.push({ label: '잠금', color: 'bg-red-100 text-red-800 border border-red-300' });
      } else if (customer.status === 'dormant') {
        badges.push({ label: '동면', color: 'bg-yellow-100 text-yellow-800 border border-yellow-300' });
      }
    }
    
    return badges;
  };

  const sourceLabels: Record<AffiliateOwnershipSource, string> = {
    'self-profile': '자체 소속',
    'lead-agent': '리드 배정 (판매원)',
    'lead-manager': '리드 배정 (대리점장)',
    fallback: '본사 기본 배정',
  };

  const renderAffiliateOwnership = (ownership?: AffiliateOwnership | null) => {
    if (!ownership) {
      return (
        <div className="flex flex-col gap-1">
          <span className="px-2 py-1 bg-gray-100 text-gray-800 border border-gray-300 rounded text-xs font-medium w-fit">
            본사 직속
          </span>
        </div>
      );
    }
    
    const data: AffiliateOwnership = ownership;

    let badgeClass = 'bg-red-50 text-red-600 border border-red-200';
    let label = '본사 직속';
    if (data.ownerType === 'BRANCH_MANAGER') {
      badgeClass = 'bg-purple-50 text-purple-600 border border-purple-200';
      label = '대리점장';
    } else if (data.ownerType === 'SALES_AGENT') {
      badgeClass = 'bg-blue-50 text-blue-600 border border-blue-200';
      label = '판매원';
    }

    return (
      <div className="flex flex-col gap-1">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
          {label}
          {data.ownerName && (
            <span className="font-normal">
              {data.ownerName}
              {data.ownerAffiliateCode ? ` (${data.ownerAffiliateCode})` : ''}
            </span>
          )}
        </span>
        {data.ownerPhone && (
          <span className="text-[11px] text-gray-600 font-medium">
            연락처: {data.ownerPhone}
          </span>
        )}
        {data.ownerBranchLabel && (
          <span className="text-[11px] text-gray-500">
            소속 지점: {data.ownerBranchLabel}
          </span>
        )}
        {data.ownerType === 'SALES_AGENT' && data.managerProfile && (
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-[11px] font-medium text-purple-600">
            담당 대리점장
            <span className="font-normal">
              {data.managerProfile.nickname || data.managerProfile.displayName || '미지정'}
              {data.managerProfile.affiliateCode ? ` (${data.managerProfile.affiliateCode})` : ''}
            </span>
            {data.managerProfile.contactPhone && (
              <span className="text-[10px] text-purple-500">
                · {data.managerProfile.contactPhone}
              </span>
            )}
          </span>
        )}
        <span className="text-[11px] text-gray-400">
          {sourceLabels[data.source]}
          {data.leadStatus ? ` · 최근 리드 상태: ${data.leadStatus}` : ''}
        </span>
      </div>
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCustomers(new Set(customers.map(c => c.id)));
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleSelectCustomer = (customerId: number, checked: boolean) => {
    const newSelected = new Set(selectedCustomers);
    if (checked) {
      newSelected.add(customerId);
    } else {
      newSelected.delete(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleFieldEdit = (customerId: number, field: string, currentValue: any) => {
    setEditingField({ customerId, field, value: currentValue || '' });
  };

  const handleFieldSave = async (customerId: number, field: string, newValue: any) => {
    if (editingField && editingField.customerId === customerId && editingField.field === field) {
      // 값이 변경되지 않았으면 편집 모드만 종료
      if (editingField.value === newValue) {
        setEditingField(null);
        return;
      }
    }

    setSavingField(customerId);
    
    try {
      const updateData: any = {};
      
      // 필드별 데이터 변환
      if (field === 'name') {
        updateData.name = newValue || null;
      } else if (field === 'phone') {
        updateData.phone = newValue || null;
      } else if (field === 'email') {
        updateData.email = newValue || null;
      } else if (field === 'tripCount') {
        const count = parseInt(newValue, 10);
        if (isNaN(count) || count < 0) {
          alert('여행 횟수는 0 이상의 숫자여야 합니다.');
          setEditingField(null);
          setSavingField(null);
          return;
        }
        updateData.tripCount = count;
        updateData.autoIncrementTripCount = false; // 수동 입력이므로 자동 증가 비활성화
      } else if (field === 'currentTripEndDate') {
        if (newValue) {
          // 날짜 형식 검증
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(newValue)) {
            alert('날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)');
            setEditingField(null);
            setSavingField(null);
            return;
          }
          // currentTripEndDate 업데이트 및 최신 Trip의 endDate도 업데이트
          updateData.currentTripEndDate = newValue;
          
          // 최신 Trip의 endDate도 업데이트하기 위해 별도 API 호출 필요
          // 여기서는 currentTripEndDate만 업데이트하고, Trip 업데이트는 별도 처리
          // 실제로는 Trip의 endDate를 업데이트해야 하지만, 간단히 currentTripEndDate만 업데이트
        } else {
          updateData.currentTripEndDate = null;
        }
      } else if (field === 'status') {
        // 상태 변경
        if (newValue === 'active' || newValue === 'package') {
          updateData.status = newValue;
          updateData.isLocked = false;
          updateData.isHibernated = false;
        } else if (newValue === 'locked') {
          updateData.status = 'locked';
          updateData.isLocked = true;
          updateData.isHibernated = false;
        } else if (newValue === 'dormant') {
          updateData.status = 'dormant';
          updateData.isHibernated = true;
          updateData.isLocked = false;
        } else {
          updateData.status = null;
        }
      }

      const response = await fetch(`/api/admin/users/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || '정보 수정에 실패했습니다.');
      }

      setEditingField(null);
      
      // 테이블 새로고침
      if (onRefresh) {
        await onRefresh();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('[CustomerTable] Failed to update field:', error);
      alert(`❌ 정보 수정 실패\n\n${error instanceof Error ? error.message : '정보 수정 중 오류가 발생했습니다.'}`);
      setEditingField(null);
    } finally {
      setSavingField(null);
    }
  };

  const handleFieldCancel = () => {
    setEditingField(null);
  };

  const handleResetPassword = async (customerId: number, currentPassword: string | null) => {
    const newPassword = prompt(
      `비밀번호를 변경하세요:\n\n현재 비밀번호: ${currentPassword || '(없음)'}`,
      currentPassword || '3800'
    );
    
    if (!newPassword) return;
    
    if (newPassword.length < 4) {
      alert('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }
    
    if (!confirm(`비밀번호를 "${newPassword}"로 변경하시겠습니까?`)) return;
    
    setResettingPassword(customerId);
    
    try {
      const response = await fetch(`/api/admin/users/${customerId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: newPassword }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        throw new Error(data.error || '비밀번호 변경에 실패했습니다.');
      }
      
      alert(`✅ 비밀번호가 "${newPassword}"로 변경되었습니다.`);
      
      // 테이블 새로고침
      if (onRefresh) {
        await onRefresh();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('[CustomerTable] Failed to reset password:', error);
      alert(`❌ 비밀번호 변경 실패\n\n${error instanceof Error ? error.message : '비밀번호 변경 중 오류가 발생했습니다.'}`);
    } finally {
      setResettingPassword(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCustomers.size === 0) {
      alert('삭제할 고객을 선택해주세요.');
      return;
    }

    const customerNames = customers
      .filter(c => selectedCustomers.has(c.id))
      .map(c => c.name || `ID: ${c.id}`)
      .join(', ');

    const confirmed = confirm(
      `선택한 ${selectedCustomers.size}명의 고객을 삭제하시겠습니까?\n\n` +
      `고객: ${customerNames}\n\n` +
      `⚠️ 이 작업은 되돌릴 수 없습니다.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedCustomers).map(async (customerId) => {
        console.log(`[CustomerTable] Deleting user ${customerId}...`);
        
        const response = await fetch(`/api/admin/users/${customerId}/delete`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log(`[CustomerTable] Response for user ${customerId}:`, {
          status: response.status,
          ok: response.ok,
        });

        const responseText = await response.text();
        console.log(`[CustomerTable] Response text for user ${customerId}:`, responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`[CustomerTable] JSON parse error for user ${customerId}:`, parseError);
          throw new Error(`서버 응답 파싱 실패: ${responseText.substring(0, 100)}`);
        }

        if (!response.ok || !data.ok) {
          const errorMsg = data.error || data.errorMessage || `고객 ID ${customerId} 삭제 실패`;
          console.error(`[CustomerTable] Delete failed for user ${customerId}:`, data);
          throw new Error(`${errorMsg} (ID: ${customerId})`);
        }
        
        console.log(`[CustomerTable] Successfully deleted user ${customerId}`);
        return customerId;
      });

      await Promise.all(deletePromises);
      alert(`✅ 성공!\n\n${selectedCustomers.size}명의 고객이 삭제되었습니다.`);
      setSelectedCustomers(new Set());
      // 삭제 후 목록 갱신
      if (onRefresh) {
        await onRefresh();
      } else {
        // onRefresh가 없으면 페이지 새로고침
        window.location.reload();
      }
    } catch (error) {
      console.error('[CustomerTable] Failed to delete customers:', error);
      const errorMessage = error instanceof Error ? error.message : '고객 삭제 중 오류가 발생했습니다.';
      alert(`❌ 삭제 실패\n\n${errorMessage}\n\n콘솔을 확인해주세요.`);
      // 에러 발생 시에도 선택 해제
      setSelectedCustomers(new Set());
    } finally {
      setIsDeleting(false);
    }
  };


  const handleStartTrip = async (userId: number) => {
    const endDate = prompt('여행 종료일을 입력하세요 (YYYY-MM-DD):');
    if (!endDate) return;

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(endDate)) {
      alert('날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)');
      return;
    }

    const confirmed = confirm(
      `이 고객의 새 여행을 시작하시겠습니까?\n\n` +
      `- 비밀번호가 3800으로 초기화됩니다.\n` +
      `- 여행 횟수가 1 증가합니다.\n` +
      `- 온보딩을 다시 진행하게 됩니다.\n` +
      `- 여행 종료일: ${endDate}`
    );

    if (!confirmed) return;

    setProcessing(userId);

    try {
      const res = await fetch('/api/admin/start-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, endDate }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || '여행 시작 실패');
      }

      alert(data.message || '여행이 시작되었습니다.');
      window.location.reload();
    } catch (error: any) {
      alert('오류: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const allSelected = customers.length > 0 && selectedCustomers.size === customers.length;
  const someSelected = selectedCustomers.size > 0 && selectedCustomers.size < customers.length;

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      {selectedCustomers.size > 0 && (
        <div className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between">
          <span className="font-medium">
            {selectedCustomers.size}명 선택됨
          </span>
          <button
            onClick={handleDeleteSelected}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '삭제 중...' : '선택한 고객 삭제'}
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-4 text-left font-semibold">ID</th>
              <th className="px-6 py-4 text-left font-semibold">가입일</th>
              <th className="px-6 py-4 text-left font-semibold">고객 유형</th>
              <th className="px-6 py-4 text-left font-semibold">소속</th>
              <th className="px-6 py-4 text-left font-semibold">아이디</th>
              <th className="px-6 py-4 text-left font-semibold">비밀번호</th>
              <th className="px-6 py-4 text-left font-semibold">이름</th>
              <th className="px-6 py-4 text-left font-semibold">연락처</th>
              <th className="px-6 py-4 text-left font-semibold">이메일</th>
              <th className="px-6 py-4 text-left font-semibold">구매 정보</th>
              <th className="px-6 py-4 text-left font-semibold">여권 상태</th>
              <th className="px-6 py-4 text-left font-semibold">구매/환불</th>
              <th className="px-6 py-4 text-left font-semibold">관리</th>
            </tr>
          </thead>
          <tbody className="text-brand-neutral">
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-gray-600 hover:bg-gray-700">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.has(customer.id)}
                    onChange={(e) => handleSelectCustomer(customer.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4">{customer.id}</td>
                <td className="px-6 py-4">
                  {new Date(customer.createdAt).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {customer.customerType === 'test' && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 border border-orange-300 rounded text-xs font-medium w-fit">테스트</span>
                    )}
                    {customer.customerType === 'prospect' && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded text-xs font-medium w-fit">잠재고객</span>
                    )}
                    {customer.customerType === 'mall' && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 border border-green-300 rounded text-xs font-medium w-fit">메인몰</span>
                    )}
                    {customer.customerType === 'cruise-guide' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded text-xs font-medium w-fit">크루즈가이드</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 align-top">
                  {renderAffiliateOwnership(customer.affiliateOwnership)}
                </td>
                <td className="px-6 py-4">
                  {customer.mallUserId || '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {customer.currentPassword || '-'}
                    </span>
                    <button
                      onClick={() => handleResetPassword(customer.id, customer.currentPassword || null)}
                      disabled={resettingPassword === customer.id}
                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="비밀번호 수정"
                    >
                      <FiEdit2 size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium">
                  {editingField?.customerId === customer.id && editingField?.field === 'name' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingField.value}
                        onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFieldSave(customer.id, 'name', editingField.value);
                          } else if (e.key === 'Escape') {
                            handleFieldCancel();
                          }
                        }}
                      />
                      <button
                        onClick={() => handleFieldSave(customer.id, 'name', editingField.value)}
                        disabled={savingField === customer.id}
                        className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                        title="저장"
                      >
                        <FiCheck size={16} />
                      </button>
                      <button
                        onClick={handleFieldCancel}
                        className="p-1 text-red-600 hover:text-red-700"
                        title="취소"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className="cursor-pointer hover:text-blue-400"
                          onClick={() => handleFieldEdit(customer.id, 'name', customer.name)}
                        >
                          {customer.name || '-'}
                        </span>
                        {/* 소유권 딱지: 대리점장전혜선, 판매원홍길동 형식 */}
                        {renderOwnershipBadge(customer)}
                      </div>
                      <CustomerStatusBadges
                        testModeStartedAt={customer.testModeStartedAt}
                        customerStatus={customer.customerStatus}
                        customerSource={customer.customerSource}
                        mallUserId={customer.mallUserId}
                        totalTripCount={customer.totalTripCount || 0}
                      />
                      <button
                        onClick={() => handleFieldEdit(customer.id, 'name', customer.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:text-blue-700"
                        title="이름 수정"
                      >
                        <FiEdit2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingField?.customerId === customer.id && editingField?.field === 'phone' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingField.value}
                        onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFieldSave(customer.id, 'phone', editingField.value);
                          } else if (e.key === 'Escape') {
                            handleFieldCancel();
                          }
                        }}
                      />
                      <button
                        onClick={() => handleFieldSave(customer.id, 'phone', editingField.value)}
                        disabled={savingField === customer.id}
                        className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                        title="저장"
                      >
                        <FiCheck size={16} />
                      </button>
                      <button
                        onClick={handleFieldCancel}
                        className="p-1 text-red-600 hover:text-red-700"
                        title="취소"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span 
                        className="cursor-pointer hover:text-blue-400"
                        onClick={() => handleFieldEdit(customer.id, 'phone', customer.phone)}
                      >
                        {customer.phone || '-'}
                      </span>
                      <button
                        onClick={() => handleFieldEdit(customer.id, 'phone', customer.phone)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:text-blue-700"
                        title="전화번호 수정"
                      >
                        <FiEdit2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
                {/* 이메일 컬럼 */}
                <td className="px-6 py-4">
                  {editingField?.customerId === customer.id && editingField?.field === 'email' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={editingField.value}
                        onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm w-40"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFieldSave(customer.id, 'email', editingField.value);
                          } else if (e.key === 'Escape') {
                            handleFieldCancel();
                          }
                        }}
                      />
                      <button
                        onClick={() => handleFieldSave(customer.id, 'email', editingField.value)}
                        disabled={savingField === customer.id}
                        className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                        title="저장"
                      >
                        <FiCheck size={16} />
                      </button>
                      <button
                        onClick={handleFieldCancel}
                        className="p-1 text-red-600 hover:text-red-700"
                        title="취소"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span 
                        className="cursor-pointer hover:text-blue-400 break-all"
                        onClick={() => handleFieldEdit(customer.id, 'email', customer.email)}
                      >
                        {customer.email || '-'}
                      </span>
                      <button
                        onClick={() => handleFieldEdit(customer.id, 'email', customer.email)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:text-blue-700"
                        title="이메일 수정"
                      >
                        <FiEdit2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
                {/* 구매 정보 컬럼 */}
                <td className="px-6 py-4">
                  {(() => {
                    const hasReservation = (customer as any).hasReservation;
                    const reservationCount = (customer as any).reservationCount || 0;
                    const refundCount = customer.metadata?.refundCount || 0;
                    
                    return (
                      <div className="flex flex-col gap-1.5">
                        {/* 구매 정보 */}
                        {hasReservation || reservationCount > 0 ? (
                          <>
                            <span className="px-2 py-1 bg-green-100 text-green-800 border border-green-300 rounded text-xs font-medium w-fit">
                              구매 고객
                            </span>
                            {reservationCount > 0 && (
                              <span className="text-xs text-gray-600">예약 {reservationCount}건</span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                        {refundCount > 0 && customer.customerStatus !== 'refunded' && (
                          <div className="mt-1">
                            <span className="px-2 py-1 bg-red-100 text-red-800 border border-red-300 rounded text-xs font-medium w-fit">
                              환불 {refundCount}회
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </td>
                {/* 여권 상태 컬럼 */}
                <td className="px-6 py-4">
                  {(() => {
                    const passportStatus = (customer as any).passportStatus;
                    let passportInfo = (customer as any).passportInfo;
                    
                    // passportInfo가 문자열인 경우 파싱
                    if (passportInfo && typeof passportInfo === 'string') {
                      try {
                        passportInfo = JSON.parse(passportInfo);
                      } catch (e) {
                        console.error(`[Passport Debug] Failed to parse passportInfo for customer ${customer.id}:`, e);
                        passportInfo = null;
                      }
                    }
                    
                    // 디버깅: 여권 정보 확인
                    if (process.env.NODE_ENV === 'development' && customer.id) {
                      console.log(`[Passport Debug Frontend] Customer ${customer.id}:`, {
                        hasPassportInfo: !!passportInfo,
                        passportInfoType: typeof passportInfo,
                        passportInfo,
                        hasReservation: (customer as any).hasReservation,
                      });
                    }
                    
                    if (passportInfo) {
                      const { totalPeople = 0, travelersWithPassport = 0, missingCount = 0, expiredCount = 0, expiringCount = 0 } = passportInfo;
                      
                      // 디버깅: 여권 정보 상세 확인
                      if (process.env.NODE_ENV === 'development' && customer.id) {
                        console.log(`[Passport Debug Detail] Customer ${customer.id}:`, {
                          totalPeople,
                          travelersWithPassport,
                          missingCount,
                          expiredCount,
                          expiringCount,
                          passportInfoKeys: Object.keys(passportInfo),
                        });
                      }
                      
                      // 이미 만료된 여권이 있는 경우 (최우선)
                      if (expiredCount > 0) {
                        return (
                          <span className="px-2 py-1 bg-red-100 text-red-800 border-2 border-red-500 rounded text-xs font-bold animate-pulse">
                            🚨 만료 {expiredCount}건
                          </span>
                        );
                      }

                      // 6개월 이내 만료 예정인 여권이 있는 경우
                      if (expiringCount > 0) {
                        return (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 border-2 border-orange-500 rounded text-xs font-bold">
                            ⚠️ 6개월내 만료 {expiringCount}건
                          </span>
                        );
                      }
                      
                      // totalPeople이 0이거나 없어도 travelersWithPassport가 있으면 표시
                      if (totalPeople > 0) {
                        if (missingCount > 0) {
                          return (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-400 rounded text-xs font-medium">
                              ⚠️ {travelersWithPassport}/{totalPeople}명
                            </span>
                          );
                        } else if (travelersWithPassport === totalPeople) {
                          return (
                            <span className="px-2 py-1 bg-green-100 text-green-800 border border-green-400 rounded text-xs font-medium">
                              ✅ {totalPeople}명 완료
                            </span>
                          );
                        } else if (travelersWithPassport > 0) {
                          // 일부만 등록된 경우
                          return (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-400 rounded text-xs font-medium">
                              ⚠️ {travelersWithPassport}/{totalPeople}명
                            </span>
                          );
                        }
                      } else if (travelersWithPassport > 0) {
                        // totalPeople이 없거나 0이지만 여권이 등록된 경우
                        return (
                          <span className="px-2 py-1 bg-green-100 text-green-800 border border-green-400 rounded text-xs font-medium">
                            ✅ {travelersWithPassport}명 등록
                          </span>
                        );
                      }
                    }
                    return <span className="text-gray-400 text-sm">-</span>;
                  })()}
                </td>
                {/* 구매/환불 인증서 컬럼 */}
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    {customer.customerStatus === 'purchase_confirmed' && (
                      <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 border-2 border-indigo-400 rounded text-xs font-bold w-fit">
                        ✅ 구매인증서
                      </span>
                    )}
                    {customer.customerStatus === 'refunded' && (
                      <span className="px-2.5 py-1 bg-red-100 text-red-800 border-2 border-red-400 rounded text-xs font-bold w-fit">
                        💰 환불인증서
                      </span>
                    )}
                    {!customer.customerStatus || (customer.customerStatus !== 'purchase_confirmed' && customer.customerStatus !== 'refunded') ? (
                      <span className="text-gray-400 text-sm">-</span>
                    ) : null}

                    {/* 환불 버튼 - 결제 완료 상태이고 아직 환불되지 않은 경우에만 표시 */}
                    {customer.paymentInfo?.canRefund && customer.customerStatus !== 'refunded' && (
                      <button
                        onClick={() => handleOpenRefundModal(customer)}
                        className="mt-1 px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors w-fit"
                      >
                        환불
                      </button>
                    )}
                    {/* 이미 환불된 경우 표시 */}
                    {customer.paymentInfo && !customer.paymentInfo.canRefund && customer.paymentInfo.cancelledAt && (
                      <span className="text-xs text-gray-500 mt-1">
                        환불완료: {new Date(customer.paymentInfo.cancelledAt).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCustomerForDetail(customer.id);
                        setDetailModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      title="상세 보기"
                    >
                      <FiEye size={16} />
                      상세
                    </button>
                    {/* 통합 상세 (AffiliateLead 기반) */}
                    {customer.affiliateOwnership?.leadId && (
                      <button
                        onClick={() => {
                          setSharedDetailLeadId(customer.affiliateOwnership!.leadId!);
                          setShowSharedDetailModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                        title="통합 상세 (상담기록 공유)"
                      >
                        <FiFileText size={16} />
                        통합
                      </button>
                    )}
                    {/* 기록 버튼 삭제됨 - 상세보기 모달의 상담기록 탭으로 통합 */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CustomerNoteModal 삭제됨 - CustomerDetailModal의 상담기록 탭으로 통합 */}

      {/* 상세보기 모달 */}
      {selectedCustomerForDetail && (
        <CustomerDetailModal
          customerId={selectedCustomerForDetail}
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedCustomerForDetail(null);
          }}
        />
      )}

      {/* 공통 고객 상세 모달 (AffiliateLead 기반) */}
      {sharedDetailLeadId && (
        <SharedCustomerDetailModal
          leadId={sharedDetailLeadId}
          isOpen={showSharedDetailModal}
          onClose={() => {
            setShowSharedDetailModal(false);
            setSharedDetailLeadId(null);
          }}
          viewerType="HQ"
          onCustomerUpdate={() => onRefresh?.()}
          onTransfer={async (leadId, targetType, targetProfileId) => {
            try {
              const res = await fetch('/api/shared/customers/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ leadIds: [leadId], targetType, targetProfileId }),
              });
              const json = await res.json();
              if (res.ok && json.ok) {
                alert(json.message);
                setShowSharedDetailModal(false);
                setSharedDetailLeadId(null);
                onRefresh?.();
              } else {
                alert(json.message || 'DB 전달에 실패했습니다.');
              }
            } catch (error) {
              alert('DB 전달 중 오류가 발생했습니다.');
            }
          }}
          onRecall={async (leadId) => {
            try {
              const res = await fetch('/api/shared/customers/recall', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ leadIds: [leadId] }),
              });
              const json = await res.json();
              if (res.ok && json.ok) {
                alert(json.message);
                setShowSharedDetailModal(false);
                setSharedDetailLeadId(null);
                onRefresh?.();
              } else {
                alert(json.message || 'DB 회수에 실패했습니다.');
              }
            } catch (error) {
              alert('DB 회수 중 오류가 발생했습니다.');
            }
          }}
        />
      )}

      {/* 환불 모달 */}
      {refundModalOpen && selectedCustomerForRefund && selectedCustomerForRefund.paymentInfo && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRefundModalOpen(false);
              setSelectedCustomerForRefund(null);
              setRefundReason('');
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-red-50 px-6 py-4 rounded-t-2xl">
              <h2 className="text-xl font-bold text-red-800">환불 처리</h2>
              <button
                onClick={() => {
                  setRefundModalOpen(false);
                  setSelectedCustomerForRefund(null);
                  setRefundReason('');
                }}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* 내용 */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                <h4 className="mb-3 text-lg font-semibold text-red-800">결제 정보</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-500">고객명</p>
                    <p className="text-base text-gray-900">{selectedCustomerForRefund.name || selectedCustomerForRefund.paymentInfo.buyerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">연락처</p>
                    <p className="text-base text-gray-900">{selectedCustomerForRefund.phone || selectedCustomerForRefund.paymentInfo.buyerTel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">결제 금액</p>
                    <p className="text-2xl font-bold text-red-600">{selectedCustomerForRefund.paymentInfo.amount.toLocaleString()}원</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">결제일</p>
                    <p className="text-base text-gray-900">
                      {selectedCustomerForRefund.paymentInfo.paidAt
                        ? new Date(selectedCustomerForRefund.paymentInfo.paidAt).toLocaleDateString('ko-KR')
                        : '-'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">상품명</p>
                    <p className="text-sm text-gray-700">{selectedCustomerForRefund.paymentInfo.productName || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">주문번호</p>
                    <p className="text-sm text-gray-700 font-mono">{selectedCustomerForRefund.paymentInfo.orderId}</p>
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

              {/* 경고 */}
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ 환불 처리 시 결제가 취소되며, 이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => {
                  setRefundModalOpen(false);
                  setSelectedCustomerForRefund(null);
                  setRefundReason('');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRefund}
                disabled={isRefunding}
                className="rounded-lg bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isRefunding ? (
                  <>
                    <FiClock className="animate-spin" />
                    처리 중...
                  </>
                ) : (
                  '환불 처리'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
