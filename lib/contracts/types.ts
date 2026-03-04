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

  // 취소료 규정 (상품별, 없으면 표준 크루즈 규정)
  cancellationPolicy: Array<{
    period: string;
    charge: string;
  }>;

  // 불포함 내역
  excludedItems: string[];
}

export type ContractStatus = 'pending' | 'signed' | 'expired' | 'cancelled';

export interface ContractSignInput {
  customerAddress: string;
  customerSignature: string;    // base64 PNG
  contractorSignature?: string; // base64 PNG
  companions: Array<{ name: string; phone: string }>;
}
