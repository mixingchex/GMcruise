# Layer Separation Guide

## 레이어 아키텍처 개요

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │  UI, 페이지, 컴포넌트
│    (pages, components, views, hooks)    │  
├─────────────────────────────────────────┤
│             Business Layer              │  비즈니스 로직, 유스케이스
│     (services, usecases, domain)        │
├─────────────────────────────────────────┤
│               Data Layer                │  데이터 접근, API
│  (repositories, api, database, cache)   │
├─────────────────────────────────────────┤
│              Shared Layer               │  공통 유틸리티
│    (utils, types, constants, config)    │
└─────────────────────────────────────────┘
```

## 각 레이어별 상세 규칙

### 1. Presentation Layer

```yaml
책임:
  - 사용자 인터페이스 렌더링
  - 사용자 입력 처리
  - 상태 관리 (UI 상태만)
  - 라우팅
  
포함_항목:
  pages/: "라우팅 진입점"
  components/: "재사용 가능한 UI"
  hooks/: "UI 로직 추상화"
  layouts/: "페이지 레이아웃"
  
금지_사항:
  - ❌ 직접 fetch/axios 호출
  - ❌ 비즈니스 로직 (검증, 계산)
  - ❌ 데이터 변환 로직
  - ❌ 직접 DB 접근

코드_예시:
  Good: |
    // ✅ UI만 담당, 로직은 서비스에 위임
    function OrderPage() {
      const { data, isLoading } = useOrder(orderId);
      
      if (isLoading) return <Skeleton />;
      return <OrderDetails order={data} />;
    }
    
  Bad: |
    // ❌ UI에서 비즈니스 로직 처리
    function OrderPage() {
      const [order, setOrder] = useState();
      
      useEffect(() => {
        fetch('/api/orders/' + orderId)
          .then(res => res.json())
          .then(data => {
            // 비즈니스 로직이 UI에 있음!
            const total = data.items.reduce((sum, item) => 
              sum + item.price * item.quantity * (1 - item.discount), 0
            );
            setOrder({ ...data, total });
          });
      }, [orderId]);
    }
```

### 2. Business Layer

```yaml
책임:
  - 비즈니스 규칙 구현
  - 데이터 검증
  - 복잡한 계산/변환
  - 여러 데이터 소스 조합
  
포함_항목:
  services/: "비즈니스 서비스"
  usecases/: "유스케이스 (선택적)"
  domain/: "도메인 모델"
  validators/: "검증 로직"
  
금지_사항:
  - ❌ UI 컴포넌트 import
  - ❌ 직접 HTTP 요청
  - ❌ 직접 DB 쿼리
  - ❌ 프레임워크 종속 코드

코드_예시:
  Good: |
    // ✅ 순수한 비즈니스 로직
    class OrderService {
      constructor(
        private orderRepo: OrderRepository,
        private inventoryRepo: InventoryRepository
      ) {}
      
      async createOrder(items: OrderItem[]): Promise<Order> {
        // 비즈니스 검증
        await this.validateStock(items);
        
        // 비즈니스 계산
        const total = this.calculateTotal(items);
        const discount = this.applyDiscountRules(items, total);
        
        // 데이터 레이어에 위임
        return this.orderRepo.create({
          items,
          total: total - discount,
          status: 'pending'
        });
      }
      
      private calculateTotal(items: OrderItem[]): number {
        return items.reduce((sum, item) => 
          sum + item.price * item.quantity, 0
        );
      }
    }
```

### 3. Data Layer

```yaml
책임:
  - 데이터 저장/조회
  - 외부 API 통신
  - 캐싱
  - 데이터 매핑 (외부 → 내부 형식)
  
포함_항목:
  repositories/: "데이터 저장소 추상화"
  api/: "API 클라이언트"
  database/: "DB 연결/쿼리"
  cache/: "캐시 관리"
  mappers/: "데이터 변환"
  
금지_사항:
  - ❌ 비즈니스 로직 포함
  - ❌ UI 컴포넌트 import
  - ❌ 도메인 규칙 구현

코드_예시:
  Good: |
    // ✅ 데이터 접근만 담당
    class OrderRepository {
      async findById(id: string): Promise<Order | null> {
        const response = await this.api.get(`/orders/${id}`);
        return this.mapper.toDomain(response.data);
      }
      
      async create(order: CreateOrderDTO): Promise<Order> {
        const response = await this.api.post('/orders', order);
        return this.mapper.toDomain(response.data);
      }
    }
    
    // API 응답 → 도메인 모델 변환
    class OrderMapper {
      toDomain(raw: ApiOrder): Order {
        return {
          id: raw.order_id,
          items: raw.line_items.map(this.mapItem),
          total: raw.total_amount,
          status: raw.order_status,
          createdAt: new Date(raw.created_at),
        };
      }
    }
```

### 4. Shared Layer

```yaml
책임:
  - 공통 유틸리티 함수
  - 타입 정의
  - 상수 정의
  - 공통 UI 컴포넌트 (의존성 없는)
  
포함_항목:
  utils/: "헬퍼 함수"
  types/: "공통 타입"
  constants/: "상수"
  components/ui/: "기본 UI (Button, Input)"
  
규칙:
  - ✅ 다른 레이어에서 import 가능
  - ✅ 의존성 최소화
  - ❌ 다른 feature import 금지
  - ❌ 비즈니스 로직 포함 금지

코드_예시:
  utils/format.ts: |
    // ✅ 순수 유틸리티 - 어디서든 사용 가능
    export function formatCurrency(amount: number, currency = 'KRW'): string {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency,
      }).format(amount);
    }
    
    export function formatDate(date: Date, format = 'YYYY-MM-DD'): string {
      // ...
    }
```

## 레이어 간 통신 규칙

```yaml
허용된_의존_방향:
  Presentation:
    - → Business (서비스 호출)
    - → Shared (유틸리티 사용)
    
  Business:
    - → Data (저장소 호출)
    - → Shared (유틸리티 사용)
    
  Data:
    - → Shared (유틸리티 사용)
    
  Shared:
    - → 없음 (최하위 레이어)

금지된_의존_방향:
  - ❌ Data → Business (역방향)
  - ❌ Business → Presentation (역방향)
  - ❌ Shared → 모든 레이어 (역방향)
  - ❌ 순환 참조 (A → B → A)
```

## 폴더 구조 예시

```
src/
├── app/                      # Presentation (Next.js)
│   ├── (routes)/
│   └── layout.tsx
│
├── features/                 # Feature 단위로 레이어 포함
│   └── orders/
│       ├── components/       # Presentation
│       ├── hooks/           # Presentation
│       ├── services/        # Business
│       ├── repositories/    # Data
│       ├── types/           # 이 feature 전용 타입
│       └── index.ts
│
├── shared/                   # Shared Layer
│   ├── components/
│   │   └── ui/
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   └── constants/
│
└── services/                 # 전역 Data Layer
    ├── api/
    ├── database/
    └── cache/
```
