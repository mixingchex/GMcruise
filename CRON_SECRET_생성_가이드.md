# CRON_SECRET 생성 및 설정 가이드 (초보자용)

Cron 작업(자동화 작업)의 보안을 위한 CRON_SECRET을 생성하고 설정하는 방법입니다.

---

## 📋 목차
1. [CRON_SECRET이란?](#1-cron_secret이란)
2. [강력한 랜덤 문자열 생성](#2-강력한-랜덤-문자열-생성)
3. [Vercel에 환경변수 추가](#3-vercel에-환경변수-추가)
4. [테스트 방법](#4-테스트-방법)

---

## 1. CRON_SECRET이란?

### 용도
- **Cron 작업 보안**: 자동화 작업(데이터베이스 백업, 커뮤니티 봇 등)이 외부에서 임의로 실행되지 않도록 보호
- **인증 토큰**: Vercel Cron이 작업을 실행할 때 이 비밀 키를 사용하여 인증

### 왜 필요한가?
- ❌ **없으면**: 누구나 Cron 작업 URL을 호출하여 실행 가능 (보안 위험!)
- ✅ **있으면**: 올바른 비밀 키를 가진 요청만 실행 가능 (안전!)

---

## 2. 강력한 랜덤 문자열 생성

### 방법 1: 온라인 생성기 사용 (가장 쉬움) ⭐ 추천

#### 2-1-1. Random.org 사용
1. 브라우저에서 다음 주소로 이동:
   ```
   https://www.random.org/strings/
   ```

2. 다음 설정 입력:
   - **How many random strings?**: `1`
   - **How many characters per string?**: `32` (또는 `64`)
   - **Which characters are allowed?**: 
     - ✅ **Alphanumeric** 선택
     - 또는 **Custom** 선택 후 `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*` 입력
   - **Each string should be**: `unique` 선택

3. **"Generate Strings"** 버튼 클릭

4. 생성된 문자열 복사 (예: `K8mN2pQ9rT5vW7xY1zA3bC5dE7fG9h`)

#### 2-1-2. RandomKeygen 사용
1. 브라우저에서 다음 주소로 이동:
   ```
   https://randomkeygen.com/
   ```

2. **"Fort Knox Password"** 또는 **"CodeIgniter Encryption Keys"** 섹션에서 생성된 키 복사
   - 길이: 32자 이상 권장

### 방법 2: 터미널/명령줄 사용 (Mac/Linux)

#### 2-2-1. OpenSSL 사용
터미널에서 다음 명령어 실행:
```bash
openssl rand -base64 32
```

**결과 예시**: `aB3cD5eF7gH9iJ1kL3mN5oP7qR9sT1uV3wX5yZ7=`

#### 2-2-2. /dev/urandom 사용
터미널에서 다음 명령어 실행:
```bash
cat /dev/urandom | tr -dc 'a-zA-Z0-9!@#$%^&*' | fold -w 32 | head -n 1
```

**결과 예시**: `K8mN2pQ9rT5vW7xY1zA3bC5dE7fG9h`

### 방법 3: Node.js 사용 (프로젝트 폴더에서)

#### 2-3-1. Node.js 명령어
프로젝트 폴더에서 터미널 열고 다음 명령어 실행:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**결과 예시**: `aB3cD5eF7gH9iJ1kL3mN5oP7qR9sT1uV3wX5yZ7=`

#### 2-3-2. 간단한 스크립트 생성
1. 프로젝트 폴더에 `generate-secret.js` 파일 생성:
```javascript
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('base64');
console.log('CRON_SECRET:', secret);
```

2. 터미널에서 실행:
```bash
node generate-secret.js
```

3. 생성된 값 복사

### 방법 4: Python 사용

터미널에서 다음 명령어 실행:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**결과 예시**: `aB3cD5eF7gH9iJ1kL3mN5oP7qR9sT1uV3wX5yZ7`

---

## 3. Vercel에 환경변수 추가

### 3-1. Vercel 대시보드 접속
1. 브라우저에서 Vercel 사이트 접속: https://vercel.com
2. 로그인
3. 프로젝트 선택 (cruise-guide 또는 해당 프로젝트)

### 3-2. 환경변수 설정 페이지 이동
1. 프로젝트 대시보드에서 **"Settings"** 클릭
2. 왼쪽 메뉴에서 **"Environment Variables"** 클릭

### 3-3. 환경변수 추가
1. **"Add New"** 또는 **"Add"** 버튼 클릭
2. 다음 정보 입력:
   - **Key (이름)**: `CRON_SECRET`
   - **Value (값)**: 생성한 랜덤 문자열 붙여넣기
     - 예: `K8mN2pQ9rT5vW7xY1zA3bC5dE7fG9h`
     - ⚠️ **주의**: 앞뒤 공백 없이 정확히 복사
   - **Environment**: 
     - ✅ **Production** 체크
     - ✅ **Preview** 체크
     - ✅ **Development** 체크
     - (또는 **"All"** 선택)

3. **"Save"** 버튼 클릭

### 3-4. 재배포
1. 환경변수 추가 후 자동으로 재배포가 시작될 수 있음
2. 재배포가 자동으로 시작되지 않으면:
   - **"Deployments"** 탭 클릭
   - 최신 배포 옆 **"..."** 메뉴 클릭
   - **"Redeploy"** 선택

---

## 4. 테스트 방법

### 4-1. Cron 작업 직접 테스트
터미널에서 다음 명령어 실행 (로컬 테스트):
```bash
curl -X POST https://your-domain.vercel.app/api/cron/community-bot \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```
- `your-domain.vercel.app`을 실제 도메인으로 교체
- `YOUR_CRON_SECRET`을 생성한 CRON_SECRET 값으로 교체

**성공 시**: 
```json
{"ok": true, "message": "커뮤니티 봇 실행 완료"}
```

**실패 시** (잘못된 키):
```json
{"ok": false, "error": "인증 실패"}
```

### 4-2. Vercel Cron 설정 확인
1. Vercel 대시보드 → **"Settings"** → **"Cron Jobs"**
2. Cron 작업 목록 확인
3. 각 작업이 정상적으로 실행되는지 확인

---

## ⚠️ 주의사항

### 보안 규칙
- ✅ **절대 공개하지 마세요**: 
  - GitHub, 공개 문서, 채팅 등에 업로드 금지
  - `.env.local` 파일도 `.gitignore`에 포함되어 있는지 확인
- ✅ **강력한 비밀번호 사용**: 
  - 최소 32자 이상
  - 영문 대소문자, 숫자, 특수문자 포함
- ✅ **정기적으로 변경**: 
  - 유출 의심 시 즉시 변경
  - 분기별 또는 반기별 변경 권장

### 비밀 키 관리
- ✅ **안전한 곳에 보관**: 
  - 비밀번호 관리자(1Password, LastPass 등)에 저장
  - 또는 암호화된 문서에 저장
- ✅ **백업**: 
  - 여러 곳에 안전하게 보관 (분실 방지)

### Vercel Cron 설정
- ✅ **올바른 Authorization 헤더**: 
  - Vercel Cron은 자동으로 `Authorization: Bearer {CRON_SECRET}` 헤더를 추가
  - 수동 호출 시에도 동일한 형식 사용

---

## 📝 체크리스트

- [ ] 강력한 랜덤 문자열 생성 완료 (32자 이상)
- [ ] 생성한 문자열 복사 및 안전한 곳에 보관
- [ ] Vercel 환경변수에 `CRON_SECRET` 추가
- [ ] Production, Preview, Development 모두 선택
- [ ] 재배포 완료
- [ ] Cron 작업 테스트 성공
- [ ] Vercel Cron Jobs에서 정상 실행 확인

---

## 🆘 문제 해결

### "인증 실패" 오류
- **원인**: CRON_SECRET이 일치하지 않음
- **해결**: 
  1. Vercel 환경변수에서 `CRON_SECRET` 값 확인
  2. 요청 시 사용한 값과 일치하는지 확인
  3. 앞뒤 공백이 없는지 확인
  4. 재배포 후 다시 테스트

### Cron 작업이 실행되지 않음
- **원인**: 환경변수가 설정되지 않았거나 재배포가 안 됨
- **해결**: 
  1. Vercel 환경변수 확인
  2. 재배포 실행
  3. Vercel Cron Jobs 설정 확인

### 비밀 키를 잊어버림
- **해결**: 
  1. Vercel 환경변수에서 값 확인 가능
  2. 또는 새로 생성하여 교체 (기존 Cron 작업도 업데이트 필요)

---

## 💡 추천 방법

**초보자에게 가장 추천하는 방법**:
1. **Random.org** 사용 (https://www.random.org/strings/)
2. 32자 이상, 영문+숫자 조합 생성
3. 생성된 값 복사
4. Vercel 환경변수에 추가
5. 안전한 곳에 백업 보관

**완료되면 Cron 작업이 안전하게 보호됩니다!** 🔒

