'use client';

import { logger } from '@/lib/logger';
import { useEffect, useState, useRef } from 'react';
import { FiUser, FiSearch, FiX, FiCheckCircle } from 'react-icons/fi';
import { showSuccess, showError } from '@/components/ui/Toast';
import { normalizePhone, isValidMobilePhone } from '@/lib/phone-utils';

/**
 * 여행 배정 관리 페이지
 * 관리자가 사용자에게 크루즈 여행을 배정 (온보딩과 동일한 기능)
 * - 첫 번째 칸: 구매 고객 검색 (구매 고객 선택 시 자동으로 여행 상품 정보 로드)
 * - 두 번째 칸: 크루즈 가이드 사용자 검색 (필수 - 잠재고객)
 * - 크루즈몰 상품 검색 (필수, 구매 고객 선택 시 자동 로드)
 * - 상품 선택 시 여행 정보 자동 표시 (시작일, 종료일, 박/일, D-day)
 */

export interface PurchaseCustomer {
  id: number;
  name: string | null;
  phone: string | null;
  customerStatus: string | null;
}

export interface GenieUser {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
}

export interface Product {
  id: number;
  productCode: string;
  cruiseLine: string;
  shipName: string;
  packageName: string;
  nights: number;
  days: number;
  itineraryPattern: any;
  startDate?: string | null;
  endDate?: string | null;
  isPopular?: boolean;
  isRecommended?: boolean;
  displayLabel?: string;
}

export interface PurchaseCustomerTripInfo {
  hasReservation: boolean;
  hasProduct: boolean;
  product: Product;
  trip: {
    cruiseName: string;
    startDate: string;
    endDate: string;
    companionType: '친구' | '커플' | '가족' | '혼자' | null;
    destination: string;
  };
  travelers: Array<{
    id: number;
    name: string;
    phone: string | null;
    userId: number | null;
  }>;
  user?: {
    id: number;
    name: string | null;
    phone: string | null;
  };
}

export interface AssignTripApi {
  searchPurchaseCustomers: (query: string) => Promise<PurchaseCustomer[]>;
  fetchPurchaseCustomerTripInfo: (userId: number) => Promise<PurchaseCustomerTripInfo | null>;
  searchGenieUsers: (query: string) => Promise<GenieUser[]>;
  createGenieUser: (payload: { name: string; phone: string }) => Promise<GenieUser & { isExisting?: boolean }>;
  searchProducts: (query: string) => Promise<Product[]>;
  submitOnboarding: (
    userId: number,
    payload: {
      productId: number | null;
      productCode: string;
      cruiseName: string;
      startDate: string;
      endDate: string;
      companionType: '친구' | '커플' | '가족' | '혼자' | null;
      destination: string;
      itineraryPattern: any;
    }
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
}

export interface AssignTripFormProps {
  api: AssignTripApi;
}

export default function AssignTripForm({ api }: AssignTripFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    genieUser?: string;
    product?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  // 구매 고객 검색 (새로 추가)
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('');
  const [purchaseSearchResults, setPurchaseSearchResults] = useState<PurchaseCustomer[]>([]);
  const [purchaseSearchLoading, setPurchaseSearchLoading] = useState(false);
  const [purchaseSearchDropdownOpen, setPurchaseSearchDropdownOpen] = useState(false);
  const [selectedPurchaseUserId, setSelectedPurchaseUserId] = useState<number | null>(null);
  const purchaseSearchRef = useRef<HTMLDivElement>(null);
  const selectedPurchaseCustomer = purchaseSearchResults.find(u => u.id === selectedPurchaseUserId);

  // 크루즈 가이드 사용자 검색 (필수)
  const [genieSearchTerm, setGenieSearchTerm] = useState('');
  const [genieSearchResults, setGenieSearchResults] = useState<GenieUser[]>([]);
  const [genieSearchLoading, setGenieSearchLoading] = useState(false);
  const [genieSearchDropdownOpen, setGenieSearchDropdownOpen] = useState(false);
  const [selectedGenieUserId, setSelectedGenieUserId] = useState<number | null>(null);
  const genieSearchRef = useRef<HTMLDivElement>(null);
  const selectedGenieUser = genieSearchResults.find(u => u.id === selectedGenieUserId);

  // 상품 검색
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchDropdownOpen, setProductSearchDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);

  // 온보딩 폼 데이터
  const [onboardingForm, setOnboardingForm] = useState({
    productCode: '',
    productId: null as number | null,
    cruiseName: '',
    startDate: '',
    endDate: '',
    companionType: null as '친구' | '커플' | '가족' | '혼자' | null,
    destination: '',
  });

  // D-day 계산
  const calculateDday = (startDate: string): number | null => {
    if (!startDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 구매 고객 검색 디바운싱
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPurchaseCustomers(purchaseSearchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseSearchTerm]);

  // 크루즈 가이드 사용자 검색 디바운싱
  useEffect(() => {
    // 검색어가 변경될 때마다 검색 실행 (빈 검색어도 포함)
    const timeoutId = setTimeout(() => {
      searchGenieUsers(genieSearchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genieSearchTerm]);

  // 상품 검색 디바운싱
  useEffect(() => {
    if (!productSearchTerm.trim()) {
      setProductSearchResults([]);
      // 검색어가 비어있을 때는 드롭다운을 닫지 않음 (포커스 상태 유지)
      return;
    }

    const timeoutId = setTimeout(() => {
      searchProducts(productSearchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSearchTerm]);

  // 클릭 외부 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (purchaseSearchRef.current && !purchaseSearchRef.current.contains(event.target as Node)) {
        setPurchaseSearchDropdownOpen(false);
      }
      if (genieSearchRef.current && !genieSearchRef.current.contains(event.target as Node)) {
        setGenieSearchDropdownOpen(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setProductSearchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPurchaseCustomers = async (query: string) => {
    try {
      setPurchaseSearchLoading(true);
      setPurchaseSearchDropdownOpen(true);

      const results = await api.searchPurchaseCustomers(query.trim());
      setPurchaseSearchResults(results);
      setPurchaseSearchDropdownOpen(true);
    } catch (error) {
      logger.error('Error searching purchase customers:', error);
      setPurchaseSearchResults([]);
      setPurchaseSearchDropdownOpen(true);
    } finally {
      setPurchaseSearchLoading(false);
    }
  };

  const searchGenieUsers = async (query: string): Promise<GenieUser[]> => {
    try {
      setGenieSearchLoading(true);
      setGenieSearchDropdownOpen(true); // 검색 시작 시 드롭다운 열기

      const users = await api.searchGenieUsers(query.trim());
      setGenieSearchResults(users);
      setGenieSearchDropdownOpen(true);
      return users;
    } catch (error) {
      logger.error('[Genie User Search] 에러:', error);
      setGenieSearchResults([]);
      setGenieSearchDropdownOpen(true); // 에러 시에도 드롭다운 열기
      return [];
    } finally {
      setGenieSearchLoading(false);
    }
  };

  const searchProducts = async (query: string) => {
    // 검색어가 없어도 드롭다운은 열어두고 모든 상품 로드
    try {
      setProductSearchLoading(true);
      setProductSearchDropdownOpen(true); // 검색 시작 시 드롭다운 열기

      const products = await api.searchProducts(query.trim());
      setProductSearchResults(products);
      setProductSearchDropdownOpen(true);
    } catch (error) {
      logger.error('Error searching products:', error);
      setProductSearchResults([]);
      setProductSearchDropdownOpen(true); // 에러 시에도 드롭다운 열기
    } finally {
      setProductSearchLoading(false);
    }
  };

  const handleSelectPurchaseCustomer = async (customer: PurchaseCustomer) => {
    setSelectedPurchaseUserId(customer.id);
    setPurchaseSearchTerm(customer.name || customer.phone || '');
    setPurchaseSearchDropdownOpen(false);

    // 구매 고객 선택 시 여행 상품 정보 자동 로드
    try {
      const tripInfo = await api.fetchPurchaseCustomerTripInfo(customer.id);

      if (!tripInfo) {
        showError('구매 고객의 예약 정보를 찾을 수 없습니다. 수동으로 상품을 선택해주세요.');
        return;
      }

      // 예약 정보가 있으면 Trip 정보 사용 가능
      if (tripInfo.hasReservation && tripInfo.trip) {
        const trip = tripInfo.trip;

        // 상품 정보가 있으면 자동 설정
        if (tripInfo.hasProduct && tripInfo.product) {
          const product = tripInfo.product;

          // Product 객체 생성
          const productObj: Product = {
            id: product.id,
            productCode: product.productCode,
            cruiseLine: product.cruiseLine,
            shipName: product.shipName,
            packageName: product.packageName,
            nights: product.nights,
            days: product.days,
            itineraryPattern: product.itineraryPattern,
          };

          setSelectedProduct(productObj);
          setProductSearchTerm(product.packageName);

          // 온보딩 폼 자동 채우기
          setOnboardingForm({
            productCode: product.productCode,
            productId: product.id,
            cruiseName: trip.cruiseName,
            startDate: trip.startDate,
            endDate: trip.endDate,
            companionType: trip.companionType as '친구' | '커플' | '가족' | '혼자' | null,
            destination: trip.destination,
          });

          showSuccess('구매 고객의 여행 상품 정보가 자동으로 로드되었습니다.');
        } else {
          // 상품 정보가 없어도 Trip 정보는 사용 가능
          // 사용자가 수동으로 상품을 선택할 수 있도록 안내
          setOnboardingForm({
            productCode: '',
            productId: null,
            cruiseName: trip.cruiseName || '',
            startDate: trip.startDate || '',
            endDate: trip.endDate || '',
            companionType: trip.companionType as '친구' | '커플' | '가족' | '혼자' | null,
            destination: trip.destination || '',
          });

          showError('구매 고객의 예약 정보는 있지만 상품 정보를 찾을 수 없습니다. 수동으로 상품을 선택해주세요.');
        }

        // 동행자 정보 자동 로드 (예약 정보가 있으면 동행자 정보도 사용 가능)
        if (tripInfo.travelers && tripInfo.travelers.length > 0) {
          // 동행자가 있으면 첫 번째 동행자 정보 자동 입력
          const firstTraveler = tripInfo.travelers[0];
          const travelerName = firstTraveler.name || '';
          const travelerPhone = firstTraveler.phone || '';

          if (travelerName || travelerPhone) {
            setGenieSearchTerm(travelerName || travelerPhone);

            // 동행자가 이미 사용자로 등록되어 있으면 자동 선택
            if (firstTraveler.userId) {
              try {
                const searchResults = await searchGenieUsers(travelerName || travelerPhone);
                const matchingUser = searchResults.find(
                  u => u.id === firstTraveler.userId ||
                    (travelerName && u.name === travelerName) ||
                    (travelerPhone && u.phone === travelerPhone)
                );
                if (matchingUser) {
                  handleSelectGenieUser(matchingUser);
                }
              } catch (error) {
                logger.error('Error auto-searching traveler user:', error);
              }
            } else {
              // 동행자가 아직 사용자로 등록되지 않았으면 검색만 실행 (수동 입력 가능)
              try {
                await searchGenieUsers(travelerName || travelerPhone);
              } catch (error) {
                logger.error('Error searching traveler:', error);
              }
            }
          }
        } else {
          // 동행자가 없으면 수동으로 입력하도록 안내
          // 구매고객 본인은 동행자가 아니므로 검색하지 않음
          logger.log('[Purchase Customer] 동행자 정보가 없습니다. 수동으로 입력해주세요.');
        }
      } else {
        // 예약 정보가 없으면 수동 입력 안내
        showError('구매 고객의 예약 정보를 찾을 수 없습니다. 수동으로 상품과 동행자를 선택해주세요.');
      }
    } catch (error) {
      logger.error('Error loading purchase customer trip info:', error);
      showError('구매 고객의 여행 상품 정보를 불러오는 중 오류가 발생했습니다. 수동으로 입력해주세요.');
    }
  };

  const handleSelectGenieUser = (user: GenieUser) => {
    setSelectedGenieUserId(user.id);
    setGenieSearchTerm(user.name || user.phone || '');
    setGenieSearchDropdownOpen(false);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductSearchTerm(product.packageName);
    setProductSearchDropdownOpen(false);

    // 크루즈명 자동 채우기
    let cruiseName = '';
    if (product.cruiseLine && product.shipName) {
      const shipName = product.shipName.startsWith(product.cruiseLine)
        ? product.shipName.replace(product.cruiseLine, '').trim()
        : product.shipName;
      cruiseName = `${product.cruiseLine} ${shipName}`.trim();
    } else {
      cruiseName = product.cruiseLine || product.shipName || product.packageName;
    }

    // 목적지 추출
    let destination = '';
    if (product.itineraryPattern && Array.isArray(product.itineraryPattern)) {
      const countries = new Set<string>();
      const countryNameMap: Record<string, string> = {
        'JP': '일본', 'TH': '태국', 'VN': '베트남', 'MY': '말레이시아',
        'SG': '싱가포르', 'ES': '스페인', 'FR': '프랑스', 'IT': '이탈리아',
        'GR': '그리스', 'TR': '터키', 'US': '미국', 'CN': '중국',
        'TW': '대만', 'HK': '홍콩', 'PH': '필리핀', 'ID': '인도네시아'
      };

      product.itineraryPattern.forEach((day: any) => {
        if (day.country && day.country !== 'KR') {
          const countryName = countryNameMap[day.country] || day.location || day.country;
          countries.add(countryName);
        }
      });

      destination = Array.from(countries).join(', ');
    }

    // 날짜 자동 채우기
    let startDate = '';
    let endDate = '';

    if (product.startDate) {
      // 상품에 시작일이 있으면 사용
      startDate = new Date(product.startDate).toISOString().split('T')[0];
      if (product.days) {
        // 일수로 종료일 계산
        const end = new Date(startDate);
        end.setDate(end.getDate() + product.days - 1);
        endDate = end.toISOString().split('T')[0];
      } else if (product.endDate) {
        // 상품에 종료일이 있으면 사용
        endDate = new Date(product.endDate).toISOString().split('T')[0];
      }
    } else if (product.endDate && product.days) {
      // 시작일이 없고 종료일과 일수가 있으면 역산
      const end = new Date(product.endDate);
      const start = new Date(end);
      start.setDate(start.getDate() - product.days + 1);
      startDate = start.toISOString().split('T')[0];
      endDate = end.toISOString().split('T')[0];
    }

    logger.log('[Product Select] 상품 선택:', {
      productCode: product.productCode,
      cruiseName,
      startDate,
      endDate,
      destination,
      hasStartDate: !!product.startDate,
      hasEndDate: !!product.endDate,
      days: product.days
    });

    setOnboardingForm({
      productCode: product.productCode,
      productId: product.id,
      cruiseName,
      startDate,
      endDate,
      companionType: onboardingForm.companionType,
      destination,
    });
  };

  const handleStartDateChange = (date: string) => {
    setOnboardingForm({ ...onboardingForm, startDate: date });

    // 종료일 자동 계산 (상품에 days가 있고, 상품에 startDate가 없을 때만 자동 계산)
    // 상품에 startDate가 있으면 이미 endDate가 계산되어 있으므로 다시 계산하지 않음
    if (selectedProduct && date && selectedProduct.days && !selectedProduct.startDate) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + selectedProduct.days - 1);
      setOnboardingForm(prev => ({
        ...prev,
        startDate: date,
        endDate: end.toISOString().split('T')[0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 필드별 에러 초기화
    setFieldErrors({});

    // 동행자 정보 검증
    if (!genieSearchTerm.trim() && !selectedGenieUserId) {
      setFieldErrors(prev => ({ ...prev, genieUser: '여행 배정 대상(동행자)의 이름 또는 전화번호를 입력해주세요.' }));
      showError('여행 배정 대상(동행자)의 이름 또는 전화번호를 입력해주세요.');
      return;
    }

    if (!selectedProduct) {
      setFieldErrors(prev => ({ ...prev, product: '상품을 선택해주세요.' }));
      showError('상품을 선택해주세요.');
      return;
    }

    if (!onboardingForm.startDate) {
      setFieldErrors(prev => ({ ...prev, startDate: '여행 시작일을 입력해주세요.' }));
      showError('여행 시작일을 입력해주세요.');
      return;
    }

    if (!onboardingForm.endDate) {
      setFieldErrors(prev => ({ ...prev, endDate: '여행 종료일을 입력해주세요.' }));
      showError('여행 종료일을 입력해주세요.');
      return;
    }

    // 날짜 유효성 검증 (프론트엔드)
    const startDateObj = new Date(onboardingForm.startDate);
    const endDateObj = new Date(onboardingForm.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      setFieldErrors(prev => ({ ...prev, startDate: '올바른 날짜 형식을 입력해주세요.' }));
      showError('올바른 날짜 형식을 입력해주세요.');
      return;
    }

    if (startDateObj.getTime() < today.getTime()) {
      setFieldErrors(prev => ({ ...prev, startDate: '여행 시작일은 오늘 이후여야 합니다.' }));
      showError('여행 시작일은 오늘 이후여야 합니다.');
      return;
    }

    if (startDateObj.getTime() > endDateObj.getTime()) {
      setFieldErrors(prev => ({
        ...prev,
        startDate: '여행 시작일은 종료일보다 빠를 수 없습니다.',
        endDate: '여행 종료일은 시작일보다 늦어야 합니다.'
      }));
      showError('여행 시작일은 여행 종료일보다 빠를 수 없습니다.');
      return;
    }

    try {
      setIsSubmitting(true);

      let finalUserId = selectedGenieUserId;

      // 구매고객과 동행자 구분: 구매고객 본인을 동행자로 배정하지 않도록 검증
      if (selectedPurchaseUserId && finalUserId && selectedPurchaseUserId === finalUserId) {
        showError('구매고객 본인은 동행자로 배정할 수 없습니다. 동행자(잠재고객)를 선택해주세요.');
        setIsSubmitting(false);
        return;
      }

      // 사용자가 선택되지 않았으면 동행자 정보로 사용자 생성 또는 검색
      if (!finalUserId) {
        // 이름과 전화번호 추출 (형식: "이름 전화번호" 또는 "전화번호" 또는 "이름")
        const searchTerm = genieSearchTerm.trim();
        let travelerName = '';
        let travelerPhone = '';

        // 전화번호 패턴 확인 (010-1234-5678 또는 01012345678)
        // "이름 전화번호" 또는 "전화번호 이름" 형식 모두 처리
        const phonePattern = /(\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4})/;
        const phoneMatch = searchTerm.match(phonePattern);

        if (phoneMatch) {
          // normalizePhone 함수 사용하여 정규화
          travelerPhone = normalizePhone(phoneMatch[1]) || '';
          // 전화번호 앞뒤로 이름 추출 시도
          const beforePhone = searchTerm.substring(0, phoneMatch.index || 0).trim();
          const afterPhone = searchTerm.substring((phoneMatch.index || 0) + phoneMatch[0].length).trim();
          // 더 긴 부분을 이름으로 간주 (보통 이름이 더 길 수 있음)
          travelerName = beforePhone.length > afterPhone.length ? beforePhone : afterPhone;
          // 둘 다 비어있으면 전화번호만 있는 것으로 간주
          if (!travelerName) {
            travelerName = '';
          }
        } else {
          // 전화번호가 없으면 전체를 이름으로 간주
          travelerName = searchTerm;
        }

        if (!travelerName && !travelerPhone) {
          showError('동행자의 이름 또는 전화번호를 입력해주세요.');
          setIsSubmitting(false);
          return;
        }

        // 전화번호가 없으면 이름만으로는 사용자 생성 불가
        if (!travelerPhone) {
          showError('동행자의 전화번호는 필수입니다. 전화번호를 포함하여 입력해주세요.');
          setIsSubmitting(false);
          return;
        }

        // 전화번호 형식 검증 (한국 휴대폰 번호만 허용)
        const normalizedTravelerPhone = normalizePhone(travelerPhone);
        if (!normalizedTravelerPhone || !isValidMobilePhone(normalizedTravelerPhone)) {
          showError('올바른 한국 휴대폰 번호를 입력해주세요. (010, 011, 016, 017, 018, 019로 시작하는 11자리)');
          setIsSubmitting(false);
          return;
        }

        // 정규화된 전화번호 사용
        travelerPhone = normalizedTravelerPhone;

        // 구매고객과 동행자 구분: 동행자 정보를 직접 입력할 때도 구매고객 본인인지 확인
        if (selectedPurchaseUserId && selectedPurchaseCustomer) {
          const normalizedPurchaserPhone = normalizePhone(selectedPurchaseCustomer.phone);
          if (travelerName === selectedPurchaseCustomer.name &&
            travelerPhone === normalizedPurchaserPhone) {
            showError('구매 고객 본인을 동행자로 배정할 수 없습니다. 다른 동행자를 선택하거나 입력해주세요.');
            setIsSubmitting(false);
            return;
          }
        }

        // 기존 사용자 검색
        const searchResults = await searchGenieUsers(searchTerm);
        const matchingUser = searchResults.find(
          u => (travelerName && u.name === travelerName) ||
            (travelerPhone && u.phone && normalizePhone(u.phone) === travelerPhone)
        );

        if (matchingUser) {
          // 기존 사용자 발견
          finalUserId = matchingUser.id;
          setSelectedGenieUserId(matchingUser.id);
        } else {
          // 사용자가 없으면 새로 생성
          try {
            const createdUser = await api.createGenieUser({
              name: travelerName || '동행자',
              phone: travelerPhone,
            });
            finalUserId = createdUser.id;
            setSelectedGenieUserId(createdUser.id);
            if (createdUser.isExisting) {
              showSuccess(`기존 사용자를 찾았습니다: ${createdUser.name || createdUser.phone}`);
            } else {
              showSuccess(`동행자 사용자가 생성되었습니다: ${createdUser.name || createdUser.phone}`);
            }
          } catch (error: any) {
            logger.error('Error creating user:', error);
            showError(error?.message || '동행자 사용자 생성 중 오류가 발생했습니다.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      if (!finalUserId) {
        showError('사용자를 찾거나 생성할 수 없습니다.');
        setIsSubmitting(false);
        return;
      }

      // 사용자의 첫 번째 여행을 찾거나, 없으면 새 여행 생성 (tripId = 0)
      let tripId = 0;
      // tripId는 0으로 유지 (새 여행 생성)
      // 기존 여행이 있어도 새로 생성하거나, 필요시 별도 API로 조회 가능

      const result = await api.submitOnboarding(finalUserId, {
        productId: onboardingForm.productId,
        productCode: onboardingForm.productCode,
        cruiseName: onboardingForm.cruiseName,
        startDate: onboardingForm.startDate,
        endDate: onboardingForm.endDate,
        companionType: onboardingForm.companionType || null,
        destination: onboardingForm.destination,
        itineraryPattern: selectedProduct.itineraryPattern,
      });

      if (result.ok) {
        showSuccess('여행이 배정되었습니다! 크루즈 가이드 지니가 활성화되었습니다.');
        // 폼 초기화
        setSelectedPurchaseUserId(null);
        setSelectedGenieUserId(null);
        setSelectedProduct(null);
        setPurchaseSearchTerm('');
        setGenieSearchTerm('');
        setProductSearchTerm('');
        setPurchaseSearchResults([]);
        setGenieSearchResults([]);
        setProductSearchResults([]);
        setOnboardingForm({
          productCode: '',
          productId: null,
          cruiseName: '',
          startDate: '',
          endDate: '',
          companionType: null,
          destination: '',
        });
        setFieldErrors({});
      } else {
        showError(result.error || '여행 배정에 실패했습니다.');
      }
    } catch (error) {
      logger.error('Error assigning trip:', error);
      showError('여행 배정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dday = onboardingForm.startDate ? calculateDday(onboardingForm.startDate) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">여행 배정</h1>
          <p className="text-gray-600">크루즈 가이드 사용자에게 여행을 배정하고 크루즈몰과 연동합니다</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6" aria-label="여행 배정 폼">
          {/* 구매 고객 검색 (새로 추가) */}
          <div className="purchase-customer-search-container relative" ref={purchaseSearchRef}>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <FiUser />
              구매 고객 검색 <span className="text-gray-400 text-xs">(선택사항)</span>
              <span className="text-blue-600 text-xs ml-1">- 선택 시 자동으로 여행 상품 정보 로드</span>
            </label>
            <div className="relative">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={purchaseSearchTerm}
                  onChange={(e) => {
                    setPurchaseSearchTerm(e.target.value);
                    setPurchaseSearchDropdownOpen(true);
                    if (!e.target.value) {
                      setSelectedPurchaseUserId(null);
                      setPurchaseSearchResults([]);
                    }
                  }}
                  onFocus={() => {
                    setPurchaseSearchDropdownOpen(true);
                    searchPurchaseCustomers(purchaseSearchTerm);
                  }}
                  onClick={() => {
                    setPurchaseSearchDropdownOpen(true);
                    searchPurchaseCustomers(purchaseSearchTerm);
                  }}
                  placeholder="구매 고객 이름 또는 전화번호로 검색"
                  disabled={isSubmitting}
                  aria-label="구매 고객 검색 (선택사항)"
                  className={`w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg transition-colors ${isSubmitting ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'border-gray-300 bg-white'
                    }`}
                />
                {purchaseSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseSearchTerm('');
                      setSelectedPurchaseUserId(null);
                      setPurchaseSearchResults([]);
                      setPurchaseSearchDropdownOpen(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                )}
              </div>

              {/* 검색 결과 드롭다운 */}
              {purchaseSearchDropdownOpen && (
                <div className="absolute z-[9999] w-full mt-2 bg-white border-2 border-blue-500 rounded-lg shadow-2xl max-h-72 overflow-y-auto" style={{ position: 'absolute', top: '100%', left: 0, right: 0 }}>
                  {purchaseSearchLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      로딩 중...
                    </div>
                  ) : purchaseSearchResults.length > 0 ? (
                    <>
                      {!purchaseSearchTerm && (
                        <div className="p-3 bg-orange-50 border-b border-orange-200">
                          <div className="text-sm font-semibold text-orange-800">구매 고객 목록</div>
                          <div className="text-xs text-orange-600 mt-1">검색어를 입력하면 필터링됩니다</div>
                        </div>
                      )}
                      {purchaseSearchResults.map((customer) => (
                        <div
                          key={customer.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectPurchaseCustomer(customer)}
                          className={`p-4 border-b border-gray-100 hover:bg-orange-50 cursor-pointer transition-colors ${selectedPurchaseUserId === customer.id ? 'bg-orange-50' : ''
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">
                                {customer.name || '이름 없음'}
                                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                                  구매 고객
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {customer.phone ? `📞 ${customer.phone}` : '연락처 없음'}
                              </div>
                            </div>
                            {selectedPurchaseUserId === customer.id && (
                              <FiCheckCircle className="text-green-500 flex-shrink-0" size={20} />
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : purchaseSearchTerm ? (
                    <div className="p-4 text-center text-gray-500">검색 결과가 없습니다</div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">구매 고객 목록을 불러오는 중...</div>
                  )}
                </div>
              )}
            </div>
            {selectedPurchaseCustomer && (
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-sm font-semibold text-orange-800">선택된 구매 고객:</div>
                <div className="text-sm text-orange-700 mt-1">
                  {selectedPurchaseCustomer.name || '이름 없음'} ({selectedPurchaseCustomer.phone || '연락처 없음'})
                </div>
              </div>
            )}
          </div>

          {/* 여행 배정 대상 (동행자) 검색 (필수) */}
          <div className="genie-user-search-container relative" ref={genieSearchRef}>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <FiUser />
              여행 배정 대상 (동행자) <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              구매고객의 동행자(크루즈몰 고객 또는 잠재고객)를 검색하거나 수동으로 입력하세요.
              구매고객을 선택하면 동행자 정보가 자동으로 로드됩니다.
            </p>
            <div className="relative">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={genieSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGenieSearchTerm(value);
                    setGenieSearchDropdownOpen(true); // 입력 시 항상 드롭다운 열기
                    // 검색어를 지워도 결과는 유지 (검색 API가 다시 호출됨)
                    if (!value) {
                      setSelectedGenieUserId(null);
                      // 검색어가 비어있으면 전체 목록을 다시 로드하기 위해 검색 실행
                      // useEffect에서 자동으로 처리됨
                    }
                  }}
                  onFocus={() => {
                    // 포커스 시 항상 드롭다운 열기 및 전체 목록 로드
                    setGenieSearchDropdownOpen(true);
                    searchGenieUsers(genieSearchTerm);
                  }}
                  onClick={() => {
                    // 클릭 시에도 드롭다운 열기 및 전체 목록 로드
                    setGenieSearchDropdownOpen(true);
                    searchGenieUsers(genieSearchTerm);
                  }}
                  placeholder="동행자 이름 또는 전화번호로 검색 (구매고객 선택 시 자동 로드)"
                  disabled={isSubmitting}
                  aria-label="여행 배정 대상 동행자 검색"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.genieUser}
                  aria-describedby={fieldErrors.genieUser ? 'genie-user-error' : undefined}
                  className={`w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg transition-colors ${fieldErrors.genieUser
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-white'
                    } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
                {genieSearchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setGenieSearchTerm('');
                      setSelectedGenieUserId(null);
                      setGenieSearchResults([]);
                      setGenieSearchDropdownOpen(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                )}
              </div>

              {/* 검색 결과 드롭다운 */}
              {genieSearchDropdownOpen && (
                <div className="absolute z-[9999] w-full mt-2 bg-white border-2 border-blue-500 rounded-lg shadow-2xl max-h-72 overflow-y-auto" style={{ position: 'absolute', top: '100%', left: 0, right: 0 }}>
                  {genieSearchLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      로딩 중...
                    </div>
                  ) : genieSearchResults.length > 0 ? (
                    <>
                      {!genieSearchTerm && (
                        <div className="p-3 bg-blue-50 border-b border-blue-200">
                          <div className="text-sm font-semibold text-blue-800">잠재고객 목록 ({genieSearchResults.length}명)</div>
                          <div className="text-xs text-blue-600 mt-1">이름순으로 정렬됩니다. 검색어를 입력하면 필터링됩니다</div>
                        </div>
                      )}
                      {genieSearchTerm && (
                        <div className="p-3 bg-blue-50 border-b border-blue-200">
                          <div className="text-sm font-semibold text-blue-800">잠재고객 검색 결과 ({genieSearchResults.length}명)</div>
                          <div className="text-xs text-blue-600 mt-1">검색어: &quot;{genieSearchTerm}&quot;</div>
                        </div>
                      )}
                      {genieSearchResults.map((user) => (
                        <div
                          key={user.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectGenieUser(user)}
                          className={`p-4 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${selectedGenieUserId === user.id ? 'bg-blue-50' : ''
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">
                                {user.name || '이름 없음'}
                                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                  잠재고객
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {user.phone ? `📞 ${user.phone}` : '연락처 없음'}
                                {user.email && ` · ✉️ ${user.email}`}
                              </div>
                            </div>
                            {selectedGenieUserId === user.id && (
                              <FiCheckCircle className="text-green-500 flex-shrink-0" size={20} />
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : genieSearchTerm ? (
                    <div className="p-4 text-center text-gray-500">검색 결과가 없습니다</div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">사용자 목록을 불러오는 중...</div>
                  )}
                </div>
              )}
            </div>
            {fieldErrors.genieUser && (
              <p id="genie-user-error" className="mt-2 text-sm text-red-600" role="alert">
                {fieldErrors.genieUser}
              </p>
            )}
            {selectedGenieUser && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm font-semibold text-green-800">선택된 크루즈 가이드 사용자:</div>
                <div className="text-sm text-green-700 mt-1">
                  {selectedGenieUser.name || '이름 없음'} ({selectedGenieUser.phone || '연락처 없음'})
                </div>
              </div>
            )}
          </div>

          {/* 크루즈몰 상품 검색 (필수) */}
          <div className="product-search-container relative" ref={productSearchRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              크루즈몰 상품 검색 <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value);
                    setProductSearchDropdownOpen(true); // 입력 시 항상 드롭다운 열기
                    if (!e.target.value) {
                      setSelectedProduct(null);
                      setOnboardingForm({
                        ...onboardingForm,
                        productCode: '',
                        productId: null,
                        cruiseName: '',
                        startDate: '',
                        endDate: '',
                        destination: '',
                      });
                    }
                  }}
                  onFocus={() => {
                    // 포커스 시 항상 드롭다운 열기 및 모든 상품 로드
                    setProductSearchDropdownOpen(true);
                    // 검색어가 없어도 모든 상품 로드
                    searchProducts(productSearchTerm);
                  }}
                  onClick={() => {
                    // 클릭 시에도 드롭다운 열기 및 모든 상품 로드
                    setProductSearchDropdownOpen(true);
                    // 검색어가 없어도 모든 상품 로드
                    searchProducts(productSearchTerm);
                  }}
                  placeholder="상품명 또는 크루즈명으로 검색 (예: MSC 벨리시마)"
                  disabled={isSubmitting}
                  aria-label="크루즈몰 상품 검색"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.product}
                  aria-describedby={fieldErrors.product ? 'product-error' : undefined}
                  className={`w-full pl-10 pr-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg transition-colors ${fieldErrors.product
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-white'
                    } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* 검색 결과 드롭다운 */}
              {productSearchDropdownOpen && (
                <div className="absolute z-[9999] w-full mt-2 bg-white border-2 border-blue-500 rounded-lg shadow-2xl max-h-72 overflow-y-auto" style={{ position: 'absolute', top: '100%', left: 0, right: 0 }}>
                  {productSearchLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      검색 중...
                    </div>
                  ) : productSearchResults.length > 0 ? (
                    <>
                      {!productSearchTerm && (
                        <div className="p-3 bg-blue-50 border-b border-blue-200">
                          <div className="text-sm font-semibold text-blue-800">판매 중인 상품 목록</div>
                          <div className="text-xs text-blue-600 mt-1">검색어를 입력하면 연관검색으로 필터링됩니다</div>
                        </div>
                      )}
                      {productSearchResults.map((product) => (
                        <div
                          key={product.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectProduct(product)}
                          className={`p-4 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${selectedProduct?.id === product.id ? 'bg-blue-50' : ''
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 flex items-center gap-2">
                                {product.packageName}
                                {product.isPopular && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">인기</span>
                                )}
                                {product.isRecommended && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">추천</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {product.cruiseLine} {product.shipName}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {product.nights}박 {product.days}일 · 코드: {product.productCode}
                              </div>
                            </div>
                            {selectedProduct?.id === product.id && (
                              <FiCheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : productSearchTerm ? (
                    <div className="p-4 text-center text-gray-500">검색 결과가 없습니다</div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">상품을 불러오는 중...</div>
                  )}
                </div>
              )}
            </div>
            {fieldErrors.product && (
              <p id="product-error" className="mt-2 text-sm text-red-600" role="alert">
                {fieldErrors.product}
              </p>
            )}
            {selectedProduct && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm font-semibold text-green-800">선택된 상품:</div>
                <div className="text-sm text-green-700 mt-1">
                  {selectedProduct.packageName} ({selectedProduct.productCode})
                </div>
              </div>
            )}
          </div>

          {/* 여행 정보 표시 (상품 선택 시 자동 표시) */}
          {selectedProduct && onboardingForm.startDate && onboardingForm.endDate && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
              <h3 className="text-lg font-bold text-blue-900 mb-3">여행 정보</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-blue-800">여행 기간:</span>
                  <div className="text-blue-700 mt-1">
                    {selectedProduct.nights}박 {selectedProduct.days}일
                  </div>
                </div>
                {dday !== null && (
                  <div>
                    <span className="font-semibold text-blue-800">출발까지:</span>
                    <div className="text-blue-700 mt-1">
                      {dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day' : `D+${Math.abs(dday)}`}
                    </div>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-blue-800">여행 시작일:</span>
                  <div className="text-blue-700 mt-1">
                    {new Date(onboardingForm.startDate).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-blue-800">여행 종료일:</span>
                  <div className="text-blue-700 mt-1">
                    {new Date(onboardingForm.endDate).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 크루즈명 (자동 채워짐, 읽기 전용) */}
          {selectedProduct && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                크루즈명
              </label>
              <input
                type="text"
                value={onboardingForm.cruiseName}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>
          )}

          {/* 여행 날짜 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                여행 시작일 <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={onboardingForm.startDate}
                onChange={(e) => {
                  handleStartDateChange(e.target.value);
                  if (fieldErrors.startDate) {
                    setFieldErrors(prev => ({ ...prev, startDate: undefined }));
                  }
                }}
                disabled={isSubmitting}
                min={new Date().toISOString().split('T')[0]}
                aria-label="여행 시작일"
                aria-required="true"
                aria-invalid={!!fieldErrors.startDate}
                aria-describedby={fieldErrors.startDate ? 'start-date-error' : undefined}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${fieldErrors.startDate
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 bg-white'
                  } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                required
              />
              {fieldErrors.startDate && (
                <p id="start-date-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.startDate}
                </p>
              )}
              {selectedProduct && selectedProduct.startDate && !fieldErrors.startDate && (
                <p className="text-xs text-gray-500 mt-1">
                  상품 정보에서 자동으로 가져왔습니다
                </p>
              )}
              {selectedProduct && !selectedProduct.startDate && !fieldErrors.startDate && (
                <p className="text-xs text-blue-600 mt-1">
                  상품에 날짜 정보가 없어 수동으로 입력해주세요
                </p>
              )}
              {selectedProduct && !selectedProduct.startDate && selectedProduct.days && !fieldErrors.startDate && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedProduct.days}일 일정으로 종료일이 자동 계산됩니다
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                여행 종료일 <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={onboardingForm.endDate}
                onChange={(e) => {
                  const newEndDate = e.target.value;
                  setOnboardingForm({ ...onboardingForm, endDate: newEndDate });
                  if (fieldErrors.endDate) {
                    setFieldErrors(prev => ({ ...prev, endDate: undefined }));
                  }
                  // 시작일과 종료일 검증
                  if (onboardingForm.startDate && newEndDate) {
                    const start = new Date(onboardingForm.startDate);
                    const end = new Date(newEndDate);
                    if (end.getTime() < start.getTime()) {
                      setFieldErrors(prev => ({
                        ...prev,
                        endDate: '여행 종료일은 시작일보다 늦어야 합니다.'
                      }));
                    }
                  }
                }}
                disabled={isSubmitting || (!!selectedProduct && !!selectedProduct.startDate && !!onboardingForm.startDate)}
                min={onboardingForm.startDate || new Date().toISOString().split('T')[0]}
                aria-label="여행 종료일"
                aria-required="true"
                aria-invalid={!!fieldErrors.endDate}
                aria-describedby={fieldErrors.endDate ? 'end-date-error' : undefined}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${fieldErrors.endDate
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 bg-white'
                  } ${isSubmitting || (!!selectedProduct && !!selectedProduct.startDate && !!onboardingForm.startDate) ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
                required
                readOnly={!!selectedProduct && !!selectedProduct.startDate && !!onboardingForm.startDate}
              />
              {fieldErrors.endDate && (
                <p id="end-date-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.endDate}
                </p>
              )}
              {selectedProduct && selectedProduct.startDate && onboardingForm.startDate && !fieldErrors.endDate && (
                <p className="text-xs text-gray-500 mt-1">
                  상품 일정에 따라 자동 계산됨
                </p>
              )}
              {selectedProduct && !selectedProduct.startDate && !fieldErrors.endDate && (
                <p className="text-xs text-blue-600 mt-1">
                  상품에 날짜 정보가 없어 수동으로 입력해주세요
                </p>
              )}
            </div>
          </div>

          {/* 동행 유형 (선택사항) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              동행 유형 <span className="text-gray-400 text-xs">(선택사항)</span>
            </label>
            <select
              value={onboardingForm.companionType || ''}
              onChange={(e) => {
                const value = e.target.value;
                setOnboardingForm({
                  ...onboardingForm,
                  companionType: value ? (value as '친구' | '커플' | '가족' | '혼자') : null
                });
              }}
              disabled={isSubmitting}
              aria-label="동행 유형 (선택사항)"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${isSubmitting ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'border-gray-300 bg-white'
                }`}
            >
              <option value="">선택하지 않음</option>
              <option value="가족">가족</option>
              <option value="커플">커플</option>
              <option value="친구">친구</option>
              <option value="혼자">혼자</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              동행 유형을 선택하지 않아도 여행 배정이 가능합니다
            </p>
          </div>

          {/* 목적지 (자동 채워짐, 읽기 전용) */}
          {selectedProduct && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">목적지</label>
              <input
                type="text"
                value={onboardingForm.destination}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">상품 정보에서 자동으로 가져왔습니다</p>
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-semibold mb-2">⚠️ 여행 배정 완료 시:</p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>비밀번호가 3800으로 변경됩니다</li>
              <li>크루즈 가이드 지니가 활성화됩니다</li>
              <li>여행 횟수가 2회 이상이면 재구매로 자동 체크됩니다</li>
              <li>크루즈몰 사용자의 경우 나의정보에서도 확인할 수 있습니다</li>
            </ul>
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting || !selectedGenieUserId || !selectedProduct || !onboardingForm.startDate || !onboardingForm.endDate}
            aria-label="여행 배정하기"
            aria-busy={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiCheckCircle />
            {isSubmitting ? '배정 중...' : '여행 배정하기'}
          </button>
          {isSubmitting && (
            <div className="text-center text-sm text-gray-600 mt-2" role="status" aria-live="polite">
              여행 배정을 처리하는 중입니다. 잠시만 기다려주세요...
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export function createAdminAssignTripApi(): AssignTripApi {
  return {
    async searchPurchaseCustomers(query: string) {
      const params = new URLSearchParams({ customerGroup: 'purchase' });
      if (query) {
        params.append('search', query);
      }
      const response = await fetch(`/api/admin/customers?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok && Array.isArray(data.customers)) {
        return data.customers.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          customerStatus: c.customerStatus,
        }));
      }
      return [];
    },
    async fetchPurchaseCustomerTripInfo(userId: number) {
      const response = await fetch(`/api/admin/purchased-customers/${userId}/trip-info`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        return null;
      }
      if (!data.hasReservation || !data.hasProduct) {
        return {
          hasReservation: false,
          hasProduct: false,
          product: data.product,
          trip: data.trip,
          travelers: data.travelers || [],
          user: data.user,
        } as PurchaseCustomerTripInfo;
      }
      return {
        hasReservation: data.hasReservation,
        hasProduct: data.hasProduct,
        product: data.product,
        trip: data.trip,
        travelers: (data.travelers || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          phone: t.phone,
          userId: t.userId || null,
        })),
        user: data.user,
      } as PurchaseCustomerTripInfo;
    },
    async searchGenieUsers(query: string) {
      const params = new URLSearchParams({ role: 'user', customerStatus: 'prospects' });
      if (query) {
        params.append('search', query);
      }
      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok && Array.isArray(data.users)) {
        return data.users;
      }
      return [];
    },
    async createGenieUser(payload) {
      const response = await fetch('/api/admin/customers/create-genie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.user) {
        throw new Error(data.error || '동행자 사용자 생성에 실패했습니다.');
      }
      return {
        ...data.user,
        isExisting: data.isExisting,
      };
    },
    async searchProducts(query: string) {
      const response = await fetch(`/api/admin/products/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok && Array.isArray(data.products)) {
        return data.products;
      }
      return [];
    },
    async submitOnboarding(userId, payload) {
      const response = await fetch(`/api/admin/users/${userId}/trips/0/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      return {
        ok: response.ok && data.ok,
        message: data.message,
        error: data.error,
      };
    },
  };
}

export function createPartnerAssignTripApi(): AssignTripApi {
  return {
    async searchPurchaseCustomers(query: string) {
      const params = new URLSearchParams();
      if (query) {
        params.append('search', query);
      }
      const response = await fetch(`/api/partner/assign-trip/purchased-customers?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok && Array.isArray(data.customers)) {
        return data.customers;
      }
      return [];
    },
    async fetchPurchaseCustomerTripInfo(userId: number) {
      const response = await fetch(`/api/partner/assign-trip/purchased-customers/${userId}/trip-info`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        return null;
      }
      return {
        hasReservation: data.hasReservation,
        hasProduct: data.hasProduct,
        product: data.product,
        trip: data.trip,
        travelers: (data.travelers || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          phone: t.phone,
          userId: t.userId || null,
        })),
        user: data.user,
      } as PurchaseCustomerTripInfo;
    },
    async searchGenieUsers(query: string) {
      const params = new URLSearchParams();
      if (query) {
        params.append('search', query);
      }
      const response = await fetch(`/api/partner/assign-trip/users?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok && Array.isArray(data.users)) {
        return data.users;
      }
      return [];
    },
    async createGenieUser(payload) {
      const response = await fetch('/api/partner/assign-trip/create-genie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.user) {
        throw new Error(data.error || '동행자 사용자 생성에 실패했습니다.');
      }
      return {
        ...data.user,
        isExisting: data.isExisting,
      };
    },
    async searchProducts(query: string) {
      const response = await fetch(`/api/partner/assign-trip/products/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok && Array.isArray(data.products)) {
        return data.products;
      }
      return [];
    },
    async submitOnboarding(userId, payload) {
      const response = await fetch(`/api/partner/assign-trip/users/${userId}/trips/0/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      return {
        ok: response.ok && data.ok,
        message: data.message,
        error: data.error,
      };
    },
  };
}