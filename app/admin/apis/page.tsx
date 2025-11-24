'use client';

import { useState, useEffect } from 'react';
import { FiDownload, FiLoader, FiSearch, FiFileText, FiUsers, FiCalendar, FiPackage, FiEdit, FiPlus, FiX, FiExternalLink } from 'react-icons/fi';
import { showSuccess, showError } from '@/components/ui/Toast';

interface Product {
  productCode: string;
  cruiseLine: string;
  shipName: string;
  packageName: string;
  startDate: string | null;
  endDate: string | null;
  customerCount: number;
  saleStatus: string;
  folderUrl: string | null;
  spreadsheetUrl: string | null;
  tripId: number | null;
}

interface Customer {
  userId: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  tripId: number;
  productCode: string;
  cruiseName: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

interface TravelerData {
  id?: number;
  roomNumber: number;
  korName: string;
  engSurname: string;
  engGivenName: string;
  residentNum: string;
  passportNo: string;
  birthDate: string;
  issueDate: string;
  expiryDate: string;
  nationality: string;
  gender: string;
}

interface PassportGuestData {
  id: number;
  groupNumber: number;
  name: string;
  phone: string | null;
  passportNumber: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  passportExpiryDate: string | null;
}

interface CustomerAPISData {
  userId: number;
  name: string;
  phone: string;
  email: string;
  productCode: string;
  cruiseLine: string | null;
  shipName: string | null;
  packageName: string | null;
  startDate: string | null;
  endDate: string | null;
  cabinType: string | null;
  travelers: TravelerData[];
  passportGuests?: PassportGuestData[];
  passportSubmissionId?: number | null;
  passportDriveFolderUrl?: string | null;
  passportSubmittedAt?: string | null;
}

export default function APISPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProductForRequest, setSelectedProductForRequest] = useState<Product | null>(null);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerAPISData, setCustomerAPISData] = useState<CustomerAPISData | null>(null);
  const [loadingCustomerDetail, setLoadingCustomerDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 날짜 형식 변환 함수 (ISO 문자열 -> yyyy-MM-dd)
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // 판매 중인 여행 목록 로드
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/apis/product-apis-list', {
        credentials: 'include',
      });
      const data = await response.json();

      if (!data.ok) {
        showError(data.message || '여행 목록을 불러오는데 실패했습니다.');
        return;
      }

      setProducts(data.apisData || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      showError('여행 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 특정 여행의 구매자 목록 로드
  const loadCustomers = async (productCode: string) => {
    try {
      setLoadingCustomers(true);
      const response = await fetch(`/api/admin/apis/product-customers?productCode=${encodeURIComponent(productCode)}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (!data.ok) {
        showError(data.message || '구매자 목록을 불러오는데 실패했습니다.');
        return;
      }

      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
      showError('구매자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoadingCustomers(false);
    }
  };

  // 여행 선택
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowCustomerModal(true);
    setSearchTerm('');
    loadCustomers(product.productCode);
  };

  // 수정신청 모달 열기
  const handleOpenModifyModal = async (product: Product) => {
    setSelectedProductForRequest(product);
    setSelectedCustomerId(null);
    setCustomerAPISData(null);
    
    // 해당 상품의 구매자 목록 로드
    try {
      const response = await fetch(`/api/admin/apis/product-customers?productCode=${encodeURIComponent(product.productCode)}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok && data.customers) {
        setAvailableCustomers(data.customers);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
    
    setShowModifyModal(true);
  };

  // 고객 선택 시 APIS 정보 로드
  const handleSelectCustomer = async (userId: number) => {
    if (!selectedProductForRequest) return;
    
    setLoadingCustomerDetail(true);
    setSelectedCustomerId(userId);
    
    try {
      const response = await fetch(
        `/api/admin/apis/customer-detail?userId=${userId}&productCode=${encodeURIComponent(selectedProductForRequest.productCode)}`,
        { credentials: 'include' }
      );
      const data = await response.json();
      
      if (!data.ok) {
        showError(data.message || '고객 정보를 불러오는데 실패했습니다.');
        return;
      }
      
      // 데이터 포맷팅
      const formattedData: CustomerAPISData = {
        userId: data.customer.userId,
        name: data.customer.name || '',
        phone: data.customer.phone || '',
        email: data.customer.email || '',
        productCode: data.customer.productCode,
        cruiseLine: data.customer.cruiseLine || null,
        shipName: data.customer.shipName || null,
        packageName: data.customer.packageName || null,
        startDate: data.customer.startDate ? formatDateForInput(data.customer.startDate) : null,
        endDate: data.customer.endDate ? formatDateForInput(data.customer.endDate) : null,
        cabinType: data.customer.reservation?.cabinType || null,
        travelers: data.customer.travelers && data.customer.travelers.length > 0
          ? data.customer.travelers.map((t: any) => ({
              id: t.id,
              roomNumber: t.roomNumber || 1,
              korName: t.korName || '',
              engSurname: t.engSurname || '',
              engGivenName: t.engGivenName || '',
              residentNum: t.residentNum || '',
              passportNo: t.passportNo || '',
              birthDate: t.birthDate || '',
              issueDate: t.issueDate || '',
              expiryDate: t.expiryDate || '',
              nationality: t.nationality || '',
              gender: t.gender || '',
            }))
          : [{
              roomNumber: 1,
              korName: '',
              engSurname: '',
              engGivenName: '',
              residentNum: '',
              passportNo: '',
              birthDate: '',
              issueDate: '',
              expiryDate: '',
              nationality: '',
              gender: '',
            }],
        passportGuests: data.customer.passportGuests || [],
        passportSubmissionId: data.customer.passportSubmissionId || null,
        passportDriveFolderUrl: data.customer.passportDriveFolderUrl || null,
        passportSubmittedAt: data.customer.passportSubmittedAt || null,
      };
      
      setCustomerAPISData(formattedData);
    } catch (error) {
      console.error('Failed to load customer detail:', error);
      showError('고객 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoadingCustomerDetail(false);
    }
  };

  // Traveler 추가
  const handleAddTraveler = () => {
    if (!customerAPISData) return;
    setCustomerAPISData({
      ...customerAPISData,
      travelers: [
        ...customerAPISData.travelers,
        {
          roomNumber: customerAPISData.travelers.length + 1,
          korName: '',
          engSurname: '',
          engGivenName: '',
          residentNum: '',
          passportNo: '',
          birthDate: '',
          issueDate: '',
          expiryDate: '',
          nationality: '',
          gender: '',
        },
      ],
    });
  };

  // Traveler 삭제
  const handleRemoveTraveler = (index: number) => {
    if (!customerAPISData) return;
    const newTravelers = customerAPISData.travelers.filter((_, i) => i !== index);
    setCustomerAPISData({ ...customerAPISData, travelers: newTravelers });
  };

  // Traveler 업데이트
  const handleUpdateTraveler = (index: number, field: keyof TravelerData, value: string | number) => {
    if (!customerAPISData) return;
    const newTravelers = [...customerAPISData.travelers];
    newTravelers[index] = { ...newTravelers[index], [field]: value };
    setCustomerAPISData({ ...customerAPISData, travelers: newTravelers });
  };

  // 수정신청 저장
  const handleSaveModify = async () => {
    if (!selectedProductForRequest || !customerAPISData || !selectedCustomerId) {
      showError('고객을 선택해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/apis/update-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: selectedCustomerId,
          productCode: selectedProductForRequest.productCode,
          customerData: {
            name: customerAPISData.name,
            phone: customerAPISData.phone,
            email: customerAPISData.email,
          },
          travelers: customerAPISData.travelers,
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        showError(data.message || '수정에 실패했습니다.');
        return;
      }

      showSuccess('APIS 정보가 수정되었습니다.');
      setShowModifyModal(false);
      setSelectedProductForRequest(null);
      setSelectedCustomerId(null);
      setCustomerAPISData(null);
      setAvailableCustomers([]);
    } catch (error) {
      console.error('Failed to save modify:', error);
      showError('수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 추가신청 저장
  const handleSaveAdd = async () => {
    if (!selectedProductForRequest || !customerAPISData) {
      showError('필수 정보를 입력해주세요.');
      return;
    }

    if (!customerAPISData.name || !customerAPISData.phone) {
      showError('이름과 연락처는 필수입니다.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/apis/add-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productCode: selectedProductForRequest.productCode,
          customerData: {
            name: customerAPISData.name,
            phone: customerAPISData.phone,
            email: customerAPISData.email,
            cabinType: customerAPISData.cabinType,
          },
          travelers: customerAPISData.travelers,
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        showError(data.message || '추가에 실패했습니다.');
        return;
      }

      showSuccess('APIS 정보가 추가되었습니다.');
      setShowAddModal(false);
      setSelectedProductForRequest(null);
      setCustomerAPISData(null);
      await loadProducts();
    } catch (error) {
      console.error('Failed to save add:', error);
      showError('추가 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // APIS 엑셀 다운로드
  const handleDownloadAPIS = async (product: Product) => {
    setDownloading(product.productCode);

    try {
      // productCode로 APIS 엑셀 다운로드
      const excelUrl = `/api/admin/apis/excel?productCode=${encodeURIComponent(product.productCode)}`;
      
      // fetch로 엑셀 파일 가져오기
      const response = await fetch(excelUrl, {
        method: 'GET',
        credentials: 'include',
      });

      // Content-Type 먼저 확인 (헤더만 읽음)
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        // 에러 응답 처리
        let errorMessage = '엑셀 파일을 가져올 수 없습니다.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // JSON 파싱 실패 시 상태 코드로 에러 메시지 설정
          errorMessage = `서버 오류: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // 엑셀 파일이 아닌 경우
      if (!contentType || !contentType.includes('spreadsheet')) {
        // 에러 응답일 수 있음
        try {
          const errorText = await response.text();
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || errorData.message || '엑셀 파일 형식이 올바르지 않습니다.');
        } catch (e: any) {
          throw new Error('엑셀 파일 형식이 올바르지 않습니다.');
        }
      }

      // blob으로 변환 (성공 응답만 여기까지 옴)
      const blob = await response.blob();
      
      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `APIS_${product.productCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // 정리 (약간의 지연 후)
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      showSuccess('APIS 엑셀 파일이 다운로드되었습니다.');
    } catch (error: any) {
      console.error('Failed to download APIS:', error);
      showError(error.message || 'APIS 다운로드 중 오류가 발생했습니다.');
    } finally {
      setDownloading(null);
    }
  };

  // 검색 필터
  const filteredProducts = products.filter((product) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      product.cruiseLine?.toLowerCase().includes(term) ||
      product.shipName?.toLowerCase().includes(term) ||
      product.packageName?.toLowerCase().includes(term) ||
      product.productCode?.toLowerCase().includes(term)
    );
  });

  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(term) ||
      customer.phone?.toLowerCase().includes(term) ||
      customer.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <span className="text-4xl">📋</span>
          APIS 확인하기
        </h1>
        <p className="text-gray-600">
          판매 중인 여행별로 구매자 이력을 확인하고 APIS 엑셀 파일을 다운로드할 수 있습니다.
        </p>
      </div>

      {/* 검색 바 */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="여행 이름, 선사, 선박명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={loadProducts}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <FiLoader className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* 여행 목록 */}
      {loading ? (
        <div className="text-center py-16">
          <FiLoader className="inline-block animate-spin text-4xl text-blue-600 mb-4" />
          <p className="text-lg text-gray-600 font-medium">여행 목록을 불러오는 중...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <FiPackage className="mx-auto text-4xl text-gray-400 mb-4" />
          <p className="text-gray-600">
            {searchTerm ? '검색 결과가 없습니다.' : '판매 중인 여행이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.productCode}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all"
            >
              {/* 여행 정보 */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 flex-1">
                    {product.cruiseLine}
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                    {product.customerCount}명
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  {product.shipName}
                </p>
                <p className="text-xs text-gray-600 mb-2">
                  {product.packageName}
                </p>
                {product.startDate && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <FiCalendar className="w-3 h-3" />
                    {new Date(product.startDate).toLocaleDateString('ko-KR')}
                    {product.endDate && ` - ${new Date(product.endDate).toLocaleDateString('ko-KR')}`}
                  </p>
                )}
              </div>

              {/* 상태 표시 */}
              <div className="mb-4 space-y-2">
                {/* 판매 상태 */}
                <div className="flex items-center gap-2">
                  {product.saleStatus === '판매중' && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      판매중
                    </span>
                  )}
                  {product.saleStatus === '판매정지' && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      판매정지
                    </span>
                  )}
                  {product.saleStatus === '판매종료' && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      판매종료
                    </span>
                  )}
                </div>
                {/* APIS 생성 상태 */}
                {product.folderUrl || product.spreadsheetUrl ? (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    <FiFileText className="w-3 h-3" />
                    APIS 생성
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    <FiFileText className="w-3 h-3" />
                    APIS 미생성
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="space-y-2">
                <button
                  onClick={() => handleSelectProduct(product)}
                  className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <FiUsers className="w-4 h-4" />
                  구매자 목록 ({product.customerCount}명)
                </button>
                <button
                  onClick={() => handleDownloadAPIS(product)}
                  disabled={downloading === product.productCode}
                  className="w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-bold transition-all shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {downloading === product.productCode ? (
                    <>
                      <FiLoader className="animate-spin" />
                      다운로드 중...
                    </>
                  ) : (
                    <>
                      <FiDownload className="w-4 h-4" />
                      APIS 엑셀 다운로드
                    </>
                  )}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModifyModal(product)}
                    className="flex-1 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <FiEdit className="w-3 h-3" />
                    수정신청
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProductForRequest(product);
                      setCustomerAPISData({
                        userId: 0,
                        name: '',
                        phone: '',
                        email: '',
                        productCode: product.productCode,
                        cruiseLine: product.cruiseLine,
                        shipName: product.shipName,
                        packageName: product.packageName,
                        startDate: product.startDate,
                        endDate: product.endDate,
                        cabinType: null,
                        travelers: [{
                          roomNumber: 1,
                          korName: '',
                          engSurname: '',
                          engGivenName: '',
                          residentNum: '',
                          passportNo: '',
                          birthDate: '',
                          issueDate: '',
                          expiryDate: '',
                          nationality: '',
                          gender: '',
                        }],
                      });
                      setShowAddModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <FiPlus className="w-3 h-3" />
                    추가신청
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 구매자 목록 모달 */}
      {showCustomerModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedProduct.cruiseLine} - {selectedProduct.shipName}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedProduct.packageName} ({customers.length}명 구매자)
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  setSelectedProduct(null);
                  setCustomers([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 검색 바 */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="구매자 이름, 전화번호, 이메일로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* 구매자 목록 */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingCustomers ? (
                <div className="text-center py-12">
                  <FiLoader className="inline-block animate-spin text-3xl text-blue-600 mb-4" />
                  <p className="text-gray-600">구매자 목록을 불러오는 중...</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <FiUsers className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-600">구매자가 없습니다.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">구매자명</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">전화번호</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">이메일</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">여행 시작일</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">여행 종료일</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.userId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {customer.name || '이름 없음'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">
                            {customer.phone || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">
                            {customer.email || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">
                            {customer.startDate
                              ? new Date(customer.startDate).toLocaleDateString('ko-KR')
                              : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">
                            {customer.endDate
                              ? new Date(customer.endDate).toLocaleDateString('ko-KR')
                              : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {customer.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 수정신청 모달 */}
      {showModifyModal && selectedProductForRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">APIS 수정신청</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedProductForRequest.cruiseLine} - {selectedProductForRequest.shipName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModifyModal(false);
                  setSelectedProductForRequest(null);
                  setSelectedCustomerId(null);
                  setCustomerAPISData(null);
                  setAvailableCustomers([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* 고객 선택 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  고객 선택 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCustomerId || ''}
                  onChange={(e) => handleSelectCustomer(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">고객을 선택하세요...</option>
                  {availableCustomers.map((customer) => (
                    <option key={customer.userId} value={customer.userId}>
                      {customer.name || '이름 없음'} ({customer.phone || '연락처 없음'})
                    </option>
                  ))}
                </select>
              </div>

              {/* APIS 정보 표시 및 수정 */}
              {loadingCustomerDetail ? (
                <div className="text-center py-12">
                  <FiLoader className="inline-block animate-spin text-3xl text-orange-600 mb-4" />
                  <p className="text-gray-600">APIS 정보를 불러오는 중...</p>
                </div>
              ) : customerAPISData ? (
                <div className="space-y-6">
                  {/* 상품 정보 */}
                  <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FiPackage className="w-5 h-5 text-blue-600" />
                      상품 정보
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">크루즈 라인</label>
                        <input
                          type="text"
                          value={customerAPISData.cruiseLine || ''}
                          onChange={(e) => setCustomerAPISData({ ...customerAPISData, cruiseLine: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="예: MSC 크루즈"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">선박명</label>
                        <input
                          type="text"
                          value={customerAPISData.shipName || ''}
                          onChange={(e) => setCustomerAPISData({ ...customerAPISData, shipName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="예: MSC Bellissima"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">패키지명</label>
                        <input
                          type="text"
                          value={customerAPISData.packageName || ''}
                          onChange={(e) => setCustomerAPISData({ ...customerAPISData, packageName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="예: 지중해 7박 8일"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">출발일</label>
                        <input
                          type="date"
                          value={formatDateForInput(customerAPISData.startDate) || ''}
                          onChange={(e) => setCustomerAPISData({ ...customerAPISData, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">종료일</label>
                        <input
                          type="date"
                          value={formatDateForInput(customerAPISData.endDate) || ''}
                          onChange={(e) => setCustomerAPISData({ ...customerAPISData, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">객실 타입</label>
                        <input
                          type="text"
                          value={customerAPISData.cabinType || ''}
                          onChange={(e) => setCustomerAPISData({ ...customerAPISData, cabinType: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          placeholder="예: 오션뷰, 발코니"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">상품 코드</label>
                        <input
                          type="text"
                          value={customerAPISData.productCode}
                          onChange={(e) => setCustomerAPISData({ ...customerAPISData, productCode: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* 고객 기본 정보 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">고객 기본 정보</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">이름</label>
                        <input
                          type="text"
                          value={customerAPISData.name}
                          onChange={(e) => setCustomerAPISData({ ...customerAPISData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">연락처</label>
                        <input
                          type="text"
                          value={customerAPISData.phone}
                          onChange={(e) => setCustomerAPISData({ ...customerAPISData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">이메일</label>
                        <input
                          type="email"
                          value={customerAPISData.email}
                          onChange={(e) => setCustomerAPISData({ ...customerAPISData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 여행자 정보 */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">여행자 정보</h3>
                      <button
                        onClick={handleAddTraveler}
                        className="px-3 py-1.5 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors text-sm font-semibold flex items-center gap-2"
                      >
                        <FiPlus className="w-4 h-4" />
                        여행자 추가
                      </button>
                    </div>
                    <div className="space-y-4">
                      {customerAPISData.travelers.map((traveler, index) => (
                        <div key={index} className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-gray-900">여행자 {index + 1}</h4>
                            {customerAPISData.travelers.length > 1 && (
                              <button
                                onClick={() => handleRemoveTraveler(index)}
                                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                              >
                                <FiX className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">방 번호</label>
                              <input
                                type="number"
                                value={traveler.roomNumber}
                                onChange={(e) => handleUpdateTraveler(index, 'roomNumber', parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">한국어 이름</label>
                              <input
                                type="text"
                                value={traveler.korName}
                                onChange={(e) => handleUpdateTraveler(index, 'korName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">영문 성</label>
                              <input
                                type="text"
                                value={traveler.engSurname}
                                onChange={(e) => handleUpdateTraveler(index, 'engSurname', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">영문 이름</label>
                              <input
                                type="text"
                                value={traveler.engGivenName}
                                onChange={(e) => handleUpdateTraveler(index, 'engGivenName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">주민등록번호</label>
                              <input
                                type="text"
                                value={traveler.residentNum}
                                onChange={(e) => handleUpdateTraveler(index, 'residentNum', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">여권번호</label>
                              <input
                                type="text"
                                value={traveler.passportNo}
                                onChange={(e) => handleUpdateTraveler(index, 'passportNo', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">생년월일</label>
                              <input
                                type="date"
                                value={formatDateForInput(traveler.birthDate) || ''}
                                onChange={(e) => handleUpdateTraveler(index, 'birthDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">여권 발급일</label>
                              <input
                                type="date"
                                value={formatDateForInput(traveler.issueDate) || ''}
                                onChange={(e) => handleUpdateTraveler(index, 'issueDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">여권 만료일</label>
                              <input
                                type="date"
                                value={formatDateForInput(traveler.expiryDate) || ''}
                                onChange={(e) => handleUpdateTraveler(index, 'expiryDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">국적</label>
                              <input
                                type="text"
                                value={traveler.nationality}
                                onChange={(e) => handleUpdateTraveler(index, 'nationality', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">성별</label>
                              <select
                                value={traveler.gender}
                                onChange={(e) => handleUpdateTraveler(index, 'gender', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              >
                                <option value="">선택</option>
                                <option value="M">남성</option>
                                <option value="F">여성</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 여권 제출 정보 */}
                  {customerAPISData.passportGuests && customerAPISData.passportGuests.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <span className="text-2xl">🛂</span>
                          여권 제출 정보
                        </h3>
                        {customerAPISData.passportDriveFolderUrl && (
                          <a
                            href={customerAPISData.passportDriveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2"
                          >
                            <FiExternalLink className="w-4 h-4" />
                            구글 드라이브 열기
                          </a>
                        )}
                      </div>
                      {customerAPISData.passportSubmittedAt && (
                        <p className="text-sm text-gray-600 mb-4">
                          제출일: {new Date(customerAPISData.passportSubmittedAt).toLocaleString('ko-KR')}
                        </p>
                      )}
                      <div className="space-y-3">
                        {customerAPISData.passportGuests.map((guest, index) => (
                          <div key={guest.id || index} className="bg-white rounded-lg p-3 border border-green-200">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">
                                그룹 {guest.groupNumber} - {guest.name}
                              </h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              {guest.phone && (
                                <div>
                                  <span className="text-gray-600">연락처:</span> {guest.phone}
                                </div>
                              )}
                              {guest.passportNumber && (
                                <div>
                                  <span className="text-gray-600">여권번호:</span> {guest.passportNumber}
                                </div>
                              )}
                              {guest.nationality && (
                                <div>
                                  <span className="text-gray-600">국적:</span> {guest.nationality}
                                </div>
                              )}
                              {guest.dateOfBirth && (
                                <div>
                                  <span className="text-gray-600">생년월일:</span>{' '}
                                  {new Date(guest.dateOfBirth).toLocaleDateString('ko-KR')}
                                </div>
                              )}
                              {guest.passportExpiryDate && (
                                <div>
                                  <span className="text-gray-600">만료일:</span>{' '}
                                  {new Date(guest.passportExpiryDate).toLocaleDateString('ko-KR')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <FiUsers className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-600">고객을 선택하면 APIS 정보가 표시됩니다.</p>
                </div>
              )}
            </div>

            {/* 하단 버튼 */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowModifyModal(false);
                  setSelectedProductForRequest(null);
                  setSelectedCustomerId(null);
                  setCustomerAPISData(null);
                  setAvailableCustomers([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveModify}
                disabled={submitting || !selectedCustomerId || !customerAPISData}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <FiLoader className="animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '수정신청 저장'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 추가신청 모달 */}
      {showAddModal && selectedProductForRequest && customerAPISData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">APIS 추가신청</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedProductForRequest.cruiseLine} - {selectedProductForRequest.shipName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedProductForRequest(null);
                  setCustomerAPISData(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* 상품 정보 */}
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FiPackage className="w-5 h-5 text-blue-600" />
                    상품 정보
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">크루즈 라인</label>
                      <input
                        type="text"
                        value={customerAPISData.cruiseLine || ''}
                        onChange={(e) => setCustomerAPISData({ ...customerAPISData, cruiseLine: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="예: MSC 크루즈"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">선박명</label>
                      <input
                        type="text"
                        value={customerAPISData.shipName || ''}
                        onChange={(e) => setCustomerAPISData({ ...customerAPISData, shipName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="예: MSC Bellissima"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">패키지명</label>
                      <input
                        type="text"
                        value={customerAPISData.packageName || ''}
                        onChange={(e) => setCustomerAPISData({ ...customerAPISData, packageName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="예: 지중해 7박 8일"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">출발일</label>
                      <input
                        type="date"
                        value={formatDateForInput(customerAPISData.startDate) || ''}
                        onChange={(e) => setCustomerAPISData({ ...customerAPISData, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">종료일</label>
                      <input
                        type="date"
                        value={formatDateForInput(customerAPISData.endDate) || ''}
                        onChange={(e) => setCustomerAPISData({ ...customerAPISData, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">객실 타입</label>
                      <input
                        type="text"
                        value={customerAPISData.cabinType || ''}
                        onChange={(e) => setCustomerAPISData({ ...customerAPISData, cabinType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="예: 오션뷰, 발코니"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">상품 코드</label>
                      <input
                        type="text"
                        value={customerAPISData.productCode}
                        onChange={(e) => setCustomerAPISData({ ...customerAPISData, productCode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* 고객 기본 정보 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">고객 기본 정보</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        이름 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerAPISData.name}
                        onChange={(e) => setCustomerAPISData({ ...customerAPISData, name: e.target.value })}
                        placeholder="고객 이름"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        연락처 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerAPISData.phone}
                        onChange={(e) => setCustomerAPISData({ ...customerAPISData, phone: e.target.value })}
                        placeholder="010-1234-5678"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">이메일</label>
                      <input
                        type="email"
                        value={customerAPISData.email}
                        onChange={(e) => setCustomerAPISData({ ...customerAPISData, email: e.target.value })}
                        placeholder="email@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">객실 타입</label>
                      <input
                        type="text"
                        value={customerAPISData.cabinType || ''}
                        onChange={(e) => setCustomerAPISData({ ...customerAPISData, cabinType: e.target.value })}
                        placeholder="예: 내측, 해측, 발코니"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 여행자 정보 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">여행자 정보</h3>
                    <button
                      onClick={handleAddTraveler}
                      className="px-3 py-1.5 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors text-sm font-semibold flex items-center gap-2"
                    >
                      <FiPlus className="w-4 h-4" />
                      여행자 추가
                    </button>
                  </div>
                  <div className="space-y-4">
                    {customerAPISData.travelers.map((traveler, index) => (
                      <div key={index} className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-gray-900">여행자 {index + 1}</h4>
                          {customerAPISData.travelers.length > 1 && (
                            <button
                              onClick={() => handleRemoveTraveler(index)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">방 번호</label>
                            <input
                              type="number"
                              value={traveler.roomNumber}
                              onChange={(e) => handleUpdateTraveler(index, 'roomNumber', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">한국어 이름</label>
                            <input
                              type="text"
                              value={traveler.korName}
                              onChange={(e) => handleUpdateTraveler(index, 'korName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">영문 성</label>
                            <input
                              type="text"
                              value={traveler.engSurname}
                              onChange={(e) => handleUpdateTraveler(index, 'engSurname', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">영문 이름</label>
                            <input
                              type="text"
                              value={traveler.engGivenName}
                              onChange={(e) => handleUpdateTraveler(index, 'engGivenName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">주민등록번호</label>
                            <input
                              type="text"
                              value={traveler.residentNum}
                              onChange={(e) => handleUpdateTraveler(index, 'residentNum', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">여권번호</label>
                            <input
                              type="text"
                              value={traveler.passportNo}
                              onChange={(e) => handleUpdateTraveler(index, 'passportNo', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">생년월일</label>
                            <input
                              type="date"
                              value={formatDateForInput(traveler.birthDate) || ''}
                              onChange={(e) => handleUpdateTraveler(index, 'birthDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">여권 발급일</label>
                            <input
                              type="date"
                              value={formatDateForInput(traveler.issueDate) || ''}
                              onChange={(e) => handleUpdateTraveler(index, 'issueDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">여권 만료일</label>
                            <input
                              type="date"
                              value={formatDateForInput(traveler.expiryDate) || ''}
                              onChange={(e) => handleUpdateTraveler(index, 'expiryDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">국적</label>
                            <input
                              type="text"
                              value={traveler.nationality}
                              onChange={(e) => handleUpdateTraveler(index, 'nationality', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">성별</label>
                            <select
                              value={traveler.gender}
                              onChange={(e) => handleUpdateTraveler(index, 'gender', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                              <option value="">선택</option>
                              <option value="M">남성</option>
                              <option value="F">여성</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedProductForRequest(null);
                  setCustomerAPISData(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveAdd}
                disabled={submitting || !customerAPISData?.name || !customerAPISData?.phone}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <FiLoader className="animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '추가신청 저장'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

