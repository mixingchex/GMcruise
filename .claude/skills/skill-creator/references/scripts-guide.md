# 스크립트 작성 가이드

> 스크립트는 Claude가 컨텍스트에 로드하지 않고 직접 실행합니다.

---

## 핵심 원칙: Solve, Don't Punt

**문제를 직접 해결하고, Claude에게 떠넘기지 마세요**

```python
# ✅ Good - 에러를 직접 처리
def process_file(path):
    """Process a file, creating it if it doesn't exist."""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        print(f"File {path} not found, creating default")
        with open(path, 'w') as f:
            f.write('')
        return ''
    except PermissionError:
        print(f"Cannot access {path}, using default")
        return ''

# ❌ Bad - 에러를 Claude에게 떠넘김
def process_file(path):
    return open(path).read()  # 실패하면 Claude가 알아서 해결?
```

---

## 매직 넘버 금지

모든 상수에 이유를 설명하세요:

```python
# ✅ Good - 자체 문서화
# HTTP 요청은 보통 30초 내 완료됨
# 느린 연결을 고려한 타임아웃
REQUEST_TIMEOUT = 30

# 3회 재시도는 신뢰성과 속도의 균형점
# 대부분 간헐적 오류는 2번째에 해결됨
MAX_RETRIES = 3

# ❌ Bad - 매직 넘버
TIMEOUT = 47  # 왜 47?
RETRIES = 5   # 왜 5?
```

---

## 스크립트 문서화

```python
#!/usr/bin/env python3
"""
analyze_form.py - PDF 폼 필드 추출

Usage:
    python analyze_form.py input.pdf > fields.json

Output:
    {
        "field_name": {"type": "text", "x": 100, "y": 200},
        "signature": {"type": "sig", "x": 150, "y": 500}
    }

Dependencies:
    pip install pypdf
"""

import sys
import json
from pypdf import PdfReader

def main():
    if len(sys.argv) != 2:
        print("Usage: python analyze_form.py input.pdf", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    # ... 구현 ...

if __name__ == "__main__":
    main()
```

---

## 검증 스크립트 패턴

```python
#!/usr/bin/env python3
"""validate_fields.py - 필드 매핑 검증"""

import sys
import json

def validate(fields_path):
    with open(fields_path) as f:
        fields = json.load(f)
    
    errors = []
    warnings = []
    
    # 필수 필드 확인
    required = ["name", "date", "signature"]
    for field in required:
        if field not in fields:
            errors.append(f"Missing required field: {field}")
    
    # 타입 확인
    for name, props in fields.items():
        if "type" not in props:
            warnings.append(f"No type for field: {name}")
    
    # 결과 출력
    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    
    if warnings:
        print("WARNINGS:")
        for w in warnings:
            print(f"  - {w}")
    
    print("OK")
    sys.exit(0)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python validate_fields.py fields.json")
        sys.exit(1)
    validate(sys.argv[1])
```

---

## 실행 vs 참조 명확화

SKILL.md에서 의도를 명확히:

```markdown
# 실행하도록 지시
Run `python scripts/analyze_form.py` to extract fields

# 참조하도록 지시
See `scripts/analyze_form.py` for the extraction algorithm
```

대부분의 경우 **실행**이 더 효율적 (토큰 절약)

---

## 의존성 명시

```markdown
## Requirements

Install before using:
```bash
pip install pypdf pdfplumber
```

Or add to requirements.txt:
```
pypdf>=4.0.0
pdfplumber>=0.9.0
```
```

---

## 에러 메시지 상세화

Claude가 수정할 수 있도록 구체적으로:

```python
# ✅ Good - 구체적 에러
if field not in available_fields:
    print(f"Field '{field}' not found. Available: {', '.join(available_fields)}")

# ❌ Bad - 모호한 에러
if field not in available_fields:
    print("Field not found")
```

---

## 크로스 플랫폼 호환

```python
import os
from pathlib import Path

# ✅ Good - pathlib 사용
file_path = Path("scripts") / "helper.py"

# ❌ Bad - 하드코딩 경로
file_path = "scripts\helper.py"  # Windows only!
```
