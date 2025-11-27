// lib/payapp.ts
// PayApp API 연동 라이브러리

const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';

export interface PayAppConfig {
  userid: string;
  linkkey: string;
  linkval: string;
}

export interface PayAppRequestParams {
  cmd: string;
  userid: string;
  goodname: string;
  price: number;
  recvphone: string;
  memo?: string;
  reqaddr?: number;
  feedbackurl?: string;
  var1?: string;
  var2?: string;
  smsuse?: string;
  vccode?: string;
  returnurl?: string;
  openpaytype?: string;
  checkretry?: string;
  redirectpay?: string;
  skip_cstpage?: string;
  amount_taxable?: number;
  amount_taxfree?: number;
  amount_vat?: number;
}

export interface PayAppResponse {
  state: string;
  errorMessage?: string;
  errno?: string;
  mul_no?: string;
  payurl?: string;
  qrurl?: string;
}

/**
 * PayApp REST API 호출
 */
export async function payappApiPost(params: PayAppRequestParams): Promise<PayAppResponse> {
  try {
    // 파라메터를 URL 인코딩된 문자열로 변환
    const postData = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        postData.append(key, String(value));
      }
    });

    const response = await fetch(PAYAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: postData.toString(),
    });

    if (!response.ok) {
      throw new Error(`PayApp API 호출 실패: ${response.status}`);
    }

    const responseText = await response.text();
    console.log('[PayApp] API 응답 원문:', responseText);
    
    const parseData: Record<string, string> = {};
    
    // URL 인코딩된 응답 파싱
    responseText.split('&').forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key && value) {
        parseData[key] = decodeURIComponent(value);
      }
    });

    console.log('[PayApp] 파싱된 응답:', parseData);
    return parseData as PayAppResponse;
  } catch (error: any) {
    console.error('[PayApp] API 호출 오류:', error);
    return {
      state: '0',
      errorMessage: error?.message || 'PayApp API 호출 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 계약서 타입별 결제 금액 반환
 */
export function getContractPrice(contractType: string): number {
  switch (contractType) {
    case 'SALES_AGENT':
      return 3300000; // 판매원: 330만원
    case 'BRANCH_MANAGER':
      return 7500000; // 대리점장: 750만원
    case 'CRUISE_STAFF':
      return 5400000; // 크루즈스탭: 540만원
    case 'PRIMARKETER':
      return 1000000; // 프리마케터: 100만원
    case 'SUBSCRIPTION_AGENT':
      return 100000; // 정액제 판매원: 10만원
    default:
      return 0;
  }
}

/**
 * 계약서 타입별 상품명 반환
 */
export function getContractGoodName(contractType: string): string {
  switch (contractType) {
    case 'SALES_AGENT':
      return '판매원 계약서';
    case 'BRANCH_MANAGER':
      return '대리점장 계약서';
    case 'CRUISE_STAFF':
      return '크루즈스탭 계약서';
    case 'PRIMARKETER':
      return '프리마케터 계약서';
    case 'SUBSCRIPTION_AGENT':
      return '정액제 판매원 1개월 구독';
    default:
      return '계약서';
  }
}

