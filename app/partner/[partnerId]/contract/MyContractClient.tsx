'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FiCheckCircle, FiFileText, FiUser, FiArrowLeft, FiSend, FiRefreshCw, FiEye, FiEyeOff, FiClock, FiXCircle, FiTrash2, FiSearch, FiX, FiExternalLink, FiLock } from 'react-icons/fi';
import Link from 'next/link';
import dayjs from 'dayjs';
import { showError, showSuccess } from '@/components/ui/Toast';
import ContractInviteModal from '@/components/admin/ContractInviteModal';
import { getAffiliateTerm } from '@/lib/utils';

type AffiliateContract = {
  id: number;
  userId: number | null;
  name: string;
  phone: string;
  email?: string | null;
  address: string;
  bankName?: string | null;
  bankAccount?: string | null;
  bankAccountHolder?: string | null;
  status: string;
  submittedAt: string;
  reviewedAt?: string | null;
  consentPrivacy: boolean;
  consentNonCompete: boolean;
  consentDbUse: boolean;
  consentPenalty: boolean;
  metadata?: {
    signature?: {
      url?: string;
      originalName?: string;
      fileId?: string;
    };
    [key: string]: any;
  } | null;
  mentor?: {
    id: number;
    displayName: string | null;
    affiliateCode: string;
    branchLabel: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    type: string;
  } | null;
};

export default function MyContractClient({ partnerId }: { partnerId: string }) {
  const pathname = usePathname();
  const affiliateTerm = getAffiliateTerm(pathname || undefined);
  const [contract, setContract] = useState<AffiliateContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isBranchManager, setIsBranchManager] = useState(false);
  const [managedContracts, setManagedContracts] = useState<Array<{
    id: number;
    name: string;
    phone: string;
    email: string | null;
    status: string;
    submittedAt: string | null;
    completedAt: string | null;
  }>>([]);
  const [loadingManagedContracts, setLoadingManagedContracts] = useState(false);
  const [sendingPdfContractId, setSendingPdfContractId] = useState<number | null>(null);
  const [completingContractId, setCompletingContractId] = useState<number | null>(null);
  const [contractSearch, setContractSearch] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState<'all' | 'submitted' | 'completed' | 'rejected'>('all');
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [showContractDetail, setShowContractDetail] = useState(false);
  const [loadingContractDetail, setLoadingContractDetail] = useState(false);
  const [deletingContractId, setDeletingContractId] = useState<number | null>(null);
  const [showSendContractModal, setShowSendContractModal] = useState(false);
  const [contractType, setContractType] = useState<'SALES_AGENT' | 'BRANCH_MANAGER' | 'CRUISE_STAFF' | 'PRIMARKETER'>('SALES_AGENT');

  useEffect(() => {
    const loadContract = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/affiliate/my-contract');
        const json = await res.json();

        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || '계약 정보를 불러올 수 없습니다.');
        }

        setContract(json.contract);
      } catch (error: any) {
        console.error('[MyContract] load error', error);
        showError(error.message || '계약 정보를 불러오는 중 문제가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    const checkBranchManager = async () => {
      try {
        const res = await fetch('/api/affiliate/my-profile');
        const json = await res.json();
        
        if (res.ok && json?.ok && json?.profile?.type === 'BRANCH_MANAGER') {
          setIsBranchManager(true);
          loadManagedContracts();
        }
      } catch (error: any) {
        console.error('[MyContract] check branch manager error', error);
      }
    };

    loadContract();
    checkBranchManager();
  }, []);

  const loadManagedContracts = async () => {
    try {
      setLoadingManagedContracts(true);
      const res = await fetch('/api/partner/contracts');
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || '계약서 목록을 불러올 수 없습니다.');
      }

      setManagedContracts(json.contracts || []);
    } catch (error: any) {
      console.error('[MyContract] load managed contracts error', error);
      showError(error.message || '계약서 목록을 불러오는 중 문제가 발생했습니다.');
    } finally {
      setLoadingManagedContracts(false);
    }
  };

  const handleCompleteContract = async (contractId: number) => {
    if (!confirm('이 계약서를 완료하여 PDF를 이메일로 전송하시겠습니까?')) return;

    try {
      setCompletingContractId(contractId);
      const res = await fetch(`/api/partner/contracts/${contractId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '계약서 완료 처리에 실패했습니다.');
      }

      showSuccess(json.message || '계약서가 완료되었고 이메일로 전송되었습니다.');
      loadManagedContracts(); // 목록 새로고침
      
      // 완료 페이지로 리다이렉트 (새 창에서 열기)
      if (json.redirectUrl) {
        window.open(json.redirectUrl, '_blank');
      }
    } catch (error: any) {
      console.error('[MyContract] Complete contract error:', error);
      showError(error.message || '계약서 완료 처리 중 오류가 발생했습니다.');
    } finally {
      setCompletingContractId(null);
    }
  };

  const handleSendPdf = async (contractId: number) => {
    if (!confirm('계약서 PDF를 계약자 이메일 주소로 전송하시겠습니까? (본사 이메일은 참조로 추가됩니다)')) return;
    try {
      setSendingPdfContractId(contractId);
      const res = await fetch(`/api/partner/contracts/${contractId}/send-pdf`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'PDF 전송에 실패했습니다.');
      }

      showSuccess(json.message || 'PDF가 성공적으로 전송되었습니다.');
      loadManagedContracts();
    } catch (error: any) {
      console.error('[MyContract] Send PDF error:', error);
      showError(error.message || 'PDF 전송 중 오류가 발생했습니다.');
    } finally {
      setSendingPdfContractId(null);
    }
  };

  const handleReject = async (contractId: number) => {
    const reason = prompt('거부 사유를 입력하세요:');
    if (!reason) return;

    try {
      const res = await fetch(`/api/partner/contracts/${contractId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '계약 거부에 실패했습니다.');
      }
      showSuccess('계약이 거부되었습니다.');
      loadManagedContracts();
    } catch (error: any) {
      console.error('[MyContract] reject error', error);
      showError(error.message || '계약 거부 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (contractId: number) => {
    if (!confirm('정말로 이 계약서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      setDeletingContractId(contractId);
      const res = await fetch(`/api/partner/contracts/${contractId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '삭제에 실패했습니다.');
      }
      showSuccess('계약서가 삭제되었습니다.');
      loadManagedContracts();
    } catch (error: any) {
      console.error('[MyContract] delete error', error);
      showError(error.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingContractId(null);
    }
  };

  const handleViewDetail = async (contractId: number) => {
    try {
      setLoadingContractDetail(true);
      const res = await fetch(`/api/partner/contracts/${contractId}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '계약서 정보를 불러오지 못했습니다.');
      }
      setSelectedContract(json.contract);
      setShowContractDetail(true);
    } catch (error: any) {
      console.error('[MyContract] view detail error', error);
      showError(error.message || '계약서 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingContractDetail(false);
    }
  };

  // 서명 URL 추출 - 여러 형식 지원
  const getSignatureUrl = () => {
    if (!contract?.metadata) return null;
    const metadata = contract.metadata as any;
    // 새로운 형식: metadata.signatures.main.url
    if (metadata?.signatures?.main?.url) {
      return metadata.signatures.main.url;
    }
    // 구 형식: metadata.signature.url
    if (metadata?.signature?.url) {
      return metadata.signature.url;
    }
    // 다른 형식들도 확인
    if (metadata?.signatures?.education?.url) {
      return metadata.signatures.education.url;
    }
    if (metadata?.signatures?.b2b?.url) {
      return metadata.signatures.b2b.url;
    }
    return null;
  };
  const signatureUrl = getSignatureUrl();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-600">계약 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
        <div className="mx-auto w-full max-w-4xl px-4 pt-12">
          <header className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-8 shadow-xl">
            <Link
              href={`/partner/${partnerId}/dashboard`}
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 text-sm"
            >
              <FiArrowLeft /> 대시보드로 돌아가기
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <FiFileText className="text-3xl" />
              <h1 className="text-3xl font-extrabold">나의 {affiliateTerm} 계약서</h1>
            </div>
          </header>
          <div className="rounded-3xl bg-white p-8 shadow-lg text-center">
            <FiFileText className="mx-auto text-6xl text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">계약 정보 없음</h2>
            <p className="text-slate-600 mb-6">
              승인된 {affiliateTerm} 계약이 없습니다.
              <br />
              계약서를 작성하신 경우 관리자 승인을 기다려주세요.
            </p>
            <Link
              href={`/partner/${partnerId}/dashboard`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="mx-auto w-full max-w-4xl px-4 pt-12">
        <header className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-8 shadow-xl">
          <Link
            href={`/partner/${partnerId}/dashboard`}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 text-sm"
          >
            <FiArrowLeft /> 대시보드로 돌아가기
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <FiCheckCircle className="text-3xl" />
            <h1 className="text-3xl font-extrabold">나의 {affiliateTerm} 계약서</h1>
          </div>
          <p className="text-white/90">
            승인된 계약 정보와 서명을 확인할 수 있습니다.
          </p>
        </header>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FiUser className="text-blue-600" />
              계약자 정보
            </h2>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div>
                <p className="font-semibold text-slate-500">성명</p>
                <p className="text-slate-900">{contract.name}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">연락처</p>
                <p className="text-slate-900">{contract.phone}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">이메일</p>
                <p className="text-slate-900">{contract.email || '-'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">주소</p>
                <p className="text-slate-900">{contract.address || '정보 없음'}</p>
              </div>
            </div>
          </section>

          {/* 정산 계좌 정보 */}
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold text-slate-900 mb-4">정산 계좌 정보</h2>
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div>
                <p className="font-semibold text-slate-500">은행명</p>
                <p className="text-slate-900">{contract.bankName || '-'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">계좌번호</p>
                <p className="text-slate-900">{contract.bankAccount || '-'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">예금주</p>
                <p className="text-slate-900">{contract.bankAccountHolder || '-'}</p>
              </div>
            </div>
          </section>

          {/* 계약서 서명 */}
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold text-slate-900 mb-4">계약서 서명</h2>
            {signatureUrl ? (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center justify-center">
                    <img
                      src={signatureUrl}
                      alt="나의 서명"
                      className="max-h-40 w-auto"
                    />
                  </div>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowSignatureModal(true)}
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow hover:bg-blue-700"
                  >
                    서명 크게 보기
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
                서명 정보가 없습니다.
              </div>
            )}
          </section>

          {/* 필수 동의 확인 */}
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold text-slate-900 mb-4">필수 동의 항목</h2>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${contract.consentPrivacy ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                <FiCheckCircle className="text-lg" />
                <span>개인정보 처리 동의</span>
              </div>
              <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${contract.consentNonCompete ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                <FiCheckCircle className="text-lg" />
                <span>경업금지 조항 동의</span>
              </div>
              <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${contract.consentDbUse ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                <FiCheckCircle className="text-lg" />
                <span>DB 활용 동의</span>
              </div>
              <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${contract.consentPenalty ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                <FiCheckCircle className="text-lg" />
                <span>위약금 조항 동의</span>
              </div>
            </div>
          </section>

          {/* 담당 멘토 정보 */}
          {contract.mentor && (
            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FiUser className="text-purple-600" />
                담당 멘토
              </h2>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <p className="font-semibold text-slate-500">이름</p>
                  <p className="text-slate-900">{contract.mentor.displayName || '-'}</p>
                </div>
                {contract.mentor.branchLabel && (
                  <div>
                    <p className="font-semibold text-slate-500">지점명</p>
                    <p className="text-slate-900">{contract.mentor.branchLabel}</p>
                  </div>
                )}
                {contract.mentor.contactPhone && (
                  <div>
                    <p className="font-semibold text-slate-500">연락처</p>
                    <p className="text-slate-900">{contract.mentor.contactPhone}</p>
                  </div>
                )}
                {contract.mentor.contactEmail && (
                  <div>
                    <p className="font-semibold text-slate-500">이메일</p>
                    <p className="text-slate-900">{contract.mentor.contactEmail}</p>
                  </div>
                )}
                {contract.mentor.affiliateCode && (
                  <div>
                    <p className="font-semibold text-slate-500">{affiliateTerm} 코드</p>
                    <p className="text-slate-900">{contract.mentor.affiliateCode}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 계정 정보 (아이디/비밀번호) */}
          {(contract as any).accountInfo && (
            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FiLock className="text-green-600" />
                계정 정보
              </h2>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <p className="font-semibold text-slate-500">아이디</p>
                  <p className="text-slate-900 font-mono">{(contract as any).accountInfo.mallUserId || '미생성'}</p>
                </div>
                {(contract as any).accountInfo.password && (
                  <div>
                    <p className="font-semibold text-slate-500">비밀번호</p>
                    <p className="text-slate-900 font-mono">{(contract as any).accountInfo.password}</p>
                  </div>
                )}
                {(contract as any).accountInfo.mallNickname && (
                  <div>
                    <p className="font-semibold text-slate-500">닉네임</p>
                    <p className="text-slate-900">{(contract as any).accountInfo.mallNickname}</p>
                  </div>
                )}
                {(contract as any).accountInfo.passwordGeneratedAt && (
                  <div>
                    <p className="font-semibold text-slate-500">생성일시</p>
                    <p className="text-slate-900">
                      {new Date((contract as any).accountInfo.passwordGeneratedAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 계약 상태 */}
          <section className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold text-slate-900 mb-4">계약 상태</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 border border-green-200">
                <span className="font-semibold text-green-800">계약 상태</span>
                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-bold text-white ${
                  contract.status === 'approved' || contract.status === 'completed'
                    ? 'bg-green-600' 
                    : contract.status === 'terminated'
                    ? 'bg-red-600'
                    : 'bg-yellow-600'
                }`}>
                  <FiCheckCircle />
                  {contract.status === 'approved' || contract.status === 'completed' ? '승인 완료' : 
                   contract.status === 'terminated' ? '계약 해지' : '승인 대기 중'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">계약 접수일</span>
                <span className="text-slate-600">{dayjs(contract.submittedAt).format('YYYY년 MM월 DD일')}</span>
              </div>
              {contract.reviewedAt && (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="font-semibold text-slate-700">승인일</span>
                  <span className="text-slate-600">{dayjs(contract.reviewedAt).format('YYYY년 MM월 DD일')}</span>
                </div>
              )}
              {(() => {
                const metadata = contract.metadata as any;
                const renewalDate = metadata?.renewalDate ? new Date(metadata.renewalDate) : null;
                const renewalRequestStatus = metadata?.renewalRequestStatus || null;
                const approvedDate = contract.reviewedAt ? new Date(contract.reviewedAt) : (contract.submittedAt ? new Date(contract.submittedAt) : null);
                
                // 재계약 갱신일 계산 (승인일 또는 접수일로부터 1년)
                let calculatedRenewalDate = renewalDate;
                if (!calculatedRenewalDate && approvedDate) {
                  calculatedRenewalDate = new Date(approvedDate);
                  calculatedRenewalDate.setFullYear(calculatedRenewalDate.getFullYear() + 1);
                }
                
                // D-day 계산
                const calculateDaysRemaining = (targetDate: Date | null) => {
                  if (!targetDate) return null;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const target = new Date(targetDate);
                  target.setHours(0, 0, 0, 0);
                  const diffTime = target.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays;
                };
                
                const daysRemaining = calculatedRenewalDate ? calculateDaysRemaining(calculatedRenewalDate) : null;
                
                return (
                  <>
                    {calculatedRenewalDate && (
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <span className="font-semibold text-slate-700">재계약 갱신일</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">{dayjs(calculatedRenewalDate).format('YYYY년 MM월 DD일')}</span>
                          {daysRemaining !== null && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                              daysRemaining < 0 
                                ? 'bg-red-100 text-red-700' 
                                : daysRemaining <= 30 
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {daysRemaining < 0 ? `D+${Math.abs(daysRemaining)}` : `D-${daysRemaining}`}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {renewalRequestStatus === 'PENDING' && (
                      <div className="flex items-center justify-between rounded-xl bg-yellow-50 px-4 py-3 border border-yellow-200">
                        <span className="font-semibold text-yellow-800">재계약 요청 상태</span>
                        <span className="text-yellow-700">재계약 신청 대기 중</span>
                      </div>
                    )}
                    {renewalRequestStatus === 'APPROVED' && (
                      <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 border border-green-200">
                        <span className="font-semibold text-green-800">재계약 요청 상태</span>
                        <span className="text-green-700">재계약 승인 완료</span>
                      </div>
                    )}
                    {renewalRequestStatus === 'REJECTED' && (
                      <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 border border-red-200">
                        <span className="font-semibold text-red-800">재계약 요청 상태</span>
                        <span className="text-red-700">재계약 불가 - 계약 해지</span>
                      </div>
                    )}
                    {calculatedRenewalDate && daysRemaining !== null && daysRemaining <= 60 && daysRemaining > 0 && !renewalRequestStatus && (
                      <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 border border-blue-200">
                        <span className="font-semibold text-blue-800">재계약 갱신</span>
                        <button
                          onClick={async () => {
                            if (!confirm('재계약 갱신을 요청하시겠습니까?')) return;
                            try {
                              const res = await fetch(`/api/partner/contracts/${contract.id}/renewal-request`, {
                                method: 'POST',
                                credentials: 'include',
                              });
                              const json = await res.json();
                              if (!res.ok || !json.ok) {
                                throw new Error(json.message || '재계약 요청에 실패했습니다.');
                              }
                              showSuccess('재계약 갱신 요청이 완료되었습니다.');
                              // 페이지 새로고침
                              window.location.reload();
                            } catch (error: any) {
                              console.error('[MyContract] renewal request error', error);
                              showError(error.message || '재계약 요청 중 오류가 발생했습니다.');
                            }
                          }}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          재계약 갱신 요청
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </section>

          {/* 계약서 관리 (대리점장만) */}
          {isBranchManager && (
            <section className="rounded-3xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 md:text-xl flex items-center gap-2">
                  <FiFileText className="text-indigo-600" />
                  계약서 관리
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setContractType('SALES_AGENT');
                      setShowSendContractModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-md"
                  >
                    <FiSend className="text-base" />
                    판매원 계약서 보내기
                  </button>
                  <button
                    onClick={loadManagedContracts}
                    className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    <FiRefreshCw className="text-base" />
                    새로고침
                  </button>
                </div>
              </div>
              
              {/* 검색 및 필터 */}
              <div className="mb-4 space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="이름, 전화번호, 이메일 검색..."
                      value={contractSearch}
                      onChange={(e) => setContractSearch(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <select
                    value={contractStatusFilter}
                    onChange={(e) => setContractStatusFilter(e.target.value as 'all' | 'submitted' | 'completed' | 'rejected')}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="all">전체</option>
                    <option value="submitted">제출됨</option>
                    <option value="completed">완료됨</option>
                    <option value="rejected">거부됨</option>
                  </select>
                </div>
              </div>

              {/* 계약 목록 테이블 */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">신청자 정보</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">상태</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">제출일</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loadingManagedContracts ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                          계약 목록을 불러오는 중입니다...
                        </td>
                      </tr>
                    ) : (() => {
                      // 필터링된 계약서 목록
                      const filteredContracts = managedContracts.filter((contract) => {
                        const matchesSearch = !contractSearch || 
                          contract.name.toLowerCase().includes(contractSearch.toLowerCase()) ||
                          contract.phone.includes(contractSearch) ||
                          (contract.email && contract.email.toLowerCase().includes(contractSearch.toLowerCase()));
                        const matchesStatus = contractStatusFilter === 'all' || contract.status === contractStatusFilter;
                        return matchesSearch && matchesStatus;
                      });

                      if (filteredContracts.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-500">
                              {contractSearch || contractStatusFilter !== 'all' 
                                ? '검색 조건에 맞는 계약서가 없습니다.' 
                                : '계약서가 없습니다.'}
                            </td>
                          </tr>
                        );
                      }

                      return filteredContracts.map((contract) => (
                        <tr key={contract.id} className="hover:bg-blue-50/40">
                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-gray-900">{contract.name}</div>
                            <div className="text-xs text-gray-500">{contract.phone}</div>
                            {contract.email && <div className="text-xs text-gray-500">{contract.email}</div>}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                              contract.status === 'completed' ? 'bg-purple-50 text-purple-700' :
                              contract.status === 'submitted' ? 'bg-blue-50 text-blue-700' :
                              contract.status === 'rejected' ? 'bg-red-50 text-red-700' :
                              'bg-gray-50 text-gray-700'
                            }`}>
                              {contract.status === 'completed' ? <FiCheckCircle className="text-base" /> :
                               contract.status === 'submitted' ? <FiClock className="text-base" /> :
                               contract.status === 'rejected' ? <FiXCircle className="text-base" /> :
                               <FiFileText className="text-base" />}
                              {contract.status === 'completed' ? '완료됨' :
                               contract.status === 'submitted' ? '제출됨' :
                               contract.status === 'rejected' ? '거부됨' :
                               contract.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {contract.submittedAt
                              ? dayjs(contract.submittedAt).format('YYYY년 MM월 DD일')
                              : '-'}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewDetail(contract.id)}
                                disabled={loadingContractDetail}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <FiEye className="text-xs" />
                                상세
                              </button>
                              {contract.status === 'submitted' && (
                                <>
                                  <button
                                    onClick={() => handleCompleteContract(contract.id)}
                                    disabled={completingContractId === contract.id}
                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                    title="계약서 완료 승인 (PDF 전송)"
                                  >
                                    <FiFileText className="text-xs" />
                                    완료 승인
                                  </button>
                                  <button
                                    onClick={() => handleReject(contract.id)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                  >
                                    <FiXCircle className="text-xs" />
                                    거부
                                  </button>
                                </>
                              )}
                              {contract.status === 'completed' && (
                                <button
                                  onClick={() => handleSendPdf(contract.id)}
                                  disabled={sendingPdfContractId === contract.id}
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  <FiFileText className="text-xs" />
                                  PDF 보내기
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(contract.id)}
                                disabled={deletingContractId === contract.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                              >
                                <FiTrash2 className="text-xs" />
                                {deletingContractId === contract.id ? '삭제 중...' : '삭제'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 계약서 보내기 모달 */}
          {isBranchManager && (
            <ContractInviteModal
              isOpen={showSendContractModal}
              onClose={() => setShowSendContractModal(false)}
              contractType={contractType}
              onSuccess={() => {
                setShowSendContractModal(false);
                loadManagedContracts();
              }}
            />
          )}

          {/* 계약서 상세보기 모달 */}
          {isBranchManager && showContractDetail && selectedContract && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
                  <h2 className="text-2xl font-bold text-gray-900">계약서 상세 정보</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectedContract && handleSendPdf(selectedContract.id)}
                      disabled={!selectedContract || sendingPdfContractId === selectedContract.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FiSend className="text-sm" />
                      {sendingPdfContractId === selectedContract?.id ? '전송 중...' : 'PDF로 보내기'}
                    </button>
                    <button
                      onClick={() => {
                        setShowContractDetail(false);
                        setSelectedContract(null);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FiX className="text-xl text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* 기본 정보 */}
                  <section className="rounded-xl bg-gray-50 p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">기본 정보</h3>
                    <div className="grid gap-4 md:grid-cols-2 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">성명:</span>
                        <span className="ml-2 text-gray-900">{selectedContract.name}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">연락처:</span>
                        <span className="ml-2 text-gray-900">{selectedContract.phone}</span>
                      </div>
                      {selectedContract.email && (
                        <div>
                          <span className="font-semibold text-gray-700">이메일:</span>
                          <span className="ml-2 text-gray-900">{selectedContract.email}</span>
                        </div>
                      )}
                      {selectedContract.residentId && (
                        <div>
                          <span className="font-semibold text-gray-700">주민등록번호:</span>
                          <span className="ml-2 text-gray-900">{selectedContract.residentId}</span>
                        </div>
                      )}
                      {selectedContract.address && (
                        <div className="md:col-span-2">
                          <span className="font-semibold text-gray-700">주소:</span>
                          <span className="ml-2 text-gray-900">{selectedContract.address}</span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* 정산 계좌 정보 */}
                  {(selectedContract.bankName || selectedContract.bankAccount) && (
                    <section className="rounded-xl bg-gray-50 p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">정산 계좌 정보</h3>
                      <div className="grid gap-4 md:grid-cols-2 text-sm">
                        {selectedContract.bankName && (
                          <div>
                            <span className="font-semibold text-gray-700">은행명:</span>
                            <span className="ml-2 text-gray-900">{selectedContract.bankName}</span>
                          </div>
                        )}
                        {selectedContract.bankAccount && (
                          <div>
                            <span className="font-semibold text-gray-700">계좌번호:</span>
                            <span className="ml-2 text-gray-900">{selectedContract.bankAccount}</span>
                          </div>
                        )}
                        {selectedContract.bankAccountHolder && (
                          <div>
                            <span className="font-semibold text-gray-700">예금주:</span>
                            <span className="ml-2 text-gray-900">{selectedContract.bankAccountHolder}</span>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* 계약서 상태 */}
                  <section className="rounded-xl bg-gray-50 p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">계약서 상태</h3>
                    <div className="grid gap-4 md:grid-cols-2 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">상태:</span>
                        <span className={`ml-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          selectedContract.status === 'completed' ? 'bg-purple-50 text-purple-700' :
                          selectedContract.status === 'submitted' ? 'bg-blue-50 text-blue-700' :
                          selectedContract.status === 'rejected' ? 'bg-red-50 text-red-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {selectedContract.status === 'completed' ? <FiCheckCircle className="text-base" /> :
                           selectedContract.status === 'submitted' ? <FiClock className="text-base" /> :
                           selectedContract.status === 'rejected' ? <FiXCircle className="text-base" /> :
                           <FiFileText className="text-base" />}
                          {selectedContract.status === 'completed' ? '완료됨' :
                           selectedContract.status === 'submitted' ? '제출됨' :
                           selectedContract.status === 'rejected' ? '거부됨' :
                           selectedContract.status}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">제출일:</span>
                        <span className="ml-2 text-gray-900">
                          {selectedContract.submittedAt
                            ? dayjs(selectedContract.submittedAt).format('YYYY년 MM월 DD일 HH:mm')
                            : selectedContract.createdAt
                              ? dayjs(selectedContract.createdAt).format('YYYY년 MM월 DD일 HH:mm')
                              : '-'}
                        </span>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowContractDetail(false);
                      setSelectedContract(null);
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => {
                      if (selectedContract) {
                        handleDelete(selectedContract.id);
                        setShowContractDetail(false);
                        setSelectedContract(null);
                      }
                    }}
                    disabled={deletingContractId === selectedContract?.id}
                    className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {deletingContractId === selectedContract?.id ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 서명 확대 모달 */}
      {showSignatureModal && signatureUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
          onClick={() => setShowSignatureModal(false)}
        >
          <div
            className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">나의 서명</h3>
                <p className="text-xs text-slate-500">{contract.name}</p>
              </div>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-8">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 flex items-center justify-center">
                <img
                  src={signatureUrl}
                  alt="나의 서명"
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <a
                href={signatureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                새 창에서 열기
              </a>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
