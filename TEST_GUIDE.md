# 🧪 수정 사항 테스트 가이드

> **수정일**: 2025년 1월  
> **수정 내용**: Trip 모델 status 필드 추가, proactiveEngine.ts 및 admin/dashboard 쿼리 수정

---

## 📋 테스트 전 체크리스트

- [ ] 서버가 정상적으로 시작되는지 확인
- [ ] DB 스키마가 최신 상태인지 확인 (`npx prisma db push` 완료)
- [ ] Prisma Client가 최신 상태인지 확인 (`npx prisma generate` 완료)

---

## 🚀 1단계: 서버 시작 및 기본 동작 확인

### 1-1. 서버 시작

```bash
cd /home/userhyeseon28/projects/cruise-guide
npm run dev
```

**예상 결과:**
- 서버가 에러 없이 시작됨
- 콘솔에 "Ready" 메시지 표시
- 포트 번호 확인 (예: `http://localhost:3000`)

**에러 발생 시:**
- `Unknown argument` 에러 → Prisma Client 재생성 필요
- `Raw query failed` 에러 → DB 스키마 동기화 필요

### 1-2. 기본 페이지 접속 테스트

브라우저에서 접속:
```
http://localhost:3000
```

**확인 사항:**
- 페이지가 정상적으로 로드됨
- 콘솔에 에러 없음

---

## 🔍 2단계: 관리자 대시보드 API 테스트

### 2-1. 관리자 로그인

먼저 관리자 계정으로 로그인해야 합니다.

### 2-2. 대시보드 API 호출

**방법 1: 브라우저에서 직접 접속**
```
http://localhost:3000/api/admin/dashboard
```

**방법 2: curl 명령어 사용**
```bash
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "Cookie: cg.sid.v2=YOUR_SESSION_ID" \
  | jq .
```

**예상 응답:**
```json
{
  "ok": true,
  "dashboard": {
    "trips": {
      "total": 1,
      "upcoming": 1,
      "inProgress": 0,
      "completed": 0
    },
    "currentTrips": [
      {
        "id": 19,
        "cruiseName": "MSC Bellissima",
        "userName": "김여행",
        "userPhone": "01012345678",
        "startDate": "2025-05-14T00:00:00.000Z",
        "endDate": null,
        "destination": null
      }
    ]
  }
}
```

**확인 사항:**
- ✅ `ok: true` 반환
- ✅ `trips` 객체에 `total`, `upcoming`, `inProgress`, `completed` 필드 존재
- ✅ `currentTrips` 배열이 정상적으로 반환됨
- ✅ `userName`, `userPhone`이 `Reservations`를 통해 정상적으로 가져와짐
- ❌ 에러 없음 (`Unknown argument`, `Raw query failed` 등)

**에러 발생 시:**
- `403 Forbidden` → 관리자 권한 확인 필요
- `500 Internal Server Error` → 서버 콘솔에서 에러 메시지 확인

---

## ⚙️ 3단계: Proactive Engine 테스트

### 3-1. Proactive Engine 수동 실행

**방법 1: API 엔드포인트 사용 (인증 필요)**

```bash
curl -X POST http://localhost:3000/api/scheduler/test \
  -H "Cookie: cg.sid.v2=YOUR_SESSION_ID" \
  -H "Content-Type: application/json"
```

**방법 2: 개발 환경용 엔드포인트 (인증 불필요)**

```bash
curl -X POST http://localhost:3000/api/scheduler/trigger \
  -H "Content-Type: application/json"
```

**예상 응답:**
```json
{
  "ok": true,
  "message": "Proactive Engine triggered successfully",
  "timestamp": "2025-01-XX..."
}
```

### 3-2. 서버 콘솔 로그 확인

서버 콘솔에서 다음 로그들이 정상적으로 출력되는지 확인:

```
[Proactive] 엔진 실행 시작: 2025-01-XX...
[Proactive] 여행 준비 알림 체크 완료 (0)
[Proactive] 승선 안내 체크 완료
[Proactive] 하선 준비 체크 완료
[Proactive] 귀선 경고 체크 완료
[Proactive] 피드백 수집 체크 완료
[Proactive] 엔진 실행 완료: 2025-01-XX...
```

**확인 사항:**
- ✅ 모든 트리거 함수가 에러 없이 실행됨
- ✅ `Trip` 모델의 `status` 필드가 정상적으로 조회됨
- ✅ `Reservations`를 통한 `User` 접근이 정상 작동
- ❌ `Unknown argument` 에러 없음
- ❌ `include: { User: true }` 관련 에러 없음

**에러 발생 시:**
- `Unknown argument 'status'` → `Trip` 모델에 `status` 필드가 없음 → `npx prisma db push` 재실행
- `Unknown argument 'User'` → `include: { User: true }` 제거 필요 (이미 수정됨)

---

## 🗄️ 4단계: DB 쿼리 직접 테스트

### 4-1. Prisma Studio로 DB 확인

```bash
npx prisma studio
```

브라우저에서 `http://localhost:5555` 접속

**확인 사항:**
1. **Trip 테이블:**
   - `status` 컬럼이 존재하는지 확인
   - 기본값이 `"Upcoming"`인지 확인
   - 기존 데이터에 `status` 값이 있는지 확인

2. **Reservation 테이블:**
   - `mainUserId`가 정상적으로 연결되어 있는지 확인
   - `Trip`과의 관계가 정상인지 확인

### 4-2. 직접 쿼리 테스트 (Node.js REPL)

```bash
cd /home/userhyeseon28/projects/cruise-guide
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 1. Trip 조회 (status 필드 포함)
    const trips = await prisma.trip.findMany({
      where: { status: 'Upcoming' },
      include: {
        Reservations: {
          include: {
            MainUser: {
              select: { id: true, name: true, phone: true }
            }
          }
        }
      },
      take: 1
    });
    
    console.log('✅ Trip 조회 성공:');
    console.log(JSON.stringify(trips, null, 2));
    
    // 2. Trip status 그룹화
    const tripsByStatus = await prisma.trip.groupBy({
      by: ['status'],
      _count: true
    });
    
    console.log('\\n✅ Trip status 그룹화 성공:');
    console.log(JSON.stringify(tripsByStatus, null, 2));
    
  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    console.error(error);
  } finally {
    await prisma.\$disconnect();
  }
})();
"
```

**예상 출력:**
```
✅ Trip 조회 성공:
[
  {
    "id": 19,
    "productCode": "20250514-MSC-BELLISSIMA",
    "shipName": "MSC Bellissima",
    "departureDate": "2025-05-14T00:00:00.000Z",
    "status": "Upcoming",
    "Reservations": [
      {
        "mainUserId": 2,
        "MainUser": {
          "id": 2,
          "name": "김여행",
          "phone": "01012345678"
        }
      }
    ]
  }
]

✅ Trip status 그룹화 성공:
[
  {
    "status": "Upcoming",
    "_count": 1
  }
]
```

**확인 사항:**
- ✅ `status` 필드가 정상적으로 조회됨
- ✅ `Reservations` → `MainUser` 관계가 정상 작동
- ✅ `groupBy` 쿼리가 정상 작동
- ❌ 에러 없음

---

## 🧪 5단계: 통합 테스트 시나리오

### 시나리오 1: 여행 상태 변경 테스트

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 1. Trip 상태를 InProgress로 변경
    const updated = await prisma.trip.update({
      where: { id: 19 },
      data: { status: 'InProgress' }
    });
    
    console.log('✅ Trip 상태 변경 성공:', updated.status);
    
    // 2. 관리자 대시보드에서 확인
    console.log('\\n📊 관리자 대시보드에서 확인:');
    console.log('http://localhost:3000/api/admin/dashboard');
    console.log('\\ncurrentTrips에 이 Trip이 포함되어야 합니다.');
    
  } catch (error) {
    console.error('❌ 에러:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
})();
"
```

### 시나리오 2: Proactive Engine 트리거 테스트

1. **D-7 알림 테스트를 위한 Trip 생성:**
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 7일 후 출발하는 Trip 생성
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    sevenDaysLater.setHours(0, 0, 0, 0);
    
    const trip = await prisma.trip.create({
      data: {
        productCode: 'TEST-D7-TRIP',
        shipName: 'Test Ship',
        departureDate: sevenDaysLater,
        status: 'Upcoming'
      }
    });
    
    console.log('✅ 테스트 Trip 생성:', trip.id);
    console.log('출발일:', trip.departureDate);
    
  } catch (error) {
    console.error('❌ 에러:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
})();
"
```

2. **Proactive Engine 실행:**
```bash
curl -X POST http://localhost:3000/api/scheduler/trigger
```

3. **서버 콘솔에서 로그 확인:**
   - `[Proactive] 여행 준비 알림 체크 완료 (1)` 메시지 확인
   - 에러 없이 실행되는지 확인

---

## ✅ 최종 체크리스트

모든 테스트를 완료한 후 다음을 확인하세요:

- [ ] 서버가 에러 없이 시작됨
- [ ] 관리자 대시보드 API가 정상 작동 (`/api/admin/dashboard`)
- [ ] Proactive Engine이 에러 없이 실행됨 (`/api/scheduler/trigger`)
- [ ] `Trip` 모델의 `status` 필드가 정상적으로 조회됨
- [ ] `Reservations` → `MainUser` 관계가 정상 작동
- [ ] Raw Query 에러가 발생하지 않음
- [ ] 서버 콘솔에 에러 로그가 없음

---

## 🐛 문제 해결

### 문제 1: `Unknown argument 'status'`

**원인:** DB 스키마가 최신 상태가 아님

**해결:**
```bash
npx prisma db push
npx prisma generate
```

### 문제 2: `Unknown argument 'User'`

**원인:** `include: { User: true }` 사용 (이미 수정됨)

**해결:** `include: { Reservations: { include: { MainUser: true } } }` 사용

### 문제 3: `Raw query failed`

**원인:** Raw Query의 테이블명/컬럼명 대소문자 불일치

**해결:** Prisma Client 사용 (이미 수정됨)

### 문제 4: 관리자 대시보드 403 에러

**원인:** 관리자 권한 없음

**해결:** 관리자 계정으로 로그인 필요

---

## 📞 추가 도움

문제가 계속 발생하면:
1. 서버 콘솔의 전체 에러 메시지 확인
2. `npx prisma studio`로 DB 상태 확인
3. `npx prisma validate`로 스키마 검증

---

**테스트 완료 후 서버를 재시작하여 모든 변경사항이 반영되었는지 확인하세요!** 🎉









