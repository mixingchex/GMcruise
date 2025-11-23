# API 500 에러 최종 해결

## 🔴 발생한 에러

```
:3001/api/video/rooms?status=ACTIVE:1 Failed to load resource: the server responded with a status of 500
:3001/api/video/rooms:1 Failed to load resource: the server responded with a status of 500
```

## ⚠️ 문제 분석

### 1. 잘못된 포트로 요청
에러 로그를 보면 `:3001/api/video/rooms`로 요청이 가고 있습니다.
- **3001 포트**: Socket.io 서버 (WebSocket용)
- **3000 포트**: Next.js API 서버 (REST API용)

**문제**: API 요청이 Socket.io 서버(3001)로 가고 있음

### 2. 가능한 원인
1. 브라우저가 잘못된 base URL 사용
2. 환경 변수 설정 문제
3. 프록시 설정 문제
4. 데이터베이스 스키마 불일치

## ✅ 해결 방법

### 1단계: 데이터베이스 스키마 확인

`isRecordingEnabled` 필드가 스키마에 있는지 확인:
```bash
cd /home/userhyeseon28/projects/cruise-guide
npx prisma db push
```

### 2단계: API 코드 수정 완료

✅ `isRecordingEnabled` 필드 추가
✅ 에러 처리 강화
✅ 데이터베이스 쿼리 에러 로깅 추가

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

### 환경 변수 확인

`.env.local` 파일:
```bash
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 서버 로그 확인

터미널에서 Next.js 서버 로그 확인:
```
[Video Rooms] Create database error: ...
[Video Rooms] Database query error: ...
```

## 🎯 테스트 순서

1. ✅ 서버 재시작 (`npm run dev:all`)
2. ✅ 브라우저 새로고침 (Ctrl+Shift+R)
3. ✅ 관리자 패널 화상 회의 페이지 접속 (`/admin/video-meetings`)
4. ✅ "화상 회의" 버튼 클릭
5. ✅ "새 미팅 시작하기" 클릭
6. ✅ 미팅 정보 입력 후 생성
7. ✅ Network 탭에서 API 요청 확인

## 📝 수정 사항

1. ✅ `isRecordingEnabled` 필드 추가 (기본값: false)
2. ✅ 데이터베이스 쿼리 에러 처리 강화
3. ✅ 에러 로깅 상세화
4. ✅ 대리점장 개인몰에 화상 회의 기능 추가







