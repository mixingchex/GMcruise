# API 500 에러 해결 가이드

## 🔴 발생한 에러

```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
:3001/api/video/rooms:1 Failed to load resource
```

## ⚠️ 문제 분석

### 1. 잘못된 포트로 요청
에러 로그를 보면 `:3001/api/video/rooms`로 요청이 가고 있습니다.
- **3001 포트**: Socket.io 서버 (WebSocket용)
- **3000 포트**: Next.js API 서버 (REST API용)

**문제**: API 요청이 Socket.io 서버(3001)로 가고 있음

### 2. 가능한 원인
1. 환경 변수 설정 문제
2. 브라우저가 잘못된 base URL 사용
3. 프록시 설정 문제

## ✅ 해결 방법

### 1단계: 환경 변수 확인

`.env.local` 파일 확인:
```bash
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**중요**: `NEXT_PUBLIC_BASE_URL`이 올바르게 설정되어 있는지 확인

### 2단계: API 요청 경로 확인

`VideoMeetingWidget.tsx`에서 API 요청은 상대 경로를 사용:
```typescript
fetch('/api/video/rooms', ...)  // ✅ 올바름
```

절대 경로를 사용하지 않도록 확인:
```typescript
fetch('http://localhost:3001/api/video/rooms', ...)  // ❌ 잘못됨
```

### 3단계: 서버 재시작

```bash
cd /home/userhyeseon28/projects/cruise-guide

# 기존 서버 종료 (Ctrl+C)
# 새로 시작
npm run dev:all
```

### 4단계: 브라우저 확인

1. **브라우저 개발자 도구** (F12)
2. **Network 탭** 확인
3. `/api/video/rooms` 요청 확인
4. **Request URL**이 `http://localhost:3000/api/video/rooms`인지 확인

## 🔍 추가 확인 사항

### 관리자 패널에서 화상 회의 안 보이는 문제

**원인**: `dashboardData`가 없을 때 `return null`로 인해 화상 회의 위젯이 렌더링되지 않음

**해결**: ✅ 완료 - 데이터가 없어도 화상 회의 위젯이 표시되도록 수정

## 🎯 테스트 순서

1. ✅ 서버 재시작 (`npm run dev:all`)
2. ✅ 브라우저 새로고침 (Ctrl+Shift+R)
3. ✅ 관리자 대시보드 접속 (`/admin/dashboard`)
4. ✅ 화상 회의 섹션 확인
5. ✅ "화상 회의" 버튼 클릭
6. ✅ Network 탭에서 API 요청 확인

## ⚠️ 여전히 에러가 발생하면

### 서버 로그 확인

터미널에서 Next.js 서버 로그 확인:
```
[Video Rooms] Database query error: ...
```

### 브라우저 콘솔 확인

F12 → Console 탭에서 에러 메시지 확인

### API 직접 테스트

브라우저에서 직접 접속:
```
http://localhost:3000/api/video/rooms?status=ACTIVE
```

인증이 필요하므로 쿠키가 있어야 합니다.

## 📝 수정 사항

1. ✅ API 에러 로깅 강화
2. ✅ Prisma 쿼리 에러 처리 개선
3. ✅ 관리자 패널에서 데이터 없을 때도 화상 회의 표시
4. ✅ `participants` 쿼리 조건 수정







