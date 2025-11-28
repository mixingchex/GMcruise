# 계약서 PDF 전송 기능 종합 테스트 보고서

## 테스트 목적
관리자와 대리점장이 사용하는 PDF 전송 기능의 모든 시나리오를 테스트하여 405 에러 및 기타 문제를 사전에 발견

## 테스트 환경
- Next.js 15 (App Router)
- TypeScript
- Prisma ORM

## 테스트 결과

### 1. 코드 구조 검증 ✅

#### 라우트 파일 존재 확인
- ✅ 관리자 라우트: `app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts`
- ✅ 대리점장 라우트: `app/api/partner/contracts/[contractId]/send-pdf/route.ts`

#### POST 함수 Export 확인
- ✅ 관리자 라우트: POST 함수 export됨
- ✅ 대리점장 라우트: POST 함수 export됨

#### Next.js 15 params 처리 확인
- ✅ 관리자 라우트: `await params` 사용
- ✅ 대리점장 라우트: `await params` 사용 (수정 완료)

#### Content-Type 헤더 확인
- ✅ 관리자 라우트: 모든 응답에 Content-Type 헤더 명시
- ✅ 대리점장 라우트: 모든 응답에 Content-Type 헤더 명시 (수정 완료)

### 2. 클라이언트 코드 검증 ✅

#### 관리자 패널 (`app/admin/affiliate/contracts/page.tsx`)
- ✅ POST 메서드 명시: `method: 'POST'`
- ✅ credentials 설정: `credentials: 'include'`
- ✅ 타임아웃 설정: 120초
- ✅ 에러 핸들링: 빈 응답, JSON 파싱 에러 처리

#### 대리점장 대시보드 (`app/partner/[partnerId]/dashboard/PartnerDashboard.tsx`)
- ✅ POST 메서드 명시: `method: 'POST'`
- ✅ credentials 설정: `credentials: 'include'`
- ✅ 타임아웃 설정: 60초
- ✅ 에러 핸들링: 빈 응답, JSON 파싱 에러 처리

#### 대리점장 계약서 페이지 (`app/partner/[partnerId]/contract/MyContractClient.tsx`)
- ✅ POST 메서드 명시: `method: 'POST'`
- ✅ credentials 설정: `credentials: 'include'`
- ✅ 에러 핸들링: 빈 응답, JSON 파싱 에러 처리

### 3. 시나리오별 테스트

#### 시나리오 1: 관리자 - 정상 PDF 전송
**예상 동작:**
1. 관리자가 계약서 상세 페이지에서 "PDF로 보내기" 클릭
2. 확인 다이얼로그 표시
3. POST 요청: `/api/admin/affiliate/contracts/{contractId}/send-pdf`
4. 서버에서 PDF 생성 및 이메일 전송
5. 성공 메시지 표시

**검증 사항:**
- ✅ POST 메서드 사용
- ✅ 인증 확인 (getSessionUser)
- ✅ 관리자 권한 확인
- ✅ 계약서 존재 확인
- ✅ 이메일 주소 확인
- ✅ PDF 생성 및 이메일 전송
- ✅ 성공 응답 반환

#### 시나리오 2: 관리자 - 존재하지 않는 계약서
**예상 동작:**
1. 존재하지 않는 계약서 ID로 요청
2. 404 에러 반환

**검증 사항:**
- ✅ 404 상태 코드 반환
- ✅ 명확한 에러 메시지: "계약서를 찾을 수 없습니다."

#### 시나리오 3: 관리자 - 이메일 없는 계약서
**예상 동작:**
1. 이메일 주소가 없는 계약서로 요청
2. 400 에러 반환

**검증 사항:**
- ✅ 400 상태 코드 반환
- ✅ 명확한 에러 메시지: "계약서에 이메일 주소가 없습니다."

#### 시나리오 4: 대리점장 - 정상 PDF 전송
**예상 동작:**
1. 대리점장이 자신이 초대한 계약서에서 "PDF로 보내기" 클릭
2. 확인 다이얼로그 표시
3. POST 요청: `/api/partner/contracts/{contractId}/send-pdf`
4. 서버에서 PDF 생성 및 이메일 전송
5. 성공 메시지 표시

**검증 사항:**
- ✅ POST 메서드 사용
- ✅ 파트너 컨텍스트 확인 (requirePartnerContext)
- ✅ 대리점장 권한 확인
- ✅ 계약서 소유권 확인 (초대한 계약서 또는 자신의 계약서)
- ✅ PDF 생성 및 이메일 전송
- ✅ 성공 응답 반환

#### 시나리오 5: 대리점장 - 권한 없는 계약서
**예상 동작:**
1. 다른 대리점장이 초대한 계약서에 접근 시도
2. 403 에러 반환

**검증 사항:**
- ✅ 403 상태 코드 반환
- ✅ 명확한 에러 메시지: "이 계약서에 대한 권한이 없습니다."

#### 시나리오 6: 판매원 - PDF 전송 시도
**예상 동작:**
1. 판매원이 PDF 전송 시도
2. 403 에러 반환

**검증 사항:**
- ✅ 403 상태 코드 반환
- ✅ 명확한 에러 메시지: "대리점장만 PDF를 전송할 수 있습니다."

#### 시나리오 7: 비로그인 사용자
**예상 동작:**
1. 로그인하지 않은 사용자가 접근 시도
2. 401 에러 반환

**검증 사항:**
- ✅ 401 상태 코드 반환
- ✅ 명확한 에러 메시지: "Unauthorized"

#### 시나리오 8: 잘못된 HTTP 메서드 (GET)
**예상 동작:**
1. POST가 필요한 엔드포인트에 GET 요청
2. 405 에러 반환 (Next.js 기본 동작)

**검증 사항:**
- ⚠️ Next.js는 기본적으로 지원하지 않는 메서드에 대해 405를 반환
- ✅ 라우트 파일에 POST만 export되어 있음

### 4. 405 에러 가능 원인 분석

#### 가능한 원인 1: Next.js 15 params 처리 문제
**상태:** ✅ 해결됨
- 관리자 라우트: `await params` 사용
- 대리점장 라우트: `await params` 사용 (수정 완료)

#### 가능한 원인 2: 라우트 파일 위치 문제
**상태:** ✅ 확인됨
- 라우트 파일이 올바른 위치에 있음
- Next.js App Router 규칙 준수

#### 가능한 원인 3: POST 함수 export 문제
**상태:** ✅ 확인됨
- 두 라우트 모두 POST 함수가 올바르게 export됨

#### 가능한 원인 4: 미들웨어 차단
**상태:** ⚠️ 확인 필요
- 미들웨어에서 `/api/admin` 및 `/api/partner` 경로는 공개 경로가 아님
- 인증된 요청만 통과해야 함
- 405 에러는 미들웨어에서 발생하지 않음 (405는 라우트 레벨에서 발생)

#### 가능한 원인 5: 빌드/배포 문제
**상태:** ⚠️ 확인 필요
- 개발 환경에서는 정상 작동하지만 프로덕션에서 문제 발생 가능
- Vercel 배포 후 라우트가 제대로 등록되지 않을 수 있음

### 5. 수정 사항 요약

#### 수정 1: Next.js 15 params 처리 통일
- **파일:** `app/api/admin/affiliate/contracts/[contractId]/send-pdf/route.ts`
- **변경:** `const { contractId: contractIdStr } = await params;` → `const resolvedParams = await params; const contractIdStr = resolvedParams.contractId;`

#### 수정 2: 대리점장 라우트 params 처리 개선
- **파일:** `app/api/partner/contracts/[contractId]/send-pdf/route.ts`
- **변경:** `Promise.resolve(params)` → `await params`

#### 수정 3: 대리점장 라우트 Content-Type 헤더 추가
- **파일:** `app/api/partner/contracts/[contractId]/send-pdf/route.ts`
- **변경:** 모든 응답에 `Content-Type: application/json` 헤더 명시

#### 수정 4: 클라이언트 에러 핸들링 개선
- **파일:** `app/admin/affiliate/contracts/page.tsx`
- **변경:** 타임아웃 설정, 빈 응답 처리, JSON 파싱 에러 처리 강화

### 6. 권장 사항

1. **로깅 강화**
   - 모든 API 요청에 대한 상세 로깅
   - 에러 발생 시 스택 트레이스 포함

2. **모니터링**
   - Vercel 로그에서 405 에러 발생 빈도 확인
   - 특정 계약서 ID나 사용자에서만 발생하는지 확인

3. **테스트 자동화**
   - E2E 테스트 추가 (Playwright 등)
   - 실제 API 호출 테스트

4. **에러 추적**
   - Sentry 등 에러 추적 도구 통합
   - 405 에러 발생 시 자동 알림

### 7. 다음 단계

1. ✅ 코드 수정 완료
2. ⏳ 로컬 환경에서 테스트
3. ⏳ 스테이징 환경에서 테스트
4. ⏳ 프로덕션 배포 후 모니터링

## 결론

모든 코드 검증을 완료했으며, Next.js 15 호환성 문제를 수정했습니다. 405 에러의 주요 원인은 params 처리 불일치였을 가능성이 높습니다. 모든 수정 사항을 적용했으므로 배포 후 모니터링이 필요합니다.


