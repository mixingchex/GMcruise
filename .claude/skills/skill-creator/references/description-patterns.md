# Description 작성 패턴 & 예제

> Description은 스킬 발견의 핵심입니다. Claude가 100개 이상의 스킬 중에서 선택할 때 사용합니다.

---

## 필수 규칙

### 1. 3인칭 사용 (시스템 프롬프트에 주입됨)

```yaml
# ✅ 올바름
description: "Processes Excel files and generates reports"
description: "Analyzes code for security vulnerabilities"

# ❌ 피하기
description: "I can help you process Excel files"
description: "You can use this to analyze code"
```

### 2. What + When 포함

```yaml
# ✅ 완전함
description: "Extracts text from PDF files, fills forms, merges documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction."

# ❌ 불완전함
description: "Helps with documents"
description: "Processes data"
```

### 3. 1024자 이하, XML 태그 금지

---

## 도메인별 패턴

### 문서 처리

```yaml
# PDF
description: "Extracts text and tables from PDF files, fills forms, merges documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction."

# Excel
description: "Analyzes Excel spreadsheets, creates pivot tables, generates charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files."

# HWP
description: "Reads and modifies HWP/HWPX files, replaces text patterns. Use when working with Korean Hangul documents or .hwp files."
```

### 개발 도구

```yaml
# Git
description: "Generates descriptive commit messages by analyzing git diffs. Use when the user asks for help writing commit messages or reviewing staged changes."

# Code Review
description: "Reviews code for quality, security, and best practices. Use when analyzing code, checking for bugs, or improving code quality."

# Testing
description: "Generates unit tests and integration tests for code. Use when creating tests, improving coverage, or implementing TDD."
```

### 데이터 분석

```yaml
# SQL/BigQuery
description: "Writes and optimizes SQL queries for BigQuery. Use when working with BigQuery, writing SQL, or analyzing large datasets."

# Data Visualization
description: "Creates charts and visualizations from data. Use when visualizing data, creating dashboards, or generating reports with charts."
```

---

## 키워드 포함 전략

### 패턴: 동작 + 대상 + 트리거

```yaml
# 구조
description: "[동작들]. Use when [트리거 조건] or when [사용자 언급 키워드]."

# 예시
description: "Converts Markdown to HTML, PPTX, PDF. Use when converting documents or when the user mentions markdown, slides, or presentations."
```

### 한국어 + 영어 혼합 (한국 사용자용)

```yaml
description: "**CODE REVIEWER** - '리뷰해', '검토해', '피드백', 'review', 'check' 요청 시 자동 발동. Quality Gate, Code Smell, 복잡도 분석 제공."
```

---

## 피해야 할 패턴

| 패턴 | 문제 | 개선 |
|------|------|------|
| "Helps with X" | 모호함 | "Processes X, generates Y" |
| "A tool for..." | 수동적 | 직접 동작 서술 |
| 기능만 나열 | When 누락 | "Use when..." 추가 |
| 너무 김 | 핵심 희석 | 주요 기능 3-4개만 |

---

## 실전 예제

### Before/After

```yaml
# ❌ Before
description: "This is a skill that helps users with their PDF documents by providing various functionalities for processing and manipulating PDF files."

# ✅ After
description: "Extracts text from PDFs, fills forms, merges documents. Use when working with PDF files or document extraction."
```

```yaml
# ❌ Before
description: "Code review tool"

# ✅ After
description: "Reviews code for bugs, security issues, and best practices. Provides quality scores and improvement suggestions. Use when reviewing code or checking code quality."
```
