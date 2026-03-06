export interface TravelContractData {
  // 예약 정보
  reservationId: number;

  // 상품 정보
  productName: string;
  shipName: string;
  airlineName?: string | null;
  isPackage: boolean;    // tourType === 'PACKAGE' 이면 true
  hasHotel: boolean;     // tags에 '호텔' 포함 시 true
  hasInsurance: boolean; // MallProductContent.layout.hasTravelInsurance
  hasEscort?: boolean;         // 인솔자 동반 여부 (layout.hasEscort)
  hasLocalGuide?: boolean;     // 현지 가이드 여부 (layout.hasLocalGuide)
  hasCruisedotStaff?: boolean; // 크루즈닷 전용 스탭 (layout.hasCruisedotStaff)

  // 여행보증 종류 (기본: insurance)
  guaranteeType?: 'insurance' | 'mutual-aid' | 'deposit';

  // 여행자보험 상세 (선택)
  insuranceCompany?: string | null;  // e.g. '현대해상'
  insuranceCoverage?: string | null; // e.g. '사망·후유장해 1억원'

  // 행사 인원 (선택)
  minGroupSize?: number; // 최저 출발 인원
  maxGroupSize?: number; // 최대 행사 인원

  // 여행 기간
  departureDate: string; // 'YYYY.MM.DD'
  returnDate: string;
  nights: number;
  days: number;

  // 출발/도착
  departure: string; // e.g. '인천국제공항' or '부산항'
  arrival: string;

  // 여행자 정보
  totalPeople: number;
  mainTravelerName: string;
  mainTravelerPhone: string;

  // 결제 정보
  pricePerPerson: number;
  totalAmount: number;

  // 어필리에이트 담당자
  affiliateName: string;
  affiliatePhone?: string | null;

  // 고객 이메일 (서명 완료 시 PDF 다운로드 링크 발송용)
  customerEmail?: string | null;

  // 취소료 규정 (상품별, 없으면 표준 크루즈 규정)
  cancellationPolicy: Array<{
    period: string;
    charge: string;
  }>;

  // 불포함 내역
  excludedItems: string[];

  // 현지교통 종류 (기본: isPackage ? 'bus' : 'none')
  localTransportType?: 'bus' | 'car' | 'other' | 'none';

  // 식사 횟수 (선택 — 없으면 "일정표 참조" 표시)
  mealCounts?: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };

  // 기타사항 (자유입력)
  otherNotes?: string | null;
  mainTravelerBirthdate?: string | null;
  departurePort?: string | null;
  insurancePolicyNumber?: string | null;

  // 여행자보험 상세 (법적 필수 기재)
  insurancePeriod?: string | null;   // e.g. '여행기간' 또는 '2024.12.24~2024.12.29'
  insuredPerson?: string | null;     // e.g. '여행자 본인' 또는 피보험자명

  // 숙박 정보
  accommodationType?: 'schedule' | 'tourist-hotel' | 'regular-hotel' | 'other' | null;
  hotelGrade?: string | null;        // 관광호텔 등급 (e.g. '3성급')
  roomOccupancy?: number | null;     // 1실 투숙인원

  // 식사
  inflightMealIncluded?: boolean;    // 기내식 포함 여부 (항공 포함 패키지)

  // 마케팅 동의
  marketingConsent?: boolean;        // 마케팅 활용 동의 여부 (선택)

  // 항공 좌석 등급
  airlineSeatClass?: string | null;  // e.g. '이코노미', '비즈니스'
}

export type ContractStatus = 'pending' | 'signed' | 'expired' | 'cancelled';

export interface ContractSignInput {
  customerAddress: string;
  customerSignature: string;    // base64 PNG
  contractorSignature?: string; // base64 PNG
  companions: Array<{ name: string; phone: string }>;
}

// WO-CR-08: Zod 검증 스키마 (sign/route.ts, pdf/route.ts에서 contractData 파싱 시 사용)
import { z } from 'zod';

export const TravelContractDataSchema = z.object({
  reservationId: z.number(),
  productName: z.string().min(1).max(200),
  shipName: z.string().min(1).max(100),
  mainTravelerName: z.string().min(1).max(100),
  mainTravelerPhone: z.string().min(1).max(30),
  totalPeople: z.number().min(1),
  pricePerPerson: z.number().min(0),
  totalAmount: z.number().min(0),
  departureDate: z.string(),
  returnDate: z.string(),
  nights: z.number().min(0),
  days: z.number().min(1),
  departure: z.string().max(100),
  arrival: z.string().max(100),
  affiliateName: z.string().min(1, '담당자명을 입력해주세요').max(100),
  isPackage: z.boolean(),
  hasHotel: z.boolean(),
  hasInsurance: z.boolean(),
  hasEscort: z.boolean().optional().default(false),
  hasLocalGuide: z.boolean().optional().default(false),
  hasCruisedotStaff: z.boolean().optional().default(false),
  cancellationPolicy: z.array(z.object({ period: z.string().max(200), charge: z.string().max(200) })).min(1, '취소료 규정은 최소 1개 이상 필수입니다'),
  excludedItems: z.array(z.string().max(200)).default([]),
  airlineName: z.string().nullable().optional(),
  guaranteeType: z.enum(['insurance', 'mutual-aid', 'deposit']).optional(),
  insuranceCompany: z.string().max(200).nullable().optional(),
  insuranceCoverage: z.string().nullable().optional(),
  minGroupSize: z.number().optional(),
  maxGroupSize: z.number().optional(),
  affiliatePhone: z.string().max(30).nullable().optional(),
  customerEmail: z.string().max(200).nullable().optional(),
  localTransportType: z.enum(['bus', 'car', 'other', 'none']).optional(),
  mealCounts: z.object({
    breakfast: z.number().int().min(0).max(999),
    lunch: z.number().int().min(0).max(999),
    dinner: z.number().int().min(0).max(999),
  }).optional(),
  otherNotes: z.string().max(2000).nullable().optional(),
  mainTravelerBirthdate: z.string().max(20).nullable().optional(),
  departurePort: z.string().max(100).nullable().optional(),
  insurancePolicyNumber: z.string().max(100).nullable().optional(),
  insurancePeriod: z.string().max(100).nullable().optional(),
  insuredPerson: z.string().max(100).nullable().optional(),
  accommodationType: z.enum(['schedule', 'tourist-hotel', 'regular-hotel', 'other']).nullable().optional(),
  hotelGrade: z.string().max(50).nullable().optional(),
  roomOccupancy: z.number().int().min(1).max(20).nullable().optional(),
  inflightMealIncluded: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
  airlineSeatClass: z.string().max(50).nullable().optional(),
});
