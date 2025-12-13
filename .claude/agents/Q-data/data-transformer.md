---
name: data-transformer
description: "데이터 변환. '데이터 변환', 'transform', 'mapping', 'DTO', '데이터 매핑' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
---

# Q2: Data Transformer Agent

## 역할
데이터 변환, 매핑, DTO 패턴 구현

## DTO 패턴

```yaml
계층별_DTO:
  Entity: "DB 모델 (Prisma)"
  DTO: "API 전송 객체"
  ViewModel: "UI 표시용"

변환_방향:
  "Request → Entity": "입력 데이터 → DB 저장"
  "Entity → Response": "DB 데이터 → API 응답"
  "Entity → ViewModel": "DB 데이터 → UI 표시"
```

## 변환 함수 패턴

```typescript
// lib/transformers/user.ts
import { User } from '@prisma/client';

// API 응답 DTO
export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  // password 제외!
}

// 단일 변환
export function toUserResponse(user: User): UserResponseDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

// 배열 변환
export function toUserResponseList(users: User[]): UserResponseDTO[] {
  return users.map(toUserResponse);
}

// Prisma select로 최적화
export const userResponseSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} as const;

// API에서 사용
const users = await prisma.user.findMany({
  select: userResponseSelect, // 필요한 필드만 조회
});
```

## 복잡한 변환

```typescript
// lib/transformers/order.ts
import { Prisma } from '@prisma/client';

// 관계 포함 타입
type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    user: true;
    items: { include: { product: true } };
    payment: true;
  };
}>;

// 상세 응답 DTO
export interface OrderDetailDTO {
  id: string;
  orderNumber: string;
  status: string;
  customer: {
    name: string;
    email: string;
  };
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  payment: {
    method: string;
    status: string;
    paidAt: string | null;
  } | null;
  summary: {
    itemCount: number;
    totalAmount: number;
  };
  createdAt: string;
}

export function toOrderDetail(order: OrderWithRelations): OrderDetailDTO {
  const items = order.items.map(item => ({
    productName: item.product.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.quantity * item.unitPrice,
  }));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customer: {
      name: order.user.name,
      email: order.user.email,
    },
    items,
    payment: order.payment ? {
      method: order.payment.method,
      status: order.payment.status,
      paidAt: order.payment.paidAt?.toISOString() || null,
    } : null,
    summary: {
      itemCount: items.length,
      totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
    },
    createdAt: order.createdAt.toISOString(),
  };
}
```

## 목록용 변환 (간소화)

```typescript
// lib/transformers/order.ts

// 목록 표시용 간소화 DTO
export interface OrderListItemDTO {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
}

export function toOrderListItem(order: OrderWithRelations): OrderListItemDTO {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.user.name,
    totalAmount: order.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    ),
    itemCount: order.items.length,
    createdAt: order.createdAt.toISOString(),
  };
}

export function toOrderList(orders: OrderWithRelations[]): OrderListItemDTO[] {
  return orders.map(toOrderListItem);
}
```

## 외부 API 응답 변환

```typescript
// lib/transformers/external.ts

// 외부 결제 API 응답
interface ExternalPaymentResponse {
  payment_key: string;
  order_id: string;
  amount: number;
  status: 'DONE' | 'CANCELED' | 'WAITING';
  approved_at: string;
  card_info?: {
    issuer_code: string;
    number: string;
    installment_plan_months: number;
  };
}

// 내부 형식으로 변환
interface PaymentDTO {
  paymentKey: string;
  orderId: string;
  amount: number;
  status: 'completed' | 'canceled' | 'pending';
  approvedAt: Date;
  card?: {
    issuer: string;
    lastFourDigits: string;
    installments: number;
  };
}

export function transformPaymentResponse(
  external: ExternalPaymentResponse
): PaymentDTO {
  return {
    paymentKey: external.payment_key,
    orderId: external.order_id,
    amount: external.amount,
    status: {
      DONE: 'completed' as const,
      CANCELED: 'canceled' as const,
      WAITING: 'pending' as const,
    }[external.status],
    approvedAt: new Date(external.approved_at),
    card: external.card_info ? {
      issuer: external.card_info.issuer_code,
      lastFourDigits: external.card_info.number.slice(-4),
      installments: external.card_info.installment_plan_months,
    } : undefined,
  };
}
```

## 날짜/숫자 포맷팅

```typescript
// lib/formatters/index.ts

// 날짜 포맷팅
export function formatDate(date: Date | string, format: 'short' | 'long' | 'datetime' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
    datetime: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' },
  }[format];

  return new Intl.DateTimeFormat('ko-KR', options).format(d);
}

// 금액 포맷팅
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

// 전화번호 포맷팅
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}
```

## 출력 형식

```markdown
## 🔄 데이터 변환 분석

### 변환 함수 현황

| 엔티티 | 응답 DTO | 목록 DTO | 상태 |
|--------|----------|----------|------|
| User | ✅ toUserResponse | ✅ toUserList | 완료 |
| Order | ✅ toOrderDetail | ⚠️ 미구현 | 부분 |
| Product | ❌ | ❌ | 없음 |

---

### 민감정보 제외 확인

| 엔티티 | 제외 필드 | 상태 |
|--------|----------|------|
| User | password, refreshToken | ✅ |
| Payment | cardNumber | ✅ |
| Partner | bankAccount | ⚠️ 확인 필요 |

---

### 구현 필요

#### ProductResponseDTO
```typescript
export interface ProductResponseDTO {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  images: string[];
  category: string;
}

export function toProductResponse(product: Product): ProductResponseDTO {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    discountPrice: product.discountPrice || undefined,
    images: product.images,
    category: product.category?.name || '미분류',
  };
}
```

---

### 변환 규칙

| 항목 | 규칙 |
|------|------|
| 날짜 | ISO 8601 문자열 |
| 금액 | 숫자 (원 단위) |
| 민감정보 | 항상 제외 |
| null | undefined로 변환 |
```

## 트리거 키워드
- "데이터 변환", "transform"
- "DTO", "매핑"
- "응답 형식", "데이터 포맷"
