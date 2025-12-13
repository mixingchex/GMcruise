# HWP Text Replacer Skill

**v2.0 상용 수준 HWP 텍스트 치환 엔진**

길이가 다른 텍스트로의 치환을 완벽하게 지원하는 HWP 문서 처리 스킬입니다.

## 핵심 발견: nChars bit 31 플래그

```
PARA_HEADER nChars (4바이트):
┌──────────┬────────────────────────┐
│ bit 31   │ bits 0-30              │
│ 컨트롤   │ 실제 문자 수           │
│ 플래그   │                        │
└──────────┴────────────────────────┘
```

**중요**: bit 31 플래그를 보존하지 않으면 파일 손상!

## 사용 예시

```python
from hwp_generator.core.hwp_text_replacer_v2 import HWPTextReplacerV2

# 기본 사용
replacer = HWPTextReplacerV2("template.hwp")
replacer.replace("{{이름}}", "홍길동")
replacer.replace("{{주소}}", "서울시 강남구 테헤란로 123")
replacer.save("output.hwp")

# 다중 치환
results = replacer.replace_all({
    "{{이름}}": "홍길동",
    "{{주소}}": "서울시 강남구",
    "{{날짜}}": "2024년 12월 1일"
})
```

## 기술 상세

### 레코드 태그
- 66: PARA_HEADER
- 67: PARA_TEXT
- 68: PARA_CHAR_SHAPE
- 69: PARA_LINE_SEG

### 압축
```python
# raw deflate (wbits=-15)
zlib.decompress(data, wbits=-15)
```

## 파일 위치
- 엔진: `hwp_generator/core/hwp_text_replacer_v2.py`
- 문서: `docs/HWP_LENGTH_CHANGE_DISCOVERY.md`
