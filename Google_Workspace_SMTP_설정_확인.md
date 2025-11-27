# Google Workspace SMTP 설정 확인

## ✅ 현재 설정

```
EMAIL_SMTP_USER=jmonica@cruisedot.co.kr
EMAIL_SMTP_PASSWORD=jlie pjnn ndqh bcga
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
```

## 📋 SMTP 설정 확인

### ✅ 호스트 (HOST)
**`smtp.gmail.com`** - **정확합니다!**

- Google Workspace (구 G Suite) 이메일도 `smtp.gmail.com`을 사용합니다
- 개인 Gmail과 동일한 SMTP 서버를 사용합니다

### ✅ 포트 (PORT)
**`587`** - **정확합니다!**

- 포트 587: TLS/STARTTLS 사용 (권장)
- 포트 465: SSL 사용 (대안, 하지만 587 권장)
- 포트 25: 일반적으로 차단됨 (사용 비권장)

## 🔐 Google Workspace 앱 비밀번호

`jmonica@cruisedot.co.kr`는 Google Workspace 이메일입니다.

### 앱 비밀번호 생성 방법

1. **Google 계정 접속**
   - https://myaccount.google.com/ 접속
   - `jmonica@cruisedot.co.kr` 계정으로 로그인

2. **2단계 인증 확인**
   - 보안 → 2단계 인증이 활성화되어 있어야 함

3. **앱 비밀번호 생성**
   - https://myaccount.google.com/apppasswords
   - 또는 보안 → 2단계 인증 → 앱 비밀번호

4. **관리자 제한 확인**
   - Google Workspace 관리자가 앱 비밀번호를 허용했는지 확인
   - 관리자 콘솔에서 제한이 있을 수 있음

### 앱 비밀번호가 작동하지 않는 경우

**Google Workspace 관리자에게 문의:**
1. 관리자 콘솔에서 "앱 비밀번호" 허용 확인
2. 또는 "보안 수준이 낮은 앱 액세스" 허용 (비권장)

## 🧪 테스트 방법

### 1. 환경 변수 확인
```bash
# .env.local 파일 확인
cat .env.local | grep EMAIL_SMTP
```

### 2. 개발 서버 재시작
```bash
# 서버 중지 후 재시작
npm run dev
```

### 3. 비밀번호 찾기 테스트
1. http://localhost:3000/mall/find-password 접속
2. 이름과 연락처 입력
3. 이메일 입력: `jmonica@cruisedot.co.kr`
4. 비밀번호 전송 클릭

### 4. 이메일 확인
- `jmonica@cruisedot.co.kr` 받은편지함 확인
- 스팸함도 확인

## ⚠️ 주의사항

### 1. 앱 비밀번호 확인
- 현재 앱 비밀번호: `jlie pjnn ndqh bcga`
- 이 비밀번호가 `jmonica@cruisedot.co.kr` 계정의 앱 비밀번호인지 확인
- 다른 계정의 앱 비밀번호를 사용하면 인증 실패

### 2. Google Workspace 관리자 제한
- 관리자가 앱 비밀번호를 차단했을 수 있음
- 관리자에게 문의 필요

### 3. 발신자 이메일 설정
- `EMAIL_SMTP_FROM` 설정을 추가할 수 있습니다:
```bash
EMAIL_SMTP_FROM=크루즈닷 <jmonica@cruisedot.co.kr>
```

## 🔧 문제 해결

### 문제 1: "인증 실패" 오류

**해결:**
1. 앱 비밀번호가 `jmonica@cruisedot.co.kr` 계정의 것인지 확인
2. 2단계 인증이 활성화되어 있는지 확인
3. 관리자가 앱 비밀번호를 허용했는지 확인

### 문제 2: "연결 실패" 오류

**해결:**
1. `smtp.gmail.com`과 포트 `587`이 정확한지 확인 (현재 설정 정확함)
2. 방화벽에서 포트 587이 차단되지 않았는지 확인

### 문제 3: 이메일이 전송되지 않음

**해결:**
1. 서버 로그 확인 (터미널에서 `[Email]` 로그 확인)
2. 환경 변수가 올바르게 로드되었는지 확인
3. 서버 재시작 확인

## ✅ 최종 설정 확인

현재 설정이 올바릅니다:

```bash
EMAIL_SMTP_HOST=smtp.gmail.com    ✅ 정확함
EMAIL_SMTP_PORT=587                ✅ 정확함
EMAIL_SMTP_USER=jmonica@cruisedot.co.kr  ✅ 업데이트됨
EMAIL_SMTP_PASSWORD=jlie pjnn ndqh bcga  ✅ 설정됨
```

**다음 단계:**
1. 개발 서버 재시작
2. 비밀번호 찾기 테스트
3. 이메일 수신 확인

