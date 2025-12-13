---
name: ai-response-validator
description: "AI 응답 검증. 'AI 응답 검증', 'AI 출력 검증', 'LLM 출력', 'AI 결과 확인' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
---

# N3: AI Response Validator Agent

## 역할
AI 응답의 품질, 안전성, 형식 검증

## 검증 레이어

```yaml
형식_검증:
  - "JSON 파싱 가능"
  - "필수 필드 존재"
  - "데이터 타입 일치"

내용_검증:
  - "할루시네이션 감지"
  - "사실 확인"
  - "논리적 일관성"

안전_검증:
  - "유해 콘텐츠 필터"
  - "PII 노출 방지"
  - "프롬프트 인젝션 감지"
```

## 형식 검증

```typescript
// lib/ai/validators/format-validator.ts
import { z } from 'zod';

// JSON 응답 검증
export function validateJsonResponse<T>(
  response: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    // JSON 파싱
    const parsed = JSON.parse(response);

    // 스키마 검증
    const result = schema.safeParse(parsed);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: result.error.issues.map(i => i.message).join(', '),
      };
    }
  } catch (e) {
    return { success: false, error: 'Invalid JSON format' };
  }
}

// 사용 예시
const classificationSchema = z.object({
  category: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

const result = validateJsonResponse(aiResponse, classificationSchema);
```

## 할루시네이션 감지

```typescript
// lib/ai/validators/hallucination-detector.ts

interface HallucinationCheck {
  type: 'fact' | 'reference' | 'consistency';
  claim: string;
  verified: boolean;
  source?: string;
}

// 팩트 체크 (외부 소스와 대조)
export async function checkFacts(
  response: string,
  knowledgeBase: string[]
): Promise<HallucinationCheck[]> {
  const claims = extractClaims(response);
  const results: HallucinationCheck[] = [];

  for (const claim of claims) {
    // 지식 베이스에서 검증
    const isVerified = knowledgeBase.some(kb =>
      kb.toLowerCase().includes(claim.toLowerCase())
    );

    results.push({
      type: 'fact',
      claim,
      verified: isVerified,
    });
  }

  return results;
}

// 내부 일관성 검사
export async function checkConsistency(
  response: string
): Promise<{ consistent: boolean; contradictions: string[] }> {
  // 저비용 모델로 일관성 검사
  const check = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `다음 텍스트에서 모순되는 내용을 찾으세요.
JSON 형식으로 응답: { "contradictions": ["모순1", "모순2"] }
모순이 없으면: { "contradictions": [] }`,
      },
      { role: 'user', content: response },
    ],
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(check.choices[0].message.content || '{}');
  return {
    consistent: result.contradictions.length === 0,
    contradictions: result.contradictions,
  };
}

// 숫자/날짜 검증
export function validateNumericClaims(response: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // 날짜 범위 검증
  const dates = response.match(/\d{4}[-./]\d{2}[-./]\d{2}/g) || [];
  for (const date of dates) {
    const d = new Date(date);
    if (d > new Date()) {
      issues.push(`미래 날짜 발견: ${date}`);
    }
    if (d.getFullYear() < 1900) {
      issues.push(`비정상 날짜: ${date}`);
    }
  }

  // 비율 검증
  const percentages = response.match(/\d+(\.\d+)?%/g) || [];
  for (const pct of percentages) {
    const value = parseFloat(pct);
    if (value > 100) {
      issues.push(`100% 초과 비율: ${pct}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
```

## 안전성 검증

```typescript
// lib/ai/validators/safety-validator.ts

interface SafetyCheck {
  safe: boolean;
  issues: {
    type: 'harmful' | 'pii' | 'injection' | 'bias';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
}

// PII 감지
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4})/g,
  ssn: /\d{6}[-\s]?\d{7}/g, // 주민번호
  creditCard: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
};

export function detectPII(text: string): {
  hasPII: boolean;
  findings: { type: string; count: number }[];
} {
  const findings: { type: string; count: number }[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      findings.push({ type, count: matches.length });
    }
  }

  return {
    hasPII: findings.length > 0,
    findings,
  };
}

// 프롬프트 인젝션 감지
const INJECTION_PATTERNS = [
  /ignore.*previous.*instructions/i,
  /disregard.*above/i,
  /new instructions/i,
  /you are now/i,
  /act as/i,
  /pretend to be/i,
  /jailbreak/i,
];

export function detectPromptInjection(text: string): {
  detected: boolean;
  patterns: string[];
} {
  const detected: string[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      detected.push(pattern.source);
    }
  }

  return {
    detected: detected.length > 0,
    patterns: detected,
  };
}

// 종합 안전성 검사
export async function validateSafety(response: string): Promise<SafetyCheck> {
  const issues: SafetyCheck['issues'] = [];

  // PII 검사
  const piiResult = detectPII(response);
  if (piiResult.hasPII) {
    issues.push({
      type: 'pii',
      description: `PII 감지: ${piiResult.findings.map(f => f.type).join(', ')}`,
      severity: 'high',
    });
  }

  // 인젝션 검사
  const injectionResult = detectPromptInjection(response);
  if (injectionResult.detected) {
    issues.push({
      type: 'injection',
      description: '프롬프트 인젝션 패턴 감지',
      severity: 'high',
    });
  }

  return {
    safe: issues.length === 0,
    issues,
  };
}
```

## 검증 파이프라인

```typescript
// lib/ai/validators/pipeline.ts

interface ValidationResult {
  valid: boolean;
  format: { valid: boolean; errors: string[] };
  content: { valid: boolean; issues: string[] };
  safety: { safe: boolean; issues: string[] };
}

export async function validateAIResponse<T>(
  response: string,
  options: {
    schema?: z.ZodSchema<T>;
    checkFacts?: boolean;
    checkSafety?: boolean;
  }
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    format: { valid: true, errors: [] },
    content: { valid: true, issues: [] },
    safety: { safe: true, issues: [] },
  };

  // 1. 형식 검증
  if (options.schema) {
    const formatResult = validateJsonResponse(response, options.schema);
    if (!formatResult.success) {
      result.format.valid = false;
      result.format.errors.push(formatResult.error);
      result.valid = false;
    }
  }

  // 2. 내용 검증
  if (options.checkFacts) {
    const consistency = await checkConsistency(response);
    if (!consistency.consistent) {
      result.content.valid = false;
      result.content.issues.push(...consistency.contradictions);
      result.valid = false;
    }

    const numericCheck = validateNumericClaims(response);
    if (!numericCheck.valid) {
      result.content.issues.push(...numericCheck.issues);
    }
  }

  // 3. 안전성 검증
  if (options.checkSafety) {
    const safetyCheck = await validateSafety(response);
    if (!safetyCheck.safe) {
      result.safety.safe = false;
      result.safety.issues = safetyCheck.issues.map(i => i.description);
      result.valid = false;
    }
  }

  return result;
}
```

## 출력 형식

```markdown
## ✅ AI 응답 검증 결과

### 검증 대상
```
[AI 응답 내용 일부]
```

### 검증 결과

| 영역 | 상태 | 상세 |
|------|------|------|
| 형식 | ✅ 통과 | JSON 유효, 스키마 일치 |
| 내용 | ⚠️ 주의 | 1건의 잠재적 이슈 |
| 안전 | ✅ 통과 | PII/인젝션 없음 |

---

### 발견된 이슈

#### 내용 검증
| 유형 | 설명 | 심각도 |
|------|------|--------|
| 수치 이상 | "150% 증가" - 검증 필요 | 낮음 |

#### 권장 조치
1. 수치 데이터 원본 소스 확인
2. 없음

---

### 검증 통계

| 항목 | 값 |
|------|-----|
| 응답 길이 | 1,250 토큰 |
| 검증 시간 | 0.3초 |
| 신뢰도 점수 | 92% |
```

## 트리거 키워드
- "AI 응답 검증", "AI 출력 검증"
- "LLM 출력 확인", "AI 결과 검증"
- "할루시네이션", "팩트 체크"
