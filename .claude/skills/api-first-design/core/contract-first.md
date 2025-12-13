# Contract-First Workflow

## 개념

**Contract-First**: API 구현 전에 OpenAPI 스펙을 먼저 정의하고, 이를 기반으로 코드 생성

```
┌─────────────────────────────────────────────────────────────────┐
│                    Contract-First Workflow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. OpenAPI Spec 정의 (YAML/JSON)                              │
│          ↓                                                      │
│   2. 스펙 리뷰 (Frontend + Backend 합의)                        │
│          ↓                                                      │
│   3. Type 자동 생성 (swagger-typescript-api)                    │
│          ↓                                                      │
│   4. Backend: NestJS Controller/DTO 구현                        │
│          ↓                                                      │
│   5. Frontend: 생성된 타입으로 API Client 구현                  │
│          ↓                                                      │
│   6. Swagger UI로 API 문서화 자동 완성                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 장점

| 장점 | 설명 |
|------|------|
| **동기화** | Frontend/Backend 간 타입 불일치 제거 |
| **병렬 개발** | 스펙 합의 후 FE/BE 동시 개발 가능 |
| **문서화** | 코드와 문서가 항상 일치 |
| **테스트** | 스펙 기반 자동 테스트 생성 가능 |
| **타입 안전성** | End-to-End 타입 보장 |

## 디렉토리 구조

```
packages/
└── shared/
    └── api/
        ├── openapi/
        │   ├── openapi.yaml          # 메인 OpenAPI 스펙
        │   ├── paths/                # 경로별 스펙 분할
        │   │   ├── auth.yaml
        │   │   ├── users.yaml
        │   │   └── products.yaml
        │   ├── components/           # 재사용 컴포넌트
        │   │   ├── schemas.yaml
        │   │   ├── responses.yaml
        │   │   ├── parameters.yaml
        │   │   └── security.yaml
        │   └── examples/             # 요청/응답 예시
        │       └── user-examples.yaml
        ├── generated/                # 자동 생성된 타입
        │   ├── api.ts                # API Client
        │   ├── types.ts              # TypeScript 타입
        │   └── index.ts
        └── scripts/
            └── generate-types.ts     # 타입 생성 스크립트
```

## API Versioning

### URL Path Versioning (권장)

```typescript
// /api/v1/users
// /api/v2/users

// main.ts
app.setGlobalPrefix('api/v1');

// 또는 Controller 레벨에서
@Controller({ path: 'users', version: '1' })
export class UsersControllerV1 {}

@Controller({ path: 'users', version: '2' })
export class UsersControllerV2 {}
```

### Versioning 설정

```typescript
// main.ts
import { VersioningType } from '@nestjs/common';

app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
  prefix: 'api/v',
});
```

### 버전 전환 가이드라인

```yaml
Breaking_Changes:
  - 필드 삭제 또는 이름 변경
  - 필수 필드 추가
  - 응답 구조 변경
  - 인증 방식 변경
  - 에러 코드 체계 변경

Non_Breaking_Changes:
  - 선택적 필드 추가
  - 새 엔드포인트 추가
  - 에러 메시지 개선
  - 성능 개선

Version_Support:
  - 현재 버전 (v2): Full support
  - 이전 버전 (v1): Maintenance (12개월)
  - 그 이전: Deprecated (6개월 후 제거)

Deprecation_Headers:
  Deprecation: "true"
  Sunset: "2025-06-01T00:00:00Z"
  Link: "<https://api.example.com/v2/users>; rel=\"successor-version\""
```
