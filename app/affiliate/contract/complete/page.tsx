// app/affiliate/contract/complete/page.tsx
// 계약서 완료 후 결제 페이지 안내 페이지

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FiCheckCircle, FiArrowRight, FiLoader } from 'react-icons/fi';

type ContractType = 'SALES_AGENT' | 'BRANCH_MANAGER' | 'CRUISE_STAFF' | 'PRIMARKETER';

const PAYMENT_LINKS: Record<ContractType, string> = {
  SALES_AGENT: 'http://leadz.kr/yej',
  BRANCH_MANAGER: 'http://leadz.kr/xWG',
  CRUISE_STAFF: 'http://leadz.kr/yek',
  PRIMARKETER: 'http://leadz.kr/ymF',
};

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  SALES_AGENT: '판매원',
  BRANCH_MANAGER: '대리점장',
  CRUISE_STAFF: '크루즈 스태프',
  PRIMARKETER: '프리마케터',
};

function ContractCompletePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const contractId = searchParams.get('contractId');
  const contractType = searchParams.get('type') as ContractType | null;
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (contractId) {
      // 계약서 정보 조회
      fetch(`/api/affiliate/contracts/${contractId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setContract(data.contract);
            // metadata에서 contractType 가져오기
            if (!contractType && data.contract.metadata?.contractType) {
              const url = new URL(window.location.href);
              url.searchParams.set('type', data.contract.metadata.contractType);
              window.history.replaceState({}, '', url.toString());
            }
          }
        })
        .catch((err) => {
          console.error('[ContractComplete] Error:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [contractId, contractType]);

  const handlePayment = () => {
    const finalContractType = contractType || contract?.metadata?.contractType || 'SALES_AGENT';
    const paymentLink = PAYMENT_LINKS[finalContractType as ContractType] || PAYMENT_LINKS.SALES_AGENT;
    
    if (!paymentLink) {
      alert('결제 링크를 찾을 수 없습니다.');
      return;
    }

    setRedirecting(true);
    // 결제 페이지로 이동
    window.location.href = paymentLink;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const finalContractType = contractType || contract?.metadata?.contractType || 'SALES_AGENT';
  const contractTypeLabel = CONTRACT_TYPE_LABELS[finalContractType as ContractType] || '어필리에이트';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-lg p-8">
        <div className="text-center mb-6">
          <FiCheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            계약서 접수 완료되었습니다
          </h1>
          <p className="text-slate-600 mb-6 text-lg">
            다음 결제 페이지로 안내 드리도록 하겠습니다.
          </p>
          {contractId && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-500">계약서 번호</p>
              <p className="text-lg font-semibold text-slate-900">{contractId}</p>
              {contractTypeLabel && (
                <p className="text-sm text-slate-500 mt-1">계약 유형: {contractTypeLabel}</p>
              )}
            </div>
          )}
        </div>

        {/* 결제 페이지 안내 배너 */}
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-2">
              결제하기
            </h2>
            <p className="text-sm text-blue-100 mb-4">
              아래 버튼을 클릭하시면 결제 페이지로 이동합니다.
            </p>
            <button
              onClick={handlePayment}
              disabled={redirecting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 text-lg font-semibold text-blue-600 hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {redirecting ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  이동 중...
                </>
              ) : (
                <>
                  결제하기
                  <FiArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-500 mb-4">
            결제는 안전한 결제 시스템을 통해 진행됩니다.
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-slate-600 hover:text-slate-900 underline"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContractCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">로딩 중...</p>
        </div>
      </div>
    }>
      <ContractCompletePageInner />
    </Suspense>
  );
}

