# Vercel Kakao 환경변수 설정 가이드

Vercel에서 카카오 관련 기능을 사용하기 위해 설정해야 할 모든 환경변수를 정리한 가이드입니다.

---

## 📋 목차

1. [필수 환경변수 (반드시 설정)](#1-필수-환경변수-반드시-설정)
2. [카카오 API 환경변수 (고급 기능)](#2-카카오-api-환경변수-고급-기능)
3. [알리고 카카오톡 메시지 환경변수](#3-알리고-카카오톡-메시지-환경변수)
4. [Vercel 설정 방법](#4-vercel-설정-방법)
5. [환경변수별 용도 설명](#5-환경변수별-용도-설명)
6. [체크리스트](#6-체크리스트)

---

## 1. 필수 환경변수 (반드시 설정)

카카오톡 채널 추가, 공유 기능 등 기본 기능을 사용하려면 다음 두 개의 환경변수가 **필수**입니다.

### 1-1. 카카오 JavaScript SDK 키

```bash
NEXT_PUBLIC_KAKAO_JS_KEY=e4d764f905271796dccf37c55a5b84d7
```

- **설명**: 카카오 JavaScript SDK 초기화에 필요한 키
- **필수**: ✅ 예
- **실제 값**: `e4d764f905271796dccf37c55a5b84d7` (이미 설정된 값)
- **용도**: 
  - 카카오톡 채널 추가 버튼
  - 카카오톡 공유 기능
  - 카카오 로그인 (사용 시)
- **발급 방법**: 카카오 개발자 콘솔 (https://developers.kakao.com) → 내 애플리케이션 → 앱 키 → JavaScript 키
- **⚠️ 중요**: 
  - `NEXT_PUBLIC_` 접두사 필수 (클라이언트에서 사용)
  - 대소문자 정확히 일치
  - 앞뒤 공백 없이 입력

### 1-2. 카카오 채널 ID

```bash
NEXT_PUBLIC_KAKAO_CHANNEL_ID=CzxgPn
```

- **설명**: 카카오 비즈니스 채널 공개 ID
- **필수**: ✅ 예
- **실제 값**: `CzxgPn` (이미 설정된 값)
- **용도**: 
  - 카카오톡 채널 추가 링크 생성
  - 채널 정보 조회
- **확인 방법**: 
  - 카카오 비즈니스 채널 관리 페이지 → 채널 정보 → 채널 공개 ID
  - 또는 채널 URL에서 확인: `https://pf.kakao.com/_CzxgPn` → `CzxgPn`이 채널 ID
- **⚠️ 중요**: 
  - `NEXT_PUBLIC_` 접두사 필수 (클라이언트에서 사용)
  - 대소문자 정확히 일치 (보통 대문자)

---

## 2. 카카오 API 환경변수 (고급 기능)

카카오 로그인, 메시지 발송, 봇 기능 등을 사용하려면 다음 환경변수들이 필요합니다.

### 2-1. 카카오 REST API 키

```bash
KAKAO_REST_API_KEY=e75220229cf63f62a0832447850985ea
```

- **설명**: 카카오 REST API 호출에 필요한 키
- **필수**: ⚠️ 조건부 (카카오 로그인, API 호출 사용 시)
- **실제 값**: `e75220229cf63f62a0832447850985ea` (이미 설정된 값)
- **용도**: 
  - 카카오 로그인 (서버 사이드)
  - 카카오 API 호출
- **발급 방법**: 카카오 개발자 콘솔 → 내 애플리케이션 → 앱 키 → REST API 키
- **⚠️ 주의**: 서버 전용 (NEXT_PUBLIC_ 접두사 없음)

### 2-2. 카카오 Admin 키

```bash
KAKAO_ADMIN_KEY=6f2872dfa8ac40ab0d9a93a70c542d10
```

- **설명**: 카카오 Admin API 호출에 필요한 키 (서버 전용)
- **필수**: ⚠️ 조건부 (Admin API 사용 시)
- **실제 값**: `6f2872dfa8ac40ab0d9a93a70c542d10` (이미 설정된 값)
- **용도**: 
  - 사용자 정보 조회 (Admin API)
  - 메시지 발송 (Admin API)
- **발급 방법**: 카카오 개발자 콘솔 → 내 애플리케이션 → 앱 키 → Admin 키
- **⚠️ 보안**: 매우 민감한 정보! 절대 공개하지 마세요

### 2-3. 카카오 앱 ID

```bash
KAKAO_APP_ID=1293313
```

- **설명**: 카카오 앱 고유 ID
- **필수**: ❌ 아니오 (선택적)
- **실제 값**: `1293313` (기본값)
- **용도**: 앱 식별용
- **확인 방법**: 카카오 개발자 콘솔 → 내 애플리케이션 → 앱 설정 → 앱 키 → 앱 키

### 2-4. 카카오 앱 이름

```bash
KAKAO_APP_NAME=크루즈닷
```

- **설명**: 카카오 앱 이름
- **필수**: ❌ 아니오 (선택적)
- **실제 값**: `크루즈닷` (기본값)
- **용도**: 관리자 설정 페이지에서 표시

### 2-5. 카카오 채널 봇 ID

```bash
KAKAO_CHANNEL_BOT_ID=68693bcd99efce7dbfa950bb
```

- **설명**: 카카오 채널 봇 ID
- **필수**: ⚠️ 조건부 (채널 봇 사용 시)
- **실제 값**: `68693bcd99efce7dbfa950bb` (이미 설정된 값)
- **용도**: 카카오 채널 봇 연동
- **확인 방법**: 카카오 비즈니스 채널 관리 페이지 → 봇 설정

---

## 3. 알리고 카카오톡 메시지 환경변수

알리고를 통해 카카오톡 알림톡/친구톡을 발송하려면 다음 환경변수가 필요합니다.

### 3-1. 알리고 카카오 발신 키

```bash
ALIGO_KAKAO_SENDER_KEY=your_sender_key_here
```

- **설명**: 알리고 카카오톡 발신 키
- **필수**: ⚠️ 조건부 (알리고 카카오톡 메시지 사용 시)
- **용도**: 카카오톡 알림톡/친구톡 발송
- **발급 방법**: 알리고 (https://www.aligo.in) → 카카오톡 발신 키 발급

### 3-2. 알리고 카카오 채널 ID

```bash
ALIGO_KAKAO_CHANNEL_ID=your_channel_id_here
```

- **설명**: 알리고에 등록된 카카오 채널 ID
- **필수**: ⚠️ 조건부 (알리고 카카오톡 메시지 사용 시)
- **용도**: 카카오톡 메시지 발송 시 채널 연결
- **확인 방법**: 알리고 관리자 페이지 → 카카오톡 설정

---

## 4. Vercel 설정 방법

### 4-1. Vercel 대시보드 접속

1. https://vercel.com 접속
2. 로그인
3. 프로젝트 선택 (`cruise-guide`)

### 4-2. 환경변수 추가

1. **Settings** 탭 클릭
2. **Environment Variables** 메뉴 클릭
3. **Add New** 버튼 클릭
4. 다음 정보 입력:
   - **Key**: 환경변수 이름 (예: `NEXT_PUBLIC_KAKAO_JS_KEY`)
   - **Value**: 환경변수 값 (예: `e4d764f905271796dccf37c55a5b84d7`)
   - **Environment**: 
     - ✅ **Production** (프로덕션 환경)
     - ✅ **Preview** (프리뷰 환경)
     - ✅ **Development** (개발 환경)
     - 또는 **All** 선택
5. **Save** 클릭

### 4-3. 환경변수 추가 순서 (권장)

#### 1단계: 필수 환경변수 (반드시 설정)
- `NEXT_PUBLIC_KAKAO_JS_KEY`
- `NEXT_PUBLIC_KAKAO_CHANNEL_ID`

#### 2단계: 카카오 API (고급 기능 사용 시)
- `KAKAO_REST_API_KEY`
- `KAKAO_ADMIN_KEY`
- `KAKAO_APP_ID` (선택)
- `KAKAO_APP_NAME` (선택)
- `KAKAO_CHANNEL_BOT_ID` (봇 사용 시)

#### 3단계: 알리고 카카오톡 (메시지 발송 사용 시)
- `ALIGO_KAKAO_SENDER_KEY`
- `ALIGO_KAKAO_CHANNEL_ID`

### 4-4. 재배포 (필수!)

환경변수 추가 후 **반드시 재배포**해야 합니다:

1. **Deployments** 탭 클릭
2. 최신 배포의 **"..."** (점 3개) 메뉴 클릭
3. **Redeploy** 선택
4. 배포 완료 대기 (1-3분)

---

## 5. 환경변수별 용도 설명

### 5-1. 클라이언트 환경변수 (NEXT_PUBLIC_ 접두사)

| 환경변수 | 용도 | 필수 여부 |
|---------|------|----------|
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 카카오 JavaScript SDK 초기화, 채널 추가, 공유 기능 | ✅ 필수 |
| `NEXT_PUBLIC_KAKAO_CHANNEL_ID` | 카카오 채널 추가 링크 생성, 채널 정보 표시 | ✅ 필수 |

**⚠️ 중요**: 
- `NEXT_PUBLIC_` 접두사가 있으면 클라이언트(브라우저)에서 사용 가능
- 공개되어도 되는 정보만 사용
- JavaScript 코드에서 `process.env.NEXT_PUBLIC_KAKAO_JS_KEY` 형태로 접근

### 5-2. 서버 전용 환경변수 (NEXT_PUBLIC_ 없음)

| 환경변수 | 용도 | 필수 여부 |
|---------|------|----------|
| `KAKAO_REST_API_KEY` | 카카오 REST API 호출 (서버 사이드) | ⚠️ 조건부 |
| `KAKAO_ADMIN_KEY` | 카카오 Admin API 호출 (서버 사이드) | ⚠️ 조건부 |
| `KAKAO_APP_ID` | 카카오 앱 식별 | ❌ 선택 |
| `KAKAO_APP_NAME` | 앱 이름 표시 (관리자 페이지) | ❌ 선택 |
| `KAKAO_CHANNEL_BOT_ID` | 카카오 채널 봇 연동 | ⚠️ 조건부 |
| `ALIGO_KAKAO_SENDER_KEY` | 알리고 카카오톡 발신 키 | ⚠️ 조건부 |
| `ALIGO_KAKAO_CHANNEL_ID` | 알리고 카카오 채널 ID | ⚠️ 조건부 |
| `SESSION_SECRET` | 세션 암호화 비밀키 (로그인 보안) | ✅ 필수 |

**⚠️ 중요**: 
- `NEXT_PUBLIC_` 접두사가 없으면 서버 전용
- 절대 공개되면 안 되는 민감한 정보
- API 라우트에서만 접근 가능

---

## 6. 체크리스트

### 필수 환경변수 설정 확인

- [ ] `NEXT_PUBLIC_KAKAO_JS_KEY` 추가됨 (값: `e4d764f905271796dccf37c55a5b84d7`)
- [ ] `NEXT_PUBLIC_KAKAO_CHANNEL_ID` 추가됨 (값: `CzxgPn`)
- [ ] Production, Preview, Development 모두 체크됨

### 카카오 API 환경변수 설정 확인 (고급 기능 사용 시)

- [ ] `KAKAO_REST_API_KEY` 추가됨 (값: `e75220229cf63f62a0832447850985ea`)
- [ ] `KAKAO_ADMIN_KEY` 추가됨 (값: `6f2872dfa8ac40ab0d9a93a70c542d10`)
- [ ] `KAKAO_APP_ID` 추가됨 (값: `1293313`) - 선택
- [ ] `KAKAO_APP_NAME` 추가됨 (값: `크루즈닷`) - 선택
- [ ] `KAKAO_CHANNEL_BOT_ID` 추가됨 (값: `68693bcd99efce7dbfa950bb`) - 봇 사용 시

### 알리고 카카오톡 환경변수 설정 확인 (메시지 발송 사용 시)

- [ ] `ALIGO_KAKAO_SENDER_KEY` 추가됨
- [ ] `ALIGO_KAKAO_CHANNEL_ID` 추가됨

### 세션 보안 환경변수 설정 확인 (필수)

- [ ] `SESSION_SECRET` 추가됨 (값: `B36R2pSS3J4WWQrlg+p7IeIKw3J/3qLHjExoyiC8tdk=`)

### 배포 확인

- [ ] 환경변수 추가 후 **Redeploy** 실행됨
- [ ] 배포 완료 확인
- [ ] 브라우저에서 카카오톡 채널 추가 기능 테스트 완료

---

## 7. 빠른 참조: 전체 Kakao 환경변수 목록

```bash
# 필수 (반드시 설정)
NEXT_PUBLIC_KAKAO_JS_KEY=e4d764f905271796dccf37c55a5b84d7
NEXT_PUBLIC_KAKAO_CHANNEL_ID=CzxgPn

# 카카오 API (고급 기능 사용 시)
KAKAO_REST_API_KEY=e75220229cf63f62a0832447850985ea
KAKAO_ADMIN_KEY=6f2872dfa8ac40ab0d9a93a70c542d10
KAKAO_APP_ID=1293313
KAKAO_APP_NAME=크루즈닷
KAKAO_CHANNEL_BOT_ID=68693bcd99efce7dbfa950bb

# 알리고 카카오톡 (메시지 발송 사용 시)
ALIGO_KAKAO_SENDER_KEY=your_sender_key_here
ALIGO_KAKAO_CHANNEL_ID=your_channel_id_here

# 세션 보안 (필수)
SESSION_SECRET=B36R2pSS3J4WWQrlg+p7IeIKw3J/3qLHjExoyiC8tdk=
```

---

## 8. 발급 방법 링크

- **카카오 개발자 콘솔**: https://developers.kakao.com
- **카카오 비즈니스 채널**: https://business.kakao.com
- **알리고**: https://www.aligo.in

---

## 9. 문제 해결

### 환경변수가 적용되지 않는 경우

1. **재배포 확인**: 환경변수 추가 후 반드시 **Redeploy** 실행
2. **이름 확인**: 대소문자 정확히 일치하는지 확인
   - ✅ `NEXT_PUBLIC_KAKAO_JS_KEY`
   - ❌ `NEXT_PUBLIC_KAKAO_JS_key` (소문자 오류)
3. **Environment 확인**: Production, Preview, Development 중 올바른 환경에 설정되었는지 확인
4. **값 확인**: 앞뒤 공백 없이 정확히 입력되었는지 확인

### 카카오톡 채널 추가가 안 되는 경우

1. **환경변수 확인**: `NEXT_PUBLIC_KAKAO_JS_KEY`, `NEXT_PUBLIC_KAKAO_CHANNEL_ID` 설정 확인
2. **JavaScript 키 확인**: 카카오 개발자 콘솔에서 JavaScript 키가 올바른지 확인
3. **채널 ID 확인**: 채널 공개 ID가 올바른지 확인
4. **브라우저 콘솔 확인**: F12 → Console에서 오류 메시지 확인

### 카카오 API 호출 실패하는 경우

1. **REST API 키 확인**: `KAKAO_REST_API_KEY` 설정 확인
2. **Admin 키 확인**: `KAKAO_ADMIN_KEY` 설정 확인 (Admin API 사용 시)
3. **API 권한 확인**: 카카오 개발자 콘솔에서 필요한 API 권한이 활성화되어 있는지 확인

---

## 10. 보안 주의사항

- ⚠️ **민감한 정보 보호**: `KAKAO_ADMIN_KEY`, `KAKAO_REST_API_KEY` 등은 절대 공개하지 마세요
- ⚠️ **NEXT_PUBLIC_ 주의**: `NEXT_PUBLIC_` 접두사가 있는 환경변수는 클라이언트에 노출됩니다
- ⚠️ **GitHub에 커밋 금지**: `.env.local` 파일을 절대 GitHub에 커밋하지 마세요
- ⚠️ **Vercel 환경변수 암호화**: Vercel에서는 환경변수가 암호화되어 저장되지만, 팀원과 공유할 때는 주의하세요

---

**모든 Kakao 환경변수 설정 후 반드시 Redeploy를 실행하세요!** 🚀

