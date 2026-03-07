/**
 * 크루즈 상품 방문 국가 코드 → 한국어 이름 매핑 (공통 상수)
 * 여러 파일에서 인라인으로 중복 정의되던 것을 단일 출처(single source of truth)로 통합
 *
 * 사용처: ProductCard, ProductDetail, admin/products/page, reviews/route, public/products/route
 */
export const CRUISE_COUNTRIES: Record<string, string> = {
  // 아시아
  JP: '일본',
  KR: '한국',
  CN: '중국',
  TW: '대만',
  HK: '홍콩',
  TH: '태국',
  VN: '베트남',
  MY: '말레이시아',
  SG: '싱가포르',
  PH: '필리핀',
  ID: '인도네시아',
  // 북미
  US: '미국',
  CA: '캐나다',
  // 유럽
  ES: '스페인',
  FR: '프랑스',
  IT: '이탈리아',
  GR: '그리스',
  TR: '터키',
  NO: '노르웨이',
  HR: '크로아티아',
  ME: '몬테네그로',
  PT: '포르투갈',
  MT: '몰타',
  AL: '알바니아',
  BA: '보스니아헤르체고비나',
  // 지중해·중동
  CY: '키프로스',
  MC: '모나코',
  SI: '슬로베니아',
  EG: '이집트',
  IL: '이스라엘',
  JO: '요르단',
  // 카리브해·중미
  JM: '자메이카',
  BS: '바하마',
  MX: '멕시코',
  CU: '쿠바',
  // 남아시아·기타
  IN: '인도',
  MK: '마케도니아',
};
