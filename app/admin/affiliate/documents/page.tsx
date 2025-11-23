'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiFileText,
  FiDownload,
  FiSend,
  FiSearch,
  FiRefreshCw,
  FiX,
  FiCheckCircle,
  FiDollarSign,
  FiUser,
  FiPackage,
  FiCalendar,
  FiImage,
  FiLoader,
  FiExternalLink,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';
import html2canvas from 'html2canvas';
import ComparisonQuoteImage from '@/components/admin/ComparisonQuoteImage';

type DocumentType = 'COMPARISON_QUOTE' | 'PURCHASE_CONFIRMATION' | 'REFUND_CERTIFICATE';

type AffiliateSale = {
  id: number;
  externalOrderCode: string | null;
  productCode: string | null;
  saleAmount: number;
  status: string;
  saleDate: string | null;
  refundedAt: string | null;
  cancellationReason: string | null;
  lead: {
    id: number;
    customerName: string | null;
    customerPhone: string | null;
  } | null;
  product: {
    productName: string | null;
  } | null;
  manager: {
    id: number;
    displayName: string | null;
  } | null;
  agent: {
    id: number;
    displayName: string | null;
  } | null;
};

export default function AdminDocumentsPage() {
  const router = useRouter();
  const [sales, setSales] = useState<AffiliateSale[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    documentType: 'all' as DocumentType | 'all',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<AffiliateSale | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const quoteImageRef = useRef<HTMLDivElement>(null);

  // 타사 비교 견적서 폼 데이터
  const [comparisonQuoteData, setComparisonQuoteData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    productCode: '',
    productName: '',
    ourPrice: 0,
    competitorPrices: [{ companyName: '', price: 0, notes: '' }],
    headcount: undefined as number | undefined,
    cabinType: '',
    fareCategory: '',
  });

  useEffect(() => {
    loadSales();
  }, [filters]);

  const loadSales = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== 'all') {
        params.set('status', filters.status);
      }
      if (filters.search.trim()) {
        params.set('search', filters.search.trim());
      }

      const res = await fetch(`/api/admin/affiliate/sales?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '판매 목록을 불러오지 못했습니다.');
      }

      setSales(json.sales || []);
    } catch (error: any) {
      console.error('[AdminDocuments] load error', error);
      showError(error.message || '판매 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (sale: AffiliateSale, documentType: DocumentType) => {
    setSelectedSale(sale);
    setSelectedDocumentType(documentType);

    // 판매 정보로 폼 초기화
    if (documentType === 'COMPARISON_QUOTE') {
      setComparisonQuoteData({
        customerName: sale.lead?.customerName || '',
        customerPhone: sale.lead?.customerPhone || '',
        customerEmail: '',
        productCode: sale.productCode || '',
        productName: sale.product?.productName || '',
        ourPrice: sale.saleAmount,
        competitorPrices: [{ companyName: '', price: 0, notes: '' }],
        headcount: undefined,
        cabinType: '',
        fareCategory: '',
      });

      // 상품 코드가 있으면 상품 정보 자동 불러오기
      if (sale.productCode) {
        loadProductInfo(sale.productCode);
      }
    }

    setIsModalOpen(true);
  };

  const loadProductInfo = async (productCode: string) => {
    try {
      setIsLoadingProduct(true);
      const res = await fetch(`/api/admin/affiliate/documents/product-info?productCode=${encodeURIComponent(productCode)}`);
      const json = await res.json();
      
      if (res.ok && json.ok && json.product) {
        setComparisonQuoteData((prev) => ({
          ...prev,
          productName: json.product.productName,
          productCode: json.product.productCode,
          ourPrice: json.product.basePrice || prev.ourPrice,
        }));
        showSuccess('상품 정보를 불러왔습니다.');
      }
    } catch (error: any) {
      console.error('[Load Product Info] Error:', error);
      // 상품 정보 불러오기 실패해도 계속 진행
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const handleLoadProductInfo = () => {
    if (!comparisonQuoteData.productCode.trim()) {
      showError('상품 코드를 입력해주세요.');
      return;
    }
    loadProductInfo(comparisonQuoteData.productCode.trim());
  };

  const handleDownloadImage = async () => {
    if (!quoteImageRef.current) {
      showError('견적서 이미지를 찾을 수 없습니다.');
      return;
    }

    try {
      setIsDownloadingImage(true);
      
      // html2canvas로 이미지 생성
      const canvas = await html2canvas(quoteImageRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 고해상도
        logging: false,
        useCORS: true,
      });

      // PNG로 다운로드
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const fileName = `비교견적서_${comparisonQuoteData.customerName}_${new Date().toISOString().split('T')[0]}.png`;
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess('견적서 이미지가 다운로드되었습니다.');
    } catch (error: any) {
      console.error('[Download Image] Error:', error);
      showError('이미지 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleGenerateDocument = async () => {
    if (!selectedSale || !selectedDocumentType) return;

    try {
      setIsGenerating(true);

      // 비교견적서는 이미지 다운로드만 (API 호출 없음)
      if (selectedDocumentType === 'COMPARISON_QUOTE') {
        if (!comparisonQuoteData.customerName || !comparisonQuoteData.productCode || !comparisonQuoteData.ourPrice) {
          showError('필수 정보를 입력해주세요 (고객명, 상품코드, 가격)');
          return;
        }

        // 이미지 다운로드
        await handleDownloadImage();
        showSuccess('비교견적서 이미지가 다운로드되었습니다.');
        setIsModalOpen(false);
        setSelectedSale(null);
        setSelectedDocumentType(null);
        return;
      }

      // 구매확인서, 환불완료증서는 API 호출
      let requestBody: any = {
        documentType: selectedDocumentType,
        saleId: selectedSale.id,
        leadId: selectedSale.lead?.id,
      };

      const res = await fetch('/api/admin/affiliate/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || '문서 생성에 실패했습니다.');
      }

      showSuccess(json.message || '문서가 생성되었습니다.');
      setIsModalOpen(false);
      setSelectedSale(null);
      setSelectedDocumentType(null);
    } catch (error: any) {
      console.error('[AdminDocuments] generate error', error);
      showError(error.message || '문서 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addCompetitorPrice = () => {
    setComparisonQuoteData((prev) => ({
      ...prev,
      competitorPrices: [...prev.competitorPrices, { companyName: '', price: 0, notes: '' }],
    }));
  };

  const removeCompetitorPrice = (index: number) => {
    setComparisonQuoteData((prev) => ({
      ...prev,
      competitorPrices: prev.competitorPrices.filter((_, i) => i !== index),
    }));
  };

  const updateCompetitorPrice = (index: number, field: string, value: string | number) => {
    setComparisonQuoteData((prev) => ({
      ...prev,
      competitorPrices: prev.competitorPrices.map((cp, i) =>
        i === index ? { ...cp, [field]: value } : cp
      ),
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REFUNDED':
        return 'bg-red-50 text-red-700';
      case 'CONFIRMED':
      case 'PAID':
        return 'bg-emerald-50 text-emerald-700';
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'REFUNDED':
        return '환불됨';
      case 'CONFIRMED':
        return '확정됨';
      case 'PAID':
        return '지급완료';
      case 'PENDING':
        return '대기중';
      default:
        return status;
    }
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    switch (type) {
      case 'COMPARISON_QUOTE':
        return '타사 비교 견적서';
      case 'PURCHASE_CONFIRMATION':
        return '구매확인서';
      case 'REFUND_CERTIFICATE':
        return '환불완료증서';
    }
  };

  const canGenerateDocument = (sale: AffiliateSale, type: DocumentType) => {
    switch (type) {
      case 'COMPARISON_QUOTE':
        return sale.status !== 'REFUNDED' && sale.status !== 'CANCELLED';
      case 'PURCHASE_CONFIRMATION':
        return sale.status === 'CONFIRMED' || sale.status === 'PAID';
      case 'REFUND_CERTIFICATE':
        return sale.status === 'REFUNDED';
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-24">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-10 md:px-6">
        {/* 헤더 */}
        <header className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold">서류관리</h1>
              <p className="text-sm text-white/80">
                타사 비교 견적서, 구매확인서, 환불완료증서를 생성하고 관리합니다.
              </p>
            </div>
            <button
              onClick={loadSales}
              className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30"
            >
              <FiRefreshCw className="text-base" />
              새로고침
            </button>
          </div>
        </header>

        {/* 필터 */}
        <section className="rounded-3xl bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="주문번호, 상품코드, 고객명 검색..."
                  className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">전체 상태</option>
                <option value="PENDING">대기중</option>
                <option value="CONFIRMED">확정됨</option>
                <option value="PAID">지급완료</option>
                <option value="REFUNDED">환불됨</option>
              </select>
            </div>
          </div>
        </section>

        {/* 판매 목록 */}
        <section className="rounded-3xl bg-white shadow-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">주문 정보</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">고객 정보</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">판매 금액</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">판매일</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">문서 생성</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                      판매 목록을 불러오는 중입니다...
                    </td>
                  </tr>
                )}
                {!isLoading && sales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                      조건에 해당하는 판매 내역이 없습니다.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-blue-50/40">
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {sale.externalOrderCode || `#${sale.id}`}
                        </div>
                        {sale.productCode && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <FiPackage className="text-xs" />
                            {sale.productCode}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {sale.lead ? (
                          <button
                            onClick={() => router.push(`/admin/affiliate/customers/${sale.lead!.id}`)}
                            className="text-left hover:bg-blue-50 rounded-lg p-2 -m-2 transition-colors group"
                          >
                            <div className="text-sm font-medium text-blue-600 group-hover:text-blue-800 flex items-center gap-1">
                              {sale.lead.customerName || '이름 없음'}
                              <FiExternalLink className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {sale.lead.customerPhone && (
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <FiUser className="text-xs" />
                                {sale.lead.customerPhone}
                              </div>
                            )}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">고객 정보 없음</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {sale.saleAmount.toLocaleString()}원
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(sale.status)}`}
                        >
                          {getStatusLabel(sale.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {canGenerateDocument(sale, 'COMPARISON_QUOTE') && (
                            <button
                              onClick={() => handleOpenModal(sale, 'COMPARISON_QUOTE')}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                              title="타사 비교 견적서"
                            >
                              <FiFileText className="text-xs" />
                              견적서
                            </button>
                          )}
                          {canGenerateDocument(sale, 'PURCHASE_CONFIRMATION') && (
                            <button
                              onClick={() => handleOpenModal(sale, 'PURCHASE_CONFIRMATION')}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                              title="구매확인서"
                            >
                              <FiCheckCircle className="text-xs" />
                              구매확인
                            </button>
                          )}
                          {canGenerateDocument(sale, 'REFUND_CERTIFICATE') && (
                            <button
                              onClick={() => handleOpenModal(sale, 'REFUND_CERTIFICATE')}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                              title="환불완료증서"
                            >
                              <FiDollarSign className="text-xs" />
                              환불증서
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 문서 생성 모달 */}
        {isModalOpen && selectedSale && selectedDocumentType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sticky top-0 bg-white">
                <h2 className="text-xl font-extrabold text-gray-900">
                  {getDocumentTypeLabel(selectedDocumentType)} 생성
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedSale(null);
                    setSelectedDocumentType(null);
                  }}
                  className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                {selectedDocumentType === 'COMPARISON_QUOTE' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <h3 className="mb-2 text-base font-semibold text-gray-800">판매 정보</h3>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
                        <div>
                          <dt className="font-semibold text-gray-500">주문번호</dt>
                          <dd>{selectedSale.externalOrderCode || `#${selectedSale.id}`}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-gray-500">상품코드</dt>
                          <dd>{selectedSale.productCode || '-'}</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        고객명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={comparisonQuoteData.customerName}
                        onChange={(e) =>
                          setComparisonQuoteData((prev) => ({ ...prev, customerName: e.target.value }))
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">고객 전화번호</label>
                        <input
                          type="text"
                          value={comparisonQuoteData.customerPhone}
                          onChange={(e) =>
                            setComparisonQuoteData((prev) => ({ ...prev, customerPhone: e.target.value }))
                          }
                          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">고객 이메일</label>
                        <input
                          type="email"
                          value={comparisonQuoteData.customerEmail}
                          onChange={(e) =>
                            setComparisonQuoteData((prev) => ({ ...prev, customerEmail: e.target.value }))
                          }
                          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            상품코드 <span className="text-red-500">*</span>
                          </label>
                          <button
                            onClick={handleLoadProductInfo}
                            disabled={isLoadingProduct || !comparisonQuoteData.productCode.trim()}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
                          >
                            {isLoadingProduct ? (
                              <>
                                <FiLoader className="animate-spin text-xs" />
                                불러오는 중...
                              </>
                            ) : (
                              <>
                                <FiPackage className="text-xs" />
                                상품 정보 불러오기
                              </>
                            )}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={comparisonQuoteData.productCode}
                          onChange={(e) =>
                            setComparisonQuoteData((prev) => ({ ...prev, productCode: e.target.value }))
                          }
                          placeholder="예: MSC001"
                          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">상품명</label>
                        <input
                          type="text"
                          value={comparisonQuoteData.productName}
                          onChange={(e) =>
                            setComparisonQuoteData((prev) => ({ ...prev, productName: e.target.value }))
                          }
                          placeholder="자동으로 불러옵니다"
                          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          우리 가격 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={comparisonQuoteData.ourPrice || ''}
                          onChange={(e) =>
                            setComparisonQuoteData((prev) => ({
                              ...prev,
                              ourPrice: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">인원수</label>
                        <input
                          type="number"
                          value={comparisonQuoteData.headcount || ''}
                          onChange={(e) =>
                            setComparisonQuoteData((prev) => ({
                              ...prev,
                              headcount: e.target.value ? parseInt(e.target.value) : undefined,
                            }))
                          }
                          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">객실타입</label>
                        <input
                          type="text"
                          value={comparisonQuoteData.cabinType}
                          onChange={(e) =>
                            setComparisonQuoteData((prev) => ({ ...prev, cabinType: e.target.value }))
                          }
                          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-gray-700">타사 가격 비교</label>
                        <button
                          onClick={addCompetitorPrice}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          + 추가
                        </button>
                      </div>
                      <div className="space-y-2">
                        {comparisonQuoteData.competitorPrices.map((cp, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder="업체명"
                              value={cp.companyName}
                              onChange={(e) => updateCompetitorPrice(index, 'companyName', e.target.value)}
                              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                            <input
                              type="number"
                              placeholder="가격"
                              value={cp.price || ''}
                              onChange={(e) => updateCompetitorPrice(index, 'price', parseInt(e.target.value) || 0)}
                              className="w-32 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                            <input
                              type="text"
                              placeholder="비고"
                              value={cp.notes}
                              onChange={(e) => updateCompetitorPrice(index, 'notes', e.target.value)}
                              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                            {comparisonQuoteData.competitorPrices.length > 1 && (
                              <button
                                onClick={() => removeCompetitorPrice(index)}
                                className="p-2 text-red-600 hover:text-red-700"
                              >
                                <FiX className="text-base" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 비교견적서 미리보기 및 이미지 다운로드 */}
                    {comparisonQuoteData.customerName &&
                      comparisonQuoteData.productCode &&
                      comparisonQuoteData.ourPrice > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">견적서 미리보기</h3>
                            <button
                              onClick={handleDownloadImage}
                              disabled={isDownloadingImage}
                              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-green-700 disabled:bg-green-300"
                            >
                              {isDownloadingImage ? (
                                <>
                                  <FiLoader className="animate-spin text-base" />
                                  다운로드 중...
                                </>
                              ) : (
                                <>
                                  <FiDownload className="text-base" />
                                  이미지 다운로드 (PNG)
                                </>
                              )}
                            </button>
                          </div>
                          <div className="bg-gray-100 p-4 rounded-xl overflow-x-auto">
                            <div className="inline-block" ref={quoteImageRef}>
                              <ComparisonQuoteImage
                                customerName={comparisonQuoteData.customerName}
                                productCode={comparisonQuoteData.productCode}
                                productName={comparisonQuoteData.productName || comparisonQuoteData.productCode}
                                ourPrice={comparisonQuoteData.ourPrice}
                                competitorPrices={comparisonQuoteData.competitorPrices.filter(
                                  (cp) => cp.companyName && cp.price > 0
                                )}
                                headcount={comparisonQuoteData.headcount}
                                cabinType={comparisonQuoteData.cabinType}
                                fareCategory={comparisonQuoteData.fareCategory}
                                responsibleName={
                                  selectedSale.agent?.displayName ||
                                  selectedSale.manager?.displayName ||
                                  '담당자'
                                }
                                responsibleRole={
                                  selectedSale.agent ? '판매원' : '대리점장'
                                }
                                date={new Date().toISOString()}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {(selectedDocumentType === 'PURCHASE_CONFIRMATION' ||
                  selectedDocumentType === 'REFUND_CERTIFICATE') && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <h3 className="mb-2 text-base font-semibold text-gray-800">판매 정보</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
                      <div>
                        <dt className="font-semibold text-gray-500">주문번호</dt>
                        <dd>{selectedSale.externalOrderCode || `#${selectedSale.id}`}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-gray-500">상품코드</dt>
                        <dd>{selectedSale.productCode || '-'}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-gray-500">고객명</dt>
                        <dd>{selectedSale.lead?.customerName || '-'}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-gray-500">판매 금액</dt>
                        <dd className="font-semibold text-gray-900">
                          {selectedSale.saleAmount.toLocaleString()}원
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-4 text-sm text-gray-600">
                      {selectedDocumentType === 'PURCHASE_CONFIRMATION'
                        ? '구매확인서가 고객에게 자동으로 발송됩니다.'
                        : '환불완료증서가 생성됩니다.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 sticky bottom-0 bg-white">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedSale(null);
                    setSelectedDocumentType(null);
                  }}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                  disabled={isGenerating}
                >
                  취소
                </button>
                {selectedDocumentType === 'COMPARISON_QUOTE' ? (
                  <button
                    onClick={handleDownloadImage}
                    disabled={isDownloadingImage || !comparisonQuoteData.customerName || !comparisonQuoteData.productCode || !comparisonQuoteData.ourPrice}
                    className="rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-green-700 disabled:bg-green-300"
                  >
                    {isDownloadingImage ? (
                      <>
                        <FiLoader className="inline animate-spin mr-2" />
                        다운로드 중...
                      </>
                    ) : (
                      <>
                        <FiDownload className="inline mr-2" />
                        이미지 다운로드
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateDocument}
                    disabled={isGenerating}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {isGenerating ? '생성 중...' : '문서 생성'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

