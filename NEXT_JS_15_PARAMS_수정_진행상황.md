# Next.js 15 Params Promise 수정 진행 상황

**날짜**: 2025-01-27
**작업자**: Claude (AI Assistant)
**목적**: Next.js 15 업그레이드로 인한 params/searchParams Promise 처리 수정

---

## 📊 전체 현황

### ✅ 완료된 작업 (31개)

#### 1. 고객용 페이지 (7개)
- ✅ `/[mallUserId]/shop/page.tsx` - 판매몰
- ✅ `/[mallUserId]/dashboard/page.tsx` - 대시보드
- ✅ `/[mallUserId]/profile/page.tsx` - 프로필
- ✅ `/[mallUserId]/customers/page.tsx` - 고객관리
- ✅ `/[mallUserId]/payment/page.tsx` - 결제 페이지
- ✅ `/products/[productCode]/page.tsx` - 상품 상세
- ✅ `/chat-bot/share/[token]/page.tsx` - 챗봇 공유

#### 2. 판매원/대리점장 페이지 (16개)
- ✅ `/partner/[partnerId]/dashboard/page.tsx` - 대시보드
- ✅ `/partner/[partnerId]/links/page.tsx` - 링크 관리
- ✅ `/partner/[partnerId]/customers/page.tsx` - 고객 관리
- ✅ `/partner/[partnerId]/profile/page.tsx` - 프로필
- ✅ `/partner/[partnerId]/passport-requests/page.tsx` - 여권 등록
- ✅ `/partner/[partnerId]/agents/page.tsx` - 판매원 관리
- ✅ `/partner/[partnerId]/team/page.tsx` - 팀 관리
- ✅ `/partner/[partnerId]/payslips/page.tsx` - 지급명세서
- ✅ `/partner/[partnerId]/sns-profile/page.tsx` - SNS 프로필
- ✅ `/partner/[partnerId]/contract/page.tsx` - 계약서
- ✅ `/partner/[partnerId]/statements/page.tsx` - 지급명세서
- ✅ `/partner/[partnerId]/customers/send-db/page.tsx` - DB 전송
- ✅ `/partner/[partnerId]/purchased-customers/page.tsx` - 구매고객
- ✅ `/partner/[partnerId]/payment/page.tsx` - 결제/정산
- ✅ `/partner/[partnerId]/adjustments/page.tsx` - 조정
- ✅ `/partner/[partnerId]/mall-edit/page.tsx` - 몰 편집

#### 3. 관리자 API 라우트 (3개)
- ✅ `/api/admin/affiliate/contracts/[contractId]/route.ts` - GET, DELETE
- ✅ `/api/admin/affiliate/leads/[leadId]/route.ts` - GET, PUT, DELETE
- ✅ `/api/admin/affiliate/profiles/[profileId]/route.ts` - GET, PUT, DELETE

#### 4. 파트너 API 라우트 (5개)
- ✅ `/api/partner/customers/[leadId]/route.ts`
- ✅ `/api/partner/contracts/[contractId]/route.ts`
- ✅ (기타 partner API 3개)

---

## ⏳ 남은 작업 (105개 API 라우트)

### 관리자 API 라우트 (105개)

#### 우선순위 높음 - 자주 사용됨 (약 30개)

**Affiliate 관련:**
- `/api/admin/affiliate/contracts/[contractId]/approve/route.ts` (454 lines)
- `/api/admin/affiliate/contracts/[contractId]/complete/route.ts` (234 lines)
- `/api/admin/affiliate/contracts/[contractId]/renewal/route.ts` (274 lines)
- `/api/admin/affiliate/contracts/[contractId]/terminate/route.ts` (196 lines)
- `/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts` (118 lines)
- `/api/admin/affiliate/contracts/[contractId]/reject/route.ts`
- `/api/admin/affiliate/contracts/[contractId]/retry-recovery/route.ts` (158 lines)
- `/api/admin/affiliate/leads/[leadId]/status/route.ts` (188 lines)
- `/api/admin/affiliate/leads/[leadId]/complete-passport/route.ts` (179 lines)
- `/api/admin/affiliate/leads/[leadId]/request-passport/route.ts` (86 lines)
- `/api/admin/affiliate/products/[productId]/route.ts` (260 lines)
- `/api/admin/affiliate/profiles/[profileId]/documents/route.ts` (234 lines)
- `/api/admin/affiliate/sales/[saleId]/approve/route.ts` (168 lines)
- `/api/admin/affiliate/sales/[saleId]/approve-commission/route.ts` (164 lines)
- `/api/admin/affiliate/sales/[saleId]/reject/route.ts` (136 lines)
- `/api/admin/affiliate/sales/[saleId]/refund/route.ts`
- `/api/admin/affiliate/sales/[saleId]/receipt/route.ts`
- `/api/admin/affiliate/sales/[saleId]/card-payment/route.ts` (83 lines)
- `/api/admin/affiliate/sales/[saleId]/confirm/route.ts`
- `/api/admin/affiliate/settlements/[settlementId]/export-excel/route.ts` (409 lines)
- `/api/admin/affiliate/settlements/[settlementId]/statement/route.ts`
- `/api/admin/affiliate/links/[linkId]/route.ts` (263 lines)
- `/api/admin/affiliate/links/[linkId]/reissue/route.ts`
- `/api/admin/affiliate/mall/[profileId]/route.ts`
- `/api/admin/affiliate/adjustments/[adjustmentId]/approve/route.ts`
- `/api/admin/affiliate/interactions/[interactionId]/upload/route.ts`

**Customer 관련:**
- `/api/admin/customers/[userId]/*` (관련 모든 라우트)
- `/api/admin/mall-customers/[userId]/page.tsx`
- `/api/admin/purchase-customers/[userId]/trip-info/route.ts`
- `/api/admin/customer-groups/[id]/*` (관련 모든 라우트)

**Product 관련:**
- `/api/admin/products/[productCode]/*` (관련 모든 라우트)

**기타 중요:**
- `/api/admin/chat-bot/flows/[id]/*` (관련 모든 라우트)
- `/api/admin/chat-bot/questions/[id]/route.ts`
- `/api/admin/chat-bot/templates/[id]/route.ts`
- `/api/admin/landing-pages/[id]/*` (관련 모든 라우트)
- `/api/admin/funnel/[type]/*` (관련 모든 라우트)
- `/api/admin/settings/**/[id]/route.ts` (여러 설정 API)
- `/api/admin/certificate-approvals/[id]/*`
- `/api/admin/rePurchase/[triggerId]/convert/route.ts`

#### 우선순위 중간 (약 40개)
- 기타 affiliate 관련 API
- 기타 customer 관련 API
- 기타 system 설정 API

#### 우선순위 낮음 (약 35개)
- 사용 빈도 낮은 관리 API
- 테스트/시뮬레이션 API

---

## 🔧 수정 패턴

### Before (에러 발생)
```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  // ...
}
```

### After (수정됨)
```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  // ...
}
```

### searchParams도 동일하게 처리
```typescript
// Before
searchParams?: { key?: string }

// After
searchParams?: Promise<{ key?: string }>
const resolvedSearchParams = await searchParams;
```

---

## 📝 작업 가이드

### 각 파일에서 수정해야 할 항목:

1. **함수 시그니처**
   - `{ params }` 타입을 `Promise<{ ... }>` 로 변경
   - `searchParams` 있으면 동일하게 변경

2. **params 사용 부분**
   - 함수 시작 부분에 `const { paramName } = await params;` 추가
   - 기존 `params.paramName` 사용 부분 모두 변경

3. **에러 핸들링**
   - catch 블록에서 `params.paramName` 사용하는 부분 수정
   - 미리 변수로 저장해두거나 다른 방식으로 처리

### 체크리스트:
- [ ] GET 함수 수정
- [ ] POST 함수 수정
- [ ] PUT 함수 수정
- [ ] PATCH 함수 수정
- [ ] DELETE 함수 수정
- [ ] 모든 `params.xxx` 참조 제거
- [ ] 빌드 테스트

---

## 🧪 테스트 방법

### 1. 빌드 테스트
```bash
npm run build
```

### 2. 타입 체크
```bash
npx tsc --noEmit
```

### 3. 주요 기능 테스트
- [ ] 고객 - 상품 구매 플로우
- [ ] 판매원 - 대시보드 접근
- [ ] 관리자 - 고객 관리
- [ ] 관리자 - 계약 관리
- [ ] 관리자 - 판매 승인

---

## 📈 진행률

```
전체: 136개 파일
완료: 31개 (23%)
남음: 105개 (77%)
```

### 카테고리별:
- ✅ 고객 페이지: 7/7 (100%)
- ✅ 판매원 페이지: 16/16 (100%)
- 🔄 Partner API: 5/10 (50%)
- 🔄 Admin API: 3/108 (3%)

---

## ⚠️ 주의사항

1. **에러 핸들링**: catch 블록에서 params 직접 참조 불가
2. **타입 안전성**: Promise unwrap 필수
3. **일관성**: 모든 동적 라우트에 동일한 패턴 적용
4. **테스트**: 수정 후 반드시 해당 기능 테스트

---

## 🔗 참고 자료

- Next.js 15 Migration Guide: https://nextjs.org/docs/app/building-your-application/upgrading/version-15
- Dynamic Routes: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes

---

## 📅 다음 작업 계획

### Phase 1: 핵심 기능 (우선순위)
1. 고객 관리 API (10개)
2. 계약 관리 API (8개)
3. 판매 관리 API (7개)
4. 상품 관리 API (3개)

### Phase 2: 중요 기능
1. 결제 관련 API
2. 챗봇 관련 API
3. 랜딩페이지 관련 API

### Phase 3: 기타 기능
1. 설정 관련 API
2. 통계/분석 API
3. 테스트 API

---

## ✅ 빌드 상태

**최종 빌드**: ✅ 성공
**날짜**: 2025-01-27
**에러**: 0개
**경고**: 일부 타입 추론 경고 (기능에 영향 없음)

