'use client';

import { useState } from 'react';
import { FiFileText } from 'react-icons/fi';
import CustomerNoteModal from '@/components/admin/CustomerNoteModal';

type AffiliateOwnership = {
  ownerType: 'HQ' | 'BRANCH_MANAGER' | 'SALES_AGENT';
  ownerName: string | null;
  ownerNickname: string | null;
};

interface ProductInquiryCustomer {
  id: number;
  name: string | null;
  phone: string | null;
  createdAt: string;
  cruiseName: string | null; // 가장 최신 여행의 cruiseName
  affiliateOwnership?: AffiliateOwnership | null;
  userId?: number | null; // CustomerNoteModal을 위한 userId
}

interface Props {
  customers: ProductInquiryCustomer[];
  onRefresh?: () => void;
}

export default function ProductInquiryCustomerTable({ customers, onRefresh }: Props) {
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedCustomerForNote, setSelectedCustomerForNote] = useState<{ id: number; name: string | null } | null>(null);

  // 담당자 이름 표시 함수 (간소화)
  const renderOwnerName = (ownership?: AffiliateOwnership | null) => {
    if (!ownership) {
      return <span className="text-gray-400">담당자 없음</span>;
    }

    const name = ownership.ownerNickname || ownership.ownerName || '미지정';
    const role = ownership.ownerType === 'BRANCH_MANAGER' ? '대리점장' : 
                 ownership.ownerType === 'SALES_AGENT' ? '판매원' : 
                 '본사';

    return (
      <span className="text-sm text-gray-900">
        {name} ({role})
      </span>
    );
  };

  // 날짜 포맷팅 (YYYY-MM-DD)
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">신청 날짜</th>
              <th className="px-6 py-4 text-left font-semibold">관심 상품</th>
              <th className="px-6 py-4 text-left font-semibold">고객 이름</th>
              <th className="px-6 py-4 text-left font-semibold">연락처</th>
              <th className="px-6 py-4 text-left font-semibold">담당자</th>
              <th className="px-6 py-4 text-left font-semibold">상세 기록</th>
            </tr>
          </thead>
          <tbody className="text-brand-neutral">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  전화상담 고객이 없습니다.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {customer.cruiseName || '상담 예정'}
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {customer.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {customer.phone || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {renderOwnerName(customer.affiliateOwnership)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        if (customer.userId) {
                          setSelectedCustomerForNote({ id: customer.userId, name: customer.name });
                          setNoteModalOpen(true);
                        } else {
                          alert('고객 ID가 없어 기록을 열 수 없습니다.');
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      title="기록 보기"
                    >
                      <FiFileText size={16} />
                      기록 보기
                    </button>
                  </td>
                </tr>
              ))
            )}
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

