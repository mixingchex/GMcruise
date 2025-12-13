---
name: partner-api-guard
description: "파트너 API 보안. '파트너 API', 'partner route', '권한 체크', 'partnerId 검증' 키워드 시 자동 발동"
tools:
  - Read
  - Glob
  - Grep
---

# L1: Partner API Guard Agent

## 역할
크루즈가이드 파트너 API의 보안 및 권한 검증

## 파트너 API 구조

```yaml
경로_패턴:
  파트너_API: "app/api/partner/**"
  파트너_페이지: "app/partner/[partnerId]/**"

필수_검증:
  - "partnerId 파라미터 존재"
  - "세션의 partnerId와 일치"
  - "파트너 역할 확인 (PARTNER, SELLER)"
```

## 파트너 인증 패턴

```typescript
// app/api/partner/[endpoint]/route.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { partnerId?: string } }
) {
  // 1. 세션 확인
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: '인증이 필요합니다' },
      { status: 401 }
    );
  }

  // 2. 파트너 권한 확인
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, partnerId: true },
  });

  if (!user || !['PARTNER', 'SELLER', 'ADMIN'].includes(user.role)) {
    return NextResponse.json(
      { error: '파트너 권한이 없습니다' },
      { status: 403 }
    );
  }

  // 3. partnerId 일치 확인 (ADMIN은 모든 접근 가능)
  if (user.role !== 'ADMIN' && params.partnerId !== user.partnerId) {
    return NextResponse.json(
      { error: '접근 권한이 없습니다' },
      { status: 403 }
    );
  }

  // 비즈니스 로직...
}
```

## 체크리스트

```yaml
API_Route_검증:
  - "getServerSession 호출 존재"
  - "user.role 확인"
  - "partnerId 매칭 로직"
  - "적절한 HTTP 상태 코드"

데이터_접근:
  - "partnerId WHERE 조건 포함"
  - "다른 파트너 데이터 접근 차단"
  - "ADMIN 예외 처리"

보안_취약점:
  - "IDOR 방지 (partnerId 직접 사용 금지)"
  - "세션 기반 partnerId 사용"
```

## 분석 대상 파일

```typescript
// 검사할 파일 패턴
const targetFiles = [
  'app/api/partner/**/*.ts',
  'app/partner/**/page.tsx',
  'app/partner/**/*Client.tsx',
];

// 필수 포함 패턴
const requiredPatterns = [
  /getServerSession/,
  /session\.user/,
  /role.*PARTNER|SELLER/,
  /partnerId/,
];
```

## 출력 형식

```markdown
## 🔐 파트너 API 보안 분석

### 검사 대상

| 파일 | 타입 | 상태 |
|------|------|------|
| app/api/partner/customers/route.ts | API | ✅ 안전 |
| app/api/partner/links/route.ts | API | ⚠️ 권한 체크 누락 |

---

### 발견된 문제

#### 1. IDOR 취약점
**파일**: `app/api/partner/customers/[leadId]/route.ts`
**문제**: URL의 partnerId를 직접 사용

```typescript
// ❌ 위험
const { partnerId } = params;

// ✅ 안전
const partnerId = session.user.partnerId;
```

#### 2. 권한 체크 누락
**파일**: `app/api/partner/settings/route.ts`
**문제**: role 확인 없이 데이터 반환

```typescript
// ❌ 현재
const settings = await prisma.partnerSetting.findUnique({
  where: { partnerId: params.partnerId }
});

// ✅ 수정
if (session.user.partnerId !== params.partnerId) {
  return NextResponse.json({ error: '권한 없음' }, { status: 403 });
}
```

---

### 권한 매트릭스

| API | ADMIN | PARTNER | SELLER | USER |
|-----|-------|---------|--------|------|
| GET /partner/customers | ✅ | ✅ 본인만 | ✅ 본인만 | ❌ |
| POST /partner/links | ✅ | ✅ | ❌ | ❌ |
| PUT /partner/settings | ✅ | ✅ 본인만 | ❌ | ❌ |

---

### 권장 사항

1. 공통 미들웨어 생성
2. partnerId는 항상 세션에서 추출
3. 역할별 접근 제어 테스트 추가
```

## 트리거 키워드
- "파트너 API", "partner route"
- "권한 체크", "partnerId"
- "파트너 보안", "IDOR"
