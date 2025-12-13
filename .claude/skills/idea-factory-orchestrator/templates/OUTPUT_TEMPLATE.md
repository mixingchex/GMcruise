# Idea Factory Output Templates

## Template Directory

각 Stage의 출력 템플릿 모음입니다.

---

## Stage 1: Project Analysis Report Template

```markdown
# PROJECT ANALYSIS REPORT

## Executive Summary
- **프로젝트명**: [name]
- **분석일**: [date]
- **기술 스택**: [primary stack]
- **성숙도**: [startup/growth/mature]
- **핵심 인사이트**:
  1. [인사이트 1]
  2. [인사이트 2]
  3. [인사이트 3]

---

## 1. 기술 스택 상세

### 1.1 핵심 기술
| 구분 | 기술 | 버전 | 비고 |
|------|------|------|------|
| Language | | | |
| Framework | | | |
| Database | | | |
| Infrastructure | | | |

### 1.2 의존성 분석
[의존성 트리 또는 주요 라이브러리 목록]

---

## 2. 아키텍처 분석

### 2.1 디렉토리 구조
```
[트리 구조]
```

### 2.2 컴포넌트 계층도
[다이어그램]

### 2.3 API 엔드포인트
| Method | Path | Handler | 설명 |
|--------|------|---------|------|

---

## 3. 기능 현황

### 3.1 페이지/화면 목록
| 경로 | 기능 | 컴포넌트 |
|------|------|----------|

### 3.2 핵심 비즈니스 로직
1. [로직 1]
2. [로직 2]

---

## 4. 코드 품질 평가

### 4.1 품질 스코어카드
| 항목 | 점수 | 등급 |
|------|------|------|
| 테스트 커버리지 | XX% | [A-F] |
| 코드 복잡도 | X | [A-F] |

---

## 5. 비즈니스 컨텍스트

### 5.1 타겟 사용자 (추론)
- Primary: [페르소나 1]
- Secondary: [페르소나 2]

### 5.2 핵심 가치 제안
> "[가치 제안]"

---

## 6. 아이디어 도출을 위한 핵심 인사이트

### 기회 영역
1. **[기회 1]**: [설명]
2. **[기회 2]**: [설명]

### 리스크/제약
1. **[리스크 1]**: [설명]

---

**분석 완료**: [timestamp]
**분석가**: Project Analyzer v1.0
```

---

## Stage 2: Category Classification Template

```markdown
# CATEGORY CLASSIFICATION REPORT

## Executive Summary
- **분석 대상 프로젝트**: [name]
- **총 식별 카테고리**: X개
- **최우선 집중 영역**: [category]

---

## 1. 카테고리별 기회 점수

### 종합 순위표
| 순위 | 카테고리 | 총점 | 비즈니스 | 구현용이 | 시장수요 | 기술적합 | 리스크 |
|:----:|----------|:----:|:--------:|:--------:|:--------:|:--------:|:------:|

### 기회 매트릭스
[매트릭스 그림]

---

## 2. 전문가 에이전트 매칭

| 우선순위 | 에이전트 | 담당 카테고리 | 예상 아이디어 수 |
|:--------:|----------|--------------|:----------------:|

---

**분류 완료**: [timestamp]
**분류기**: Category Classifier v1.0
```

---

## Stage 3: Idea Proposal Template

```markdown
# IDEA PROPOSAL: [카테고리명]

## 아이디어 요약
> "[한 문장 요약]"

---

## 아이디어 목록

### [ID]-001: [아이디어명]

#### 문제 정의
**현재 상황**: [설명]
**사용자 불편**: [목록]
**영향 범위**: [범위]

#### 제안 솔루션
**솔루션 개요**: [설명]
**구현 상세**: [상세]

#### 예상 영향
| 지표 | 현재 | 목표 | 개선율 |
|------|------|------|--------|

#### 필요 리소스
- 인력: [명세]
- 기술: [명세]
- 비용: [예상]

#### 성공 지표 (KPI)
| KPI | 측정 방법 | 목표값 |
|-----|----------|--------|

#### 리스크 분석
| 리스크 | 확률 | 영향도 | 완화 전략 |
|--------|:----:|:------:|----------|

#### 실행 타임라인
[타임라인]

#### 우선순위 점수
| 항목 | 점수 (1-10) |
|------|:-----------:|
| RICE Score | X.X |

---

**기획 완료**: [timestamp]
**기획자**: [Specialist Name] v1.0
```

---

## Stage 4: Consolidated Planning Template

```markdown
# CONSOLIDATED PLANNING DOCUMENT

## Executive Summary

### TL;DR
- **총 수집 아이디어**: X개
- **권장 실행 아이디어**: X개
- **예상 총 투자**: $[X]K
- **예상 ROI**: X%

### Top 5 추천 아이디어
| 순위 | ID | 아이디어명 | RICE | 카테고리 |
|:----:|:--:|----------|:----:|:--------:|

---

## 1. 전체 아이디어 인벤토리

### 전체 RICE 스코어표
| ID | 카테고리 | 아이디어명 | R | I | C | E | RICE | MoSCoW |
|:--:|:--------:|----------|:-:|:-:|:-:|:-:|:----:|:------:|

---

## 2. 우선순위 분석

### MoSCoW 분류
#### MUST HAVE
| ID | 아이디어명 | RICE | 근거 |
|:--:|----------|:----:|------|

#### SHOULD HAVE / COULD HAVE / WON'T HAVE
[동일 구조]

---

## 3. 시너지 및 의존성 분석
[다이어그램]

---

## 4. 리소스 계획
[테이블]

---

## 5. 실행 로드맵
[로드맵]

---

**기획 완료**: [timestamp]
**기획팀장**: Planning Director v1.0
```

---

## Stage 5: PRD Template

```markdown
# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Document Information
| 항목 | 내용 |
|------|------|
| **문서명** | [프로젝트명] PRD |
| **버전** | 1.0 |
| **작성일** | [date] |

---

# Part 1: Overview
## 1.1 Product Vision
## 1.2 Success Metrics
## 1.3 Stakeholders
## 1.4 Scope

---

# Part 2: User Requirements
## 2.1 Personas
## 2.2 User Stories
## 2.3 User Journey

---

# Part 3: Functional Requirements
## 3.1 Feature List
## 3.2 Feature Specifications
## 3.3 API Specifications

---

# Part 4: Non-Functional Requirements
## 4.1 Performance
## 4.2 Security
## 4.3 Scalability
## 4.4 Reliability

---

# Part 5: Technical Specifications
## 5.1 Architecture
## 5.2 Data Model
## 5.3 Tech Stack

---

# Part 6: Implementation Plan
## 6.1 Sprint Plan
## 6.2 Test Strategy
## 6.3 Deployment Strategy

---

# Part 7: Risk Assessment

---

**PRD 작성 완료**: [timestamp]
**작성자**: Engineering Lead v1.0
```

---

## Stage 6: CTO Decision Template

```markdown
# CTO DECISION DOCUMENT

## Document Summary
| 항목 | 내용 |
|------|------|
| **프로젝트** | [프로젝트명] |
| **결정일** | [date] |
| **결정** | **[GO / CONDITIONAL GO / DEFER / NO GO]** |

---

# Executive Decision

## TL;DR
### 결정
[결정 박스]

### 핵심 근거 (3줄)
1. [근거 1]
2. [근거 2]
3. [근거 3]

---

# Part 1: Decision Analysis
## 1.1 평가 스코어카드
## 1.2 전략 정합성 분석
## 1.3 리소스 실현성 분석
## 1.4 리스크 수용성 분석
## 1.5 ROI 분석
## 1.6 품질 준비도 분석

---

# Part 2: Decision & Directives
## 2.1 최종 결정
## 2.2 리소스 배분
## 2.3 일정 확정
## 2.4 성공 기준
## 2.5 거버넌스

---

# Part 3: Action Items
## 즉시 실행 항목
## 준비 필요 항목
## 모니터링 항목

---

**결정 완료**: [timestamp]
**결정권자**: CTO Decision Maker v1.0
```

---

## Quality Review Report Template

```markdown
# QUALITY REVIEW REPORT

## Quality Scorecard
| Team | Score | Grade | Status |
|------|:-----:|:-----:|:------:|
| Security (Red) | XX/100 | [A-F] | [PASS/FAIL] |
| Quality (Blue) | XX/100 | [A-F] | [PASS/FAIL] |
| Integration (Purple) | XX/100 | [A-F] | [PASS/FAIL] |
| **TOTAL** | **XX/100** | **[A-F]** | **[PASS/FAIL]** |

---

## Part 1: Security Review (Red Team)
[내용]

---

## Part 2: Enhancement Review (Blue Team)
[내용]

---

## Part 3: Integration Summary (Purple Team)
[내용]

---

## Part 4: Consolidated Action Items
[액션 아이템]

---

**리뷰 완료**: [timestamp]
**리뷰어**: Red/Blue/Purple Team
```

---

**Version**: 1.0
**Last Updated**: 2025-01
