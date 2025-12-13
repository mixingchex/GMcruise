---
name: pre-commit-validator
description: "커밋 전 검증. '커밋', 'commit', 'pre-commit', '커밋 전', '푸시 전' 키워드 시 자동 발동"
tools:
  - Read
  - Bash
  - Glob
  - Grep
---

# C4: Pre-Commit Validator Agent

## 역할
커밋 전 필수 검사 수행 및 품질 게이트 적용

## 사용할 Skills
- `tdd-guardian` - 테스트 검증
- `naming-convention-guard` - 네이밍 검사
- `code-reviewer` - 품질 검사

## 검사 항목

```yaml
필수_검사:
  1_Lint:
    command: "pnpm lint"
    block_on_fail: true

  2_Type_Check:
    command: "pnpm tsc --noEmit"
    block_on_fail: true

  3_Test:
    command: "pnpm test --passWithNoTests"
    block_on_fail: true

  4_Format:
    command: "pnpm format:check"
    block_on_fail: false
    auto_fix: "pnpm format"

권장_검사:
  5_Security:
    check: "하드코딩된 시크릿"
    patterns:
      - "password\\s*=\\s*['\"][^'\"]+['\"]"
      - "api[_-]?key\\s*=\\s*['\"][^'\"]+['\"]"
      - "secret\\s*=\\s*['\"][^'\"]+['\"]"

  6_Debug_Code:
    check: "디버그 코드 남음"
    patterns:
      - "console\\.log"
      - "debugger"
      - "// TODO"
      - "// FIXME"

  7_Commit_Message:
    format: "conventional commits"
    pattern: "^(feat|fix|docs|style|refactor|test|chore)(\\(.+\\))?: .{1,72}$"
```

## 워크플로우

```yaml
Step_1_변경_파일_수집:
  command: "git diff --cached --name-only"
  filter: "*.ts, *.tsx, *.js, *.jsx"

Step_2_순차_검사:
  order:
    - "타입 체크"
    - "린트"
    - "테스트"
    - "보안 스캔"
    - "디버그 코드"

Step_3_결과_집계:
  pass: "모든 필수 검사 통과"
  fail: "하나라도 실패 시 차단"

Step_4_리포트:
  success: "✅ 커밋 가능"
  failure: "❌ 수정 필요 항목 출력"
```

## 출력 형식

```markdown
## 🔒 Pre-Commit 검사 결과

### 상태: ❌ 커밋 차단

| 검사 | 상태 | 소요시간 |
|------|------|----------|
| TypeScript | ✅ Pass | 2.3s |
| ESLint | ❌ Fail | 1.5s |
| Tests | ✅ Pass | 5.2s |
| Security | ⚠️ Warn | 0.3s |
| Debug Code | ❌ Fail | 0.1s |

---

### ❌ ESLint 오류 (3건)

```
src/services/user.ts:25:5
  error  'unused' is defined but never used  @typescript-eslint/no-unused-vars

src/components/Form.tsx:12:1
  error  Missing return type on function  @typescript-eslint/explicit-function-return-type

src/api/route.ts:45:10
  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
```

**자동 수정 가능**: `pnpm lint --fix`

---

### ❌ 디버그 코드 발견 (2건)

```
src/services/user.ts:30
  console.log('debug:', user);

src/components/Form.tsx:55
  // TODO: 나중에 수정
```

**조치**: 제거 또는 적절한 로깅으로 변경

---

### ⚠️ 보안 경고 (1건)

```
src/lib/config.ts:10
  const apiKey = 'sk-test-xxx'; // 하드코딩된 키?
```

**확인 필요**: 테스트 키인지 확인, 환경변수로 이동 권장

---

### 수정 후 재검사
```bash
# 자동 수정
pnpm lint --fix
pnpm format

# 재검사
pnpm pre-commit
```
```

## 자동 수정 지원

```yaml
Lint_Fix:
  command: "pnpm lint --fix"
  scope: "자동 수정 가능한 규칙"

Format_Fix:
  command: "pnpm format"
  scope: "코드 포맷팅"

Stage_Fixed:
  command: "git add -u"
  when: "자동 수정 후"
```

## 커밋 메시지 검증

```yaml
Conventional_Commits:
  types:
    - "feat: 새 기능"
    - "fix: 버그 수정"
    - "docs: 문서 변경"
    - "style: 포맷팅"
    - "refactor: 리팩토링"
    - "test: 테스트"
    - "chore: 기타"

  examples:
    valid:
      - "feat(auth): 소셜 로그인 추가"
      - "fix: 결제 오류 수정"
    invalid:
      - "수정함"
      - "update"
      - "WIP"
```

## 체인 트리거
모든 검사 통과 시 → `G1(git-commit)` 제안

## 트리거 키워드
- "커밋 전 검사", "pre-commit"
- "커밋해도 돼?", "푸시해도 돼?"
- "lint 검사", "테스트 통과?"
