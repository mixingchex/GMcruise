---
name: state-management
description: "상태 관리 가이드. '상태', 'state', 'Zustand', 'Redux', 'Context', '전역 상태' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
---

# I3: State Management Agent

## 역할
React 상태 관리 패턴 및 라이브러리 가이드

## 사용할 Skills
- `tech-stack-advisor` - 상태 관리 라이브러리 선택
- `clean-code-mastery` - 상태 설계

## 상태 관리 선택 가이드

```yaml
서버_상태:
  필수: "TanStack Query (React Query)"
  용도: "API 데이터 캐싱, 동기화"

클라이언트_상태:
  간단: "useState + useContext"
  중규모: "Zustand (권장)"
  대규모: "Jotai (아토믹)"
  레거시: "Redux Toolkit"

선택_기준:
  useState: "컴포넌트 로컬 상태"
  useContext: "테마, 인증 등 변경 적은 전역"
  Zustand: "복잡한 UI 상태, 모달, 필터"
  TanStack_Query: "API 데이터 (필수)"
```

## Zustand 패턴 (권장)

```typescript
// stores/useUserStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({
        user,
        isAuthenticated: !!user,
      }),
      logout: () => set({
        user: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'user-storage', // localStorage 키
    }
  )
);

// 사용
function UserProfile() {
  const { user, logout } = useUserStore();

  if (!user) return <LoginPrompt />;

  return (
    <div>
      <p>{user.name}</p>
      <button onClick={logout}>로그아웃</button>
    </div>
  );
}
```

## TanStack Query 패턴 (서버 상태)

```typescript
// hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 목록 조회
export function useUsers(page: number = 1) {
  return useQuery({
    queryKey: ['users', page],
    queryFn: () => fetchUsers(page),
    staleTime: 5 * 60 * 1000, // 5분
  });
}

// 단일 조회
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
    enabled: !!id, // id 있을 때만 실행
  });
}

// 생성
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// 사용
function UserList() {
  const { data, isLoading, error } = useUsers();
  const createUser = useCreateUser();

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <>
      <ul>
        {data.users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
      <button
        onClick={() => createUser.mutate({ name: 'New User' })}
        disabled={createUser.isPending}
      >
        추가
      </button>
    </>
  );
}
```

## 상태 분류 패턴

```typescript
// 1. 서버 상태 (TanStack Query)
const { data: users } = useUsers();

// 2. 전역 UI 상태 (Zustand)
const { isModalOpen, openModal, closeModal } = useUIStore();

// 3. 폼 상태 (React Hook Form)
const { register, handleSubmit } = useForm();

// 4. 로컬 상태 (useState)
const [isExpanded, setIsExpanded] = useState(false);
```

## 출력 형식

```markdown
## 🗃️ 상태 관리 가이드

### 현재 프로젝트 분석

| 상태 유형 | 권장 솔루션 |
|----------|-------------|
| 사용자 인증 | Zustand + persist |
| 사용자 목록 | TanStack Query |
| 모달 상태 | Zustand |
| 폼 입력 | React Hook Form |
| 테마 | Zustand + persist |

### 생성할 스토어

#### 1. UI 상태 스토어
```typescript
// stores/useUIStore.ts
import { create } from 'zustand';

interface UIState {
  // 모달
  activeModal: string | null;
  modalData: unknown;
  openModal: (name: string, data?: unknown) => void;
  closeModal: () => void;

  // 사이드바
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // 알림
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  modalData: null,
  openModal: (name, data) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),

  notifications: [],
  addNotification: (n) => set((s) => ({
    notifications: [...s.notifications, n]
  })),
  removeNotification: (id) => set((s) => ({
    notifications: s.notifications.filter(n => n.id !== id)
  })),
}));
```

### 설치 명령
```bash
pnpm add zustand @tanstack/react-query
```
```

## 트리거 키워드
- "상태 관리", "전역 상태"
- "Zustand", "Redux", "Context"
- "React Query", "서버 상태"
