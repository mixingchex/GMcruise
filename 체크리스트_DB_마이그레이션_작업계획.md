# 체크리스트 DB 마이그레이션 작업 계획

> **작성일**: 2025년 1월 28일  
> **목적**: localStorage 기반 체크리스트를 서버 DB로 완전 마이그레이션

---

## 📊 현재 상태 분석

### ✅ 이미 완료된 부분

1. **API 구현 완료** (`app/api/checklist/route.ts`)
   - GET: 체크리스트 조회
   - POST: 항목 추가
   - PATCH: 항목 업데이트 (토글, 텍스트 수정)
   - DELETE: 항목 삭제
   - 인증 확인, 소유권 검증 모두 구현됨

2. **메인 체크리스트 페이지** (`app/checklist/page.tsx`)
   - 이미 서버 API만 사용
   - localStorage 사용 안 함 ✅

3. **Zustand Store** (`store/checklistStore.ts`)
   - 이미 서버 API만 사용
   - 마이그레이션 함수 구현됨 (`migrateFromLocalStorage`)

### ❌ 수정 필요한 부분

1. **테스트 페이지** (`app/checklist-test/page.tsx`)
   - 여전히 localStorage 사용 중
   - 서버 API로 변경 필요

---

## 🔧 작업 내용

### 1. `app/checklist-test/page.tsx` 수정

**현재 문제점**:
- localStorage에서 데이터 로드
- localStorage에 데이터 저장
- 서버 API와 동기화하는 복잡한 로직

**수정 방향**:
- 메인 페이지(`app/checklist/page.tsx`)와 동일하게 서버 API만 사용
- localStorage 사용 완전 제거
- 마이그레이션 로직 추가 (한 번만 실행)

---

## 📝 작업 단계

### Step 1: checklist-test 페이지 분석
- [x] 현재 localStorage 사용 부분 확인
- [ ] 서버 API로 변경할 함수 식별

### Step 2: checklist-test 페이지 수정
- [ ] localStorage 사용 제거
- [ ] 서버 API 호출로 변경
- [ ] 마이그레이션 로직 추가
- [ ] 에러 핸들링 개선

### Step 3: 마이그레이션 로직 개선
- [ ] 기존 localStorage 데이터를 서버로 마이그레이션
- [ ] 중복 방지 로직 확인
- [ ] 완료 상태도 함께 마이그레이션

### Step 4: 테스트
- [ ] 새 사용자: 기본 항목 생성 확인
- [ ] 기존 사용자: localStorage 데이터 마이그레이션 확인
- [ ] CRUD 작업 모두 정상 동작 확인

---

## 🎯 예상 작업 시간

- 코드 수정: 2시간
- 테스트 및 디버깅: 2시간
- **총 예상 시간**: 4시간

---

## ✅ 완료 기준

1. 모든 체크리스트 페이지가 서버 API만 사용
2. localStorage 사용 완전 제거
3. 기존 localStorage 데이터가 서버로 마이그레이션됨
4. 모든 CRUD 작업이 정상 동작



