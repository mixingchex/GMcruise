# Vercel Kakao 환경변수 자동 동기화 설정 완료

관리자 패널에서 Kakao 관련 환경변수를 설정하면 자동으로 Vercel에 동기화되는 기능이 구현되어 있습니다.

---

## ✅ 완료된 기능

### 1. 관리자 패널에 Kakao 환경변수 저장

관리자 패널 (`/admin/settings`)에서 다음 Kakao 환경변수들을 관리할 수 있습니다:

#### 필수 환경변수
- ✅ `NEXT_PUBLIC_KAKAO_JS_KEY` - 카카오 JavaScript SDK 키
- ✅ `NEXT_PUBLIC_KAKAO_CHANNEL_ID` - 카카오 채널 ID

#### 카카오 API 환경변수
- ✅ `KAKAO_REST_API_KEY` - 카카오 REST API 키
- ✅ `KAKAO_ADMIN_KEY` - 카카오 Admin 키
- ✅ `KAKAO_APP_ID` - 카카오 앱 ID
- ✅ `KAKAO_APP_NAME` - 카카오 앱 이름
- ✅ `KAKAO_CHANNEL_BOT_ID` - 카카오 채널 봇 ID

#### 알리고 카카오톡 환경변수 (SMS API 설정 섹션)
- ✅ `ALIGO_KAKAO_SENDER_KEY` - 알리고 카카오 발신 키
- ✅ `ALIGO_KAKAO_CHANNEL_ID` - 알리고 카카오 채널 ID

### 2. Vercel 자동 동기화

관리자 패널에서 값을 저장하면:
1. ✅ 로컬 환경변수 (`.env.local`)에 저장
2. ✅ Vercel 환경변수에 자동 동기화 (VERCEL_API_TOKEN 설정 시)
3. ✅ 변경사항 즉시 반영

---

## 📋 알리고 카카오 완전한 값

### ALIGO_KAKAO_SENDER_KEY
```
13b13496a0f51e9a602706d0dd8b27598088dd5a
```

### ALIGO_KAKAO_CHANNEL_ID
```
cruisedot
```

---

## 🎯 사용 방법

### 1. 관리자 패널에서 Kakao 설정 수정

1. **관리자 패널 접속**: `/admin/settings`
2. **카카오톡 설정 섹션** 찾기
3. **편집하기 버튼** 클릭
4. 원하는 값 입력/수정
5. **저장하기 버튼** 클릭

### 2. 자동 동기화 확인

저장 후 다음 메시지가 표시됩니다:

```
✅ Vercel 자동 업데이트: X개 환경변수 업데이트 완료
```

또는 Vercel 설정이 없으면:

```
⚠️ Vercel 자동 업데이트를 사용하려면 VERCEL_API_TOKEN과 VERCEL_PROJECT_ID를 설정하세요.
```

### 3. 수동으로 Vercel에 설정하는 방법

자동 동기화가 작동하지 않는 경우, 수동으로 Vercel에 설정할 수도 있습니다:

#### Vercel 대시보드에서 설정

1. https://vercel.com 접속
2. 프로젝트 선택
3. **Settings** → **Environment Variables**
4. **Add New** 클릭
5. Key와 Value 입력
6. Environment 선택 (Production, Preview, Development)
7. **Save** 클릭

#### 전체 Kakao 환경변수 목록

```bash
# 필수
NEXT_PUBLIC_KAKAO_JS_KEY=e4d764f905271796dccf37c55a5b84d7
NEXT_PUBLIC_KAKAO_CHANNEL_ID=CzxgPn

# 카카오 API
KAKAO_REST_API_KEY=e75220229cf63f62a0832447850985ea
KAKAO_ADMIN_KEY=6f2872dfa8ac40ab0d9a93a70c542d10
KAKAO_APP_ID=1293313
KAKAO_APP_NAME=크루즈닷
KAKAO_CHANNEL_BOT_ID=68693bcd99efce7dbfa950bb

# 알리고 카카오톡
ALIGO_KAKAO_SENDER_KEY=13b13496a0f51e9a602706d0dd8b27598088dd5a
ALIGO_KAKAO_CHANNEL_ID=cruisedot
```

---

## 🔧 Vercel 자동 동기화 설정

자동 동기화를 사용하려면 다음 환경변수가 설정되어 있어야 합니다:

### VERCEL_API_TOKEN
- Vercel 계정 → Settings → Tokens → Create Token
- 토큰 생성 후 복사

### VERCEL_PROJECT_ID
- Vercel 프로젝트 → Settings → General
- Project ID 확인

### 설정 방법

관리자 패널에서 설정하거나, Vercel 대시보드에서 직접 설정:

```bash
VERCEL_API_TOKEN=your_vercel_api_token_here
VERCEL_PROJECT_ID=your_vercel_project_id_here
```

---

## 📝 관리자 패널 카테고리별 설정

### 카카오톡 설정 섹션

**위치**: `/admin/settings` → "카카오톡 설정" 섹션

**관리 가능한 항목**:
- 앱 이름 (`KAKAO_APP_NAME`)
- 앱 ID (`KAKAO_APP_ID`)
- JavaScript 키 (`NEXT_PUBLIC_KAKAO_JS_KEY`)
- REST API 키 (`KAKAO_REST_API_KEY`)
- Admin 키 (`KAKAO_ADMIN_KEY`)
- 채널 ID (`NEXT_PUBLIC_KAKAO_CHANNEL_ID`)
- 채널 봇 ID (`KAKAO_CHANNEL_BOT_ID`)
- 채널 이름 (`KAKAO_CHANNEL_NAME`)
- 채널 검색 ID (`KAKAO_CHANNEL_SEARCH_ID`)
- 채널 URL (`KAKAO_CHANNEL_URL`)
- 채널 채팅 URL (`KAKAO_CHANNEL_CHAT_URL`)

### SMS API 설정 섹션

**위치**: `/admin/settings` → "SMS API 설정" 섹션

**관리 가능한 항목**:
- 카카오 채널 ID (`ALIGO_KAKAO_CHANNEL_ID`)
- 카카오 채널 Senderkey (`ALIGO_KAKAO_SENDER_KEY`)

---

## ✅ 체크리스트

### Vercel 자동 동기화 사용 가능 여부 확인

- [ ] `VERCEL_API_TOKEN` 환경변수 설정됨
- [ ] `VERCEL_PROJECT_ID` 환경변수 설정됨
- [ ] 관리자 패널에서 Kakao 설정 저장 시 자동 동기화 메시지 확인됨

### Kakao 환경변수 확인

- [ ] `NEXT_PUBLIC_KAKAO_JS_KEY` 설정됨
- [ ] `NEXT_PUBLIC_KAKAO_CHANNEL_ID` 설정됨
- [ ] `KAKAO_REST_API_KEY` 설정됨 (고급 기능 사용 시)
- [ ] `KAKAO_ADMIN_KEY` 설정됨 (고급 기능 사용 시)
- [ ] `ALIGO_KAKAO_SENDER_KEY` 설정됨 (메시지 발송 사용 시)
- [ ] `ALIGO_KAKAO_CHANNEL_ID` 설정됨 (메시지 발송 사용 시)

---

## 🎉 요약

✅ **모든 Kakao 환경변수는 관리자 패널에서 관리 가능**  
✅ **저장 시 자동으로 Vercel에 동기화**  
✅ **수동으로 Vercel에 설정도 가능**  
✅ **알리고 카카오 값 확인 완료**

이제 관리자 패널에서 Kakao 설정을 관리하면 자동으로 Vercel에도 반영됩니다! 🚀

