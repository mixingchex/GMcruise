# 4-Team Review Integration Guide

## Overview

Idea Factory Orchestrator와 기존 Red/Blue/Purple Team 에이전트의 통합 가이드입니다.

## Team Roles in Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      4-TEAM REVIEW PROCESS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│    ┌──────────────────────────────────────────────────────────────┐     │
│    │                       PRD_DOCUMENT.md                         │     │
│    │                    (Stage 5 Output)                           │     │
│    └────────────────────────────┬─────────────────────────────────┘     │
│                                 │                                        │
│                                 ▼                                        │
│    ┌───────────────────────────────────────────────────────────────┐    │
│    │                                                                │    │
│    │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     │    │
│    │  │             │     │             │     │             │     │    │
│    │  │  RED TEAM   │────▶│  BLUE TEAM  │────▶│PURPLE TEAM  │     │    │
│    │  │             │     │             │     │             │     │    │
│    │  │ • CWE Top 25│     │ • 72 리팩토링│    │ • FMEA RPN  │     │    │
│    │  │ • CVSS Score│     │ • GoF 패턴  │     │ • SQALE TDI │     │    │
│    │  │ • SOLID 위반│     │ • Event Src │     │ • MoSCoW    │     │    │
│    │  │ • 50+ Smells│     │ • CQRS      │     │ • 로드맵    │     │    │
│    │  │             │     │             │     │             │     │    │
│    │  └─────┬───────┘     └─────┬───────┘     └─────┬───────┘     │    │
│    │        │                   │                   │              │    │
│    │        ▼                   ▼                   ▼              │    │
│    │   RED_REPORT.md      BLUE_REPORT.md     PURPLE_SUMMARY.md    │    │
│    │                                                                │    │
│    └────────────────────────────┬───────────────────────────────────┘    │
│                                 │                                        │
│                                 ▼                                        │
│    ┌───────────────────────────────────────────────────────────────┐    │
│    │                  QUALITY_REVIEW_REPORT.md                      │    │
│    │                  (Integrated Review)                           │    │
│    └───────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Agent File Locations

```yaml
red_team:
  file: "/home/elon/.claude/agents/red-team-code-validator-v2.md"
  description: "코드 보안 검증 | Red Team | CWE-100% CVSS Scoring | AST Pattern Detection"

blue_team:
  file: "/home/elon/.claude/agents/blue-team-code-enhancer-v2.md"
  description: "코드 개선 제안 | Blue Team | 리팩토링/디자인패턴/성능최적화"

purple_team:
  file: "/home/elon/.claude/agents/purple-team-orchestrator-v2.md"
  description: "Red/Blue Team 조율 | Purple Team | FMEA/MoSCoW/RICE 우선순위화"
```

## Review Process

### Step 1: Red Team Review

**Input**: PRD_DOCUMENT.md (기술 명세 섹션)

**검토 항목**:
- CWE Top 25 취약점 검사
- CVSS v3.1 점수 산정
- SOLID 원칙 위반 검출
- 50+ 코드 스멜 탐지
- 동시성 이슈 검사
- 아키텍처 메트릭 (LCOM4, CBO)

**Output**: RED_TEAM_REVIEW.md
```markdown
# Red Team Code Review Report

## Executive Summary
- Overall Risk Level: [CRITICAL|HIGH|MEDIUM|LOW]
- Security Score: XX/100
- Total Issues: X (Critical: X, High: X, Medium: X, Low: X)

## Security Findings
### [CRITICAL-001] CWE-XX: Vulnerability Name
- Location: `path/to/file.py:line`
- CVSS Score: X.X
- Vulnerable Code: [code]
- Attack Vector: [example]
- Recommended Fix: [code]

## Code Quality Issues
...

## Architecture Metrics
...
```

### Step 2: Blue Team Review

**Input**:
- PRD_DOCUMENT.md
- RED_TEAM_REVIEW.md

**검토 항목**:
- Martin Fowler 72개 리팩토링 적용점
- GoF 23개 디자인 패턴 적용점
- Event Sourcing/CQRS 적용 가능성
- 코드 스멜 해결 방안
- 성능 최적화 제안

**Output**: BLUE_TEAM_REVIEW.md
```markdown
# Blue Team Enhancement Report

## 1. 레드팀 지적 사항 대응
| ID | 심각도 | 카테고리 | 요약 | 대응 상태 |
|----|--------|----------|------|-----------|

## 2. CRITICAL 이슈 대응
### R-001: [이슈명]
**즉시 조치**:
```code
# Before / After
```

**근본적 해결 옵션**:
- 옵션 A: [설명]
- 옵션 B: [설명]

## 3. 개선 로드맵
...
```

### Step 3: Purple Team Synthesis

**Input**:
- PRD_DOCUMENT.md
- RED_TEAM_REVIEW.md
- BLUE_TEAM_REVIEW.md

**검토 항목**:
- FMEA (RPN) 기반 리스크 우선순위화
- 기술부채 정량화 (SQALE/TDI)
- Red-Blue 충돌 조율
- MoSCoW 분류
- 통합 실행 로드맵

**Output**: PURPLE_TEAM_SUMMARY.md
```markdown
# Purple Team Executive Summary

## TL;DR
- **Primary Message**: [One sentence]
- **Key Win**: [One sentence]
- **Key Risk**: [One sentence]
- **Ask**: [One sentence]

## Status Dashboard
Security:     [GREEN/YELLOW/RED] ████████░░ 80%
Development:  [GREEN/YELLOW/RED] ██████████ 100%

## FMEA Summary
| Risk | S | O | D | RPN | Action |
|------|---|---|---|-----|--------|

## Technical Debt
SQALE Rating: [A-E]
TD Ratio: X%

## Integrated Action Plan
### MUST DO (즉시 실행)
...

### SHOULD DO (권장)
...

## Implementation Roadmap
...
```

## Integrated Output Format

최종 통합 리포트 구조:

```markdown
# QUALITY REVIEW REPORT

## Document Information
| 항목 | 내용 |
|------|------|
| PRD Version | X.X |
| Review Date | [date] |
| Reviewers | Red Team, Blue Team, Purple Team |

---

## Executive Summary

### Overall Quality Score
```
┌───────────────────────────────────────────────────────────┐
│                   QUALITY SCORECARD                        │
├────────────────────┬──────────┬──────────┬────────────────┤
│ Team               │ Score    │ Grade    │ Status         │
├────────────────────┼──────────┼──────────┼────────────────┤
│ Security (Red)     │ XX/100   │ [A-F]    │ [PASS/FAIL]    │
│ Quality (Blue)     │ XX/100   │ [A-F]    │ [PASS/FAIL]    │
│ Integration (Purple)│ XX/100  │ [A-F]    │ [PASS/FAIL]    │
├────────────────────┼──────────┼──────────┼────────────────┤
│ TOTAL              │ XX/100   │ [A-F]    │ [PASS/FAIL]    │
└────────────────────┴──────────┴──────────┴────────────────┘
```

### Critical Findings
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

### Recommendation
**[PROCEED / PROCEED WITH CONDITIONS / HOLD / REJECT]**

---

## Part 1: Security Review (Red Team)

[RED_TEAM_REVIEW.md 내용]

---

## Part 2: Enhancement Review (Blue Team)

[BLUE_TEAM_REVIEW.md 내용]

---

## Part 3: Integration Summary (Purple Team)

[PURPLE_TEAM_SUMMARY.md 내용]

---

## Part 4: Consolidated Action Items

### Immediate Actions (P0)
| # | Action | Owner | Deadline |
|:-:|--------|:-----:|:--------:|

### Short-term Actions (P1)
| # | Action | Owner | Deadline |
|:-:|--------|:-----:|:--------:|

### Long-term Actions (P2)
| # | Action | Owner | Target |
|:-:|--------|:-----:|:------:|

---

## Appendix

### A. Review Methodology
- Red Team: CWE Top 25, CVSS v3.1
- Blue Team: Martin Fowler, GoF, SOLID
- Purple Team: FMEA, SQALE, MoSCoW

### B. References
- [참조 문서들]
```

## Execution

### Full 4-Team Review
```python
# Task tool을 사용하여 순차 실행

# Step 1: Red Team
Task(
    prompt="PRD 문서를 Red Team으로 보안 검토해줘",
    subagent_type="red-team-code-validator"
)

# Step 2: Blue Team
Task(
    prompt="Red Team 리뷰를 반영하여 Blue Team 개선안 작성해줘",
    subagent_type="blue-team-code-enhancer"
)

# Step 3: Purple Team
Task(
    prompt="Red/Blue Team 결과를 Purple Team으로 종합해줘",
    subagent_type="purple-team-orchestrator"
)
```

### Quick Review (Purple Only)
```python
# Purple Team만 사용하여 빠른 검토
Task(
    prompt="PRD 문서를 빠르게 품질 검토해줘",
    subagent_type="purple-team-orchestrator"
)
```

## Quality Gates

| Gate | Condition | Action |
|------|-----------|--------|
| Security | Score < 70 | HOLD - 보안 이슈 해결 필요 |
| Quality | Score < 60 | HOLD - 품질 개선 필요 |
| Integration | Score < 70 | REVIEW - Purple Team 재검토 |
| Total | Score < 70 | REJECT - 전체 재작업 |

## Customization

### 검토 기준 조정
`/home/elon/.claude/agents/` 폴더의 각 팀 에이전트 파일 수정

### 새 검토 팀 추가
1. 새 에이전트 파일 생성
2. SKILL.md의 4-Team Review 섹션 업데이트
3. 통합 리포트 템플릿 수정

---

**Version**: 1.0
**Compatibility**: Red Team v3.0, Blue Team v3.0, Purple Team v2.0
