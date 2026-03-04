# 여행계약서 시스템 최종 작업지시서 V3
> 작성일: 2026-03-05 | 기반: 6개 병렬 에이전트 비판적 검토 결과 통합
> 에이전트: DOCX 갭분석 / 보안감사 / 프론트엔드UX / DB·API 무결성 / PDF인프라 / 법률컴플라이언스

---

## 이미 완료된 수정 (이 작업지시서 작성 시점 즉시 반영)

| ID | 수정 | 파일 | 심각도 |
|----|------|------|--------|
| WO-V3-01 | `cancelRows` XSS — `r.period`/`r.charge` escapeHtml() 누락 수정 | `lib/contracts/travel-contract-generator.ts:108` | P0 |
| WO-V3-02 | `browser.close()` catch 누락 — page.close()와 동일 패턴 적용 | `lib/contracts/travel-contract-pdf.ts:123` | P1 |
| WO-V3-03 | PDF 생성 실패 rollback 불완전 — `companions:[]`, `customerAddress:null` 추가 | `app/api/contracts/[token]/sign/route.ts:200` | P1 |
| WO-V3-04 | 버튼 `type="button"` 누락 7개 수정 (헤더 탭 2개, 리뷰→서명 1개, 동행자 추가/삭제, 서명 지우기 2개) | `app/contract/[token]/page.tsx` | P0 |
| WO-V3-05 | 분쟁해결 안내에 관광불편신고처리위원회 1588-8692 추가 | `lib/contracts/travel-contract-generator.ts:883` | P2 |

---

## Phase 1: P0 Critical — 즉시 수정 필요

### WO-V3-06: GET /pdf expiresAt 만료 검증 누락
**발견**: 보안 에이전트 HR-03
**파일**: `app/api/contracts/[token]/pdf/route.ts:52`
**문제**: sign/route.ts는 만료 검증 있으나 pdf/route.ts는 `status !== 'signed'`만 확인

```typescript
// 현재 (pdf/route.ts:52):
if (contract.status !== 'signed') {
  return NextResponse.json({ ... }, { status: 403 });
}

// 수정 — status 검증 다음에 추가:
if (contract.expiresAt && contract.expiresAt < new Date()) {
  return NextResponse.json(
    { ok: false, error: '계약서 접근 기간이 만료되었습니다.' },
    { status: 410 }
  );
}
```

**우선순위**: P1 (signed된 계약서는 만료와 무관하게 다운로드 허용하는 설계도 가능)
**노트**: 만료된 계약서라도 서명이 완료됐다면 다운로드를 허용하는 것이 UX상 맞을 수 있음 — 정책 결정 필요

---

### WO-V3-07: Cache-Control no-store 누락
**발견**: 보안 에이전트 MD-04
**파일**: `app/api/contracts/[token]/pdf/route.ts:109`
**문제**: `private, no-cache`만 있어 일부 브라우저가 민감한 PDF를 디스크 캐시에 저장할 수 있음

```typescript
// 현재:
'Cache-Control': 'private, no-cache',

// 수정:
'Cache-Control': 'private, no-cache, no-store',
```

**작업량**: 1줄 변경

---

### WO-V3-08: Zod 스키마 길이 검증 강화
**발견**: 보안 에이전트 MD-03
**파일**: `lib/contracts/types.ts`
**문제**: 여러 필드에 min/max 길이 제한 없음

```typescript
// 현재:
affiliateName: z.string(),
otherNotes: z.string().nullable().optional(),
insuranceCompany: z.string().nullable().optional(),

// 수정:
affiliateName: z.string().min(1, '담당자명 필수').max(100),
otherNotes: z.string().max(2000).nullable().optional(),
insuranceCompany: z.string().max(200).nullable().optional(),
// 기타 string 필드들도 max 제한 추가
```

---

## Phase 2: P1 High — 이번 주 내 수정

### WO-V3-09: DOCX 갭 — 식사 횟수(식사 일정) 미표시
**발견**: DOCX 갭분석 에이전트
**파일**: `lib/contracts/travel-contract-generator.ts` (일정 섹션)
**문제**: DOCX 원본에는 "조식 X회, 중식 X회, 석식 X회" 명시 → 코드는 "☑ 일정에 표시"만

**현재 코드 위치**: 여행 개요 테이블 (approximately line 410-435)
**개선안**:
```typescript
// types.ts에 추가:
mealCounts?: { breakfast: number; lunch: number; dinner: number };

// generator.ts에서 조건부 렌더링:
${data.mealCounts
  ? `조식 ${data.mealCounts.breakfast}회 / 중식 ${data.mealCounts.lunch}회 / 석식 ${data.mealCounts.dinner}회`
  : '일정표 참조'}
```

---

### WO-V3-10: DOCX 갭 — 변경 패널티 규정 제3조 8항 미구현
**발견**: DOCX 갭분석 에이전트
**파일**: `lib/contracts/travel-contract-generator.ts` 크루즈 특별약관 섹션 (~line 784)
**문제**: DOCX에 "제3조 8항: 일정 변경 시 위약금 규정" 명시되나 코드에는 해당 조항 없음

**추가할 내용**:
```html
<strong>제3조 제8항 (일정 변경 패널티)</strong>
크루즈 여행 출발 후 여행객의 귀책으로 인한 일정 변경은 추가 비용이 발생할 수 있으며,
선사 및 협력사 정책에 따라 별도 위약금이 부과될 수 있습니다.
```

---

### WO-V3-11: DOCX 갭 — 영수증 발급 불가 안내 미구현
**발견**: DOCX 갭분석 에이전트
**파일**: `lib/contracts/travel-contract-generator.ts`
**문제**: DOCX에 "세금계산서·현금영수증 발급 불가" 안내가 있으나 코드에 없음

**추가 위치**: 비용 내역 섹션 하단
```html
<p style="font-size:8pt;color:#888;">
  ※ 본 여행 상품은 세금계산서 및 현금영수증 발급이 불가합니다.
</p>
```

---

### WO-V3-12: DOCX 갭 — "고객보관용" → "회원보관용" 레이블 일치
**발견**: DOCX 갭분석 에이전트
**파일**: `lib/contracts/travel-contract-generator.ts` (~line 590)
**문제**: 원본 DOCX는 "회원보관용", 코드는 "고객보관용" 사용

**수정**: `고객보관용` → `회원보관용` (2개 복사본 모두 적용)
**주의**: 브랜드 정책에 따라 다를 수 있음 — 확인 후 적용

---

## Phase 3: P2 Medium — 다음 주 내

### WO-V3-13: 이미지 캐시 실패 시 재시도 가능하도록 개선
**발견**: PDF 인프라 에이전트
**파일**: `lib/contracts/travel-contract-generator.ts:13,20`
**문제**: 이미지 파일 없거나 읽기 실패 시 빈 문자열을 캐시에 영구 저장
**위험**: 서버리스 인스턴스 재사용 환경에서, 스탬프 이미지 배포 후에도 빈 캐시가 유지될 수 있음

```typescript
// 현재 (실패를 캐시에 영구 저장):
if (!existsSync(absPath)) { _imageCache.set(relativePath, ''); return ''; }
// ...
} catch { _imageCache.set(relativePath, ''); return ''; }

// 개선안 — 실패는 캐시하지 않음:
if (!existsSync(absPath)) { return ''; }  // 캐시 저장 안 함
// ...
} catch { return ''; }  // 캐시 저장 안 함
```

**트레이드오프**: 매 요청마다 존재하지 않는 파일을 다시 확인 → 성능 소폭 저하
**대안**: TTL 기반 캐시 (실패 항목은 10초 후 재시도)

---

### WO-V3-14: GET /pdf admin 인증 옵션 검토
**발견**: 보안 에이전트 CR-01
**파일**: `app/api/contracts/[token]/pdf/route.ts`
**현황**: 토큰만으로 접근 가능 (인증 없음) — 토큰 길이 25자+ (2^130 경우의 수)
**실제 위험도**: 낮음 (토큰 자체가 충분히 강력)

**정책 결정 필요**:
- Option A: 현상 유지 (토큰 기반 접근 — 고객 이메일로 링크 발송 패턴)
- Option B: 세션 인증 + 토큰 검증 (고객이 로그인한 경우만 접근)
- Option C: 추가 확인 (마지막 4자리 전화번호 입력) — UX 저하

**권고**: Option A 유지 (이미 충분히 안전), 단 토큰 생성 시 crypto.randomBytes(32) 사용 확인

---

### WO-V3-15: HTML 템플릿 DRY 위반 — 회사/고객 보관용 중복
**발견**: PDF 인프라 에이전트
**파일**: `lib/contracts/travel-contract-generator.ts`
**문제**: 회사보관용(~450줄)과 고객보관용(~450줄) 템플릿이 거의 동일
**개선안**: `renderContractHalf(copy: 'company' | 'customer', ...)` 공통 함수로 추출
**작업량**: 리팩토링 3-4시간, 위험도 중간 (회귀 테스트 필요)

---

### WO-V3-16: 개인정보처리방침 페이지 신설
**발견**: 법률 컴플라이언스 에이전트
**근거**: 개인정보보호법 제30조
**파일**: 신규 `app/privacy/page.tsx`
**필수 포함 항목** (10개):
1. 개인정보 수집·이용 목적
2. 처리하는 개인정보 항목
3. 개인정보 보유·이용 기간
4. 개인정보 제3자 제공
5. 동의 거부 시 불이익
6. 열람·정정·삭제 요청 방법
7. 개인정보 보호책임자 연락처
8. 기술적·관리적 보호조치
9. 개인정보 국외 이전 (해당 시)
10. 주민등록번호 등 민감정보 (해당 시)

---

### WO-V3-17: 영업보증보험 증명 정보 상세화
**발견**: 법률 컴플라이언스 에이전트
**근거**: 관광진흥법 제12조
**현황**: 보증 유형 체크박스만 있음 (공제/여행보증보험/영업보증금)
**개선**: 증권번호, 보험사, 보험금액, 유효기간 표시

```typescript
// types.ts에 추가:
guaranteeDetails?: {
  company?: string;       // 보험회사명
  policyNumber?: string;  // 증권번호
  coverage?: string;      // 보험금액
  validUntil?: string;    // 유효기간
};
```

---

## Phase 4: P3 Backlog — 중장기

### WO-V3-18: TravelContract.pdfUrl 필드 사용 또는 제거
**발견**: DB·API 에이전트
**파일**: `prisma/schema.prisma` (line ~3098)
**문제**: `pdfUrl String?` 필드가 스키마에 정의되어 있으나 sign/route.ts에서 절대 SET하지 않음
**옵션**:
- A: S3/Supabase Storage에 서명 완료 PDF 저장 → pdfUrl에 기록 → 이후 요청은 즉시 반환
- B: pdfUrl 필드 삭제 (스키마 dead code 제거)
**권고**: A 구현 시 PDF 재생성 비용 없어짐 (현재 매 다운로드마다 Puppeteer 실행)

---

### WO-V3-19: 서명 이미지 암호화 저장
**발견**: 법률 컴플라이언스 에이전트
**근거**: 개인정보보호법 제23조 (생체정보 암호화)
**현황**: customerSignature, contractorSignature를 base64 평문으로 DB TEXT 저장
**개선**: AES-256 암호화 후 저장, PDF 생성 시 복호화
**작업량**: 높음 (암호화 키 관리 인프라 필요)

---

### WO-V3-20: 서명 완료 시 PDF 사전 생성 + S3 저장 (WO-V3-18 연계)
**발견**: 성능 관점
**현황**: 매 `/api/contracts/[token]/pdf` 요청마다 Puppeteer 실행 (3-10초)
**개선**: sign 완료 → background job으로 PDF 생성 → S3/Supabase 저장 → pdf/route.ts는 URL 리다이렉트
**이점**:
- PDF 다운로드 응답시간 ~100ms (현재 3-10초)
- Vercel maxDuration 60초 제한 완화
- 동시 다운로드 시 semaphore 경합 없음

---

### WO-V3-21: 여행일정표 별도 PDF 자동 생성
**발견**: 법률 컴플라이언스 에이전트
**근거**: 관광진흥법 제41조 (여행계약서 + 여행약관 + 여행일정표 3가지 필수)
**현황**: 계약서 HTML에 "일정표 참조" 텍스트만 있고 실제 일정표 PDF 없음
**작업량**: 새 generator 함수 필요 + 예약 시스템 연동

---

### WO-V3-22: SMS/카카오 알림 — 서명 완료 고객 알림
**발견**: 사용자 경험 관점
**현황**: 이메일만 발송 (sign/route.ts:164-191)
**개선**: 계약서 서명 완료 시 SMS 또는 카카오 알림 발송
**파일**: `app/api/contracts/[token]/sign/route.ts` 이메일 발송 다음 추가

---

### WO-V3-23: 계약서 버전 관리 (Contract Versioning)
**발견**: 아키텍처 관점
**현황**: 계약서 형식 변경 시 기존 서명 완료 PDF와 현재 코드가 불일치
**개선**: TravelContract에 `templateVersion String @default("1.0")` 추가
**목적**: 나중에 "이 계약서는 어떤 템플릿으로 생성됐는가" 추적 가능

---

## 전체 발견 사항 요약

### 6개 에이전트 Critical Findings

| ID | 에이전트 | 발견 | 심각도 | 상태 |
|----|----------|------|--------|------|
| WO-V3-01 | PDF 인프라 | cancelRows XSS (escapeHtml 누락) | **P0 Critical** | ✅ 완료 |
| WO-V3-02 | PDF 인프라 | browser.close() catch 누락 | P1 | ✅ 완료 |
| WO-V3-03 | DB·API | rollback 불완전 (companions/address 미초기화) | P1 | ✅ 완료 |
| WO-V3-04 | 프론트엔드 | 버튼 type="button" 누락 7개 | P0 | ✅ 완료 |
| WO-V3-05 | DOCX 갭 | 1588-8692 분쟁 신고 번호 누락 | P2 | ✅ 완료 |
| WO-V3-06 | 보안 | GET /pdf expiresAt 만료 미검증 | P1 | 🔲 남음 |
| WO-V3-07 | 보안 | Cache-Control no-store 누락 | P1 | 🔲 남음 |
| WO-V3-08 | 보안 | Zod 스키마 길이 검증 미흡 | P1 | 🔲 남음 |
| WO-V3-09 | DOCX 갭 | 식사 횟수 미표시 | P2 | 🔲 남음 |
| WO-V3-10 | DOCX 갭 | 변경 패널티 규정 제3조8항 누락 | P2 | 🔲 남음 |
| WO-V3-11 | DOCX 갭 | 영수증 발급 불가 안내 누락 | P2 | 🔲 남음 |
| WO-V3-12 | DOCX 갭 | 고객보관용→회원보관용 레이블 | P2 | 🔲 남음 |
| WO-V3-13 | PDF 인프라 | 이미지 캐시 실패 영구 캐싱 | P2 | 🔲 남음 |
| WO-V3-14 | 보안 | GET /pdf IDOR 위험도 검토 | P3 | 🔲 남음 |
| WO-V3-15 | PDF 인프라 | 템플릿 DRY 위반 리팩토링 | P3 | 🔲 남음 |
| WO-V3-16 | 법률 | 개인정보처리방침 페이지 신설 | P2 | 🔲 남음 |
| WO-V3-17 | 법률 | 영업보증보험 증명 상세화 | P3 | 🔲 남음 |
| WO-V3-18 | DB·API | pdfUrl 필드 미사용 (dead code) | P3 | 🔲 남음 |
| WO-V3-19 | 법률 | 서명 이미지 암호화 미구현 | P3 | 🔲 남음 |
| WO-V3-20 | 성능 | PDF 사전 생성 + S3 저장 | P3 | 🔲 남음 |
| WO-V3-21 | 법률 | 여행일정표 별도 PDF 생성 | P3 | 🔲 남음 |
| WO-V3-22 | UX | SMS/카카오 서명 완료 알림 | P3 | 🔲 남음 |
| WO-V3-23 | 아키텍처 | 계약서 템플릿 버전 관리 | P3 | 🔲 남음 |

---

## DOCX 컴플라이언스 체크리스트

### 구현 완료 ✅ (17개)
1. ✅ 회사 정보 (상호, 주소, 사업자번호, 대표자, 전화)
2. ✅ 여행자 정보 (성명, 연락처)
3. ✅ 여행 개요 (상품명, 출발일, 귀국일, 인원수)
4. ✅ 여행 요금 및 구성 내역
5. ✅ 포함/불포함 사항
6. ✅ 취소료 규정 테이블 (표준 + 상품별 커스텀)
7. ✅ 국외여행표준약관 제1~21조 전문
8. ✅ 크루즈 특별약관 제1~10조 (확장 구현)
9. ✅ 여행자 보험 가입 여부 체크박스
10. ✅ 영업보증 유형 체크박스 (공제/보증보험/보증금)
11. ✅ 여행자·계약자 서명 영역
12. ✅ 서명 타임스탬프 기록
13. ✅ 개인정보 수집·이용 동의 (필수)
14. ✅ 개인정보 제3자 제공 동의 (필수)
15. ✅ 마케팅 활용 선택 동의
16. ✅ 동행자 명단 테이블
17. ✅ 회사 직인 이미지 (stamp-bae.png / cruisedot-stamp.png)

### 미구현 또는 개선 필요 ❌/⚠️
1. ❌ 식사 횟수 (조식/중식/석식 회수) → WO-V3-09
2. ❌ 변경 패널티 규정 제3조 8항 → WO-V3-10
3. ❌ 영수증 발급 불가 안내 → WO-V3-11
4. ⚠️ 분쟁 신고 번호 1588-8692 → ✅ WO-V3-05 완료
5. ⚠️ 고객보관용 vs 회원보관용 레이블 → WO-V3-12

---

## 다음 즉시 실행 권고 순서

```
1. WO-V3-07: Cache-Control no-store  (1분)
2. WO-V3-08: Zod 스키마 길이 검증    (30분)
3. WO-V3-06: expiresAt 정책 결정 후 적용 (15분)
4. WO-V3-11: 영수증 발급 불가 안내   (5분)
5. WO-V3-12: 레이블 확인 후 변경     (5분)
6. WO-V3-16: 개인정보처리방침 페이지 (2-4시간)
```
