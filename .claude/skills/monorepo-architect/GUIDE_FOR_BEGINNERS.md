# Monorepo Architect - 비개발자를 위한 완전 가이드

> **문서 버전**: 1.0.0
> **대상 독자**: 비개발자, 스킬 구조를 이해하고 싶은 사람
> **목표**: 모노레포 스킬이 왜 필요한지, 어떻게 작동하는지 완전히 이해하기

---

## 1. 왜 Monorepo Architect가 필요한가?

### 비유로 이해하기: "대형 아파트 단지 관리"

**여러 저장소 (Multi-repo) = 분산된 건물들**
```
건물A (프론트엔드)    건물B (백엔드)    건물C (앱)
   │                    │                │
   └─── 각자 관리인 ────┘                │
         각자 규칙                        │
         중복 설비                        │
         조율 어려움 ─────────────────────┘

문제:
- "백엔드 업데이트했는데 프론트엔드가 호환 안 돼요"
- "같은 유틸 함수를 세 곳에서 복사해서 쓰고 있어요"
- "버전 맞추려면 세 저장소 다 확인해야 해요"
```

**모노레포 (Monorepo) = 하나의 대형 단지**
```
┌─────────────────────────────────────────────────────┐
│                  대형 아파트 단지                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐         │
│   │ 동A     │   │ 동B     │   │ 동C     │         │
│   │ 프론트  │   │ 백엔드  │   │ 앱      │         │
│   └────┬────┘   └────┬────┘   └────┬────┘         │
│        │             │             │               │
│        └──────┬──────┴─────────────┘               │
│               │                                     │
│        ┌──────┴──────┐                             │
│        │ 공용 시설   │                             │
│        │ (shared)    │                             │
│        └─────────────┘                             │
│                                                     │
│   - 단일 관리인 (일관된 규칙)                       │
│   - 공용 시설 공유 (중복 제거)                      │
│   - 한 번에 업데이트 (버전 동기화)                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 실제 문제: 멀티레포의 고통

```
[ 시나리오: 사용자 타입 수정 ]

Multi-repo 환경:
1. 백엔드 저장소에서 User 타입 수정
2. 프론트엔드 저장소에 알림
3. 프론트엔드 개발자: "어떻게 바뀌었어요?"
4. 타입 복사해서 프론트엔드에 붙여넣기
5. 앱 저장소에도 동일 작업
6. 3주 후: "이 타입 왜 다 다르죠?"

Monorepo 환경:
1. packages/shared/types/user.ts 수정
2. 끝! (모든 앱이 같은 타입 사용)
```

---

## 2. Monorepo란 무엇인가?

### 2.1 정의

```
Monorepo = Mono (단일) + Repo (저장소)

하나의 Git 저장소에 여러 프로젝트를 함께 관리

구조 예시:
my-company/                       ← 하나의 저장소
├── apps/                         ← 실행 가능한 앱들
│   ├── web/                      ← Next.js 웹
│   ├── mobile/                   ← Expo 앱
│   └── backend/                  ← NestJS API
│
├── packages/                     ← 공유 패키지들
│   ├── shared/                   ← 공통 타입, 유틸
│   ├── ui/                       ← 공통 UI 컴포넌트
│   └── api-client/               ← API 클라이언트
│
├── tools/                        ← 빌드 스크립트
├── pnpm-workspace.yaml           ← 워크스페이스 설정
└── turbo.json                    ← 빌드 파이프라인
```

### 2.2 장단점

```yaml
장점:
  코드_공유:
    설명: "타입, 유틸, 컴포넌트 한 번만 작성"
    예시: "User 타입을 web, mobile, backend가 공유"

  원자적_커밋:
    설명: "관련 변경을 한 커밋에"
    예시: "API 변경 + 프론트엔드 수정 = 1 커밋"

  일관성:
    설명: "ESLint, TypeScript 설정 통일"
    예시: "전체 코드베이스 동일 규칙"

  의존성_관리:
    설명: "패키지 버전 충돌 방지"
    예시: "React 버전이 앱마다 다른 문제 해결"

단점:
  초기_설정_복잡:
    설명: "워크스페이스, 빌드 파이프라인 설정 필요"
    해결: "Turborepo, Nx 같은 도구 사용"

  저장소_크기:
    설명: "전체 코드가 커질 수 있음"
    해결: "필요한 패키지만 sparse checkout"

  빌드_시간:
    설명: "전체 빌드 시 오래 걸림"
    해결: "캐싱, 병렬 빌드 (Turborepo)"
```

---

## 3. 5가지 핵심 원칙

### 3.1 Shared First (공유 우선)

```
[ 원칙 ]
중복 코드는 반드시 packages/shared로!

[ 비유 ]
아파트 단지의 공용 시설

❌ 각 동마다 헬스장, 도서관, 카페가 있다면?
   → 비용 낭비, 관리 어려움

✅ 단지 중앙에 공용 시설 1개
   → 효율적, 모두가 사용

[ 코드에서 ]
❌ apps/web/utils/formatDate.ts
❌ apps/mobile/utils/formatDate.ts
❌ apps/backend/utils/formatDate.ts

✅ packages/shared/utils/formatDate.ts
   → 세 앱 모두 여기서 import
```

### 3.2 Dependency Direction (의존성 방향)

```
[ 원칙 ]
의존성은 항상 packages → apps 방향으로!

[ 비유 ]
물이 위에서 아래로 흐르듯, 의존성도 한 방향으로!

packages/shared  ← 물탱크 (공급원)
       │
       ▼
apps/web, apps/mobile, apps/backend  ← 각 가정 (소비자)

[ 규칙 ]
✅ 허용: apps/* → packages/*
   예: apps/web에서 packages/shared 사용

❌ 금지: packages/* → apps/*
   예: packages/shared에서 apps/web 사용

❌ 금지: apps/A → apps/B
   예: apps/web에서 apps/backend 직접 import
```

**왜 이런 규칙이 필요한가?**
```
[ 순환 의존성 문제 ]

A → B → C → A  (순환!)

결과:
- 빌드 실패
- 무한 루프
- 디버깅 지옥

[ 방향성 유지 ]

shared → web
       → mobile
       → backend

결과:
- 빌드 순서 명확
- 영향 범위 예측 가능
- 독립 배포 가능
```

### 3.3 Independent Deployability (독립 배포 가능)

```
[ 원칙 ]
각 app은 독립적으로 배포 가능해야 함

[ 비유 ]
각 동의 엘리베이터가 독립적으로 운영

A동 엘리베이터 점검 중 → B동, C동 영향 없음

[ 코드에서 ]
apps/web 배포 → apps/mobile, apps/backend 영향 없음
apps/backend API 추가 → web, mobile은 원할 때 업데이트

[ 잘못된 예 ]
- web이 backend의 내부 함수를 직접 호출
- 런타임에 다른 앱의 코드 참조
```

### 3.4 Consistent Tooling (일관된 도구)

```
[ 원칙 ]
전체 프로젝트에서 동일한 도구 사용

[ 비유 ]
아파트 단지 전체가 같은 전기 규격 사용
→ A동은 110V, B동은 220V면 혼란!

[ 코드에서 ]
- TypeScript 버전: 전체 동일
- ESLint 규칙: 전체 동일
- 테스트 프레임워크: 전체 동일
- 패키지 매니저: pnpm (전체)

[ 설정 파일 공유 ]
루트에 base 설정:
  tsconfig.base.json
  eslint.config.base.js

각 앱에서 extends:
  { "extends": "../../tsconfig.base.json" }
```

### 3.5 Clear Boundaries (명확한 경계)

```
[ 원칙 ]
패키지 간 경계가 명확해야 함

[ 비유 ]
각 동의 출입구가 명확해야 함
아무 데서나 들어갈 수 있으면 보안 문제!

[ 코드에서 ]
각 패키지는 명시적 진입점(entry point) 필요

packages/shared/
├── package.json         # exports 필드로 진입점 명시
├── index.ts            # public API만 export
└── internal/           # 내부용, 외부 접근 금지

// package.json
{
  "name": "@company/shared",
  "exports": {
    ".": "./src/index.ts",
    "./utils": "./src/utils/index.ts"
  }
}

// 사용 시
import { User } from '@company/shared';  // ✅ 허용
import { internalHelper } from '@company/shared/internal';  // ❌ 금지
```

---

## 4. 표준 폴더 구조

### 4.1 전체 구조

```
project-root/
│
├── apps/                           # 실행 가능한 애플리케이션
│   ├── backend/                    # NestJS API 서버
│   │   ├── src/
│   │   ├── test/
│   │   └── package.json
│   │
│   ├── web/                        # Next.js 웹 앱
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   │
│   └── mobile/                     # Expo 모바일 앱
│       ├── src/
│       └── package.json
│
├── packages/                       # 공유 패키지
│   ├── shared/                     # 공통 타입, 유틸, 상수
│   │   ├── src/
│   │   │   ├── types/              # 타입 정의
│   │   │   ├── utils/              # 유틸리티 함수
│   │   │   ├── constants/          # 상수
│   │   │   └── validation/         # Zod 스키마
│   │   └── package.json
│   │
│   ├── ui/                         # 공통 UI 컴포넌트
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── styles/
│   │   └── package.json
│   │
│   ├── api-client/                 # API 클라이언트 (자동 생성)
│   │   ├── src/
│   │   └── package.json
│   │
│   └── config/                     # 공유 설정
│       ├── eslint/
│       ├── typescript/
│       └── package.json
│
├── tools/                          # 빌드 스크립트, CLI 도구
│   ├── scripts/
│   └── generators/
│
├── pnpm-workspace.yaml             # 워크스페이스 정의
├── turbo.json                      # Turborepo 파이프라인
├── tsconfig.base.json              # TypeScript 기본 설정
└── package.json                    # 루트 의존성
```

### 4.2 패키지별 역할

```yaml
apps/backend:
  역할: "API 서버"
  기술: "NestJS, PostgreSQL"
  배포: "독립 배포 (AWS, Vercel Functions)"
  의존성: "@company/shared, @company/api-client"

apps/web:
  역할: "웹 애플리케이션"
  기술: "Next.js, React"
  배포: "독립 배포 (Vercel)"
  의존성: "@company/shared, @company/ui, @company/api-client"

apps/mobile:
  역할: "모바일 앱"
  기술: "Expo, React Native"
  배포: "App Store, Play Store"
  의존성: "@company/shared, @company/ui, @company/api-client"

packages/shared:
  역할: "공통 코드"
  내용: "타입, 유틸, 상수, 검증 스키마"
  의존성: "외부 라이브러리만 (zod 등)"

packages/ui:
  역할: "공통 UI"
  내용: "버튼, 인풋, 모달 등 재사용 컴포넌트"
  의존성: "@company/shared"

packages/api-client:
  역할: "API 호출 클라이언트"
  내용: "OpenAPI에서 자동 생성된 타입과 함수"
  의존성: "@company/shared"

packages/config:
  역할: "공유 설정"
  내용: "ESLint, TypeScript, Prettier 설정"
  의존성: "없음"
```

---

## 5. 스킬 작동 방식

### 5.1 자동 발동 조건

```yaml
파일_패턴:
  - "pnpm-workspace.yaml, lerna.json"    # 워크스페이스 설정
  - "turbo.json, nx.json"                # 빌드 도구 설정
  - "packages/**/*, apps/**/*"           # 패키지/앱 폴더
  - "tsconfig.base.json, tsconfig.paths.json"  # TS 경로

한국어_키워드:
  - "모노레포, 워크스페이스"
  - "패키지 구조, 폴더 구조"
  - "공유 코드, 공통 모듈"
  - "의존성, 디펜던시"

영어_키워드:
  - "monorepo, workspace"
  - "package structure"
  - "shared code, common module"
  - "dependency, import path"
```

### 5.2 선택적 문서 로드

```
[ 로드 순서 ]

1단계: 항상 로드
  - core/structure.md (폴더 구조)
  - quick-reference/checklist.md (체크리스트)

2단계: 상황별 로드
  새 패키지 추가:
    → templates/package-template.md

  의존성 분석:
    → core/dependency-rules.md

  빌드 파이프라인:
    → patterns/turborepo.md

  TypeScript 설정:
    → patterns/typescript-config.md

  Shared 패키지 설계:
    → core/shared-package.md
```

---

## 6. 모노레포 도구

### 6.1 pnpm Workspace

```yaml
# pnpm-workspace.yaml

packages:
  - 'apps/*'       # apps 폴더의 모든 패키지
  - 'packages/*'   # packages 폴더의 모든 패키지
  - 'tools/*'      # tools 폴더의 모든 패키지
```

**pnpm의 장점**
```
1. 디스크 절약
   node_modules를 심볼릭 링크로 공유
   같은 패키지 여러 번 설치 안 함

2. 엄격한 의존성
   package.json에 없는 패키지 사용 불가
   "몰래 사용" 방지

3. 빠른 설치
   캐싱 + 병렬 설치
```

### 6.2 Turborepo

```json
// turbo.json

{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {
      "outputs": []
    }
  }
}
```

**Turborepo 핵심 기능**
```
1. 캐싱
   이전 빌드 결과 재사용
   변경 없으면 빌드 스킵

2. 병렬 실행
   독립적인 태스크 동시 실행
   빌드 시간 단축

3. 의존성 그래프
   패키지 간 순서 자동 파악
   올바른 순서로 빌드
```

---

## 7. 체크리스트

### 7.1 새 코드 작성 시

```markdown
## 위치 결정
- [ ] 이 코드가 여러 app에서 사용될까?
  → YES: packages/shared로
  → NO: 해당 app 내부에

- [ ] UI 컴포넌트인가?
  → YES: packages/ui로

- [ ] API 관련 코드인가?
  → YES: packages/api-client로

## 의존성 확인
- [ ] 의존성 방향이 올바른가?
  → packages → apps (O)
  → apps → packages (X)

- [ ] apps 간 직접 import 없는가?
  → apps/web → apps/backend (X)
```

### 7.2 새 패키지 추가 시

```markdown
## package.json 설정
- [ ] name에 스코프 붙임? (@company/패키지명)
- [ ] version 설정?
- [ ] main/exports 진입점 설정?

## TypeScript 설정
- [ ] tsconfig.json이 base를 extends?
- [ ] paths 별칭 설정?

## 워크스페이스 등록
- [ ] pnpm-workspace.yaml에 경로 포함?
- [ ] turbo.json pipeline 추가?
```

---

## 8. 파일 구조

```
monorepo-architect/
├── SKILL.md                        # 메인 파일 (라우터)
├── GUIDE_FOR_BEGINNERS.md          # 이 문서
│
├── core/                           # 핵심 문서
│   ├── structure.md                # 폴더 구조 상세
│   ├── shared-package.md           # shared 패키지 설계
│   └── dependency-rules.md         # 의존성 규칙
│
├── templates/                      # 템플릿
│   ├── package-template.md         # 새 패키지 템플릿
│   └── app-configs.md              # 앱별 설정 템플릿
│
├── patterns/                       # 패턴
│   ├── turborepo.md                # Turborepo 설정
│   └── typescript-config.md        # TypeScript 설정
│
└── quick-reference/                # 빠른 참조
    ├── checklist.md                # 체크리스트
    └── anti-patterns.md            # 안티패턴
```

---

## 9. 다른 스킬과의 관계

```
[ Monorepo Architect의 위치 ]

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│          ┌─────────────────────────────┐                   │
│          │   Monorepo Architect        │                   │
│          │                             │                   │
│          │   ∙ 폴더 구조               │                   │
│          │   ∙ 의존성 방향             │                   │
│          │   ∙ 패키지 경계             │                   │
│          └──────────┬──────────────────┘                   │
│                     │                                       │
│     ┌───────────────┼───────────────┐                      │
│     │               │               │                      │
│     ▼               ▼               ▼                      │
│ ┌────────┐    ┌──────────┐    ┌──────────┐                │
│ │ clean- │    │ api-     │    │ code-    │                │
│ │ code   │    │ first    │    │ reviewer │                │
│ │        │    │ design   │    │          │                │
│ └────────┘    └──────────┘    └──────────┘                │
│                                                             │
│   아키텍처 규칙을 다른 스킬들이 검증에 활용                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

관계:
- clean-code-mastery: 모듈화, 의존성 관리 원칙 공유
- api-first-design: API 패키지 구조 참조
- code-reviewer: 의존성 방향 검증에 활용
```

---

## 10. 구조적 허점 및 개선점

### 10.1 현재 허점

```yaml
허점_1_버전_관리_가이드_부재:
  문제: "패키지 버전 전략 없음"
  예시: "packages/shared가 1.0.0? 2.0.0?"
  영향: "버전 충돌, 호환성 문제"
  개선안: "Semantic Versioning + Changesets 가이드"

허점_2_대규모_모노레포_확장성:
  문제: "100+ 패키지 시나리오 미고려"
  예시: "구글 규모의 모노레포는?"
  영향: "빌드 시간 폭발, CI 병목"
  개선안: "Code Owners, Affected 패키지만 빌드"

허점_3_마이크로서비스_전환_가이드:
  문제: "모노레포 → 마이크로서비스 분리 방법 없음"
  예시: "팀이 커지면 분리해야 할 때"
  영향: "마이그레이션 계획 부재"
  개선안: "분리 기준, 단계별 가이드"

허점_4_팀_경계_관리:
  문제: "여러 팀이 같은 패키지 수정 시 충돌"
  예시: "팀A가 shared 수정 → 팀B 빌드 깨짐"
  영향: "책임 소재 불명확"
  개선안: "CODEOWNERS, PR 리뷰 규칙"
```

### 10.2 개선 제안

```yaml
제안_1_의존성_시각화:
  현재: "텍스트로만 규칙 설명"
  제안: |
    자동 의존성 그래프 생성
    순환 의존성 시각적 경고
  도구: "nx graph, dependency-cruiser"

제안_2_영향_범위_분석:
  현재: "변경 시 전체 빌드"
  제안: |
    변경된 패키지만 빌드
    영향받는 패키지 자동 감지
  도구: "turbo --filter=[changed]"

제안_3_패키지_건강도_대시보드:
  현재: "수동 확인"
  제안: |
    각 패키지 상태 대시보드
    - 테스트 커버리지
    - 의존성 outdated
    - 순환 의존성 여부

제안_4_자동_패키지_생성:
  현재: "수동으로 폴더/파일 생성"
  제안: |
    CLI로 패키지 scaffolding
    pnpm create @company/package my-package
```

---

## 11. 핵심 용어 사전

| 용어 | 설명 | 비유 |
|------|------|------|
| **Monorepo** | 단일 저장소에 여러 프로젝트 | 아파트 단지 |
| **Workspace** | 패키지들의 논리적 그룹 | 단지 내 구역 |
| **Package** | 독립적인 코드 모듈 | 각 동 |
| **Shared** | 공유 코드 패키지 | 공용 시설 |
| **Dependency** | 패키지 간 의존 관계 | 배관, 전선 |
| **Circular Dependency** | 순환 의존성 | 물이 거꾸로 흐름 |
| **Turborepo** | 모노레포 빌드 도구 | 단지 관리 시스템 |
| **pnpm** | 패키지 매니저 | 자재 조달 업체 |
| **Scope** | 패키지 이름 접두사 (@company/) | 단지 이름 |
| **Entry Point** | 패키지 진입점 | 정문 |

---

## 12. 요약

```
┌────────────────────────────────────────────────────────────┐
│             Monorepo Architect 핵심 요약                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🎯 목적: 여러 프로젝트를 하나의 저장소에서 효율적 관리     │
│                                                            │
│  🔍 주요 기능:                                              │
│     1. 표준 폴더 구조 가이드                               │
│     2. 의존성 방향 규칙 검증                               │
│     3. 패키지 생성 템플릿                                  │
│     4. Turborepo/pnpm 설정 가이드                         │
│                                                            │
│  ⚡ 5대 원칙:                                               │
│     1. Shared First (공유 우선)                            │
│     2. Dependency Direction (의존성 방향)                  │
│     3. Independent Deployability (독립 배포)               │
│     4. Consistent Tooling (일관된 도구)                    │
│     5. Clear Boundaries (명확한 경계)                      │
│                                                            │
│  🔗 연관 스킬: clean-code-mastery, api-first-design        │
│                                                            │
│  ⚠️ 허점: 버전 관리 부재, 대규모 확장성 미고려             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

**문서 작성일**: 2025-12-10
**다음 업데이트 예정**: 버전 관리 전략, 대규모 모노레포 가이드 추가 시
