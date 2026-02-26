# 작업지시서: 3사이트 분리 중 배포 순서 및 커밋 전략

**작성일**: 2026-02-26
**작성자**: Claude (비판적·현실적 검토 기반)
**현재 상태**: 사이트 분리 Phase 2 완료, Phase 3(크루즈가이드AI 앱 분리) 진행 중

---

## 1. 현황 비판적 분석

### 1-1. 핵심 문제: 한 레포에 세 사이트가 혼재

```
cruise-guide/ (현재 단일 레포)
├── cruiseai.co.kr    → 크루즈닷AI 가이드 (분리 대상 1순위)
├── cruisedot.co.kr   → 크루즈몰 (판매몰)
└── mabizcruisedot.com → CRM/어드민
```

**현실**: 사이트 분리가 완료되지 않은 상태에서 두 도메인에 걸친 버그 수정이 쌓여 있음.
**위험**: 배포 순서를 잘못 잡으면 한 사이트의 버그 수정이 다른 사이트 코드와 묶여 롤백 범위가 커진다.

### 1-2. 현재 변경 파일의 도메인 분류

| 파일 | 도메인 | 성격 | 심각도 |
|------|--------|------|--------|
| `components/admin/FlightInfoEditor.tsx` | ADMIN(CRM) | BUG_FIX | 🔴 Critical |
| `app/api/admin/products/route.ts` | ADMIN(CRM) | BUG_FIX | 🔴 Critical |
| `app/admin/products/[productCode]/page.tsx` | ADMIN(CRM) | BUG_FIX | 🟠 High |
| `app/api/admin/products/[productCode]/route.ts` | ADMIN(CRM) | BUG_FIX | 🟠 High |
| `app/api/itinerary/current/route.ts` | GUIDE(AI) | BUG_FIX | 🟠 High |
| `data/countries.json` | SHARED | BUG_FIX | 🟡 Medium |
| `app/admin/products/new/page.tsx` | ADMIN(CRM) | BUG_FIX | 🟡 Medium |
| `app/api/admin/itinerary-groups/route.ts` | ADMIN(CRM) | NEW_FEATURE | 🟢 Feature |
| `app/api/admin/itinerary-groups/[groupId]/route.ts` | ADMIN(CRM) | NEW_FEATURE | 🟢 Feature |
| `components/admin/EnhancedItineraryEditor.tsx` | ADMIN(CRM) | NEW_FEATURE | 🟢 Feature |
| `scripts/fix-layout-key-migration.ts` | TOOLING | MIGRATION | ⚙️ Script |
| `scripts/setup-today-test-trip.ts` | TOOLING | SCRIPT | ⚙️ Script |

### 1-3. 비판적 판단: 지금 당장 배포해야 할 것

**BUG-001(FlightInfoEditor) + BUG-002(layout key)는 현재 PRODUCTION에서 broken 상태**:
- roundtrip 항공권 상품 편집 → 항공 정보 전부 빈값
- 신규 상품 등록 후 편집 페이지 열면 → 전체 콘텐츠 소실

이 두 버그는 어드민 운영을 실질적으로 막고 있다. 다른 작업보다 최우선 배포.

---

## 2. 커밋 전략 (사이트 분리 이후 cherry-pick 대용)

사이트가 분리되면 각 레포에 관련 커밋만 cherry-pick해야 한다.
지금부터 커밋을 **도메인별로 atomic하게** 분리하면 미래 비용이 줄어든다.

### 커밋 prefix 규칙

```
fix(admin): CRM/어드민 버그 수정
fix(mall): 판매몰 버그 수정
fix(guide): 크루즈가이드AI 버그 수정
feat(admin): CRM/어드민 신기능
feat(guide): 크루즈가이드AI 신기능
chore(migration): DB 마이그레이션
chore(script): 개발 도구/스크립트
```

---

## 3. 배포 순서 및 커밋 계획

### PHASE-A: 🔴 Critical — 즉시 커밋 + 배포 (오늘)

**목적**: PRODUCTION broken 상태 복구
**범위**: FlightInfoEditor + layout key 불일치 수정

```
커밋 A-1: fix(admin): FlightInfoEditor roundtrip 편집 회귀 수정 (BUG-001)
  - components/admin/FlightInfoEditor.tsx

커밋 A-2: fix(admin): POST API layout 키 5개 통일 (BUG-002)
  - app/api/admin/products/route.ts

커밋 A-3: fix(admin): 편집 페이지 구형 키 fallback 추가 (BUG-004)
  - app/admin/products/[productCode]/page.tsx
```

> ⚠️ A-1, A-2, A-3은 함께 배포해야 한다. A-2만 배포하면 기존 데이터 못 읽음.

**배포 후 즉시 실행**:
```bash
npx tsx scripts/fix-layout-key-migration.ts --dry-run  # 영향 범위 확인
npx tsx scripts/fix-layout-key-migration.ts             # 실제 마이그레이션
```

---

### PHASE-B: 🟠 High — PHASE-A 배포 후 24시간 이내

**목적**: 기항지 AI 브리핑 언어 오류 + PUT 동기화 버그
**범위**: Guide AI 수정 + CRM PUT route 수정

```
커밋 B-1: fix(guide): LANGUAGE_MAP 지중해·유럽 국가 추가 (BUG-04)
  - app/api/itinerary/current/route.ts

커밋 B-2: fix(admin): PUT 동기화 currency/language 필드 추가 (BUG-03)
  - app/api/admin/products/[productCode]/route.ts
```

> B-1은 Guide 도메인, B-2는 Admin 도메인 → 커밋 분리로 미래 cherry-pick 준비

---

### PHASE-C: 🟡 Medium — 안정화 확인 후

**목적**: 기항지 국가코드 연결 + 신규 등록 itineraryPattern 정상화
**범위**: SHARED data + new/page.tsx

```
커밋 C-1: fix(shared): 주요 기항지 국가 code 필드 추가 (BUG-01)
  - data/countries.json

커밋 C-2: fix(admin): 신규 상품 itineraryPattern 실제 데이터로 생성 (BUG-02)
  - app/admin/products/new/page.tsx (itineraryPattern 빌드 로직)

커밋 C-3: fix(admin): 1일차 type 강제 지정 제거 (BUG-05)
  - app/api/admin/products/[productCode]/route.ts (type 로직)
```

---

### PHASE-D: 🟡 후처리 — Migration 완료 확인 후

**목적**: PHASE-A에서 추가한 임시 fallback 코드 제거

```
커밋 D-1: fix(admin): layout 키 마이그레이션 완료 — fallback 코드 제거
  - app/admin/products/[productCode]/page.tsx

  변경: parsedLayout.blocks ?? parsedLayout.detailBlocks
      → parsedLayout.blocks (하위 호환 제거)
```

> ⚠️ DB에 구형 키(`detailBlocks` 등) 없음 확인 후에만 실행

---

### PHASE-E: 🟢 Feature — QA 완료 후

**목적**: 일정 그룹 저장/불러오기 신기능
**범위**: itinerary-groups API + EnhancedItineraryEditor UI

```
커밋 E-1: feat(admin): 일정 그룹 API 개선 (nights 필터, DELETE, PUT)
  - app/api/admin/itinerary-groups/route.ts
  - app/api/admin/itinerary-groups/[groupId]/route.ts

커밋 E-2: feat(admin): 일정 그룹 UI — 기간 필터, 삭제, 수정 기능
  - components/admin/EnhancedItineraryEditor.tsx
```

---

### PHASE-F: ⚙️ Tooling — 별도 관리

```
커밋 F-1: chore(migration): layout 키 DB 마이그레이션 스크립트
  - scripts/fix-layout-key-migration.ts

커밋 F-2: chore(script): 오늘의 AI 브리핑 테스트용 여행 설정 스크립트
  - scripts/setup-today-test-trip.ts
```

---

## 4. 사이트 분리 관점에서의 판단

### 4-1. 크루즈가이드AI 분리 시 가져갈 파일

PHASE-B의 커밋 B-1(LANGUAGE_MAP)만 guide 레포로 cherry-pick.
나머지 admin 관련 커밋은 CRM 레포로 cherry-pick.

### 4-2. 현재 작업과 사이트 분리의 관계

```
현재 작업들이 분리에 미치는 영향:
  - PHASE-A/B/C/D: admin/CRM 코드 → 분리 시 CRM 레포로 이동
  - PHASE-B(B-1): guide AI 코드 → 분리 시 Guide 레포로 이동
  - PHASE-E: admin/CRM 신기능 → 분리 시 CRM 레포로 이동

결론: 지금 커밋을 atomic하게 분리하면 나중에 cherry-pick 비용 최소화
```

### 4-3. 사이트 분리 전 배포 vs 분리 후 배포

| 시나리오 | 장점 | 단점 |
|----------|------|------|
| **지금 배포** (권장) | critical 버그 즉시 복구 | 단일 레포 배포 |
| **분리 후 배포** | 깔끔한 아키텍처 | critical 버그가 며칠~주 더 방치됨 |

**결론**: Critical 버그(PHASE-A)는 분리와 무관하게 즉시 배포해야 한다.
Feature(PHASE-E)는 사이트 분리 전략과 맞춰 타이밍을 선택할 수 있다.

---

## 5. 리스크 관리

### 5-1. DB Migration 리스크

```
위험: fix-layout-key-migration.ts는 기존 DB 레코드를 변경하는 되돌리기 어려운 작업
완화:
  1. dry-run으로 영향 범위 먼저 확인
  2. Prisma 백업 후 실행 (scripts/backup-prisma-safe.cjs 활용)
  3. 소수 레코드 샘플 확인 후 전체 실행
```

### 5-2. fallback 코드 제거 타이밍 리스크

```
위험: Migration 전에 fallback 제거하면 구형 키 데이터 못 읽음
완화:
  1. Migration 완료 확인 쿼리 실행:
     SELECT COUNT(*) FROM "MallProductContent"
     WHERE layout::jsonb ? 'detailBlocks'
     OR layout::jsonb ? 'includedItems';
  2. 결과가 0이면 안전하게 fallback 제거
```

### 5-3. itinerary-groups @updatedAt 없음

```
위험: ItineraryGroup.updatedAt에 @updatedAt 없어서 자동 업데이트 안 됨
완화: PUT handler에서 updatedAt: new Date() 수동 설정 (이미 완료)
장기: prisma migrate로 @updatedAt 추가 권장
```

---

## 6. 서브에이전트 오케스트레이션 계획

### 즉시 실행 (병렬)

| 에이전트 | 작업 | 우선순위 |
|----------|------|----------|
| git-commit | PHASE-A 커밋 3개 생성 | P0 |
| pre-commit-validator | TypeScript + 빌드 검증 | P0 |
| database-query | Migration dry-run 실행 | P0 |

### PHASE-A 배포 확인 후

| 에이전트 | 작업 | 우선순위 |
|----------|------|----------|
| git-commit | PHASE-B, C 커밋 생성 | P1 |
| database-query | Migration 실제 실행 | P1 |

### 안정화 후

| 에이전트 | 작업 | 우선순위 |
|----------|------|----------|
| git-commit | PHASE-D fallback 제거 | P2 |
| git-commit | PHASE-E 신기능 커밋 | P3 |
| git-commit | PHASE-F 스크립트 커밋 | P3 |

---

## 7. 실행 체크리스트

### 사전 조건 확인
- [ ] `npx tsc --noEmit` 오류 없음
- [ ] `npm run build` 성공 (로컬 또는 CI)

### PHASE-A 커밋 (Critical)
- [ ] FlightInfoEditor.tsx 커밋
- [ ] products/route.ts (POST) 커밋
- [ ] [productCode]/page.tsx fallback 커밋
- [ ] PHASE-A 3커밋 배포 (Vercel push)
- [ ] 어드민에서 roundtrip 상품 편집 테스트

### DB Migration
- [ ] `npx tsx scripts/fix-layout-key-migration.ts --dry-run` 결과 확인
- [ ] Prisma 백업 실행
- [ ] `npx tsx scripts/fix-layout-key-migration.ts` 실행
- [ ] 영향받은 레코드 편집 페이지에서 정상 확인

### PHASE-B 커밋 (High)
- [ ] itinerary/current/route.ts (LANGUAGE_MAP) 커밋 — fix(guide):
- [ ] [productCode]/route.ts (currency/language) 커밋 — fix(admin):
- [ ] 배포 후 그리스 산토리니 기항지 → AI 브리핑 언어 그리스어 확인

### PHASE-C 커밋 (Medium)
- [ ] countries.json 커밋
- [ ] new/page.tsx itineraryPattern 커밋
- [ ] BUG-05 type 로직 커밋

### PHASE-D (Migration 완료 후)
- [ ] DB에 구형 키 없음 확인 쿼리 실행
- [ ] page.tsx fallback 코드 제거 커밋

### PHASE-E 커밋 (Feature)
- [ ] itinerary-groups API 커밋
- [ ] EnhancedItineraryEditor UI 커밋
- [ ] 어드민에서 그룹 저장 → 기간 필터 → 불러오기 → 수정 → 삭제 테스트

### PHASE-F (Scripts)
- [ ] fix-layout-key-migration.ts 커밋
- [ ] setup-today-test-trip.ts 커밋

---

## 8. 미수행 항목 (다음 세션 과제)

1. **BUG-005**: `[productCode]/route.ts` console.log 10개 제거 (보안 정보 노출)
2. **Webhook UserTrip 자동 생성**: 결제 완료 후 UserTrip + Itinerary 자동 생성
   - `app/api/payment/webhook/route.ts` 수정 필요
   - WORK_ORDER_ONBOARDING_CONNECTION.md 참조
3. **ItineraryGroup schema**: `@updatedAt` 추가 마이그레이션
4. **사이트 분리 Phase 3**: /translator, /chat, /my-trips, /map 크루즈가이드AI 앱 분리
