# 작업지시서: 크루즈 몰 구매 고객 → AI 가이드 온보딩 연동

**작성일**: 2026-02-26
**우선순위**: High (테스트 아이디 연동 및 자동화 구현)
**목표**: 크루즈 몰(cruisedot.co.kr) 구매 고객이 크루즈닷AI 가이드(cruiseai.co.kr)에서 "오늘의 브리핑" 온보딩이 동작하도록 연동

---

## 1. 목표 아키텍처 (최종 상태)

```
[크루즈 몰] 고객 결제 완료
  → /api/payment/webhook
    → AffiliateSale 생성 (기존)
    → Google Drive 폴더 생성 (기존)
    → [신규] UserTrip 생성 (buyerTel로 User 찾기)
    → [신규] Itinerary[] 생성 (itineraryPattern 파싱)
    → [신규] User.onboarded = true

[AI 가이드] 고객 로그인
  → /api/itinerary/current
    → UserTrip 찾기 (오늘이 startDate~endDate 범위)
    → Itinerary 찾기 (오늘 날짜)
    → 브리핑 데이터 반환 (기항지 + 언어 코드)
  → 오늘의 브리핑 표시
```

---

## 2. 현황 분석

### 2-1. 브리핑 동작에 필요한 필수 데이터

| 순서 | 테이블 | 필수 필드 |
|------|--------|-----------|
| 1 | `User` | name, phone, password('3800'), role='user', onboarded=true |
| 2 | `CruiseProduct` | productCode, itineraryPattern(배열), nights, days |
| 3 | `UserTrip` | userId, productId, startDate, endDate (오늘이 이 범위 내) |
| 4 | `Itinerary` | userTripId, day, date(오늘 날짜), type, location, country |

> **Order 모델은 불필요**: 스키마에 Order 모델 없음. AI 가이드 온보딩에 Payment 레코드 불필요.

### 2-2. 현재 누락된 것

**결제 webhook에 UserTrip 생성 로직 없음**

`/app/api/payment/webhook/route.ts`에 AffiliateSale, Google Drive, 이메일은 있지만 UserTrip 생성 없음. 결제 완료 후 AI 가이드 로그인해도 여행 데이터가 없어 온보딩 불가.

**Payment 모델에 userId FK 없음**

```prisma
model Payment {
  buyerTel String  // 전화번호만, userId FK 없음
}
```

전화번호 기반 lookup으로 User와 연결해야 함.

**LANGUAGE_MAP에 ISO 코드 없음**

itineraryPattern.country가 'JP', 'GR' 등 ISO 코드로 저장된 경우 LANGUAGE_MAP 매핑 실패 → 영어 폴백. (`WORK_ORDER_ITINERARY_FIX.md` BUG-04 함께 수정 필요)

---

## 3. 기존 활용 가능한 스크립트

| 파일 | 용도 | 상태 |
|------|------|------|
| `scripts/create-purchase-customer.ts` | 구매 고객 테스트 데이터 완전 생성 | 거의 완성 (날짜 조정 필요) |
| `scripts/create-test-trip.ts` | 특정 유저에게 여행 생성 | 사용 가능 |
| `scripts/repair-genie-trip.ts` | REAL-CRUISE-01 기준 UserTrip 재생성 | 사용 가능 |
| `scripts/setup_trial_user_trip.ts` | 무료체험용 (하드코딩된 ID) | 수정 필요 |

---

## 4. 단계별 작업지시서

### STEP 1: 즉시 실행 — 테스트 아이디 브리핑 테스트

**전제**: REAL-CRUISE-01 상품의 `itineraryPattern`이 올바른 배열이어야 함.

REAL-CRUISE-01 itineraryPattern 확인:
```bash
cd /home/userhyeseon28/projects/cruise-guide
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.cruiseProduct.findUnique({ where: { productCode: 'REAL-CRUISE-01' }, select: { itineraryPattern: true, nights: true, days: true } })
  .then(r => { console.log(JSON.stringify(r, null, 2)); p.\$disconnect(); });
"
```

기존 스크립트 실행:
```bash
npx tsx scripts/create-purchase-customer.ts
```

---

### STEP 1-A: 오늘의 브리핑 즉시 테스트용 스크립트 신규 작성

**파일 경로**: `scripts/setup-today-test-trip.ts`

```typescript
/**
 * scripts/setup-today-test-trip.ts
 *
 * 오늘의 브리핑 즉시 테스트용 스크립트.
 * 지정 사용자의 여행 날짜를 오늘 기준으로 재설정한다.
 *
 * 사용법:
 *   npx tsx scripts/setup-today-test-trip.ts <전화번호> <productCode> <오늘이_몇번째_날>
 * 예시:
 *   npx tsx scripts/setup-today-test-trip.ts 01012345678 REAL-CRUISE-01 3
 *   (3일차가 오늘이 되도록 날짜 세팅)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizePattern(raw: any): any[] {
  if (!raw) return [];
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (Array.isArray(parsed)) return parsed;
  if (parsed.days && Array.isArray(parsed.days)) return parsed.days;
  return [];
}

async function main() {
  const [, , phone, productCode, todayDayStr] = process.argv;

  if (!phone || !productCode || !todayDayStr) {
    console.error('사용법: npx tsx scripts/setup-today-test-trip.ts <전화번호> <productCode> <오늘이_몇번째_날>');
    process.exit(1);
  }

  const todayDay = parseInt(todayDayStr, 10);
  if (isNaN(todayDay) || todayDay < 1) {
    console.error('오늘이_몇번째_날은 1 이상의 정수여야 합니다.');
    process.exit(1);
  }

  const normalizedPhone = phone.replace(/\D/g, '');
  const user = await prisma.user.findFirst({
    where: { phone: normalizedPhone },
    select: { id: true, name: true, phone: true },
  });

  if (!user) { console.error(`사용자를 찾을 수 없습니다: ${normalizedPhone}`); process.exit(1); }
  console.log(`사용자: ${user.name} (${user.phone}), ID: ${user.id}`);

  const product = await prisma.cruiseProduct.findUnique({
    where: { productCode },
    select: { id: true, productCode: true, cruiseLine: true, shipName: true, nights: true, days: true, itineraryPattern: true },
  });

  if (!product) { console.error(`상품을 찾을 수 없습니다: ${productCode}`); process.exit(1); }
  console.log(`상품: ${product.cruiseLine} ${product.shipName} (${product.nights}박 ${product.days}일)`);

  // 오늘이 todayDay가 되도록 startDate 역산
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (todayDay - 1));

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + product.days - 1);
  endDate.setHours(23, 59, 59, 999);

  console.log(`startDate: ${startDate.toISOString().split('T')[0]} (오늘이 day ${todayDay})`);

  // 기존 UserTrip + Itinerary 삭제
  const existingTrips = await prisma.userTrip.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  for (const trip of existingTrips) {
    await prisma.itinerary.deleteMany({ where: { userTripId: trip.id } });
  }
  await prisma.userTrip.deleteMany({ where: { userId: user.id } });

  // itineraryPattern 파싱
  const pattern = normalizePattern(product.itineraryPattern);

  // UserTrip 생성
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const userTrip = await prisma.userTrip.create({
    data: {
      userId: user.id,
      productId: product.id,
      reservationCode: `CRD-${dateStr}-TEST`,
      cruiseName: `${product.cruiseLine} ${product.shipName}`,
      startDate,
      endDate,
      nights: product.nights,
      days: product.days,
      status: 'Active',
      updatedAt: new Date(),
    },
  });

  console.log(`UserTrip 생성: ID=${userTrip.id}`);

  // Itinerary 생성
  const itineraries = pattern.map((p: any) => {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + p.day - 1);
    return {
      userTripId: userTrip.id,
      day: p.day,
      date: dayDate,
      type: p.type || 'sea',
      location: p.location || null,
      country: p.country || null,
      arrival: p.arrival || null,
      departure: p.departure || null,
      updatedAt: new Date(),
    };
  });

  await prisma.itinerary.createMany({ data: itineraries });
  console.log(`Itinerary 생성: ${itineraries.length}개`);

  // 온보딩 완료 표시
  await prisma.user.update({ where: { id: user.id }, data: { onboarded: true } });

  // 오늘 날짜 확인
  const todayItinerary = itineraries.find(it => it.date.toDateString() === today.toDateString());
  if (todayItinerary) {
    const isSea = !todayItinerary.type || ['sea', 'cruising'].includes(todayItinerary.type.toLowerCase());
    console.log(`\n오늘(day ${todayDay}): type=${todayItinerary.type}, location=${todayItinerary.location}`);
    console.log(`브리핑: ${isSea ? '항해 중' : `기항지 "${todayItinerary.location}" 브리핑 예정`}`);
  }

  console.log(`\n완료! ${user.name}(${user.phone})으로 로그인 후 오늘의 브리핑 확인 가능. (비밀번호: 3800)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

**실행 방법**:
```bash
# REAL-CRUISE-01 상품에서 오늘이 3일차(기항지)가 되도록 설정
npx tsx scripts/setup-today-test-trip.ts 01012345678 REAL-CRUISE-01 3
```

---

### STEP 2: 핵심 개발 — 결제 완료 후 UserTrip 자동 생성

**파일**: `app/api/payment/webhook/route.ts`

AffiliateSale 생성 블록 이후에 아래 로직 추가:

```typescript
// [UserTrip 자동 생성] 결제 완료 시 AI 가이드 여행 데이터 연동
if (status === 'paid' && buyerTel && productCode) {
  try {
    const normalizedPhone = buyerTel.replace(/\D/g, '');

    const [customer, product] = await Promise.all([
      prisma.user.findFirst({
        where: { phone: normalizedPhone, role: 'user' },
        select: { id: true, name: true },
      }),
      prisma.cruiseProduct.findUnique({
        where: { productCode },
        select: {
          id: true, cruiseLine: true, shipName: true,
          nights: true, days: true, itineraryPattern: true, startDate: true
        },
      }),
    ]);

    if (customer && product) {
      const existingTrip = await prisma.userTrip.findFirst({
        where: { userId: customer.id, productId: product.id },
      });

      if (!existingTrip) {
        // 출발일: 상품 startDate 우선, 없으면 오늘+30일
        const startDate = product.startDate
          ? new Date(product.startDate)
          : (() => { const d = new Date(); d.setDate(d.getDate() + 30); d.setHours(0,0,0,0); return d; })();

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + product.days - 1);
        endDate.setHours(23, 59, 59, 999);

        // itineraryPattern 파싱
        const rawPattern = product.itineraryPattern;
        let patternDays: any[] = [];
        if (rawPattern) {
          const parsed = typeof rawPattern === 'string' ? JSON.parse(rawPattern) : rawPattern;
          patternDays = Array.isArray(parsed) ? parsed : (parsed.days || []);
        }

        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
        const rand = Math.floor(Math.random() * 10000).toString().padStart(4,'0');

        const userTrip = await prisma.userTrip.create({
          data: {
            userId: customer.id,
            productId: product.id,
            reservationCode: `CRD-${dateStr}-${rand}`,
            cruiseName: `${product.cruiseLine} ${product.shipName}`,
            startDate,
            endDate,
            nights: product.nights,
            days: product.days,
            status: 'Upcoming',
            updatedAt: new Date(),
          },
        });

        if (patternDays.length > 0) {
          const itineraries = patternDays.map((p: any) => {
            const dayDate = new Date(startDate);
            dayDate.setDate(startDate.getDate() + p.day - 1);
            return {
              userTripId: userTrip.id,
              day: p.day,
              date: dayDate,
              type: p.type || 'sea',
              location: p.location || null,
              country: p.country || null,
              arrival: p.arrival || null,
              departure: p.departure || null,
              updatedAt: new Date(),
            };
          });
          await prisma.itinerary.createMany({ data: itineraries });
        }

        await prisma.user.update({
          where: { id: customer.id },
          data: { onboarded: true },
        });

        console.log(`[Webhook] UserTrip 자동 생성: userId=${customer.id}, tripId=${userTrip.id}`);
      }
    }
  } catch (userTripError) {
    // UserTrip 생성 실패는 결제 처리를 방해하면 안 됨
    console.error('[Webhook] UserTrip 자동 생성 실패 (결제는 정상 완료):', userTripError);
  }
}
```

---

### STEP 3: 3800 로그인 startDate 개선

**파일**: `app/api/auth/login/route.ts` line 1844

```typescript
// 현재 (항상 +30일 고정)
const startDate = new Date(now);
startDate.setDate(startDate.getDate() + 30);

// 개선: 상품의 실제 startDate 우선 사용
const startDate = realProduct.startDate
  ? new Date(realProduct.startDate)
  : (() => { const d = new Date(now); d.setDate(d.getDate() + 30); d.setHours(0,0,0,0); return d; })();
```

---

## 5. 수정 순서 및 체크리스트

```
즉시 실행:
1. REAL-CRUISE-01 itineraryPattern 내용 확인
2. setup-today-test-trip.ts 스크립트 파일 작성
3. 테스트 아이디로 실행 → 브리핑 동작 확인

개발 작업:
4. STEP 2: webhook/route.ts UserTrip 자동 생성 로직 추가
5. STEP 3: login/route.ts startDate 개선
6. WORK_ORDER_ITINERARY_FIX.md BUG-04 (LANGUAGE_MAP ISO 코드 추가) 함께 수정
```

**체크리스트**
- [ ] REAL-CRUISE-01의 itineraryPattern 배열 확인 (비어있는지 여부)
- [ ] `scripts/setup-today-test-trip.ts` 파일 작성
- [ ] 테스트 아이디 실행 후 `/api/itinerary/current` 응답 확인
- [ ] `webhook/route.ts` UserTrip 자동 생성 로직 추가
- [ ] `login/route.ts` startDate 개선
- [ ] LANGUAGE_MAP ISO 코드 추가 (`WORK_ORDER_ITINERARY_FIX.md` BUG-04)
- [ ] `login/route.ts` console.log 약 20개 logger로 교체

---

## 6. REAL-CRUISE-01 itineraryPattern이 비어 있는 경우

어드민 패널(`/admin/products/REAL-CRUISE-01`)에서 직접 일정 등록:
- Day 1: Embarkation, 출항지, 출발 시각
- Day 2~N-1: PortVisit 또는 sea (항해 중)
- Day N: Disembarkation, 입항지, 도착 시각

등록 후 `setup-today-test-trip.ts` 재실행.
