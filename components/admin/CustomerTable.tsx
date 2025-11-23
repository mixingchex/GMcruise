'use client';

import { useState } from 'react';
import { FiEdit2, FiCheck, FiX, FiFileText } from 'react-icons/fi';
import CustomerStatusBadges from '@/components/CustomerStatusBadges';
import CustomerNoteModal from '@/components/admin/CustomerNoteModal';

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
  leadStatus?: string | null;
  leadCreatedAt?: string | null;
};

interface Customer {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  tripCount: number;
  totalTripCount: number;
  isHibernated: boolean;
  isLocked: boolean;
  customerStatus: string | null;
  status?: 'active' | 'package' | 'dormant' | 'locked' | 'test' | 'test-locked' | null; // 지니 상태
  customerType?: 'cruise-guide' | 'mall' | 'test' | 'prospect' | 'admin' | 'mall-admin' | 'partner'; // 고객 분류
  isMallUser?: boolean; // 크루즈몰 고객 여부
  isLinked?: boolean; // 연동 여부 (크루즈 가이드 고객이 mallUserId를 가진 경우)
  mallUserId?: string | null; // 크루즈몰 사용자 ID
  mallNickname?: string | null; // 크루즈몰 닉네임
  kakaoChannelAdded?: boolean; // 카카오 채널 추가 여부
  kakaoChannelAddedAt?: string | null; // 카카오 채널 추가 일시
  pwaGenieInstalledAt?: string | null; // 크루즈가이드 지니 바탕화면 추가 일시
  pwaMallInstalledAt?: string | null; // 크루즈몰 바탕화면 추가 일시
  currentTripEndDate: string | null;
  currentPassword?: string | null;
  role?: string | null; // 사용자 역할
  testModeStartedAt?: string | null; // 테스트 모드 시작일
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
    companionType: string | null;
    destination: any;
    startDate: string | null;
    endDate: string | null;
  }[];
  daysRemaining?: number | null; // 여행 종료일까지 남은 일수
  affiliateOwnership?: AffiliateOwnership | null;
  metadata?: any; // 메타데이터 (환불 횟수 등)
  updatedAt?: string; // 업데이트 날짜
}

interface Props {
  customers: Customer[];
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
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedCustomerForNote, setSelectedCustomerForNote] = useState<{ id: number; name: string | null } | null>(null);

  // 소유권 딱지 렌더링 함수 (고객 이름 옆에 표시)
  const renderOwnershipBadge = (customer: Customer) => {
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
  const renderStatusBadges = (customer: Customer) => {
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
    
    // 4. 테스트 고객 딱지 (주황색)
    if (customer.customerType === 'test') {
      if (customer.status === 'test-locked') {
        badges.push({ label: '테스트잠금', color: 'bg-gray-100 text-gray-800 border border-gray-300' });
      } else {
        badges.push({ label: '테스트가이드', color: 'bg-orange-100 text-orange-800 border border-orange-300' });
      }
      return badges; // 테스트 고객은 다른 딱지 표시 안 함
    }
    
    // 5. 잠재고객 딱지 (노란색)
    if (customer.customerType === 'prospect') {
      badges.push({ label: '잠재고객', color: 'bg-yellow-100 text-yellow-800 border border-yellow-300' });
      return badges; // 잠재고객은 다른 딱지 표시 안 함
    }
    
    // 6. 크루즈몰 고객 딱지 (초록색)
    if (customer.customerType === 'mall') {
      badges.push({ label: '크루즈몰', color: 'bg-green-100 text-green-800 border border-green-300' });
    }
    
    // 7. 크루즈가이드 고객 딱지 (파란색)
    if (customer.customerType === 'cruise-guide') {
      badges.push({ label: '크루즈가이드', color: 'bg-blue-100 text-blue-800 border border-blue-300' });
    }
    
    // 8. 통합 딱지 (보라색) - 연동된 고객
    if (customer.isLinked) {
      badges.push({ label: '통합', color: 'bg-purple-100 text-purple-800 border border-purple-300' });
    }
    
    // 9. 인증서 딱지 (구매확인서발동/환불인증완료)
    if (customer.customerStatus === 'purchase_confirmed') {
      badges.push({ label: '구매확인서발동', color: 'bg-indigo-100 text-indigo-800 border border-indigo-300' });
    } else if (customer.customerStatus === 'refunded') {
      badges.push({ label: '환불인증완료', color: 'bg-red-100 text-red-800 border border-red-300' });
    }

    // 10. 지니 상태 딱지 (크루즈가이드 또는 크루즈몰 고객의 지니 상태)
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
      if (onRefresh) {
        await onRefresh();
      } else {
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
    <div className="bg-brand-light-dark rounded-lg shadow-xl overflow-hidden">
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
          <thead className="bg-brand-red text-white">
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
              <th className="px-6 py-4 text-left font-semibold">고객 유형</th>
              <th className="px-6 py-4 text-left font-semibold">소속</th>
              <th className="px-6 py-4 text-left font-semibold">이름</th>
              <th className="px-6 py-4 text-left font-semibold">핸드폰</th>
              <th className="px-6 py-4 text-left font-semibold">이메일</th>
              <th className="px-6 py-4 text-left font-semibold">비밀번호</th>
              <th className="px-6 py-4 text-left font-semibold">카카오 채널</th>
              <th className="px-6 py-4 text-left font-semibold">PWA 설치</th>
              <th className="px-6 py-4 text-left font-semibold">가입일</th>
              <th className="px-6 py-4 text-left font-semibold">상태</th>
              <th className="px-6 py-4 text-left font-semibold">구매 정보</th>
              <th className="px-6 py-4 text-left font-semibold">여권 상태</th>
              <th className="px-6 py-4 text-left font-semibold">여행 횟수</th>
              <th className="px-6 py-4 text-left font-semibold">현재 여행 종료일</th>
              <th className="px-6 py-4 text-left font-semibold">최근 여행</th>
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
                        mallUserId={customer.mallUserId}
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
                        className="cursor-pointer hover:text-blue-400"
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
                <td className="px-6 py-4">
                  {customer.kakaoChannelAdded ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                        ✓ 추가됨
                      </span>
                      {customer.kakaoChannelAddedAt && (
                        <span className="text-xs text-gray-400" title={new Date(customer.kakaoChannelAddedAt).toLocaleString('ko-KR')}>
                          {new Date(customer.kakaoChannelAddedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300">
                      미추가
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {customer.pwaGenieInstalledAt ? (
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800 border border-pink-300">
                          📲 지니
                        </span>
                        <span className="text-xs text-gray-400" title={new Date(customer.pwaGenieInstalledAt).toLocaleString('ko-KR')}>
                          {new Date(customer.pwaGenieInstalledAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ) : null}
                    {customer.pwaMallInstalledAt ? (
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                          📲 몰
                        </span>
                        <span className="text-xs text-gray-400" title={new Date(customer.pwaMallInstalledAt).toLocaleString('ko-KR')}>
                          {new Date(customer.pwaMallInstalledAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ) : null}
                    {!customer.pwaGenieInstalledAt && !customer.pwaMallInstalledAt && (
                      <span className="text-xs text-gray-400">미설치</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {new Date(customer.createdAt).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-6 py-4">
                  {editingField?.customerId === customer.id && editingField?.field === 'status' ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={customer.status || ''}
                        onChange={(e) => {
                          const newStatus = e.target.value || null;
                          handleFieldSave(customer.id, 'status', newStatus);
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                        autoFocus
                      >
                        <option value="">상태 없음</option>
                        <option value="active">활성</option>
                        <option value="package">패키지</option>
                        <option value="locked">가이드잠금</option>
                        <option value="dormant">동면</option>
                      </select>
                      <button
                        onClick={handleFieldCancel}
                        className="p-1 text-red-600 hover:text-red-700"
                        title="취소"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 group">
                      {renderStatusBadges(customer).map((badge, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                      <button
                        onClick={() => handleFieldEdit(customer.id, 'status', customer.status)}
                        className="opacity-0 group-hover:opacity-100 ml-1 p-1 text-blue-500 hover:text-blue-700"
                        title="상태 수정"
                      >
                        <FiEdit2 size={12} />
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
                      <div className="flex flex-col gap-1">
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
                        {refundCount > 0 && (
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
                    const passportInfo = (customer as any).passportInfo;
                    
                    if (passportInfo) {
                      const { totalPeople, travelersWithPassport, missingCount, expiredCount, expiringCount, expiredPassports, expiringPassports } = passportInfo;
                      
                      // 이미 만료된 여권이 있는 경우 (최우선)
                      if (expiredCount > 0) {
                        const expiredNames = expiredPassports?.map((p: any) => `${p.name} (${new Date(p.expiryDate).toLocaleDateString('ko-KR')})`).join(', ') || '';
                        return (
                          <div className="space-y-1">
                            <span 
                              className="px-2 py-1 bg-red-100 text-red-800 border border-red-300 rounded text-xs font-bold cursor-help"
                              title={`만료된 여권: ${expiredNames}`}
                            >
                              🚨 여권 만료됨 ({expiredCount}명)
                            </span>
                          </div>
                        );
                      }
                      
                      // 6개월 이내 만료 예정인 여권이 있는 경우
                      if (expiringCount > 0) {
                        const expiringNames = expiringPassports?.map((p: any) => `${p.name} (${new Date(p.expiryDate).toLocaleDateString('ko-KR')})`).join(', ') || '';
                        return (
                          <div className="space-y-1">
                            <span 
                              className="px-2 py-1 bg-orange-100 text-orange-800 border-2 border-orange-400 rounded text-xs font-bold cursor-help animate-pulse"
                              title={`6개월 이내 만료: ${expiringNames}`}
                            >
                              ⚠️ 만료 임박 ({expiringCount}명)
                            </span>
                          </div>
                        );
                      }
                      
                      if (totalPeople > 0) {
                        if (missingCount > 0) {
                          return (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded text-xs font-medium">
                              ⚠️ 여권 부족 ({missingCount}명)
                            </span>
                          );
                        } else if (travelersWithPassport === totalPeople) {
                          return (
                            <span className="px-2 py-1 bg-green-100 text-green-800 border border-green-300 rounded text-xs font-medium">
                              ✅ 여권 완료
                            </span>
                          );
                        }
                      }
                    }
                    return <span className="text-gray-400 text-sm">-</span>;
                  })()}
                </td>
                <td className="px-6 py-4">
                  {editingField?.customerId === customer.id && editingField?.field === 'tripCount' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editingField.value}
                        onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm w-20"
                        min="0"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFieldSave(customer.id, 'tripCount', editingField.value);
                          } else if (e.key === 'Escape') {
                            handleFieldCancel();
                          }
                        }}
                      />
                      <button
                        onClick={() => handleFieldSave(customer.id, 'tripCount', editingField.value)}
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
                        className="bg-magic-gold text-brand-dark px-3 py-1 rounded-full text-sm font-bold cursor-pointer hover:bg-yellow-400"
                        onClick={() => handleFieldEdit(customer.id, 'tripCount', customer.tripCount)}
                      >
                        {customer.tripCount}회
                      </span>
                      <button
                        onClick={() => handleFieldEdit(customer.id, 'tripCount', customer.tripCount)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:text-blue-700"
                        title="여행 횟수 수정"
                      >
                        <FiEdit2 size={12} />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingField?.customerId === customer.id && editingField?.field === 'currentTripEndDate' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={editingField.value ? new Date(editingField.value).toISOString().split('T')[0] : ''}
                        onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleFieldSave(customer.id, 'currentTripEndDate', editingField.value);
                          } else if (e.key === 'Escape') {
                            handleFieldCancel();
                          }
                        }}
                      />
                      <button
                        onClick={() => handleFieldSave(customer.id, 'currentTripEndDate', editingField.value)}
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
                      {customer.currentTripEndDate ? (
                        <>
                          <div className="text-sm cursor-pointer hover:text-blue-400" onClick={() => handleFieldEdit(customer.id, 'currentTripEndDate', customer.currentTripEndDate)}>
                            <div>{new Date(customer.currentTripEndDate).toLocaleDateString('ko-KR')}</div>
                            {customer.daysRemaining !== null && customer.daysRemaining !== undefined && (
                              <div className={`text-xs mt-1 ${
                                customer.daysRemaining <= 0 
                                  ? 'text-red-600 font-bold' 
                                  : customer.daysRemaining <= 7 
                                  ? 'text-orange-600 font-semibold' 
                                  : 'text-gray-600'
                              }`}>
                                {customer.daysRemaining > 0 
                                  ? `D-${customer.daysRemaining}` 
                                  : customer.daysRemaining === 0 
                                  ? 'D-Day' 
                                  : `종료됨 (${Math.abs(customer.daysRemaining)}일 전)`}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleFieldEdit(customer.id, 'currentTripEndDate', customer.currentTripEndDate)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:text-blue-700"
                            title="여행 종료일 수정"
                          >
                            <FiEdit2 size={12} />
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {customer.trips.length > 0 ? (
                    <div className="text-sm">
                      <div className="font-medium">{customer.trips[0].cruiseName}</div>
                      <div className="text-gray-400">
                        {Array.isArray(customer.trips[0].destination)
                          ? customer.trips[0].destination.join(', ')
                          : customer.trips[0].destination}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">여행 없음</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCustomerForNote({ id: customer.id, name: customer.name });
                        setNoteModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                      title="고객 기록 작성"
                    >
                      <FiFileText size={16} />
                      기록
                    </button>
                    <a
                      href={`/admin/users/${customer.id}`}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      상세 보기
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 고객 기록 모달 */}
      {selectedCustomerForNote && (
        <CustomerNoteModal
          customerId={selectedCustomerForNote.id}
          customerName={selectedCustomerForNote.name}
          isOpen={noteModalOpen}
          onClose={() => {
            setNoteModalOpen(false);
            setSelectedCustomerForNote(null);
          }}
          onNoteAdded={() => {
            if (onRefresh) {
              onRefresh();
            }
          }}
        />
      )}
    </div>
  );
}
