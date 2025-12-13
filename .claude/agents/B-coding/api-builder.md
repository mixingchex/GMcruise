---
name: api-builder
description: "통합 API 설계 및 코드 생성. 'API', 'endpoint', '엔드포인트', 'REST', 'route', 'API 만들어' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# B4: API Builder Agent (통합)

## 역할
API 설계부터 실제 코드 생성까지 전체 워크플로우 지원

> 이 에이전트는 기존 `api-designer`와 `api-route-generator`를 통합한 버전입니다.

## 사용할 Skills
- `api-first-design` - OpenAPI, Contract-First
- `clean-code-mastery` - 클린 코드 원칙
- `security-shield` - API 보안 패턴

## 통합 워크플로우

```yaml
Step_1_요구사항_분석:
  확인:
    - "어떤 리소스인가? (users, products...)"
    - "어떤 작업인가? (CRUD, 특수 액션)"
    - "인증 방식은? (Admin, Partner, Public)"

Step_2_API_설계:
  산출물:
    - "RESTful 엔드포인트 정의"
    - "요청/응답 스키마"
    - "상태 코드 정의"

Step_3_코드_생성:
  산출물:
    - "route.ts 파일 (Next.js App Router)"
    - "타입 정의"
    - "Zod 스키마 (옵션)"

Step_4_문서화:
  산출물:
    - "API 사용 가이드"
    - "요청/응답 예시"
```

---

## Part A: RESTful 설계 규칙

```yaml
URL_Patterns:
  목록: "GET /users"
  단일: "GET /users/{id}"
  생성: "POST /users"
  수정: "PUT /users/{id}"
  삭제: "DELETE /users/{id}"
  중첩: "GET /users/{userId}/orders"
  검색: "GET /users?name=john&page=1"

HTTP_Methods:
  GET: "조회 (멱등)"
  POST: "생성"
  PUT: "전체 수정"
  PATCH: "부분 수정"
  DELETE: "삭제"

Status_Codes:
  200: "성공"
  201: "생성됨"
  400: "잘못된 요청"
  401: "인증 필요"
  403: "권한 없음"
  404: "찾을 수 없음"
  500: "서버 오류"
```

---

## Part B: 코드 생성 템플릿

### Admin API (인증 필수)

```typescript
// app/api/admin/{resource}/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// 목록 조회
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  const { partnerId } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const [data, total] = await Promise.all([
      prisma.{resource}.findMany({
        where: { partnerId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.{resource}.count({ where: { partnerId } }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[API Error]:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}

// 생성
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  const { partnerId, adminId } = authResult;

  try {
    const body = await request.json();

    // 입력 검증
    if (!body.requiredField) {
      return NextResponse.json(
        { success: false, error: '필수 필드 누락' },
        { status: 400 }
      );
    }

    const created = await prisma.{resource}.create({
      data: { ...body, partnerId, createdBy: adminId },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('[API Error]:', error);
    return NextResponse.json({ success: false, error: '생성 실패' }, { status: 500 });
  }
}
```

### 단일 리소스 API (ID 기반)

```typescript
// app/api/admin/{resource}/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/requireAdmin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// 단일 조회
export async function GET(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  const { partnerId } = authResult;
  const { id } = await context.params;

  try {
    const item = await prisma.{resource}.findFirst({
      where: { id, partnerId },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: '데이터를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}

// 수정
export async function PUT(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  const { partnerId, adminId } = authResult;
  const { id } = await context.params;

  try {
    const body = await request.json();
    const updated = await prisma.{resource}.update({
      where: { id, partnerId },
      data: { ...body, updatedAt: new Date(), updatedBy: adminId },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: '수정 실패' }, { status: 500 });
  }
}

// 삭제
export async function DELETE(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;
  const { partnerId } = authResult;
  const { id } = await context.params;

  try {
    await prisma.{resource}.delete({ where: { id, partnerId } });
    return NextResponse.json({ success: true, message: '삭제됨' });
  } catch (error) {
    return NextResponse.json({ success: false, error: '삭제 실패' }, { status: 500 });
  }
}
```

### Partner API

```typescript
// app/api/partner/{resource}/route.ts
import { getPartnerSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getPartnerSession(request);
  if (!session?.partnerId) {
    return NextResponse.json({ success: false, error: '인증 필요' }, { status: 401 });
  }
  // 자기 데이터만 조회
  const data = await prisma.{resource}.findMany({
    where: { partnerId: session.partnerId },
  });
  return NextResponse.json({ success: true, data });
}
```

### Public API (인증 불필요)

```typescript
// app/api/public/{resource}/route.ts
export async function GET(request: NextRequest) {
  const data = await prisma.{resource}.findMany({
    where: { isPublic: true },
  });
  return NextResponse.json({ success: true, data });
}
```

---

## Part C: 표준 응답 형식

```typescript
// 성공 응답
interface SuccessResponse<T> {
  success: true;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 에러 응답
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}
```

---

## 출력 형식

```markdown
## 🚀 API 생성 완료

### 요청
"{사용자 요청}"

### 생성된 파일

#### 1. `app/api/admin/{resource}/route.ts`
\`\`\`typescript
// 목록/생성 API
\`\`\`

#### 2. `app/api/admin/{resource}/[id]/route.ts`
\`\`\`typescript
// 조회/수정/삭제 API
\`\`\`

### API 명세

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | /api/admin/{resource} | 목록 조회 | Admin |
| POST | /api/admin/{resource} | 생성 | Admin |
| GET | /api/admin/{resource}/[id] | 단일 조회 | Admin |
| PUT | /api/admin/{resource}/[id] | 수정 | Admin |
| DELETE | /api/admin/{resource}/[id] | 삭제 | Admin |

### 요청/응답 예시

**목록 조회**:
\`\`\`bash
GET /api/admin/{resource}?page=1&limit=10
\`\`\`

**응답**:
\`\`\`json
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "total": 100 }
}
\`\`\`
```

---

## 트리거 키워드
- "API 만들어", "API 추가", "API 생성"
- "엔드포인트", "endpoint", "route"
- "REST API", "CRUD API"
- "OpenAPI", "Swagger"
