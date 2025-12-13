# Idea Factory Orchestrator - Pipeline Architecture

## Overview

6단계 에이전틱 파이프라인의 상세 아키텍처 문서입니다.

## Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        IDEA FACTORY PIPELINE v1.0                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  INPUT: 프로젝트 디렉토리 경로                                             │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│                                      ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 1: Project Analyzer                                                │   │
│  │  ─────────────────────────                                                │   │
│  │  • 코드베이스 구조 분석                                                    │   │
│  │  • 기술 스택 파악                                                         │   │
│  │  • 아키텍처 역공학                                                        │   │
│  │  • 비즈니스 컨텍스트 추론                                                  │   │
│  │                                                                            │   │
│  │  OUTPUT: PROJECT_ANALYSIS_REPORT.md                                       │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│                                      ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 2: Category Classifier                                             │   │
│  │  ────────────────────────────                                             │   │
│  │  • 기회 영역 식별                                                         │   │
│  │  • 카테고리 분류 (5개 영역)                                               │   │
│  │  • 가중치 평가 (비즈니스/구현/시장/기술/리스크)                            │   │
│  │  • 전문가 에이전트 매칭                                                   │   │
│  │                                                                            │   │
│  │  OUTPUT: CATEGORY_CLASSIFICATION.md                                       │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│                    ┌─────────────────┼─────────────────┐                        │
│                    │                 │                 │                        │
│                    ▼                 ▼                 ▼                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 3: Idea Specialists (병렬 실행)                                    │   │
│  │  ─────────────────────────────────────                                    │   │
│  │                                                                            │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────┐  │   │
│  │  │    UX      │ │  Feature   │ │Monetization│ │    Tech    │ │ Growth │  │   │
│  │  │ Specialist │ │ Specialist │ │ Specialist │ │ Architect  │ │Speciali│  │   │
│  │  │   (03a)    │ │   (03b)    │ │   (03c)    │ │   (03d)    │ │  (03e) │  │   │
│  │  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └───┬────┘  │   │
│  │        │              │              │              │            │       │   │
│  │        ▼              ▼              ▼              ▼            ▼       │   │
│  │  IDEA_PROPOSAL  IDEA_PROPOSAL  IDEA_PROPOSAL  IDEA_PROPOSAL  IDEA_PROP  │   │
│  │     _UX.md       _FEATURE.md   _MONETIZE.md     _TECH.md     _GROWTH.md │   │
│  │                                                                            │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│                    ┌─────────────────┴─────────────────┐                        │
│                    │ (모든 아이디어 기획서 수집)        │                        │
│                    └─────────────────┬─────────────────┘                        │
│                                      ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 4: Planning Director                                               │   │
│  │  ─────────────────────────────                                            │   │
│  │  • 모든 아이디어 통합                                                     │   │
│  │  • RICE/ICE/MoSCoW 우선순위화                                            │   │
│  │  • 시너지/의존성/충돌 분석                                                │   │
│  │  • 리소스 계획 수립                                                       │   │
│  │  • 실행 로드맵 작성                                                       │   │
│  │                                                                            │   │
│  │  OUTPUT: CONSOLIDATED_PLANNING_DOC.md                                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│                                      ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 5: Engineering Lead PRD                                            │   │
│  │  ────────────────────────────────                                         │   │
│  │  • 상세 PRD 작성                                                          │   │
│  │  • 기술 명세 (아키텍처/데이터/API)                                        │   │
│  │  • User Stories & Acceptance Criteria                                     │   │
│  │  • 스프린트 계획                                                          │   │
│  │  • 테스트/배포 전략                                                       │   │
│  │                                                                            │   │
│  │  OUTPUT: PRD_DOCUMENT.md                                                  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│                                      ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  4-TEAM REVIEW: Quality Validation                                        │   │
│  │  ─────────────────────────────────                                        │   │
│  │                                                                            │   │
│  │  ┌────────────┐    ┌────────────┐    ┌────────────┐                       │   │
│  │  │  RED TEAM  │    │ BLUE TEAM  │    │PURPLE TEAM │                       │   │
│  │  │  (보안/    │    │  (개선/    │    │  (통합/    │                       │   │
│  │  │  리스크)   │ →  │  리팩토링) │ →  │  조율)     │                       │   │
│  │  └────────────┘    └────────────┘    └────────────┘                       │   │
│  │                                                                            │   │
│  │  • CWE Top 25 보안 검증 (Red)                                             │   │
│  │  • Martin Fowler 리팩토링 (Blue)                                          │   │
│  │  • FMEA/SQALE 종합 (Purple)                                               │   │
│  │                                                                            │   │
│  │  OUTPUT: QUALITY_REVIEW_REPORT.md                                         │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│                                      ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  STAGE 6: CTO Decision Maker                                              │   │
│  │  ──────────────────────────────                                           │   │
│  │  • 전체 프로세스 검토                                                     │   │
│  │  • 전략 정합성 평가                                                       │   │
│  │  • 리소스/리스크/ROI 분석                                                 │   │
│  │  • GO / CONDITIONAL GO / DEFER / NO GO 결정                              │   │
│  │  • 리소스 배분 확정                                                       │   │
│  │  • 실행 계획 승인                                                         │   │
│  │                                                                            │   │
│  │  OUTPUT: CTO_DECISION_DOCUMENT.md                                         │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│                                      ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  FINAL OUTPUT                                                             │   │
│  │  ────────────                                                             │   │
│  │  • 승인된 실행 계획                                                       │   │
│  │  • 확정된 리소스 배분                                                     │   │
│  │  • 명확한 마일스톤                                                        │   │
│  │  • 성공 기준                                                              │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Agent Directory

| Stage | Agent | File | Role |
|:-----:|-------|------|------|
| 1 | Project Analyzer | `01-project-analyzer.md` | 코드베이스 심층 분석 |
| 2 | Category Classifier | `02-category-classifier.md` | 기회 영역 분류 |
| 3a | UX Specialist | `03a-ux-specialist.md` | UX/UI 개선 기획 |
| 3b | Feature Specialist | `03b-feature-specialist.md` | 신규 기능 기획 |
| 3c | Monetization Specialist | `03c-monetization-specialist.md` | 수익화 전략 |
| 3d | Tech Architect | `03d-tech-architect.md` | 기술 현대화 |
| 3e | Growth Specialist | `03e-growth-specialist.md` | 성장 전략 |
| 4 | Planning Director | `04-planning-director.md` | 통합/우선순위화 |
| 5 | Engineering Lead | `05-engineering-lead.md` | PRD 작성 |
| Review | Red/Blue/Purple Team | (기존 에이전트 활용) | 품질 검증 |
| 6 | CTO Decision Maker | `06-cto-decision-maker.md` | 최종 결정 |

## Data Flow

```
INPUT
  │
  ├──▶ Stage 1: Glob, Grep, Read tools
  │        │
  │        └──▶ PROJECT_ANALYSIS_REPORT.md
  │                    │
  │                    ▼
  ├──▶ Stage 2: Analysis, Classification
  │        │
  │        └──▶ CATEGORY_CLASSIFICATION.md
  │                    │
  │        ┌───────────┼───────────┬───────────┬───────────┐
  │        ▼           ▼           ▼           ▼           ▼
  │     UX Ideas   Feature    Monetize     Tech       Growth
  │        │        Ideas      Ideas      Ideas       Ideas
  │        │           │          │          │           │
  │        └───────────┴──────────┴──────────┴───────────┘
  │                           │
  │                           ▼
  ├──▶ Stage 4: Consolidation
  │        │
  │        └──▶ CONSOLIDATED_PLANNING_DOC.md
  │                    │
  │                    ▼
  ├──▶ Stage 5: PRD Generation
  │        │
  │        └──▶ PRD_DOCUMENT.md
  │                    │
  │                    ▼
  ├──▶ 4-Team Review
  │        │
  │        └──▶ QUALITY_REVIEW_REPORT.md
  │                    │
  │                    ▼
  └──▶ Stage 6: CTO Decision
           │
           └──▶ CTO_DECISION_DOCUMENT.md
                       │
                       ▼
                 FINAL OUTPUT
```

## Execution Modes

### Full Pipeline
```bash
# 전체 파이프라인 실행
"현재 프로젝트를 분석하고 아이디어 팩토리를 실행해줘"
```

### Stage-by-Stage
```bash
# Stage 1만
"프로젝트 분석 보고서를 생성해줘"

# Stage 2만
"카테고리 분류를 실행해줘"

# Stage 3 (병렬)
"아이디어 기획서를 생성해줘"

# Stage 4-6
"기획서를 종합하고 PRD 작성 후 최종 결정까지 진행해줘"
```

### Skip Review
```bash
# 4-Team Review 생략
"PRD 작성 후 바로 CTO 결정으로 진행해줘"
```

## Quality Gates

각 단계 사이에 품질 게이트 존재:

| Gate | Location | Criteria | Action on Fail |
|------|----------|----------|----------------|
| G1 | After Stage 1 | 분석 완전성 > 90% | 추가 분석 |
| G2 | After Stage 2 | 분류 정확도 > 85% | 재분류 |
| G3 | After Stage 3 | 아이디어 실현성 > 80% | 재기획 |
| G4 | After Stage 4 | 로드맵 실현성 > 85% | 재조정 |
| G5 | After Stage 5 | PRD 완성도 > 90% | 보완 |
| G6 | After Review | 품질 점수 > 80/100 | 재검토 |

## Integration with Existing Agents

기존 Red/Blue/Purple Team 에이전트와 통합:

```yaml
existing_agents:
  red_team:
    path: "/home/elon/.claude/agents/red-team-code-validator-v2.md"
    role: "보안/리스크 검증"

  blue_team:
    path: "/home/elon/.claude/agents/blue-team-code-enhancer-v2.md"
    role: "개선/리팩토링 제안"

  purple_team:
    path: "/home/elon/.claude/agents/purple-team-orchestrator-v2.md"
    role: "종합 조율"
```

## Customization Points

1. **카테고리 추가**: `02-category-classifier.md` 수정
2. **전문가 추가**: `agents/03x-*.md` 파일 추가
3. **우선순위 프레임워크**: `04-planning-director.md` 수정
4. **PRD 템플릿**: `05-engineering-lead.md` 수정
5. **결정 기준**: `06-cto-decision-maker.md` 수정

---

**Version**: 1.0
**Last Updated**: 2025-01
**Author**: Idea Factory Orchestrator
