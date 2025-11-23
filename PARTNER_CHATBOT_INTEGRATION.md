# 판매원/대리점장 챗봇 연결 가이드

> **작성일**: 2025-01-20  
> **목적**: 판매원과 대리점장이 세일즈 챗봇을 사용할 수 있도록 연결하는 방법

---

## 🎯 개요

현재 세일즈 챗봇은 **판매원과 대리점장 모두 동일한 챗봇을 사용**합니다. 
각 파트너는 자신의 랜딩 페이지나 대시보드를 통해 고객에게 챗봇을 제공할 수 있습니다.

---

## 🔗 연결 방법

### 1. 랜딩 페이지에서 챗봇 연결

#### 현재 구조
```typescript
// app/partner/[partnerId]/landing-pages/[id]/page.tsx
const chatBotUrl = `/chat-bot?productCode=${productCode}&partner=${partnerId}`;
```

#### 구현 예시
```typescript
// 랜딩 페이지 컴포넌트
export default function LandingPage({ productCode, partnerId }) {
  const chatBotUrl = `/chat-bot?productCode=${productCode}&partner=${partnerId}`;
  
  return (
    <div>
      {/* 랜딩 페이지 콘텐츠 */}
      
      {/* 챗봇 버튼 */}
      <a href={chatBotUrl} className="chatbot-button">
        지니 AI와 상담하기
      </a>
    </div>
  );
}
```

### 2. 판매원 대시보드에서 챗봇 링크 생성

#### 판매원용 챗봇 링크
```typescript
// 판매원 대시보드
const salesChatBotUrl = `/chat-bot?productCode=${productCode}&partner=${partnerId}&role=sales`;

// 링크 생성 및 공유
function generateChatBotLink(productCode: string, partnerId: string) {
  return `${window.location.origin}/chat-bot?productCode=${productCode}&partner=${partnerId}`;
}
```

### 3. 대리점장 대시보드에서 챗봇 링크 생성

#### 대리점장용 챗봇 링크
```typescript
// 대리점장 대시보드
const managerChatBotUrl = `/chat-bot?productCode=${productCode}&partner=${partnerId}&role=manager`;

// 여러 판매원에게 배포할 수 있는 링크 생성
function generateChatBotLinksForAgents(productCode: string, partnerId: string, agentIds: string[]) {
  return agentIds.map(agentId => ({
    agentId,
    chatBotUrl: `/chat-bot?productCode=${productCode}&partner=${partnerId}&agent=${agentId}`
  }));
}
```

---

## 📡 API 연동

### 챗봇 시작 API 호출

```typescript
// 챗봇 시작
async function startChatBot(productCode: string, partnerId: string) {
  const response = await fetch(
    `/api/chat-bot/start?productCode=${productCode}&partner=${partnerId}`
  );
  
  const data = await response.json();
  
  if (data.ok) {
    // 첫 질문 표시
    displayQuestion(data.question);
    // 세션 ID 저장
    sessionStorage.setItem('chatbotSessionId', data.sessionId);
  }
}
```

### 질문 로드 API 호출

```typescript
// 다음 질문 로드
async function loadQuestion(questionId: number, productCode: string) {
  const response = await fetch(
    `/api/chat-bot/question/${questionId}?productCode=${productCode}`
  );
  
  const data = await response.json();
  
  if (data.ok) {
    displayQuestion(data.question);
  }
}
```

---

## 🔐 세션 추적

### 파트너별 세션 추적

현재 챗봇은 `partner` 파라미터를 통해 어느 파트너를 통해 접근했는지 추적합니다.

```typescript
// 세션 생성 시 파트너 정보 포함
POST /api/chat-bot/session
{
  "partnerId": "partner123",
  "productCode": "TEST-2025-TW-03",
  "role": "sales" // 또는 "manager"
}
```

### 세션 데이터 활용

```typescript
// 세션 데이터 조회
GET /api/chat-bot/session?sessionId={id}

// 응답 예시
{
  "sessionId": "...",
  "partnerId": "partner123",
  "productCode": "TEST-2025-TW-03",
  "startedAt": "2025-01-20T10:00:00Z",
  "lastQuestionId": 5,
  "conversationHistory": [...]
}
```

---

## 📊 분석 및 추적

### 파트너별 챗봇 사용 통계

```typescript
// 파트너별 챗봇 사용 통계 조회
GET /api/admin/chat-bot/insights?partnerId={id}

// 응답 예시
{
  "partnerId": "partner123",
  "totalSessions": 150,
  "completedSessions": 120,
  "conversionRate": 0.8,
  "averageQuestions": 15,
  "topProducts": [...]
}
```

---

## 🎨 UI 통합 예시

### 1. 랜딩 페이지에 챗봇 버튼 추가

```tsx
// 랜딩 페이지 컴포넌트
export default function LandingPage({ productCode, partnerId }) {
  return (
    <div>
      {/* 상품 정보 */}
      
      {/* 챗봇 버튼 */}
      <div className="fixed bottom-4 right-4">
        <a 
          href={`/chat-bot?productCode=${productCode}&partner=${partnerId}`}
          className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700"
        >
          💬 지니 AI와 상담하기
        </a>
      </div>
    </div>
  );
}
```

### 2. 판매원 대시보드에 챗봇 링크 생성기

```tsx
// 판매원 대시보드
export default function SalesDashboard({ partnerId }) {
  const [productCode, setProductCode] = useState('');
  const chatBotUrl = `/chat-bot?productCode=${productCode}&partner=${partnerId}`;
  
  return (
    <div>
      <h2>챗봇 링크 생성</h2>
      <input 
        value={productCode}
        onChange={(e) => setProductCode(e.target.value)}
        placeholder="상품 코드 입력"
      />
      <div>
        <p>챗봇 링크:</p>
        <input readOnly value={chatBotUrl} />
        <button onClick={() => navigator.clipboard.writeText(chatBotUrl)}>
          복사
        </button>
      </div>
    </div>
  );
}
```

---

## ⚠️ 주의사항

### 1. 파라미터 필수 확인
- `productCode`: 필수 (상품 정보 로드에 필요)
- `partner`: 필수 (세션 추적에 필요)

### 2. 세션 관리
- 각 파트너는 독립적인 세션을 가짐
- 세션 만료 시간 확인 필요
- 세션 데이터 정리 스케줄러 확인

### 3. 권한 관리
- 현재는 모든 파트너가 동일한 챗봇 사용
- 추후 역할별 맞춤 질문 필요 시 `role` 파라미터 활용

---

## 🔄 향후 확장 계획

### 1. 역할별 맞춤 질문
```typescript
// 판매원용 맞춤 질문
if (role === 'sales') {
  // 판매원 특화 질문
}

// 대리점장용 맞춤 질문
if (role === 'manager') {
  // 대리점장 특화 질문
}
```

### 2. 파트너별 맞춤 설정
- 파트너별 챗봇 스타일 커스터마이징
- 파트너별 최종 페이지 URL 설정
- 파트너별 상품 필터링

### 3. 실시간 모니터링
- 파트너별 챗봇 사용 현황 실시간 대시보드
- 전환율 분석
- A/B 테스트 지원

---

## 📞 지원

기술 지원이 필요한 경우:
- 문서: `PARTNER_CHATBOT_INTEGRATION.md`
- API 문서: `SALES_CHATBOT_DOCUMENTATION.md`
- 배포 체크리스트: `DEPLOYMENT_CHECKLIST.md`

---

**작성자**: AI Assistant  
**최종 업데이트**: 2025-01-20


