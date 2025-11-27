# 남은 API 라우트 수정 체크리스트

**총 105개 파일 남음**

---

## 🔥 우선순위 1 - 즉시 수정 필요 (30개)

### Affiliate Contracts (8개) ✅ 완료
- [x] `/api/admin/affiliate/contracts/[contractId]/approve/route.ts` ✅
- [x] `/api/admin/affiliate/contracts/[contractId]/complete/route.ts` ✅
- [x] `/api/admin/affiliate/contracts/[contractId]/renewal/route.ts` ✅
- [x] `/api/admin/affiliate/contracts/[contractId]/terminate/route.ts` ✅
- [x] `/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts` ✅
- [x] `/api/admin/affiliate/contracts/[contractId]/reject/route.ts` ✅
- [x] `/api/admin/affiliate/contracts/[contractId]/retry-recovery/route.ts` ✅
- [x] `/api/admin/affiliate/contracts/[contractId]/route.ts` ✅

### Affiliate Leads (4개) ✅ 완료
- [x] `/api/admin/affiliate/leads/[leadId]/status/route.ts` ✅
- [x] `/api/admin/affiliate/leads/[leadId]/complete-passport/route.ts` ✅
- [x] `/api/admin/affiliate/leads/[leadId]/request-passport/route.ts` ✅ (이미 수정됨)
- [x] `/api/admin/affiliate/leads/[leadId]/route.ts` ✅

### Affiliate Sales (7개) ✅ 완료
- [x] `/api/admin/affiliate/sales/[saleId]/approve/route.ts` ✅
- [x] `/api/admin/affiliate/sales/[saleId]/approve-commission/route.ts` ✅
- [x] `/api/admin/affiliate/sales/[saleId]/reject/route.ts` ✅
- [x] `/api/admin/affiliate/sales/[saleId]/refund/route.ts` ✅
- [x] `/api/admin/affiliate/sales/[saleId]/receipt/route.ts` ✅
- [x] `/api/admin/affiliate/sales/[saleId]/card-payment/route.ts` ✅
- [x] `/api/admin/affiliate/sales/[saleId]/confirm/route.ts` ✅ (빈 파일)

### Affiliate Profiles (2개) ✅ 완료
- [x] `/api/admin/affiliate/profiles/[profileId]/route.ts` ✅
- [x] `/api/admin/affiliate/profiles/[profileId]/documents/route.ts` ✅

### Affiliate Products (1개) ✅ 완료
- [x] `/api/admin/affiliate/products/[productId]/route.ts` ✅

### Affiliate Links (2개) ✅ 완료
- [x] `/api/admin/affiliate/links/[linkId]/route.ts` ✅ (이미 수정됨)
- [x] `/api/admin/affiliate/links/[linkId]/reissue/route.ts` ✅ (빈 파일)

### Affiliate Mall (1개) ✅ 완료
- [x] `/api/admin/affiliate/mall/[profileId]/route.ts` ✅ (빈 파일)

### Affiliate Settlements (2개) ✅ 완료
- [x] `/api/admin/affiliate/settlements/[settlementId]/export-excel/route.ts` ✅
- [x] `/api/admin/affiliate/settlements/[settlementId]/statement/route.ts` ✅ (빈 파일)

### Affiliate 기타 (2개) ✅ 완료
- [x] `/api/admin/affiliate/adjustments/[adjustmentId]/approve/route.ts` ✅ (빈 파일)
- [x] `/api/admin/affiliate/interactions/[interactionId]/upload/route.ts` ✅ (빈 파일)

---

## ⚡ 우선순위 2 - 중요 (25개)

### Customer Groups (5개)
- [ ] `/api/admin/customer-groups/[id]/route.ts`
- [ ] `/api/admin/customer-groups/[id]/customers/route.ts`
- [ ] `/api/admin/customer-groups/[id]/members/route.ts`
- [ ] `/api/admin/customer-groups/[id]/funnel-settings/route.ts`
- [ ] `/api/admin/customer-groups/[id]/message-logs/route.ts`

### Customers (3개)
- [ ] `/api/admin/customers/[userId]/*` (모든 customer API)
- [ ] `/api/admin/mall-customers/[userId]/*`
- [ ] `/api/admin/purchase-customers/[userId]/trip-info/route.ts`

### Chat Bot (7개)
- [ ] `/api/admin/chat-bot/flows/[id]/route.ts`
- [ ] `/api/admin/chat-bot/flows/[id]/copy/route.ts`
- [ ] `/api/admin/chat-bot/flows/[id]/nodes/route.ts`
- [ ] `/api/admin/chat-bot/questions/[id]/route.ts`
- [ ] `/api/admin/chat-bot/templates/[id]/route.ts`
- [ ] `/api/admin/chat-bot/conversations/[id]/route.ts`
- [ ] `/api/admin/chat-bot/responses/[id]/route.ts`

### Landing Pages (5개)
- [ ] `/api/admin/landing-pages/[id]/route.ts`
- [ ] `/api/admin/landing-pages/[id]/comments/route.ts`
- [ ] `/api/admin/landing-pages/[id]/comments/[commentId]/route.ts`
- [ ] `/api/admin/landing-pages/[id]/stats/route.ts`
- [ ] `/api/admin/landing-pages/[id]/registrations/route.ts`

### Funnel (3개)
- [ ] `/api/admin/funnel/[type]/messages/[messageId]/route.ts`
- [ ] `/api/admin/funnel/[type]/triggers/[triggerId]/route.ts`
- [ ] `/api/admin/funnel/[type]/route.ts`

### Certificate Approvals (2개)
- [ ] `/api/admin/certificate-approvals/[id]/approve/route.ts`
- [ ] `/api/admin/certificate-approvals/[id]/reject/route.ts`

---

## 📦 우선순위 3 - 일반 (30개)

### Products (3개)
- [ ] `/api/admin/products/[productCode]/route.ts`
- [ ] `/api/admin/products/[productCode]/reviews/route.ts`
- [ ] `/api/admin/products/[productCode]/images/route.ts`

### Scheduled Messages (2개)
- [ ] `/api/admin/scheduled-messages/[id]/route.ts`
- [ ] `/api/admin/scheduled-messages/[id]/logs/route.ts`

### Messages (3개)
- [ ] `/api/admin/messages/[messageId]/route.ts`
- [ ] `/api/admin/messages/[messageId]/reply/route.ts`
- [ ] `/api/admin/messages/[messageId]/status/route.ts`

### Users (2개)
- [ ] `/api/admin/users/[userId]/route.ts`
- [ ] `/api/admin/users/[userId]/trips/route.ts`

### Trips (3개)
- [ ] `/api/admin/trips/[tripId]/route.ts`
- [ ] `/api/admin/trips/[tripId]/documents/route.ts`
- [ ] `/api/admin/trips/[tripId]/passport/route.ts`

### Community (4개)
- [ ] `/api/admin/community/posts/[postId]/route.ts`
- [ ] `/api/admin/community/comments/[commentId]/route.ts`
- [ ] `/api/admin/community/categories/[categoryId]/route.ts`
- [ ] `/api/admin/community/reports/[reportId]/route.ts`

### News (2개)
- [ ] `/api/admin/cruisedot-news/[newsId]/route.ts`
- [ ] `/api/admin/cruisedot-news/[newsId]/publish/route.ts`

### 기타 (11개)
- [ ] `/api/admin/admin-panel-admins/[id]/route.ts`
- [ ] `/api/admin/mall-admins/[adminId]/route.ts`
- [ ] `/api/admin/rePurchase/[triggerId]/convert/route.ts`
- [ ] `/api/admin/feedback/[feedbackId]/route.ts`
- [ ] `/api/admin/inquiries/[inquiryId]/route.ts`
- [ ] `/api/admin/passport-submissions/[submissionId]/route.ts`
- [ ] `/api/admin/pages/[pageId]/route.ts`
- [ ] `/api/admin/seo/pages/[pageId]/route.ts`
- [ ] 기타 설정 관련 [id] 라우트들...

---

## 🔧 우선순위 4 - 낮음 (20개)

### Settings (10개)
- [ ] `/api/admin/settings/server-ips/[id]/route.ts`
- [ ] `/api/admin/settings/kakao-api-keys/[id]/route.ts`
- [ ] `/api/admin/settings/kakao-managers/[id]/route.ts`
- [ ] `/api/admin/settings/payment-gateways/[id]/route.ts`
- [ ] `/api/admin/settings/email-templates/[id]/route.ts`
- [ ] `/api/admin/settings/sms-templates/[id]/route.ts`
- [ ] 기타 settings...

### Analytics/Stats (5개)
- [ ] `/api/admin/analytics/reports/[reportId]/route.ts`
- [ ] `/api/admin/stats/campaigns/[campaignId]/route.ts`
- [ ] 기타 분석 관련...

### Test/Simulation (5개)
- [ ] `/api/admin/test/scenarios/[scenarioId]/route.ts`
- [ ] `/api/admin/simulation/[simId]/route.ts`
- [ ] 기타 테스트 관련...

---

## 📋 작업 진행 방법

### 1단계: 파일 열기
```bash
code app/api/admin/affiliate/contracts/[contractId]/approve/route.ts
```

### 2단계: 모든 export 함수 찾기
```bash
grep -n "export async function" route.ts
```

### 3단계: 각 함수별 수정
- [ ] 함수 시그니처 수정
- [ ] params await 추가
- [ ] 모든 params.xxx 참조 수정
- [ ] catch 블록 확인

### 4단계: 빌드 테스트
```bash
npm run build
```

---

## 🎯 권장 작업 순서

1. **Day 1**: 우선순위 1 - Affiliate Contracts & Leads (12개)
2. **Day 2**: 우선순위 1 - Affiliate Sales & Products (10개)
3. **Day 3**: 우선순위 1 - 나머지 + 우선순위 2 시작 (15개)
4. **Day 4**: 우선순위 2 완료 (25개)
5. **Day 5**: 우선순위 3 & 4 (50개)

**예상 총 소요 시간**: 5-7일 (하루 2-3시간 작업 기준)

---

## ✅ 완료 체크

작업 완료 시 아래 명령어로 진행 상황 확인:
```bash
grep -r "params: {" app/api/admin --include="*.ts" | grep -v "Promise" | wc -l
```

0이 나오면 모든 작업 완료!

