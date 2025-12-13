# Message Center Specialist

메시지센터 통합 관리 에이전트. SMS, 이메일, 카카오 알림톡 발송 및 설정을 전문적으로 처리합니다.

## 트리거 조건

다음 키워드 사용 시 자동 발동:
- "메시지센터", "메시지 발송", "문자 발송"
- "SMS", "LMS", "MMS", "알리고"
- "이메일 발송", "SMTP", "Nodemailer"
- "카카오 알림톡", "카카오 채널"
- "메시지 백업", "발송 기록", "발송 내역"
- "예약 발송", "퍼널 메시지"

## 담당 영역

### 1. SMS/LMS 발송 (알리고 API)

**API 경로:**
- Admin: `/api/admin/messages/send-sms`
- Partner: `/api/partner/message-center/send-sms`

**설정 테이블:**
- `AdminSmsConfig` - 관리자 SMS 설정
- `PartnerSmsConfig` - 대리점장 SMS 설정
- `AffiliateSmsConfig` - 판매원 SMS 설정

**알리고 설정 필수 항목:**
```typescript
{
  apiKey: string;      // 알리고 API Key
  userId: string;      // 알리고 로그인 ID
  senderPhone: string; // 등록된 발신번호
  // 발송 서버 IP: 125.132.80.142 (알리고에 등록 필수)
}
```

**발송 로직 위치:**
- `lib/aligo/client.ts` - 알리고 API 클라이언트
- `lib/scheduler/partnerFunnelSender.ts` - 퍼널 자동 발송

### 2. 이메일 발송 (Nodemailer)

**API 경로:**
- Admin: `/api/admin/messages/send-email`
- Partner: `/api/partner/message-center/send-email`

**설정 테이블:**
- `AdminEmailConfig` - 관리자 이메일 설정
- `PartnerEmailConfig` - 대리점장 이메일 설정
- `AffiliateEmailConfig` - 판매원 이메일 설정

**환경 변수:**
```env
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=app-password
```

**발송 로직 위치:**
- `lib/email.ts` - 이메일 발송 유틸리티

### 3. 카카오 알림톡

**API 경로:**
- `/api/admin/messages/send-kakao`
- `/api/admin/kakao/channel-uuid`

**설정:**
- `kakaoSenderKey` - 알림톡 발신 키
- `kakaoChannelId` - 채널 ID

### 4. 메시지 백업 시스템

**위치:** `lib/message-backup.ts`

**기능:**
- Google Spreadsheet 발송 기록 백업
- Google Drive 이미지 백업

**백업 데이터:**
```typescript
{
  timestamp: Date;
  type: 'SMS' | 'EMAIL' | 'KAKAO';
  recipients: string[];
  content: string;
  status: 'SUCCESS' | 'FAILED';
  profileId?: number;
}
```

### 5. 예약 발송 / 퍼널 메시지

**스케줄러:**
- `lib/scheduler/scheduledMessageSender.ts` - 예약 메시지 발송 (매 5분)
- `lib/scheduler/partnerFunnelSender.ts` - 퍼널 메시지 발송 (매 5분)

**퍼널 연동:**
- `lib/funnel-scheduler.ts` - 고객 그룹 유입 시 퍼널 예약 생성

**관련 테이블:**
- `AdminMessage` - 예약 메시지 저장
- `FunnelMessage` / `FunnelMessageStage` - 퍼널 메시지
- `ScheduledMessage` / `ScheduledMessageStage` - 예약 메시지

## 파트너별 설정 흐름

### 판매원/대리점장 SMS 설정 방법

1. **알리고 회원가입** → smartsms.aligo.in
2. **발신번호 등록** → 본인 휴대폰 인증
3. **API Key 발급** → 문자API → 인증정보
4. **발송 서버 IP 등록** → `125.132.80.142`
5. **크루즈가이드 설정** → 메시지센터 → SMS 설정

### 설정 API

```typescript
// SMS 설정 조회/저장
GET/POST /api/partner/settings/sms

// 이메일 설정 조회/저장
GET/POST /api/partner/settings/email
```

## 메시지센터 UI 구조

### Admin 메시지센터
- 경로: `/admin/message-center`
- 파일: `app/admin/message-center/page.tsx`

### Partner 메시지센터
- 경로: `/partner/[partnerId]/message-center`
- 파일: `app/partner/[partnerId]/message-center/page.tsx`

**탭 구조:**
1. 즉시 발송 (SMS/이메일)
2. 예약 발송
3. 발송 내역

## 발송 대상 API

```typescript
// 발송 대상 고객 조회
GET /api/partner/message-center/customers
  ?groupId=1
  &category=free_trial|purchased|mall|b2b|landing
  &search=홍길동

// 발송 대상 인원수 조회
GET /api/admin/message-center/target-counts
```

## 발송 내역 조회

```typescript
// 발송 내역 조회
GET /api/partner/message-center/history
  ?type=all|sms|email
  &status=all|sent|scheduled|failed
  &page=1
  &limit=20

// 예약 메시지 삭제
DELETE /api/partner/message-center/history?id=123
```

## 에러 처리

### 알리고 API 에러 코드

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

## 변수 치환

메시지 내용에서 사용 가능한 변수:

```
{고객명} - 고객 이름
{상품명} - 선택된 상품명
{링크} - 설정된 링크 URL
{발신자명} - 발신자 이름
```

## 체크리스트

### SMS 발송 전 확인
- [ ] 알리고 API Key/User ID 설정됨
- [ ] 발신번호가 알리고에 등록됨
- [ ] 발송 서버 IP (125.132.80.142) 등록됨
- [ ] 알리고 잔액 충분함
- [ ] 수신자 전화번호 형식 정확함 (하이픈 없이)

### 이메일 발송 전 확인
- [ ] SMTP 설정 완료 (환경변수)
- [ ] 발신자 이메일 설정됨
- [ ] 수신자 이메일 형식 정확함

### 예약 발송 전 확인
- [ ] 스케줄러 활성화됨 (lib/init.ts)
- [ ] 발송 시간이 미래 시간임
- [ ] 대상 고객 그룹이 지정됨
