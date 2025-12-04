'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import Image from 'next/image';
import { Download, Mail } from 'lucide-react';
import { showSuccess, showError } from '@/components/ui/Toast';

interface CertificateProps {
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

import { Customer } from '@/types/customer';

// 인증서에서 사용하는 확장 Customer 타입
interface CertificateCustomer extends Customer {
  email: string;
  displayName: string;
}

interface ProductDetails {
  tags?: string[];
  visitedCountries?: string[];
  destinations?: string[];
  nights?: number;
  days?: number;
  cruiseLine?: string;
  shipName?: string;
  included?: string[];
  excluded?: string[];
  refundPolicy?: string;
  flightInfo?: any;
  hasGuide?: boolean;
  hasEscort?: boolean;
  hasCruiseDotStaff?: boolean;
  hasTravelInsurance?: boolean;
}

export default function Certificate({ type }: CertificateProps) {
  // 디버깅: type prop 확인
  console.log('[Certificate] Rendering with type:', type);

  const certificateRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [isCertified, setIsCertified] = useState(false); // 인증 완료 여부
  const [isCertifying, setIsCertifying] = useState(false); // 인증 처리 중
  const [hasBeenSent, setHasBeenSent] = useState(false); // 한번 발송 여부

  const [data, setData] = useState<CertificateData>({
    customerName: '',
    birthDate: '',
    productName: '',
    paymentAmount: 0,
    paymentDate: '',
    refundAmount: 0,
    refundDate: '',
  });

  // 확인된 환불금액과 환불일자 (미리보기 표시용)
  const [confirmedRefundAmount, setConfirmedRefundAmount] = useState<number | null>(null);
  const [confirmedRefundDate, setConfirmedRefundDate] = useState<string>('');

  // 고객 검색 관련
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<CertificateCustomer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [isLoadingCustomerInfo, setIsLoadingCustomerInfo] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 상품 검색 관련
  const [productSuggestions, setProductSuggestions] = useState<{ id: string, title: string }[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // 상품 목록 불러오기
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?status=visible');
        if (response.ok) {
          const result = await response.json();
          if (result.products) {
            setProductSuggestions(result.products.map((p: any) => ({ id: p.id, title: p.title })));
          }
        }
      } catch (error) {
        console.error('[Certificate] Failed to fetch products:', error);
      }
    };
    fetchProducts();
  }, []);

  // 오늘 날짜 자동 생성 (202X년 X월 X일 형식)
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    return `${year}년 ${month}월 ${day}일`;
  };

  const [issueDate, setIssueDate] = useState(getTodayDate());

  // type이 변경될 때 상태 초기화
  useEffect(() => {
    console.log('[Certificate] Type changed, resetting state. New type:', type);
    setData({
      customerName: '',
      birthDate: '',
      productName: '',
      paymentAmount: 0,
      paymentDate: '',
      refundAmount: 0,
      refundDate: '',
    });
    setCustomerEmail('');
    setCustomerSearchQuery('');
    setCustomerSuggestions([]);
    setShowSuggestions(false);
    setSelectedCustomerId(null);
    setProductDetails(null);
    setIssueDate(getTodayDate());
    setIsCertified(false);
    setIsCertifying(false);
    setHasBeenSent(false);
    setConfirmedRefundAmount(null);
    setConfirmedRefundDate('');
  }, [type]);

  // 확인된 환불 정보 디버깅
  useEffect(() => {
    console.log('[Certificate] Confirmed refund values changed:', {
      confirmedRefundAmount,
      confirmedRefundDate,
      type: type
    });
  }, [confirmedRefundAmount, confirmedRefundDate, type]);

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
          console.log('[Certificate] 검색 결과:', result.customers?.length || 0, '명');
        }
      }
    } catch (error) {
      console.error('[Certificate] Customer search error:', error);
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
      }, 200); // 300ms -> 200ms로 단축
    } else {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // 고객 선택 시 정보 로드
  const loadCustomerInfo = useCallback(async (customerId: number) => {
    setIsLoadingCustomerInfo(true);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/purchase-info`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.ok && result.customer) {
          // 고객 정보 설정
          setData(prev => ({
            ...prev,
            customerName: result.customer.name || '',
            birthDate: result.customer.birthDate || '', // 여권 제출 완료한 경우 자동 입력
          }));

          // 고객 이메일 자동 설정
          if (result.customer.email) {
            setCustomerEmail(result.customer.email);
          }

          // 상품 및 결제 정보 설정
          if (result.product) {
            const product = result.product;
            setData(prev => ({
              ...prev,
              productName: product.packageName || '',
              paymentAmount: result.payment?.amount || product.basePrice || 0,
              paymentDate: result.payment?.date
                ? new Date(result.payment.date).toISOString().split('T')[0]
                : '',
            }));

            // 상품 상세 정보 설정
            setProductDetails({
              tags: product.tags || [],
              visitedCountries: product.visitedCountries || [],
              destinations: product.destinations || [],
              nights: product.nights,
              days: product.days,
              cruiseLine: product.cruiseLine,
              shipName: product.shipName,
              included: product.included || [],
              excluded: product.excluded || [],
              refundPolicy: product.refundPolicy || '',
              flightInfo: product.flightInfo,
              hasGuide: product.hasGuide || false,
              hasEscort: product.hasEscort || false,
              hasCruiseDotStaff: product.hasCruiseDotStaff || false,
              hasTravelInsurance: product.hasTravelInsurance || false,
            });
          }
        }
      }
    } catch (error) {
      console.error('[Certificate] Load customer info error:', error);
      showError('고객 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingCustomerInfo(false);
    }
  }, []);

  // 고객 선택 핸들러
  const handleCustomerSelect = (customer: CertificateCustomer) => {
    setCustomerSearchQuery(customer.displayName);
    setData(prev => ({ ...prev, customerName: customer.name }));
    setSelectedCustomerId(customer.id);
    setShowSuggestions(false);
    setCustomerSuggestions([]);
    loadCustomerInfo(customer.id);
  };

  // 외부 클릭 시 제안 목록 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        customerInputRef.current &&
        !customerInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 인증 처리 (구매확인인증 / 환불인증완료)
  const handleCertify = async () => {
    if (!data.customerName) {
      showError('고객명을 입력해주세요.');
      return;
    }

    if (!selectedCustomerId) {
      showError('고객을 선택해주세요.');
      return;
    }
    // 생년월일은 선택 사항 (필수 아님)

    // 환불인증완료인 경우 환불금액과 환불일자 확인
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

    try {
      setIsCertifying(true);

      const requestBody: any = {
        customerId: selectedCustomerId,
        type: type, // 'purchase' or 'refund'
        customerName: data.customerName,
        birthDate: data.birthDate,
      };

      // 환불인증완료인 경우 환불금액과 환불일자 추가
      if (type === 'refund') {
        requestBody.refundAmount = confirmedRefundAmount;
        requestBody.refundDate = confirmedRefundDate;
      }

      const response = await fetch(`/api/admin/certificates/certify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      // 응답 상태 확인
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '인증 처리 중 오류가 발생했습니다.';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          errorMessage = `서버 오류 (${response.status}): ${errorText}`;
        }
        console.error('[Certify] API Error:', response.status, errorMessage);
        showError(errorMessage);
        return;
      }

      const result = await response.json();

      if (result.ok) {
        setIsCertified(true);
        if (type === 'purchase') {
          showSuccess('구매확인인증이 완료되었습니다.');
        } else {
          showSuccess('환불인증완료가 처리되었습니다.');
        }
      } else {
        showError(result.error || '인증 처리 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('[Certify] Error:', error);
      console.error('[Certify] Error details:', error?.message, error?.stack);
      showError(`인증 처리 중 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}`);
    } finally {
      setIsCertifying(false);
    }
  };

  // 이미지 저장 (PNG)
  const handleDownloadImage = async () => {
    if (!isCertified && !hasBeenSent) {
      showError(type === 'purchase'
        ? '구매확인인증을 먼저 완료해주세요.'
        : '환불인증완료를 먼저 처리해주세요.');
      return;
    }

    if (!certificateRef.current) {
      showError('인증서를 찾을 수 없습니다.');
      return;
    }

    if (!data.customerName || !data.productName || !data.paymentAmount) {
      showError('필수 정보를 입력해주세요.');
      return;
    }

    try {
      setIsDownloading(true);

      const canvas = await html2canvas(certificateRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const fileName = `${type === 'purchase' ? '구매확인증서' : '환불인증서'}_${data.customerName}_${new Date().toISOString().split('T')[0]}.png`;
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess('인증서 이미지가 다운로드되었습니다.');
    } catch (error: any) {
      console.error('[Download Image] Error:', error);
      showError('이미지 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  // 이메일 발송
  const handleSendEmail = async () => {
    if (!isCertified && !hasBeenSent) {
      showError(type === 'purchase'
        ? '구매확인인증을 먼저 완료해주세요.'
        : '환불인증완료를 먼저 처리해주세요.');
      return;
    }

    if (!data.customerName || !data.productName || !data.paymentAmount) {
      showError('필수 정보를 입력해주세요.');
      return;
    }

    if (!certificateRef.current) {
      showError('인증서를 찾을 수 없습니다.');
      return;
    }

    // 입력된 이메일 주소 사용
    if (!customerEmail || !customerEmail.trim()) {
      showError('고객 이메일 주소를 입력해주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      showError('올바른 이메일 주소를 입력해주세요.');
      return;
    }

    const email = customerEmail.trim();

    try {
      setIsSendingEmail(true);

      // html2canvas로 문서 영역 캡처
      const canvas = await html2canvas(certificateRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // canvas를 blob으로 변환
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to blob conversion failed'));
          }
        }, 'image/png');
      });

      // FormData 생성
      const formData = new FormData();
      formData.append('to', email);
      formData.append('subject', `[크루즈닷] 요청하신 ${type === 'purchase' ? '구매확인증서' : '환불인증서'}입니다`);
      formData.append('file', blob, `${type === 'purchase' ? '구매확인증서' : '환불인증서'}_${data.customerName}_${new Date().toISOString().split('T')[0]}.png`);

      // API 요청
      const response = await fetch('/api/email/send', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        showSuccess('메일이 성공적으로 발송되었습니다! 🚀');
        setHasBeenSent(true);
      } else {
        showError('전송 실패. 다시 시도해주세요.');
        console.error('[Send Email] API Error:', result.error);
      }

    } catch (error: any) {
      console.error('[Send Email] Error:', error);
      showError('전송 실패. 다시 시도해주세요.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 입력 폼 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">고객 정보 입력</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              고객명 <span className="text-red-500">*</span>
              {selectedCustomerId && (
                <span className="ml-2 text-xs text-green-600 font-semibold">✓ 선택됨</span>
              )}
            </label>
            <div className="relative">
              <input
                ref={customerInputRef}
                type="text"
                value={customerSearchQuery}
                onChange={handleCustomerSearchChange}
                onFocus={() => {
                  if (customerSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="고객명, 전화번호, 이메일로 검색..."
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 pr-24"
              />
              {isLoadingCustomerInfo && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                  <span className="text-xs text-gray-500">검색 중...</span>
                </div>
              )}
              {!isLoadingCustomerInfo && customerSearchQuery && customerSuggestions.length === 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  결과 없음
                </div>
              )}
            </div>
            {showSuggestions && customerSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-2 bg-white border-2 border-indigo-200 rounded-lg shadow-xl max-h-64 overflow-y-auto"
              >
                <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-200 text-xs font-semibold text-indigo-700">
                  {customerSuggestions.length}명의 고객 찾음 (클릭하여 선택)
                </div>
                {customerSuggestions.map((customer, index) => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-base">{customer.name}</div>
                        <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                          {customer.phone && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400">📱</span>
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400">✉️</span>
                              <span>{customer.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-2 text-indigo-600 font-medium text-sm">
                        선택 →
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedCustomerId && data.customerName && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-semibold text-sm">✓ 선택된 고객:</span>
                  <span className="text-gray-900 font-medium">{data.customerName}</span>
                  {data.customerName !== customerSearchQuery && (
                    <button
                      onClick={() => {
                        setCustomerSearchQuery('');
                        setSelectedCustomerId(null);
                        setData(prev => ({ ...prev, customerName: '', birthDate: '' }));
                        setCustomerEmail('');
                        setProductDetails(null);
                      }}
                      className="ml-auto text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      다시 선택
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              생년월일 <span className="text-gray-400 text-xs">(선택)</span>
              {data.birthDate && (
                <span className="ml-2 text-xs text-green-600">(여권 정보에서 자동 입력됨)</span>
              )}
            </label>
            <input
              type="text"
              value={data.birthDate}
              onChange={(e) => setData(prev => ({ ...prev, birthDate: e.target.value }))}
              placeholder="1990-01-01 (여권 제출 완료 시 자동 입력)"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {!data.birthDate && (
              <p className="mt-1 text-xs text-gray-500">여권 제출이 완료되지 않은 경우 수동으로 입력해주세요.</p>
            )}
          </div>

          {/* 인증 버튼 */}
          <div className="md:col-span-2">
            {!isCertified ? (
              <button
                onClick={handleCertify}
                disabled={isCertifying || !data.customerName || !selectedCustomerId}
                className={`w-full py-3 px-6 rounded-lg font-bold text-white transition-colors ${type === 'purchase'
                  ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300'
                  : 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
                  }`}
              >
                {isCertifying
                  ? '처리 중...'
                  : type === 'purchase'
                    ? '구매확인인증'
                    : '환불인증완료'}
              </button>
            ) : (
              <div className={`w-full py-3 px-6 rounded-lg font-bold text-white text-center ${type === 'purchase'
                ? 'bg-green-600'
                : 'bg-red-600'
                }`}>
                {type === 'purchase' ? '✓ 구매확인인증 완료' : '✓ 환불인증완료 처리됨'}
              </div>
            )}
          </div>

          <div className="md:col-span-2 relative">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              상품명 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={data.productName}
                onChange={(e) => {
                  setData(prev => ({ ...prev, productName: e.target.value }));
                  setShowProductSuggestions(true);
                }}
                onFocus={() => setShowProductSuggestions(true)}
                placeholder="상품명 검색 또는 직접 입력"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              {showProductSuggestions && productSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {productSuggestions
                    .filter(p => p.title.toLowerCase().includes(data.productName.toLowerCase()))
                    .map((product) => (
                      <div
                        key={product.id}
                        onClick={() => {
                          setData(prev => ({ ...prev, productName: product.title }));
                          setShowProductSuggestions(false);
                        }}
                        className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700"
                      >
                        {product.title}
                      </div>
                    ))}
                </div>
              )}
            </div>
            {productDetails && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">상품 상세 정보</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {productDetails.tags && productDetails.tags.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">후킹태그: </span>
                      <span className="text-gray-600">{productDetails.tags.join(', ')}</span>
                    </div>
                  )}
                  {productDetails.visitedCountries && productDetails.visitedCountries.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">방문국가: </span>
                      <span className="text-gray-600">{productDetails.visitedCountries.join(', ')}</span>
                    </div>
                  )}
                  {productDetails.destinations && productDetails.destinations.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">목적지: </span>
                      <span className="text-gray-600">{productDetails.destinations.join(', ')}</span>
                    </div>
                  )}
                  {(productDetails.nights || productDetails.days) && (
                    <div>
                      <span className="font-medium text-gray-700">여행기간: </span>
                      <span className="text-gray-600">
                        {productDetails.nights}박 {productDetails.days}일
                      </span>
                    </div>
                  )}
                  {productDetails.cruiseLine && (
                    <div>
                      <span className="font-medium text-gray-700">크루즈 회사: </span>
                      <span className="text-gray-600">{productDetails.cruiseLine}</span>
                    </div>
                  )}
                  {productDetails.shipName && (
                    <div>
                      <span className="font-medium text-gray-700">선박명: </span>
                      <span className="text-gray-600">{productDetails.shipName}</span>
                    </div>
                  )}
                  {productDetails.flightInfo && (
                    <div>
                      <span className="font-medium text-gray-700">비행기: </span>
                      <span className="text-gray-600">
                        {productDetails.flightInfo.included ? '포함' : '불포함'}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">인솔자: </span>
                    <span className="text-gray-600">{productDetails.hasEscort ? '있음' : '없음'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">가이드: </span>
                    <span className="text-gray-600">{productDetails.hasGuide ? '있음' : '없음'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">크루즈닷 전용 스탭: </span>
                    <span className="text-gray-600">{productDetails.hasCruiseDotStaff ? '있음' : '없음'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">여행자 보험: </span>
                    <span className="text-gray-600">{productDetails.hasTravelInsurance ? '포함' : '불포함'}</span>
                  </div>
                </div>
                {productDetails.included && productDetails.included.length > 0 && (
                  <div className="mt-4">
                    <span className="font-medium text-green-700">✅ 포함사항:</span>
                    <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
                      {productDetails.included.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {productDetails.excluded && productDetails.excluded.length > 0 && (
                  <div className="mt-4">
                    <span className="font-medium text-red-700">❌ 불포함사항:</span>
                    <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
                      {productDetails.excluded.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {productDetails.refundPolicy && (
                  <div className="mt-4">
                    <span className="font-medium text-gray-700">환불/취소규정:</span>
                    <div className="mt-2 p-3 bg-white border border-gray-200 rounded text-sm text-gray-600 whitespace-pre-line">
                      {productDetails.refundPolicy}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {type === 'purchase' ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  결제금액 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={data.paymentAmount || ''}
                  onChange={(e) => setData(prev => ({ ...prev, paymentAmount: parseInt(e.target.value) || 0 }))}
                  placeholder="3500000"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  결제일자 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={data.paymentDate}
                  onChange={(e) => setData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  결제금액
                </label>
                <input
                  type="number"
                  value={data.paymentAmount || ''}
                  onChange={(e) => setData(prev => ({ ...prev, paymentAmount: parseInt(e.target.value) || 0 }))}
                  placeholder="3500000"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  결제일자
                </label>
                <input
                  type="date"
                  value={data.paymentDate}
                  onChange={(e) => setData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  환불금액 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={data.refundAmount !== undefined && data.refundAmount !== null && data.refundAmount !== 0 ? data.refundAmount : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = value === '' ? 0 : parseInt(value) || 0;
                      console.log('[Certificate] 환불금액 입력:', value, '->', numValue);
                      setData(prev => ({
                        ...prev,
                        refundAmount: numValue
                      }));
                    }}
                    placeholder="3500000"
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    onClick={() => {
                      console.log('[Certificate] 환불금액 확인 버튼 클릭:', {
                        refundAmount: data.refundAmount,
                        type: typeof data.refundAmount,
                        isValid: data.refundAmount && data.refundAmount > 0
                      });
                      if (data.refundAmount && data.refundAmount > 0) {
                        console.log('[Certificate] 환불금액 확인됨 - 상태 업데이트 중:', data.refundAmount);
                        setConfirmedRefundAmount(data.refundAmount);
                        console.log('[Certificate] setConfirmedRefundAmount 호출 완료');
                        showSuccess('환불금액이 확인되었습니다.');
                      } else {
                        console.log('[Certificate] 환불금액 유효하지 않음');
                        showError('환불금액을 입력해주세요.');
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm whitespace-nowrap"
                  >
                    확인
                  </button>
                </div>
                {confirmedRefundAmount && (
                  <p className="mt-1 text-xs text-green-600 font-semibold">
                    ✓ 확인됨: {confirmedRefundAmount.toLocaleString()}원
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  환불일자 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={data.refundDate || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log('[Certificate] 환불일자 입력:', value);
                      setData(prev => ({ ...prev, refundDate: value }));
                    }}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    onClick={() => {
                      console.log('[Certificate] 환불일자 확인 버튼 클릭:', {
                        refundDate: data.refundDate,
                        type: typeof data.refundDate,
                        trimmed: data.refundDate?.trim(),
                        isValid: data.refundDate && data.refundDate.trim() !== ''
                      });
                      if (data.refundDate && data.refundDate.trim() !== '') {
                        console.log('[Certificate] 환불일자 확인됨 - 상태 업데이트 중:', data.refundDate);
                        setConfirmedRefundDate(data.refundDate);
                        console.log('[Certificate] setConfirmedRefundDate 호출 완료');
                        showSuccess('환불일자가 확인되었습니다.');
                      } else {
                        console.log('[Certificate] 환불일자 유효하지 않음');
                        showError('환불일자를 선택해주세요.');
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm whitespace-nowrap"
                  >
                    확인
                  </button>
                </div>
                {confirmedRefundDate && (
                  <p className="mt-1 text-xs text-green-600 font-semibold">
                    ✓ 확인됨: {new Date(confirmedRefundDate).toLocaleDateString('ko-KR')}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              발행일자
            </label>
            <input
              type="text"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
      </div>

      {/* 인증서 미리보기 */}
      <div className="bg-gray-100 rounded-lg shadow-md p-6 overflow-auto">
        <div
          ref={certificateRef}
          className="bg-white mx-auto shadow-lg"
          style={{
            width: '210mm',
            height: '297mm',
            padding: '15mm 20mm',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 헤더: 로고 */}
          <div className="flex justify-center mb-2 flex-shrink-0">
            <Image
              src="/images/ai-cruise-logo.png"
              alt="크루즈닷 로고"
              width={80}
              height={32}
              priority
              style={{ objectFit: 'contain' }}
            />
          </div>

          {/* 제목 */}
          <div className="text-center mb-4 flex-shrink-0">
            <h1
              className="text-2xl font-bold text-gray-900 mb-1"
              style={{
                fontFamily: 'serif, "Times New Roman", "Malgun Gothic", sans-serif',
                letterSpacing: '0.03em',
              }}
            >
              {type === 'purchase' ? '구 매 확 인 증 서' : '환 불 인 증 서'}
            </h1>
          </div>

          {/* 본문: 테이블 */}
          <div className="mb-3 flex-grow overflow-hidden">
            <table className="w-full border-collapse text-xs">
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-1.5 px-2 font-semibold text-gray-900 bg-gray-50 w-1/4 text-xs">성명</td>
                  <td className="py-1.5 px-2 text-gray-900 text-xs">{data.customerName || '(고객명)'}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1.5 px-2 font-semibold text-gray-900 bg-gray-50 text-xs">생년월일</td>
                  <td className="py-1.5 px-2 text-gray-900 text-xs">{data.birthDate || '(생년월일)'}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-1.5 px-2 font-semibold text-gray-900 bg-gray-50 text-xs">상품명</td>
                  <td className="py-1.5 px-2 text-gray-900 text-xs">{data.productName || '(상품명)'}</td>
                </tr>
                {productDetails && (
                  <tr className="border-b border-gray-300">
                    <td className="py-1.5 px-2 font-semibold text-gray-900 bg-gray-50 align-top text-xs">상품 상세 정보</td>
                    <td className="py-1.5 px-2 text-gray-900">
                      <div className="space-y-0.5 text-xs leading-tight">
                        {productDetails.tags && productDetails.tags.length > 0 && (
                          <div>
                            <span className="font-medium">후킹태그: </span>
                            <span>{productDetails.tags.join(', ')}</span>
                          </div>
                        )}
                        {productDetails.visitedCountries && productDetails.visitedCountries.length > 0 && (
                          <div>
                            <span className="font-medium">방문국가: </span>
                            <span>{productDetails.visitedCountries.join(', ')}</span>
                          </div>
                        )}
                        {productDetails.destinations && productDetails.destinations.length > 0 && (
                          <div>
                            <span className="font-medium">목적지: </span>
                            <span>{productDetails.destinations.join(', ')}</span>
                          </div>
                        )}
                        {(productDetails.nights || productDetails.days) && (
                          <div>
                            <span className="font-medium">여행기간: </span>
                            <span>{productDetails.nights}박 {productDetails.days}일</span>
                          </div>
                        )}
                        {productDetails.cruiseLine && (
                          <div>
                            <span className="font-medium">크루즈 회사: </span>
                            <span>{productDetails.cruiseLine}</span>
                          </div>
                        )}
                        {productDetails.shipName && (
                          <div>
                            <span className="font-medium">선박명: </span>
                            <span>{productDetails.shipName}</span>
                          </div>
                        )}
                        {productDetails.flightInfo && (
                          <div>
                            <span className="font-medium">비행기: </span>
                            <span>{productDetails.flightInfo.included ? '포함' : '불포함'}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">인솔자: </span>
                          <span>{productDetails.hasEscort ? '있음' : '없음'}</span>
                        </div>
                        <div>
                          <span className="font-medium">가이드: </span>
                          <span>{productDetails.hasGuide ? '있음' : '없음'}</span>
                        </div>
                        <div>
                          <span className="font-medium">크루즈닷 전용 스탭: </span>
                          <span>{productDetails.hasCruiseDotStaff ? '있음' : '없음'}</span>
                        </div>
                        <div>
                          <span className="font-medium">여행자 보험: </span>
                          <span>{productDetails.hasTravelInsurance ? '포함' : '불포함'}</span>
                        </div>
                        {productDetails.included && productDetails.included.length > 0 && (
                          <div className="mt-0.5">
                            <div className="font-medium mb-0.5 text-xs">포함사항:</div>
                            <ul className="list-disc list-inside ml-1.5 space-y-0">
                              {productDetails.included.map((item, idx) => (
                                <li key={idx} className="text-xs leading-tight">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {productDetails.excluded && productDetails.excluded.length > 0 && (
                          <div className="mt-0.5">
                            <div className="font-medium mb-0.5 text-xs">불포함사항:</div>
                            <ul className="list-disc list-inside ml-1.5 space-y-0">
                              {productDetails.excluded.map((item, idx) => (
                                <li key={idx} className="text-xs leading-tight">{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {productDetails.refundPolicy && (
                          <div className="mt-0.5">
                            <div className="font-medium mb-0.5 text-xs">환불/취소규정:</div>
                            <div className="text-xs whitespace-pre-line ml-1.5 leading-tight">{productDetails.refundPolicy}</div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {/* 구매인증서: 결제금액, 결제일자만 */}
                {type === 'purchase' && (
                  <>
                    <tr className="border-b border-gray-300">
                      <td className="py-1.5 px-2 font-semibold text-gray-900 bg-gray-50 text-xs">결제금액</td>
                      <td className="py-1.5 px-2 text-gray-900 font-bold text-xs">
                        {data.paymentAmount ? `${data.paymentAmount.toLocaleString()}원` : '(결제금액)'}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="py-1.5 px-2 font-semibold text-gray-900 bg-gray-50 text-xs">결제일자</td>
                      <td className="py-1.5 px-2 text-gray-900 text-xs">
                        {data.paymentDate ? new Date(data.paymentDate).toLocaleDateString('ko-KR') : '(결제일자)'}
                      </td>
                    </tr>
                  </>
                )}
                {/* 환불인증서: 결제금액, 결제일자, 환불금액, 환불일자 */}
                {type === 'refund' && (
                  <>
                    <tr className="border-b border-gray-300">
                      <td className="py-1.5 px-2 font-semibold text-gray-900 bg-gray-50 text-xs">결제금액</td>
                      <td className="py-1.5 px-2 text-gray-900 text-xs">
                        {data.paymentAmount ? `${data.paymentAmount.toLocaleString()}원` : '(결제금액)'}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="py-1.5 px-2 font-semibold text-gray-900 bg-gray-50 text-xs">결제일자</td>
                      <td className="py-1.5 px-2 text-gray-900 text-xs">
                        {data.paymentDate ? new Date(data.paymentDate).toLocaleDateString('ko-KR') : '(결제일자)'}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="py-1.5 px-2 font-semibold text-gray-900 bg-gray-50 text-xs">환불금액</td>
                      <td className="py-1.5 px-2 text-xs">
                        {confirmedRefundAmount !== null && confirmedRefundAmount !== undefined && typeof confirmedRefundAmount === 'number' && confirmedRefundAmount > 0 ? (
                          <span className="text-red-600 font-bold">
                            {confirmedRefundAmount.toLocaleString()}원
                          </span>
                        ) : (
                          <span className="text-gray-400">(환불금액)</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-300">
                      <td className="py-1.5 px-2 font-semibold text-gray-900 bg-gray-50 text-xs">환불일자</td>
                      <td className="py-1.5 px-2 text-xs">
                        {confirmedRefundDate && typeof confirmedRefundDate === 'string' && confirmedRefundDate.trim() !== '' ? (
                          (() => {
                            try {
                              const date = new Date(confirmedRefundDate);
                              if (!isNaN(date.getTime())) {
                                return (
                                  <span className="text-black font-bold">
                                    {date.toLocaleDateString('ko-KR')}
                                  </span>
                                );
                              }
                            } catch (e) {
                              console.error('[Certificate] 날짜 파싱 오류:', e);
                            }
                            return <span className="text-gray-400">(환불일자)</span>;
                          })()
                        ) : (
                          <span className="text-gray-400">(환불일자)</span>
                        )}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* 하단 신뢰 요소 */}
          <div className="mt-auto pt-2 flex-shrink-0">
            {/* 날짜 */}
            <div className="text-right mb-2">
              <p className="text-xs text-gray-900">{issueDate}</p>
            </div>

            {/* 서명 및 도장 */}
            <div className="relative flex justify-end items-end mb-2 min-h-[60px]">
              <div className="text-right">
                <div className="relative inline-block pr-6 pt-6">
                  {/* 도장 이미지 (position: absolute로 겹침) */}
                  <div
                    className="absolute -top-1 -left-1 opacity-75"
                    style={{ zIndex: 1 }}
                  >
                    <div className="relative w-12 h-12">
                      <Image
                        src="/images/cruisedot-stamp.png"
                        alt="크루즈닷 인도장"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  {/* 서명 텍스트 */}
                  <p className="text-xs text-gray-900 relative z-10">
                    크루즈닷 대표이사 [인]
                  </p>
                </div>
              </div>
            </div>

            {/* 슬로건 (Footer) */}
            <div className="text-center pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic leading-tight">
                크루즈 첫여행 크루즈닷, 두번째 부터 행복하게 크루즈닷 감사합니다
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              고객 이메일 주소
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading || (!isCertified && !hasBeenSent)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
              title={!isCertified && !hasBeenSent ? (type === 'purchase' ? '구매확인인증을 먼저 완료해주세요' : '환불인증완료를 먼저 처리해주세요') : ''}
            >
              <Download className="w-4 h-4" />
              {isDownloading ? '저장 중...' : '이미지 저장 (PNG)'}
            </button>
            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail || (!isCertified && !hasBeenSent)}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-purple-300 transition-colors"
              title={!isCertified && !hasBeenSent ? (type === 'purchase' ? '구매확인인증을 먼저 완료해주세요' : '환불인증완료를 먼저 처리해주세요') : ''}
            >
              <Mail className="w-4 h-4" />
              {isSendingEmail ? '전송 중...' : hasBeenSent ? '이메일 재발송' : '이메일 발송'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

