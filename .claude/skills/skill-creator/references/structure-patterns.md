# 구조화 패턴 상세 가이드

> 스킬의 구조는 Progressive Disclosure를 지원해야 합니다.

---

## Pattern 1: High-Level Guide with References

**용도**: 다양한 기능이 있는 스킬

```markdown
---
name: pdf-processing
description: "Extracts text from PDFs, fills forms. Use when working with PDFs."
---

# PDF Processing

## Quick start

Extract text with pdfplumber:
```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

## Advanced features

**Form filling**: See [FORMS.md](FORMS.md) for complete guide
**API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
**Examples**: See [EXAMPLES.md](EXAMPLES.md) for common patterns
```

**핵심**: SKILL.md는 빠른 시작, 상세는 별도 파일

---

## Pattern 2: Domain-Specific Organization

**용도**: 여러 도메인을 다루는 스킬 (토큰 효율화)

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue, billing)
    ├── sales.md (pipeline, accounts)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns)
```

```markdown
# BigQuery Data Analysis

## Available datasets

**Finance**: Revenue, ARR, billing → See [reference/finance.md](reference/finance.md)
**Sales**: Opportunities, pipeline → See [reference/sales.md](reference/sales.md)
**Product**: API usage, features → See [reference/product.md](reference/product.md)
**Marketing**: Campaigns, email → See [reference/marketing.md](reference/marketing.md)

## Quick search

```bash
grep -i "revenue" reference/finance.md
grep -i "pipeline" reference/sales.md
```
```

**핵심**: 사용자가 sales를 묻으면 sales.md만 로드됨

---

## Pattern 3: Conditional Details

**용도**: 기본 vs 고급 사용자

```markdown
# DOCX Processing

## Creating documents

Use docx-js for new documents. See [DOCX-JS.md](DOCX-JS.md).

## Editing documents

For simple edits, modify the XML directly.

**For tracked changes**: See [REDLINING.md](REDLINING.md)
**For OOXML details**: See [OOXML.md](OOXML.md)
```

**핵심**: 고급 기능은 필요할 때만 로드

---

## Pattern 4: With Executable Scripts

**용도**: 결정론적 작업이 필요한 스킬

```
pdf-skill/
├── SKILL.md
├── FORMS.md
├── reference.md
└── scripts/
    ├── analyze_form.py
    ├── fill_form.py
    └── validate.py
```

```markdown
# PDF Form Processing

## Utility scripts

**analyze_form.py**: Extract form fields

```bash
python scripts/analyze_form.py input.pdf > fields.json
```

**fill_form.py**: Apply values to form

```bash
python scripts/fill_form.py input.pdf fields.json output.pdf
```

**validate.py**: Check field mapping

```bash
python scripts/validate.py fields.json
```
```

**핵심**: 스크립트는 실행만 함 (컨텍스트 미소비)

---

## 참조 깊이 규칙

### ✅ 올바름: 1단계 참조

```
SKILL.md
├── → reference.md     (직접 참조)
├── → examples.md      (직접 참조)
└── → templates/       (직접 참조)
```

### ❌ 피하기: 깊은 참조

```
SKILL.md
└── → advanced.md
    └── → details.md       (2단계 - 불완전 로드!)
        └── → nested.md    (3단계 - 거의 로드 안 됨)
```

---

## 긴 참조 파일 구조

100줄 이상 파일은 목차 포함:

```markdown
# API Reference

## Contents
- Authentication and setup
- Core methods (create, read, update, delete)
- Advanced features (batch operations, webhooks)
- Error handling patterns
- Code examples

## Authentication and setup
...
```

---

## 파일 명명 규칙

```yaml
권장:
  - form_validation_rules.md    # 내용 설명
  - api_reference.md
  - common_examples.md

피하기:
  - doc1.md                     # 내용 불명
  - file2.md
  - temp.md
```
