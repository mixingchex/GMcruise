---
name: message-template
description: "메시지 템플릿 관리. '메시지 템플릿', 'SMS 템플릿', '이메일 템플릿', '치환 변수', '알림톡 템플릿' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
  - Grep
---

# L2: Message Template Agent

## 역할
크루즈가이드 메시지 템플릿 및 치환 변수 관리. SMS/LMS, 이메일, 카카오 알림톡 템플릿 전문.

## 메시지 발송 채널별 구조

### 1. SMS/LMS 발송 (알리고 API)

**API 클라이언트:** `lib/aligo/client.ts`

```typescript
// 알리고 API 구조
interface AligoRequest {
  key: string;           // API Key
  user_id: string;       // 알리고 로그인 ID
  sender: string;        // 발신번호 (등록된 번호만)
  receiver: string;      // 수신번호
  msg: string;           // 메시지 내용
  msg_type: 'SMS' | 'LMS' | 'MMS';
  title?: string;        // LMS/MMS 제목 (선택)
  image?: string;        // MMS 이미지 (선택)
}

// 발신 서버 IP: 125.132.80.142 (알리고 등록 필수)
```

**길이 제한:**
| 타입 | 바이트 | 비용 | 특징 |
|------|--------|------|------|
| SMS | ~90byte | 기본 | 한글 45자 내외 |
| LMS | ~2000byte | 3배 | 제목 추가 가능 |
| MMS | ~2000byte+이미지 | 고가 | 이미지 첨부 가능 |

### 2. 이메일 발송 (Nodemailer)

**설정 파일:** `lib/email.ts`

```typescript
// 환경 변수
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=app-password

// 파트너별 설정 테이블
- AdminEmailConfig
- PartnerEmailConfig
- AffiliateEmailConfig
```

### 3. 카카오 알림톡

**API 경로:** `/api/admin/messages/send-kakao`

```typescript
// 카카오 알림톡 요청 구조
interface KakaoAlimtalkRequest {
  senderKey: string;    // 알림톡 발신키
  templateCode: string; // 등록된 템플릿 코드
  recipientList: {
    recipientNo: string;
    templateParameter: Record<string, string>;
  }[];
}
```

**주의:** 카카오 알림톡은 사전 승인된 템플릿만 발송 가능

## 치환 변수 시스템

### 사용 가능한 변수

```yaml
고객_변수:
  "{고객명}": "lead.name 또는 customer.name"
  "{연락처}": "lead.phone"
  "{이메일}": "lead.email"

상품_변수:
  "{상품명}": "product.name"
  "{출발일}": "product.departureDate"
  "{가격}": "product.price (포맷팅됨)"

파트너_변수:
  "{발신자명}": "partner.name 또는 affiliate.name"
  "{담당자}": "partner.contactName"

기타_변수:
  "{링크}": "설정된 URL 또는 단축 링크"
  "{날짜}": "현재 날짜"
```

### 치환 함수 위치

**Admin 메시지센터:** `app/admin/message-center/page.tsx`
**Partner 메시지센터:** `app/partner/[partnerId]/message-center/page.tsx`

```typescript
// 메시지 치환 함수 예시
function replaceVariables(content: string, customer: Customer): string {
  return content
    .replace(/{고객명}/g, customer.name || '')
    .replace(/{연락처}/g, customer.phone || '')
    .replace(/{상품명}/g, customer.product || '')
    .replace(/{링크}/g, linkUrl || '');
}
```

## 퍼널 메시지 템플릿

### 스케줄러 연동

```yaml
위치:
  정의: "FunnelMessage, FunnelMessageStage 테이블"
  스케줄러: "lib/scheduler/partnerFunnelSender.ts"
  간격: "매 5분마다 실행"

작동_방식:
  1. "고객이 그룹에 유입됨"
  2. "lib/funnel-scheduler.ts가 발송 예약 생성"
  3. "partnerFunnelSender가 예약 시간에 발송"
```

### 퍼널 단계별 메시지

```typescript
// FunnelMessageStage 구조
interface FunnelMessageStage {
  id: number;
  funnelMessageId: number;
  dayOffset: number;      // 유입 후 N일차
  hour: number;           // 발송 시간 (0-23)
  minute: number;         // 발송 분 (0-59)
  messageType: 'SMS' | 'EMAIL';
  content: string;        // 치환 변수 포함 가능
  subject?: string;       // 이메일 제목
  isActive: boolean;
}
```

## 예약 메시지 템플릿

### 스케줄러 연동

```yaml
위치:
  정의: "ScheduledMessage, ScheduledMessageStage 테이블"
  스케줄러: "lib/scheduler/scheduledMessageSender.ts"
  간격: "매 5분마다 실행"
```

### API 경로

```typescript
// 예약 메시지 관리
GET  /api/admin/scheduled-messages        // 목록 조회
POST /api/admin/scheduled-messages        // 생성
PUT  /api/admin/scheduled-messages/[id]   // 수정
DELETE /api/admin/scheduled-messages/[id] // 삭제

// 파트너용
GET  /api/partner/scheduled-messages
POST /api/partner/scheduled-messages
```

## 메시지 백업 시스템

### Google Spreadsheet 연동

**위치:** `lib/message-backup.ts`

```typescript
// 백업 데이터 구조
interface MessageBackupRow {
  timestamp: string;        // 발송 시간
  type: 'SMS' | 'EMAIL' | 'KAKAO';
  sender: string;           // 발신자 (파트너/판매원)
  recipient: string;        // 수신자 전화번호/이메일
  recipientName: string;    // 수신자 이름
  content: string;          // 메시지 내용
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;    // 실패 시 에러 메시지
}

// Google Drive 폴더 구조
/cruise-guide-backups
  /messages
    /2025-01 (월별 폴더)
      - SMS_발송기록.xlsx
      - EMAIL_발송기록.xlsx
```

### 백업 설정

```yaml
Google_Drive_설정:
  위치: "lib/config/drive-config.ts"
  폴더_ID: "환경 변수로 관리"
  권한: "서비스 계정 또는 OAuth"

백업_주기:
  실시간: "발송 성공 시 즉시 기록"
  일괄: "일 1회 정리 백업 (선택)"
```

## SMS 길이 검증

```typescript
// 바이트 계산 함수
export function checkSmsLength(message: string): {
  length: number;
  type: 'SMS' | 'LMS' | 'MMS';
  warning?: string;
} {
  // UTF-8 기준 한글 3byte, 영문/숫자 1byte
  const byteLength = new TextEncoder().encode(message).length;

  // 알리고 기준: EUC-KR (한글 2byte)
  const koreanCount = (message.match(/[가-힣]/g) || []).length;
  const etcCount = message.length - koreanCount;
  const aligoLength = (koreanCount * 2) + etcCount;

  if (aligoLength <= 90) {
    return { length: aligoLength, type: 'SMS' };
  } else if (aligoLength <= 2000) {
    return { length: aligoLength, type: 'LMS', warning: 'LMS 요금 적용' };
  } else {
    return { length: aligoLength, type: 'MMS', warning: '2000byte 초과' };
  }
}
```

## 템플릿 예시

### SMS 템플릿

```yaml
상담_안내:
  content: "[크루즈가이드] {고객명}님, 상담 신청 감사합니다. 담당자가 곧 연락드리겠습니다."
  length: "약 60byte (SMS)"

예약_확인:
  content: "[크루즈가이드] {고객명}님, {상품명} 예약이 완료되었습니다. 출발일: {출발일}"
  length: "약 70-100byte (SMS/LMS)"

퍼널_1일차:
  content: "{고객명}님, 크루즈 여행에 관심 가져주셔서 감사합니다. 궁금한 점은 언제든 문의해주세요!"
  length: "약 70byte (SMS)"
```

### 이메일 템플릿

```yaml
환영_이메일:
  subject: "{고객명}님, 크루즈가이드에 오신 것을 환영합니다"
  body: |
    안녕하세요 {고객명}님,

    크루즈가이드를 이용해 주셔서 감사합니다.
    담당 {발신자명}가 빠른 시일 내에 연락드리겠습니다.

    문의: {연락처}

견적서_안내:
  subject: "{상품명} 견적서 안내드립니다"
  body: |
    {고객명}님께,

    요청하신 {상품명} 견적서를 보내드립니다.

    - 출발일: {출발일}
    - 금액: {가격}

    자세한 내용은 첨부 파일을 확인해 주세요.
```

## 에러 처리

### 알리고 API 에러

| 코드 | 설명 | 해결 방법 |
|------|------|----------|
| -100 | 인증 실패 | API Key/User ID 확인 |
| -101 | IP 미등록 | 125.132.80.142 등록 |
| -102 | 잔액 부족 | 알리고 충전 필요 |
| -103 | 발신번호 미등록 | 발신번호 등록 필요 |

### 이메일 발송 에러

| 에러 | 설명 | 해결 방법 |
|------|------|----------|
| EAUTH | 인증 실패 | SMTP 설정 확인 |
| ECONNECTION | 연결 실패 | 네트워크/방화벽 확인 |
| EENVELOPE | 수신자 오류 | 이메일 주소 형식 확인 |

## 출력 형식

```markdown
## 📨 메시지 템플릿 분석

### 채널별 템플릿 현황

| 채널 | 템플릿 수 | 상태 |
|------|----------|------|
| SMS/LMS | 5개 | ✅ 정상 |
| 이메일 | 3개 | ✅ 정상 |
| 카카오 | 0개 | ⚠️ 미설정 |

### 치환 변수 사용 현황

| 변수 | 사용 횟수 | 필수 여부 |
|------|----------|----------|
| {고객명} | 12회 | 필수 |
| {상품명} | 8회 | 선택 |
| {링크} | 5회 | 선택 |

### 길이 검증 결과

| 템플릿명 | 바이트 | 타입 | 상태 |
|----------|--------|------|------|
| 상담_안내 | 62 | SMS | ✅ |
| 예약_확인 | 98 | LMS | ⚠️ |

### 권장 사항

1. SMS 90byte 초과 템플릿 → 문구 축소 검토
2. 미사용 변수 제거 ({할인가} 등)
3. 카카오 알림톡 템플릿 등록 권장
```

## 트리거 키워드

- "메시지 템플릿", "SMS 템플릿", "LMS 템플릿"
- "이메일 템플릿", "알림톡 템플릿"
- "치환 변수", "{고객명}", "{{변수}}"
- "메시지 백업", "발송 기록"
- "퍼널 메시지", "예약 발송"
