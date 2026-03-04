export interface TravelContractData {
  // 예약 정보
  reservationId: number;

  // 상품 정보
  productName: string;
  shipName: string;
  airlineName?: string | null;
  isPackage: boolean;    // airlineName 있으면 true
  hasHotel: boolean;     // tags에 '호텔' 포함 시 true
  hasInsurance: boolean; // tags에 '보험' 포함 시 true

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

  // 기타사항 (자유입력)
  otherNotes?: string | null;
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
  productName: z.string().min(1),
  shipName: z.string().min(1),
  mainTravelerName: z.string().min(1),
  mainTravelerPhone: z.string().min(1),
  totalPeople: z.number().min(1),
  pricePerPerson: z.number().min(0),
  totalAmount: z.number().min(0),
  departureDate: z.string(),
  returnDate: z.string(),
  nights: z.number().min(0),
  days: z.number().min(1),
  departure: z.string(),
  arrival: z.string(),
  affiliateName: z.string(),
  isPackage: z.boolean(),
  hasHotel: z.boolean(),
  hasInsurance: z.boolean(),
  cancellationPolicy: z.array(z.object({ period: z.string(), charge: z.string() })).min(1, '취소료 규정은 최소 1개 이상 필수입니다'),
  excludedItems: z.array(z.string()).default([]),
  airlineName: z.string().nullable().optional(),
  guaranteeType: z.enum(['insurance', 'mutual-aid', 'deposit']).optional(),
  insuranceCompany: z.string().nullable().optional(),
  insuranceCoverage: z.string().nullable().optional(),
  minGroupSize: z.number().optional(),
  maxGroupSize: z.number().optional(),
  affiliatePhone: z.string().nullable().optional(),
  customerEmail: z.string().nullable().optional(),
  localTransportType: z.enum(['bus', 'car', 'other', 'none']).optional(),
  otherNotes: z.string().nullable().optional(),
});
