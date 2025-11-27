# Vercel 환경 변수 설정 단계별 가이드

## 🎯 목표
카카오톡 채널 추가 기능을 위해 필요한 환경 변수를 Vercel에 설정합니다.

---

## 📋 필수 환경 변수 (카카오톡 채널 추가용)

다음 두 가지 환경 변수가 **반드시** 필요합니다:

1. `NEXT_PUBLIC_KAKAO_JS_KEY` = `e4d764f905271796dccf37c55a5b84d7`
2. `NEXT_PUBLIC_KAKAO_CHANNEL_ID` = `CzxgPn`

---

## 🔧 단계별 설정 방법

### 1단계: Vercel 대시보드 접속

1. 웹 브라우저에서 **https://vercel.com** 접속
2. 로그인 (GitHub 계정으로 로그인하는 경우가 많습니다)
3. 대시보드에서 **cruise-guide** 프로젝트 클릭

### 2단계: Settings 메뉴로 이동

1. 프로젝트 페이지 상단 메뉴에서 **Settings** 클릭
2. 왼쪽 사이드바에서 **Environment Variables** 클릭

### 3단계: 환경 변수 추가

#### 3-1. 첫 번째 환경 변수 추가: `NEXT_PUBLIC_KAKAO_JS_KEY`

1. **"Add New"** 또는 **"Add"** 버튼 클릭
2. 다음 정보 입력:
   - **Key (이름)**: `NEXT_PUBLIC_KAKAO_JS_KEY`
   - **Value (값)**: `e4d764f905271796dccf37c55a5b84d7`
3. **Environment (환경)** 선택:
   - ✅ **Production** 체크
   - ✅ **Preview** 체크
   - ✅ **Development** 체크
   - (모든 환경에 체크하는 것을 권장합니다)
4. **Save** 버튼 클릭

#### 3-2. 두 번째 환경 변수 추가: `NEXT_PUBLIC_KAKAO_CHANNEL_ID`

1. 다시 **"Add New"** 또는 **"Add"** 버튼 클릭
2. 다음 정보 입력:
   - **Key (이름)**: `NEXT_PUBLIC_KAKAO_CHANNEL_ID`
   - **Value (값)**: `CzxgPn`
3. **Environment (환경)** 선택:
   - ✅ **Production** 체크
   - ✅ **Preview** 체크
   - ✅ **Development** 체크
4. **Save** 버튼 클릭

### 4단계: 환경 변수 확인

설정한 환경 변수가 목록에 표시되는지 확인:

```
✅ NEXT_PUBLIC_KAKAO_JS_KEY = e4d764f905271796dccf37c55a5b84d7
✅ NEXT_PUBLIC_KAKAO_CHANNEL_ID = CzxgPn
```

---

## 🚀 5단계: 재배포 (매우 중요!)

⚠️ **환경 변수를 추가/수정한 후에는 반드시 재배포해야 합니다!**

### 방법 1: 자동 재배포 (권장)

1. 상단 메뉴에서 **Deployments** 탭 클릭
2. 가장 최근 배포 항목 찾기
3. 우측 **"..."** (점 3개) 메뉴 클릭
4. **"Redeploy"** 선택
5. 확인 팝업에서 **"Redeploy"** 버튼 다시 클릭
6. 배포가 완료될 때까지 대기 (보통 1-3분)

### 방법 2: Git Push로 재배포

1. 로컬에서 아무 파일이나 작은 변경사항 만들기 (예: 주석 추가)
2. Git에 커밋하고 푸시:
   ```bash
   git add .
   git commit -m "Trigger redeploy for env vars"
   git push
   ```
3. Vercel이 자동으로 배포를 시작합니다

---

## ✅ 확인 방법

### 1. 배포 완료 확인

1. **Deployments** 탭에서 배포 상태 확인
2. **"Ready"** 상태가 되면 배포 완료

### 2. 브라우저에서 테스트

1. 프로덕션 사이트 접속 (예: https://www.cruisedot.co.kr)
2. 브라우저 개발자 도구 열기 (F12)
3. **Console** 탭 선택
4. "채널 추가하기" 버튼 클릭
5. 콘솔에 다음 로그가 표시되면 성공:
   ```
   [Kakao Channel] SDK 상태 확인: { ... }
   [Kakao Channel] 채널 ID 조회 성공: CzxgPn
   [Kakao Channel] SDK를 사용하여 채널 추가 시도
   ```

---

## 🐛 문제 해결

### 문제 1: 환경 변수가 적용되지 않음

**원인**: 재배포를 하지 않았을 가능성

**해결**:
1. Deployments 탭에서 최근 배포 확인
2. 환경 변수 추가 **이후**에 배포된 것인지 확인
3. 그렇지 않으면 수동으로 Redeploy 실행

### 문제 2: 환경 변수 값이 잘못됨

**확인 방법**:
1. Settings > Environment Variables에서 값 확인
2. 오타가 없는지 확인 (특히 앞뒤 공백)

**해결**:
1. 잘못된 환경 변수 삭제
2. 올바른 값으로 다시 추가
3. 재배포

### 문제 3: 특정 환경에서만 작동하지 않음

**확인**:
1. Environment Variables 페이지에서 각 환경 변수 확인
2. Production, Preview, Development 모두 체크되어 있는지 확인

**해결**:
1. 환경 변수 편집 (연필 아이콘 클릭)
2. 누락된 환경 체크
3. Save 후 재배포

---

## 📝 추가로 설정할 수 있는 카카오 관련 환경 변수

카카오톡 채널 추가 기능만 사용한다면 위 두 개면 충분하지만, 다른 카카오 기능을 사용한다면 다음도 설정할 수 있습니다:

```bash
KAKAO_CHANNEL_BOT_ID=68693bcd99efce7dbfa950bb
KAKAO_APP_NAME=크루즈닷
KAKAO_APP_ID=1293313
KAKAO_REST_API_KEY=e75220229cf63f62a0832447850985ea
KAKAO_ADMIN_KEY=6f2872dfa8ac40ab0d9a93a70c542d10
```

---

## 🎯 요약 체크리스트

설정 완료 후 다음을 확인하세요:

- [ ] `NEXT_PUBLIC_KAKAO_JS_KEY` 환경 변수 추가됨
- [ ] `NEXT_PUBLIC_KAKAO_CHANNEL_ID` 환경 변수 추가됨
- [ ] Production, Preview, Development 모두 체크됨
- [ ] 재배포 완료됨
- [ ] 브라우저에서 테스트하여 정상 작동 확인

---

## 💡 팁

1. **환경 변수는 대소문자를 구분합니다** - 정확히 입력하세요
2. **NEXT_PUBLIC_ 접두사** - 클라이언트에서 사용할 수 있도록 `NEXT_PUBLIC_`로 시작해야 합니다
3. **재배포 필수** - 환경 변수 변경 후 반드시 재배포해야 적용됩니다
4. **값에 공백 주의** - 복사/붙여넣기 시 앞뒤 공백이 들어가지 않도록 주의하세요

---

## 📞 추가 도움이 필요한 경우

문제가 계속되면 다음 정보를 확인하세요:

1. 브라우저 콘솔의 전체 오류 메시지
2. Vercel Deployments 탭의 배포 로그
3. 환경 변수가 정확히 설정되었는지 스크린샷


