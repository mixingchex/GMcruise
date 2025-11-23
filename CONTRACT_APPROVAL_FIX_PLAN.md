# 계약서 승인 및 아이디 생성 분리 계획

> 작성일: 2025-01-28  
> 목적: 계약서 승인과 아이디 생성을 분리하여 올바른 프로세스 구현

---

## 🔍 현재 문제점

**현재 상황:**
- `approve` API가 계약서 승인과 동시에 User/Profile을 생성함
- 실제로는 승인과 아이디 생성을 분리해야 함

**올바른 프로세스:**
1. 계약서 승인 → 상태만 `approved`로 변경
2. 아이디 생성 버튼 클릭 → User/Profile 생성 + 대시보드 접근 권한 부여

---

## 🔧 수정 계획

### 1. `approve` API 수정

**현재**: User/Profile 자동 생성
**수정 후**: 상태만 `approved`로 변경

**파일**: `app/api/admin/affiliate/contracts/[contractId]/approve/route.ts`

**변경 사항:**
- User 생성 로직 제거
- Profile 생성 로직 제거
- AffiliateRelation 생성 로직 제거
- 계약서 상태만 `approved`로 변경

### 2. 아이디 생성 API 생성

**새 파일**: `app/api/admin/affiliate/contracts/[contractId]/generate-id/route.ts`

**기능:**
- User 생성 (phone: boss1/user1 형식, password: 1101)
- AffiliateProfile 생성
- AffiliateRelation 생성 (판매원인 경우)
- 대시보드 접근 권한 부여

### 3. 프론트엔드 수정

**파일**: `app/admin/affiliate/contracts/page.tsx`

**변경 사항:**
- 승인 버튼: 상태만 변경
- 아이디 생성 버튼 추가 (승인된 계약서만 표시)
- 아이디 생성 후 대시보드 접근 가능 안내

---

## 📋 구현 단계

### 단계 1: approve API 수정
- [ ] User/Profile 생성 로직 제거
- [ ] 상태만 `approved`로 변경
- [ ] 테스트

### 단계 2: generate-id API 생성
- [ ] 새 API 파일 생성
- [ ] User 생성 로직
- [ ] Profile 생성 로직
- [ ] Relation 생성 로직
- [ ] 테스트

### 단계 3: 프론트엔드 수정
- [ ] 승인 버튼 수정
- [ ] 아이디 생성 버튼 추가
- [ ] UI 업데이트
- [ ] 테스트

---

## ✅ 예상 결과

**계약서 승인 후:**
- 상태: `approved`
- 아이디 생성 버튼 표시

**아이디 생성 후:**
- User 생성 완료
- Profile 생성 완료
- 대시보드 접근 가능
- 계약서 상태: `approved` (변경 없음)


> 작성일: 2025-01-28  
> 목적: 계약서 승인과 아이디 생성을 분리하여 올바른 프로세스 구현

---

## 🔍 현재 문제점

**현재 상황:**
- `approve` API가 계약서 승인과 동시에 User/Profile을 생성함
- 실제로는 승인과 아이디 생성을 분리해야 함

**올바른 프로세스:**
1. 계약서 승인 → 상태만 `approved`로 변경
2. 아이디 생성 버튼 클릭 → User/Profile 생성 + 대시보드 접근 권한 부여

---

## 🔧 수정 계획

### 1. `approve` API 수정

**현재**: User/Profile 자동 생성
**수정 후**: 상태만 `approved`로 변경

**파일**: `app/api/admin/affiliate/contracts/[contractId]/approve/route.ts`

**변경 사항:**
- User 생성 로직 제거
- Profile 생성 로직 제거
- AffiliateRelation 생성 로직 제거
- 계약서 상태만 `approved`로 변경

### 2. 아이디 생성 API 생성

**새 파일**: `app/api/admin/affiliate/contracts/[contractId]/generate-id/route.ts`

**기능:**
- User 생성 (phone: boss1/user1 형식, password: 1101)
- AffiliateProfile 생성
- AffiliateRelation 생성 (판매원인 경우)
- 대시보드 접근 권한 부여

### 3. 프론트엔드 수정

**파일**: `app/admin/affiliate/contracts/page.tsx`

**변경 사항:**
- 승인 버튼: 상태만 변경
- 아이디 생성 버튼 추가 (승인된 계약서만 표시)
- 아이디 생성 후 대시보드 접근 가능 안내

---

## 📋 구현 단계

### 단계 1: approve API 수정
- [ ] User/Profile 생성 로직 제거
- [ ] 상태만 `approved`로 변경
- [ ] 테스트

### 단계 2: generate-id API 생성
- [ ] 새 API 파일 생성
- [ ] User 생성 로직
- [ ] Profile 생성 로직
- [ ] Relation 생성 로직
- [ ] 테스트

### 단계 3: 프론트엔드 수정
- [ ] 승인 버튼 수정
- [ ] 아이디 생성 버튼 추가
- [ ] UI 업데이트
- [ ] 테스트

---

## ✅ 예상 결과

**계약서 승인 후:**
- 상태: `approved`
- 아이디 생성 버튼 표시

**아이디 생성 후:**
- User 생성 완료
- Profile 생성 완료
- 대시보드 접근 가능
- 계약서 상태: `approved` (변경 없음)


> 작성일: 2025-01-28  
> 목적: 계약서 승인과 아이디 생성을 분리하여 올바른 프로세스 구현

---

## 🔍 현재 문제점

**현재 상황:**
- `approve` API가 계약서 승인과 동시에 User/Profile을 생성함
- 실제로는 승인과 아이디 생성을 분리해야 함

**올바른 프로세스:**
1. 계약서 승인 → 상태만 `approved`로 변경
2. 아이디 생성 버튼 클릭 → User/Profile 생성 + 대시보드 접근 권한 부여

---

## 🔧 수정 계획

### 1. `approve` API 수정

**현재**: User/Profile 자동 생성
**수정 후**: 상태만 `approved`로 변경

**파일**: `app/api/admin/affiliate/contracts/[contractId]/approve/route.ts`

**변경 사항:**
- User 생성 로직 제거
- Profile 생성 로직 제거
- AffiliateRelation 생성 로직 제거
- 계약서 상태만 `approved`로 변경

### 2. 아이디 생성 API 생성

**새 파일**: `app/api/admin/affiliate/contracts/[contractId]/generate-id/route.ts`

**기능:**
- User 생성 (phone: boss1/user1 형식, password: 1101)
- AffiliateProfile 생성
- AffiliateRelation 생성 (판매원인 경우)
- 대시보드 접근 권한 부여

### 3. 프론트엔드 수정

**파일**: `app/admin/affiliate/contracts/page.tsx`

**변경 사항:**
- 승인 버튼: 상태만 변경
- 아이디 생성 버튼 추가 (승인된 계약서만 표시)
- 아이디 생성 후 대시보드 접근 가능 안내

---

## 📋 구현 단계

### 단계 1: approve API 수정
- [ ] User/Profile 생성 로직 제거
- [ ] 상태만 `approved`로 변경
- [ ] 테스트

### 단계 2: generate-id API 생성
- [ ] 새 API 파일 생성
- [ ] User 생성 로직
- [ ] Profile 생성 로직
- [ ] Relation 생성 로직
- [ ] 테스트

### 단계 3: 프론트엔드 수정
- [ ] 승인 버튼 수정
- [ ] 아이디 생성 버튼 추가
- [ ] UI 업데이트
- [ ] 테스트

---

## ✅ 예상 결과

**계약서 승인 후:**
- 상태: `approved`
- 아이디 생성 버튼 표시

**아이디 생성 후:**
- User 생성 완료
- Profile 생성 완료
- 대시보드 접근 가능
- 계약서 상태: `approved` (변경 없음)










