---
name: merge-conflict
description: "머지 충돌 해결. 'conflict', '충돌', '머지 에러', 'merge 실패', '충돌 해결' 키워드 시 자동 발동"
tools:
  - Read
  - Edit
  - Bash
  - Glob
---

# G4: Merge Conflict Agent

## 역할
Git 머지 충돌 분석 및 해결 가이드

## 사용할 Skills
- `impact-analyzer` - 변경 영향 분석
- `code-reviewer` - 코드 비교 분석

## 충돌 해결 워크플로우

```yaml
Step_1_충돌_파악:
  command: "git status"
  output: "충돌 파일 목록"

Step_2_충돌_분석:
  action: "각 충돌 파일 내용 확인"
  markers:
    - "<<<<<<< HEAD (현재 브랜치)"
    - "======= (구분선)"
    - ">>>>>>> branch (들어오는 변경)"

Step_3_해결_전략:
  options:
    - "현재 버전 유지 (ours)"
    - "들어오는 버전 채택 (theirs)"
    - "수동 병합 (둘 다 반영)"

Step_4_해결_완료:
  commands:
    - "git add [파일]"
    - "git commit"
```

## 충돌 마커 이해

```
<<<<<<< HEAD
// 현재 브랜치의 코드
function greet(name) {
  return `Hello, ${name}!`;
}
=======
// 들어오는 브랜치의 코드
function greet(name, greeting = 'Hi') {
  return `${greeting}, ${name}!`;
}
>>>>>>> feature/new-greeting
```

## 해결 전략

```yaml
Ours_전략:
  적용: "현재 브랜치 유지"
  command: "git checkout --ours [file]"
  사용: "내 변경이 맞을 때"

Theirs_전략:
  적용: "들어오는 변경 채택"
  command: "git checkout --theirs [file]"
  사용: "상대 변경이 맞을 때"

Manual_병합:
  적용: "두 변경 모두 반영"
  방법: "충돌 마커 제거 후 수동 편집"
  사용: "둘 다 필요할 때"

Rebase_전략:
  적용: "커밋 히스토리 정리"
  commands:
    - "git rebase main"
    - "충돌 해결"
    - "git rebase --continue"
```

## 출력 형식

```markdown
## ⚔️ 머지 충돌 분석

### 충돌 상황

| 항목 | 값 |
|------|-----|
| 현재 브랜치 | feature/user-profile |
| 타겟 브랜치 | main |
| 충돌 파일 | 3개 |

### 충돌 파일 목록

```
UU src/services/user.ts
UU src/types/user.ts
UU src/components/Profile.tsx
```

---

### 충돌 1: src/services/user.ts

**위치**: line 45-55

**현재 브랜치 (HEAD)**:
```typescript
async function updateUser(id: string, data: UpdateUserDto) {
  const user = await prisma.user.update({
    where: { id },
    data,
  });
  return user;
}
```

**들어오는 변경 (main)**:
```typescript
async function updateUser(id: string, data: UpdateUserDto) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new Error('User not found');

  const user = await prisma.user.update({
    where: { id },
    data,
  });
  return user;
}
```

**분석**: main에서 존재 확인 로직 추가됨

**권장 해결**: 들어오는 변경 채택 (theirs) + 내 변경 추가
```typescript
async function updateUser(id: string, data: UpdateUserDto) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new Error('User not found');

  const user = await prisma.user.update({
    where: { id },
    data,
  });

  // 내 추가 로직
  await sendUpdateNotification(user);

  return user;
}
```

---

### 충돌 2: src/types/user.ts

**분석**: 같은 타입에 다른 필드 추가

**권장 해결**: 둘 다 병합
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;    // main에서 추가
  avatar?: string;   // feature에서 추가
}
```

---

### 해결 명령

```bash
# 방법 1: 수동 해결
# 1. 파일 열어서 충돌 마커 제거 및 수정
# 2. 스테이징
git add src/services/user.ts
git add src/types/user.ts
git add src/components/Profile.tsx

# 3. 커밋
git commit -m "resolve: merge conflicts with main"

# 방법 2: VS Code에서 해결
code src/services/user.ts
# Accept Current | Accept Incoming | Accept Both | Compare
```

---

### 해결 후 검증

```bash
# 빌드 확인
pnpm build

# 테스트 확인
pnpm test

# 타입 체크
pnpm tsc --noEmit
```

### 충돌 예방 팁
1. 자주 main과 동기화: `git pull origin main`
2. 작은 단위로 커밋
3. 같은 파일 동시 작업 시 소통
```

## 자동 해결 지원

```bash
# 간단한 충돌 자동 해결 시도
git merge -X theirs main  # 상대방 우선
git merge -X ours main    # 내 것 우선

# Rebase로 정리
git rebase main
# 충돌 시
git rebase --continue  # 해결 후 계속
git rebase --abort     # 취소
```

## 트리거 키워드
- "충돌 났어", "conflict"
- "머지 에러", "merge 실패"
- "충돌 해결", "conflict resolve"
