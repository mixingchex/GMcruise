# 어필리에이트 시스템 문제점 및 미구현 기능 분석

> 작성일: 2025-01-28  
> 목적: 대리점장/판매원 어필리에이트 시스템의 연동 문제 및 미구현 기능 파악

---

## 📊 요약

### 전체 상태
- **구현 완료**: 약 70%
- **부분 구현**: 약 20%
- **미구현**: 약 10%

### 주요 발견 사항

#### ✅ 잘 구현된 기능
1. **계약서 관리**: PDF 생성, 이메일 전송, 본사 전송 모두 구현됨
2. **고객 소유권 추적**: 관리자 고객 상세 페이지에 표시됨
3. **수당 계산 로직**: 완전히 구현됨
4. **관리자 계약서 조회**: 모든 계약서 조회 및 관리 가능

#### ⚠️ 부분 구현/문제점
1. **판매 확정 프로세스**: 🆕 새로운 프로세스 필요 (판매원/대리점장 요청 → 관리자 승인)
2. **수당 자동 계산**: 로직은 있으나 승인 시 자동 실행되도록 연결 필요
3. **관리자 대시보드**: 어필리에이트 통계가 통합되지 않음
4. **비밀번호 조회**: 보안상 마스킹되어 표시됨 (의도된 동작일 수 있음)

#### ❌ 확인 필요
1. **대리점장/판매원 수당 확인**: 대시보드에서 수당 확인 기능 확인 필요
2. **개인몰 구매 추적**: 어필리에이트 코드 추적이 모든 구매 경로에서 작동하는지 확인 필요

---

## 📋 요구사항 요약

### 구현되어야 할 기능들

1. **관리자 패널 연동**
   - 대리점장과 판매원의 모든 자료가 관리자 패널에 연동되어 표시
   - 모든 기록 표시 (판매원 소속, 고객 소속, 대리점장 이름, 판매원 이름)

2. **어필리에이트 수당 관리**
   - 수당 책정 (대리점장, 판매원)
   - 자동 오버라이딩 계산
   - 수당 확인 기능

3. **계약서 관리**
   - 계약 후 PDF로 이메일 전송 (대리점장/관리자 자동/수동)
   - 관리자: 모든 판매원 계약서 조회
   - 관리자: 판매원 아이디/비밀번호 수정 및 조회
   - 대리점장: 자신의 계약서 PDF 이메일 전송 (본사 주소로)
   - 대리점장: 소속 판매원 계약서 관리

4. **대리점장 대시보드**
   - 소속 판매원 관리
   - 실적 관리
   - 수당/오버라이딩 확인

5. **개인몰 및 결제 페이지**
   - 대리점장 개인몰
   - 판매원 개인몰
   - 개인 결제 구매페이지
   - 관리자가 누구의 고객이 구매했는지 확인 가능

---

## 🔍 현재 구현 상태 분석

### ✅ 구현된 기능

1. **데이터베이스 스키마**
   - `AffiliateProfile`: 대리점장/판매원 프로필
   - `AffiliateContract`: 계약서 정보
   - `AffiliateSale`: 판매 기록
   - `AffiliateLead`: 고객 리드
   - `AffiliateRelation`: 대리점장-판매원 관계
   - `CommissionLedger`: 수당 원장
   - `AffiliateCommissionTier`: 수당 티어

2. **대리점장/판매원 대시보드**
   - 파일: `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx`
   - 통계 조회 기능
   - 계약서 관리 기능 (대리점장만)
   - 판매원 초대 기능

3. **수당 계산 로직**
   - 파일: `lib/affiliate/commission.ts`
   - `calculateCommissionBreakdown()`: 수당 계산
   - `generateLedgerEntries()`: 원장 엔트리 생성

4. **고객 소유권 추적**
   - 파일: `lib/affiliate/customer-ownership.ts`
   - `getAffiliateOwnershipForUsers()`: 고객 소유권 조회

5. **관리자 비밀번호 관리**
   - 파일: `app/api/admin/users/[userId]/reset-password/route.ts`
   - 비밀번호 초기화 기능
   - 비밀번호 이력 조회 (`app/api/admin/password-events/route.ts`)

6. **결제 페이지 관리**
   - 파일: `app/admin/affiliate/payment-pages/page.tsx`
   - 계약서 타입별 결제 링크 관리

---

## ❌ 발견된 문제점 및 미구현 기능

### 1. 관리자 패널 - 전체 데이터 연동 미완성 ⚠️ 확인됨

**문제점:**
- 관리자 대시보드에 대리점장/판매원 데이터가 완전히 통합되지 않음
- `app/api/admin/dashboard/route.ts`에 어필리에이트 통계가 없음
- 고객 목록에서 대리점장/판매원 정보는 표시됨 (`app/admin/customers/[userId]/page.tsx`에 구현됨)

**확인된 사항:**
- ✅ 고객 상세 페이지에 소유권 정보 표시됨 (`renderAffiliateOwnershipSection`)
- ❌ 관리자 대시보드에 어필리에이트 통계 없음

**해결 방안:**
```typescript
// 관리자 대시보드 API에 어필리에이트 통계 추가 필요
// app/api/admin/dashboard/route.ts에 추가:
- 총 대리점장 수 (AffiliateProfile where type = 'BRANCH_MANAGER')
- 총 판매원 수 (AffiliateProfile where type = 'SALES_AGENT')
- 어필리에이트 판매 통계 (AffiliateSale 통계)
- 어필리에이트 리드 통계 (AffiliateLead 통계)
```

### 2. 관리자 - 판매원 계약서 전체 조회 기능 ✅ 구현됨

**확인된 사항:**
- ✅ 관리자 계약서 관리 페이지 구현됨 (`app/admin/affiliate/contracts/page.tsx`)
- ✅ 모든 계약서 목록 조회 가능
- ✅ 계약서 필터링 기능 (상태별, 검색)
- ✅ 계약서 상세 정보 표시
- ✅ 계약서 PDF 전송 기능
- ✅ 계약서 승인/거부 기능

**확인 필요:**
- [x] 관리자 패널에서 모든 판매원 계약서 목록 조회 가능한가? → **예**
- [x] 계약서 필터링 (대리점장별, 판매원별) 기능이 있는가? → **상태별 필터링 있음, 대리점장/판매원별 필터는 확인 필요**
- [x] 계약서 상태별 조회 기능이 있는가? → **예**

### 3. 관리자 - 판매원 비밀번호 조회 기능 ⚠️ 부분 구현

**확인된 사항:**
- ✅ 비밀번호 초기화 기능 구현됨 (`app/api/admin/users/[userId]/reset-password/route.ts`)
- ✅ 비밀번호 이력 조회 기능 구현됨 (`app/api/admin/password-events/route.ts`)
- ❌ 현재 비밀번호는 마스킹되어 표시됨 (보안상 이유)
- ✅ 사용자 상세 페이지에서 비밀번호 이력 확인 가능 (`app/admin/users/[userId]/page.tsx`)

**확인 필요:**
- [x] `app/admin/users/[userId]/page.tsx`에서 비밀번호 표시 기능이 있는가? → **이력만 표시, 현재 비밀번호는 마스킹**
- [x] 비밀번호 이력에서 실제 비밀번호를 볼 수 있는가? → **아니오, 마스킹됨**

**현재 상태:**
```typescript
// app/api/admin/password-events/route.ts:68
from: event.from ? '***' : null, // 보안을 위해 마스킹
to: event.to ? '***' : null,
```

**해결 방안:**
- 보안상 현재 비밀번호를 직접 조회하는 것은 권장되지 않음
- 비밀번호 초기화 기능으로 대체 가능
- 필요시 관리자 전용 비밀번호 조회 API 추가 가능 (보안 정책에 따라)

### 4. 대리점장 - 계약서 PDF 이메일 전송 기능 ✅ 구현됨

**확인된 사항:**
- ✅ 계약서 PDF 생성 기능 구현됨 (`lib/affiliate/contract-pdf.ts`)
- ✅ 이메일 전송 기능 구현됨 (`lib/affiliate/contract-email.ts`)
- ✅ 대리점장이 자신의 계약서 PDF 전송 가능 (`app/api/partner/contracts/[contractId]/send-pdf/route.ts`)
- ✅ 관리자가 계약서 PDF 전송 가능 (`app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts`)
- ✅ 본사로 전송 기능 구현됨 (`sendContractPDFToHeadOffice()`)
- ✅ 계약 완료 시 자동 이메일 전송 (`app/api/admin/affiliate/contracts/[contractId]/complete/route.ts`)

**확인 필요:**
- [x] 대리점장이 자신의 계약서 PDF를 생성할 수 있는가? → **예**
- [x] 이메일 전송 기능이 있는가? → **예**
- [x] 본사 주소로 자동 전송되는가? → **예, `sendContractPDFToHeadOffice()` 함수 있음**

### 5. 수당/오버라이딩 자동 계산 및 확인 기능 ⚠️ 부분 구현 → 🆕 **프로세스 변경**

**기존 문제점:**
- 판매 확정 시 자동 수당 계산이 되지 않음
- 수동으로 수당 승인해야 함

**새로운 요구사항:** ⭐
- 판매원/대리점장이 구매 체크 후 녹음 파일 첨부하여 판매 확정 요청
- 관리자가 녹음 파일 확인 후 승인
- 승인 시 자동 수당 계산 및 CommissionLedger 생성

**확인된 사항:**
- ✅ 수당 계산 로직 구현됨 (`lib/affiliate/commission.ts`)
- ✅ 수당 원장 생성 로직 구현됨 (`lib/affiliate/commission-ledger.ts`)
- ✅ `syncSaleCommissionLedgers()` 함수로 수당 동기화 가능
- ❌ 현재 판매 확정 프로세스가 요구사항과 다름
- 🆕 **새로운 프로세스 구현 필요** (상세 내용은 아래 "새로운 요구사항" 섹션 참조)

**구현 필요:**
- [ ] AffiliateSale 모델에 녹음 파일 필드 추가
- [ ] 판매원/대리점장용 판매 확정 요청 API
- [ ] 녹음 파일 업로드 기능
- [ ] 관리자 승인/거부 API
- [ ] 승인 시 자동 수당 계산 로직 연결
- [ ] UI 컴포넌트 (요청 제출, 승인 대기 목록)
- [ ] 대리점장이 자신의 수당을 확인할 수 있는가? → 확인 필요
- [ ] 판매원이 자신의 수당을 확인할 수 있는가? → 확인 필요

### 6. 개인몰 및 결제 페이지 - 고객 소유권 추적 미확인

**문제점:**
- 개인몰에서 구매한 고객이 누구의 고객인지 추적되는지 확인 필요
- 관리자가 구매 고객의 대리점장/판매원 정보를 확인할 수 있는지 확인 필요

**확인 필요 파일:**
- `app/api/public/inquiry/route.ts` (어필리에이트 추적은 있음)
- `app/api/affiliate/customers/register/route.ts`
- `lib/affiliate/customer-ownership.ts`
- 관리자 고객 상세 페이지에서 소유권 정보 표시

**확인 필요:**
- [ ] 개인몰 구매 시 어필리에이트 코드가 추적되는가?
- [ ] 결제 페이지에서 어필리에이트 코드가 추적되는가?
- [ ] 관리자가 고객 상세에서 대리점장/판매원 정보를 볼 수 있는가?

### 7. 대리점장 - 소속 판매원 관리 기능 미확인

**문제점:**
- 대리점장이 소속 판매원을 관리하는 기능이 완전한지 확인 필요
- 판매원 실적 조회 기능 확인 필요

**확인 필요 파일:**
- `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx`
- `app/api/admin/affiliate/teams/metrics/route.ts`
- `app/api/admin/affiliate/agents/metrics/route.ts`

**확인 필요:**
- [ ] 대리점장이 소속 판매원 목록을 볼 수 있는가?
- [ ] 판매원별 실적을 볼 수 있는가?
- [ ] 판매원별 수당/오버라이딩을 볼 수 있는가?

### 8. 데이터 연동 오류 가능성

**문제점:**
- 여러 시스템 간 데이터 연동이 제대로 되지 않을 수 있음
- API 엔드포인트 간 데이터 형식 불일치 가능성

**확인 필요:**
- [ ] AffiliateProfile과 User 간 관계가 올바르게 설정되어 있는가?
- [ ] AffiliateSale과 CommissionLedger 간 연동이 올바른가?
- [ ] AffiliateLead와 고객(User) 간 연결이 올바른가?

---

## 🔧 수정/개선이 필요한 항목

### 우선순위 1: 핵심 기능 확인 및 수정

1. **관리자 패널 - 어필리에이트 데이터 통합**
   - 관리자 대시보드에 대리점장/판매원 통계 추가
   - 고객 목록에 소유권 정보 표시
   - 판매 기록에 대리점장/판매원 정보 표시

2. **판매 확정 프로세스 개선** ⭐ **새로운 요구사항**
   - 판매원/대리점장이 구매 체크 후 녹음 파일 첨부하여 판매 확정 요청
   - 관리자가 녹음 파일 확인 후 승인/거부
   - 승인 시 자동 수당 계산 및 CommissionLedger 생성
   - 오버라이딩 자동 계산 확인

3. **고객 소유권 추적 확인**
   - 개인몰 구매 시 소유권 추적 확인
   - 결제 페이지 구매 시 소유권 추적 확인
   - 관리자 패널에서 소유권 정보 표시

### 우선순위 2: 기능 보완

4. **계약서 PDF 이메일 전송**
   - 대리점장 계약서 PDF 이메일 전송 기능 확인/구현
   - 본사 주소 자동 입력 확인
   - 이메일 템플릿 확인

5. **대리점장 대시보드 보완**
   - 소속 판매원 관리 기능 확인
   - 실적 조회 기능 확인
   - 수당/오버라이딩 확인 기능 확인

6. **관리자 기능 보완**
   - 모든 판매원 계약서 조회 기능 확인
   - 판매원 비밀번호 조회 기능 확인 (보안 고려)

### 우선순위 3: 데이터 정합성 확인

7. **데이터 연동 검증**
   - AffiliateProfile ↔ User 관계 확인
   - AffiliateSale ↔ CommissionLedger 연동 확인
   - AffiliateLead ↔ User 연결 확인
   - 데이터 불일치 수정

---

## 🆕 새로운 요구사항: 판매 확정 프로세스

### 프로세스 흐름

```
1. 판매원/대리점장
   ↓
   구매 체크 완료
   ↓
   녹음 파일 첨부
   ↓
   판매 확정 요청 제출
   ↓
2. 관리자
   ↓
   녹음 파일 확인
   ↓
   승인 또는 거부
   ↓
3. 승인 시
   ↓
   자동 수당 계산
   ↓
   CommissionLedger 생성
   ↓
   구매 인정 완료
```

### 구현 필요 사항

#### 1. 데이터베이스 스키마 수정

**AffiliateSale 모델에 필드 추가:**
```prisma
model AffiliateSale {
  // ... 기존 필드들 ...
  status String @default("PENDING") // PENDING → PENDING_APPROVAL → APPROVED/REJECTED
  audioFilePath String? // 녹음 파일 경로
  audioFileName String? // 녹음 파일 원본 이름
  submittedById Int? // 판매 확정 요청 제출자 (판매원/대리점장)
  submittedAt DateTime? // 판매 확정 요청 제출 시간
  approvedById Int? // 승인한 관리자 ID
  approvedAt DateTime? // 승인 시간
  rejectionReason String? // 거부 사유
  // ... 기존 필드들 ...
}
```

**상태 값:**
- `PENDING`: 초기 상태 (판매 기록만 생성)
- `PENDING_APPROVAL`: 판매원/대리점장이 판매 확정 요청 제출 (녹음 파일 첨부)
- `APPROVED`: 관리자가 승인 (수당 계산 완료)
- `REJECTED`: 관리자가 거부
- `CONFIRMED`: 기존 상태 (하위 호환성 유지)

#### 2. API 엔드포인트

**판매원/대리점장용:**
- `POST /api/affiliate/sales/[saleId]/submit-confirmation`
  - 판매 확정 요청 제출 (녹음 파일 업로드 포함)
  - 요청자: 판매원 또는 대리점장 (본인 판매만)
  - 상태 변경: PENDING → PENDING_APPROVAL

**관리자용:**
- `POST /api/admin/affiliate/sales/[saleId]/approve`
  - 판매 확정 승인
  - 녹음 파일 확인 후 승인
  - 상태 변경: PENDING_APPROVAL → APPROVED
  - 자동 수당 계산 및 CommissionLedger 생성

- `POST /api/admin/affiliate/sales/[saleId]/reject`
  - 판매 확정 거부
  - 거부 사유 입력
  - 상태 변경: PENDING_APPROVAL → REJECTED

- `GET /api/admin/affiliate/sales/pending-approval`
  - 승인 대기 중인 판매 목록 조회
  - 녹음 파일 다운로드 링크 포함

#### 3. 파일 업로드 처리

**녹음 파일 저장:**
- 저장 위치: `/uploads/affiliate-sales/[saleId]/audio/`
- 파일 형식: MP3, WAV, M4A 등
- 파일 크기 제한: 50MB
- 파일명: `[timestamp]_[originalName]`

**API:**
- `POST /api/affiliate/sales/[saleId]/upload-audio`
  - 녹음 파일 업로드
  - 파일 경로를 AffiliateSale에 저장

#### 4. UI 컴포넌트

**판매원/대리점장 대시보드:**
- 판매 목록에 "판매 확정 요청" 버튼
- 녹음 파일 업로드 UI
- 요청 상태 표시 (대기 중, 승인됨, 거부됨)

**관리자 패널:**
- 승인 대기 판매 목록 페이지
- 녹음 파일 재생 플레이어
- 승인/거부 버튼
- 거부 사유 입력 모달

#### 5. 수당 자동 계산 로직

**승인 시 자동 실행:**
```typescript
// app/api/admin/affiliate/sales/[saleId]/approve/route.ts
import { syncSaleCommissionLedgers } from '@/lib/affiliate/commission-ledger';

// 승인 처리 후:
await syncSaleCommissionLedgers(saleId, { 
  includeHq: true,
  regenerate: false 
});
```

### 구현 우선순위

1. **1단계: 데이터베이스 스키마 수정**
   - AffiliateSale 모델에 필드 추가
   - 마이그레이션 실행

2. **2단계: 파일 업로드 API**
   - 녹음 파일 업로드 엔드포인트
   - 파일 저장 로직

3. **3단계: 판매 확정 요청 API**
   - 판매원/대리점장용 요청 제출 API
   - 권한 확인 (본인 판매만)

4. **4단계: 관리자 승인/거부 API**
   - 승인 API (수당 자동 계산 포함)
   - 거부 API

5. **5단계: UI 구현**
   - 판매원/대리점장 대시보드 UI
   - 관리자 승인 대기 목록 페이지

6. **6단계: 테스트**
   - 전체 프로세스 테스트
   - 파일 업로드/다운로드 테스트
   - 수당 계산 검증

---

## 📝 체크리스트

### 관리자 패널
- [ ] 대리점장/판매원 통계 표시
- [ ] 고객 목록에 소유권 정보 표시
- [ ] 판매 기록에 대리점장/판매원 정보 표시
- [ ] 모든 판매원 계약서 조회
- [ ] 판매원 비밀번호 수정/조회
- [ ] 구매 고객의 대리점장/판매원 정보 확인

### 대리점장 대시보드
- [ ] 소속 판매원 목록 조회
- [ ] 판매원 실적 조회
- [ ] 수당/오버라이딩 확인
- [ ] 자신의 계약서 PDF 이메일 전송
- [ ] 소속 판매원 계약서 관리

### 판매원 대시보드
- [ ] 자신의 실적 조회
- [ ] 수당 확인
- [ ] 고객 목록 조회

### 수당 시스템
- [ ] 판매 확정 시 자동 수당 계산
- [ ] 오버라이딩 자동 계산
- [ ] CommissionLedger 자동 생성
- [ ] 수당 확인 기능

### 개인몰/결제 페이지
- [ ] 어필리에이트 코드 추적
- [ ] 고객 소유권 자동 할당
- [ ] 구매 기록에 대리점장/판매원 정보 저장

### 계약서 관리
- [ ] 계약서 PDF 생성
- [ ] 이메일 전송 기능
- [ ] 본사 주소 자동 입력
- [ ] 계약서 상태 관리

---

## 🚀 다음 단계

1. **즉시 확인 필요**
   - 각 기능이 실제로 작동하는지 테스트
   - API 엔드포인트 응답 확인
   - 데이터베이스 쿼리 결과 확인

2. **수정 작업**
   - 미구현 기능 구현
   - 버그 수정
   - 데이터 연동 오류 수정

3. **테스트**
   - 전체 플로우 테스트
   - 데이터 정합성 검증
   - 사용자 시나리오 테스트

---

## 📌 참고 파일 목록

### 핵심 파일
- `prisma/schema.prisma` - 데이터베이스 스키마
- `lib/affiliate/commission.ts` - 수당 계산
- `lib/affiliate/customer-ownership.ts` - 고객 소유권
- `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx` - 대리점장/판매원 대시보드
- `app/admin/affiliate/contracts/page.tsx` - 관리자 계약서 관리
- `app/admin/affiliate/profiles/page.tsx` - 관리자 프로필 관리

### API 엔드포인트
- `/api/admin/affiliate/*` - 관리자 어필리에이트 API
- `/api/affiliate/*` - 어필리에이트 API
- `/api/admin/users/[userId]/*` - 관리자 사용자 관리 API

---

## 💡 권장 사항

1. **로깅 강화**
   - 모든 어필리에이트 관련 작업에 로깅 추가
   - 에러 발생 시 상세 로그 기록

2. **에러 처리 개선**
   - API 응답에 명확한 에러 메시지
   - 사용자 친화적인 에러 표시

3. **데이터 검증**
   - 입력 데이터 검증 강화
   - 데이터 정합성 체크

4. **문서화**
   - API 문서화
   - 사용자 가이드 작성


> 작성일: 2025-01-28  
> 목적: 대리점장/판매원 어필리에이트 시스템의 연동 문제 및 미구현 기능 파악

---

## 📊 요약

### 전체 상태
- **구현 완료**: 약 70%
- **부분 구현**: 약 20%
- **미구현**: 약 10%

### 주요 발견 사항

#### ✅ 잘 구현된 기능
1. **계약서 관리**: PDF 생성, 이메일 전송, 본사 전송 모두 구현됨
2. **고객 소유권 추적**: 관리자 고객 상세 페이지에 표시됨
3. **수당 계산 로직**: 완전히 구현됨
4. **관리자 계약서 조회**: 모든 계약서 조회 및 관리 가능

#### ⚠️ 부분 구현/문제점
1. **판매 확정 프로세스**: 🆕 새로운 프로세스 필요 (판매원/대리점장 요청 → 관리자 승인)
2. **수당 자동 계산**: 로직은 있으나 승인 시 자동 실행되도록 연결 필요
3. **관리자 대시보드**: 어필리에이트 통계가 통합되지 않음
4. **비밀번호 조회**: 보안상 마스킹되어 표시됨 (의도된 동작일 수 있음)

#### ❌ 확인 필요
1. **대리점장/판매원 수당 확인**: 대시보드에서 수당 확인 기능 확인 필요
2. **개인몰 구매 추적**: 어필리에이트 코드 추적이 모든 구매 경로에서 작동하는지 확인 필요

---

## 📋 요구사항 요약

### 구현되어야 할 기능들

1. **관리자 패널 연동**
   - 대리점장과 판매원의 모든 자료가 관리자 패널에 연동되어 표시
   - 모든 기록 표시 (판매원 소속, 고객 소속, 대리점장 이름, 판매원 이름)

2. **어필리에이트 수당 관리**
   - 수당 책정 (대리점장, 판매원)
   - 자동 오버라이딩 계산
   - 수당 확인 기능

3. **계약서 관리**
   - 계약 후 PDF로 이메일 전송 (대리점장/관리자 자동/수동)
   - 관리자: 모든 판매원 계약서 조회
   - 관리자: 판매원 아이디/비밀번호 수정 및 조회
   - 대리점장: 자신의 계약서 PDF 이메일 전송 (본사 주소로)
   - 대리점장: 소속 판매원 계약서 관리

4. **대리점장 대시보드**
   - 소속 판매원 관리
   - 실적 관리
   - 수당/오버라이딩 확인

5. **개인몰 및 결제 페이지**
   - 대리점장 개인몰
   - 판매원 개인몰
   - 개인 결제 구매페이지
   - 관리자가 누구의 고객이 구매했는지 확인 가능

---

## 🔍 현재 구현 상태 분석

### ✅ 구현된 기능

1. **데이터베이스 스키마**
   - `AffiliateProfile`: 대리점장/판매원 프로필
   - `AffiliateContract`: 계약서 정보
   - `AffiliateSale`: 판매 기록
   - `AffiliateLead`: 고객 리드
   - `AffiliateRelation`: 대리점장-판매원 관계
   - `CommissionLedger`: 수당 원장
   - `AffiliateCommissionTier`: 수당 티어

2. **대리점장/판매원 대시보드**
   - 파일: `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx`
   - 통계 조회 기능
   - 계약서 관리 기능 (대리점장만)
   - 판매원 초대 기능

3. **수당 계산 로직**
   - 파일: `lib/affiliate/commission.ts`
   - `calculateCommissionBreakdown()`: 수당 계산
   - `generateLedgerEntries()`: 원장 엔트리 생성

4. **고객 소유권 추적**
   - 파일: `lib/affiliate/customer-ownership.ts`
   - `getAffiliateOwnershipForUsers()`: 고객 소유권 조회

5. **관리자 비밀번호 관리**
   - 파일: `app/api/admin/users/[userId]/reset-password/route.ts`
   - 비밀번호 초기화 기능
   - 비밀번호 이력 조회 (`app/api/admin/password-events/route.ts`)

6. **결제 페이지 관리**
   - 파일: `app/admin/affiliate/payment-pages/page.tsx`
   - 계약서 타입별 결제 링크 관리

---

## ❌ 발견된 문제점 및 미구현 기능

### 1. 관리자 패널 - 전체 데이터 연동 미완성 ⚠️ 확인됨

**문제점:**
- 관리자 대시보드에 대리점장/판매원 데이터가 완전히 통합되지 않음
- `app/api/admin/dashboard/route.ts`에 어필리에이트 통계가 없음
- 고객 목록에서 대리점장/판매원 정보는 표시됨 (`app/admin/customers/[userId]/page.tsx`에 구현됨)

**확인된 사항:**
- ✅ 고객 상세 페이지에 소유권 정보 표시됨 (`renderAffiliateOwnershipSection`)
- ❌ 관리자 대시보드에 어필리에이트 통계 없음

**해결 방안:**
```typescript
// 관리자 대시보드 API에 어필리에이트 통계 추가 필요
// app/api/admin/dashboard/route.ts에 추가:
- 총 대리점장 수 (AffiliateProfile where type = 'BRANCH_MANAGER')
- 총 판매원 수 (AffiliateProfile where type = 'SALES_AGENT')
- 어필리에이트 판매 통계 (AffiliateSale 통계)
- 어필리에이트 리드 통계 (AffiliateLead 통계)
```

### 2. 관리자 - 판매원 계약서 전체 조회 기능 ✅ 구현됨

**확인된 사항:**
- ✅ 관리자 계약서 관리 페이지 구현됨 (`app/admin/affiliate/contracts/page.tsx`)
- ✅ 모든 계약서 목록 조회 가능
- ✅ 계약서 필터링 기능 (상태별, 검색)
- ✅ 계약서 상세 정보 표시
- ✅ 계약서 PDF 전송 기능
- ✅ 계약서 승인/거부 기능

**확인 필요:**
- [x] 관리자 패널에서 모든 판매원 계약서 목록 조회 가능한가? → **예**
- [x] 계약서 필터링 (대리점장별, 판매원별) 기능이 있는가? → **상태별 필터링 있음, 대리점장/판매원별 필터는 확인 필요**
- [x] 계약서 상태별 조회 기능이 있는가? → **예**

### 3. 관리자 - 판매원 비밀번호 조회 기능 ⚠️ 부분 구현

**확인된 사항:**
- ✅ 비밀번호 초기화 기능 구현됨 (`app/api/admin/users/[userId]/reset-password/route.ts`)
- ✅ 비밀번호 이력 조회 기능 구현됨 (`app/api/admin/password-events/route.ts`)
- ❌ 현재 비밀번호는 마스킹되어 표시됨 (보안상 이유)
- ✅ 사용자 상세 페이지에서 비밀번호 이력 확인 가능 (`app/admin/users/[userId]/page.tsx`)

**확인 필요:**
- [x] `app/admin/users/[userId]/page.tsx`에서 비밀번호 표시 기능이 있는가? → **이력만 표시, 현재 비밀번호는 마스킹**
- [x] 비밀번호 이력에서 실제 비밀번호를 볼 수 있는가? → **아니오, 마스킹됨**

**현재 상태:**
```typescript
// app/api/admin/password-events/route.ts:68
from: event.from ? '***' : null, // 보안을 위해 마스킹
to: event.to ? '***' : null,
```

**해결 방안:**
- 보안상 현재 비밀번호를 직접 조회하는 것은 권장되지 않음
- 비밀번호 초기화 기능으로 대체 가능
- 필요시 관리자 전용 비밀번호 조회 API 추가 가능 (보안 정책에 따라)

### 4. 대리점장 - 계약서 PDF 이메일 전송 기능 ✅ 구현됨

**확인된 사항:**
- ✅ 계약서 PDF 생성 기능 구현됨 (`lib/affiliate/contract-pdf.ts`)
- ✅ 이메일 전송 기능 구현됨 (`lib/affiliate/contract-email.ts`)
- ✅ 대리점장이 자신의 계약서 PDF 전송 가능 (`app/api/partner/contracts/[contractId]/send-pdf/route.ts`)
- ✅ 관리자가 계약서 PDF 전송 가능 (`app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts`)
- ✅ 본사로 전송 기능 구현됨 (`sendContractPDFToHeadOffice()`)
- ✅ 계약 완료 시 자동 이메일 전송 (`app/api/admin/affiliate/contracts/[contractId]/complete/route.ts`)

**확인 필요:**
- [x] 대리점장이 자신의 계약서 PDF를 생성할 수 있는가? → **예**
- [x] 이메일 전송 기능이 있는가? → **예**
- [x] 본사 주소로 자동 전송되는가? → **예, `sendContractPDFToHeadOffice()` 함수 있음**

### 5. 수당/오버라이딩 자동 계산 및 확인 기능 ⚠️ 부분 구현 → 🆕 **프로세스 변경**

**기존 문제점:**
- 판매 확정 시 자동 수당 계산이 되지 않음
- 수동으로 수당 승인해야 함

**새로운 요구사항:** ⭐
- 판매원/대리점장이 구매 체크 후 녹음 파일 첨부하여 판매 확정 요청
- 관리자가 녹음 파일 확인 후 승인
- 승인 시 자동 수당 계산 및 CommissionLedger 생성

**확인된 사항:**
- ✅ 수당 계산 로직 구현됨 (`lib/affiliate/commission.ts`)
- ✅ 수당 원장 생성 로직 구현됨 (`lib/affiliate/commission-ledger.ts`)
- ✅ `syncSaleCommissionLedgers()` 함수로 수당 동기화 가능
- ❌ 현재 판매 확정 프로세스가 요구사항과 다름
- 🆕 **새로운 프로세스 구현 필요** (상세 내용은 아래 "새로운 요구사항" 섹션 참조)

**구현 필요:**
- [ ] AffiliateSale 모델에 녹음 파일 필드 추가
- [ ] 판매원/대리점장용 판매 확정 요청 API
- [ ] 녹음 파일 업로드 기능
- [ ] 관리자 승인/거부 API
- [ ] 승인 시 자동 수당 계산 로직 연결
- [ ] UI 컴포넌트 (요청 제출, 승인 대기 목록)
- [ ] 대리점장이 자신의 수당을 확인할 수 있는가? → 확인 필요
- [ ] 판매원이 자신의 수당을 확인할 수 있는가? → 확인 필요

### 6. 개인몰 및 결제 페이지 - 고객 소유권 추적 미확인

**문제점:**
- 개인몰에서 구매한 고객이 누구의 고객인지 추적되는지 확인 필요
- 관리자가 구매 고객의 대리점장/판매원 정보를 확인할 수 있는지 확인 필요

**확인 필요 파일:**
- `app/api/public/inquiry/route.ts` (어필리에이트 추적은 있음)
- `app/api/affiliate/customers/register/route.ts`
- `lib/affiliate/customer-ownership.ts`
- 관리자 고객 상세 페이지에서 소유권 정보 표시

**확인 필요:**
- [ ] 개인몰 구매 시 어필리에이트 코드가 추적되는가?
- [ ] 결제 페이지에서 어필리에이트 코드가 추적되는가?
- [ ] 관리자가 고객 상세에서 대리점장/판매원 정보를 볼 수 있는가?

### 7. 대리점장 - 소속 판매원 관리 기능 미확인

**문제점:**
- 대리점장이 소속 판매원을 관리하는 기능이 완전한지 확인 필요
- 판매원 실적 조회 기능 확인 필요

**확인 필요 파일:**
- `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx`
- `app/api/admin/affiliate/teams/metrics/route.ts`
- `app/api/admin/affiliate/agents/metrics/route.ts`

**확인 필요:**
- [ ] 대리점장이 소속 판매원 목록을 볼 수 있는가?
- [ ] 판매원별 실적을 볼 수 있는가?
- [ ] 판매원별 수당/오버라이딩을 볼 수 있는가?

### 8. 데이터 연동 오류 가능성

**문제점:**
- 여러 시스템 간 데이터 연동이 제대로 되지 않을 수 있음
- API 엔드포인트 간 데이터 형식 불일치 가능성

**확인 필요:**
- [ ] AffiliateProfile과 User 간 관계가 올바르게 설정되어 있는가?
- [ ] AffiliateSale과 CommissionLedger 간 연동이 올바른가?
- [ ] AffiliateLead와 고객(User) 간 연결이 올바른가?

---

## 🔧 수정/개선이 필요한 항목

### 우선순위 1: 핵심 기능 확인 및 수정

1. **관리자 패널 - 어필리에이트 데이터 통합**
   - 관리자 대시보드에 대리점장/판매원 통계 추가
   - 고객 목록에 소유권 정보 표시
   - 판매 기록에 대리점장/판매원 정보 표시

2. **판매 확정 프로세스 개선** ⭐ **새로운 요구사항**
   - 판매원/대리점장이 구매 체크 후 녹음 파일 첨부하여 판매 확정 요청
   - 관리자가 녹음 파일 확인 후 승인/거부
   - 승인 시 자동 수당 계산 및 CommissionLedger 생성
   - 오버라이딩 자동 계산 확인

3. **고객 소유권 추적 확인**
   - 개인몰 구매 시 소유권 추적 확인
   - 결제 페이지 구매 시 소유권 추적 확인
   - 관리자 패널에서 소유권 정보 표시

### 우선순위 2: 기능 보완

4. **계약서 PDF 이메일 전송**
   - 대리점장 계약서 PDF 이메일 전송 기능 확인/구현
   - 본사 주소 자동 입력 확인
   - 이메일 템플릿 확인

5. **대리점장 대시보드 보완**
   - 소속 판매원 관리 기능 확인
   - 실적 조회 기능 확인
   - 수당/오버라이딩 확인 기능 확인

6. **관리자 기능 보완**
   - 모든 판매원 계약서 조회 기능 확인
   - 판매원 비밀번호 조회 기능 확인 (보안 고려)

### 우선순위 3: 데이터 정합성 확인

7. **데이터 연동 검증**
   - AffiliateProfile ↔ User 관계 확인
   - AffiliateSale ↔ CommissionLedger 연동 확인
   - AffiliateLead ↔ User 연결 확인
   - 데이터 불일치 수정

---

## 🆕 새로운 요구사항: 판매 확정 프로세스

### 프로세스 흐름

```
1. 판매원/대리점장
   ↓
   구매 체크 완료
   ↓
   녹음 파일 첨부
   ↓
   판매 확정 요청 제출
   ↓
2. 관리자
   ↓
   녹음 파일 확인
   ↓
   승인 또는 거부
   ↓
3. 승인 시
   ↓
   자동 수당 계산
   ↓
   CommissionLedger 생성
   ↓
   구매 인정 완료
```

### 구현 필요 사항

#### 1. 데이터베이스 스키마 수정

**AffiliateSale 모델에 필드 추가:**
```prisma
model AffiliateSale {
  // ... 기존 필드들 ...
  status String @default("PENDING") // PENDING → PENDING_APPROVAL → APPROVED/REJECTED
  audioFilePath String? // 녹음 파일 경로
  audioFileName String? // 녹음 파일 원본 이름
  submittedById Int? // 판매 확정 요청 제출자 (판매원/대리점장)
  submittedAt DateTime? // 판매 확정 요청 제출 시간
  approvedById Int? // 승인한 관리자 ID
  approvedAt DateTime? // 승인 시간
  rejectionReason String? // 거부 사유
  // ... 기존 필드들 ...
}
```

**상태 값:**
- `PENDING`: 초기 상태 (판매 기록만 생성)
- `PENDING_APPROVAL`: 판매원/대리점장이 판매 확정 요청 제출 (녹음 파일 첨부)
- `APPROVED`: 관리자가 승인 (수당 계산 완료)
- `REJECTED`: 관리자가 거부
- `CONFIRMED`: 기존 상태 (하위 호환성 유지)

#### 2. API 엔드포인트

**판매원/대리점장용:**
- `POST /api/affiliate/sales/[saleId]/submit-confirmation`
  - 판매 확정 요청 제출 (녹음 파일 업로드 포함)
  - 요청자: 판매원 또는 대리점장 (본인 판매만)
  - 상태 변경: PENDING → PENDING_APPROVAL

**관리자용:**
- `POST /api/admin/affiliate/sales/[saleId]/approve`
  - 판매 확정 승인
  - 녹음 파일 확인 후 승인
  - 상태 변경: PENDING_APPROVAL → APPROVED
  - 자동 수당 계산 및 CommissionLedger 생성

- `POST /api/admin/affiliate/sales/[saleId]/reject`
  - 판매 확정 거부
  - 거부 사유 입력
  - 상태 변경: PENDING_APPROVAL → REJECTED

- `GET /api/admin/affiliate/sales/pending-approval`
  - 승인 대기 중인 판매 목록 조회
  - 녹음 파일 다운로드 링크 포함

#### 3. 파일 업로드 처리

**녹음 파일 저장:**
- 저장 위치: `/uploads/affiliate-sales/[saleId]/audio/`
- 파일 형식: MP3, WAV, M4A 등
- 파일 크기 제한: 50MB
- 파일명: `[timestamp]_[originalName]`

**API:**
- `POST /api/affiliate/sales/[saleId]/upload-audio`
  - 녹음 파일 업로드
  - 파일 경로를 AffiliateSale에 저장

#### 4. UI 컴포넌트

**판매원/대리점장 대시보드:**
- 판매 목록에 "판매 확정 요청" 버튼
- 녹음 파일 업로드 UI
- 요청 상태 표시 (대기 중, 승인됨, 거부됨)

**관리자 패널:**
- 승인 대기 판매 목록 페이지
- 녹음 파일 재생 플레이어
- 승인/거부 버튼
- 거부 사유 입력 모달

#### 5. 수당 자동 계산 로직

**승인 시 자동 실행:**
```typescript
// app/api/admin/affiliate/sales/[saleId]/approve/route.ts
import { syncSaleCommissionLedgers } from '@/lib/affiliate/commission-ledger';

// 승인 처리 후:
await syncSaleCommissionLedgers(saleId, { 
  includeHq: true,
  regenerate: false 
});
```

### 구현 우선순위

1. **1단계: 데이터베이스 스키마 수정**
   - AffiliateSale 모델에 필드 추가
   - 마이그레이션 실행

2. **2단계: 파일 업로드 API**
   - 녹음 파일 업로드 엔드포인트
   - 파일 저장 로직

3. **3단계: 판매 확정 요청 API**
   - 판매원/대리점장용 요청 제출 API
   - 권한 확인 (본인 판매만)

4. **4단계: 관리자 승인/거부 API**
   - 승인 API (수당 자동 계산 포함)
   - 거부 API

5. **5단계: UI 구현**
   - 판매원/대리점장 대시보드 UI
   - 관리자 승인 대기 목록 페이지

6. **6단계: 테스트**
   - 전체 프로세스 테스트
   - 파일 업로드/다운로드 테스트
   - 수당 계산 검증

---

## 📝 체크리스트

### 관리자 패널
- [ ] 대리점장/판매원 통계 표시
- [ ] 고객 목록에 소유권 정보 표시
- [ ] 판매 기록에 대리점장/판매원 정보 표시
- [ ] 모든 판매원 계약서 조회
- [ ] 판매원 비밀번호 수정/조회
- [ ] 구매 고객의 대리점장/판매원 정보 확인

### 대리점장 대시보드
- [ ] 소속 판매원 목록 조회
- [ ] 판매원 실적 조회
- [ ] 수당/오버라이딩 확인
- [ ] 자신의 계약서 PDF 이메일 전송
- [ ] 소속 판매원 계약서 관리

### 판매원 대시보드
- [ ] 자신의 실적 조회
- [ ] 수당 확인
- [ ] 고객 목록 조회

### 수당 시스템
- [ ] 판매 확정 시 자동 수당 계산
- [ ] 오버라이딩 자동 계산
- [ ] CommissionLedger 자동 생성
- [ ] 수당 확인 기능

### 개인몰/결제 페이지
- [ ] 어필리에이트 코드 추적
- [ ] 고객 소유권 자동 할당
- [ ] 구매 기록에 대리점장/판매원 정보 저장

### 계약서 관리
- [ ] 계약서 PDF 생성
- [ ] 이메일 전송 기능
- [ ] 본사 주소 자동 입력
- [ ] 계약서 상태 관리

---

## 🚀 다음 단계

1. **즉시 확인 필요**
   - 각 기능이 실제로 작동하는지 테스트
   - API 엔드포인트 응답 확인
   - 데이터베이스 쿼리 결과 확인

2. **수정 작업**
   - 미구현 기능 구현
   - 버그 수정
   - 데이터 연동 오류 수정

3. **테스트**
   - 전체 플로우 테스트
   - 데이터 정합성 검증
   - 사용자 시나리오 테스트

---

## 📌 참고 파일 목록

### 핵심 파일
- `prisma/schema.prisma` - 데이터베이스 스키마
- `lib/affiliate/commission.ts` - 수당 계산
- `lib/affiliate/customer-ownership.ts` - 고객 소유권
- `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx` - 대리점장/판매원 대시보드
- `app/admin/affiliate/contracts/page.tsx` - 관리자 계약서 관리
- `app/admin/affiliate/profiles/page.tsx` - 관리자 프로필 관리

### API 엔드포인트
- `/api/admin/affiliate/*` - 관리자 어필리에이트 API
- `/api/affiliate/*` - 어필리에이트 API
- `/api/admin/users/[userId]/*` - 관리자 사용자 관리 API

---

## 💡 권장 사항

1. **로깅 강화**
   - 모든 어필리에이트 관련 작업에 로깅 추가
   - 에러 발생 시 상세 로그 기록

2. **에러 처리 개선**
   - API 응답에 명확한 에러 메시지
   - 사용자 친화적인 에러 표시

3. **데이터 검증**
   - 입력 데이터 검증 강화
   - 데이터 정합성 체크

4. **문서화**
   - API 문서화
   - 사용자 가이드 작성


> 작성일: 2025-01-28  
> 목적: 대리점장/판매원 어필리에이트 시스템의 연동 문제 및 미구현 기능 파악

---

## 📊 요약

### 전체 상태
- **구현 완료**: 약 70%
- **부분 구현**: 약 20%
- **미구현**: 약 10%

### 주요 발견 사항

#### ✅ 잘 구현된 기능
1. **계약서 관리**: PDF 생성, 이메일 전송, 본사 전송 모두 구현됨
2. **고객 소유권 추적**: 관리자 고객 상세 페이지에 표시됨
3. **수당 계산 로직**: 완전히 구현됨
4. **관리자 계약서 조회**: 모든 계약서 조회 및 관리 가능

#### ⚠️ 부분 구현/문제점
1. **판매 확정 프로세스**: 🆕 새로운 프로세스 필요 (판매원/대리점장 요청 → 관리자 승인)
2. **수당 자동 계산**: 로직은 있으나 승인 시 자동 실행되도록 연결 필요
3. **관리자 대시보드**: 어필리에이트 통계가 통합되지 않음
4. **비밀번호 조회**: 보안상 마스킹되어 표시됨 (의도된 동작일 수 있음)

#### ❌ 확인 필요
1. **대리점장/판매원 수당 확인**: 대시보드에서 수당 확인 기능 확인 필요
2. **개인몰 구매 추적**: 어필리에이트 코드 추적이 모든 구매 경로에서 작동하는지 확인 필요

---

## 📋 요구사항 요약

### 구현되어야 할 기능들

1. **관리자 패널 연동**
   - 대리점장과 판매원의 모든 자료가 관리자 패널에 연동되어 표시
   - 모든 기록 표시 (판매원 소속, 고객 소속, 대리점장 이름, 판매원 이름)

2. **어필리에이트 수당 관리**
   - 수당 책정 (대리점장, 판매원)
   - 자동 오버라이딩 계산
   - 수당 확인 기능

3. **계약서 관리**
   - 계약 후 PDF로 이메일 전송 (대리점장/관리자 자동/수동)
   - 관리자: 모든 판매원 계약서 조회
   - 관리자: 판매원 아이디/비밀번호 수정 및 조회
   - 대리점장: 자신의 계약서 PDF 이메일 전송 (본사 주소로)
   - 대리점장: 소속 판매원 계약서 관리

4. **대리점장 대시보드**
   - 소속 판매원 관리
   - 실적 관리
   - 수당/오버라이딩 확인

5. **개인몰 및 결제 페이지**
   - 대리점장 개인몰
   - 판매원 개인몰
   - 개인 결제 구매페이지
   - 관리자가 누구의 고객이 구매했는지 확인 가능

---

## 🔍 현재 구현 상태 분석

### ✅ 구현된 기능

1. **데이터베이스 스키마**
   - `AffiliateProfile`: 대리점장/판매원 프로필
   - `AffiliateContract`: 계약서 정보
   - `AffiliateSale`: 판매 기록
   - `AffiliateLead`: 고객 리드
   - `AffiliateRelation`: 대리점장-판매원 관계
   - `CommissionLedger`: 수당 원장
   - `AffiliateCommissionTier`: 수당 티어

2. **대리점장/판매원 대시보드**
   - 파일: `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx`
   - 통계 조회 기능
   - 계약서 관리 기능 (대리점장만)
   - 판매원 초대 기능

3. **수당 계산 로직**
   - 파일: `lib/affiliate/commission.ts`
   - `calculateCommissionBreakdown()`: 수당 계산
   - `generateLedgerEntries()`: 원장 엔트리 생성

4. **고객 소유권 추적**
   - 파일: `lib/affiliate/customer-ownership.ts`
   - `getAffiliateOwnershipForUsers()`: 고객 소유권 조회

5. **관리자 비밀번호 관리**
   - 파일: `app/api/admin/users/[userId]/reset-password/route.ts`
   - 비밀번호 초기화 기능
   - 비밀번호 이력 조회 (`app/api/admin/password-events/route.ts`)

6. **결제 페이지 관리**
   - 파일: `app/admin/affiliate/payment-pages/page.tsx`
   - 계약서 타입별 결제 링크 관리

---

## ❌ 발견된 문제점 및 미구현 기능

### 1. 관리자 패널 - 전체 데이터 연동 미완성 ⚠️ 확인됨

**문제점:**
- 관리자 대시보드에 대리점장/판매원 데이터가 완전히 통합되지 않음
- `app/api/admin/dashboard/route.ts`에 어필리에이트 통계가 없음
- 고객 목록에서 대리점장/판매원 정보는 표시됨 (`app/admin/customers/[userId]/page.tsx`에 구현됨)

**확인된 사항:**
- ✅ 고객 상세 페이지에 소유권 정보 표시됨 (`renderAffiliateOwnershipSection`)
- ❌ 관리자 대시보드에 어필리에이트 통계 없음

**해결 방안:**
```typescript
// 관리자 대시보드 API에 어필리에이트 통계 추가 필요
// app/api/admin/dashboard/route.ts에 추가:
- 총 대리점장 수 (AffiliateProfile where type = 'BRANCH_MANAGER')
- 총 판매원 수 (AffiliateProfile where type = 'SALES_AGENT')
- 어필리에이트 판매 통계 (AffiliateSale 통계)
- 어필리에이트 리드 통계 (AffiliateLead 통계)
```

### 2. 관리자 - 판매원 계약서 전체 조회 기능 ✅ 구현됨

**확인된 사항:**
- ✅ 관리자 계약서 관리 페이지 구현됨 (`app/admin/affiliate/contracts/page.tsx`)
- ✅ 모든 계약서 목록 조회 가능
- ✅ 계약서 필터링 기능 (상태별, 검색)
- ✅ 계약서 상세 정보 표시
- ✅ 계약서 PDF 전송 기능
- ✅ 계약서 승인/거부 기능

**확인 필요:**
- [x] 관리자 패널에서 모든 판매원 계약서 목록 조회 가능한가? → **예**
- [x] 계약서 필터링 (대리점장별, 판매원별) 기능이 있는가? → **상태별 필터링 있음, 대리점장/판매원별 필터는 확인 필요**
- [x] 계약서 상태별 조회 기능이 있는가? → **예**

### 3. 관리자 - 판매원 비밀번호 조회 기능 ⚠️ 부분 구현

**확인된 사항:**
- ✅ 비밀번호 초기화 기능 구현됨 (`app/api/admin/users/[userId]/reset-password/route.ts`)
- ✅ 비밀번호 이력 조회 기능 구현됨 (`app/api/admin/password-events/route.ts`)
- ❌ 현재 비밀번호는 마스킹되어 표시됨 (보안상 이유)
- ✅ 사용자 상세 페이지에서 비밀번호 이력 확인 가능 (`app/admin/users/[userId]/page.tsx`)

**확인 필요:**
- [x] `app/admin/users/[userId]/page.tsx`에서 비밀번호 표시 기능이 있는가? → **이력만 표시, 현재 비밀번호는 마스킹**
- [x] 비밀번호 이력에서 실제 비밀번호를 볼 수 있는가? → **아니오, 마스킹됨**

**현재 상태:**
```typescript
// app/api/admin/password-events/route.ts:68
from: event.from ? '***' : null, // 보안을 위해 마스킹
to: event.to ? '***' : null,
```

**해결 방안:**
- 보안상 현재 비밀번호를 직접 조회하는 것은 권장되지 않음
- 비밀번호 초기화 기능으로 대체 가능
- 필요시 관리자 전용 비밀번호 조회 API 추가 가능 (보안 정책에 따라)

### 4. 대리점장 - 계약서 PDF 이메일 전송 기능 ✅ 구현됨

**확인된 사항:**
- ✅ 계약서 PDF 생성 기능 구현됨 (`lib/affiliate/contract-pdf.ts`)
- ✅ 이메일 전송 기능 구현됨 (`lib/affiliate/contract-email.ts`)
- ✅ 대리점장이 자신의 계약서 PDF 전송 가능 (`app/api/partner/contracts/[contractId]/send-pdf/route.ts`)
- ✅ 관리자가 계약서 PDF 전송 가능 (`app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts`)
- ✅ 본사로 전송 기능 구현됨 (`sendContractPDFToHeadOffice()`)
- ✅ 계약 완료 시 자동 이메일 전송 (`app/api/admin/affiliate/contracts/[contractId]/complete/route.ts`)

**확인 필요:**
- [x] 대리점장이 자신의 계약서 PDF를 생성할 수 있는가? → **예**
- [x] 이메일 전송 기능이 있는가? → **예**
- [x] 본사 주소로 자동 전송되는가? → **예, `sendContractPDFToHeadOffice()` 함수 있음**

### 5. 수당/오버라이딩 자동 계산 및 확인 기능 ⚠️ 부분 구현 → 🆕 **프로세스 변경**

**기존 문제점:**
- 판매 확정 시 자동 수당 계산이 되지 않음
- 수동으로 수당 승인해야 함

**새로운 요구사항:** ⭐
- 판매원/대리점장이 구매 체크 후 녹음 파일 첨부하여 판매 확정 요청
- 관리자가 녹음 파일 확인 후 승인
- 승인 시 자동 수당 계산 및 CommissionLedger 생성

**확인된 사항:**
- ✅ 수당 계산 로직 구현됨 (`lib/affiliate/commission.ts`)
- ✅ 수당 원장 생성 로직 구현됨 (`lib/affiliate/commission-ledger.ts`)
- ✅ `syncSaleCommissionLedgers()` 함수로 수당 동기화 가능
- ❌ 현재 판매 확정 프로세스가 요구사항과 다름
- 🆕 **새로운 프로세스 구현 필요** (상세 내용은 아래 "새로운 요구사항" 섹션 참조)

**구현 필요:**
- [ ] AffiliateSale 모델에 녹음 파일 필드 추가
- [ ] 판매원/대리점장용 판매 확정 요청 API
- [ ] 녹음 파일 업로드 기능
- [ ] 관리자 승인/거부 API
- [ ] 승인 시 자동 수당 계산 로직 연결
- [ ] UI 컴포넌트 (요청 제출, 승인 대기 목록)
- [ ] 대리점장이 자신의 수당을 확인할 수 있는가? → 확인 필요
- [ ] 판매원이 자신의 수당을 확인할 수 있는가? → 확인 필요

### 6. 개인몰 및 결제 페이지 - 고객 소유권 추적 미확인

**문제점:**
- 개인몰에서 구매한 고객이 누구의 고객인지 추적되는지 확인 필요
- 관리자가 구매 고객의 대리점장/판매원 정보를 확인할 수 있는지 확인 필요

**확인 필요 파일:**
- `app/api/public/inquiry/route.ts` (어필리에이트 추적은 있음)
- `app/api/affiliate/customers/register/route.ts`
- `lib/affiliate/customer-ownership.ts`
- 관리자 고객 상세 페이지에서 소유권 정보 표시

**확인 필요:**
- [ ] 개인몰 구매 시 어필리에이트 코드가 추적되는가?
- [ ] 결제 페이지에서 어필리에이트 코드가 추적되는가?
- [ ] 관리자가 고객 상세에서 대리점장/판매원 정보를 볼 수 있는가?

### 7. 대리점장 - 소속 판매원 관리 기능 미확인

**문제점:**
- 대리점장이 소속 판매원을 관리하는 기능이 완전한지 확인 필요
- 판매원 실적 조회 기능 확인 필요

**확인 필요 파일:**
- `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx`
- `app/api/admin/affiliate/teams/metrics/route.ts`
- `app/api/admin/affiliate/agents/metrics/route.ts`

**확인 필요:**
- [ ] 대리점장이 소속 판매원 목록을 볼 수 있는가?
- [ ] 판매원별 실적을 볼 수 있는가?
- [ ] 판매원별 수당/오버라이딩을 볼 수 있는가?

### 8. 데이터 연동 오류 가능성

**문제점:**
- 여러 시스템 간 데이터 연동이 제대로 되지 않을 수 있음
- API 엔드포인트 간 데이터 형식 불일치 가능성

**확인 필요:**
- [ ] AffiliateProfile과 User 간 관계가 올바르게 설정되어 있는가?
- [ ] AffiliateSale과 CommissionLedger 간 연동이 올바른가?
- [ ] AffiliateLead와 고객(User) 간 연결이 올바른가?

---

## 🔧 수정/개선이 필요한 항목

### 우선순위 1: 핵심 기능 확인 및 수정

1. **관리자 패널 - 어필리에이트 데이터 통합**
   - 관리자 대시보드에 대리점장/판매원 통계 추가
   - 고객 목록에 소유권 정보 표시
   - 판매 기록에 대리점장/판매원 정보 표시

2. **판매 확정 프로세스 개선** ⭐ **새로운 요구사항**
   - 판매원/대리점장이 구매 체크 후 녹음 파일 첨부하여 판매 확정 요청
   - 관리자가 녹음 파일 확인 후 승인/거부
   - 승인 시 자동 수당 계산 및 CommissionLedger 생성
   - 오버라이딩 자동 계산 확인

3. **고객 소유권 추적 확인**
   - 개인몰 구매 시 소유권 추적 확인
   - 결제 페이지 구매 시 소유권 추적 확인
   - 관리자 패널에서 소유권 정보 표시

### 우선순위 2: 기능 보완

4. **계약서 PDF 이메일 전송**
   - 대리점장 계약서 PDF 이메일 전송 기능 확인/구현
   - 본사 주소 자동 입력 확인
   - 이메일 템플릿 확인

5. **대리점장 대시보드 보완**
   - 소속 판매원 관리 기능 확인
   - 실적 조회 기능 확인
   - 수당/오버라이딩 확인 기능 확인

6. **관리자 기능 보완**
   - 모든 판매원 계약서 조회 기능 확인
   - 판매원 비밀번호 조회 기능 확인 (보안 고려)

### 우선순위 3: 데이터 정합성 확인

7. **데이터 연동 검증**
   - AffiliateProfile ↔ User 관계 확인
   - AffiliateSale ↔ CommissionLedger 연동 확인
   - AffiliateLead ↔ User 연결 확인
   - 데이터 불일치 수정

---

## 🆕 새로운 요구사항: 판매 확정 프로세스

### 프로세스 흐름

```
1. 판매원/대리점장
   ↓
   구매 체크 완료
   ↓
   녹음 파일 첨부
   ↓
   판매 확정 요청 제출
   ↓
2. 관리자
   ↓
   녹음 파일 확인
   ↓
   승인 또는 거부
   ↓
3. 승인 시
   ↓
   자동 수당 계산
   ↓
   CommissionLedger 생성
   ↓
   구매 인정 완료
```

### 구현 필요 사항

#### 1. 데이터베이스 스키마 수정

**AffiliateSale 모델에 필드 추가:**
```prisma
model AffiliateSale {
  // ... 기존 필드들 ...
  status String @default("PENDING") // PENDING → PENDING_APPROVAL → APPROVED/REJECTED
  audioFilePath String? // 녹음 파일 경로
  audioFileName String? // 녹음 파일 원본 이름
  submittedById Int? // 판매 확정 요청 제출자 (판매원/대리점장)
  submittedAt DateTime? // 판매 확정 요청 제출 시간
  approvedById Int? // 승인한 관리자 ID
  approvedAt DateTime? // 승인 시간
  rejectionReason String? // 거부 사유
  // ... 기존 필드들 ...
}
```

**상태 값:**
- `PENDING`: 초기 상태 (판매 기록만 생성)
- `PENDING_APPROVAL`: 판매원/대리점장이 판매 확정 요청 제출 (녹음 파일 첨부)
- `APPROVED`: 관리자가 승인 (수당 계산 완료)
- `REJECTED`: 관리자가 거부
- `CONFIRMED`: 기존 상태 (하위 호환성 유지)

#### 2. API 엔드포인트

**판매원/대리점장용:**
- `POST /api/affiliate/sales/[saleId]/submit-confirmation`
  - 판매 확정 요청 제출 (녹음 파일 업로드 포함)
  - 요청자: 판매원 또는 대리점장 (본인 판매만)
  - 상태 변경: PENDING → PENDING_APPROVAL

**관리자용:**
- `POST /api/admin/affiliate/sales/[saleId]/approve`
  - 판매 확정 승인
  - 녹음 파일 확인 후 승인
  - 상태 변경: PENDING_APPROVAL → APPROVED
  - 자동 수당 계산 및 CommissionLedger 생성

- `POST /api/admin/affiliate/sales/[saleId]/reject`
  - 판매 확정 거부
  - 거부 사유 입력
  - 상태 변경: PENDING_APPROVAL → REJECTED

- `GET /api/admin/affiliate/sales/pending-approval`
  - 승인 대기 중인 판매 목록 조회
  - 녹음 파일 다운로드 링크 포함

#### 3. 파일 업로드 처리

**녹음 파일 저장:**
- 저장 위치: `/uploads/affiliate-sales/[saleId]/audio/`
- 파일 형식: MP3, WAV, M4A 등
- 파일 크기 제한: 50MB
- 파일명: `[timestamp]_[originalName]`

**API:**
- `POST /api/affiliate/sales/[saleId]/upload-audio`
  - 녹음 파일 업로드
  - 파일 경로를 AffiliateSale에 저장

#### 4. UI 컴포넌트

**판매원/대리점장 대시보드:**
- 판매 목록에 "판매 확정 요청" 버튼
- 녹음 파일 업로드 UI
- 요청 상태 표시 (대기 중, 승인됨, 거부됨)

**관리자 패널:**
- 승인 대기 판매 목록 페이지
- 녹음 파일 재생 플레이어
- 승인/거부 버튼
- 거부 사유 입력 모달

#### 5. 수당 자동 계산 로직

**승인 시 자동 실행:**
```typescript
// app/api/admin/affiliate/sales/[saleId]/approve/route.ts
import { syncSaleCommissionLedgers } from '@/lib/affiliate/commission-ledger';

// 승인 처리 후:
await syncSaleCommissionLedgers(saleId, { 
  includeHq: true,
  regenerate: false 
});
```

### 구현 우선순위

1. **1단계: 데이터베이스 스키마 수정**
   - AffiliateSale 모델에 필드 추가
   - 마이그레이션 실행

2. **2단계: 파일 업로드 API**
   - 녹음 파일 업로드 엔드포인트
   - 파일 저장 로직

3. **3단계: 판매 확정 요청 API**
   - 판매원/대리점장용 요청 제출 API
   - 권한 확인 (본인 판매만)

4. **4단계: 관리자 승인/거부 API**
   - 승인 API (수당 자동 계산 포함)
   - 거부 API

5. **5단계: UI 구현**
   - 판매원/대리점장 대시보드 UI
   - 관리자 승인 대기 목록 페이지

6. **6단계: 테스트**
   - 전체 프로세스 테스트
   - 파일 업로드/다운로드 테스트
   - 수당 계산 검증

---

## 📝 체크리스트

### 관리자 패널
- [ ] 대리점장/판매원 통계 표시
- [ ] 고객 목록에 소유권 정보 표시
- [ ] 판매 기록에 대리점장/판매원 정보 표시
- [ ] 모든 판매원 계약서 조회
- [ ] 판매원 비밀번호 수정/조회
- [ ] 구매 고객의 대리점장/판매원 정보 확인

### 대리점장 대시보드
- [ ] 소속 판매원 목록 조회
- [ ] 판매원 실적 조회
- [ ] 수당/오버라이딩 확인
- [ ] 자신의 계약서 PDF 이메일 전송
- [ ] 소속 판매원 계약서 관리

### 판매원 대시보드
- [ ] 자신의 실적 조회
- [ ] 수당 확인
- [ ] 고객 목록 조회

### 수당 시스템
- [ ] 판매 확정 시 자동 수당 계산
- [ ] 오버라이딩 자동 계산
- [ ] CommissionLedger 자동 생성
- [ ] 수당 확인 기능

### 개인몰/결제 페이지
- [ ] 어필리에이트 코드 추적
- [ ] 고객 소유권 자동 할당
- [ ] 구매 기록에 대리점장/판매원 정보 저장

### 계약서 관리
- [ ] 계약서 PDF 생성
- [ ] 이메일 전송 기능
- [ ] 본사 주소 자동 입력
- [ ] 계약서 상태 관리

---

## 🚀 다음 단계

1. **즉시 확인 필요**
   - 각 기능이 실제로 작동하는지 테스트
   - API 엔드포인트 응답 확인
   - 데이터베이스 쿼리 결과 확인

2. **수정 작업**
   - 미구현 기능 구현
   - 버그 수정
   - 데이터 연동 오류 수정

3. **테스트**
   - 전체 플로우 테스트
   - 데이터 정합성 검증
   - 사용자 시나리오 테스트

---

## 📌 참고 파일 목록

### 핵심 파일
- `prisma/schema.prisma` - 데이터베이스 스키마
- `lib/affiliate/commission.ts` - 수당 계산
- `lib/affiliate/customer-ownership.ts` - 고객 소유권
- `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx` - 대리점장/판매원 대시보드
- `app/admin/affiliate/contracts/page.tsx` - 관리자 계약서 관리
- `app/admin/affiliate/profiles/page.tsx` - 관리자 프로필 관리

### API 엔드포인트
- `/api/admin/affiliate/*` - 관리자 어필리에이트 API
- `/api/affiliate/*` - 어필리에이트 API
- `/api/admin/users/[userId]/*` - 관리자 사용자 관리 API

---

## 💡 권장 사항

1. **로깅 강화**
   - 모든 어필리에이트 관련 작업에 로깅 추가
   - 에러 발생 시 상세 로그 기록

2. **에러 처리 개선**
   - API 응답에 명확한 에러 메시지
   - 사용자 친화적인 에러 표시

3. **데이터 검증**
   - 입력 데이터 검증 강화
   - 데이터 정합성 체크

4. **문서화**
   - API 문서화
   - 사용자 가이드 작성

