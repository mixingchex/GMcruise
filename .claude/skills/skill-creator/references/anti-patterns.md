# 피해야 할 패턴 (Anti-Patterns)

> 스킬 작성 시 흔히 하는 실수와 해결법

---

## 1. Windows 경로 사용

```yaml
# ❌ 피하기
scripts\helper.py
reference\guide.md

# ✅ 올바름 (모든 플랫폼 호환)
scripts/helper.py
reference/guide.md
```

**이유**: Windows 백슬래시는 Unix에서 오류 발생

---

## 2. 너무 많은 옵션 제시

```markdown
# ❌ 피하기 - 혼란
"You can use pypdf, or pdfplumber, or PyMuPDF, or pdf2image, or..."

# ✅ 올바름 - 기본값 + 대안
"Use pdfplumber for text extraction:
```python
import pdfplumber
```

For scanned PDFs requiring OCR, use pdf2image with pytesseract instead."
```

**이유**: Claude가 결정하기 어려움

---

## 3. 깊은 참조 체인

```markdown
# ❌ 피하기 - 불완전 로드
SKILL.md → advanced.md → details.md → nested.md

# ✅ 올바름 - 1단계 참조만
SKILL.md
├── → reference.md
├── → examples.md
└── → templates/
```

**이유**: 2단계 이상은 `head -100`으로만 읽힐 수 있음

---

## 4. 시간 의존 정보

```markdown
# ❌ 피하기 - 구식화됨
"If you're doing this before August 2025, use the old API.
After August 2025, use the new API."

# ✅ 올바름 - Old Patterns 섹션
## Current method
Use the v2 API endpoint: api.example.com/v2/messages

## Old patterns
<details>
<summary>Legacy v1 API (deprecated 2025-08)</summary>
The v1 API used: api.example.com/v1/messages
This endpoint is no longer supported.
</details>
```

---

## 5. 모호한 이름

```yaml
# ❌ 피하기
name: helper
name: utils
name: tools
name: stuff

# ✅ 올바름
name: processing-pdfs
name: analyzing-code
name: generating-tests
```

**이유**: 발견이 어려움

---

## 6. 과도한 설명

```markdown
# ❌ 피하기 - 150 토큰
## PDF 텍스트 추출
PDF(Portable Document Format)는 텍스트, 이미지 등을 포함하는 파일 형식입니다.
PDF에서 텍스트를 추출하려면 라이브러리가 필요합니다.
pdfplumber를 추천합니다. 설치 방법은...

# ✅ 올바름 - 50 토큰
## PDF 텍스트 추출
```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
```

**이유**: Claude는 이미 PDF가 뭔지 앎

---

## 7. 1인칭/2인칭 Description

```yaml
# ❌ 피하기
description: "I can help you process Excel files"
description: "You can use this to analyze code"

# ✅ 올바름 (3인칭)
description: "Processes Excel files and generates reports"
description: "Analyzes code for security vulnerabilities"
```

**이유**: 시스템 프롬프트에 주입됨

---

## 8. 일관성 없는 용어

```markdown
# ❌ 피하기 - 혼란
- "API endpoint" / "URL" / "API route" / "path"
- "field" / "box" / "element" / "control"
- "extract" / "pull" / "get" / "retrieve"

# ✅ 올바름 - 일관성
- 항상 "API endpoint"
- 항상 "field"
- 항상 "extract"
```

---

## 9. 에러를 Claude에게 떠넘기기

```python
# ❌ 피하기
def process_file(path):
    return open(path).read()  # 실패하면?

# ✅ 올바름
def process_file(path):
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        print(f"File {path} not found, creating default")
        return ''
```

---

## 10. 패키지 가정

```markdown
# ❌ 피하기
"Use the pdf library to process the file."

# ✅ 올바름
"Install required package:
```bash
pip install pypdf
```

Then use it:
```python
from pypdf import PdfReader
```"
```

---

## 11. YAML 콜론 사용

```yaml
# ❌ 파싱 오류!
description: "**SKILL v1.0**: 설명..."

# ✅ 하이픈으로 대체
description: "**SKILL v1.0** - 설명..."
```

---

## 12. CRLF 줄바꿈 (Windows)

```bash
# 문제 확인
file SKILL.md
# CRLF가 보이면 변환 필요

# 해결
sed -i 's/\r$//' SKILL.md
# 또는
dos2unix SKILL.md
```

---

## 체크리스트

작성 후 확인:

- [ ] Windows 경로 없음 (모두 `/`)
- [ ] 옵션은 기본값 + 대안 1개만
- [ ] 참조는 1단계만
- [ ] 시간 의존 정보 없음
- [ ] 이름이 구체적
- [ ] 설명이 간결
- [ ] 3인칭 사용
- [ ] 용어 일관성
- [ ] 에러 직접 처리
- [ ] 패키지 명시
- [ ] YAML 콜론 없음
- [ ] LF 줄바꿈
