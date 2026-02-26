# 작업지시서: FlightInfoEditor 버그 수정

**작성일**: 2026-02-26
**우선순위**: 즉시 (Critical 2건)
**관련 파일**: `components/admin/FlightInfoEditor.tsx`, `app/api/admin/products/route.ts`, `app/api/admin/products/[productCode]/route.ts`, `app/admin/products/[productCode]/page.tsx`

---

## [BUG-001] FlightInfoEditor useEffect 동기화 회귀 버그

**심각도**: Critical — 기존 왕복 항공권 편집 기능 완전히 파괴

**파일**: `components/admin/FlightInfoEditor.tsx` (lines 92, 107-114)

**증상**
- 기존에 저장된 `flightType: 'roundtrip'` 상품을 편집 페이지에서 열면 출발지, 도착지, 편명, 시간이 모두 빈 값으로 표시됨
- `none_local`, `none_domestic` 타입 상품은 유형이 다르므로 조건 통과 → 정상 표시

**원인**
초기 state에 `flightType: 'roundtrip'`을 추가함으로써 동기화 조건이 무력화됨.

```typescript
// 수정 전 동작: currentType = undefined
// 'roundtrip' !== undefined → true → 동기화 성공 ✓

// 수정 후 현재 코드: currentType = 'roundtrip'
if (
  externalType !== currentType ||           // 'roundtrip' !== 'roundtrip' → false
  flightInfo.cruiseEmbarkPort !== prev.cruiseEmbarkPort ||  // '' !== '' → false
  flightInfo.cruiseDisembarkPort !== prev.cruiseDisembarkPort || // '' !== '' → false
  flightInfo.selfArrangeNote !== prev.selfArrangeNote       // '' !== '' → false
) {
  return { ...flightInfo };  // 이 블록에 절대 진입 안 함
}
return prev;  // 항상 빈 초기값 반환 → 버그
```

**수정 코드**

```typescript
// components/admin/FlightInfoEditor.tsx
// 동기화 조건 전체 제거 — prop이 있으면 무조건 덮어쓰기
useEffect(() => {
  if (flightInfo !== null && flightInfo !== undefined) {
    setLocalFlightInfo({ ...flightInfo });
  }
}, [flightInfo]);
```

> 부모가 `flightInfo` 객체를 매 렌더마다 새로 생성하면 무한 루프 발생. 편집 페이지에서 `flightInfo` state는 `setFlightInfo(parsedLayout.flightInfo || null)`로 한 번만 설정되므로 현재 구조에서는 위 단순화로 충분.

---

## [BUG-002] POST API와 PUT API의 layoutData 키 이름 불일치

**심각도**: Critical — 신규 등록 상품 편집 시 전체 콘텐츠 소실

**파일**: `app/api/admin/products/route.ts` vs `app/api/admin/products/[productCode]/route.ts`

**증상**
- 신규 등록한 상품을 편집 페이지에서 열면 상세 블록, 포함/불포함, 일정, 요금표가 모두 빈 상태
- 이후 저장(PUT)하면 POST가 기록한 데이터는 영구 덮어씌워짐

**원인** — 키 이름 불일치

| 데이터 | POST 저장 키 (`route.ts`) | PUT 저장/읽기 키 (`[productCode]/route.ts`) |
|--------|--------------------------|---------------------------------------------|
| 상세 블록 | `layoutData.detailBlocks` | `layoutData.blocks` |
| 포함 사항 | `layoutData.includedItems` | `layoutData.included` |
| 불포함 사항 | `layoutData.excludedItems` | `layoutData.excluded` |
| 일정 | `layoutData.itineraryDays` | `layoutData.itinerary` |
| 요금표 | `layoutData.pricingRows` | `layoutData.pricing` |

편집 페이지 로드 시 `parsedLayout.blocks` 등 PUT 키 기준으로 읽으므로, POST로 저장된 `detailBlocks` 등은 절대 읽히지 않음.

**수정 코드** — POST 라우트를 PUT 기준으로 통일

```typescript
// app/api/admin/products/route.ts (POST 핸들러)
if (detailBlocks !== undefined) {
  layoutData.blocks = detailBlocks || [];       // detailBlocks → blocks
}
if (includedItems !== undefined) {
  layoutData.included = includedItems || [];     // includedItems → included
}
if (excludedItems !== undefined) {
  layoutData.excluded = excludedItems || [];     // excludedItems → excluded
}
if (itineraryDays !== undefined) {
  layoutData.itinerary = itineraryDays || [];   // itineraryDays → itinerary
}
if (pricingRows !== undefined) {
  layoutData.pricing = pricingRows || [];       // pricingRows → pricing
}
```

구글 드라이브 백업 처리 코드(route.ts lines 303-341)의 `layoutData.detailBlocks`, `layoutData.itineraryDays` 참조도 함께 변경 필요.

---

## [BUG-003] 신규 등록 시 layout 이중 저장으로 DB 데이터 오염

**심각도**: High

**파일**: `app/admin/products/new/page.tsx` (lines 729-793)

**증상**
신규 상품 등록 후 DB의 `MallProductContent.layout`에 두 세트의 키가 공존하는 오염된 JSON 저장:

```json
{
  "detailBlocks": [...],
  "blocks": [...],
  "includedItems": [...],
  "included": [...],
  ...
}
```

**원인**: POST(`detailBlocks` 등) → PUT(`blocks` 등) 순서로 upsert, PUT이 기존 layout을 읽어 병합하므로 두 세트 공존.

**수정 방법**: BUG-002 수정(POST 키 통일) 후, 기존 오염 데이터 정리 마이그레이션 스크립트 실행.

```typescript
// scripts/fix-layout-key-migration.ts (신규 작성 필요)
const records = await prisma.mallProductContent.findMany();
for (const record of records) {
  const layout = record.layout as any;
  if (!layout) continue;
  let updated = false;

  // 구형 키 → 신형 키 마이그레이션 (신형 키가 없는 경우만)
  const migrations = [
    ['detailBlocks', 'blocks'],
    ['includedItems', 'included'],
    ['excludedItems', 'excluded'],
    ['itineraryDays', 'itinerary'],
    ['pricingRows', 'pricing'],
  ];

  for (const [oldKey, newKey] of migrations) {
    if (layout[oldKey] && !layout[newKey]) {
      layout[newKey] = layout[oldKey];
      delete layout[oldKey];
      updated = true;
    } else if (layout[oldKey] && layout[newKey]) {
      delete layout[oldKey]; // 중복 제거 (신형 키 우선)
      updated = true;
    }
  }

  if (updated) {
    await prisma.mallProductContent.update({
      where: { productCode: record.productCode },
      data: { layout }
    });
    console.log(`마이그레이션 완료: ${record.productCode}`);
  }
}
```

---

## [BUG-004] 편집 페이지 구형 키 fallback 없음 (마이그레이션 전 임시 보호)

**심각도**: High (BUG-002와 연계)

**파일**: `app/admin/products/[productCode]/page.tsx` (lines 695-699, 1072-1083)

마이그레이션 스크립트 실행 전까지 구형 키 데이터를 읽을 수 없으므로, 임시 fallback 추가:

```typescript
// 초기 로드 및 reload 공통 — 임시 하위 호환 fallback
setDetailBlocks(
  parsedLayout.blocks ?? parsedLayout.detailBlocks ?? []
);
setIncludedItems(
  parsedLayout.included ?? parsedLayout.includedItems ?? []
);
setExcludedItems(
  parsedLayout.excluded ?? parsedLayout.excludedItems ?? []
);
setItineraryDays(
  parsedLayout.itinerary ?? parsedLayout.itineraryDays ?? []
);
setPricingRows(
  parsedLayout.pricing ?? parsedLayout.pricingRows ?? []
);
```

마이그레이션 완료 후 fallback 코드 제거.

---

## [BUG-005] 프로덕션 코드에 잔존하는 디버깅 console.log

**심각도**: Low (보안 정보 노출 위험)

**파일**: `app/api/admin/products/[productCode]/route.ts` (lines 18, 23, 33-37, 49-50, 67-70, 75, 79)

세션 ID 앞 10자가 로그에 노출됨. `@/lib/logger` 교체 또는 개발 환경 조건 추가 필요.

---

## 수정 순서 및 체크리스트

```
1. [BUG-001] FlightInfoEditor.tsx useEffect 단순화          ← 즉시 (Critical)
2. [BUG-004] 편집 페이지 fallback 추가 (임시 보호막)        ← 즉시
3. [BUG-002] POST route.ts 키 이름 5개 통일                 ← 즉시 (Critical)
4. [BUG-003] fix-layout-key-migration.ts 작성 및 실행       ← BUG-002 후
5. [BUG-004] fallback 코드 제거                             ← 마이그레이션 후
6. [BUG-005] console.log 정리                               ← 다음 배포 전
```

**체크리스트**
- [ ] BUG-001: FlightInfoEditor.tsx useEffect 수정 + roundtrip 편집 테스트
- [ ] BUG-002: route.ts(POST) 키 5개 변경 + 구글드라이브 참조도 함께 변경
- [ ] BUG-003: 마이그레이션 스크립트 작성 및 실행
- [ ] BUG-004: 편집 페이지 2곳에 fallback 추가 (lines 695-699, 1072-1083)
- [ ] BUG-005: `[productCode]/route.ts` console.log 10개 제거
- [ ] 회귀 테스트: 기존 roundtrip 상품 편집 페이지 정상 로드 확인
- [ ] 회귀 테스트: 신규 상품 등록 후 DB layout 키 오염 없음 확인

**Merge 조건**: BUG-001, BUG-002 수정 및 BUG-003 마이그레이션 실행 완료 후 머지 허용
