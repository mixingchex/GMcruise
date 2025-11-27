# Gmail SMTP 설정 가이드

크루즈닷 비밀번호 찾기 이메일 전송 기능을 위한 Gmail SMTP 설정 방법입니다.

---

## 📋 목차

1. [왜 앱 비밀번호가 필요한가?](#왜-앱-비밀번호가-필요한가)
2. [2단계 인증 활성화](#2단계-인증-활성화)
3. [앱 비밀번호 생성](#앱-비밀번호-생성)
4. [환경 변수 설정](#환경-변수-설정)
5. [테스트 방법](#테스트-방법)
6. [문제 해결](#문제-해결)

---

## 🔐 왜 앱 비밀번호가 필요한가?

Gmail은 보안을 위해 일반 비밀번호로는 외부 앱에서 로그인할 수 없습니다. 
대신 **앱 비밀번호(App Password)**를 사용해야 합니다.

- ✅ 앱 비밀번호: 외부 앱에서 Gmail 사용 가능
- ❌ 일반 비밀번호: 외부 앱에서 사용 불가 (보안 오류 발생)

---

## 1️⃣ 2단계 인증 활성화

앱 비밀번호를 생성하려면 먼저 2단계 인증을 활성화해야 합니다.

### 단계별 가이드

#### 1-1. Google 계정 접속
1. 웹 브라우저에서 [Google 계정](https://myaccount.google.com/) 접속
2. Google 계정에 로그인

#### 1-2. 보안 설정으로 이동
1. 왼쪽 메뉴에서 **"보안"** 클릭
   - 또는 직접 링크: https://myaccount.google.com/security

#### 1-3. 2단계 인증 찾기
1. **"Google에 로그인"** 섹션 찾기
2. **"2단계 인증"** 항목 찾기
   - 현재 상태가 "꺼짐" 또는 "OFF"로 표시됨

#### 1-4. 2단계 인증 활성화
1. **"2단계 인증"** 클릭
2. **"시작하기"** 버튼 클릭
3. 화면의 안내를 따라 진행:
   - 전화번호 입력 (SMS 인증용)
   - SMS로 받은 인증 코드 입력
   - 백업 코드 저장 (선택사항)
4. **"사용"** 버튼 클릭하여 활성화 완료

#### 1-5. 확인
- 2단계 인증 상태가 **"켜짐"** 또는 **"ON"**으로 변경되었는지 확인
- **⚠️ 중요: 2단계 인증 활성화 후 최소 5분 대기** (Google 시스템 반영 시간)
- 그 후에 앱 비밀번호 페이지에 접속해야 합니다

---

## 2️⃣ 앱 비밀번호 생성

2단계 인증이 활성화되면 앱 비밀번호를 생성할 수 있습니다.

### ⚠️ 중요: 2단계 인증 필수!

**앱 비밀번호를 생성하려면 반드시 2단계 인증이 활성화되어 있어야 합니다.**

만약 "앱 비밀번호를 사용할 수 없습니다" 오류가 나온다면:
1. 먼저 2단계 인증을 활성화하세요 (위의 1단계 참고)
2. 2단계 인증 활성화 후 **최소 5분 대기**
3. 다시 앱 비밀번호 페이지 접속

### 단계별 가이드

#### 2-1. 앱 비밀번호 페이지 접속
1. [앱 비밀번호 페이지](https://myaccount.google.com/apppasswords) 직접 접속
   - 또는 Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호

**⚠️ 만약 오류가 나온다면:**
- 2단계 인증이 활성화되어 있는지 확인
- 2단계 인증을 방금 활성화했다면 5분 정도 기다린 후 다시 시도

#### 2-2. 앱 선택
1. **"앱 선택"** 드롭다운 클릭
2. **"기타(맞춤 이름)"** 선택
3. 앱 이름 입력 (예: "크루즈닷 이메일 전송" 또는 "Cruise Guide SMTP")
4. **"생성"** 버튼 클릭

#### 2-3. 앱 비밀번호 확인
1. 16자리 비밀번호가 생성됩니다
   - 형식: `xxxx xxxx xxxx xxxx` (공백 포함)
   - 예시: `abcd efgh ijkl mnop`
2. **⚠️ 중요: 이 비밀번호를 복사하세요!**
   - 나중에 다시 볼 수 없습니다
   - 메모장이나 비밀번호 관리자에 저장 권장

#### 2-4. 비밀번호 복사
1. 생성된 16자리 비밀번호를 복사
2. **공백을 제거**하여 사용 (선택사항)
   - 예: `abcdefghijklmnop` (공백 없이)

---

## 3️⃣ 환경 변수 설정

생성한 앱 비밀번호를 환경 변수에 설정합니다.

### 3-1. 로컬 개발 환경 (.env.local)

프로젝트 루트의 `.env.local` 파일에 추가:

```bash
# Gmail SMTP 설정
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=abcdefghijklmnop
EMAIL_SMTP_FROM=크루즈닷 <your-email@gmail.com>

# 기본 URL (이메일 링크용)
NEXT_PUBLIC_BASE_URL=http://localhost:3001
```

**설정 예시:**
```bash
# 실제 예시 (본인의 정보로 변경)
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=cruisedot@gmail.com
EMAIL_SMTP_PASSWORD=abcd efgh ijkl mnop
EMAIL_SMTP_FROM=크루즈닷 <cruisedot@gmail.com>
NEXT_PUBLIC_BASE_URL=http://localhost:3001
```

**⚠️ 주의사항:**
- `EMAIL_SMTP_USER`: Gmail 주소 전체 입력 (예: `your-email@gmail.com`)
- `EMAIL_SMTP_PASSWORD`: 앱 비밀번호 16자리 (공백 포함 또는 제거 모두 가능)
- `.env.local` 파일은 Git에 커밋하지 마세요 (이미 `.gitignore`에 포함되어 있음)

### 3-2. Vercel 프로덕션 환경

#### Vercel 대시보드에서 설정

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 프로젝트 선택

2. **Settings → Environment Variables** 이동

3. **환경 변수 추가**
   - 각 변수를 하나씩 추가:
   
   | 변수 이름 | 값 | 예시 |
   |---------|-----|------|
   | `EMAIL_SMTP_HOST` | `smtp.gmail.com` | `smtp.gmail.com` |
   | `EMAIL_SMTP_PORT` | `587` | `587` |
   | `EMAIL_SMTP_USER` | Gmail 주소 | `cruisedot@gmail.com` |
   | `EMAIL_SMTP_PASSWORD` | 앱 비밀번호 | `abcdefghijklmnop` |
   | `EMAIL_SMTP_FROM` | 발신자 이름 | `크루즈닷 <cruisedot@gmail.com>` |
   | `NEXT_PUBLIC_BASE_URL` | 프로덕션 URL | `https://cruisedot.kr` |

4. **Environment 선택**
   - 각 변수에 대해 환경 선택:
     - ✅ Production
     - ✅ Preview
     - ✅ Development (선택사항)

5. **저장 후 재배포**
   - 환경 변수 저장 후 자동으로 재배포되거나
   - 수동으로 "Redeploy" 클릭

---

## 4️⃣ 테스트 방법

### 4-1. 로컬 환경 테스트

1. **개발 서버 실행**
   ```bash
   npm run dev
   ```

2. **비밀번호 찾기 페이지 접속**
   - http://localhost:3001/mall/find-password

3. **테스트 진행**
   - 이름과 연락처 입력
   - 아이디 찾기
   - 이메일 입력
   - 비밀번호 전송 클릭

4. **이메일 확인**
   - 입력한 이메일 주소의 받은편지함 확인
   - 스팸함도 확인 (처음에는 스팸으로 분류될 수 있음)

### 4-2. 프로덕션 환경 테스트

1. **배포 확인**
   - Vercel에서 배포 완료 확인

2. **프로덕션 URL에서 테스트**
   - https://cruisedot.kr/mall/find-password

3. **이메일 확인**
   - 실제 이메일로 전송되는지 확인

---

## 5️⃣ 문제 해결

### 문제 0: "앱 비밀번호를 사용할 수 없습니다" 오류 ⚠️

**증상:**
```
찾고 있는 설정을 계정에서 사용할 수 없습니다.
```

**원인:**
1. ❌ 2단계 인증이 활성화되지 않음 (가장 흔한 원인)
2. ❌ Google Workspace 계정인 경우 관리자 제한
3. ❌ 개인 Gmail 계정이 아님

**해결 방법:**

#### 방법 1: 2단계 인증 확인 및 활성화

1. **2단계 인증 상태 확인**
   - https://myaccount.google.com/security 접속
   - "2단계 인증" 항목 찾기
   - 상태가 **"켜짐"** 또는 **"ON"**인지 확인

2. **2단계 인증이 꺼져 있다면**
   - "2단계 인증" 클릭
   - "시작하기" 버튼 클릭
   - 전화번호 입력 및 인증 코드 입력
   - 완료 후 다시 앱 비밀번호 페이지 접속

3. **2단계 인증 활성화 후 확인**
   - 2단계 인증 활성화 후 **최소 5분 대기** (Google 시스템 반영 시간)
   - 다시 https://myaccount.google.com/apppasswords 접속

#### 방법 2: Google Workspace 계정인 경우

**Google Workspace (기업용 Gmail)을 사용하는 경우:**

1. **관리자에게 문의**
   - Google Workspace 관리자가 앱 비밀번호를 허용해야 함
   - 관리자 콘솔에서 설정 변경 필요

2. **대안: 개인 Gmail 계정 사용**
   - 개인 Gmail 계정으로 새로 만들기
   - 또는 기업 이메일의 SMTP 서버 사용 (IT 부서에 문의)

#### 방법 3: OAuth 2.0 사용 (고급)

앱 비밀번호 대신 OAuth 2.0을 사용할 수도 있지만, 설정이 복잡합니다.
일반적으로는 앱 비밀번호가 더 간단합니다.

#### 방법 4: 다른 이메일 서비스 사용

Gmail 대신 다른 이메일 서비스를 사용할 수도 있습니다:

**네이버 메일:**
```bash
EMAIL_SMTP_HOST=smtp.naver.com
EMAIL_SMTP_PORT=465
EMAIL_SMTP_USER=your-email@naver.com
EMAIL_SMTP_PASSWORD=네이버_비밀번호
```

**다음 메일:**
```bash
EMAIL_SMTP_HOST=smtp.daum.net
EMAIL_SMTP_PORT=465
EMAIL_SMTP_USER=your-email@hanmail.net
EMAIL_SMTP_PASSWORD=다음_비밀번호
```

**Outlook/Hotmail:**
```bash
EMAIL_SMTP_HOST=smtp-mail.outlook.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@outlook.com
EMAIL_SMTP_PASSWORD=Outlook_비밀번호
```

---

### 문제 1: "인증 실패" 오류

**증상:**
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**해결 방법:**
1. ✅ 2단계 인증이 활성화되어 있는지 확인
2. ✅ 앱 비밀번호를 사용하고 있는지 확인 (일반 비밀번호 X)
3. ✅ 앱 비밀번호에 공백이 포함되어 있으면 제거하거나 그대로 사용
4. ✅ `EMAIL_SMTP_USER`에 Gmail 주소 전체 입력 확인

### 문제 2: "연결 시간 초과" 오류

**증상:**
```
Error: Connection timeout
```

**해결 방법:**
1. ✅ 방화벽이나 네트워크에서 포트 587이 차단되지 않았는지 확인
2. ✅ `EMAIL_SMTP_PORT=587` 확인 (465도 가능하지만 587 권장)
3. ✅ `EMAIL_SMTP_HOST=smtp.gmail.com` 확인

### 문제 3: 이메일이 스팸으로 분류됨

**해결 방법:**
1. ✅ 발신자 이메일 주소를 신뢰할 수 있는 주소로 설정
2. ✅ `EMAIL_SMTP_FROM`에 명확한 이름과 이메일 설정
3. ✅ 처음 몇 개는 스팸으로 분류될 수 있음 (정상)
4. ✅ 사용자가 스팸함에서 찾아서 "스팸 아님" 표시

### 문제 4: "SMTP 설정이 없습니다" 경고

**증상:**
```
[Email] SMTP 설정이 없습니다. 이메일 전송 기능을 사용할 수 없습니다.
```

**해결 방법:**
1. ✅ `.env.local` 파일에 환경 변수가 제대로 설정되어 있는지 확인
2. ✅ 변수 이름이 정확한지 확인 (대소문자 구분)
3. ✅ 개발 서버를 재시작 (`npm run dev` 중지 후 다시 시작)
4. ✅ Vercel에서는 환경 변수 저장 후 재배포 필요

### 문제 5: 앱 비밀번호 생성 옵션이 보이지 않음

**해결 방법:**
1. ✅ 2단계 인증이 활성화되어 있는지 확인
2. ✅ Google Workspace 계정인 경우 관리자가 앱 비밀번호를 허용해야 함
3. ✅ 개인 Gmail 계정 사용 권장

---

## 📝 체크리스트

설정 완료 확인:

- [ ] 2단계 인증 활성화 완료
- [ ] 앱 비밀번호 생성 완료 (16자리)
- [ ] `.env.local` 파일에 환경 변수 설정
- [ ] Vercel 환경 변수 설정 (프로덕션)
- [ ] 개발 서버 재시작
- [ ] 테스트 이메일 전송 성공
- [ ] 이메일 수신 확인

---

## 🔗 참고 링크

- [Google 계정 보안](https://myaccount.google.com/security)
- [앱 비밀번호 생성](https://myaccount.google.com/apppasswords)
- [Gmail SMTP 설정](https://support.google.com/mail/answer/7126229)
- [Vercel 환경 변수 설정](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 💡 추가 팁

### 보안 권장사항

1. **앱 비밀번호 관리**
   - 앱 비밀번호는 일반 비밀번호와 별도로 관리
   - 필요 없으면 삭제 가능 (앱 비밀번호 페이지에서)

2. **환경 변수 보안**
   - `.env.local` 파일은 절대 Git에 커밋하지 않기
   - Vercel 환경 변수는 암호화되어 저장됨

3. **이메일 발신자 설정**
   - `EMAIL_SMTP_FROM`에 명확한 이름과 이메일 설정
   - 예: `크루즈닷 <noreply@cruisedot.kr>`

### 다른 이메일 서비스 사용 시

Gmail 외에 다른 이메일 서비스를 사용할 수도 있습니다:

- **Outlook/Hotmail**: `smtp-mail.outlook.com`, 포트 587
- **네이버 메일**: `smtp.naver.com`, 포트 465
- **다음 메일**: `smtp.daum.net`, 포트 465
- **기업 이메일**: 회사 IT 부서에 SMTP 설정 문의

각 서비스마다 SMTP 설정이 다르므로 해당 서비스의 문서를 참고하세요.

---

## ✅ 완료!

이제 Gmail SMTP 설정이 완료되었습니다. 비밀번호 찾기 기능이 정상적으로 작동할 것입니다!

문제가 발생하면 위의 "문제 해결" 섹션을 참고하거나, 로그를 확인해보세요.

