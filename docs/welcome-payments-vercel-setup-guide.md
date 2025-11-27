# 웰컴페이먼츠 Vercel 환경변수 설정 가이드

## 📋 개요

웰컴페이먼츠 결제 시스템을 위한 환경변수 설정 가이드입니다. 관리자 패널에서 설정하거나 Vercel에 직접 입력할 수 있습니다.

## ✅ 현재 설정된 값 (확인됨)

### 인증 결제 (Auth Payment)

| 환경변수명 | 필드명 | 현재 값 |
|-----------|--------|---------|
| `PG_MID_AUTH` | MID (인증) | `wpcrdot200` |
| `PG_SIGNKEY` | 웹결제 SignKey | `SGI2dkFzRFc1WHp6K1VTOFVUS3dGdz09` |
| `PG_FIELD_ENCRYPT_IV` | 필드 암호화 IV | `00e0281fbcbae386` |
| `PG_FIELD_ENCRYPT_KEY` | 필드 암호화 KEY (API KEY) | `3468ac340654c2e5a890fc97d99c214b` |

### 비인증 결제 (Non-Auth Payment)

| 환경변수명 | 필드명 | 현재 값 |
|-----------|--------|---------|
| `PG_MID_NON_AUTH` | MID (비인증) | `wpcrdot300` |
| `PG_SIGNKEY_NON_AUTH` | 웹결제 Signkey | `SCtXOVVtV2o4TU1RN1hONHRlNWVTQT09` |
| `PG_FIELD_ENCRYPT_IV_NON_AUTH` | 필드 암호화 IV | `5d19f5e8722505c9` |
| `PG_FIELD_ENCRYPT_KEY_NON_AUTH` | 필드 암호화 KEY (API KEY) | `11e782ef3a738e140872b5074967c5de` |
| `PG_MID_PASSWORD` | 비밀번호 | `Ronaldo7@@` |

### 기타 설정

| 환경변수명 | 값 |
|-----------|-----|
| `NEXT_PUBLIC_WELCOME_PAY_URL` | `https://pay.welcomepayments.co.kr/payment` |
| `WELCOME_PAY_URL` | `https://pay.welcomepayments.co.kr/payment` |
| 관리자 페이지 | `http://wbiz.paywelcome.co.kr` |

---

## 🔧 Vercel 환경변수 설정 방법

### 1. Vercel 대시보드 접속

1. https://vercel.com/dashboard 접속
2. 로그인

### 2. 프로젝트 선택

1. 해당 프로젝트 클릭
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Environment Variables** 클릭

### 3. 인증 결제 환경변수 추가

#### 환경변수 1: PG_MID_AUTH
- **Key**: `PG_MID_AUTH`
- **Value**: `wpcrdot200`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

#### 환경변수 2: PG_SIGNKEY
- **Key**: `PG_SIGNKEY`
- **Value**: `SGI2dkFzRFc1WHp6K1VTOFVUS3dGdz09`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

#### 환경변수 3: PG_FIELD_ENCRYPT_IV
- **Key**: `PG_FIELD_ENCRYPT_IV`
- **Value**: `00e0281fbcbae386`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

#### 환경변수 4: PG_FIELD_ENCRYPT_KEY
- **Key**: `PG_FIELD_ENCRYPT_KEY`
- **Value**: `3468ac340654c2e5a890fc97d99c214b`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

### 4. 비인증 결제 환경변수 추가

#### 환경변수 5: PG_MID_NON_AUTH
- **Key**: `PG_MID_NON_AUTH`
- **Value**: `wpcrdot300`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

#### 환경변수 6: PG_SIGNKEY_NON_AUTH
- **Key**: `PG_SIGNKEY_NON_AUTH`
- **Value**: `SCtXOVVtV2o4TU1RN1hONHRlNWVTQT09`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

#### 환경변수 7: PG_FIELD_ENCRYPT_IV_NON_AUTH
- **Key**: `PG_FIELD_ENCRYPT_IV_NON_AUTH`
- **Value**: `5d19f5e8722505c9`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

#### 환경변수 8: PG_FIELD_ENCRYPT_KEY_NON_AUTH
- **Key**: `PG_FIELD_ENCRYPT_KEY_NON_AUTH`
- **Value**: `11e782ef3a738e140872b5074967c5de`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

#### 환경변수 9: PG_MID_PASSWORD
- **Key**: `PG_MID_PASSWORD`
- **Value**: `Ronaldo7@@`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

### 5. 웰컴페이먼츠 URL 환경변수 추가

#### 환경변수 10: NEXT_PUBLIC_WELCOME_PAY_URL
- **Key**: `NEXT_PUBLIC_WELCOME_PAY_URL`
- **Value**: `https://pay.welcomepayments.co.kr/payment`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

#### 환경변수 11: WELCOME_PAY_URL
- **Key**: `WELCOME_PAY_URL`
- **Value**: `https://pay.welcomepayments.co.kr/payment`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (선택)

### 6. 저장 및 배포

1. 각 환경변수 입력 후 **Save** 클릭
2. 변경사항 적용을 위해 **새 배포** 필요 (자동 배포 또는 수동 배포)

---

## ✅ 관리자 패널에서 설정하기 (권장)

관리자 패널(`/admin/settings`)에서도 웰컴페이먼츠 설정을 관리할 수 있습니다:

1. **관리자 패널 접속**
   - URL: `/admin/settings`
   - 관리자 계정으로 로그인 필요

2. **웰컴페이먼츠 결제 설정 섹션 찾기**
   - 페이지를 스크롤하여 웰컴페이먼츠 관련 섹션 찾기
   - 또는 Ctrl+F (Cmd+F)로 "웰컴" 또는 "PG" 검색

3. **수정하기 버튼 클릭**
   - 해당 섹션의 **"수정하기"** 버튼 클릭

4. **값 입력**
   - 각 필드에 위의 값들을 입력
   - 👁️ 아이콘을 클릭하면 비밀번호 형식의 값도 확인 가능

5. **저장하기 버튼 클릭**
   - **"저장하기"** 버튼 클릭
   - 저장하면 자동으로:
     - ✅ 로컬 `.env.local` 파일에 저장
     - ✅ Vercel 환경변수에 자동 동기화 (VERCEL_API_TOKEN 설정 시)

**⚠️ 중요**: Vercel 자동 동기화를 사용하려면 다음 환경변수가 필요합니다:
- `VERCEL_API_TOKEN`: Vercel API 토큰
- `VERCEL_PROJECT_ID` 또는 `NEXT_PUBLIC_VERCEL_PROJECT_ID`: Vercel 프로젝트 ID

---

## 📝 로컬 개발 환경 설정 (선택)

로컬에서 테스트하려면 프로젝트 루트에 `.env.local` 파일을 생성하세요:

```bash
# 웰컴페이먼츠 인증 결제
PG_MID_AUTH=wpcrdot200
PG_SIGNKEY=SGI2dkFzRFc1WHp6K1VTOFVUS3dGdz09
PG_FIELD_ENCRYPT_IV=00e0281fbcbae386
PG_FIELD_ENCRYPT_KEY=3468ac340654c2e5a890fc97d99c214b

# 웰컴페이먼츠 비인증 결제
PG_MID_NON_AUTH=wpcrdot300
PG_SIGNKEY_NON_AUTH=SCtXOVVtV2o4TU1RN1hONHRlNWVTQT09
PG_FIELD_ENCRYPT_IV_NON_AUTH=5d19f5e8722505c9
PG_FIELD_ENCRYPT_KEY_NON_AUTH=11e782ef3a738e140872b5074967c5de
PG_MID_PASSWORD=Ronaldo7@@

# 웰컴페이먼츠 URL
NEXT_PUBLIC_WELCOME_PAY_URL=https://pay.welcomepayments.co.kr/payment
WELCOME_PAY_URL=https://pay.welcomepayments.co.kr/payment
```

**주의**: `.env.local` 파일은 Git에 커밋하지 마세요 (이미 `.gitignore`에 포함됨)

---

## 📊 환경변수 매핑 관계

| 관리자 패널 필드명 | 환경변수명 | 설명 |
|------------------|-----------|------|
| `pgMidAuth` | `PG_MID_AUTH` | 인증 결제 MID |
| `pgSignkey` | `PG_SIGNKEY` | 인증 결제 SignKey |
| `pgFieldEncryptIv` | `PG_FIELD_ENCRYPT_IV` | 인증 결제 필드 암호화 IV |
| `pgFieldEncryptKey` | `PG_FIELD_ENCRYPT_KEY` | 인증 결제 필드 암호화 KEY |
| `pgMidNonAuth` | `PG_MID_NON_AUTH` | 비인증 결제 MID |
| `pgSignkeyNonAuth` | `PG_SIGNKEY_NON_AUTH` | 비인증 결제 SignKey |
| `pgFieldEncryptIvNonAuth` | `PG_FIELD_ENCRYPT_IV_NON_AUTH` | 비인증 결제 필드 암호화 IV |
| `pgFieldEncryptKeyNonAuth` | `PG_FIELD_ENCRYPT_KEY_NON_AUTH` | 비인증 결제 필드 암호화 KEY |
| `pgMidPassword` | `PG_MID_PASSWORD` | 비인증 결제 비밀번호 |
| `welcomePayUrl` | `NEXT_PUBLIC_WELCOME_PAY_URL` | 웰컴페이먼츠 결제 URL (Public) |
| `welcomePayUrl` | `WELCOME_PAY_URL` | 웰컴페이먼츠 결제 URL (Server) |

---

## ✅ 설정 확인 체크리스트

### Vercel에서 확인
- [ ] Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
- [ ] `PG_MID_AUTH` 환경변수 존재 및 값 확인 (`wpcrdot200`)
- [ ] `PG_SIGNKEY` 환경변수 존재 및 값 확인
- [ ] `PG_FIELD_ENCRYPT_IV` 환경변수 존재 및 값 확인
- [ ] `PG_FIELD_ENCRYPT_KEY` 환경변수 존재 및 값 확인
- [ ] `PG_MID_NON_AUTH` 환경변수 존재 및 값 확인 (`wpcrdot300`)
- [ ] `PG_SIGNKEY_NON_AUTH` 환경변수 존재 및 값 확인
- [ ] `PG_FIELD_ENCRYPT_IV_NON_AUTH` 환경변수 존재 및 값 확인
- [ ] `PG_FIELD_ENCRYPT_KEY_NON_AUTH` 환경변수 존재 및 값 확인
- [ ] `PG_MID_PASSWORD` 환경변수 존재 및 값 확인
- [ ] `NEXT_PUBLIC_WELCOME_PAY_URL` 환경변수 존재 및 값 확인
- [ ] `WELCOME_PAY_URL` 환경변수 존재 및 값 확인
- [ ] Production, Preview 환경에 모두 설정되어 있음

### 관리자 패널에서 확인
- [ ] `/admin/settings` 페이지 접속 가능
- [ ] 웰컴페이먼츠 관련 설정 섹션 확인
- [ ] 모든 필드 값이 입력되어 있음

### 로컬에서 확인 (개발 환경)
- [ ] `.env.local` 파일 존재
- [ ] 모든 환경변수가 올바른 형식으로 설정됨
- [ ] 개발 서버 재시작 후 적용 확인

---

## 🛠️ 문제 해결

### 오류: "웰컴페이먼츠 설정이 완료되지 않았습니다"
- **원인**: 환경변수가 설정되지 않음
- **해결**: 
  1. 관리자 패널(`/admin/settings`)에서 웰컴페이먼츠 설정 확인
  2. Vercel 환경변수 확인
  3. `.env.local` 파일 확인 (로컬 개발 환경)

### 오류: "결제 요청에 실패했습니다"
- **원인**: 잘못된 웰컴페이먼츠 키 또는 네트워크 오류
- **해결**: 
  1. 웰컴페이먼츠 키 확인 (관리자 패널에서 복사하여 확인)
  2. 웰컴페이먼츠 관리자 페이지(`http://wbiz.paywelcome.co.kr`)에서 설정 확인
  3. 네트워크 연결 확인

### 환경변수가 적용되지 않음
- **해결**: 
  1. 개발 서버 재시작 (`npm run dev`)
  2. `.env.local` 파일 위치 확인 (프로젝트 루트)
  3. 파일명 확인 (`.env.local` 또는 `.env`)
  4. Vercel의 경우 새 배포 필요

---

## 🔒 보안 주의사항

⚠️ **중요**: 
- `.env.local` 파일은 절대 Git에 커밋하지 마세요
- `.gitignore`에 이미 포함되어 있어야 합니다
- 환경변수는 외부에 노출되지 않도록 주의하세요
- 웰컴페이먼츠 키는 절대 공유하지 마세요
- 비밀번호(`PG_MID_PASSWORD`)는 특히 주의하세요

---

## 🎯 요약

1. **Vercel 대시보드**에서 11개의 환경변수 추가
2. 또는 **관리자 패널** (`/admin/settings`)에서 설정 저장
3. 자동으로 **`.env.local`** 파일에 저장
4. **Vercel 환경변수**에도 자동 동기화 (VERCEL_API_TOKEN 설정 시)
5. 코드는 **`process.env.PG_*`**에서 값 읽기
6. 웰컴페이먼츠 결제 시 API 호출

**설정 완료 후 웰컴페이먼츠 결제 시스템이 정상 작동합니다!**

---

## 📞 참고 정보

- **관리자 페이지**: http://wbiz.paywelcome.co.kr
- **결제 URL**: https://pay.welcomepayments.co.kr/payment
- **가맹점 상호**: 크루즈닷
- **인증 MID**: wpcrdot200
- **비인증 MID**: wpcrdot300

