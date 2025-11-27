# 정액제 결제 테스트 가이드

## 결제 플로우 시뮬레이션

### 1. 결제 요청 API 테스트

**엔드포인트**: `POST /api/partner/subscription/payment`

**요청 헤더**:
```
Content-Type: application/json
Cookie: cg.sid.v2=<session_cookie>
```

**응답 예시 (성공)**:
```json
{
  "ok": true,
  "mul_no": "20240101123456",
  "payurl": "https://payapp.kr/pay/...",
  "qrurl": "https://payapp.kr/qr/..."
}
```

**응답 예시 (실패)**:
```json
{
  "ok": false,
  "message": "PayApp 설정이 완료되지 않았습니다.",
  "errno": "E001"
}
```

### 2. 결제 플로우 검증 체크리스트

#### ✅ API 엔드포인트 확인
- [x] `/api/partner/subscription/payment` 생성 완료
- [x] 세션 인증 확인 (`getSessionUser`)
- [x] 정액제 계약서 존재 확인
- [x] PayApp 환경변수 확인 (`PAYAPP_USERID`, `PAYAPP_LINKKEY`)

#### ✅ PayApp 요청 파라메터 확인
- [x] `cmd`: 'payrequest'
- [x] `goodname`: "정액제 판매원 1개월 구독 - {사용자명}"
- [x] `price`: 100000 (10만원)
- [x] `var1`: 계약서 ID
- [x] `var2`: 'SUBSCRIPTION_AGENT'
- [x] `feedbackurl`: `/api/payapp/feedback`
- [x] `returnurl`: `/partner/{mallUserId}/dashboard?payment=success`

#### ✅ PayApp 피드백 처리 확인
- [x] 결제 완료 시 (`pay_state: '4'`) 계약서 업데이트
- [x] 무료 체험 → 정식 구독 전환
- [x] `isTrial: false` 설정
- [x] `contractEndDate` 1개월 연장
- [x] 결제 정보 메타데이터 저장

### 3. 테스트 시나리오

#### 시나리오 1: 무료 체험 중 결제
1. gest1 계정으로 로그인 (무료 체험 시작)
2. 상단 배너에서 "정액제 구독하기" 버튼 클릭
3. PayApp 결제 페이지로 리다이렉트 확인
4. 결제 완료 시 피드백 API 호출 확인
5. 계약서 상태 변경 확인 (무료 체험 → 정식 구독)

#### 시나리오 2: 기능 제한 모달에서 결제
1. 무료 체험 중 제한된 기능 클릭
2. 기능 제한 모달 표시 확인
3. "정액제 구독하기" 버튼 클릭
4. PayApp 결제 페이지로 리다이렉트 확인

#### 시나리오 3: 튜토리얼 모달에서 결제
1. 첫 로그인 시 튜토리얼 모달 표시
2. "정액제 구독하기" 버튼 클릭
3. PayApp 결제 페이지로 리다이렉트 확인

### 4. 환경변수 확인

다음 환경변수가 설정되어 있어야 합니다:
- `PAYAPP_USERID`: PayApp 사용자 ID
- `PAYAPP_LINKKEY`: PayApp 링크 키
- `PAYAPP_LINKVAL`: PayApp 링크 값 (피드백 검증용)
- `NEXT_PUBLIC_BASE_URL`: 기본 URL (예: `http://localhost:3000`)

### 5. 결제 테스트 방법

#### 로컬 테스트
1. 환경변수 설정 확인
2. gest1 계정으로 로그인
3. "정액제 구독하기" 버튼 클릭
4. PayApp 결제 페이지 URL 확인
5. PayApp 테스트 모드로 결제 진행 (또는 실제 결제)

#### PayApp 피드백 시뮬레이션
```bash
curl -X POST http://localhost:3000/api/payapp/feedback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "userid=YOUR_PAYAPP_USERID&linkkey=YOUR_LINKKEY&linkval=YOUR_LINKVAL&pay_state=4&mul_no=TEST123&var1=CONTRACT_ID&var2=SUBSCRIPTION_AGENT&price=100000&pay_date=2024-01-01&pay_type=card"
```

### 6. 예상 오류 및 해결 방법

#### 오류 1: "PayApp 설정이 완료되지 않았습니다"
- **원인**: 환경변수 누락
- **해결**: `.env` 파일에 `PAYAPP_USERID`, `PAYAPP_LINKKEY` 설정

#### 오류 2: "정액제 계약서를 찾을 수 없습니다"
- **원인**: gest 계정에 정액제 계약서가 없음
- **해결**: 로그인 시 자동 생성되므로 재로그인

#### 오류 3: "결제 요청에 실패했습니다"
- **원인**: PayApp API 오류 또는 잘못된 파라메터
- **해결**: PayApp 설정 및 파라메터 확인

---

## Gest1 테스트 계정 특별 설정

### 로그인 시 자동 리셋
- **대상**: `gest1` 계정만
- **동작**: 로그인할 때마다 무료 체험 기간을 7일로 리셋
- **목적**: 테스트 편의성 향상

### 구현 로직
1. gest1 계정 로그인 감지
2. 기존 정액제 계약서 확인
3. 계약서가 있으면 무료 체험 기간 리셋 (7일 추가)
4. 계약서가 없으면 새로 생성 (7일 무료 체험)

### 리셋 내용
- `trialEndDate`: 현재 시간 + 7일
- `contractEndDate`: 현재 시간 + 7일
- `contractStartDate`: 현재 시간
- `isTrial`: `true`
- `status`: `'completed'`

---

**테스트 완료 후 실제 결제 전환 시 이 가이드를 참고하세요.**

