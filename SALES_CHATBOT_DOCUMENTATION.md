# 세일즈 챗봇 시스템 문서

> **작성일**: 2025-01-20  
> **버전**: 현재 상태 (사진 표시 이슈 포함)  
> **상태**: 운영 준비 중

---

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [API 엔드포인트](#api-엔드포인트)
3. [데이터베이스 구조](#데이터베이스-구조)
4. [판매원/대리점장 연결 방법](#판매원대리점장-연결-방법)
5. [현재 상태 및 알려진 이슈](#현재-상태-및-알려진-이슈)
6. [배포 전 체크리스트](#배포-전-체크리스트)
7. [유지보수 가이드](#유지보수-가이드)

---

## 🎯 시스템 개요

### 기능
- **SPIN 스크립트 기반 대화형 챗봇**: Situation, Problem, Implication, Need-payoff 단계별 질문 흐름
- **동적 콘텐츠 생성**: 상품 정보, 사용자 이름, 크루즈 라인별 영상 자동 삽입
- **미디어 통합**: YouTube 영상, 크루즈 후기 사진, 여행지 사진, 객실 사진
- **국가별 맞춤 이미지**: 크루즈 상품의 여행 국가에 맞는 관광 사진 자동 표시

### 주요 파일
```
app/api/chat-bot/
├── start/route.ts              # 챗봇 시작 (첫 질문 로드)
├── question/[id]/route.ts      # 특정 질문 로드 및 동적 콘텐츠 생성
├── session/route.ts            # 세션 관리
├── response/route.ts           # 사용자 응답 처리
└── reviews/route.ts            # 후기 데이터

lib/
└── cruise-images.ts            # 이미지 검색 유틸리티 (국가별, 후기, 객실)

app/chat-bot/
└── page.tsx                    # 클라이언트 UI 컴포넌트
```

---

## 🔌 API 엔드포인트

### 1. 챗봇 시작
```
GET /api/chat-bot/start?productCode={code}&partner={partnerId}
```

**기능**:
- 첫 질문 로드
- 상품 정보 동적 삽입
- 크루즈 라인별 영상 추가
- 고객 후기 사진 (order 3)
- 여행지 사진 (order 4, 텍스트 매칭)

**응답 예시**:
```json
{
  "ok": true,
  "question": {
    "id": 1,
    "order": 1,
    "questionText": "안녕하세요 {userName}님!",
    "information": "...",
    "optionA": "...",
    "optionB": "..."
  },
  "sessionId": "..."
}
```

### 2. 질문 로드
```
GET /api/chat-bot/question/{id}?productCode={code}
```

**기능**:
- 특정 질문 로드
- 상품 정보 기반 동적 콘텐츠 생성
- order별 영상/이미지 자동 추가:
  - order 3: 고객 후기 사진 (9장, 3x3 그리드)
  - order 4: 여행지 사진 (5장, 2열 그리드) - **현재 이슈 있음**
  - order 4.5: 부산 출발 크루즈 영상
  - order 7-13: 문제 해결 영상
  - order 14-18.7: 해결책 영상
  - order 20.5: 코스타 발코니 룸 영상
  - order 21: 객실 이미지 (3장)

### 3. 세션 관리
```
POST /api/chat-bot/session
GET /api/chat-bot/session?sessionId={id}
```

---

## 🗄️ 데이터베이스 구조

### 주요 모델

#### ChatBotFlow
```prisma
model ChatBotFlow {
  id          Int    @id @default(autoincrement())
  name        String
  description String?
  finalPageUrl String?
  ChatBotQuestion ChatBotQuestion[]
}
```

#### ChatBotQuestion
```prisma
model ChatBotQuestion {
  id              Int    @id @default(autoincrement())
  flowId          Int
  questionText    String
  questionType    String  // 'choice', 'text', etc.
  spinType        String? // 'S', 'P', 'I', 'N'
  order           Float
  information     String?
  optionA         String?
  optionB         String?
  nextQuestionIdA Int?
  nextQuestionIdB Int?
  nextQuestionIds Json?
  ChatBotFlow     ChatBotFlow @relation(fields: [flowId], references: [id])
}
```

#### CruiseProduct
```prisma
model CruiseProduct {
  productCode      String @id
  packageName      String
  cruiseLine       String
  shipName         String?
  itineraryPattern String? // JSON 형식
  // ...
}
```

---

## 👥 판매원/대리점장 연결 방법

### 현재 구조
- 챗봇은 `productCode`와 `partner` 파라미터로 접근
- 판매원/대리점장은 동일한 챗봇 API 사용
- 상품별, 파트너별로 동일한 질문 흐름 제공

### 연결 방법

#### 1. 랜딩 페이지에서 챗봇 호출
```typescript
// app/partner/[partnerId]/landing-pages/[id]/page.tsx
const chatBotUrl = `/chat-bot?productCode=${productCode}&partner=${partnerId}`;
```

#### 2. 판매원/대리점장 대시보드에서 챗봇 링크 생성
```typescript
// 판매원용 챗봇 링크
const salesChatBotUrl = `/chat-bot?productCode=${productCode}&partner=${partnerId}&role=sales`;

// 대리점장용 챗봇 링크
const managerChatBotUrl = `/chat-bot?productCode=${productCode}&partner=${partnerId}&role=manager`;
```

#### 3. API 호출 시 파라미터 전달
```typescript
// 챗봇 시작
const response = await fetch(
  `/api/chat-bot/start?productCode=${productCode}&partner=${partnerId}`
);

// 질문 로드
const response = await fetch(
  `/api/chat-bot/question/${questionId}?productCode=${productCode}`
);
```

### 권장 사항
- **현재 상태 유지**: 판매원과 대리점장 모두 동일한 챗봇 사용
- **추후 확장 가능**: `role` 파라미터 추가 시 역할별 맞춤 질문 가능
- **세션 추적**: `partner` 파라미터로 어느 파트너를 통해 접근했는지 추적

---

## ⚠️ 현재 상태 및 알려진 이슈

### ✅ 정상 작동 기능
1. **질문 흐름**: SPIN 스크립트 기반 질문 정상 로드
2. **동적 콘텐츠**: 상품명, 사용자 이름, 가격 등 동적 삽입
3. **영상 표시**: YouTube 영상 iframe 임베딩 정상 작동
4. **고객 후기 사진**: order 3에서 9장 정상 표시 (3x3 그리드)
5. **국가별 이미지 매칭**: `itineraryPattern` JSON 파싱하여 국가 추출
6. **해결책 영상**: order 18, 18.5, 18.7 각각 다른 영상 표시

### ⚠️ 알려진 이슈

#### 1. 여행지 사진 표시 안 됨 (중요)
**현상**: "여행지 사진 보기" 질문에서 국가별 관광 사진이 표시되지 않음

**원인 분석**:
- 질문 텍스트 매칭 조건: `questionText.includes('여행지 사진 보기') || questionText.includes('📸')`
- 실제 데이터베이스에 해당 질문이 없을 가능성
- 또는 질문 ID가 예상과 다를 수 있음

**해결 방안**:
1. 실제 "여행지 사진 보기" 질문의 ID 확인
2. 질문 텍스트 정확히 매칭되는지 확인
3. `information` 필드에 이미지 HTML이 추가되는지 서버 로그 확인
4. 클라이언트 측 렌더링 문제인지 확인

**임시 해결책**:
- order 기반 매칭 추가 고려
- 또는 질문 ID 직접 매핑

#### 2. 이미지 URL 인코딩
- 일부 이미지 URL이 인코딩되어 표시될 수 있음
- 클라이언트에서 디코딩 처리 필요

---

## ✅ 배포 전 체크리스트

### 1. 기능 테스트
- [ ] 챗봇 시작 정상 작동
- [ ] 질문 흐름 정상 진행 (SPIN 단계별)
- [ ] 상품 정보 동적 삽입 확인
- [ ] 사용자 이름 삽입 확인
- [ ] 영상 표시 확인 (모든 order)
- [ ] 고객 후기 사진 표시 확인 (order 3)
- [ ] **여행지 사진 표시 확인 (order 4) - 현재 이슈**
- [ ] 객실 이미지 표시 확인 (order 21)
- [ ] 최종 페이지 URL 이동 확인

### 2. 국가별 이미지 매칭 테스트
- [ ] 일본 크루즈 → 일본 이미지 5장 표시
- [ ] 대만 크루즈 → 대만 이미지 5장 표시
- [ ] 홍콩 크루즈 → 홍콩 이미지 5장 표시
- [ ] 여러 국가 포함 시 모든 국가 이미지 표시

### 3. 판매원/대리점장 연결 테스트
- [ ] 판매원 대시보드에서 챗봇 링크 생성 확인
- [ ] 대리점장 대시보드에서 챗봇 링크 생성 확인
- [ ] `partner` 파라미터 정상 전달 확인
- [ ] 세션 추적 정상 작동 확인

### 4. 성능 테스트
- [ ] API 응답 시간 확인 (< 1초 권장)
- [ ] 이미지 로딩 시간 확인
- [ ] 동시 접속자 테스트

### 5. 에러 처리
- [ ] 상품 정보 없을 때 기본값 처리
- [ ] 이미지 없을 때 기본 이미지 표시
- [ ] 영상 URL 오류 시 처리
- [ ] 네트워크 오류 시 재시도 로직

### 6. 보안
- [ ] SQL Injection 방지 확인
- [ ] XSS 방지 확인 (HTML 이스케이프)
- [ ] 세션 관리 보안 확인

---

## 🔧 유지보수 가이드

### 질문 추가/수정
1. 관리자 패널에서 질문 추가/수정
2. `order` 값 설정 (중요: 영상/이미지 매핑에 사용)
3. `nextQuestionIdA/B` 설정하여 흐름 연결

### 영상 추가/수정
**위치**: `app/api/chat-bot/question/[id]/route.ts`

```typescript
// 문제 영상 (order 7-13)
const PROBLEM_VIDEOS = [
  { title: '...', url: '...', description: '...' },
  // ...
];

// 해결책 영상 (order 14-18.7)
const SOLUTION_VIDEOS = [
  { title: '...', url: '...', description: '...' },
  // ...
];
```

### 국가별 이미지 추가
**위치**: `lib/cruise-images.ts`

1. `destinationCountryMap`에 국가 키워드 추가
2. `countryCodeMap`에 국가 코드 추가 (JSON 파싱용)
3. `public/크루즈정보사진/` 폴더에 국가별 이미지 추가

### 이미지 검색 로직 수정
**위치**: `lib/cruise-images.ts`

- `getDestinationImages()`: 폴더 검색 로직
- `getProductDestinationImages()`: 상품 정보에서 국가 추출
- 최대 이미지 수: 현재 5장으로 제한

---

## 📝 변경 이력

### 2025-01-20
- 세일즈 챗봇 백업 및 문서화
- 국가별 이미지 매칭 로직 개선 (JSON 파싱 추가)
- 여행지 사진 표시 이슈 문서화
- 배포 전 체크리스트 작성

### 주요 변경사항
1. `itineraryPattern` JSON 파싱 추가
2. 국가 코드 매핑 추가 (KR, JP, TW, HK, SG, VN, MY, TH, PH)
3. 여행지 이미지 HTML 그리드 형식으로 변경
4. 질문 텍스트 매칭 조건 확장

---

## 🚀 다음 단계

1. **여행지 사진 표시 이슈 해결** (우선순위: 높음)
   - 실제 질문 ID 확인
   - 서버 로그 확인
   - 클라이언트 렌더링 확인

2. **테스트 완료 후 배포**
   - 체크리스트 모두 완료
   - 스테이징 환경에서 테스트
   - 프로덕션 배포

3. **모니터링 설정**
   - API 응답 시간 모니터링
   - 에러 로그 모니터링
   - 사용자 피드백 수집

---

## 📞 문의

기술 지원이 필요한 경우:
- 백업 파일: `cruise-guide_sales-chatbot_backup_YYYYMMDD_HHMMSS.tar.gz`
- 이 문서: `SALES_CHATBOT_DOCUMENTATION.md`

---

**작성자**: AI Assistant  
**최종 업데이트**: 2025-01-20


