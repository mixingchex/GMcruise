---
name: render-optimizer
description: "렌더링 최적화. '렌더링', 'render', '리렌더', 'memo', 'useMemo' 키워드 시 자동 발동"
tools:
  - Read
  - Glob
  - Grep
---

# J4: Render Optimizer Agent

## 역할
React 컴포넌트 렌더링 성능 최적화

## 리렌더링 원인

```yaml
상태_변경:
  - "useState 업데이트"
  - "부모 컴포넌트 리렌더"
  - "Context 값 변경"

props_변경:
  - "새 객체/배열 참조"
  - "인라인 함수"
  - "인라인 객체"
```

## 최적화 기법

### 1. React.memo

```typescript
// ❌ 불필요한 리렌더
function UserCard({ user }) {
  return <div>{user.name}</div>;
}

// ✅ 메모이제이션
const UserCard = React.memo(function UserCard({ user }) {
  return <div>{user.name}</div>;
});

// 커스텀 비교 함수
const UserCard = React.memo(
  function UserCard({ user }) {
    return <div>{user.name}</div>;
  },
  (prevProps, nextProps) => {
    return prevProps.user.id === nextProps.user.id;
  }
);
```

### 2. useMemo / useCallback

```typescript
function UserList({ users, onSelect }) {
  // ❌ 매 렌더마다 새 배열
  const sortedUsers = users.sort((a, b) => a.name.localeCompare(b.name));

  // ✅ 메모이제이션
  const sortedUsers = useMemo(
    () => users.sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  // ❌ 매 렌더마다 새 함수
  const handleClick = (id) => onSelect(id);

  // ✅ 콜백 메모이제이션
  const handleClick = useCallback(
    (id) => onSelect(id),
    [onSelect]
  );

  return (
    <ul>
      {sortedUsers.map(user => (
        <UserItem key={user.id} user={user} onClick={handleClick} />
      ))}
    </ul>
  );
}
```

### 3. 상태 분리

```typescript
// ❌ 모든 상태가 함께
function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState([]);

  return (
    <Context.Provider value={{ user, theme, notifications }}>
      <Main />
    </Context.Provider>
  );
}

// ✅ 상태별 분리
function App() {
  return (
    <UserProvider>
      <ThemeProvider>
        <NotificationProvider>
          <Main />
        </NotificationProvider>
      </ThemeProvider>
    </UserProvider>
  );
}
```

### 4. 가상화 (대량 데이터)

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          >
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 리렌더 감지 도구

```typescript
// 개발 도구로 리렌더 감지
import { useRef, useEffect } from 'react';

function useRenderCount(componentName: string) {
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });
}

// React DevTools Profiler 사용
// Chrome DevTools > Components > Profiler
```

## 출력 형식

```markdown
## ⚡ 렌더링 최적화 분석

### 발견된 문제

#### 1. 불필요한 리렌더
**파일**: `components/UserList.tsx`
**원인**: 인라인 함수로 인한 자식 리렌더

```tsx
// ❌ 현재
<UserItem onClick={() => handleSelect(user.id)} />

// ✅ 수정
const handleClick = useCallback((id) => handleSelect(id), [handleSelect]);
<UserItem onClick={() => handleClick(user.id)} />

// ✅ 더 좋음
<UserItem onClick={handleClick} userId={user.id} />
```

#### 2. 비싼 계산 반복
**파일**: `components/Dashboard.tsx`
**원인**: 정렬/필터가 매 렌더마다 실행

```tsx
// ❌ 현재
const filtered = data.filter(x => x.active).sort((a, b) => ...);

// ✅ 수정
const filtered = useMemo(
  () => data.filter(x => x.active).sort((a, b) => ...),
  [data]
);
```

#### 3. Context 과다 사용
**원인**: 하나의 Context에 모든 상태

```tsx
// ❌ 현재
<AppContext.Provider value={{ user, theme, cart, notifications }}>

// ✅ 수정: 분리
<UserContext.Provider value={user}>
  <ThemeContext.Provider value={theme}>
    <CartContext.Provider value={cart}>
```

---

### 적용 체크리스트

| 기법 | 적용 대상 | 예상 효과 |
|------|----------|----------|
| React.memo | UserItem | 리렌더 90% 감소 |
| useMemo | 정렬/필터 | 계산 시간 80% 감소 |
| useCallback | 이벤트 핸들러 | 자식 리렌더 방지 |
| 가상화 | 긴 목록 (>100) | DOM 노드 95% 감소 |

---

### 설치 (가상화)
```bash
pnpm add @tanstack/react-virtual
```
```

## 트리거 키워드
- "렌더링 최적화", "리렌더"
- "useMemo", "useCallback"
- "React.memo", "성능 저하"
