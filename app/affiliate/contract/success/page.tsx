// app/affiliate/contract/success/page.tsx
// 결제 완료 페이지

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiCheckCircle, FiXCircle, FiFileText, FiDownload } from 'react-icons/fi';

function ContractSuccessPageInner() {
  const searchParams = useSearchParams();
  const contractId = searchParams.get('contractId');
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    if (contractId) {
      // 계약서 정보 조회
      fetch(`/api/affiliate/contracts/${contractId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setContract(data.contract);
            // 계약서가 완료된 경우 PDF URL 생성
            if (data.contract.status === 'completed') {
              setPdfUrl(`/api/affiliate/contracts/${contractId}/pdf`);
            }
          }
        })
        .catch((err) => {
          console.error('[ContractSuccess] Error:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [contractId]);

  const handleViewPdf = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleDownloadPdf = () => {
    if (pdfUrl) {
      setLoadingPdf(true);
      fetch(pdfUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `contract-${contractId}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        })
        .catch((err) => {
          console.error('[ContractSuccess] PDF 다운로드 오류:', err);
          alert('PDF 다운로드 중 오류가 발생했습니다.');
        })
        .finally(() => {
          setLoadingPdf(false);
        });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-lg p-8">
        <div className="text-center mb-6">
          <FiCheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            계약서 접수 및 결제 완료
          </h1>
          <p className="text-slate-600 mb-6">
            계약서가 성공적으로 접수되었고 결제가 완료되었습니다.
            <br />
            본사에서 확인 후 연락드릴 예정입니다.
          </p>
          {contractId && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-500">계약서 번호</p>
              <p className="text-lg font-semibold text-slate-900">{contractId}</p>
            </div>
          )}
        </div>

        {/* PDF 표시 섹션 */}
        {pdfUrl && (
          <div className="mb-6 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <FiFileText className="text-2xl text-blue-600" />
              <h2 className="text-lg font-bold text-blue-900">계약서 PDF</h2>
            </div>
            <p className="text-sm text-blue-700 mb-4">
              계약서가 완료되어 PDF로 확인하실 수 있습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleViewPdf}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <FiFileText />
                PDF 보기
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={loadingPdf}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-blue-600 px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {loadingPdf ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    다운로드 중...
                  </>
                ) : (
                  <>
                    <FiDownload />
                    PDF 다운로드
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => (window.location.href = '/')}
            className="w-full rounded-xl bg-blue-500 text-white py-3 font-semibold hover:bg-blue-600 transition-colors"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContractSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">로딩 중...</p>
        </div>
      </div>
    }>
      <ContractSuccessPageInner />
    </Suspense>
  );
}



