'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import dynamic from 'next/dynamic';

// 성능 최적화: PDF 관련 큰 컴포넌트들을 동적 임포트
const ComparativeQuote = dynamic(
  () => import('@/components/admin/documents/ComparativeQuote'),
  {
    loading: () => (
      <div className="animate-pulse bg-gray-100 rounded-lg p-8">
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    ),
    ssr: false,
  }
);

const Certificate = dynamic(
  () => import('@/components/admin/documents/Certificate'),
  {
    loading: () => (
      <div className="animate-pulse bg-gray-100 rounded-lg p-8">
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    ),
    ssr: false,
  }
);

const CertificateApprovals = dynamic(
  () => import('@/components/admin/documents/CertificateApprovals'),
  {
    loading: () => (
      <div className="animate-pulse bg-gray-100 rounded-lg p-8">
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    ),
    ssr: false,
  }
);

type TabType = 'comparison' | 'purchase' | 'refund' | 'approvals';

export default function PartnerDocumentsPage() {
  const params = useParams();
  const partnerId = params.partnerId as string;
  const [activeTab, setActiveTab] = useState<TabType>('comparison');
  const [userRole, setUserRole] = useState<'BRANCH_MANAGER' | 'SALES_AGENT' | 'HQ' | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

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
        console.error('[PartnerDocumentsPage] Failed to fetch user role:', error);
      } finally {
        setIsLoadingRole(false);
      }
    };
    fetchUserRole();
  }, []);

  const isSalesAgent = userRole === 'SALES_AGENT';
  const isBranchManager = userRole === 'BRANCH_MANAGER';

  // 판매원은 비교견적서만 보이도록 탭 제한
  useEffect(() => {
    if (isSalesAgent && activeTab !== 'comparison') {
      setActiveTab('comparison');
    }
  }, [isSalesAgent, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">서류 관리</h1>
            <Link
              href={`/partner/${partnerId}/dashboard`}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
            >
              <FiArrowLeft className="w-4 h-4" />
              대시보드로 돌아가기
            </Link>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        {!isLoadingRole && (
          <div className="mb-6 border-b border-gray-200 bg-white rounded-lg shadow-sm">
            <nav className="flex gap-1 px-4" aria-label="문서 탭">
              <button
                onClick={() => setActiveTab('comparison')}
                className={`px-6 py-4 text-sm font-semibold transition-all duration-200 rounded-t-lg ${
                  activeTab === 'comparison'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                비교견적서
              </button>
              {/* 판매원은 구매확인증서, 환불인증서, 승인 관리 탭 숨김 */}
              {!isSalesAgent && (
                <>
                  <button
                    onClick={() => setActiveTab('purchase')}
                    className={`px-6 py-4 text-sm font-semibold transition-all duration-200 rounded-t-lg ${
                      activeTab === 'purchase'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    구매확인증서
                  </button>
                  <button
                    onClick={() => setActiveTab('refund')}
                    className={`px-6 py-4 text-sm font-semibold transition-all duration-200 rounded-t-lg ${
                      activeTab === 'refund'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    환불인증서
                  </button>
                  <button
                    onClick={() => setActiveTab('approvals')}
                    className={`px-6 py-4 text-sm font-semibold transition-all duration-200 rounded-t-lg ${
                      activeTab === 'approvals'
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    승인 관리
                  </button>
                </>
              )}
            </nav>
          </div>
        )}

        {/* 조건부 렌더링 */}
        <div className="mt-6">
          {activeTab === 'comparison' && <ComparativeQuote key="comparison" />}
          {!isSalesAgent && activeTab === 'purchase' && <Certificate key="purchase" type="purchase" />}
          {!isSalesAgent && activeTab === 'refund' && <Certificate key="refund" type="refund" />}
          {!isSalesAgent && activeTab === 'approvals' && <CertificateApprovals key="approvals" />}
        </div>
      </div>
    </div>
  );
}

























