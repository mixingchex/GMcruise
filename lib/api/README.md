# 공통 API 레이어 사용 가이드

## 📋 개요

공통 API 레이어는 다음 기능을 제공합니다:
- 인증/권한 체크 미들웨어
- 통일된 응답 형식
- 에러 처리
- 캐싱 레이어

---

## 🚀 사용 예시

### 1. 기본 인증이 필요한 API

```typescript
// app/api/example/route.ts
import { withAuth, successResponse, errorResponse } from '@/lib/api';

export const GET = withAuth(async (req, user) => {
  // user는 자동으로 인증된 사용자 정보
  return successResponse({
    message: `안녕하세요, ${user.name}님!`,
    userId: user.id,
  });
});
```

### 2. 관리자 권한이 필요한 API

```typescript
// app/api/admin/example/route.ts
import { withAdmin, successResponse } from '@/lib/api';

export const GET = withAdmin(async (req, user) => {
  // user는 관리자로 확인됨
  return successResponse({
    adminData: '관리자 전용 데이터',
  });
});
```

### 3. 파트너 권한이 필요한 API

```typescript
// app/api/partner/example/route.ts
import { withPartner, successResponse } from '@/lib/api';

export const GET = withPartner(async (req, user, profile) => {
  // user: 사용자 정보
  // profile: 파트너 프로필 정보
  return successResponse({
    partnerData: '파트너 전용 데이터',
    profileId: profile.id,
  });
});
```

### 4. 캐싱이 적용된 API

```typescript
// app/api/dashboard/route.ts
import { withAuth, successResponse, withCache, createCacheKey } from '@/lib/api';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (req, user) => {
  const cacheKey = createCacheKey('dashboard', { userId: user.id });
  
  const data = await withCache(
    cacheKey,
    async () => {
      // 무거운 쿼리
      const stats = await prisma.user.count();
      return { stats };
    },
    { ttl: 300 } // 5분 캐시
  );
  
  return successResponse(data);
});
```

### 5. 페이지네이션 응답

```typescript
// app/api/users/route.ts
import { withAuth, paginatedResponse, parseQuery } from '@/lib/api';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (req, user) => {
  const params = parseQuery(req);
  const page = parseInt(params.get('page') || '1');
  const limit = parseInt(params.get('limit') || '20');
  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({ skip, take: limit }),
    prisma.user.count(),
  ]);
  
  return paginatedResponse(users, page, limit, total);
});
```

### 6. 에러 처리

```typescript
// app/api/example/route.ts
import { withAuth, successResponse, errorResponse } from '@/lib/api';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (req, user) => {
  try {
    const data = await prisma.user.findUnique({
      where: { id: user.id },
    });
    
    if (!data) {
      return errorResponse('데이터를 찾을 수 없습니다.', 404);
    }
    
    return successResponse(data);
  } catch (error) {
    // 에러는 자동으로 처리됨
    throw error;
  }
});
```

---

## 📚 API 레퍼런스

### 미들웨어

#### `withAuth(handler, options?)`
- **설명**: 기본 인증 미들웨어
- **옵션**:
  - `required`: 인증 필수 여부 (기본값: true)
  - `roles`: 허용된 역할 목록

#### `withAdmin(handler)`
- **설명**: 관리자 권한 미들웨어
- **자동 체크**: role === 'admin'

#### `withPartner(handler)`
- **설명**: 파트너 권한 미들웨어
- **추가 정보**: 파트너 프로필 정보도 함께 전달

### 응답 함수

#### `successResponse(data, meta?)`
- **설명**: 성공 응답 생성
- **반환 형식**: `{ ok: true, data, meta, timestamp }`

#### `errorResponse(message, status?, details?)`
- **설명**: 에러 응답 생성
- **반환 형식**: `{ ok: false, error, details, timestamp }`

#### `paginatedResponse(data, page, limit, total, extraMeta?)`
- **설명**: 페이지네이션 응답 생성
- **자동 포함**: page, limit, total, totalPages

### 캐싱 함수

#### `withCache(key, fetcher, options?)`
- **설명**: 캐시와 함께 데이터 가져오기
- **옵션**:
  - `ttl`: 캐시 유지 시간 (초, 기본값: 300)

#### `createCacheKey(prefix, params)`
- **설명**: 캐시 키 생성

#### `invalidateCache(key)`
- **설명**: 캐시 무효화

---

## 🔄 마이그레이션 가이드

### 기존 API를 새 레이어로 마이그레이션

**Before**:
```typescript
export async function GET(req: Request) {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  
  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { User: { select: { role: true } } },
  });
  
  if (!session || session.User.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  
  // ... 로직
  return NextResponse.json({ ok: true, data: result });
}
```

**After**:
```typescript
import { withAdmin, successResponse } from '@/lib/api';

export const GET = withAdmin(async (req, user) => {
  // ... 로직
  return successResponse(result);
});
```

---

## ✅ 장점

1. **코드 중복 제거**: 인증/권한 체크 로직 재사용
2. **일관된 응답 형식**: 모든 API가 동일한 형식으로 응답
3. **에러 처리 자동화**: 에러 발생 시 자동으로 적절한 응답 반환
4. **캐싱 지원**: 성능 향상을 위한 캐싱 기능 내장
5. **타입 안정성**: TypeScript로 타입 안정성 보장

---

**작성일**: 2025-11-23










