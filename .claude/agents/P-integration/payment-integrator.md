---
name: payment-integrator
description: "결제 연동. '결제', 'payment', 'PG', '토스페이먼츠', '카카오페이' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
  - Grep
---

# P1: Payment Integrator Agent

## 역할
결제 시스템 연동 및 보안 구현 가이드

## 결제 플로우

```yaml
일반_결제:
  1. 클라이언트: "결제 요청 시작"
  2. 서버: "주문 생성 + 결제 키 발급"
  3. PG사: "결제창 호출"
  4. 사용자: "결제 진행"
  5. PG사: "결제 완료 → 콜백"
  6. 서버: "결제 승인 API 호출"
  7. 서버: "주문 상태 업데이트"

빌링키_정기결제:
  1. "카드 등록 → 빌링키 발급"
  2. "빌링키로 자동 결제"
  3. "스케줄러로 정기 청구"
```

## 토스페이먼츠 연동

```typescript
// lib/payment/toss.ts
import { TossPayments } from '@tosspayments/sdk';

const secretKey = process.env.TOSS_SECRET_KEY!;
const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!;

// 결제 승인
export async function confirmPayment(paymentKey: string, orderId: string, amount: number) {
  const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new PaymentError(error.code, error.message);
  }

  return response.json();
}

// 결제 취소
export async function cancelPayment(
  paymentKey: string,
  cancelReason: string,
  cancelAmount?: number
) {
  const response = await fetch(
    `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancelReason,
        cancelAmount,
      }),
    }
  );

  return response.json();
}
```

## 결제 API Route

```typescript
// app/api/payments/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { confirmPayment } from '@/lib/payment/toss';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const { paymentKey, orderId, amount } = await request.json();

  // 1. 주문 정보 확인
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return NextResponse.json(
      { error: '주문을 찾을 수 없습니다' },
      { status: 404 }
    );
  }

  // 2. 금액 검증 (필수!)
  if (order.amount !== amount) {
    return NextResponse.json(
      { error: '결제 금액이 일치하지 않습니다' },
      { status: 400 }
    );
  }

  // 3. 이미 결제된 주문인지 확인
  if (order.status !== 'PENDING') {
    return NextResponse.json(
      { error: '이미 처리된 주문입니다' },
      { status: 400 }
    );
  }

  try {
    // 4. 결제 승인
    const payment = await confirmPayment(paymentKey, orderId, amount);

    // 5. 트랜잭션으로 상태 업데이트
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paymentKey,
          paidAt: new Date(),
        },
      }),
      prisma.payment.create({
        data: {
          orderId,
          paymentKey,
          amount,
          method: payment.method,
          status: 'DONE',
          rawData: JSON.stringify(payment),
        },
      }),
    ]);

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    // 결제 실패 로깅
    await prisma.paymentLog.create({
      data: {
        orderId,
        type: 'CONFIRM_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      { error: '결제 승인에 실패했습니다' },
      { status: 500 }
    );
  }
}
```

## 클라이언트 결제 컴포넌트

```typescript
// components/payment/PaymentButton.tsx
'use client';

import { loadTossPayments } from '@tosspayments/sdk';
import { useState } from 'react';

interface PaymentButtonProps {
  orderId: string;
  orderName: string;
  amount: number;
  customerEmail: string;
  customerName: string;
}

export function PaymentButton({
  orderId,
  orderName,
  amount,
  customerEmail,
  customerName,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const tossPayments = await loadTossPayments(
        process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
      );

      await tossPayments.requestPayment('카드', {
        amount,
        orderId,
        orderName,
        customerEmail,
        customerName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full bg-blue-600 text-white py-3 rounded-lg"
    >
      {loading ? '처리 중...' : `${amount.toLocaleString()}원 결제하기`}
    </button>
  );
}
```

## 보안 체크리스트

```yaml
필수_검증:
  - "금액 서버사이드 검증"
  - "주문 상태 확인"
  - "중복 결제 방지"
  - "시크릿 키 노출 방지"

트랜잭션:
  - "결제 승인과 DB 업데이트 원자성"
  - "실패 시 롤백 처리"

로깅:
  - "모든 결제 시도 기록"
  - "실패 원인 상세 로깅"
  - "PII 마스킹"

테스트:
  - "테스트 모드 키 분리"
  - "모든 결제 시나리오 테스트"
```

## 출력 형식

```markdown
## 💳 결제 연동 가이드

### 현재 상태

| PG사 | 연동 상태 | 기능 |
|------|----------|------|
| 토스페이먼츠 | ✅ 완료 | 카드, 계좌이체 |
| 카카오페이 | ⚠️ 개발 중 | 간편결제 |
| 네이버페이 | ❌ 미연동 | - |

---

### 보안 검증

| 항목 | 상태 | 위치 |
|------|------|------|
| 금액 검증 | ✅ | api/payments/confirm |
| 중복 방지 | ✅ | 주문 상태 체크 |
| 키 보안 | ⚠️ | .env 확인 필요 |

---

### 구현 필요 사항

1. **웹훅 처리** - 비동기 결제 결과 수신
2. **부분 취소** - 일부 금액 환불
3. **정기 결제** - 빌링키 연동

---

### 테스트 체크리스트

- [ ] 정상 결제 → 성공
- [ ] 금액 변조 → 차단
- [ ] 중복 결제 → 차단
- [ ] 결제 취소 → 환불 처리
- [ ] 웹훅 수신 → 상태 업데이트
```

## 트리거 키워드
- "결제", "payment", "PG"
- "토스페이먼츠", "카카오페이"
- "결제 연동", "결제 API"
