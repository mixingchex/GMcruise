# 작업지시서: 기항지 정보 등록 버그 수정

**작성일**: 2026-02-26
**우선순위**: Critical (크루즈 가이드 AI 브리핑 오작동)
**보고된 문제**: 그리스 산토리니·아르고스톨리 기항지 등록 후 AI 브리핑에서 언어(그리스어)가 적용되지 않음

---

## 데이터 흐름

```
data/countries.json
    ↓ EnhancedItineraryEditor 드롭다운 선택
EnhancedItineraryDay.arrivalCountry (countryCode)
    ↓ POST /api/admin/products (1단계)
CruiseProduct.itineraryPattern = [] (빈 배열 하드코딩 — BUG-02)
    ↓ PUT /api/admin/products/[productCode] (2단계)
CruiseProduct.itineraryPattern[n].country (itineraryDays 동기화 — BUG-03)
    ↓ GET /api/itinerary/current
resolveLanguage(itinerary.country) → LANGUAGE_MAP 조회 (BUG-04)
    ↓
AI 브리핑 language.code
```

**버그 연쇄 관계**
```
BUG-01 (countryCode = "")
    → BUG-02 + BUG-03 → itineraryPattern[n].country = ""
    → BUG-04 → 그리스어 대신 영어(DEFAULT_LANG) 사용
```

BUG-01과 BUG-04는 독립적으로 각각 수정해야 함. BUG-04만 수정해도 현재 DB에 country=""로 저장된 기존 데이터는 영어로 동작.

---

## [BUG-01] countries.json — code 필드 누락 (Critical)

**파일**: `data/countries.json`

**원인**: `code` 필드가 있는 국가는 `대한민국(KR)`뿐. 나머지 국가는 code 없음.

```typescript
// EnhancedItineraryEditor.tsx line 116
const countryCode = c?.code || '';
// 그리스 선택 시: code 필드 없음 → countryCode = "" → arrivalCountry = ""
```

**수정**: 크루즈 기항 주요 국가에 `code` 필드 추가

```json
{ "name": "그리스 (Greece)", "code": "GR", "regions": ["산토리니 (Santorini)", "아르고스톨리 (Argostoli)", ...] }
{ "name": "이탈리아 (Italy)", "code": "IT", "regions": [...] }
{ "name": "스페인 (Spain)", "code": "ES", "regions": [...] }
{ "name": "프랑스 (France)", "code": "FR", "regions": [...] }
{ "name": "크로아티아 (Croatia)", "code": "HR", "regions": [...] }
{ "name": "튀르키예 (Türkiye)", "code": "TR", "regions": [...] }
{ "name": "몬테네그로 (Montenegro)", "code": "ME", "regions": [...] }
{ "name": "알바니아 (Albania)", "code": "AL", "regions": [...] }
{ "name": "노르웨이 (Norway)", "code": "NO", "regions": [...] }
{ "name": "포르투갈 (Portugal)", "code": "PT", "regions": [...] }
{ "name": "일본 (Japan)", "code": "JP", "regions": [...] }
{ "name": "중국 (China)", "code": "CN", "regions": [...] }
{ "name": "홍콩 (Hong Kong)", "code": "HK", "regions": [...] }
{ "name": "태국 (Thailand)", "code": "TH", "regions": [...] }
{ "name": "베트남 (Vietnam)", "code": "VN", "regions": [...] }
{ "name": "말레이시아 (Malaysia)", "code": "MY", "regions": [...] }
{ "name": "인도네시아 (Indonesia)", "code": "ID", "regions": [...] }
{ "name": "미국 (United States)", "code": "US", "regions": [...] }
{ "name": "캐나다 (Canada)", "code": "CA", "regions": [...] }
```

---

## [BUG-02] new/page.tsx — itineraryPattern 빈 배열 하드코딩 (Critical)

**파일**: `app/admin/products/new/page.tsx` line 755

```typescript
// 현재 (잘못됨)
itineraryPattern: [],   // 항상 빈 배열 — itineraryDays 데이터 무시
```

신규 상품 POST 시 `itineraryPattern: []`로 생성 → 이후 PUT에서 동기화 시 `existingDay = {}`로 처리 → BUG-01로 `arrivalCountry = ""`이면 `country = ""`가 저장됨.

**수정**: itineraryDays를 기반으로 itineraryPattern을 빌드하여 POST payload에 포함

```typescript
// handleSave 함수 내 POST payload 구성 시
const builtPattern = itineraryDays.map((day) => ({
  day: day.day,
  type: (!day.arrivalLocation || day.arrivalLocation === '해상') ? 'sea' : 'PortVisit',
  location: day.arrivalLocation || null,
  country: day.arrivalCountry || null,
  arrival: day.portArrivalTime || null,
  departure: day.portDepartureTime || null,
}));

// POST body
itineraryPattern: builtPattern,  // [] 대신 실제 데이터
```

---

## [BUG-03] [productCode]/route.ts — PUT 동기화에 currency/language 누락 (High)

**파일**: `app/api/admin/products/[productCode]/route.ts` lines 389-397

```typescript
// 현재 (잘못됨) — currency, language 없음
return {
  ...existingDay,
  day: dayInfo.day,
  type,
  location: dayInfo.arrivalLocation || existingDay.location || null,
  country: dayInfo.arrivalCountry || existingDay.country || null,
  arrival: dayInfo.portArrivalTime || existingDay.arrival || null,
  departure: dayInfo.portDepartureTime || existingDay.departure || null,
};

// 수정 후
return {
  ...existingDay,
  day: dayInfo.day,
  type,
  location: dayInfo.arrivalLocation || existingDay.location || null,
  country: dayInfo.arrivalCountry || existingDay.country || null,
  currency: dayInfo.currency ?? existingDay.currency ?? null,   // 추가
  language: dayInfo.language ?? existingDay.language ?? null,   // 추가
  arrival: dayInfo.portArrivalTime || existingDay.arrival || null,
  departure: dayInfo.portDepartureTime || existingDay.departure || null,
};
```

`EnhancedItineraryEditor.tsx`의 `EnhancedItineraryDay` 인터페이스에도 필드 추가:
```typescript
currency?: string;  // 기항지 통화 (예: EUR, JPY)
language?: string;  // 기항지 언어코드 (예: el-GR, ja-JP)
```

---

## [BUG-04] itinerary/current/route.ts — LANGUAGE_MAP 지중해·유럽 국가 미등록 (High)

**파일**: `app/api/itinerary/current/route.ts` line 7 (LANGUAGE_MAP)

**현재**: 아시아 국가 위주. 지중해/유럽 크루즈 기항지 없음.

**수정**: 아래 항목 추가

```typescript
const LANGUAGE_MAP = {
  // --- 기존 항목 유지 ---

  // ISO 코드 기반 (itineraryPattern.country가 ISO 코드로 저장되는 경로 대응)
  GR: { code: 'el-GR', name: '그리스어', flag: '🇬🇷' },
  HR: { code: 'hr-HR', name: '크로아티아어', flag: '🇭🇷' },
  TR: { code: 'tr-TR', name: '튀르키예어', flag: '🇹🇷' },
  NO: { code: 'nb-NO', name: '노르웨이어', flag: '🇳🇴' },
  PT: { code: 'pt-PT', name: '포르투갈어', flag: '🇵🇹' },
  ME: { code: 'sr-ME', name: '몬테네그로어', flag: '🇲🇪' },
  AL: { code: 'sq-AL', name: '알바니아어', flag: '🇦🇱' },
  IT: { code: 'it-IT', name: '이탈리아어', flag: '🇮🇹' },
  ES: { code: 'es-ES', name: '스페인어', flag: '🇪🇸' },
  FR: { code: 'fr-FR', name: '프랑스어', flag: '🇫🇷' },
  DE: { code: 'de-DE', name: '독일어', flag: '🇩🇪' },
  JP: { code: 'ja-JP', name: '일본어', flag: '🇯🇵' },
  CN: { code: 'zh-CN', name: '중국어', flag: '🇨🇳' },
  HK: { code: 'zh-HK', name: '광둥어', flag: '🇭🇰' },
  TH: { code: 'th-TH', name: '태국어', flag: '🇹🇭' },
  VN: { code: 'vi-VN', name: '베트남어', flag: '🇻🇳' },
  MY: { code: 'ms-MY', name: '말레이어', flag: '🇲🇾' },
  ID: { code: 'id-ID', name: '인도네시아어', flag: '🇮🇩' },

  // 한국어 이름 기반 (기존 형식과 혼용 대응)
  그리스: { code: 'el-GR', name: '그리스어', flag: '🇬🇷' },
  크로아티아: { code: 'hr-HR', name: '크로아티아어', flag: '🇭🇷' },
  튀르키예: { code: 'tr-TR', name: '튀르키예어', flag: '🇹🇷' },
  노르웨이: { code: 'nb-NO', name: '노르웨이어', flag: '🇳🇴' },
  포르투갈: { code: 'pt-PT', name: '포르투갈어', flag: '🇵🇹' },
  이탈리아: { code: 'it-IT', name: '이탈리아어', flag: '🇮🇹' },
  스페인: { code: 'es-ES', name: '스페인어', flag: '🇪🇸' },
  프랑스: { code: 'fr-FR', name: '프랑스어', flag: '🇫🇷' },
  몬테네그로: { code: 'sr-ME', name: '몬테네그로어', flag: '🇲🇪' },
  알바니아: { code: 'sq-AL', name: '알바니아어', flag: '🇦🇱' },
};
```

---

## [BUG-05] PUT 동기화 — 1일차/마지막 날 type 강제 지정 오류 (Medium)

**파일**: `app/api/admin/products/[productCode]/route.ts` line 379

```typescript
// 현재: 1일차는 기항지여도 항상 'departure'로 강제
if (dayInfo.day === 1) { type = 'departure'; }
```

현지 탑승 상품에서 1일차가 실제 기항지인 경우도 있음.

**수정**: 조건 순서 변경 — 해상 여부를 가장 먼저 체크, type은 UI에서 명시적으로 지정한 값 우선 사용.

```typescript
let type: string;
if (!dayInfo.arrivalLocation || dayInfo.arrivalLocation === '해상') {
  type = 'sea';
} else {
  type = dayInfo.dayType || existingDay.type || 'PortVisit';
}
```

---

## 기존 DB 데이터 복구 방법

BUG-01~03 수정 후, 기존에 저장된 상품은 어드민 편집 페이지에서 열고 **"저장" 버튼을 다시 클릭**하면 수정된 로직으로 itineraryPattern이 재생성됨.

---

## 수정 순서 및 체크리스트

```
1. BUG-04: LANGUAGE_MAP 추가 (코드 추가만, 즉시 효과)    ← 10분
2. BUG-01: countries.json code 필드 추가                 ← 20분
3. BUG-03: PUT 동기화에 currency/language 추가           ← 20분
4. BUG-02: new/page.tsx itineraryPattern 하드코딩 제거   ← 30분
5. BUG-05: type 강제 지정 로직 개선                      ← 20분
```

**체크리스트**
- [ ] BUG-04: `itinerary/current/route.ts` LANGUAGE_MAP에 ISO 코드 + 한국어 이름 추가
- [ ] BUG-01: `data/countries.json` 주요 국가에 `code` 필드 추가
- [ ] BUG-03: `[productCode]/route.ts` PUT 동기화 반환 객체에 currency/language 추가
- [ ] BUG-03: `EnhancedItineraryEditor.tsx` 인터페이스에 currency/language 필드 추가
- [ ] BUG-02: `new/page.tsx` `itineraryPattern: []` 대신 itineraryDays 기반 빌드
- [ ] BUG-05: 1일차/마지막 날 type 강제 로직 개선
- [ ] 테스트: 그리스 산토리니 기항지 등록 → `/api/itinerary/current` 응답 `language.code === "el-GR"` 확인
