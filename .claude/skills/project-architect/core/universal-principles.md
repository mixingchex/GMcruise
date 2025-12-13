# Universal Architecture Principles

## 1. 관심사 분리 (Separation of Concerns)

```yaml
원칙: "하나의 모듈은 하나의 책임만"

적용_방법:
  UI_Layer:
    책임: "화면 렌더링, 사용자 입력 처리"
    금지: "API 호출, DB 접근, 비즈니스 로직"
    
  Business_Layer:
    책임: "비즈니스 규칙, 데이터 변환"
    금지: "UI 관심사, 직접 DB 접근"
    
  Data_Layer:
    책임: "데이터 저장/조회, 외부 API 통신"
    금지: "비즈니스 규칙, UI 로직"

검증_질문:
  - "이 파일을 수정하면 다른 레이어에 영향이 가는가?"
  - "이 모듈의 책임을 한 문장으로 설명할 수 있는가?"
  - "이 코드를 다른 프로젝트에 복사해도 작동하는가?"
```

## 2. 의존성 방향 규칙 (Dependency Rule)

```yaml
원칙: "의존성은 항상 안쪽(추상)을 향해야 한다"

의존성_방향:
  허용:
    - UI → Business → Data
    - Feature → Shared
    - 구체적 → 추상적
    
  금지:
    - Data → Business (역방향)
    - Shared → Feature (역방향)
    - 순환 참조 (A → B → A)

구현_방법:
  인터페이스_사용: |
    // ❌ Bad: Service가 구체적 Repository에 직접 의존
    class UserService {
      constructor(private repo: PostgresUserRepo) {}
    }
    
    // ✅ Good: 인터페이스에 의존
    interface UserRepository {
      findById(id: string): Promise<User>;
    }
    
    class UserService {
      constructor(private repo: UserRepository) {}
    }
```

## 3. 단일 진입점 원칙 (Single Entry Point)

```yaml
원칙: "모듈의 public API는 index.ts 하나로 관리"

장점:
  - 캡슐화: 내부 구현 숨김
  - 리팩토링 용이: 내부 변경이 외부에 영향 없음
  - 명확한 API: 무엇을 사용할 수 있는지 명확

구현:
  features/user/index.ts: |
    // 외부에 노출할 것만 export
    export { UserProfile } from './components/UserProfile';
    export { useUser } from './hooks/useUser';
    export { userService } from './services/userService';
    export type { User, UserRole } from './types';
    
    // 내부 구현은 export 하지 않음
    // - UserProfileSkeleton (내부 컴포넌트)
    // - validateUser (내부 유틸)
    // - userMapper (내부 변환 함수)

import_규칙:
  Good: "import { useUser } from '@/features/user'"
  Bad: "import { useUser } from '@/features/user/hooks/useUser'"
```

## 4. 설정 외부화 원칙 (Externalized Configuration)

```yaml
원칙: "환경에 따라 달라지는 값은 코드에 넣지 않는다"

외부화_대상:
  필수:
    - API 엔드포인트 URL
    - 데이터베이스 연결 정보
    - API 키, 시크릿
    - 기능 플래그
    
  권장:
    - 페이지네이션 기본값
    - 타임아웃 시간
    - 재시도 횟수
    - 로깅 레벨

구현_패턴:
  config/env.ts: |
    export const config = {
      api: {
        baseUrl: process.env.NEXT_PUBLIC_API_URL,
        timeout: Number(process.env.API_TIMEOUT) || 30000,
      },
      db: {
        url: process.env.DATABASE_URL,
      },
      features: {
        enableNewDashboard: process.env.FEATURE_NEW_DASHBOARD === 'true',
      },
    } as const;
    
    // 필수값 검증
    function validateConfig() {
      if (!config.api.baseUrl) {
        throw new Error('NEXT_PUBLIC_API_URL is required');
      }
    }
```

## 5. 실패 대비 설계 (Design for Failure)

```yaml
원칙: "모든 외부 연동은 실패할 수 있다고 가정"

대비_항목:
  API_호출:
    - 타임아웃 설정
    - 재시도 로직
    - 폴백 처리
    - 에러 로깅
    
  데이터베이스:
    - 연결 풀 관리
    - 트랜잭션 롤백
    - 데드락 방지
    
  외부_서비스:
    - 서킷 브레이커
    - 캐싱 (가능한 경우)
    - 그레이스풀 디그레이데이션

구현_예시: |
  async function fetchUserWithFallback(userId: string) {
    try {
      return await userApi.getUser(userId);
    } catch (error) {
      // 캐시에서 시도
      const cached = await cache.get(`user:${userId}`);
      if (cached) return cached;
      
      // 기본값 반환 (graceful degradation)
      return { id: userId, name: 'Unknown User' };
    }
  }
```

## 6. 테스트 가능한 설계 (Testable Design)

```yaml
원칙: "테스트하기 어려운 코드는 설계가 잘못된 것"

테스트_용이성_지표:
  Good:
    - 의존성 주입 사용
    - 순수 함수 많음
    - 작은 단위로 분리됨
    - 부작용이 명확히 분리됨
    
  Bad:
    - 전역 상태 의존
    - 하드코딩된 의존성
    - 거대한 함수/클래스
    - 숨겨진 부작용

개선_패턴:
  Before: |
    // ❌ 테스트 어려움 - 직접 API 호출
    async function processOrder(orderId: string) {
      const order = await fetch('/api/orders/' + orderId);
      // ...
    }
    
  After: |
    // ✅ 테스트 용이 - 의존성 주입
    async function processOrder(
      orderId: string,
      orderApi: OrderApi = defaultOrderApi
    ) {
      const order = await orderApi.getOrder(orderId);
      // ...
    }
    
    // 테스트에서
    const mockApi = { getOrder: jest.fn() };
    await processOrder('123', mockApi);
```
