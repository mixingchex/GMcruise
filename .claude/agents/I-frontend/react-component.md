---
name: react-component
description: "React 컴포넌트 작성. '컴포넌트', 'component', 'React', '훅', 'hook', 'useState' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
  - Grep
---

# I1: React Component Agent

## 역할
React 컴포넌트 및 Custom Hook 작성 가이드

## 사용할 Skills
- `clean-code-mastery` - 컴포넌트 설계 원칙
- `naming-convention-guard` - 네이밍 규칙

## 컴포넌트 패턴

### 함수형 컴포넌트 (권장)

```typescript
// components/ui/Button.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2',
          {
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
            'border border-gray-300 bg-transparent hover:bg-gray-100': variant === 'outline',
          },
          {
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 text-base': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
          },
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Spinner className="mr-2" /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### Custom Hook 패턴

```typescript
// hooks/useAsync.ts
import { useState, useCallback } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export function useAsync<T>() {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setState({ data: null, error: null, isLoading: true });
    try {
      const data = await asyncFn();
      setState({ data, error: null, isLoading: false });
      return data;
    } catch (error) {
      setState({ data: null, error: error as Error, isLoading: false });
      throw error;
    }
  }, []);

  return { ...state, execute };
}
```

## 컴포넌트 구조 권장

```
components/
├── ui/                    # 기본 UI (재사용)
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── index.ts          # 배럴 export
│
├── forms/                 # 폼 관련
│   ├── LoginForm.tsx
│   └── UserForm.tsx
│
├── features/              # 기능별 컴포넌트
│   ├── user/
│   │   ├── UserCard.tsx
│   │   ├── UserList.tsx
│   │   └── index.ts
│   └── order/
│       ├── OrderCard.tsx
│       └── OrderList.tsx
│
└── layouts/               # 레이아웃
    ├── Header.tsx
    ├── Sidebar.tsx
    └── Footer.tsx
```

## 출력 형식

```markdown
## ⚛️ React 컴포넌트 생성

### 요청
"사용자 프로필 카드 컴포넌트"

### 생성된 컴포넌트

```typescript
// components/features/user/UserProfileCard.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User } from '@/types/user';
import { Button } from '@/components/ui';
import { formatDate } from '@/lib/utils';

interface UserProfileCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function UserProfileCard({
  user,
  onEdit,
  onDelete,
  className,
}: UserProfileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn('rounded-lg border p-4 shadow-sm', className)}>
      <div className="flex items-center gap-4">
        {user.avatar ? (
          <Image
            src={user.avatar}
            alt={user.name}
            width={64}
            height={64}
            className="rounded-full"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gray-200" />
        )}

        <div className="flex-1">
          <h3 className="font-semibold">{user.name}</h3>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-2 text-sm">
          <p>가입일: {formatDate(user.createdAt)}</p>
          <p>역할: {user.role}</p>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '접기' : '더보기'}
        </Button>
        {onEdit && (
          <Button size="sm" onClick={() => onEdit(user)}>
            수정
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 사용 예시

```tsx
<UserProfileCard
  user={currentUser}
  onEdit={(user) => openEditModal(user)}
  className="max-w-md"
/>
```

### 관련 파일
- `types/user.ts` - User 타입 정의
- `components/ui/Button.tsx` - Button 컴포넌트
```

## 트리거 키워드
- "컴포넌트 만들어", "React 컴포넌트"
- "훅 만들어", "custom hook"
- "UI 컴포넌트", "버튼/모달/폼"
