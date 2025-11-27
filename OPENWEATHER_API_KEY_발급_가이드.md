# OpenWeather API 키 발급 가이드 (초보자용)

커뮤니티 봇의 날씨 기능을 사용하기 위해 OpenWeather API 키를 발급받는 방법입니다.

---

## 📋 목차
1. [OpenWeather 계정 생성](#1-openweather-계정-생성)
2. [API 키 발급](#2-api-키-발급)
3. [Vercel에 환경변수 추가](#3-vercel에-환경변수-추가)
4. [테스트 방법](#4-테스트-방법)

---

## 1. OpenWeather 계정 생성

### 1-1. OpenWeather 사이트 접속
1. 브라우저에서 다음 주소로 이동:
   ```
   https://openweathermap.org/api
   ```

2. 페이지 상단 오른쪽의 **"Sign Up"** 또는 **"Sign In"** 버튼 클릭

### 1-2. 회원가입
1. **"Sign Up"** 클릭
2. 다음 정보 입력:
   - **Username**: 원하는 사용자 이름 (예: `cruisedot-weather`)
   - **Email**: 실제 이메일 주소 (인증 필요)
   - **Password**: 강력한 비밀번호
   - **Confirm Password**: 비밀번호 재입력
   - **First Name**: 이름
   - **Last Name**: 성
   - **Country**: 국가 선택 (Korea, Republic of)
   - **Terms and Conditions**: 체크박스 체크 (약관 동의)

3. **"Create Account"** 버튼 클릭

### 1-3. 이메일 인증
1. 입력한 이메일 주소로 인증 메일이 발송됨
2. 이메일을 열고 **"Verify Email"** 링크 클릭
3. 인증 완료 후 OpenWeather 사이트로 자동 이동

---

## 2. API 키 발급

### 2-1. 로그인
1. OpenWeather 사이트에서 **"Sign In"** 클릭
2. 가입한 Username과 Password 입력
3. **"Sign In"** 버튼 클릭

### 2-2. API 키 확인
1. 로그인 후 상단 메뉴에서 **"API keys"** 클릭
   - 또는 다음 주소로 직접 이동:
   ```
   https://home.openweathermap.org/api_keys
   ```

2. **"Default"** 또는 **"API key"** 섹션에서 키 확인
   - 예시: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
   - 키는 약 32자 길이의 영문+숫자 조합

### 2-3. API 키 생성 (없는 경우)
1. **"Create key"** 또는 **"Generate"** 버튼 클릭
2. Key name 입력 (예: `CruiseGuide Weather`)
3. **"Generate"** 버튼 클릭
4. 생성된 API 키 복사 (한 번만 표시되므로 반드시 복사!)

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
   - **Key (이름)**: `OPENWEATHER_API_KEY`
   - **Value (값)**: 복사한 API 키 붙여넣기
     - 예: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
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

### 4-1. API 키 직접 테스트
브라우저에서 다음 URL을 열어 테스트:
```
https://api.openweathermap.org/data/2.5/weather?q=Seoul,kr&appid=YOUR_API_KEY&units=metric&lang=kr
```
- `YOUR_API_KEY` 부분을 실제 API 키로 교체

**성공 시**: JSON 형식의 날씨 정보가 표시됨
```json
{
  "coord": {"lon": 126.98, "lat": 37.57},
  "weather": [{"id": 800, "main": "Clear", "description": "맑음", "icon": "01d"}],
  "base": "stations",
  "main": {"temp": 15.5, "feels_like": 14.2, ...},
  ...
}
```

**실패 시**: 에러 메시지 표시
- `Invalid API key`: API 키가 잘못됨
- `401 Unauthorized`: API 키가 유효하지 않음

### 4-2. 커뮤니티 봇 테스트
1. 배포 완료 후 커뮤니티 봇이 실행되는지 확인
2. 날씨 정보가 정상적으로 표시되는지 확인

---

## ⚠️ 주의사항

### API 키 보안
- ✅ **절대 공개하지 마세요**: GitHub, 공개 문서 등에 업로드 금지
- ✅ **Vercel 환경변수에만 저장**: 로컬 `.env.local` 파일도 `.gitignore`에 포함
- ✅ **정기적으로 확인**: API 키가 유출되지 않았는지 확인

### API 사용 제한
- **Free 플랜**: 
  - 분당 60회 호출 제한
  - 월 1,000,000회 호출 제한
  - 커뮤니티 봇 사용에는 충분함

### API 키 재발급
- 키가 유출되었거나 문제가 있을 경우:
  1. OpenWeather 사이트 → API keys
  2. 해당 키 삭제 또는 재생성
  3. Vercel 환경변수 업데이트
  4. 재배포

---

## 📝 체크리스트

- [ ] OpenWeather 계정 생성 완료
- [ ] 이메일 인증 완료
- [ ] API 키 발급 완료
- [ ] API 키 복사 및 안전한 곳에 보관
- [ ] Vercel 환경변수에 `OPENWEATHER_API_KEY` 추가
- [ ] Production, Preview, Development 모두 선택
- [ ] 재배포 완료
- [ ] API 키 테스트 성공
- [ ] 커뮤니티 봇 날씨 기능 정상 작동 확인

---

## 🆘 문제 해결

### "Invalid API key" 오류
- **원인**: API 키가 잘못 입력되었거나 활성화되지 않음
- **해결**: 
  1. OpenWeather 사이트에서 API 키 확인
  2. Vercel 환경변수 값 확인 (앞뒤 공백 없어야 함)
  3. 재배포 후 다시 테스트

### "401 Unauthorized" 오류
- **원인**: API 키가 만료되었거나 비활성화됨
- **해결**: 
  1. OpenWeather 사이트에서 API 키 상태 확인
  2. 필요시 새 API 키 생성
  3. Vercel 환경변수 업데이트 및 재배포

### 날씨 정보가 표시되지 않음
- **원인**: 환경변수가 제대로 설정되지 않았거나 재배포가 안 됨
- **해결**: 
  1. Vercel 환경변수 확인
  2. 재배포 실행
  3. 서버 로그 확인

---

**완료되면 커뮤니티 봇의 날씨 기능이 정상적으로 작동합니다!** 🌤️


