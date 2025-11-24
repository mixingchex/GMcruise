'use client';

import { useState } from 'react';
import ComparativeQuote from '@/components/admin/documents/ComparativeQuote';
import PartnerCertificate from '@/components/partner/documents/PartnerCertificate';

type TabType = 'comparison' | 'purchase' | 'refund';

export default function PartnerDocumentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('comparison');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">서류 관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            비교견적서, 구매확인증서, 환불인증서를 생성하고 관리합니다.
          </p>
        </div>

        {/* 탭 네비게이션 */}
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
          </nav>
        </div>

        {/* 조건부 렌더링 */}
        <div className="mt-6">
          {activeTab === 'comparison' && <ComparativeQuote key="comparison" />}
          {activeTab === 'purchase' && <PartnerCertificate key="purchase" type="purchase" />}
          {activeTab === 'refund' && <PartnerCertificate key="refund" type="refund" />}
        </div>
      </div>
    </div>
  );
}






















