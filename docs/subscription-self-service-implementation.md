# 정액제 셀프 서비스 구현 완료 가이드

## ✅ 구현 완료 사항

### 1. 정액제 전용 로그인 페이지
**경로:** `/subscription/login`

**기능:**
- 이름, 연락처 입력
- 7일 무료 체험 자동 시작
- 구글 스프레드시트에 잠재고객 DB 자동 저장

**사용 방법:**
1. `/subscription/login` 접속
2. 이름과 연락처 입력
3. "7일 무료 체험 시작하기" 클릭
4. 자동으로 대시보드로 이동

### 2. 무료 체험 시작 API
**경로:** `/api/subscription/trial/start`

**기능:**
- 이름, 연락처로 임시 계정 생성
- 7일 무료 체험 계약서 자동 생성
- 구글 스프레드시트에 잠재고객 정보 저장

**구글 스프레드시트 설정:**
- 환경변수: `SUBSCRIPTION_PROSPECTS_SPREADSHEET_ID`
- 시트 이름: `Prospects`
- 컬럼: 이름, 연락처, 가입일시, 상태

### 3. 결제 전 이름/연락처 입력
**위치:** 정액제 대시보드 → "정액제 구독하기" 버튼 클릭

**기능:**
- 결제 전 이름, 연락처 입력 모달 표시
- 입력한 정보를 결제 요청과 함께 전송
- 계약서 메타데이터에 저장

### 4. 결제 후 자동 계약서 생성 및 개인몰 생성
**위치:** PayApp 피드백 API (`/api/payapp/feedback`)

**자동 처리 사항:**
1. 결제 완료 확인
2. 다음 gest 아이디 자동 생성 (gest1, gest2, ...)
3. 비밀번호 자동 생성 (8자리 랜덤)
4. User 계정 업데이트
5. AffiliateProfile 업데이트 (개인몰 URL 설정)
6. 계약서 업데이트 (이름, 연락처, 계정 정보)
7. 계약서 서명 페이지로 리다이렉트

## 🔄 전체 플로우

```
1. 사용자 접속
   ↓
2. /subscription/login 접속
   ↓
3. 이름, 연락처 입력
   ↓
4. 7일 무료 체험 시작
   - 임시 계정 생성 (trial_xxx)
   - 구글 스프레드시트에 잠재고객 정보 저장
   - 대시보드로 이동
   ↓
5. 무료 체험 중 기능 사용 (30% 기능)
   ↓
6. "정액제 구독하기" 버튼 클릭
   ↓
7. 이름, 연락처 입력 모달 표시
   ↓
8. 결제 진행 (PayApp)
   ↓
9. 결제 완료
   ↓
10. PayApp 피드백 API 호출
    ↓
11. 자동 처리:
    - gest 아이디 생성 (gest1, gest2, ...)
    - 비밀번호 자동 생성
    - User 계정 업데이트
    - AffiliateProfile 업데이트 (개인몰 생성)
    - 계약서 업데이트
    ↓
12. 계약서 서명 페이지로 리다이렉트
    (/affiliate/contract?type=SUBSCRIPTION_AGENT&contractId=xxx&payment=success)
    ↓
13. 서명 완료
    ↓
14. 정식 구독 시작 (50% 기능)
```

## 📝 환경변수 설정

### 필수 환경변수

```bash
# 구글 스프레드시트 (잠재고객 DB)
SUBSCRIPTION_PROSPECTS_SPREADSHEET_ID=your_spreadsheet_id_here

# 구글 인증 정보
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY=your_private_key

# PayApp 설정
PAYAPP_USERID=your_payapp_userid
PAYAPP_LINKKEY=your_payapp_linkkey
PAYAPP_LINKVAL=your_payapp_linkval
```

## 🎯 주요 기능

### 1. 무료 체험 계정
- 아이디/비밀번호 없이 휴대폰 번호로만 로그인
- 임시 계정 ID: `trial_xxx`
- 7일 무료 체험 자동 시작

### 2. 결제 후 자동 계정 생성
- gest 아이디 자동 생성 (gest1, gest2, ...)
- 비밀번호 자동 생성 (8자리 랜덤)
- 개인몰 자동 생성 (`/{mallUserId}/shop`)

### 3. 구글 스프레드시트 연동
- 잠재고객 정보 자동 저장
- 이름, 연락처, 가입일시, 상태 기록

## 🔍 확인 사항

### 구글 스프레드시트 설정
1. 구글 스프레드시트 생성
2. 시트 이름: `Prospects`
3. 헤더: 이름, 연락처, 가입일시, 상태
4. 스프레드시트 ID를 환경변수에 설정

### 테스트 방법
1. `/subscription/login` 접속
2. 이름, 연락처 입력 후 무료 체험 시작
3. 대시보드에서 "정액제 구독하기" 클릭
4. 이름, 연락처 입력 후 결제 진행
5. 결제 완료 후 계약서 서명 페이지 확인
6. 서명 완료 후 gest 아이디/비밀번호 확인

## ⚠️ 주의사항

1. **구글 스프레드시트 권한**
   - 서비스 계정에 스프레드시트 편집 권한 부여 필요

2. **gest 아이디 중복 방지**
   - 기존 gest 계정 중 가장 큰 번호 찾아서 +1

3. **비밀번호 전달**
   - 생성된 비밀번호는 계약서 서명 완료 후 표시 필요
   - 또는 이메일/SMS로 전송

4. **계약서 서명 필수**
   - 서명 완료 전까지는 계정 미활성화 상태 유지

