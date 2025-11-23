'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import Image from 'next/image';
import { Download, Send, CheckCircle, Clock, XCircle } from 'lucide-react';
import { showSuccess, showError } from '@/components/ui/Toast';

interface PartnerCertificateProps {
  type: 'purchase' | 'refund';
}

interface CertificateData {
  customerName: string;
  birthDate: string;
  productName: string;
  paymentAmount: number;
  paymentDate: string;
  refundAmount?: number;
  refundDate?: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  displayName: string;
}

interface ApprovalRequest {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  rejectedReason?: string;
  approvedByType?: string;
}

export default function PartnerCertificate({ type }: PartnerCertificateProps) {
  console.log('[PartnerCertificate] Rendering with type:', type);
  
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  
  const [data, setData] = useState<CertificateData>({
    customerName: '',
    birthDate: '',
    productName: '',
    paymentAmount: 0,
    paymentDate: '',
    refundAmount: 0,
    refundDate: '',
  });

  const [confirmedRefundAmount, setConfirmedRefundAmount] = useState<number | null>(null);
  const [confirmedRefundDate, setConfirmedRefundDate] = useState<string>('');

  // 고객 검색 관련
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isLoadingCustomerInfo, setIsLoadingCustomerInfo] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 승인 요청 관련
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
  const [userRole, setUserRole] = useState<'BRANCH_MANAGER' | 'SALES_AGENT' | null>(null);

  const [issueDate, setIssueDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  });

  // 사용자 권한 확인
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/partner/profile', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.profile?.type || null);
        }
      } catch (error) {
        console.error('[PartnerCertificate] Failed to fetch user role:', error);
      }
    };
    fetchUserRole();
  }, []);

  // type이 변경될 때 상태 초기화
  useEffect(() => {
    console.log('[PartnerCertificate] Type changed, resetting state. New type:', type);
    setData({
      customerName: '',
      birthDate: '',
      productName: '',
      paymentAmount: 0,
      paymentDate: '',
      refundAmount: 0,
      refundDate: '',
    });
    setCustomerSearchQuery('');
    setCustomerSuggestions([]);
    setShowSuggestions(false);
    setSelectedCustomerId(null);
    setConfirmedRefundAmount(null);
    setConfirmedRefundDate('');
    setApprovalRequest(null);
  }, [type]);

  // 고객 검색
  const searchCustomers = useCallback(async (query: string) => {
    if (!query || query.trim().length < 1) {
      setCustomerSuggestions([]);
      setIsLoadingCustomerInfo(false);
      return;
    }

    try {
      setIsLoadingCustomerInfo(true);
      const response = await fetch(`/api/admin/customers/search?q=${encodeURIComponent(query)}&limit=10`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.ok) {
          setCustomerSuggestions(result.customers || []);
          console.log('[PartnerCertificate] 검색 결과:', result.customers?.length || 0, '명');
        }
      }
    } catch (error) {
      console.error('[PartnerCertificate] Customer search error:', error);
    } finally {
      setIsLoadingCustomerInfo(false);
    }
  }, []);

  // 고객 검색 입력 핸들러
  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomerSearchQuery(value);
    setData(prev => ({ ...prev, customerName: value }));

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length >= 1) {
      setShowSuggestions(true);
      searchTimeoutRef.current = setTimeout(() => {
        searchCustomers(value);
      }, 200);
    } else {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // 고객 선택
  const handleCustomerSelect = async (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearchQuery(customer.name);
    setData(prev => ({ ...prev, customerName: customer.name }));
    setShowSuggestions(false);

    // 고객의 결제 정보 로드
    try {
      const response = await fetch(`/api/partner/customers/${customer.id}/payments`, {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.payments && result.payments.length > 0) {
          const latestPayment = result.payments[0];
          setData(prev => ({
            ...prev,
            productName: latestPayment.productName || '',
            paymentAmount: latestPayment.amount || 0,
            paymentDate: latestPayment.paidAt ? new Date(latestPayment.paidAt).toISOString().split('T')[0] : '',
          }));
        }
      }
    } catch (error) {
      console.error('[PartnerCertificate] Failed to load customer payments:', error);
    }

    // 기존 승인 요청 확인
    checkExistingApproval(customer.id);
  };

  // 기존 승인 요청 확인
  const checkExistingApproval = async (customerId: number) => {
    try {
      const response = await fetch(`/api/partner/certificate-approvals?customerId=${customerId}&type=${type}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.approval) {
          setApprovalRequest(result.approval);
        }
      }
    } catch (error) {
      console.error('[PartnerCertificate] Failed to check existing approval:', error);
    }
  };

  // 승인 요청 제출
  const handleRequestApproval = async () => {
    if (!selectedCustomerId) {
      showError('고객을 선택해주세요.');
      return;
    }

    if (!data.customerName || !data.productName || !data.paymentAmount) {
      showError('필수 정보를 모두 입력해주세요.');
      return;
    }

    if (type === 'refund') {
      if (!confirmedRefundAmount || confirmedRefundAmount <= 0) {
        showError('환불금액을 입력하고 확인 버튼을 클릭해주세요.');
        return;
      }
      if (!confirmedRefundDate || confirmedRefundDate.trim() === '') {
        showError('환불일자를 선택하고 확인 버튼을 클릭해주세요.');
        return;
      }
    }

    setIsRequesting(true);

    try {
      const requestBody: any = {
        certificateType: type,
        customerId: selectedCustomerId,
        customerName: data.customerName,
        birthDate: data.birthDate,
        productName: data.productName,
        paymentAmount: data.paymentAmount,
        paymentDate: data.paymentDate,
      };

      if (type === 'refund') {
        requestBody.refundAmount = confirmedRefundAmount;
        requestBody.refundDate = confirmedRefundDate;
      }

      const response = await fetch('/api/partner/certificate-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        showSuccess('승인 요청이 제출되었습니다.');
        setApprovalRequest(result.approval);
      } else {
        showError(result.error || '승인 요청 실패');
      }
    } catch (error) {
      console.error('[PartnerCertificate] Request approval error:', error);
      showError('승인 요청 중 오류가 발생했습니다.');
    } finally {
      setIsRequesting(false);
    }
  };

  // PNG 다운로드
  const handleDownload = async () => {
    if (!approvalRequest || approvalRequest.status !== 'approved') {
      showError('승인 완료 후 다운로드할 수 있습니다.');
      return;
    }

    if (!certificateRef.current) return;

    setIsDownloading(true);

    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const fileName = type === 'purchase' 
            ? `구매확인증서_${data.customerName}_${new Date().toISOString().split('T')[0]}.png`
            : `환불인증서_${data.customerName}_${new Date().toISOString().split('T')[0]}.png`;
          
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          showSuccess('인증서가 다운로드되었습니다.');
        }
      }, 'image/png');
    } catch (error) {
      console.error('[PartnerCertificate] Download error:', error);
      showError('다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 권한별 버튼 렌더링
  const renderActionButton = () => {
    // 승인 완료된 경우
    if (approvalRequest?.status === 'approved') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="font-semibold text-green-900">승인 완료</p>
              <p className="text-sm text-green-700">
                {approvalRequest.approvedAt && new Date(approvalRequest.approvedAt).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full py-3 px-6 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            {isDownloading ? 'PNG 생성 중...' : 'PNG 다운로드'}
          </button>
        </div>
      );
    }

    // 승인 대기 중인 경우
    if (approvalRequest?.status === 'pending') {
      return (
        <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Clock className="w-5 h-5 text-yellow-600" />
          <div className="flex-1">
            <p className="font-semibold text-yellow-900">승인 대기 중</p>
            <p className="text-sm text-yellow-700">
              {userRole === 'SALES_AGENT' ? '대리점장 또는 본사' : '본사'}의 승인을 기다리고 있습니다.
            </p>
          </div>
        </div>
      );
    }

    // 승인 거부된 경우
    if (approvalRequest?.status === 'rejected') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <p className="font-semibold text-red-900">승인 거부됨</p>
            </div>
            {approvalRequest.rejectedReason && (
              <p className="text-sm text-red-700">사유: {approvalRequest.rejectedReason}</p>
            )}
          </div>
          <button
            onClick={handleRequestApproval}
            disabled={isRequesting}
            className="w-full py-3 px-6 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            {isRequesting ? '요청 중...' : '다시 승인 요청'}
          </button>
        </div>
      );
    }

    // 승인 요청 전
    return (
      <button
        onClick={handleRequestApproval}
        disabled={isRequesting || !data.customerName || !selectedCustomerId}
        className={`w-full py-3 px-6 rounded-lg font-bold text-white transition-colors flex items-center justify-center gap-2 ${
          type === 'purchase'
            ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300'
            : 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
        }`}
      >
        <Send className="w-5 h-5" />
        {isRequesting 
          ? '요청 중...' 
          : type === 'purchase' 
            ? '구매확인 승인 요청' 
            : '환불인증 승인 요청'}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* 권한 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 권한 안내</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          {userRole === 'BRANCH_MANAGER' ? (
            <>
              <li>• 비교견적서: 자유롭게 사용 가능</li>
              <li>• 구매확인증서: 구매 완료 후 자유롭게 발급 가능</li>
              <li>• 환불인증서: 본사 승인 필요 → 승인 후 다운로드</li>
            </>
          ) : (
            <>
              <li>• 비교견적서: 자유롭게 사용 가능</li>
              <li>• 구매확인증서: 대리점장/본사 승인 필요 → 승인 후 다운로드</li>
              <li>• 환불인증서: 대리점장/본사 승인 필요 → 승인 후 다운로드</li>
            </>
          )}
        </ul>
      </div>

      {/* 입력 폼 - 다음 메시지에서 계속... */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">고객 정보 입력</h2>
        
        <div className="text-center py-8 text-gray-500">
          <p>고객 검색 및 입력 폼은 다음 단계에서 추가됩니다...</p>
          <p className="text-sm mt-2">(관리자용 Certificate 컴포넌트의 폼을 재사용)</p>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {renderActionButton()}
      </div>

      {/* 인증서 미리보기 - 승인 완료 후에만 표시 */}
      {approvalRequest?.status === 'approved' && (
        <div className="bg-gray-100 rounded-lg shadow-md p-6">
          <div ref={certificateRef} className="bg-white p-8">
            <p className="text-center text-gray-500">인증서 미리보기 (다음 단계에서 추가)</p>
          </div>
        </div>
      )}
    </div>
  );
}













