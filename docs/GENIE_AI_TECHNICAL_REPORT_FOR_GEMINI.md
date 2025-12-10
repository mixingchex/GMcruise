# 크루즈 가이드 지니(Genie) AI 기능 상세 기술 보고서
## Gemini AI 학습용 - 외국인 버전 개발을 위한 기술 문서

---

## 목차
1. [지니 AI 개요](#1-지니-ai-개요)
2. [핵심 기능 상세](#2-핵심-기능-상세)
3. [시스템 프롬프트 및 페르소나](#3-시스템-프롬프트-및-페르소나)
4. [API 엔드포인트 상세](#4-api-엔드포인트-상세)
5. [데이터 소스 및 지식 베이스](#5-데이터-소스-및-지식-베이스)
6. [의도 감지(Intent Detection) 로직](#6-의도-감지intent-detection-로직)
7. [다국어 지원을 위한 고려사항](#7-다국어-지원을-위한-고려사항)
8. [기술 스택 상세](#8-기술-스택-상세)
9. [사용자 경험(UX) 설계 원칙](#9-사용자-경험ux-설계-원칙)
10. [외국인 버전 구현 가이드](#10-외국인-버전-구현-가이드)

---

## 1. 지니 AI 개요

### 1.1 정의
"지니(Genie)"는 크루즈 여행 전문 AI 어시스턴트입니다. 이름은 마법의 램프에서 나오는 지니처럼 사용자의 모든 여행 관련 소원을 들어준다는 의미를 담고 있습니다.

### 1.2 주요 특성
- **타겟 사용자**: 50대 이상 한국인 크루즈 여행객 (기본), 외국인 여행객 (확장 예정)
- **페르소나**: 100번 이상 크루즈를 탄 친근한 전문가
- **언어 스타일**: 쉬운 비유 사용, 간결한 답변 (100자 이내 권장)
- **PWA 지원**: 모바일 앱처럼 홈 화면에 추가 가능

### 1.3 서비스 URL 구조
```
/chat                    - 메인 채팅 페이지 (지니 AI)
/chat/test               - 3일 체험 사용자용 채팅
/profile                 - 사용자 프로필 페이지
/products                - 크루즈 상품 페이지
```

---

## 2. 핵심 기능 상세

### 2.1 세 가지 채팅 모드

#### 2.1.1 일반 모드 (General/Free Mode)
**목적**: 자유로운 대화 및 질문 답변

**기능**:
- RAG (Retrieval-Augmented Generation) 기반 지식 검색
- Google Search 통합으로 실시간 정보 제공
- 크루즈 상품 추천 (DB 연동)
- 스트리밍 응답 지원

**API 엔드포인트**: `POST /api/chat/stream`

**요청 형식**:
```json
{
  "messages": [
    { "role": "user", "content": "크루즈에서 옷은 어떻게 입어야 해?" }
  ]
}
```

**응답 형식**: Server-Sent Events (스트리밍)
```
0:"크루즈에서는 "
0:"다양한 드레스코드가 "
0:"있어요..."
```

---

#### 2.1.2 "지니야 가자" 모드 (Go Mode)
**목적**: 길찾기 및 위치 안내

**기능**:
- 출발지 → 도착지 경로 안내
- Google Maps 링크 생성 (자동차/대중교통/도보)
- 키워드 검색 (맛집, 관광지, 카페 등)
- 공항↔터미널 자동 추론

**API 엔드포인트**: `POST /api/chat`

**요청 형식**:
```json
{
  "text": "홍콩 공항에서 카이탁 터미널까지",
  "mode": "go",
  "from": "홍콩 국제공항",    // 선택적
  "to": "카이탁 크루즈 터미널" // 선택적
}
```

**응답 형식**:
```json
{
  "ok": true,
  "messages": [
    {
      "id": "1234-1",
      "role": "assistant",
      "type": "text",
      "text": "확인했어요.\n출발지: 홍콩 국제공항\n도착지: 카이탁 크루즈 터미널"
    },
    {
      "id": "1234-2",
      "role": "assistant",
      "type": "map-links",
      "title": "길찾기",
      "links": [
        { "label": "🚗 자동차 길찾기", "href": "https://google.com/maps/dir/...", "kind": "directions" },
        { "label": "🚇 대중교통 길찾기", "href": "https://google.com/maps/dir/...", "kind": "directions" },
        { "label": "🚶 도보 길찾기", "href": "https://google.com/maps/dir/...", "kind": "directions" }
      ]
    }
  ]
}
```

**지원 입력 형식**:
- `"A에서 B까지"` - 한국어 조사 형식
- `"A부터 B까지"` - 한국어 조사 형식
- `"A → B"` - 화살표 형식
- `"A -> B"` - ASCII 화살표 형식
- `"마이애미"` - 지명만 입력 시 공항→터미널 자동 추론

**키워드 검색 지원**:
```javascript
const SEARCH_KEYWORDS = [
  "맛집", "restaurant", "food", "dining",
  "관광지", "tourist", "attraction", "sightseeing",
  "카페", "스타벅스", "편의점", "마트",
  "은행", "병원", "약국", "호텔", "ATM"
];
```

---

#### 2.1.3 "지니야 보여줘" 모드 (Show Mode)
**목적**: 크루즈 및 여행지 사진 검색

**기능**:
- 로컬 이미지 라이브러리 검색 (90+ 폴더, 수천 장 사진)
- DB 캐시 기반 빠른 검색
- 하위 폴더(카테고리) 탐색
- Google 이미지 검색 폴백

**API 엔드포인트**: `POST /api/chat`

**요청 형식**:
```json
{
  "text": "벨리시마 수영장",
  "mode": "show"
}
```

**응답 형식**:
```json
{
  "ok": true,
  "messages": [
    {
      "id": "1234",
      "role": "assistant",
      "type": "show-me",
      "text": "벨리시마 수영장 사진 (15장)",
      "googleImageUrl": "https://google.com/search?q=벨리시마+수영장&tbm=isch",
      "cruisePhotos": [
        { "url": "/크루즈정보사진/MSC벨리시마/수영장1.jpg", "title": "수영장1" },
        { "url": "/크루즈정보사진/MSC벨리시마/수영장2.jpg", "title": "수영장2" }
      ],
      "subfolders": [
        { "name": "MSC벨리시마", "displayName": "MSC 벨리시마", "icon": "🛳️", "photoCount": 120 }
      ],
      "query": "벨리시마 수영장"
    }
  ]
}
```

**이미지 카테고리 (일부)**:
| 폴더명 | 표시명 | 아이콘 | 키워드 |
|--------|--------|--------|--------|
| MSC벨리시마 | MSC 벨리시마 | 🛳️ | msc, 벨리시마, bellissima |
| 코스타세레나 | 코스타 세레나호 | 🚢 | 코스타, 세레나, costa, serena |
| 홍콩 | 홍콩 | 🇭🇰 | 홍콩, hongkong, 카이탁 |
| 오키나와(나하) | 오키나와 | 🏝️ | 오키나와, 나하, okinawa |
| 대만 기륭(지룽) | 대만 기륭 | 🇹🇼 | 대만, 기륭, taiwan, keelung |

---

### 2.2 번역 기능 (Translate Mode)

**목적**: 실시간 다국어 번역

**API 엔드포인트**: `POST /api/chat`

**요청 형식**:
```json
{
  "text": "이 음식이 뭐예요?",
  "mode": "translate",
  "from": "한국어",
  "to": "영어"
}
```

**응답 형식**:
```json
{
  "ok": true,
  "messages": [
    {
      "id": "1234",
      "role": "assistant",
      "type": "text",
      "text": "What is this food?"
    }
  ]
}
```

**번역 프롬프트 규칙**:
1. 번역된 텍스트만 출력 (원문 포함 금지)
2. "Translation:" 등의 라벨 금지
3. 숫자, 가격, 통화 기호 그대로 유지
4. 고유명사(지니가이드 등) 적절히 번역
5. 원문과 동일한 어조 유지

---

### 2.3 RAG (Retrieval-Augmented Generation) 검색

**목적**: 지식 베이스에서 관련 정보를 검색하여 AI 응답 품질 향상

**작동 방식**:
1. 사용자 질문을 벡터 임베딩으로 변환
2. 지식 베이스의 문서들과 코사인 유사도 계산
3. 상위 N개 관련 문서를 시스템 프롬프트에 포함
4. AI가 검색된 정보를 참고하여 답변 생성

**코드 위치**: `/lib/ai/ragSearch.ts`

**핵심 함수**:
```typescript
async function searchKnowledgeBase(query: string, limit: number = 5): Promise<SearchResult[]>
```

**검색 결과 형식**:
```typescript
interface SearchResult {
  id: number;
  title: string;
  content: string;
  category: string;
  similarity: number; // 0-1 범위
}
```

**폴백 메커니즘**:
- 벡터 검색 실패 시 키워드 기반 검색으로 폴백
- 키워드 매칭 점수로 유사도 계산

---

### 2.4 크루즈 상품 추천

**목적**: 사용자 질문에 맞는 크루즈 상품 정보 제공

**트리거 키워드**:
```javascript
const productKeywords = ['크루즈', '상품', '추천', '여행', '일본', '대만', 'msc', '벨리시마', 'royal', 'caribbean'];
```

**DB 쿼리 조건**:
```prisma
CruiseProduct.findMany({
  where: {
    saleStatus: '판매중',
    OR: [
      { isPopular: true },
      { isRecommended: true }
    ]
  },
  take: 5,
  orderBy: [
    { isPopular: 'desc' },
    { isRecommended: 'desc' },
    { createdAt: 'desc' }
  ]
})
```

**응답에 포함되는 상품 정보**:
- 크루즈 라인 (cruiseLine)
- 선박명 (shipName)
- 패키지명 (packageName)
- 상품코드 (productCode)
- 기간 (nights박 days일)
- 가격 (basePrice)
- 설명 (description)

---

### 2.5 개인화 첫인사 메시지

**목적**: 사용자와 여행 정보를 활용한 맞춤형 환영 메시지

**메시지 템플릿**:
```
반갑습니다, [사용자 이름]님! 행복한 크루즈 여행이 될 수 있도록,
[크루즈선 이름] 타고 [동행인]와(과) 즐기는 [여행지] 여행,
저 지니가 함께 할게요!

궁금한 점은 뭐든 물어보세요! 예를 들면...
1. 여행 전에 무엇을 준비해야 하지?
2. [여행지]에서는 어떤 것들을 관광하고 볼 수 있지?
3. 여행 준비물은 어떤 것들을 챙겨야 하지?
4. 나 여행 몇일 남았어?
5. 내가 타는 [크루즈선 이름]에 대해 알려줘!

여행 끝나는 그날까지 지니와 함께 할 거예요!
두근두근! ✨
```

**데이터 소스**:
- 사용자 이름: `/api/user/profile`
- 여행 정보: `/api/trips/active`
- D-Day 계산: 서버 시간 기준 자동 계산

---

### 2.6 D-Day 푸시 알림

**목적**: 여행 출발일 기준 D-Day 메시지 표시

**메시지 데이터**: `/data/dday_messages.json`

**형식**:
```json
{
  "messages": {
    "100": { "title": "D-100 축하해요!", "message": "여행까지 100일 남았어요..." },
    "30": { "title": "D-30 한 달 앞!", "message": "이제 한 달 남았어요..." },
    "7": { "title": "D-7 일주일!", "message": "일주일 뒤면 크루즈에..." },
    "0": { "title": "D-Day!", "message": "오늘이 바로 그 날!" }
  }
}
```

---

## 3. 시스템 프롬프트 및 페르소나

### 3.1 일반 사용자용 시스템 프롬프트

```
당신은 크루즈 여행 전문 AI 어시스턴트 '지니'입니다.
- 한국어로 간단명료하게 답변하세요.
- 답변은 반드시 100자 이내로 간략하게 작성하세요.
- 핵심 정보만 전달하고 불필요한 설명은 생략하세요.
- 최신 정보가 필요한 질문은 Google Search를 활용하여 정확한 정보를 제공하세요.
- 검색 결과를 바탕으로 간결하고 정확한 답변을 제공하세요.

[크루즈 상품 안내]
- 사용자가 크루즈 상품에 대해 물어보면 [판매 중인 크루즈 상품 정보]를 참고하여 추천하세요.
- 상품코드, 기간, 가격, 설명을 포함하여 간단명료하게 안내하세요.
- 여러 상품이 있으면 인기 상품을 우선 추천하세요.

사용자의 질문에 필요한 핵심만 전달하세요.

[참고 자료]
{RAG 검색 결과}

[판매 중인 크루즈 상품 정보]
{DB에서 조회한 상품 목록}
```

### 3.2 3일 체험 사용자용 시스템 프롬프트

```
당신은 크루즈 가이드 지니 3일 체험 전용 AI 어시스턴트입니다.
- 이 사용자는 크루즈 가이드 지니 3일 체험 사용자입니다.
- 3일 체험 사용자들은 3일 체험 사용자들끼리만 연결되어야 합니다.
- 일반 크루즈 가이드 지니가 아닌, 3일 체험 전용 지니로 동작하세요.
- 한국어로 간단명료하게 답변하세요.
- 답변은 반드시 100자 이내로 간략하게 작성하세요.
...
```

### 3.3 페르소나 특성

| 특성 | 설명 |
|------|------|
| 경험 | 100번 이상 크루즈 탑승 경험 |
| 성격 | 친근하고 따뜻함 |
| 언어 | 쉬운 비유 사용, 전문용어 최소화 |
| 답변 스타일 | 간결하고 핵심적 (100자 이내) |
| 톤 | 존댓말, 격식체 |

---

## 4. API 엔드포인트 상세

### 4.1 채팅 API 목록

| 엔드포인트 | 메서드 | 기능 | 인증 |
|------------|--------|------|------|
| `/api/chat/stream` | POST | 일반 대화 (스트리밍) | 필수 |
| `/api/chat` | POST | 모드별 처리 (show/go/translate) | 필수 |
| `/api/photos` | GET | 사진 검색 | 불필요 |

### 4.2 사용자 관련 API

| 엔드포인트 | 메서드 | 기능 |
|------------|--------|------|
| `/api/user/profile` | GET | 사용자 프로필 조회 |
| `/api/trips/active` | GET | 활성 여행 정보 조회 |
| `/api/user/access-check` | GET | 여행 종료 상태 확인 |

### 4.3 관리자 API

| 엔드포인트 | 메서드 | 기능 |
|------------|--------|------|
| `/api/admin/customers/create-genie` | POST | 지니 고객 생성 |
| `/api/admin/knowledge` | GET/POST | 지식 베이스 관리 |
| `/api/partner/assign-trip/create-genie` | POST | 파트너: 여행 배정 |

---

## 5. 데이터 소스 및 지식 베이스

### 5.1 지식 베이스 카테고리

| 카테고리 | 설명 | URL |
|----------|------|-----|
| 궁금증 해결 | 크루즈 여행이 특별한 이유 | leadz.kr/ydy |
| 오해와 진실 | 5가지 오해와 진실 | leadz.kr/ydz |
| 준비물 가이드 | 필수 준비물 체크리스트 | leadz.kr/ydA |
| 비용 정보 | 비용 구조와 절약 방법 | leadz.kr/ydB |
| 안전 정보 | 안전 수칙과 팁 | leadz.kr/ydC |
| 식사 정보 | 다이닝 옵션과 예약 | leadz.kr/ydD |
| 엔터테인먼트 | 쇼, 게임, 스포츠 | leadz.kr/ydE |
| 항구 투어 | 관광지 및 투어 | leadz.kr/ydF |
| 팁과 요령 | 초보자 팁 | leadz.kr/ydG |
| 날씨 정보 | 최적 시기와 기후 | leadz.kr/ydH |

### 5.2 이미지 데이터

**저장 위치**: `/public/크루즈정보사진/`

**폴더 구조 예시**:
```
크루즈정보사진/
├── MSC벨리시마/
│   ├── 객실/
│   ├── 수영장/
│   ├── 식당/
│   └── ...
├── 코스타세레나/
├── 로얄 브릴리앙스호/
├── 홍콩/
├── 오키나와(나하)/
├── 대만 기륭(지룽)/
└── ... (90+ 폴더)
```

**캐싱 메커니즘**:
1. `/data/image_manifest.json` - 모든 이미지 메타데이터
2. `ImageCache` DB 테이블 - 성능 최적화용
3. 파일 시스템 직접 스캔 - 폴백

### 5.3 위치 데이터

**공항 데이터** (`/app/api/chat/detect.ts`):
```javascript
const AIRPORTS = [
  { name: '인천국제공항', code: 'ICN', query: 'Incheon International Airport' },
  { name: '홍콩국제공항', code: 'HKG', query: 'Hong Kong International Airport' },
  { name: '마이애미 국제공항', code: 'MIA', query: 'Miami International Airport' },
  // ...
];
```

**터미널 데이터**: `/data/terminals.json`

---

## 6. 의도 감지(Intent Detection) 로직

### 6.1 의도 유형

```typescript
type Intent = "directions" | "nearby" | "translate" | "photos" | "free";
```

### 6.2 감지 로직

```typescript
function detectIntent(text: string, explicitMode?: "go" | "show" | "general"): Intent {
  // 1. 명시적 모드가 있으면 우선 사용
  if (explicitMode === "go") return "directions";
  if (explicitMode === "show") return "photos";
  if (explicitMode === "general") return "free";

  // 2. 텍스트 패턴 분석
  if (isDirectionsLike(text)) return "directions"; // 길찾기 패턴
  if (isNearbyLike(text)) return "nearby";         // 주변 검색 패턴

  // 3. 기본값
  return "free";
}
```

### 6.3 패턴 정규식

```typescript
// 길찾기 의도
function isDirectionsLike(text: string): boolean {
  return /(어떻게\s*가|길찾기|가는\s*법|route|directions)/i.test(text);
}

// 주변 검색 의도
function isNearbyLike(text: string): boolean {
  return /(근처|주변|nearby)/i.test(text);
}

// 현재 위치 표현
function isHereLike(text: string): boolean {
  return /(현\s*위치|지금\s*여기|현재\s*내\s*위치)/i.test(text);
}
```

### 6.4 출발지/도착지 파싱

```typescript
function parseOriginDestination(text: string) {
  // 패턴 1: "A에서 B까지", "A부터 B까지"
  const m1 = text.match(/(.+?)\s*(에서|부터)\s*(.+?)\s*(까지|가|로)/);

  // 패턴 2: "A → B", "A -> B"
  const m2 = text.match(/(.+?)\s*(→|->)\s*(.+)/);

  // 패턴 3: "A 어떻게 가?" (도착지만)
  const m3 = text.match(/(.+?)\s*(어떻게\s*가|길찾기)/);

  return { originText, destText };
}
```

---

## 7. 다국어 지원을 위한 고려사항

### 7.1 현재 언어 지원 현황

| 구성요소 | 한국어 | 영어 | 일본어 | 중국어 |
|----------|--------|------|--------|--------|
| 시스템 프롬프트 | ✅ | ❌ | ❌ | ❌ |
| UI 텍스트 | ✅ | ❌ | ❌ | ❌ |
| 지식 베이스 | ✅ | ❌ | ❌ | ❌ |
| 의도 감지 패턴 | ✅ | 일부 | ❌ | ❌ |
| 에러 메시지 | ✅ | ❌ | ❌ | ❌ |

### 7.2 외국인 버전 필수 수정 항목

#### 7.2.1 시스템 프롬프트 (영어 버전 예시)
```
You are "Genie", a professional AI assistant specializing in cruise travel.
- Respond in clear, concise English.
- Keep answers under 100 words.
- Focus on essential information only.
- Use Google Search for real-time information when needed.
- Provide accurate answers based on search results.

[Cruise Product Guide]
- When asked about cruise products, refer to [Available Cruise Products].
- Include product code, duration, price, and description.
- Prioritize popular products when multiple options exist.

Deliver only the essential information the user needs.
```

#### 7.2.2 의도 감지 패턴 (영어)
```typescript
function isDirectionsLikeEN(text: string): boolean {
  return /(how\s*to\s*get|directions|route|navigate|way\s*to)/i.test(text);
}

function isNearbyLikeEN(text: string): boolean {
  return /(near|nearby|around|close\s*to|in\s*the\s*area)/i.test(text);
}
```

#### 7.2.3 출발지/도착지 파싱 (영어)
```typescript
function parseOriginDestinationEN(text: string) {
  // 패턴: "from A to B"
  const m1 = text.match(/from\s+(.+?)\s+to\s+(.+)/i);

  // 패턴: "A to B"
  const m2 = text.match(/(.+?)\s+to\s+(.+)/i);

  // 패턴: "how to get to A"
  const m3 = text.match(/how\s+to\s+get\s+to\s+(.+)/i);

  return { originText, destText };
}
```

### 7.3 지식 베이스 번역 가이드

**번역 시 주의사항**:
1. 한국 특화 정보 (공항, 터미널명)는 현지 명칭 병기
2. 문화적 맥락 고려 (드레스코드, 팁 문화 등)
3. 단위 변환 (원→달러, km→마일 등)
4. 시간대 고려 (한국시간 → 현지시간)

---

## 8. 기술 스택 상세

### 8.1 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 14+ | App Router 기반 프레임워크 |
| React | 18+ | UI 라이브러리 |
| Tailwind CSS | 3+ | 스타일링 |
| TypeScript | 5+ | 타입 안전성 |

### 8.2 백엔드

| 기술 | 용도 |
|------|------|
| Node.js | 런타임 |
| Prisma | ORM |
| PostgreSQL | 데이터베이스 |

### 8.3 AI/ML

| 기술 | 용도 |
|------|------|
| Google Gemini API | LLM 응답 생성 |
| Google Embedding API | 벡터 임베딩 |
| Google Search API | 실시간 검색 |

### 8.4 Gemini API 설정

```typescript
// 일반 대화용
const chatConfig = {
  temperature: 0.7,        // 창의성 높음
  maxOutputTokens: 8192,   // 긴 답변 허용
  topP: 0.9,
  topK: 20,
  tools: [{ googleSearch: {} }]
};

// 번역용
const translateConfig = {
  temperature: 0.1,        // 정확성 중시
  maxOutputTokens: 2048
};
```

---

## 9. 사용자 경험(UX) 설계 원칙

### 9.1 50대 이상 사용자 최적화

| 원칙 | 구현 |
|------|------|
| 큰 터치 영역 | 버튼 높이 80-100px 이상 |
| 명확한 텍스트 | 폰트 크기 16px 이상, text-lg/text-xl |
| 높은 대비 | 그라데이션 배경, 명확한 색상 구분 |
| 간단한 조작 | 탭 몇 번으로 기능 완료 |
| 이모지 활용 | 각 기능에 직관적인 이모지 |

### 9.2 튜토리얼 제공

**첫 방문 시 튜토리얼 표시** (`/app/chat/components/GenieAITutorial.tsx`)
- 지니의 세 가지 기능 소개
- 예시 질문 제안
- 모드 전환 방법 안내

### 9.3 에러 처리

**친절한 에러 메시지**:
```
❌ 잘못된 형식:
"API error 400"

✅ 올바른 형식:
"죄송해요, 잠시 문제가 생겼어요. 다시 한번 말씀해 주시겠어요?"
```

---

## 10. 외국인 버전 구현 가이드

### 10.1 구현 우선순위

1. **Phase 1: 기본 영어 지원**
   - 시스템 프롬프트 영어화
   - UI 텍스트 i18n 적용
   - 의도 감지 패턴 영어 추가

2. **Phase 2: 지식 베이스 확장**
   - 핵심 카테고리 영어 번역
   - 영어권 관광지 정보 추가
   - 영어 키워드 검색 지원

3. **Phase 3: 다국어 확장**
   - 일본어, 중국어 지원
   - 언어 자동 감지
   - 언어별 프롬프트 최적화

### 10.2 필수 수정 파일 목록

```
# 시스템 프롬프트
/app/api/chat/stream/route.ts

# 의도 감지
/app/api/chat/detect.ts

# UI 컴포넌트
/app/chat/components/ChatInteractiveUI.tsx
/app/chat/components/InputBar.tsx
/components/ChatWindow.tsx

# 지식 베이스
/data/knowledge_base.json

# 카테고리 정의
/lib/cruise-categories.ts

# 위치 데이터
/data/terminals.json
```

### 10.3 i18n 구현 제안

```typescript
// /lib/i18n/prompts.ts
export const systemPrompts = {
  ko: `당신은 크루즈 여행 전문 AI 어시스턴트 '지니'입니다...`,
  en: `You are "Genie", a professional AI assistant specializing in cruise travel...`,
  ja: `あなたはクルーズ旅行専門のAIアシスタント「ジニ」です...`,
  zh: `你是专业的邮轮旅游AI助手"精灵"...`
};

// /lib/i18n/intents.ts
export const intentPatterns = {
  ko: {
    directions: /(어떻게\s*가|길찾기|가는\s*법)/i,
    nearby: /(근처|주변)/i
  },
  en: {
    directions: /(how\s*to\s*get|directions|route)/i,
    nearby: /(near|nearby|around)/i
  }
};
```

### 10.4 테스트 체크리스트

- [ ] 영어 시스템 프롬프트로 정확한 응답 생성
- [ ] 영어 의도 감지 패턴 동작 확인
- [ ] 영어 출발지/도착지 파싱 정상 동작
- [ ] 영어 키워드로 이미지 검색 가능
- [ ] 영어 에러 메시지 표시
- [ ] 영어 튜토리얼 표시
- [ ] 다국어 전환 기능 동작

---

## 부록: 주요 파일 경로 요약

### API 라우트
```
/app/api/chat/route.ts           - 모드별 처리 (show/go/translate)
/app/api/chat/stream/route.ts    - 스트리밍 응답 (일반 대화)
/app/api/chat/detect.ts          - 의도 감지 함수
/app/api/chat/handlers/photos.ts - 사진 검색 핸들러
/app/api/chat/handlers/directions.ts - 길찾기 핸들러
```

### 라이브러리
```
/lib/gemini.ts                   - Gemini API 호출
/lib/ai/ragSearch.ts             - RAG 검색
/lib/ai/embeddingUtils.ts        - 벡터 임베딩
/lib/photos-search.ts            - 로컬 사진 검색
/lib/image-cache-search.ts       - DB 캐시 이미지 검색
/lib/cruise-categories.ts        - 크루즈 카테고리 정의
/lib/maps.ts                     - Google Maps URL 생성
```

### 데이터
```
/data/knowledge_base.json        - 지식 베이스
/data/image_manifest.json        - 이미지 메타데이터
/data/dday_messages.json         - D-Day 메시지
/data/terminals.json             - 터미널 위치 정보
```

### 컴포넌트
```
/app/chat/page.tsx                        - 메인 채팅 페이지
/app/chat/components/ChatInteractiveUI.tsx - 채팅 UI 통합
/app/chat/components/ChatClientShell.tsx  - 채팅 클라이언트
/app/chat/components/GenieAITutorial.tsx  - 튜토리얼
/components/ChatWindow.tsx                - 메시지 표시
```

---

## 문서 정보

- **작성일**: 2025-12-10
- **버전**: 1.0
- **목적**: Gemini AI 외국인 버전 학습용 기술 문서
- **대상**: AI 엔지니어, 개발자

---

*이 문서는 크루즈 가이드 지니 AI의 모든 기능과 기술적 세부사항을 담고 있습니다. 외국인 버전 개발 시 이 문서를 참고하여 동일한 품질의 서비스를 구현할 수 있습니다.*
