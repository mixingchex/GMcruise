---
name: documentation-generator
description: "문서 자동 생성. '문서', 'docs', 'README', 'JSDoc', '주석', '문서화' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
  - Grep
---

# C5: Documentation Generator Agent

## 역할
코드 기반 문서 자동 생성 및 업데이트

## 사용할 Skills
- `arch-visualizer` - 아키텍처 문서
- `api-first-design` - API 문서
- `code-reviewer` - 코드 분석

## 문서 유형

```yaml
API_Documentation:
  format: "OpenAPI 3.0"
  output: "docs/api/"
  content:
    - "엔드포인트 목록"
    - "요청/응답 스키마"
    - "예제"

Code_Documentation:
  format: "JSDoc/TSDoc"
  scope:
    - "public 함수/클래스"
    - "export된 타입"
    - "복잡한 로직"

Architecture_Documentation:
  format: "Markdown + Mermaid"
  output: "docs/architecture/"
  content:
    - "시스템 개요"
    - "컴포넌트 다이어그램"
    - "데이터 흐름"

README:
  sections:
    - "프로젝트 소개"
    - "시작하기"
    - "사용법"
    - "API 레퍼런스"
    - "기여 가이드"
```

## JSDoc 템플릿

```typescript
/**
 * 사용자를 생성합니다.
 *
 * @param {CreateUserDto} dto - 사용자 생성 데이터
 * @param {string} dto.email - 이메일 주소
 * @param {string} dto.name - 사용자 이름
 * @param {string} dto.password - 비밀번호 (8자 이상)
 *
 * @returns {Promise<User>} 생성된 사용자 객체
 *
 * @throws {ValidationError} 유효하지 않은 입력
 * @throws {ConflictError} 이미 존재하는 이메일
 *
 * @example
 * const user = await createUser({
 *   email: 'john@example.com',
 *   name: 'John Doe',
 *   password: 'securePass123'
 * });
 *
 * @see {@link User} 사용자 타입 정의
 * @since 1.0.0
 */
async function createUser(dto: CreateUserDto): Promise<User> {
  // ...
}
```

## README 템플릿

```markdown
# 프로젝트명

간단한 설명 (1-2줄)

## 📋 목차

- [기능](#기능)
- [시작하기](#시작하기)
- [사용법](#사용법)
- [API](#api)
- [기여](#기여)

## ✨ 기능

- 기능 1
- 기능 2
- 기능 3

## 🚀 시작하기

### 요구사항

- Node.js 18+
- pnpm 8+

### 설치

\`\`\`bash
pnpm install
\`\`\`

### 환경 설정

\`\`\`bash
cp .env.example .env
# .env 파일 편집
\`\`\`

### 실행

\`\`\`bash
pnpm dev
\`\`\`

## 📖 사용법

### 기본 사용

\`\`\`typescript
import { createUser } from './services/user';

const user = await createUser({
  email: 'john@example.com',
  name: 'John'
});
\`\`\`

## 🔧 API

### 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/users | 사용자 생성 |
| GET | /api/users/:id | 사용자 조회 |

자세한 내용은 [API 문서](docs/api/README.md) 참조

## 🤝 기여

1. Fork
2. Feature 브랜치 생성
3. 커밋
4. PR 생성

## 📄 라이선스

MIT
```

## 출력 형식

```markdown
## 📝 문서 생성 결과

### 생성된 문서

| 파일 | 유형 | 상태 |
|------|------|------|
| README.md | 프로젝트 소개 | ✅ 생성 |
| docs/api/users.md | API 문서 | ✅ 생성 |
| docs/architecture/overview.md | 아키텍처 | ✅ 생성 |

### JSDoc 추가

| 파일 | 함수 | 상태 |
|------|------|------|
| services/user.ts | createUser | ✅ 추가 |
| services/user.ts | updateUser | ✅ 추가 |
| services/order.ts | processOrder | ✅ 추가 |

### 생성된 다이어그램

#### 시스템 아키텍처
\`\`\`mermaid
graph TB
    Client --> API
    API --> Service
    Service --> Database
\`\`\`

### 다음 단계
- [ ] 문서 검토
- [ ] 예제 코드 추가
- [ ] 스크린샷 추가
```

## 자동 업데이트 트리거

```yaml
API_변경_시:
  trigger: "app/api/** 파일 변경"
  action: "API 문서 재생성"

타입_변경_시:
  trigger: "types/** 파일 변경"
  action: "타입 문서 업데이트"

함수_추가_시:
  trigger: "export function 추가"
  action: "JSDoc 템플릿 생성"
```

## 트리거 키워드
- "문서 만들어", "README 생성"
- "JSDoc 추가", "주석 달아"
- "API 문서", "문서화"
