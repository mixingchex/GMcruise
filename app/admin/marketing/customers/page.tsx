'use client';

import { useState, useEffect, useRef } from 'react';
import { FiSearch, FiUpload, FiDownload, FiPlus, FiX, FiMessageSquare, FiCalendar, FiUsers } from 'react-icons/fi';
import { showSuccess, showError, showWarning } from '@/components/ui/Toast';

interface MarketingCustomer {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  groups?: Array<{
    id: number;
    name: string;
    color: string | null;
  }>;
}

interface CustomerGroup {
  id: number;
  name: string;
  color: string | null;
}

export default function MarketingCustomersPage() {
  const [customers, setCustomers] = useState<MarketingCustomer[]>([]);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  
  // 필터 상태
  const [includeGroups, setIncludeGroups] = useState<number[]>([]);
  const [includeGroupsOperator, setIncludeGroupsOperator] = useState<'AND' | 'OR'>('OR');
  const [excludeGroups, setExcludeGroups] = useState<number[]>([]);
  const [inflowDateStart, setInflowDateStart] = useState('');
  const [inflowDateEnd, setInflowDateEnd] = useState('');
  const [daySearch, setDaySearch] = useState('');
  const [emailField, setEmailField] = useState(false);
  const [emailSelect, setEmailSelect] = useState('');
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // 모달 상태
  const [showGroupMessageModal, setShowGroupMessageModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showGroupSelectModal, setShowGroupSelectModal] = useState(false);
  const [groupSelectType, setGroupSelectType] = useState<'include' | 'exclude'>('include');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<MarketingCustomer | null>(null);
  const [customerInteractions, setCustomerInteractions] = useState<Array<{
    id: number;
    interactionType: string;
    note: string | null;
    occurredAt: string;
    createdByName: string | null;
    profileName: string | null;
  }>>([]);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  
  // 그룹문자 보내기 상태
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  
  // 엑셀 입력 상태
  const [excelGroupId, setExcelGroupId] = useState<number | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  
  // 휴대폰 번호 입력 상태
  const [phoneGroupId, setPhoneGroupId] = useState<number | null>(null);
  const [phoneNumbers, setPhoneNumbers] = useState('');
  
  // 고객 등록 상태
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    source: '',
    notes: '',
    groupIds: [] as number[],
  });

  useEffect(() => {
    fetchGroups();
    fetchCustomers();
  }, [includeGroups, excludeGroups, inflowDateStart, inflowDateEnd, daySearch, currentPage, pageSize]);

  const loadCustomerInteractions = async (leadId: number | null, phone: string | null) => {
    if (!leadId && !phone) {
      setCustomerInteractions([]);
      return;
    }

    setIsLoadingInteractions(true);
    try {
      const params = new URLSearchParams();
      if (leadId) params.set('leadId', leadId.toString());
      if (phone) params.set('phone', phone);

      const response = await fetch(`/api/admin/marketing/customers/interactions?${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setCustomerInteractions(data.interactions || []);
      } else {
        showError(data.error || '고객 기록을 불러오는 중 오류가 발생했습니다.');
        setCustomerInteractions([]);
      }
    } catch (error) {
      console.error('Failed to load customer interactions:', error);
      showError('고객 기록을 불러오는 중 네트워크 오류가 발생했습니다.');
      setCustomerInteractions([]);
    } finally {
      setIsLoadingInteractions(false);
    }
  };

  useEffect(() => {
    console.log('[GroupMessage] Modal state changed:', showGroupMessageModal);
    console.log('[GroupMessage] Selected customers:', selectedIds.size);
  }, [showGroupMessageModal, selectedIds]);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/admin/customer-groups', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(includeGroups.length > 0 && { includeGroups: includeGroups.join(',') }),
        ...(includeGroupsOperator && { includeGroupsOperator }),
        ...(excludeGroups.length > 0 && { excludeGroups: excludeGroups.join(',') }),
        ...(inflowDateStart && { inflowDateStart }),
        ...(inflowDateEnd && { inflowDateEnd }),
        ...(daySearch && { daySearch }),
      });

      const response = await fetch(`/api/admin/marketing/customers?${params}`, {
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.ok) {
        throw new Error(result.error || '데이터를 불러오는데 실패했습니다.');
      }
      
      setCustomers(result.data.customers || []);
      setTotalCount(result.data.total || 0);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '고객 목록을 불러오는 중 오류가 발생했습니다.';
      setError(errorMessage);
      showError(errorMessage);
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customerId: number, index: number, shiftKey: boolean) => {
    if (shiftKey && lastSelectedIndex !== null) {
      // Shift 키로 범위 선택
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelected = new Set(selectedIds);
      for (let i = start; i <= end; i++) {
        if (customers[i]) {
          newSelected.add(customers[i].id);
        }
      }
      setSelectedIds(newSelected);
    } else {
      // 일반 선택
      const newSelected = new Set(selectedIds);
      if (newSelected.has(customerId)) {
        newSelected.delete(customerId);
      } else {
        newSelected.add(customerId);
      }
      setSelectedIds(newSelected);
      setLastSelectedIndex(index);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
      setLastSelectedIndex(null);
    } else {
      setSelectedIds(new Set(customers.map(c => c.id)));
      setLastSelectedIndex(0);
    }
  };

  const handleGroupMessage = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('[GroupMessage] Button clicked, selectedIds:', selectedIds.size, Array.from(selectedIds));
    
    if (selectedIds.size === 0) {
      showWarning('메시지를 보낼 고객을 선택해주세요.');
      return;
    }
    
    console.log('[GroupMessage] Opening modal');
    setShowGroupMessageModal(true);
  };

  const handleSendGroupMessage = async () => {
    if (!messageTitle || !messageContent) {
      showWarning('제목과 내용을 입력해주세요.');
      return;
    }

    if (selectedIds.size === 0) {
      showWarning('메시지를 보낼 고객을 선택해주세요.');
      return;
    }

    try {
      // 선택된 고객의 전화번호 가져오기 (이미 로드된 customers 배열에서)
      const customerIds = Array.from(selectedIds);
      const selectedCustomers = customers.filter((c) => customerIds.includes(c.id));

      if (selectedCustomers.length === 0) {
        throw new Error('선택된 고객을 찾을 수 없습니다.');
      }

      const phones = selectedCustomers
        .map((c) => c.phone)
        .filter((phone): phone is string => Boolean(phone && phone.trim()));

      if (phones.length === 0) {
        throw new Error('전화번호가 있는 고객이 없습니다.');
      }

      // SMS 발송 API 호출
      const smsResponse = await fetch('/api/admin/marketing/customers/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phones,
          title: messageTitle,
          content: messageContent,
        }),
      });

      if (!smsResponse.ok) {
        const errorData = await smsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '메시지 전송에 실패했습니다.');
      }
      
      const result = await smsResponse.json();
      
      if (result.ok) {
        showSuccess(`${result.sentCount || phones.length}명에게 메시지가 전송되었습니다.`);
        setShowGroupMessageModal(false);
        setMessageTitle('');
        setMessageContent('');
        setSelectedIds(new Set());
      } else {
        throw new Error(result.error || '메시지 전송에 실패했습니다.');
      }
    } catch (err) {
      console.error('Group message error:', err);
      showError(err instanceof Error ? err.message : '메시지 전송 중 오류가 발생했습니다.');
    }
  };

  const handleExcelDownload = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      // 현재 필터 조건을 포함하여 엑셀 다운로드
      const params = new URLSearchParams({
        ...(includeGroups.length > 0 && { includeGroups: includeGroups.join(',') }),
        ...(includeGroupsOperator && { includeGroupsOperator }),
        ...(excludeGroups.length > 0 && { excludeGroups: excludeGroups.join(',') }),
        ...(inflowDateStart && { inflowDateStart }),
        ...(inflowDateEnd && { inflowDateEnd }),
        ...(daySearch && { daySearch }),
      });

      const response = await fetch(`/api/admin/marketing/customers/export?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        // JSON 에러 응답 시도
        let errorMessage = '엑셀 다운로드에 실패했습니다.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      
      // Content-Type 확인
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('spreadsheet')) {
        // JSON 에러 응답일 수 있음
        const errorData = await response.json().catch(() => null);
        if (errorData) {
          throw new Error(errorData.error || '엑셀 다운로드에 실패했습니다.');
        }
      }
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('다운로드된 파일이 비어있습니다.');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `고객목록_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('엑셀 파일이 다운로드되었습니다.');
    } catch (err) {
      console.error('Excel download error:', err);
      showError(err instanceof Error ? err.message : '엑셀 다운로드에 실패했습니다.');
    }
  };

  const handleExcelUpload = async () => {
    if (!excelGroupId || !excelFile) {
      showWarning('그룹과 파일을 선택해주세요.');
      return;
    }

    setIsUploadingExcel(true);
    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('groupId', excelGroupId.toString());

      const response = await fetch('/api/admin/marketing/customers/excel-upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) throw new Error('엑셀 업로드에 실패했습니다.');
      const result = await response.json();
      
      if (result.ok) {
        showSuccess(`업로드 완료! 총 ${result.summary?.total || 0}건 중 ${result.summary?.added || 0}건이 추가되었습니다.`);
        setShowExcelModal(false);
        setExcelFile(null);
        setExcelGroupId(null);
        fetchCustomers();
      } else {
        throw new Error(result.error || '엑셀 업로드에 실패했습니다.');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '엑셀 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploadingExcel(false);
    }
  };

  const handlePhoneNumbersSubmit = async () => {
    if (!phoneGroupId || !phoneNumbers.trim()) {
      showWarning('그룹과 휴대폰 번호를 입력해주세요.');
      return;
    }

    try {
      const phoneList = phoneNumbers
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const response = await fetch('/api/admin/marketing/customers/phone-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupId: phoneGroupId,
          phones: phoneList,
        }),
      });

      if (!response.ok) throw new Error('휴대폰 번호 등록에 실패했습니다.');
      const result = await response.json();
      
      if (result.ok) {
        showSuccess(`${result.added || 0}건이 등록되었습니다.`);
        setShowPhoneModal(false);
        setPhoneNumbers('');
        setPhoneGroupId(null);
        fetchCustomers();
      } else {
        throw new Error(result.error || '휴대폰 번호 등록에 실패했습니다.');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '휴대폰 번호 등록 중 오류가 발생했습니다.');
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      showWarning('이름과 휴대폰 번호는 필수입니다.');
      return;
    }

    try {
      const response = await fetch('/api/admin/marketing/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newCustomer.name,
          phone: newCustomer.phone,
          email: newCustomer.email || null,
          source: newCustomer.source || null,
          notes: newCustomer.notes || null,
          groupIds: newCustomer.groupIds,
        }),
      });

      if (!response.ok) throw new Error('고객 등록에 실패했습니다.');
      const result = await response.json();
      
      if (result.ok) {
        showSuccess('고객이 등록되었습니다.');
        setShowCustomerModal(false);
        setNewCustomer({ name: '', phone: '', email: '', source: '', notes: '', groupIds: [] });
        fetchCustomers();
      } else {
        throw new Error(result.error || '고객 등록에 실패했습니다.');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '고객 등록 중 오류가 발생했습니다.');
    }
  };

  const downloadExcelTemplate = async () => {
    try {
      const response = await fetch('/api/admin/marketing/customers/excel-template', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('양식 파일 다운로드에 실패했습니다.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '고객_일괄등록_양식.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('양식 파일이 다운로드되었습니다.');
    } catch (err) {
      showError(err instanceof Error ? err.message : '양식 파일 다운로드에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-teal-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">마케팅 자동화 - 고객 관리</h1>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>잔여포인트: 무제한</div>
              <div>리드수: {totalCount.toLocaleString()} (무제한)</div>
              <div>퍼널: -/40</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* 상단 버튼들 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={(e) => {
                console.log('[GroupMessage] Button onClick fired');
                handleGroupMessage(e);
              }}
              className={`px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm active:scale-95 ${
                selectedIds.size === 0
                  ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <FiMessageSquare className="text-lg" />
              그룹문자보내기 {selectedIds.size > 0 && `(${selectedIds.size}명)`}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowExcelModal(true);
              }}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium transition-colors shadow-sm active:scale-95"
            >
              <FiUpload className="text-lg" />
              엑셀입력
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPhoneModal(true);
              }}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium transition-colors shadow-sm active:scale-95"
            >
              휴대폰번호만 입력
            </button>
            <button
              type="button"
              onClick={(e) => handleExcelDownload(e)}
              className="px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 font-medium transition-colors shadow-sm active:scale-95"
            >
              <FiDownload className="text-lg" />
              엑셀 다운
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCustomerModal(true);
              }}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium transition-colors shadow-sm active:scale-95"
            >
              <FiPlus className="text-lg" />
              고객등록
            </button>
          </div>
        </div>

        {/* 검색/필터 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">검색 및 필터</h2>
          <div className="space-y-5">
            {/* 첫 번째 행: 그룹 필터 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">포함 그룹</label>
                <div className="flex gap-2">
                  <select
                    value={includeGroupsOperator}
                    onChange={(e) => setIncludeGroupsOperator(e.target.value as 'AND' | 'OR')}
                    className="px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium bg-white hover:border-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="OR">OR</option>
                    <option value="AND">AND</option>
                  </select>
                  <input
                    type="text"
                    placeholder="그룹을 선택하세요"
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm bg-white cursor-pointer hover:border-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
                    readOnly
                    onClick={() => {
                      setGroupSelectType('include');
                      setShowGroupSelectModal(true);
                    }}
                    value={includeGroups.map(id => {
                      const group = groups.find(g => g.id === id);
                      return group ? group.name : '';
                    }).filter(Boolean).join(', ') || '그룹을 선택하세요'}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      setGroupSelectType('include');
                      setShowGroupSelectModal(true);
                    }}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors border border-gray-300"
                  >
                    찾아보기
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">제외 그룹</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="그룹을 선택하세요"
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm bg-white cursor-pointer hover:border-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
                    readOnly
                    onClick={() => {
                      setGroupSelectType('exclude');
                      setShowGroupSelectModal(true);
                    }}
                    value={excludeGroups.map(id => {
                      const group = groups.find(g => g.id === id);
                      return group ? group.name : '';
                    }).filter(Boolean).join(', ') || '그룹을 선택하세요'}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      setGroupSelectType('exclude');
                      setShowGroupSelectModal(true);
                    }}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors border border-gray-300"
                  >
                    찾아보기
                  </button>
                </div>
              </div>
            </div>
            
            {/* 두 번째 행: 날짜 필터 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">유입일</label>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={inflowDateStart}
                    onChange={(e) => setInflowDateStart(e.target.value)}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  <span className="text-gray-500 font-medium">~</span>
                  <input
                    type="date"
                    value={inflowDateEnd}
                    onChange={(e) => setInflowDateEnd(e.target.value)}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  <FiCalendar className="text-gray-500 text-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">일차검색</label>
                <input
                  type="text"
                  placeholder="숫자만 입력"
                  value={daySearch}
                  onChange={(e) => setDaySearch(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
            
            {/* 세 번째 행: 기타 옵션 및 검색 버튼 */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailField}
                  onChange={(e) => setEmailField(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">이메일필드</span>
              </label>
              <select
                value={emailSelect}
                onChange={(e) => setEmailSelect(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium bg-white hover:border-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="">선택</option>
                <option value="has">이메일 있음</option>
                <option value="no">이메일 없음</option>
              </select>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium bg-white hover:border-gray-400 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="50">50개</option>
                <option value="100">100개</option>
                <option value="200">200개</option>
              </select>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fetchCustomers();
                }}
                className="ml-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold transition-colors shadow-md active:scale-95"
              >
                <FiSearch className="text-lg" />
                검색
              </button>
            </div>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <div className="text-blue-600 mt-0.5">ℹ️</div>
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-semibold">사용 안내</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li>쉬프트 선택시 다중선택됩니다.</li>
                <li>일반선택시 마지막 체크가 기준점이 됩니다.</li>
                <li>기준점인 체크박스는 색상이 다릅니다.</li>
                <li>이름에 공백이 포함되어 있어도 검색가능합니다.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* 고객 테이블 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">데이터를 불러오는 중...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50 border-b-2 border-gray-300">
                  <tr>
                    <th className="w-12 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === customers.length && customers.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="w-16 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">NO</th>
                    <th className="w-32 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">그룹명</th>
                    <th className="w-24 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">이름</th>
                    <th className="w-32 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">휴대폰번호</th>
                    <th className="w-48 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">이메일</th>
                    <th className="w-40 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">유입경로</th>
                    <th className="w-32 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">상세정보</th>
                    <th className="w-48 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">고객메모</th>
                    <th className="w-40 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">유입일</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-gray-400 mb-2">
                            <FiUsers className="w-12 h-12 mx-auto" />
                          </div>
                          <p className="text-gray-600 font-medium text-lg mb-1">고객이 없습니다</p>
                          <p className="text-gray-500 text-sm">고객을 등록하거나 엑셀 파일을 업로드하여 고객을 추가하세요.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer, index) => {
                      const isSelected = selectedIds.has(customer.id);
                      const isLastSelected = lastSelectedIndex === index;
                      return (
                        <tr 
                          key={customer.id} 
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSelectCustomer(customer.id, index, false);
                              }}
                              onMouseDown={(e) => {
                                if (e.shiftKey && lastSelectedIndex !== null) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSelectCustomer(customer.id, index, true);
                                }
                              }}
                              className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer ${isLastSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{customer.id}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-wrap gap-1">
                              {customer.groups && customer.groups.length > 0 ? (
                                customer.groups.map((group: any) => (
                                  <span
                                    key={group.id}
                                    className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white shadow-sm"
                                    style={{ backgroundColor: group.color || '#3B82F6' }}
                                  >
                                    {group.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate" title={customer.name || ''}>
                            {customer.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-mono">{customer.phone || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 truncate" title={customer.email || ''}>
                            {customer.email || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-col gap-1">
                              {customer.source ? (
                                <span className="text-gray-700 text-xs">{customer.source}</span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                              {(customer as any).ownerName && (
                                <span className="text-blue-600 text-xs font-medium">
                                  {(customer as any).ownerName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomerForDetail(customer);
                                setShowDetailModal(true);
                                loadCustomerInteractions((customer as any).leadId || null, customer.phone || null);
                              }}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-xs px-2 py-1 rounded hover:bg-blue-50"
                            >
                              상세정보
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-xs" title={customer.notes || ''}>
                            {customer.notes || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {new Date(customer.createdAt).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalCount > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              총 {totalCount}건 중 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)}건 표시
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                이전
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage * pageSize >= totalCount}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 그룹문자 보내기 모달 */}
      {showGroupMessageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowGroupMessageModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">그룹문자 보내기</h2>
              <button 
                type="button"
                onClick={() => {
                  console.log('[GroupMessage] Modal close button clicked');
                  setShowGroupMessageModal(false);
                }} 
                className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="메시지 제목"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  rows={5}
                  placeholder="메시지 내용"
                />
              </div>
              <div className="text-sm text-gray-600">
                {selectedIds.size}명에게 발송됩니다.
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowGroupMessageModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSendGroupMessage}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 입력 모달 */}
      {showExcelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">고객 정보 일괄 입력</h2>
              <button onClick={() => setShowExcelModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX />
              </button>
            </div>
            <div className="space-y-4">
              <button
                onClick={downloadExcelTemplate}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                <FiDownload />
                양식 파일 다운받기
              </button>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">그룹선택</label>
                <select
                  value={excelGroupId || ''}
                  onChange={(e) => setExcelGroupId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="">그룹선택</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">파일선택</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded"
                  />
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                    찾아보기
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <h3 className="font-semibold mb-2">&lt;방법&gt;</h3>
                <p className="text-sm text-red-600 mb-2">
                  ※ 주의 : 대용량일경우 잠시 기다려주세요. (ex:3만건 - 1분)
                </p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>위 양식파일을 다운로드 합니다.</li>
                  <li>양식파일의 항목에 맞게 고객 정보를 입력합니다.</li>
                  <li>저장 후 '찾아보기'를 클릭하여 양식파일을 업로드 합니다.</li>
                </ol>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowExcelModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleExcelUpload}
                disabled={!excelGroupId || !excelFile || isUploadingExcel}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                {isUploadingExcel ? '업로드 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 휴대폰 번호만 입력 모달 */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold bg-teal-600 text-white px-4 py-2 rounded">휴대폰 번호 등록</h2>
              <button onClick={() => setShowPhoneModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">그룹선택</label>
                <select
                  value={phoneGroupId || ''}
                  onChange={(e) => setPhoneGroupId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="">그룹선택</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  휴대폰 번호 입력 ({phoneNumbers.split('\n').filter(p => p.trim()).length})
                </label>
                <textarea
                  value={phoneNumbers}
                  onChange={(e) => setPhoneNumbers(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  rows={8}
                  placeholder="휴대폰 번호를 한 줄에 하나씩 입력하세요"
                />
                <p className="text-xs text-gray-500 mt-1">※ 휴대폰 번호만 입력해주세요.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowPhoneModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handlePhoneNumbersSubmit}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 고객 등록 모달 */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">고객 등록</h2>
              <button onClick={() => setShowCustomerModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">휴대폰 번호</label>
                <input
                  type="text"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">유입경로</label>
                <input
                  type="text"
                  value={newCustomer.source}
                  onChange={(e) => setNewCustomer({ ...newCustomer, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">고객메모</label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">그룹</label>
                <div className="space-y-2">
                  {groups.map((group) => (
                    <label key={group.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newCustomer.groupIds.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewCustomer({ ...newCustomer, groupIds: [...newCustomer.groupIds, group.id] });
                          } else {
                            setNewCustomer({ ...newCustomer, groupIds: newCustomer.groupIds.filter(id => id !== group.id) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{group.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleAddCustomer}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상세정보 모달 */}
      {showDetailModal && selectedCustomerForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">고객 상세정보</h2>
              <button 
                type="button"
                onClick={() => setShowDetailModal(false)} 
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            
            <div className="mb-4 pb-4 border-b">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">이름</p>
                  <p className="text-lg font-semibold">{selectedCustomerForDetail.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">연락처</p>
                  <p className="text-lg font-mono">{selectedCustomerForDetail.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">이메일</p>
                  <p className="text-lg">{selectedCustomerForDetail.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">유입경로</p>
                  <p className="text-lg">{selectedCustomerForDetail.source || '-'}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-4">
              <h3 className="text-lg font-semibold mb-3">고객 기록</h3>
              {isLoadingInteractions ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">기록을 불러오는 중...</p>
                </div>
              ) : customerInteractions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>등록된 고객 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerInteractions.map((interaction) => (
                    <div key={interaction.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold mr-2">
                            {interaction.interactionType}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(interaction.occurredAt).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <div className="text-right">
                          {interaction.profileName && (
                            <p className="text-sm font-medium text-blue-600">{interaction.profileName}</p>
                          )}
                          {interaction.createdByName && (
                            <p className="text-xs text-gray-500">{interaction.createdByName}</p>
                          )}
                        </div>
                      </div>
                      {interaction.note && (
                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{interaction.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 그룹 선택 모달 */}
      {showGroupSelectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowGroupSelectModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {groupSelectType === 'include' ? '포함 그룹 선택' : '제외 그룹 선택'}
              </h2>
              <button 
                type="button"
                onClick={() => setShowGroupSelectModal(false)} 
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mb-4">
              {groups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>생성된 그룹이 없습니다.</p>
                  <p className="text-sm mt-2">먼저 고객 그룹 관리에서 그룹을 생성해주세요.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groups.map((group) => {
                    const isSelected = groupSelectType === 'include' 
                      ? includeGroups.includes(group.id)
                      : excludeGroups.includes(group.id);
                    return (
                      <label
                        key={group.id}
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (groupSelectType === 'include') {
                              if (e.target.checked) {
                                setIncludeGroups([...includeGroups, group.id]);
                              } else {
                                setIncludeGroups(includeGroups.filter(id => id !== group.id));
                              }
                            } else {
                              if (e.target.checked) {
                                setExcludeGroups([...excludeGroups, group.id]);
                              } else {
                                setExcludeGroups(excludeGroups.filter(id => id !== group.id));
                              }
                            }
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div 
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: group.color || '#3B82F6' }}
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{group.name}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  if (groupSelectType === 'include') {
                    setIncludeGroups([]);
                  } else {
                    setExcludeGroups([]);
                  }
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                전체 해제
              </button>
              <button
                type="button"
                onClick={() => setShowGroupSelectModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
