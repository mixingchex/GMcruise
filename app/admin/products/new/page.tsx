'use client';

import { logger } from '@/lib/logger';
// app/admin/products/new/page.tsx
// 새 상품 등록 페이지 (상품 편집 페이지와 동일한 UI)

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiSave, FiX, FiEye, FiStar } from 'react-icons/fi';
import { showSuccess, showError } from '@/components/ui/Toast';
import ProductDetailEditor, { ContentBlock } from '@/components/admin/ProductDetailEditor';
import IncludedExcludedEditor from '@/components/admin/IncludedExcludedEditor';
import EnhancedItineraryEditor, { EnhancedItineraryDay } from '@/components/admin/EnhancedItineraryEditor';
import PricingTableEditor, { PricingRow } from '@/components/admin/PricingTableEditor';
import RefundPolicyEditor from '@/components/admin/RefundPolicyEditor';
import ProductTagsSelector from '@/components/admin/ProductTagsSelector';
import AutocompleteInput from '@/components/admin/AutocompleteInput';
import DateRangePicker from '@/components/admin/DateRangePicker';
import CountrySelector from '@/components/admin/CountrySelector';
import FlightInfoEditor, { FlightInfo } from '@/components/admin/FlightInfoEditor';
import MobilePreview from '@/components/admin/MobilePreview';
import ProductPreviewModal from '@/components/admin/ProductPreviewModal';
import { Option } from '@/components/CountrySelect';
import { getAllCruiseLines, getAllShipNames, searchCruiseLinesAndShips } from '@/lib/cruise-data';
import { getKoreanCruiseLineName, getKoreanShipName } from '@/lib/utils/cruiseNames';

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // 기본 정보
  const [formData, setFormData] = useState({
    productCode: '',
    cruiseLine: '',
    shipName: '',
    packageName: '',
    nights: 0,
    days: 0,
    basePrice: '',
    description: '',
    source: 'manual', // 'cruisedot', 'wcruise', 'manual'
    category: '', // '주말크루즈', '동남아', '홍콩' 등
    isPopular: false,
    isRecommended: false,
    isPremium: false,
    isGeniePack: false,
    isDomestic: false,
    isJapan: false,
    isBudget: false,
    startDate: '',
    endDate: '',
  });

  // 썸네일
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  // 상세페이지 블록
  const [detailBlocks, setDetailBlocks] = useState<ContentBlock[]>([]);

  // 포함/불포함 사항
  const [includedItems, setIncludedItems] = useState<string[]>([]);
  const [excludedItems, setExcludedItems] = useState<string[]>([]);

  // 서비스 옵션 체크박스
  const [hasEscort, setHasEscort] = useState<boolean>(false); // 인솔자
  const [hasLocalGuide, setHasLocalGuide] = useState<boolean>(false); // 현지가이드
  const [hasCruisedotStaff, setHasCruisedotStaff] = useState<boolean>(false); // 크루즈닷 전용 스탭
  const [hasTravelInsurance, setHasTravelInsurance] = useState<boolean>(false); // 여행자보험

  // 여행일정
  const [itineraryDays, setItineraryDays] = useState<EnhancedItineraryDay[]>([]);

  // 요금표
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([]);
  const [departureDate, setDepartureDate] = useState<string>('');

  // 환불/취소 규정
  const [refundPolicy, setRefundPolicy] = useState<string>('');

  // 태그 (최대 3개)
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 추천 키워드 (최대 5개)
  const [recommendedKeywords, setRecommendedKeywords] = useState<string[]>([]);
  const [keywordSearchTerm, setKeywordSearchTerm] = useState('');
  const [keywordDropdownOpen, setKeywordDropdownOpen] = useState(false);
  const keywordDropdownRef = useRef<HTMLDivElement>(null);
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [rating, setRating] = useState<number>(4.4);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [previewProductCode, setPreviewProductCode] = useState<string | null>(null);

  // 상품코드 유효성 검사 상태
  const [productCodeStatus, setProductCodeStatus] = useState<{
    checking: boolean;
    isDuplicate: boolean | null;
    validationErrors: string[];
    isValid: boolean | null;
  }>({
    checking: false,
    isDuplicate: null,
    validationErrors: [],
    isValid: null
  });
  const [isManualProductCode, setIsManualProductCode] = useState(false); // 수동 입력 모드

  // 8. 문의 옵션 (결제하기, 전화상담, AI 지니 채팅봇) - 각각 활성화/비활성화 가능
  const [contactOptions, setContactOptions] = useState<{
    payment: boolean;
    phoneCall: boolean;
    aiChatbot: boolean;
  }>({
    payment: false,
    phoneCall: false,
    aiChatbot: true, // 기본값: AI 지니 채팅봇만 활성화
  });

  // 추천 키워드 목록 (실제 검색량이 많은 키워드 50개 - 구글/네이버 검색량 기준)
  const RECOMMENDED_KEYWORDS = [
    // 인기 여행 목적지/테마
    '신혼여행', '칠순잔치', '가족여행', '주말크루즈', '부산출발', '일본크루즈', '온리캐빈', '자유크루즈',
    '동남아크루즈', '지중해크루즈', '알래스카크루즈', '홍콩크루즈', '싱가포르크루즈', '베트남크루즈',
    '태국크루즈', '필리핀크루즈', '대만크루즈', '중국크루즈', '커플여행', '친구여행',
    '은퇴여행', '생일여행', '기념일여행', '허니문', '부모님여행', '자녀여행',
    '단체여행', 'MT여행', '워크샵여행', '회사여행', '연수여행', '인센티브여행',
    '골프크루즈', '요트크루즈', '프리미엄크루즈', '럭셔리크루즈', '할인크루즈', '특가크루즈',
    '이벤트크루즈', '시즌크루즈', '여름크루즈', '겨울크루즈', '봄크루즈', '가을크루즈',
    // 추가 인기 키워드
    '인천출발', '서울출발', '제주크루즈', '해외크루즈', '국내크루즈', '신규크루즈', '조기예약', '마지막특가',
    '신규선박', '프리미엄선박', '럭셔리선박', '올인클루시브', '올인클루시브크루즈'
  ];

  // 필터링된 추천 키워드 목록
  const filteredKeywords = useMemo(() => {
    if (!keywordSearchTerm) return RECOMMENDED_KEYWORDS;
    const searchTerm = keywordSearchTerm.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
    return RECOMMENDED_KEYWORDS.filter(keyword => {
      const cleaned = keyword.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
      return cleaned.includes(searchTerm);
    });
  }, [keywordSearchTerm]);

  // 크루즈 라인 자동완성 옵션 (AutocompleteInput용) - 한국어로 변환
  const cruiseLineAutocompleteOptions = useMemo(() => {
    // 크루즈 라인 검색 시 해당 선박명도 함께 검색
    if (formData.cruiseLine.trim()) {
      const result = searchCruiseLinesAndShips(formData.cruiseLine);
      // 크루즈 라인 우선, 그 다음 선박명 - 한국어로 변환
      const koreanCruiseLines = result.cruiseLines.map(line => getKoreanCruiseLineName(line));
      const koreanShips = result.ships.map(ship => getKoreanShipName(formData.cruiseLine, ship));
      return [...koreanCruiseLines, ...koreanShips];
    }
    // 모든 크루즈 라인을 한국어로 변환
    return getAllCruiseLines().map(line => getKoreanCruiseLineName(line));
  }, [formData.cruiseLine]);

  // 선박명 자동완성 옵션 (AutocompleteInput용) - 한국어로 변환
  const shipNameAutocompleteOptions = useMemo(() => {
    // 선박명 검색 시 해당 크루즈 라인도 함께 검색
    if (formData.shipName.trim()) {
      const result = searchCruiseLinesAndShips(formData.shipName);
      // 선박명 우선, 그 다음 크루즈 라인 - 한국어로 변환
      const koreanShips = result.ships.map(ship => getKoreanShipName(formData.cruiseLine, ship));
      const koreanCruiseLines = result.cruiseLines.map(line => getKoreanCruiseLineName(line));
      return [...koreanShips, ...koreanCruiseLines];
    }
    // 모든 선박명을 한국어로 변환
    return getAllShipNames().map(ship => getKoreanShipName(formData.cruiseLine, ship));
  }, [formData.shipName, formData.cruiseLine]);

  // 상품코드 중복 체크 함수 (debounced)
  const productCodeCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkProductCodeDuplicate = useCallback(async (code: string) => {
    if (!code || code.length < 3) {
      setProductCodeStatus({
        checking: false,
        isDuplicate: null,
        validationErrors: code && code.length < 3 ? ['상품코드는 최소 3자 이상이어야 합니다.'] : [],
        isValid: null
      });
      return;
    }

    setProductCodeStatus(prev => ({ ...prev, checking: true }));

    try {
      const res = await fetch(`/api/admin/products/check-duplicate?productCode=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (data.ok) {
        setProductCodeStatus({
          checking: false,
          isDuplicate: data.isDuplicate,
          validationErrors: data.validationErrors || [],
          isValid: data.isValid
        });
      }
    } catch (error) {
      console.error('상품코드 체크 오류:', error);
      setProductCodeStatus(prev => ({ ...prev, checking: false }));
    }
  }, []);

  // 상품코드 변경 시 debounced 중복 체크
  useEffect(() => {
    if (!isManualProductCode) return; // 자동 생성 모드에서는 체크하지 않음

    if (productCodeCheckTimeoutRef.current) {
      clearTimeout(productCodeCheckTimeoutRef.current);
    }

    productCodeCheckTimeoutRef.current = setTimeout(() => {
      checkProductCodeDuplicate(formData.productCode);
    }, 500);

    return () => {
      if (productCodeCheckTimeoutRef.current) {
        clearTimeout(productCodeCheckTimeoutRef.current);
      }
    };
  }, [formData.productCode, isManualProductCode, checkProductCodeDuplicate]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (keywordDropdownRef.current && !keywordDropdownRef.current.contains(event.target as Node)) {
        setKeywordDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 방문 국가 선택
  const [selectedCountries, setSelectedCountries] = useState<Option[]>([]);

  // 자동저장 키 (localStorage)
  const AUTO_SAVE_KEY = 'product_new_draft';

  // 자동저장 상태
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [isLoadingFromStorage, setIsLoadingFromStorage] = useState(false);

  // 자동저장 타이머
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 최신 상태를 참조하기 위한 ref
  const formDataRef = useRef(formData);
  const selectedCountriesRef = useRef(selectedCountries);
  const thumbnailRef = useRef(thumbnail);
  const detailBlocksRef = useRef(detailBlocks);
  const includedItemsRef = useRef(includedItems);
  const excludedItemsRef = useRef(excludedItems);
  const itineraryDaysRef = useRef(itineraryDays);
  const pricingRowsRef = useRef(pricingRows);
  const departureDateRef = useRef(departureDate);
  const refundPolicyRef = useRef(refundPolicy);
  const selectedTagsRef = useRef(selectedTags);
  const recommendedKeywordsRef = useRef(recommendedKeywords);
  const flightInfoRef = useRef(flightInfo);
  const ratingRef = useRef(rating);
  const reviewCountRef = useRef(reviewCount);
  const hasEscortRef = useRef(hasEscort);
  const hasLocalGuideRef = useRef(hasLocalGuide);
  const hasCruisedotStaffRef = useRef(hasCruisedotStaff);
  const hasTravelInsuranceRef = useRef(hasTravelInsurance);

  // ref 업데이트
  useEffect(() => {
    formDataRef.current = formData;
    selectedCountriesRef.current = selectedCountries;
    thumbnailRef.current = thumbnail;
    detailBlocksRef.current = detailBlocks;
    includedItemsRef.current = includedItems;
    excludedItemsRef.current = excludedItems;
    itineraryDaysRef.current = itineraryDays;
    pricingRowsRef.current = pricingRows;
    departureDateRef.current = departureDate;
    refundPolicyRef.current = refundPolicy;
    selectedTagsRef.current = selectedTags;
    recommendedKeywordsRef.current = recommendedKeywords;
    flightInfoRef.current = flightInfo;
    ratingRef.current = rating;
    reviewCountRef.current = reviewCount;
    hasEscortRef.current = hasEscort;
    hasLocalGuideRef.current = hasLocalGuide;
    hasCruisedotStaffRef.current = hasCruisedotStaff;
    hasTravelInsuranceRef.current = hasTravelInsurance;
  });

  // 자동저장 함수 (ref 사용으로 dependency 없음)
  const saveToLocalStorage = useCallback(() => {
    if (isLoadingFromStorage) return; // 로딩 중에는 저장하지 않음
    
    try {
      setAutoSaveStatus('saving');
      const draft = {
        formData: formDataRef.current,
        selectedCountries: selectedCountriesRef.current,
        thumbnail: thumbnailRef.current,
        detailBlocks: detailBlocksRef.current,
        includedItems: includedItemsRef.current,
        excludedItems: excludedItemsRef.current,
        itineraryDays: itineraryDaysRef.current,
        pricingRows: pricingRowsRef.current,
        departureDate: departureDateRef.current,
        refundPolicy: refundPolicyRef.current,
        selectedTags: selectedTagsRef.current,
        recommendedKeywords: recommendedKeywordsRef.current,
        flightInfo: flightInfoRef.current,
        rating: ratingRef.current,
        reviewCount: reviewCountRef.current,
        hasEscort: hasEscortRef.current,
        hasLocalGuide: hasLocalGuideRef.current,
        hasCruisedotStaff: hasCruisedotStaffRef.current,
        hasTravelInsurance: hasTravelInsuranceRef.current,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft));
      setTimeout(() => {
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(null), 2000);
      }, 300);
    } catch (error) {
      console.error('자동저장 실패:', error);
      setAutoSaveStatus(null);
    }
  }, [isLoadingFromStorage]);

  // localStorage에서 복원 (한 번만 실행)
  const loadFromLocalStorage = useCallback(() => {
    try {
      setIsLoadingFromStorage(true);
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.formData) {
          setFormData(draft.formData);
        }
        if (draft.selectedCountries) {
          setSelectedCountries(draft.selectedCountries);
        }
        if (draft.thumbnail) {
          setThumbnail(draft.thumbnail);
        }
        if (draft.detailBlocks) {
          setDetailBlocks(draft.detailBlocks);
        }
        if (draft.includedItems) {
          setIncludedItems(draft.includedItems);
        }
        if (draft.excludedItems) {
          setExcludedItems(draft.excludedItems);
        }
        if (draft.itineraryDays) {
          setItineraryDays(draft.itineraryDays);
        }
        if (draft.pricingRows) {
          setPricingRows(draft.pricingRows);
        }
        if (draft.departureDate) {
          setDepartureDate(draft.departureDate);
        }
        if (draft.refundPolicy) {
          setRefundPolicy(draft.refundPolicy);
        }
        if (draft.selectedTags) {
          setSelectedTags(draft.selectedTags);
        }
        if (draft.recommendedKeywords) {
          setRecommendedKeywords(draft.recommendedKeywords);
        }
        if (draft.flightInfo) {
          setFlightInfo(draft.flightInfo);
        }
        if (draft.rating !== undefined) {
          setRating(draft.rating);
        }
        if (draft.reviewCount !== undefined) {
          setReviewCount(draft.reviewCount);
        }
        if (draft.hasEscort !== undefined) {
          setHasEscort(draft.hasEscort);
        }
        if (draft.hasLocalGuide !== undefined) {
          setHasLocalGuide(draft.hasLocalGuide);
        }
        if (draft.hasCruisedotStaff !== undefined) {
          setHasCruisedotStaff(draft.hasCruisedotStaff);
        }
        if (draft.hasTravelInsurance !== undefined) {
          setHasTravelInsurance(draft.hasTravelInsurance);
        }
        setTimeout(() => {
          setIsLoadingFromStorage(false);
        }, 1000);
        return true;
      }
      setIsLoadingFromStorage(false);
    } catch (error) {
      console.error('자동저장 복원 실패:', error);
      setIsLoadingFromStorage(false);
    }
    return false;
  }, []);

  // 자동저장 트리거 (debounce) - 안정적인 참조
  const triggerAutoSave = useCallback(() => {
    if (isLoadingFromStorage) return;
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveToLocalStorage();
    }, 1000);
  }, [saveToLocalStorage, isLoadingFromStorage]);

  // 페이지 언로드 시 자동저장 및 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveToLocalStorage();
      // 저장되지 않은 변경사항이 있으면 경고
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [saveToLocalStorage]);

  // 페이지 로드 시 자동저장 복원 (한 번만 실행)
  useEffect(() => {
    const restored = loadFromLocalStorage();
    if (restored) {
      setTimeout(() => {
        showSuccess('이전에 작성하던 내용을 불러왔습니다.');
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 빈 배열로 한 번만 실행

  // 배열/객체 변경 감지를 위한 useMemo
  const selectedCountriesStr = useMemo(() => JSON.stringify(selectedCountries), [selectedCountries]);
  const detailBlocksStr = useMemo(() => JSON.stringify(detailBlocks), [detailBlocks]);
  const includedItemsStr = useMemo(() => JSON.stringify(includedItems), [includedItems]);
  const excludedItemsStr = useMemo(() => JSON.stringify(excludedItems), [excludedItems]);
  const itineraryDaysStr = useMemo(() => JSON.stringify(itineraryDays), [itineraryDays]);
  const pricingRowsStr = useMemo(() => JSON.stringify(pricingRows), [pricingRows]);
  const selectedTagsStr = useMemo(() => JSON.stringify(selectedTags), [selectedTags]);
  const recommendedKeywordsStr = useMemo(() => JSON.stringify(recommendedKeywords), [recommendedKeywords]);
  const flightInfoStr = useMemo(() => JSON.stringify(flightInfo), [flightInfo]);

  // formData 변경 시 자동저장 (로딩 중이 아닐 때만)
  useEffect(() => {
    if (isLoadingFromStorage) return;
    if (formData.productCode) {
      triggerAutoSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.productCode, 
    formData.packageName, 
    formData.cruiseLine, 
    formData.shipName, 
    formData.nights, 
    formData.days, 
    formData.basePrice, 
    formData.description, 
    formData.source, 
    formData.category, 
    formData.isPopular, 
    formData.isRecommended, 
    formData.isPremium,
    formData.isGeniePack,
    formData.isDomestic,
    formData.isJapan,
    formData.isBudget,
    formData.startDate, 
    formData.endDate, 
    selectedCountriesStr, 
    thumbnail, 
    detailBlocksStr, 
    includedItemsStr, 
    excludedItemsStr, 
    itineraryDaysStr, 
    pricingRowsStr, 
    departureDate, 
    refundPolicy, 
    selectedTagsStr, 
    recommendedKeywordsStr,
    rating,
    reviewCount,
    hasEscort,
    hasLocalGuide,
    hasCruisedotStaff,
    hasTravelInsurance,
    isLoadingFromStorage,
  ]);

  // 여행기간 선택에서 출발일이 변경되면 요금표 출발일에 자동 반영
  useEffect(() => {
    if (formData.startDate) {
      // 출발일이 설정되어 있으면 요금표 출발일에 자동 설정
      // 단, 사용자가 이미 departureDate를 수동으로 변경한 경우는 제외
      if (!departureDate || departureDate === formData.startDate) {
        setDepartureDate(formData.startDate);
      }
    }
  }, [formData.startDate, departureDate]);
  useEffect(() => {
    if (!formData.productCode) {
      // 기본값으로 자동 생성
      const prefix = 'MAN'; // 기본값 (나중에 isPopular/isRecommended 변경 시 업데이트)
      const regionCode = 'SG'; // 기본값
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const autoCode = `${prefix}-${regionCode}-${randomNum}`;
      setFormData(prev => ({ ...prev, productCode: autoCode }));
    }
  }, []);

  // 카테고리나 인기/추천 변경 시 상품 코드 업데이트
  useEffect(() => {
    if (formData.productCode) {
      const prefix = formData.isRecommended ? 'REC' : formData.isPopular ? 'POP' : 'MAN';
      const regionCode = formData.category === '동남아' ? 'SEA' : 
                        formData.category === '홍콩' ? 'HK' :
                        formData.category === '일본' ? 'JP' :
                        formData.category === '대만' ? 'TW' :
                        formData.category === '중국' ? 'CN' :
                        formData.category === '알래스카' ? 'AK' :
                        formData.category === '지중해' ? 'MD' : 'SG';
      
      // 기존 코드에서 번호 부분만 추출
      const parts = formData.productCode.split('-');
      const numberPart = parts.length > 2 ? parts[2] : Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const newCode = `${prefix}-${regionCode}-${numberPart}`;
      
      if (newCode !== formData.productCode) {
        setFormData(prev => ({ ...prev, productCode: newCode }));
      }
    }
  }, [formData.category, formData.isPopular, formData.isRecommended]);

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showError('이미지 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnail(reader.result as string);
    };
    reader.readAsDataURL(file);
    setThumbnailFile(file);
  };

  const handleSave = async () => {
    if (!formData.productCode) {
      showError('상품 코드를 입력해주세요.');
      return;
    }

    // 수동 모드에서 상품코드 유효성 검사
    if (isManualProductCode && !productCodeStatus.isValid) {
      if (productCodeStatus.isDuplicate) {
        showError('이미 사용 중인 상품코드입니다. 다른 코드를 입력해주세요.');
        return;
      }
      if (productCodeStatus.validationErrors.length > 0) {
        showError(`상품코드 오류: ${productCodeStatus.validationErrors[0]}`);
        return;
      }
    }

    if (!formData.packageName) {
      showError('제목을 입력해주세요.');
      return;
    }

    // 여행 시작일/종료일 필수 검증 (온보딩 연결 필수)
    if (!formData.startDate || !formData.endDate) {
      showError('여행 시작일과 종료일을 모두 입력해주세요. (온보딩 연결에 필수입니다)');
      return;
    }

    // 기본 가격 유효성 검사
    if (formData.basePrice && parseInt(formData.basePrice) <= 0) {
      showError('기본 가격은 0원보다 커야 합니다.');
      return;
    }

    // 요금표(pricingRows) 가격 유효성 검사
    for (const row of pricingRows) {
      if (!row.roomType) {
        showError('요금표에 객실 타입을 입력해주세요.');
        return;
      }
      // 최소 하나의 가격은 입력되어야 함
      const hasAnyPrice = row.adult || row.adult3rd || row.child2to11 || row.infantUnder2;
      if (!hasAnyPrice) {
        showError(`요금표 "${row.roomType}"에 최소 하나의 가격을 입력해주세요.`);
        return;
      }
      // 입력된 가격은 0보다 커야 함 (0은 무료로 허용, 음수만 차단)
      if ((row.adult !== undefined && row.adult < 0) ||
          (row.adult3rd !== undefined && row.adult3rd < 0) ||
          (row.child2to11 !== undefined && row.child2to11 < 0) ||
          (row.infantUnder2 !== undefined && row.infantUnder2 < 0)) {
        showError(`요금표 "${row.roomType}"에 음수 가격이 있습니다. 가격은 0 이상이어야 합니다.`);
        return;
      }
    }

    try {
      setSaving(true);

      // 썸네일 업로드
      let thumbnailUrl = thumbnail;
      if (thumbnailFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', thumbnailFile);
        formDataUpload.append('type', 'image');

        const uploadRes = await fetch('/api/admin/mall/upload', {
          method: 'POST',
          credentials: 'include',
          body: formDataUpload
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.ok) {
            thumbnailUrl = uploadData.url;
          }
        }
      }

      // 상품 생성
      const payload = {
        productCode: formData.productCode,
        cruiseLine: formData.cruiseLine,
        shipName: formData.shipName,
        packageName: formData.packageName,
        nights: parseInt(formData.nights.toString()),
        days: parseInt(formData.days.toString()),
        basePrice: formData.basePrice ? parseInt(formData.basePrice) : null,
        description: formData.description || null,
        source: formData.source,
        category: formData.category || null,
        isPopular: formData.isPopular,
        isRecommended: formData.isRecommended,
        isPremium: formData.isPremium,
        isGeniePack: formData.isGeniePack,
        isDomestic: formData.isDomestic,
        isJapan: formData.isJapan,
        isBudget: formData.isBudget,
        thumbnail: thumbnailUrl,
        detailBlocks: detailBlocks,
        includedItems: includedItems,
        excludedItems: excludedItems,
        itineraryDays: itineraryDays,
        pricingRows: pricingRows,
        departureDate: departureDate,
        refundPolicy: refundPolicy,
        recommendedKeywords: recommendedKeywords, // 추천 키워드 추가
        flightInfo: flightInfo || null,
        rating: rating || 4.4,
        reviewCount: reviewCount || 0,
        hasEscort: hasEscort || false,
        hasLocalGuide: hasLocalGuide || false,
        hasCruisedotStaff: hasCruisedotStaff || false,
        hasTravelInsurance: hasTravelInsurance || false,
        contactOptions: contactOptions, // 8번: 문의 옵션 저장
      };

      // 상품 생성 API 호출
      const createRes = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productCode: payload.productCode,
          cruiseLine: payload.cruiseLine,
          shipName: payload.shipName,
          packageName: payload.packageName,
          nights: payload.nights,
          days: payload.days,
          basePrice: payload.basePrice,
          description: payload.description,
          source: payload.source,
          category: payload.category,
          tags: selectedTags,
          recommendedKeywords: recommendedKeywords, // 추천 키워드 추가
          isPopular: payload.isPopular,
          isRecommended: payload.isRecommended,
          isPremium: payload.isPremium,
          isGeniePack: payload.isGeniePack,
          isDomestic: payload.isDomestic,
          isJapan: payload.isJapan,
          isBudget: payload.isBudget,
          saleStatus: '판매중', // 수동 등록 상품은 항상 판매중으로 설정
          itineraryPattern: [],
          startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
          destination: selectedCountries.map(c => c.value), // 방문 국가 배열
          contactOptions: contactOptions, // 8번: 문의 옵션 추가
        })
      });

      if (!createRes.ok) {
        throw new Error('상품 생성에 실패했습니다.');
      }

      // MallProductContent 생성
      const contentRes = await fetch(`/api/admin/products/${payload.productCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!contentRes.ok) {
        throw new Error('상품 상세 정보 저장에 실패했습니다.');
      }

      const data = await contentRes.json();
      if (data.ok) {
        // AffiliateProduct 자동 생성 (메인몰에 표시되도록)
        const productData = await createRes.json();
        if (productData.ok && productData.product) {
          try {
            const productCode = productData.product.productCode;
            const cruiseProductId = productData.product.id;
            const now = new Date();
            const effectiveFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7일 전부터 유효
            const effectiveTo = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1년 후까지 유효

            const affiliatePayload = {
              productCode: productCode,
              title: payload.packageName,
              status: 'active',
              currency: 'KRW',
              cruiseProductId: cruiseProductId,
              defaultSaleAmount: payload.basePrice || null,
              defaultCostAmount: payload.basePrice ? Math.floor(payload.basePrice * 0.7) : null, // 70%를 원가로 설정
              defaultNetRevenue: payload.basePrice ? Math.floor(payload.basePrice * 0.3) : null, // 30%를 순수익으로 설정
              effectiveFrom: effectiveFrom.toISOString().split('T')[0],
              effectiveTo: effectiveTo.toISOString().split('T')[0],
              isPublished: true,
            };

            const affiliateResponse = await fetch('/api/admin/affiliate/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(affiliatePayload),
            });

            if (affiliateResponse.ok) {
              logger.log('[New Product] AffiliateProduct 자동 생성 완료');
            } else {
              console.error('[New Product] AffiliateProduct 자동 생성 실패:', await affiliateResponse.text());
            }
          } catch (affiliateError) {
            console.error('[New Product] AffiliateProduct 처리 중 오류:', affiliateError);
            // AffiliateProduct 생성 실패해도 CruiseProduct는 이미 생성되었으므로 계속 진행
          }
        }

        // 저장 성공 시 자동저장 데이터 업데이트 (최신 상태로 동기화)
        // 저장 후에도 계속 편집할 수 있으므로 자동저장 데이터 유지
        setTimeout(() => {
          saveToLocalStorage();
        }, 500);
        showSuccess('상품이 등록되었습니다.');
        
        // 저장 성공 후 자동으로 미리보기 열기
        if (formData.productCode) {
          setTimeout(() => {
            setPreviewProductCode(formData.productCode);
          }, 800); // 성공 메시지가 표시된 후 미리보기 열기
        }
        
        // 저장 후 현재 페이지에 머물기 (리다이렉트 제거)
      } else {
        throw new Error(data.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      showError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 미리보기용 product 객체 생성
  const previewProduct = useMemo(() => {
    if (!formData.productCode) return null;
    return {
      id: 0,
      productCode: formData.productCode,
      cruiseLine: formData.cruiseLine,
      shipName: formData.shipName,
      packageName: formData.packageName || '제목을 입력하세요',
      nights: formData.nights,
      days: formData.days,
      basePrice: formData.basePrice ? parseInt(formData.basePrice.replace(/[^0-9]/g, '')) : null,
      description: formData.description,
      source: formData.source,
      itineraryPattern: null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      tags: selectedTags,
      isPopular: formData.isPopular,
      isRecommended: formData.isRecommended,
      isPremium: formData.isPremium,
      isGeniePack: formData.isGeniePack,
      isDomestic: formData.isDomestic,
      isJapan: formData.isJapan,
      isBudget: formData.isBudget,
      mallProductContent: {
        thumbnail: thumbnail,
        images: detailBlocks.filter((b): b is Extract<ContentBlock, { type: 'image' }> => b.type === 'image').map(b => b.url),
        videos: detailBlocks.filter((b): b is Extract<ContentBlock, { type: 'video' }> => b.type === 'video').map(b => b.url),
        layout: {
          blocks: detailBlocks,
          included: includedItems,
          excluded: excludedItems,
          itinerary: itineraryDays,
          pricing: pricingRows,
          refundPolicy: refundPolicy,
          flightInfo: flightInfo,
          rating: rating,
          reviewCount: reviewCount,
          recommendedKeywords: recommendedKeywords,
          destination: selectedCountries.map(c => c.value),
          hasEscort: hasEscort,
          hasLocalGuide: hasLocalGuide,
          hasCruisedotStaff: hasCruisedotStaff,
          hasTravelInsurance: hasTravelInsurance,
          contactOptions: contactOptions, // 8번: 문의 옵션
        },
      },
    } as any;
  }, [formData, thumbnail, detailBlocks, includedItems, excludedItems, itineraryDays, pricingRows, refundPolicy, flightInfo, rating, reviewCount, recommendedKeywords, selectedCountries, selectedTags, hasEscort, hasLocalGuide, hasCruisedotStaff, hasTravelInsurance, contactOptions]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          {/* 왼쪽: 스마트폰 미리보기 */}
          <div className="hidden lg:block">
            {previewProduct && <MobilePreview product={previewProduct} />}
          </div>
          
          {/* 오른쪽: 편집 폼 */}
          <div className="max-w-6xl">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/products')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  새 상품 등록: {formData.productCode || '(상품 코드 자동 생성)'}
                </h1>
                <p className="text-gray-600 mt-1">{formData.packageName || '제목을 입력하세요'}</p>
                {autoSaveStatus === 'saving' && (
                  <p className="text-xs text-blue-600 mt-1">💾 자동저장 중...</p>
                )}
                {autoSaveStatus === 'saved' && (
                  <p className="text-xs text-green-600 mt-1">✅ 자동저장 완료</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (formData.productCode) {
                    setPreviewProductCode(formData.productCode);
                  } else {
                    showError('상품 코드가 없어서 미리보기를 할 수 없습니다. 먼저 상품 코드를 입력해주세요.');
                  }
                }}
                disabled={!formData.productCode}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiEye size={20} />
                미리보기
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSave size={20} />
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>

        {/* 기본 정보 섹션 - 상품 편집 페이지와 동일 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">1. 기본 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 상품 코드 (자동/수동 모드 선택 가능) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  상품 코드 *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualProductCode(!isManualProductCode);
                    if (!isManualProductCode) {
                      // 수동 모드로 전환 시 기존 코드 유지
                      setProductCodeStatus({
                        checking: false,
                        isDuplicate: null,
                        validationErrors: [],
                        isValid: null
                      });
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {isManualProductCode ? '자동 생성으로 전환' : '수동 입력으로 전환'}
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly={!isManualProductCode}
                  value={formData.productCode || ''}
                  onChange={(e) => {
                    if (isManualProductCode) {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                      setFormData(prev => ({ ...prev, productCode: value }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg pr-10 ${
                    isManualProductCode
                      ? productCodeStatus.isValid === true
                        ? 'border-green-500 bg-green-50'
                        : productCodeStatus.isValid === false
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                      : 'border-gray-300 bg-gray-50 cursor-not-allowed'
                  }`}
                  placeholder={isManualProductCode ? '예: CRUISE_2025_001' : '자동 생성 중...'}
                />
                {/* 상태 아이콘 */}
                {isManualProductCode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {productCodeStatus.checking ? (
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    ) : productCodeStatus.isValid === true ? (
                      <span className="text-green-600 text-lg">✓</span>
                    ) : productCodeStatus.isValid === false ? (
                      <span className="text-red-600 text-lg">✗</span>
                    ) : null}
                  </div>
                )}
              </div>
              {/* 유효성 검사 피드백 */}
              {isManualProductCode ? (
                <div className="mt-1">
                  {productCodeStatus.isDuplicate && (
                    <p className="text-xs text-red-600">
                      ⚠️ 이미 사용 중인 상품코드입니다.
                    </p>
                  )}
                  {productCodeStatus.validationErrors.map((error, i) => (
                    <p key={i} className="text-xs text-red-600">
                      ⚠️ {error}
                    </p>
                  ))}
                  {productCodeStatus.isValid && (
                    <p className="text-xs text-green-600">
                      ✓ 사용 가능한 상품코드입니다.
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    영문 대문자, 숫자, 언더스코어(_), 하이픈(-)만 사용 가능
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  상품 코드는 자동으로 생성됩니다. 카테고리나 인기/추천 설정에 따라 자동으로 업데이트됩니다.
                </p>
              )}
            </div>

            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 (패키지명) *
              </label>
              <input
                type="text"
                required
                value={formData.packageName || ''}
                onChange={(e) => setFormData({ ...formData, packageName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="예: 싱가포르 3박 4일 크루즈 - 말레이시아, 인도네시아"
              />
            </div>

            {/* 로고 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                로고 선택 *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer p-3 border-2 rounded-lg hover:border-blue-500 transition-colors flex-1">
                  <input
                    type="radio"
                    name="source"
                    value="wcruise"
                    checked={formData.source === 'wcruise'}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <img 
                    src="/images/wcruise-logo.png" 
                    alt="Wcruise" 
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700">Wcruise</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 border-2 rounded-lg hover:border-blue-500 transition-colors flex-1">
                  <input
                    type="radio"
                    name="source"
                    value="cruisedot"
                    checked={formData.source === 'cruisedot'}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <img 
                    src="/images/ai-cruise-logo.png" 
                    alt="Cruisedot" 
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700">Cruisedot</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 border-2 rounded-lg hover:border-blue-500 transition-colors flex-1">
                  <input
                    type="radio"
                    name="source"
                    value="lottejtb"
                    checked={formData.source === 'lottejtb'}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <img 
                    src="/images/롯데제이티비.png" 
                    alt="롯데 제이티비" 
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700">롯데 제이티비</span>
                </label>
              </div>
            </div>

            {/* 상품 설명 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상품 설명
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder="상품에 대한 상세 설명을 입력하세요"
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리
              </label>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택 안함</option>
                <option value="주말크루즈">주말크루즈</option>
                <option value="동남아">동남아</option>
                <option value="홍콩">홍콩</option>
                <option value="일본">일본</option>
                <option value="대만">대만</option>
                <option value="중국">중국</option>
                <option value="알래스카">알래스카</option>
                <option value="지중해">지중해</option>
              </select>
            </div>

            {/* 추천 키워드 설정 - 마케팅 태그 (후킹 태그 선택 위) */}
            <div className="md:col-span-2 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                추천 키워드 (마케팅 태그) <span className="text-gray-500 text-xs">(최대 5개 선택)</span>
              </label>
              <p className="text-xs text-purple-700 mb-3 font-semibold">
                💡 선택한 키워드는 크루즈몰 검색에서 연관 검색어로 표시됩니다. 실제 검색량이 많은 키워드를 선택하세요.
              </p>
              
              {/* 선택된 키워드 표시 */}
              {recommendedKeywords.length > 0 && (
                <div className="mb-3 p-3 bg-white rounded-lg border-2 border-purple-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">선택된 키워드 ({recommendedKeywords.length}/5):</p>
                  <div className="flex flex-wrap gap-2">
                    {recommendedKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => {
                            setRecommendedKeywords(recommendedKeywords.filter((_, i) => i !== index));
                          }}
                          className="ml-2 text-purple-600 hover:text-purple-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 드롭다운 선택 */}
              {recommendedKeywords.length < 5 && (
                <div className="relative" ref={keywordDropdownRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={keywordSearchTerm}
                      onChange={(e) => {
                        setKeywordSearchTerm(e.target.value);
                        setKeywordDropdownOpen(true);
                      }}
                      onFocus={() => setKeywordDropdownOpen(true)}
                      placeholder="키워드 검색 (최대 5개 선택 가능)"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm pr-10"
                    />
                    {keywordSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setKeywordSearchTerm('');
                          setKeywordDropdownOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <FiX size={18} />
                      </button>
                    )}
                  </div>
                  {keywordDropdownOpen && filteredKeywords.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                      {filteredKeywords
                        .filter(keyword => !recommendedKeywords.includes(keyword))
                        .map((keyword) => (
                          <div
                            key={keyword}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              if (recommendedKeywords.length < 5) {
                                setRecommendedKeywords([...recommendedKeywords, keyword]);
                                setKeywordSearchTerm('');
                                setKeywordDropdownOpen(false);
                              }
                            }}
                            className="px-4 py-3 cursor-pointer hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 font-medium text-sm"
                          >
                            {keyword}
                          </div>
                        ))}
                    </div>
                  )}
                  {keywordDropdownOpen && filteredKeywords.filter(keyword => !recommendedKeywords.includes(keyword)).length === 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4 text-center text-gray-500 text-sm">
                      {keywordSearchTerm ? '검색 결과가 없습니다.' : '모든 키워드가 선택되었습니다.'}
                    </div>
                  )}
                </div>
              )}
              {recommendedKeywords.length >= 5 && (
                <div className="p-3 bg-yellow-100 border-2 border-yellow-300 rounded-lg text-xs text-yellow-800 font-semibold">
                  최대 5개까지 선택 가능합니다. 키워드를 삭제하려면 위의 선택된 키워드에서 × 버튼을 클릭하세요.
                </div>
              )}
            </div>

            {/* 후킹 태그 선택 */}
            <div className="md:col-span-2">
              <ProductTagsSelector
                selectedTags={selectedTags}
                onChange={setSelectedTags}
                maxTags={3}
              />
            </div>

            {/* 별점 및 리뷰 개수 설정 */}
            <div className="md:col-span-2 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                별점 및 리뷰 설정
              </label>
              <p className="text-xs text-yellow-700 mb-3 font-semibold">
                💡 설정한 별점과 리뷰 개수에 맞게 AI가 자동으로 리뷰를 생성합니다.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">평균 별점</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={rating || 0}
                    onChange={(e) => setRating(parseFloat(e.target.value) || 4.4)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">0.0 ~ 5.0 사이의 값</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">리뷰 개수</label>
                  <input
                    type="number"
                    min="0"
                    value={reviewCount || 0}
                    onChange={(e) => setReviewCount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">생성할 리뷰 개수</p>
                </div>
              </div>
              {reviewCount > 0 && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-gray-700">미리보기:</span>
                    <div className="flex items-center gap-1">
                      <FiStar className="text-yellow-400 fill-yellow-400" size={16} />
                      <span className="font-bold text-gray-900">{rating.toFixed(1)}</span>
                    </div>
                    <span className="text-gray-600">이용자 리뷰 {reviewCount.toLocaleString('ko-KR')}개</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  // 리뷰 모달 열기
                  const modal = document.createElement('div');
                  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4';
                  const currentRating = rating || 4.4;
                  const currentReviewCount = reviewCount || 0;
                  modal.innerHTML = `
                    <div class="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                      <div class="sticky top-0 bg-white border-b-2 border-gray-300 px-6 py-4 flex items-center justify-between z-10 shadow-sm">
                        <div class="flex items-center gap-3">
                          <svg class="w-6 h-6 text-amber-500 fill-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                          <h3 class="text-2xl font-bold text-gray-900">리뷰 ${currentReviewCount > 0 ? currentReviewCount.toLocaleString('ko-KR') + '개' : '미리보기'}</h3>
                          <div class="flex items-center gap-1">
                            <span class="text-xl font-bold text-gray-900">${currentRating.toFixed(1)}</span>
                          </div>
                        </div>
                        <button onclick="this.closest('.fixed').remove()" class="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md">
                          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                      <div class="p-6">
                        ${currentReviewCount > 0 ? Array.from({ length: Math.min(currentReviewCount, 5) }).map((_, index) => {
                          const sampleRating = Math.max(1, Math.min(5, Math.round(currentRating) + (index % 2 === 0 ? 1 : -1)));
                          const sampleNames = ['김**', '이**', '박**', '최**', '정**'];
                          const sampleComments = [
                            '크루즈 여행이 정말 만족스러웠습니다. 객실도 깨끗하고 식사도 훌륭했어요!',
                            '일정이 알차게 구성되어 있어서 좋았습니다. 다음에도 또 이용하고 싶어요.',
                            '가이드 분이 친절하시고 설명도 자세해서 여행이 더욱 즐거웠습니다.',
                            '가격 대비 만족도가 높았습니다. 추천합니다!',
                            '크루즈 시설이 깨끗하고 편안해서 좋았습니다.',
                          ];
                          return `
                            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
                              <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                  <span class="font-semibold text-gray-800">${sampleNames[index % sampleNames.length]}</span>
                                  <div class="flex items-center gap-1">
                                    ${Array.from({ length: 5 }).map((_, starIndex) => `
                                      <svg class="w-4 h-4 ${starIndex < sampleRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                      </svg>
                                    `).join('')}
                                  </div>
                                </div>
                                <span class="text-sm text-gray-500">${new Date(Date.now() - (index + 1) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')}</span>
                              </div>
                              <p class="text-gray-700 text-sm leading-relaxed">${sampleComments[index % sampleComments.length]}</p>
                            </div>
                          `;
                        }).join('') + (currentReviewCount > 5 ? `<div class="text-center py-4 text-gray-500">외 ${currentReviewCount - 5}개의 리뷰가 더 있습니다.</div>` : '') : `
                          <div class="text-center py-12">
                            <svg class="w-12 h-12 text-amber-500 fill-amber-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                            <p class="text-lg text-gray-600 mb-2">아직 리뷰가 없습니다.</p>
                            <p class="text-sm text-gray-500">평균 별점: ${currentRating.toFixed(1)}점</p>
                          </div>
                        `}
                      </div>
                    </div>
                  `;
                  modal.onclick = (e) => {
                    if (e.target === modal) modal.remove();
                  };
                  document.body.appendChild(modal);
                }}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm transition-colors flex items-center gap-2"
              >
                <FiEye size={16} />
                미리보기
              </button>
            </div>

            {/* 썸네일 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                썸네일 사진
              </label>
              <div className="flex items-start gap-4">
                {thumbnail && (
                  <div className="relative">
                    <img
                      src={thumbnail}
                      alt="썸네일"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <span className="text-sm font-medium text-gray-700">
                      {thumbnail ? '썸네일 변경' : '썸네일 업로드'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    권장 크기: 800x600px, 최대 10MB
                  </p>
                </div>
              </div>
            </div>

            {/* 방문 국가 설정 */}
            <div className="md:col-span-2 p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 rounded-lg">
              <CountrySelector
                selectedCountries={selectedCountries}
                onChange={setSelectedCountries}
                maxCount={10}
                label="방문 국가 설정"
              />
            </div>

            {/* 출발 날짜 및 종료 날짜 선택 (지도 캘린더) - 여행기간 박수/일수 위에 배치 */}
            <div className="md:col-span-2 p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 rounded-lg">
              <div className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🗓️</span>
                <span>출발 날짜 및 종료 날짜 선택 (지도 캘린더)</span>
                <span className="text-red-600">* 필수</span>
              </div>
              <DateRangePicker
                startDate={formData.startDate || ''}
                endDate={formData.endDate || ''}
                onStartDateChange={(date) => {
                  setFormData(prev => {
                    let newEndDate = prev.endDate;
                    // 종료일 자동 계산 (시작일 + 일수 - 1)
                    if (date && prev.days > 0) {
                      const start = new Date(date);
                      const end = new Date(start);
                      end.setDate(end.getDate() + prev.days - 1);
                      newEndDate = end.toISOString().split('T')[0];
                    }
                    return { ...prev, startDate: date, endDate: newEndDate };
                  });
                }}
                onEndDateChange={(date) => {
                  setFormData(prev => {
                    // 일수 자동 계산
                    let newDays = prev.days;
                    let newNights = prev.nights;
                    if (prev.startDate && date) {
                      const start = new Date(prev.startDate);
                      const end = new Date(date);
                      const diffTime = end.getTime() - start.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                      newDays = diffDays;
                      newNights = diffDays - 1;
                    }
                    return { ...prev, endDate: date, days: newDays, nights: newNights };
                  });
                }}
                onDaysChange={(days) => {
                  setFormData(prev => ({
                    ...prev,
                    days,
                    nights: days > 0 ? days - 1 : 0,
                  }));
                }}
              />
              <p className="text-xs text-blue-700 mt-3 font-semibold">
                💡 캘린더에서 출발 날짜와 종료 날짜를 선택하면 여행 기간이 자동으로 계산됩니다. 온보딩 및 상품몰에 정확하게 반영됩니다.
              </p>
            </div>

            {/* 여행기간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                여행기간 (박수) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.nights || 0}
                onChange={(e) => {
                  const nights = parseInt(e.target.value) || 0;
                  setFormData(prev => {
                    const days = nights + 1;
                    let newEndDate = prev.endDate;
                    // 종료일 자동 계산 (시작일 + 일수 - 1)
                    if (prev.startDate && days > 0) {
                      const start = new Date(prev.startDate);
                      const end = new Date(start);
                      end.setDate(end.getDate() + days - 1);
                      newEndDate = end.toISOString().split('T')[0];
                    }
                    return { ...prev, nights, days, endDate: newEndDate };
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                여행기간 (일수) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.days || 0}
                onChange={(e) => {
                  const days = parseInt(e.target.value) || 0;
                  setFormData(prev => {
                    const nights = days > 0 ? days - 1 : 0;
                    let newEndDate = prev.endDate;
                    // 종료일 자동 계산 (시작일 + 일수 - 1)
                    if (prev.startDate && days > 0) {
                      const start = new Date(prev.startDate);
                      const end = new Date(start);
                      end.setDate(end.getDate() + days - 1);
                      newEndDate = end.toISOString().split('T')[0];
                    }
                    return { ...prev, days, nights, endDate: newEndDate };
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 크루즈 라인 */}
            <div>
              <AutocompleteInput
                value={formData.cruiseLine}
                onChange={(value) => setFormData({ ...formData, cruiseLine: value })}
                options={cruiseLineAutocompleteOptions}
                placeholder="예: MSC 크루즈, Royal Caribbean, 로얄"
                label="크루즈 라인"
                required
              />
            </div>

            {/* 선박명 */}
            <div>
              <AutocompleteInput
                value={formData.shipName}
                onChange={(value) => setFormData({ ...formData, shipName: value })}
                options={shipNameAutocompleteOptions}
                placeholder="예: MSC 벨리시마, 스펙트럼 오브 더 시즈, 보이저"
                label="선박명"
                required
              />
            </div>

            {/* 시작가 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작가 (원)
              </label>
              <input
                type="number"
                value={formData.basePrice || ''}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="예: 1500000"
              />
            </div>

            {/* 상품 분류 설정 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상품 분류
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">인기 크루즈</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecommended}
                    onChange={(e) => setFormData({ ...formData, isRecommended: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">추천 크루즈</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPremium}
                    onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">프리미엄 크루즈</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isGeniePack}
                    onChange={(e) => setFormData({ ...formData, isGeniePack: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">지니패키지 크루즈</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDomestic}
                    onChange={(e) => setFormData({ ...formData, isDomestic: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">국내출발 크루즈</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isJapan}
                    onChange={(e) => setFormData({ ...formData, isJapan: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">일본 크루즈</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isBudget}
                    onChange={(e) => setFormData({ ...formData, isBudget: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">알뜰 크루즈</span>
                </label>
              </div>
            </div>

            {/* 상품 정보 미리보기 */}
            <div className="md:col-span-2 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">상품 정보 미리보기</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span className="font-medium">
                    {formData.startDate && formData.endDate
                      ? `${new Date(formData.startDate).toLocaleDateString('ko-KR')} ~ ${new Date(formData.endDate).toLocaleDateString('ko-KR')} (${formData.nights}박 ${formData.days}일)`
                      : `${formData.nights}박 ${formData.days}일`}
                  </span>
                </div>
                {formData.basePrice && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>💰</span>
                    <span className="font-medium">{parseInt(formData.basePrice || '0').toLocaleString()}원</span>
                    <span className="text-red-600 font-bold text-lg">
                      / 월 {Math.ceil(parseInt(formData.basePrice || '0') / 12).toLocaleString()}원
                    </span>
                  </div>
                )}
                {itineraryDays.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span>🗺️</span>
                    <span className="font-medium">{itineraryDays.length}개 일정</span>
                  </div>
                )}
                {formData.category && (
                  <div className="flex items-center gap-2">
                    <span>🏷️</span>
                    <span className="font-medium">{formData.category}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 나머지 섹션들은 상품 편집 페이지와 동일 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">2. 상세페이지 구성</h2>
          <p className="text-sm text-gray-600 mb-4">
            이미지, 동영상, 텍스트 블록을 자유롭게 추가하여 상세페이지를 구성하세요.
          </p>
          <ProductDetailEditor blocks={detailBlocks} onChange={setDetailBlocks} productCode={formData.productCode} />
        </div>

        {/* 항공 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">3. 항공 정보</h2>
          <p className="text-sm text-gray-600 mb-4">
            출국 및 귀국 항공편 정보를 입력하세요.
          </p>
          <FlightInfoEditor
            flightInfo={flightInfo}
            onChange={setFlightInfo}
            startDate={formData.startDate}
            endDate={formData.endDate}
            nights={formData.nights}
            days={formData.days}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">4. 포함 사항과 불포함 사항</h2>
          
          {/* 서비스 옵션 체크박스 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-4">서비스 옵션</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 인솔자 */}
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasEscort}
                  onChange={(e) => setHasEscort(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">인솔자 있음</span>
              </label>

              {/* 현지가이드 */}
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasLocalGuide}
                  onChange={(e) => setHasLocalGuide(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">현지가이드 있음</span>
              </label>

              {/* 크루즈닷 전용 스탭 */}
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCruisedotStaff}
                  onChange={(e) => setHasCruisedotStaff(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <img 
                    src="/images/ai-cruise-logo.png" 
                    alt="Cruisedot" 
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700">크루즈닷 전용 스탭 있음</span>
                </div>
              </label>

              {/* 여행자보험 */}
              <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTravelInsurance}
                  onChange={(e) => setHasTravelInsurance(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">여행자보험 있음</span>
              </label>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            상품에 포함된 사항과 불포함 사항을 입력하세요.
          </p>
          <IncludedExcludedEditor
            included={includedItems}
            excluded={excludedItems}
            onChange={(included, excluded) => {
              setIncludedItems(included);
              setExcludedItems(excluded);
            }}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">5. 여행일정</h2>
          <p className="text-sm text-gray-600 mb-4">
            Day별로 일정을 구성하고, 이미지/동영상/텍스트 블록을 추가하세요. 그룹으로 저장하여 재사용할 수 있습니다.
          </p>
          <EnhancedItineraryEditor
            days={itineraryDays}
            onChange={setItineraryDays}
            nights={formData.nights}
            totalDays={formData.days}
            flightInfo={flightInfo}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">6. 요금표</h2>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                출발일 (연령 범위 자동 계산용)
              </label>
              {formData.startDate && formData.startDate !== departureDate && (
                <button
                  type="button"
                  onClick={() => setDepartureDate(formData.startDate)}
                  className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1"
                >
                  <span>📅</span>
                  <span>여행기간에서 가져오기 ({formData.startDate})</span>
                </button>
              )}
            </div>
            <input
              type="date"
              value={departureDate || ''}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              출발일을 설정하면 만2-11세, 만2세미만의 생년월일 범위가 자동으로 계산됩니다.
              {formData.startDate && (
                <span className="text-blue-600 font-semibold ml-2">
                  💡 여행기간 출발일: {formData.startDate}
                </span>
              )}
            </p>
          </div>
          <PricingTableEditor
            rows={pricingRows}
            onChange={setPricingRows}
            departureDate={departureDate || undefined}
            nights={formData.nights || 0}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">7. 환불/취소 규정</h2>
          <p className="text-sm text-gray-600 mb-4">
            환불 및 취소 규정을 입력하세요. 그룹으로 저장하여 재사용할 수 있습니다.
          </p>
          <RefundPolicyEditor
            content={refundPolicy}
            onChange={setRefundPolicy}
          />
        </div>

        {/* 8. 문의 옵션 */}
        <div id="section-8-contact-options" className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">8. 문의 옵션</h2>
          <p className="text-sm text-gray-600 mb-4">
            상품 상세 페이지에 표시될 문의 옵션을 선택하세요. 각 옵션을 개별적으로 활성화/비활성화할 수 있습니다.
          </p>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={contactOptions.payment}
                onChange={(e) => setContactOptions({ ...contactOptions, payment: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-800">💳 결제하기</div>
                <div className="text-sm text-gray-600">고객이 직접 결제할 수 있는 버튼을 표시합니다.</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={contactOptions.phoneCall}
                onChange={(e) => setContactOptions({ ...contactOptions, phoneCall: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-800">📞 전화상담</div>
                <div className="text-sm text-gray-600">고객이 전화로 직접 상담을 받을 수 있습니다.</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={contactOptions.aiChatbot}
                onChange={(e) => setContactOptions({ ...contactOptions, aiChatbot: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-800 flex items-center gap-2">
                  <img 
                    src="/images/ai-cruise-logo.png" 
                    alt="AI 지니" 
                    className="w-5 h-5 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  AI 지니 채팅봇
                </div>
                <div className="text-sm text-gray-600">AI 지니 채팅봇을 통해 실시간으로 상담을 받을 수 있습니다.</div>
              </div>
            </label>
          </div>
        </div>
        
        {/* 저장하기 버튼 - 8번 섹션 끝에 표시 */}
        <div className="mt-6 pt-6 border-t-2 border-gray-300">
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold text-base transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave size={20} />
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* 상품 미리보기 모달 */}
      <ProductPreviewModal
        isOpen={previewProductCode !== null}
        onClose={() => setPreviewProductCode(null)}
        productCode={previewProductCode || ''}
        product={previewProduct}
      />
    </div>
  );
}
