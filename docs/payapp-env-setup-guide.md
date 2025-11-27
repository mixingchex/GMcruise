# PayApp 환경변수 설정 가이드

# PayApp 환경변수 설정 가이드

## 📋 개요

정액제 결제 시스템은 **관리자 패널에서 설정한 PayApp 값**을 사용합니다. 관리자 패널에서 저장하면 자동으로 Vercel 환경변수에도 동기화됩니다.

## ✅ 현재 설정된 값 (확인됨)

다음 PayApp 설정이 관리자 패널에 등록되어 있습니다:

- **PAYAPP_USERID**: `hyeseon28`
- **PAYAPP_LINKKEY**: `CPe1Qyvoll6bPRHfd5pTZO1DPJnCCRVaOgT+oqg6zaM=`
- **PAYAPP_LINKVAL**: `CPe1Qyvoll6bPRHfd5pTZJKhziNbvfVO9tbzpmrIe6s=`

이 값들은 관리자 패널(`/admin/settings`)에서 확인하고 수정할 수 있으며, 수정 시 자동으로 Vercel 환경변수에 동기화됩니다.

---

## 🔍 현재 설정 확인 방법

### 관리자 패널에서 확인

1. **관리자 패널 접속**
   - URL: `/admin/settings`
   - 관리자 계정으로 로그인 필요

2. **페이앱 결제 설정 섹션 찾기**
   - 페이지를 스크롤하여 "💳 페이앱 결제 설정" 섹션 찾기
   - 또는 Ctrl+F (Cmd+F)로 "페이앱" 검색

3. **현재 설정된 값 확인**
   - **사용자 ID** (`payappUserid`): PayApp 사용자 ID (평문으로 표시)
   - **Link Key** (`payappLinkkey`): PayApp 링크 키 (비밀번호 형식으로 마스킹, 👁️ 아이콘으로 확인 가능)
   - **Link Value** (`payappLinkval`): PayApp 링크 값 (비밀번호 형식으로 마스킹, 👁️ 아이콘으로 확인 가능)

4. **값 복사하기**
   - 각 필드 옆의 복사 버튼 클릭하여 값 복사 가능

### 환경변수 매핑 관계

관리자 패널의 필드명과 실제 환경변수명의 매핑:

| 관리자 패널 필드명 | 환경변수명 | 설명 | 사용 위치 |
|------------------|-----------|------|----------|
| `payappUserid` | `PAYAPP_USERID` | PayApp 사용자 ID | 모든 PayApp API |
| `payappLinkkey` | `PAYAPP_LINKKEY` | PayApp 링크 키 | 모든 PayApp API |
| `payappLinkval` | `PAYAPP_LINKVAL` | PayApp 링크 값 (피드백 검증용) | 피드백 API만 |

### 코드에서 사용되는 위치

1. **정액제 결제 API**: `app/api/partner/subscription/payment/route.ts`
   ```typescript
   const payappUserid = process.env.PAYAPP_USERID;
   const payappLinkkey = process.env.PAYAPP_LINKKEY;
   ```

2. **PayApp 피드백 API**: `app/api/payapp/feedback/route.ts`
   ```typescript
   const payappUserid = process.env.PAYAPP_USERID;
   const payappLinkkey = process.env.PAYAPP_LINKKEY;
   const payappLinkval = process.env.PAYAPP_LINKVAL; // 피드백 검증용
   ```

3. **PayApp 요청 API**: `app/api/payapp/request/route.ts`
   ```typescript
   const payappUserid = process.env.PAYAPP_USERID;
   const payappLinkkey = process.env.PAYAPP_LINKKEY;
   ```

---

## ✅ 관리자 패널에서 설정하기 (권장)

### 설정 방법

1. **관리자 패널 접속**
   - URL: `/admin/settings`
   - 관리자 계정으로 로그인 필요

2. **페이앱 결제 설정 섹션 찾기**
   - 페이지를 스크롤하여 "💳 페이앱 결제 설정" 섹션 찾기
   - 또는 Ctrl+F (Cmd+F)로 "페이앱" 검색

3. **수정하기 버튼 클릭**
   - "페이앱 결제 설정" 섹션의 **"수정하기"** 버튼 클릭 (파란색 버튼)

4. **값 입력**
   - **사용자 ID** (`payappUserid`): PayApp에서 발급받은 사용자 ID 입력
   - **Link Key** (`payappLinkkey`): PayApp에서 발급받은 링크 키 입력 (비밀번호 형식)
   - **Link Value** (`payappLinkval`): PayApp에서 발급받은 링크 값 입력 (비밀번호 형식)
   - 👁️ 아이콘을 클릭하면 비밀번호 형식의 값도 확인 가능

5. **저장하기 버튼 클릭**
   - **"저장하기"** 버튼 클릭 (초록색 버튼)
   - 저장하면 자동으로:
     - ✅ 로컬 `.env.local` 파일에 저장
     - ✅ Vercel 환경변수에 자동 동기화 (VERCEL_API_TOKEN 설정 시)
   - 저장 완료 메시지 확인:
     - "저장되었습니다."
     - "✅ Vercel 자동 업데이트: 3개 환경변수 업데이트 완료" (자동 동기화 성공 시)

**⚠️ 중요**: Vercel 자동 동기화를 사용하려면 다음 환경변수가 필요합니다:
- `VERCEL_API_TOKEN`: Vercel API 토큰 (Vercel 대시보드 → Settings → Tokens에서 발급)
- `VERCEL_PROJECT_ID` 또는 `NEXT_PUBLIC_VERCEL_PROJECT_ID`: Vercel 프로젝트 ID (프로젝트 설정에서 확인)

**자동 동기화 작동 방식**:
1. 관리자 패널에서 PayApp 설정 저장
2. `.env.local` 파일에 자동 저장
3. `VERCEL_API_TOKEN`과 `VERCEL_PROJECT_ID`가 설정되어 있으면:
   - ✅ Vercel 환경변수에 자동 동기화
   - ✅ 저장 완료 메시지에 "✅ Vercel 자동 업데이트: 3개 환경변수 업데이트 완료" 표시
4. 설정되어 있지 않으면:
   - ⚠️ 로컬만 저장, 경고 메시지 표시
   - 수동으로 Vercel 대시보드에서 설정 필요 (아래 "Vercel 수동 설정 방법" 참고)

**현재 설정된 PayApp 값**:
- 관리자 패널에서 이미 설정된 값이 표시됩니다
- 수정 시 자동으로 Vercel에 동기화됩니다 (VERCEL_API_TOKEN 설정 시)

---

## 🔧 Vercel 수동 설정 방법

자동 동기화가 작동하지 않거나 수동으로 설정하려면:

### 1. Vercel 대시보드 접속

1. https://vercel.com/dashboard 접속
2. 로그인

### 2. 프로젝트 선택

1. 해당 프로젝트 클릭
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Environment Variables** 클릭

### 3. 환경변수 추가

다음 3개의 환경변수를 추가하세요:

#### 환경변수 1: PAYAPP_USERID
- **Key**: `PAYAPP_USERID`
- **Value**: `hyeseon28` (현재 설정된 실제 값)
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

#### 환경변수 2: PAYAPP_LINKKEY
- **Key**: `PAYAPP_LINKKEY`
- **Value**: `CPe1Qyvoll6bPRHfd5pTZO1DPJnCCRVaOgT+oqg6zaM=` (현재 설정된 실제 값)
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

#### 환경변수 3: PAYAPP_LINKVAL
- **Key**: `PAYAPP_LINKVAL`
- **Value**: `CPe1Qyvoll6bPRHfd5pTZJKhziNbvfVO9tbzpmrIe6s=` (현재 설정된 실제 값)
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

**⚠️ 중요**: 관리자 패널(`/admin/settings`)에서 PayApp 설정을 수정하면 자동으로 Vercel 환경변수에 동기화됩니다. 따라서 수동 설정은 자동 동기화가 작동하지 않을 때만 필요합니다.

### 4. 저장 및 배포

1. 각 환경변수 입력 후 **Save** 클릭
2. 변경사항 적용을 위해 **새 배포** 필요 (자동 배포 또는 수동 배포)

---

## 📊 전체 데이터 흐름

### 1. 설정 저장 흐름

```
[관리자 패널] /admin/settings
   ↓
1. "페이앱 결제 설정" 섹션에서 "수정하기" 클릭
   ↓
2. payappUserid, payappLinkkey, payappLinkval 값 입력
   ↓
3. "저장하기" 버튼 클릭
   ↓
4. /api/admin/settings/update API 호출
   ↓
5. 환경변수 매핑:
   - payappUserid → PAYAPP_USERID
   - payappLinkkey → PAYAPP_LINKKEY
   - payappLinkval → PAYAPP_LINKVAL
   ↓
6. .env.local 파일에 저장
   ├─ PAYAPP_USERID=입력한값
   ├─ PAYAPP_LINKKEY=입력한값
   └─ PAYAPP_LINKVAL=입력한값
   ↓
7. Vercel API 호출 (자동 동기화)
   ├─ VERCEL_API_TOKEN 있으면 → Vercel 환경변수 업데이트
   └─ 없으면 → 로컬만 저장, 경고 메시지 표시
```

### 2. 설정 조회 흐름

```
[관리자 패널] /admin/settings 페이지 로드
   ↓
1. /api/admin/settings/info API 호출
   ↓
2. process.env에서 값 읽기:
   - process.env.PAYAPP_USERID → payappUserid
   - process.env.PAYAPP_LINKKEY → payappLinkkey
   - process.env.PAYAPP_LINKVAL → payappLinkval
   ↓
3. 관리자 패널에 표시
   - 사용자 ID: 평문으로 표시
   - Link Key: 비밀번호 형식으로 마스킹
   - Link Value: 비밀번호 형식으로 마스킹
```

### 3. 결제 시 사용 흐름

```
[사용자] "정액제 구독하기" 버튼 클릭
   ↓
1. 결제 확인 모달 표시
   "이 플랫폼은 크루즈닷과 함께 하는 (주)마비즈컴퍼니 마비즈스쿨 원격 평생교육원 회원으로 가입하며 마케팅 서비스 제공 회원으로 가입하게 됩니다."
   ↓
2. "확인하고 결제하기" 클릭
   ↓
3. /api/partner/subscription/payment API 호출
   ↓
4. process.env.PAYAPP_USERID 읽기
   ↓
5. process.env.PAYAPP_LINKKEY 읽기
   ↓
6. PayApp API 호출 (payappApiPost)
   ↓
7. PayApp 결제 페이지 URL 반환
   ↓
8. 사용자를 PayApp 결제 페이지로 리다이렉트
   ↓
9. 결제 완료 시 PayApp이 /api/payapp/feedback 호출
   ↓
10. process.env.PAYAPP_LINKVAL로 검증
   ↓
11. 계약서 업데이트 (무료 체험 → 정식 구독)
```

---

## 📝 환경변수 상세 설명

### PAYAPP_USERID
- **관리자 패널 필드명**: `payappUserid`
- **환경변수명**: `PAYAPP_USERID`
- **설명**: PayApp에서 발급받은 사용자 ID
- **형식**: 문자열
- **예시**: `mabiz2024`
- **필수**: ✅ 예
- **사용 위치**: 
  - `app/api/partner/subscription/payment/route.ts` (정액제 결제)
  - `app/api/payapp/request/route.ts` (일반 결제)
  - `app/api/payapp/feedback/route.ts` (피드백 검증)

### PAYAPP_LINKKEY
- **관리자 패널 필드명**: `payappLinkkey`
- **환경변수명**: `PAYAPP_LINKKEY`
- **설명**: PayApp에서 발급받은 링크 키
- **형식**: 문자열 (비밀번호 형식으로 표시)
- **예시**: `abc123def456`
- **필수**: ✅ 예
- **사용 위치**: 
  - `app/api/partner/subscription/payment/route.ts` (정액제 결제)
  - `app/api/payapp/request/route.ts` (일반 결제)
  - `app/api/payapp/feedback/route.ts` (피드백 검증)

### PAYAPP_LINKVAL
- **관리자 패널 필드명**: `payappLinkval`
- **환경변수명**: `PAYAPP_LINKVAL`
- **설명**: PayApp 피드백 검증용 링크 값
- **형식**: 문자열 (비밀번호 형식으로 표시)
- **예시**: `xyz789uvw012`
- **필수**: ✅ 예 (피드백 API 검증용)
- **사용 위치**: 
  - `app/api/payapp/feedback/route.ts` (피드백 검증만)

---

## 📝 로컬 개발 환경 설정 (선택)

로컬에서 테스트하려면 프로젝트 루트에 `.env.local` 파일을 생성하세요:

```bash
# PayApp 결제 설정
PAYAPP_USERID=your_payapp_userid
PAYAPP_LINKKEY=your_payapp_linkkey
PAYAPP_LINKVAL=your_payapp_linkval

# 기본 URL (로컬 개발용)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**주의**: `.env.local` 파일은 Git에 커밋하지 마세요 (이미 `.gitignore`에 포함됨)

---

## 🔑 PayApp 계정 설정 방법

1. **PayApp 가입 및 로그인**
   - PayApp 공식 사이트 (https://payapp.kr) 접속
   - 회원가입 또는 기존 계정으로 로그인

2. **API 키 발급**
   - 관리자 페이지 → API 설정 메뉴
   - `userid`, `linkkey`, `linkval` 발급받기

3. **관리자 패널에 입력**
   - 발급받은 값을 관리자 패널(`/admin/settings`)에 입력
   - 또는 `.env.local` 파일에 직접 입력 (로컬 개발용)

---

## ✅ 설정 확인 체크리스트

### 관리자 패널에서 확인
- [ ] `/admin/settings` 페이지 접속 가능
- [ ] "💳 페이앱 결제 설정" 섹션 확인
- [ ] `payappUserid` 값이 입력되어 있음
- [ ] `payappLinkkey` 값이 입력되어 있음
- [ ] `payappLinkval` 값이 입력되어 있음

### Vercel에서 확인
- [ ] Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
- [ ] `PAYAPP_USERID` 환경변수 존재 및 값 확인
- [ ] `PAYAPP_LINKKEY` 환경변수 존재 및 값 확인
- [ ] `PAYAPP_LINKVAL` 환경변수 존재 및 값 확인
- [ ] Production, Preview 환경에 모두 설정되어 있음

### 로컬에서 확인 (개발 환경)
- [ ] `.env.local` 파일 존재
- [ ] `PAYAPP_USERID=값` 형식으로 설정됨
- [ ] `PAYAPP_LINKKEY=값` 형식으로 설정됨
- [ ] `PAYAPP_LINKVAL=값` 형식으로 설정됨
- [ ] 개발 서버 재시작 후 적용 확인

### 결제 테스트
- [ ] gest1 계정으로 로그인
- [ ] "정액제 구독하기" 버튼 클릭
- [ ] 결제 확인 모달 표시 확인
- [ ] PayApp 결제 페이지로 리다이렉트 확인
- [ ] 결제 완료 후 피드백 API 호출 확인

---

## 🛠️ 문제 해결

### 오류: "PayApp 설정이 완료되지 않았습니다"
- **원인**: 환경변수가 설정되지 않음
- **해결**: 
  1. 관리자 패널(`/admin/settings`)에서 PayApp 설정 확인
  2. Vercel 환경변수 확인
  3. `.env.local` 파일 확인 (로컬 개발 환경)

### 오류: "결제 요청에 실패했습니다"
- **원인**: 잘못된 PayApp 키 또는 네트워크 오류
- **해결**: 
  1. PayApp 키 확인 (관리자 패널에서 복사하여 확인)
  2. PayApp 관리자 페이지에서 API 상태 확인
  3. 네트워크 연결 확인

### 환경변수가 적용되지 않음
- **해결**: 
  1. 개발 서버 재시작 (`npm run dev`)
  2. `.env.local` 파일 위치 확인 (프로젝트 루트)
  3. 파일명 확인 (`.env.local` 또는 `.env`)
  4. Vercel의 경우 새 배포 필요

### Vercel 자동 동기화가 작동하지 않음
- **원인**: VERCEL_API_TOKEN 또는 VERCEL_PROJECT_ID 미설정
- **해결**: 
  1. Vercel 대시보드에서 API 토큰 발급
  2. Vercel 프로젝트 ID 확인
  3. 환경변수에 설정
  4. 또는 수동으로 Vercel 대시보드에서 설정

---

## 🔒 보안 주의사항

⚠️ **중요**: 
- `.env.local` 파일은 절대 Git에 커밋하지 마세요
- `.gitignore`에 이미 포함되어 있어야 합니다
- 환경변수는 외부에 노출되지 않도록 주의하세요
- PayApp 키는 절대 공유하지 마세요

---

## 🎯 요약

1. **관리자 패널** (`/admin/settings`)에서 PayApp 설정 저장
2. 자동으로 **`.env.local`** 파일에 저장
3. **Vercel 환경변수**에도 자동 동기화 (VERCEL_API_TOKEN 설정 시)
4. 코드는 **`process.env.PAYAPP_*`**에서 값 읽기
5. 정액제 결제 시 PayApp API 호출

**설정 완료 후 결제 시스템이 정상 작동합니다!**
