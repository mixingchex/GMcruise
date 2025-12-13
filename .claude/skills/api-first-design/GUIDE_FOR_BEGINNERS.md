# API First Design - 비개발자를 위한 완전 가이드

> **문서 버전**: 1.0.0
> **대상 독자**: 비개발자, 스킬 구조를 이해하고 싶은 사람
> **목표**: API 설계 스킬이 왜 필요한지, 어떻게 작동하는지 완전히 이해하기

---

## 1. 왜 API First Design이 필요한가?

### 비유로 이해하기: "건물 설계도"

**API가 없는 개발 = 설계도 없이 집 짓기**
```
목수A: "거실은 어디에?"
목수B: "나도 몰라, 일단 벽 쌓아"
전기공: "콘센트 어디에 넣어요?"
목수A: "여기?"
목수B: "아니, 저기"

결과: 뒤죽박죽, 리모델링 비용 폭발
```

**API First = 설계도 먼저!**
```
건축가: "여기 설계도입니다"
모두: "아, 거실은 여기, 콘센트는 저기!"

백엔드: "이 API 스펙대로 만들게요"
프론트엔드: "저도 이 스펙대로 호출할게요"
앱개발: "저도요!"

결과: 모두가 같은 약속을 따름
```

### API란 무엇인가?

```
[ API = Application Programming Interface ]

비유: 레스토랑 메뉴판 + 주문 시스템

메뉴판 (API 스펙):
  - "햄버거 세트" → 가격, 구성품, 옵션
  - "피자" → 가격, 사이즈, 토핑 옵션

주문 (API 호출):
  - 손님: "햄버거 세트, 콜라 라지로요" (요청)
  - 점원: "네, 잠시만요" (처리)
  - 주방: 음식 준비
  - 점원: "주문하신 햄버거 세트입니다" (응답)

실제 코드에서:
  - 클라이언트: POST /orders { item: "햄버거", drink: "콜라" }
  - 서버: 주문 처리
  - 서버: { success: true, orderId: 123, estimatedTime: "15분" }
```

### Contract-First가 왜 중요한가?

```
[ Code-First의 문제 ]

백엔드가 먼저 만듦:
  POST /api/usr/new  ← 이상한 경로
  응답: { u_id: 1, uname: "John" }  ← 일관성 없는 네이밍

프론트엔드:
  "뭐야 이게? usr? uname?"
  "스펙 바꿔주세요"

백엔드:
  "이미 다 짰는데... 귀찮아"

결과: 불만, 버그, 시간 낭비

[ Contract-First의 해결 ]

먼저 합의:
  POST /api/v1/users
  응답: { id: 1, username: "John" }

모두 동의 후 → 각자 개발 → 완벽 호환!
```

---

## 2. 스킬의 핵심 역할

### 2.1 Contract-First Workflow

```
┌─────────────────────────────────────────────────────────────┐
│            Contract-First 개발 프로세스                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1️⃣  OpenAPI 스펙 정의                                    │
│       ↓ (API 설계도 작성)                                   │
│                                                             │
│   2️⃣  스펙 리뷰                                            │
│       ↓ (팀 전체가 검토 및 승인)                            │
│                                                             │
│   3️⃣  타입 자동 생성                                       │
│       ↓ (TypeScript, Python 등)                            │
│                                                             │
│   4️⃣  병렬 개발                                            │
│       ├─→ 백엔드: 스펙대로 구현                            │
│       ├─→ 프론트엔드: 스펙대로 호출                        │
│       └─→ 앱: 스펙대로 호출                                │
│                                                             │
│   5️⃣  통합 테스트                                          │
│       (모두 같은 약속을 따랐으므로 호환!)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 OpenAPI/Swagger란?

```yaml
# OpenAPI 스펙 예시 (openapi.yaml)

openapi: 3.0.0
info:
  title: 사용자 API
  version: 1.0.0

paths:
  /users:
    get:
      summary: 사용자 목록 조회
      responses:
        200:
          description: 성공
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'

    post:
      summary: 사용자 생성
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserDto'
      responses:
        201:
          description: 생성됨

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        username:
          type: string
        email:
          type: string
          format: email
```

**비유: 레고 설명서**
- 어떤 블록이 필요한지 (스키마)
- 어떤 순서로 조립하는지 (엔드포인트)
- 완성되면 어떤 모양인지 (응답)

### 2.3 표준 응답 포맷

```typescript
// ✅ 성공 응답
{
  success: true,
  data: {
    id: 1,
    username: "john"
  },
  meta: {
    page: 1,
    total: 100
  },
  timestamp: "2025-12-10T10:00:00Z"
}

// ❌ 에러 응답
{
  success: false,
  error: {
    code: "USER_NOT_FOUND",
    message: "사용자를 찾을 수 없습니다",
    details: {
      userId: 999
    }
  },
  timestamp: "2025-12-10T10:00:00Z"
}
```

**왜 표준 포맷이 중요한가?**
```
[ 표준 없을 때 ]

API A 응답: { result: true, user: {...} }
API B 응답: { status: "ok", payload: {...} }
API C 응답: { data: {...}, error: null }

프론트엔드: "매번 다르게 처리해야 해..."

[ 표준 있을 때 ]

모든 API 응답: { success, data/error, timestamp }

프론트엔드:
  if (response.success) {
    useData(response.data)
  } else {
    showError(response.error)
  }
```

### 2.4 에러 코드 체계

```yaml
에러_코드_패턴: "도메인_동작_이유"

예시:
  AUTH_TOKEN_EXPIRED: "인증 토큰 만료"
  USER_NOT_FOUND: "사용자 없음"
  VALIDATION_EMAIL_INVALID: "이메일 형식 불량"
  ORDER_ALREADY_CANCELLED: "이미 취소된 주문"
  PAYMENT_INSUFFICIENT_BALANCE: "잔액 부족"

HTTP_상태코드_매핑:
  400 Bad Request: "잘못된 요청 (클라이언트 실수)"
  401 Unauthorized: "인증 필요"
  403 Forbidden: "권한 없음"
  404 Not Found: "리소스 없음"
  409 Conflict: "충돌 (이미 존재 등)"
  422 Unprocessable: "검증 실패"
  500 Server Error: "서버 오류"
```

---

## 3. API 설계 원칙

### 3.1 RESTful 설계

```
[ REST = Representational State Transfer ]

비유: 도서관 시스템

자원(Resource) = 책
  - /books (책 컬렉션)
  - /books/123 (특정 책)
  - /books/123/reviews (특정 책의 리뷰)

동작(Method) = 무엇을 할지
  - GET: 조회 (책 읽기)
  - POST: 생성 (새 책 등록)
  - PUT: 전체 수정 (책 정보 전체 교체)
  - PATCH: 부분 수정 (가격만 수정)
  - DELETE: 삭제 (책 삭제)

예시:
  GET /books          → 전체 책 목록
  GET /books/123      → 123번 책 상세
  POST /books         → 새 책 등록
  PUT /books/123      → 123번 책 전체 수정
  PATCH /books/123    → 123번 책 일부 수정
  DELETE /books/123   → 123번 책 삭제
```

### 3.2 좋은 URL 설계

```yaml
좋은_예시:
  - GET /users              # 복수형
  - GET /users/123          # ID로 특정
  - GET /users/123/orders   # 관계 표현
  - POST /users             # 생성
  - PUT /users/123          # 수정

나쁜_예시:
  - GET /getUsers           # 동사 포함
  - GET /user               # 단수형
  - GET /getUserById?id=123 # 쿼리스트링 남용
  - POST /createUser        # 동사 포함
  - GET /users/delete/123   # GET으로 삭제

URL_작성_규칙:
  1. 명사 사용 (동사 X)
  2. 복수형 사용
  3. 소문자 + 케밥케이스
  4. 계층 관계는 / 로
  5. 필터/정렬/페이징은 쿼리스트링으로
     예: /users?role=admin&sort=createdAt&page=2
```

### 3.3 버저닝 전략

```
[ API 버전 관리 ]

왜 필요한가?
  - 기존 앱은 v1 사용 중
  - 새 기능은 응답 형식이 다름
  - v1 깨면 기존 앱 죽음

해결: 버전 공존
  /api/v1/users  ← 구버전 (유지)
  /api/v2/users  ← 신버전 (새 형식)

버전_정책:
  - 현재 버전: 완전 지원
  - 이전 버전: 12개월간 유지 후 삭제
  - 삭제 예고: 최소 6개월 전 공지
```

---

## 4. NestJS Swagger 데코레이터

### 4.1 Controller 데코레이터

```typescript
@Controller('users')
@ApiTags('Users')  // Swagger UI에서 그룹화
@ApiBearerAuth('access-token')  // JWT 인증 필요 표시
export class UsersController {

  @Get()
  @ApiOperation({
    summary: '사용자 목록 조회',
    description: '페이지네이션 지원, 역할별 필터 가능'
  })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    type: [UserResponseDto]
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  findAll() {}

  @Get(':id')
  @ApiOperation({ summary: '특정 사용자 조회' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: '사용자 없음' })
  findOne(@Param('id') id: string) {}
}
```

### 4.2 DTO 데코레이터

```typescript
export class CreateUserDto {
  @ApiProperty({
    description: '사용자 이름',
    example: 'john_doe',
    minLength: 3,
    maxLength: 20
  })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: '이메일 주소',
    example: 'john@example.com',
    format: 'email'
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: '프로필 이미지 URL',
    example: 'https://example.com/avatar.jpg'
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
```

**비유: 주문서 양식**
```
ApiProperty = 양식의 각 칸 설명
  - description: "이름을 적으세요"
  - example: "홍길동"
  - format: "한글 또는 영문"

IsEmail, MinLength = 양식 검증
  - 이메일 칸에 전화번호 쓰면 거부
  - 이름 2글자 미만이면 거부
```

---

## 5. 스킬 작동 방식

### 5.1 자동 발동 조건

```yaml
파일_패턴:
  - "*.controller.ts, *.controller.js"    # Controller 파일
  - "*.dto.ts, *.dto.js"                  # DTO 파일
  - "**/routes/**, **/api/**"             # 라우트 폴더
  - "openapi.yaml, swagger.yaml"          # 스펙 파일

한국어_키워드:
  - "API 만들어, API 설계"
  - "엔드포인트, 라우트"
  - "Swagger, OpenAPI"
  - "DTO, 스키마"
  - "CRUD"

코드_패턴:
  - "@Controller, @Get, @Post"
  - "@ApiOperation, @ApiResponse"
  - "router.get, router.post"
```

### 5.2 선택적 문서 로드

```
[ 로드 순서 ]

1단계: 프레임워크 감지
  - @Controller → NestJS
  - router.get → Express
  - @app.get → FastAPI

2단계: 항상 로드 (공통)
  - core/contract-first.md (Contract-First 원칙)
  - core/response-format.md (표준 응답)
  - core/error-codes.md (에러 코드 체계)

3단계: 프레임워크별 로드
  - NestJS → frameworks/nestjs-swagger.md
  - Express → frameworks/express-openapi.md
  - FastAPI → frameworks/fastapi-openapi.md

4단계: 상황별 로드
  - Controller 작업 → templates/controller-template.md
  - 타입 생성 → patterns/type-generation.md
```

---

## 6. API 개발 체크리스트

### 6.1 설계 단계

```markdown
## OpenAPI 스펙
- [ ] openapi.yaml 파일 생성?
- [ ] 모든 엔드포인트 정의?
- [ ] 요청/응답 스키마 정의?
- [ ] 에러 응답 정의?

## URL 설계
- [ ] 복수형 명사 사용?
- [ ] 소문자 + 케밥케이스?
- [ ] 버전 포함? (/api/v1/)
- [ ] RESTful 동사 사용? (GET/POST/PUT/DELETE)
```

### 6.2 구현 단계

```markdown
## Controller
- [ ] @ApiTags 그룹화?
- [ ] @ApiBearerAuth 인증 표시?
- [ ] 모든 메서드에 @ApiOperation?
- [ ] 모든 메서드에 @ApiResponse?

## DTO
- [ ] 모든 필드에 @ApiProperty?
- [ ] example 값 포함?
- [ ] 검증 데코레이터 (IsEmail, IsString 등)?

## 응답
- [ ] 표준 응답 포맷 사용?
- [ ] 에러 코드 체계 따름?
- [ ] timestamp 포함?
```

### 6.3 테스트 단계

```markdown
## Swagger UI
- [ ] /api-docs 에서 확인 가능?
- [ ] Try it out 기능 동작?
- [ ] 모든 엔드포인트 문서화?

## 클라이언트 타입
- [ ] swagger-typescript-api로 타입 생성?
- [ ] 생성된 타입 프론트엔드에서 사용?
```

---

## 7. 안티패턴 (하지 말아야 할 것)

### 7.1 URL 안티패턴

```yaml
안티패턴_1_동사_사용:
  나쁨: "GET /getUsers, POST /createUser"
  좋음: "GET /users, POST /users"
  이유: "HTTP 메서드가 이미 동사 역할"

안티패턴_2_단수형:
  나쁨: "GET /user/123"
  좋음: "GET /users/123"
  이유: "컬렉션을 다루므로 복수형이 자연스러움"

안티패턴_3_대문자_카멜케이스:
  나쁨: "GET /userProfile/getById"
  좋음: "GET /user-profiles/123"
  이유: "URL은 소문자 + 케밥케이스가 표준"

안티패턴_4_너무_깊은_중첩:
  나쁨: "GET /users/123/orders/456/items/789/reviews"
  좋음: "GET /reviews?itemId=789"
  이유: "3단계 이상 중첩은 복잡"
```

### 7.2 응답 안티패턴

```yaml
안티패턴_1_일관성_없는_응답:
  나쁨: |
    API A: { data: {...} }
    API B: { result: {...} }
    API C: { payload: {...} }
  좋음: |
    모든 API: { success, data, error, timestamp }

안티패턴_2_에러_정보_노출:
  나쁨: |
    { error: "SELECT * FROM users WHERE password='123' failed" }
  좋음: |
    { error: { code: "AUTH_FAILED", message: "인증 실패" } }
  이유: "SQL, 스택트레이스는 해커에게 힌트"

안티패턴_3_불명확한_에러:
  나쁨: |
    { error: "Error occurred" }
  좋음: |
    { error: { code: "USER_EMAIL_DUPLICATE", message: "이미 사용 중인 이메일" } }
```

---

## 8. 파일 구조

```
api-first-design/
├── SKILL.md                        # 메인 파일 (라우터)
├── GUIDE_FOR_BEGINNERS.md          # 이 문서
│
├── core/                           # 핵심 문서
│   ├── contract-first.md           # Contract-First 워크플로우
│   ├── response-format.md          # 표준 응답 포맷
│   └── error-codes.md              # 에러 코드 체계
│
├── frameworks/                     # 프레임워크별
│   ├── nestjs-swagger.md           # NestJS Swagger
│   ├── express-openapi.md          # Express OpenAPI
│   ├── fastapi-openapi.md          # FastAPI
│   └── spring-openapi.md           # Spring Boot
│
├── patterns/                       # 패턴
│   ├── swagger-decorators.md       # Swagger 데코레이터
│   └── type-generation.md          # 타입 자동 생성
│
├── templates/                      # 템플릿
│   ├── controller-template.md      # Controller 템플릿
│   └── openapi-yaml.md             # OpenAPI YAML 템플릿
│
└── quick-reference/                # 빠른 참조
    ├── checklist.md                # API 체크리스트
    └── anti-patterns.md            # 안티패턴 목록
```

---

## 9. 다른 스킬과의 관계

```
[ API First Design의 위치 ]

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌───────────────┐         ┌───────────────────┐          │
│   │ clean-code-   │ ←────── │ API First Design  │          │
│   │ mastery       │  참조   │                   │          │
│   │ (에러 처리)   │         │  ∙ Contract-First │          │
│   └───────────────┘         │  ∙ RESTful 설계   │          │
│                             │  ∙ Swagger 문서   │          │
│   ┌───────────────┐         └────────┬──────────┘          │
│   │ security-     │ ←────────────────┤                     │
│   │ shield        │  참조             │                     │
│   │ (인증/보안)   │                   │                     │
│   └───────────────┘                   │                     │
│                                       ▼                     │
│                             ┌───────────────┐              │
│                             │ code-reviewer │              │
│                             │ (API 품질 검증)│              │
│                             └───────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘

관계 설명:
- clean-code-mastery에서 에러 처리 기본 참조
- security-shield에서 인증/인가 패턴 참조
- code-reviewer가 API 설계 품질 점수 통합
```

---

## 10. 구조적 허점 및 개선점

### 10.1 현재 허점

```yaml
허점_1_GraphQL_미지원:
  문제: "REST에만 집중, GraphQL 가이드 없음"
  증거: "frameworks/ 에 GraphQL 문서 없음"
  영향: "GraphQL 프로젝트에서 활용 불가"
  개선안: "GraphQL, gRPC 스펙 문서 추가"

허점_2_실시간_API_미고려:
  문제: "WebSocket, SSE 가이드 없음"
  증거: "REST 엔드포인트만 다룸"
  영향: "채팅, 알림 등 실시간 기능에 적용 불가"
  개선안: "WebSocket API 설계 패턴 추가"

허점_3_버전_마이그레이션_가이드_부재:
  문제: "v1 → v2 마이그레이션 방법 없음"
  예시: "기존 API 깨지지 않게 버전업하는 법?"
  영향: "버전업 시 혼란"
  개선안: "버전 마이그레이션 가이드 추가"

허점_4_성능_최적화_미포함:
  문제: "API 성능 관련 내용 없음"
  예시: "페이지네이션, 캐싱, Rate Limiting"
  영향: "대용량 트래픽 대응 어려움"
  개선안: "성능 패턴 문서 추가"
```

### 10.2 개선 제안

```yaml
제안_1_API_Mocking_가이드:
  현재: "스펙 정의 후 바로 구현"
  제안: |
    스펙 정의 → Mock 서버 자동 생성
    프론트엔드가 백엔드 기다리지 않고 개발 가능
  장점: "병렬 개발 효율 극대화"

제안_2_API_변경_감지:
  현재: "수동으로 스펙 변경 확인"
  제안: |
    git diff로 openapi.yaml 변경 자동 감지
    Breaking Change 경고 알림
  장점: "호환성 깨짐 사전 방지"

제안_3_API_성능_메트릭:
  현재: "기능만 정의"
  제안: |
    예상 응답 시간, 처리량 등 성능 스펙 포함
    @ApiPerformance({ responseTime: '100ms', rps: 1000 })
  장점: "SLA 명확화"

제안_4_다국어_에러_메시지:
  현재: "단일 언어 에러 메시지"
  제안: |
    에러 코드별 다국어 메시지 매핑
    { code: "USER_NOT_FOUND", messages: { ko: "...", en: "..." } }
  장점: "글로벌 서비스 대응"
```

---

## 11. 핵심 용어 사전

| 용어 | 설명 | 비유 |
|------|------|------|
| **API** | 프로그램 간 통신 약속 | 메뉴판 + 주문 시스템 |
| **REST** | API 설계 아키텍처 스타일 | 도서관 대출 규칙 |
| **Endpoint** | API 접근 주소 | 창구 번호 |
| **Request** | 클라이언트 요청 | 주문서 |
| **Response** | 서버 응답 | 배달된 음식 |
| **OpenAPI** | API 스펙 표준 형식 | 설계도 양식 |
| **Swagger** | OpenAPI 도구 (문서화 UI) | 설계도 뷰어 |
| **DTO** | 데이터 전송 객체 | 택배 상자 |
| **Contract-First** | 스펙 먼저, 구현 나중 | 설계도 먼저, 공사 나중 |
| **Breaking Change** | 기존 코드 깨는 변경 | 메뉴판 바꾸기 (손님 혼란) |

---

## 12. 요약

```
┌────────────────────────────────────────────────────────────┐
│              API First Design 핵심 요약                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🎯 목적: 스펙 먼저, 구현 나중 - 팀 간 약속 명확화         │
│                                                            │
│  🔍 주요 기능:                                              │
│     1. Contract-First 워크플로우                           │
│     2. OpenAPI/Swagger 스펙 정의                           │
│     3. 표준 응답 포맷 강제                                 │
│     4. 타입 자동 생성                                      │
│                                                            │
│  📐 설계 원칙:                                              │
│     1. RESTful URL (복수형 명사, 소문자)                   │
│     2. HTTP 메서드 활용 (GET/POST/PUT/DELETE)             │
│     3. 버전 관리 (/api/v1/)                               │
│     4. 일관된 에러 코드 (DOMAIN_ACTION_REASON)            │
│                                                            │
│  🔗 연관 스킬: clean-code-mastery, security-shield         │
│                                                            │
│  ⚠️ 허점: GraphQL 미지원, 실시간 API 미고려                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

**문서 작성일**: 2025-12-10
**다음 업데이트 예정**: GraphQL, WebSocket 가이드 추가 시
