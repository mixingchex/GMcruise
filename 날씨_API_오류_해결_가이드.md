# 날씨 API 오류 해결 가이드

## 🔍 "날씨를 불러올 수 없습니다" 오류 원인 및 해결

---

## ❌ 문제점

### 주요 원인
1. **클라이언트 컴포넌트에서 서버 환경변수 접근 불가**
   - `DailyBriefingCard.tsx`는 `'use client'` 컴포넌트
   - 클라이언트에서는 `process.env.WEATHER_API_KEY` 접근 불가
   - 서버에서만 환경변수 접근 가능

2. **API URL 프로토콜 오류**
   - `http://` 대신 `https://` 사용 필요

3. **도시명 인코딩 문제**
   - 한글 도시명이 URL에 제대로 인코딩되지 않을 수 있음

---

## ✅ 해결 방법

### 1. API Route 생성 (완료)
- `app/api/weather/forecast/route.ts` 파일 생성
- 서버에서 날씨 정보를 가져와서 클라이언트에 제공

### 2. 클라이언트 코드 수정 (완료)
- `DailyBriefingCard.tsx`에서 직접 API 호출 대신
- `/api/weather/forecast` API Route 호출

### 3. URL 프로토콜 수정 (완료)
- `http://` → `https://` 변경
- 도시명 URL 인코딩 추가

---

## 📋 확인 사항

### 1. Vercel 환경변수 확인
1. Vercel 대시보드 → Settings → Environment Variables
2. `WEATHER_API_KEY` 확인
3. Value: `8cf954892eb9405681b63201252611`
4. Environment: All 선택 확인

### 2. 재배포 확인
- 환경변수 추가 후 반드시 **Redeploy** 실행
- 배포 완료까지 대기

### 3. 브라우저 콘솔 확인
1. 브라우저에서 F12 (개발자 도구)
2. Console 탭 확인
3. 오류 메시지 확인:
   - `[Weather] WEATHER_API_KEY가 설정되지 않았습니다.`
   - `[Weather] API 오류: 401` (API 키 오류)
   - `[Weather] API 오류: 400` (도시명 오류)

---

## 🆘 오류별 해결 방법

### 오류 1: "WEATHER_API_KEY가 설정되지 않았습니다"
**원인**: 환경변수가 설정되지 않았거나 재배포가 안 됨

**해결**:
1. Vercel 환경변수 확인
2. 재배포 실행
3. 서버 재시작 (로컬 테스트 시)

### 오류 2: "API 오류: 401"
**원인**: API 키가 잘못되었거나 만료됨

**해결**:
1. WeatherAPI.com Dashboard에서 API 키 확인
2. Vercel 환경변수 값 확인
3. API 키 재발급 (필요 시)

### 오류 3: "API 오류: 400"
**원인**: 도시명이 잘못되었거나 찾을 수 없음

**해결**:
1. 도시명 확인 (영문 도시명 사용 권장)
2. 예: "Seoul" (O), "서울" (X)
3. 또는 "Seoul,kr" 형식 사용

### 오류 4: "날씨 정보를 불러올 수 없습니다"
**원인**: API 호출 실패 또는 네트워크 오류

**해결**:
1. 브라우저 콘솔에서 상세 오류 확인
2. 서버 로그 확인 (Vercel Functions)
3. API 키 및 환경변수 재확인

---

## 🧪 테스트 방법

### 1. API Route 직접 테스트
브라우저에서 다음 URL 테스트:
```
http://localhost:3000/api/weather/forecast?city=Seoul&days=14
```

**성공 시**: JSON 형식의 날씨 데이터 반환
**실패 시**: 오류 메시지 반환

### 2. 로컬 환경변수 테스트
`.env.local` 파일에 추가:
```bash
WEATHER_API_KEY=8cf954892eb9405681b63201252611
```

개발 서버 재시작:
```bash
npm run dev
```

### 3. 프로덕션 테스트
1. Vercel 배포 완료 후
2. 프로덕션 사이트 접속
3. 지니 브리핑에서 날씨 정보 확인

---

## 📝 수정된 파일

### 1. `app/api/weather/forecast/route.ts` (새로 생성)
- 서버 사이드 API Route
- 환경변수 접근 가능
- 날씨 정보를 클라이언트에 제공

### 2. `app/chat/components/DailyBriefingCard.tsx` (수정)
- 직접 API 호출 제거
- `/api/weather/forecast` API Route 호출로 변경

### 3. `lib/weather.ts` (수정)
- `http://` → `https://` 변경
- 도시명 URL 인코딩 추가

---

## ✅ 체크리스트

- [ ] Vercel 환경변수에 `WEATHER_API_KEY` 설정
- [ ] Value: `8cf954892eb9405681b63201252611`
- [ ] Environment: All 선택
- [ ] 재배포 완료
- [ ] 브라우저 콘솔에서 오류 확인
- [ ] API Route 직접 테스트 (`/api/weather/forecast?city=Seoul`)
- [ ] 날씨 모달에서 14일 예보 확인

---

## 🎯 빠른 해결

### 즉시 확인할 것
1. **Vercel 환경변수**: `WEATHER_API_KEY` 설정 확인
2. **재배포**: 환경변수 추가 후 반드시 Redeploy
3. **브라우저 콘솔**: F12 → Console 탭에서 오류 메시지 확인

### 가장 흔한 원인
**환경변수가 설정되지 않았거나 재배포가 안 됨**

---

**문제가 계속되면 브라우저 콘솔의 오류 메시지를 알려주세요!** 🔍

