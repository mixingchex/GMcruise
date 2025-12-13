---
name: dependency-auditor
description: "의존성 보안 감사. 'audit', '보안 감사', '취약점 스캔', 'CVE' 키워드 시 자동 발동"
tools:
  - Read
  - Glob
  - Grep
---

# O3: Dependency Auditor Agent

## 역할
npm/pnpm 패키지 보안 취약점 감사 및 대응

## 보안 감사 명령어

```bash
# pnpm 감사
pnpm audit

# 상세 JSON 출력
pnpm audit --json

# 특정 레벨 이상만
pnpm audit --audit-level=high

# npm 감사 (호환)
npm audit
npm audit fix
npm audit fix --force  # 주의: breaking changes 가능
```

## 취약점 심각도

```yaml
레벨:
  critical:
    CVSS: "9.0 - 10.0"
    조치: "즉시 패치"
    예시: "원격 코드 실행"

  high:
    CVSS: "7.0 - 8.9"
    조치: "24시간 내 패치"
    예시: "인증 우회"

  moderate:
    CVSS: "4.0 - 6.9"
    조치: "1주 내 패치"
    예시: "정보 노출"

  low:
    CVSS: "0.1 - 3.9"
    조치: "다음 릴리스"
    예시: "DoS 가능성"
```

## 자동화된 감사

```typescript
// scripts/security-audit.ts
import { execSync } from 'child_process';

interface AuditResult {
  vulnerabilities: {
    info: number;
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
  advisories: Advisory[];
}

interface Advisory {
  id: number;
  module_name: string;
  severity: string;
  title: string;
  url: string;
  recommendation: string;
  patched_versions: string;
}

async function runAudit(): Promise<AuditResult> {
  try {
    const output = execSync('pnpm audit --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(output);
  } catch (error: any) {
    // audit은 취약점 발견 시 non-zero exit
    if (error.stdout) {
      return JSON.parse(error.stdout);
    }
    throw error;
  }
}

async function generateReport(result: AuditResult): Promise<string> {
  const { vulnerabilities, advisories } = result;

  let report = `# Security Audit Report\n\n`;
  report += `## Summary\n\n`;
  report += `| Severity | Count |\n|----------|-------|\n`;
  report += `| Critical | ${vulnerabilities.critical} |\n`;
  report += `| High | ${vulnerabilities.high} |\n`;
  report += `| Moderate | ${vulnerabilities.moderate} |\n`;
  report += `| Low | ${vulnerabilities.low} |\n`;

  if (advisories.length > 0) {
    report += `\n## Advisories\n\n`;
    for (const adv of advisories) {
      report += `### ${adv.module_name} - ${adv.severity.toUpperCase()}\n`;
      report += `- **Title**: ${adv.title}\n`;
      report += `- **Recommendation**: ${adv.recommendation}\n`;
      report += `- **Patched**: ${adv.patched_versions}\n`;
      report += `- **More Info**: ${adv.url}\n\n`;
    }
  }

  return report;
}
```

## GitHub Actions 통합

```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  schedule:
    - cron: '0 9 * * 1' # 매주 월요일 9시
  push:
    paths:
      - 'pnpm-lock.yaml'
      - 'package.json'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Run audit
        id: audit
        run: |
          pnpm audit --json > audit-result.json || true
          echo "result=$(cat audit-result.json | jq -c '.vulnerabilities')" >> $GITHUB_OUTPUT

      - name: Check critical/high
        run: |
          CRITICAL=$(cat audit-result.json | jq '.vulnerabilities.critical')
          HIGH=$(cat audit-result.json | jq '.vulnerabilities.high')

          if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
            echo "::error::Critical or High vulnerabilities found!"
            exit 1
          fi

      - name: Create Issue
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const audit = JSON.parse(fs.readFileSync('audit-result.json', 'utf8'));

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🔴 Security Vulnerabilities Detected',
              body: `## Audit Results\n\n- Critical: ${audit.vulnerabilities.critical}\n- High: ${audit.vulnerabilities.high}\n\nRun \`pnpm audit\` for details.`,
              labels: ['security', 'urgent']
            });
```

## 취약점 해결 전략

```yaml
즉시_해결:
  조건: "패치 버전 존재"
  방법: |
    pnpm update [package]@[patched-version]

대체_패키지:
  조건: "패치 없음, 대안 존재"
  예시:
    moment: "dayjs 또는 date-fns"
    request: "axios 또는 node-fetch"

무시_처리:
  조건: "영향 없음 확인"
  방법: |
    # .npmrc 또는 package.json
    "pnpm": {
      "auditConfig": {
        "ignoreCves": ["CVE-2023-xxxxx"]
      }
    }

격리_전략:
  조건: "업데이트 불가, 중요 기능"
  방법: "별도 서비스로 분리"
```

## 출력 형식

```markdown
## 🔒 보안 감사 결과

### 취약점 요약

| 심각도 | 개수 | 조치 기한 |
|--------|------|----------|
| 🔴 Critical | 0 | 즉시 |
| 🟠 High | 2 | 24시간 |
| 🟡 Moderate | 5 | 1주 |
| 🟢 Low | 3 | 다음 릴리스 |

---

### High 취약점 상세

#### 1. lodash (CVE-2021-23337)
| 항목 | 값 |
|------|-----|
| 현재 버전 | 4.17.20 |
| 패치 버전 | 4.17.21 |
| 유형 | Prototype Pollution |
| 영향 | Command Injection |

**해결 방법**:
```bash
pnpm update lodash@4.17.21
```

#### 2. axios (CVE-2023-45857)
| 항목 | 값 |
|------|-----|
| 현재 버전 | 1.4.0 |
| 패치 버전 | 1.6.0 |
| 유형 | SSRF |

**해결 방법**:
```bash
pnpm update axios@1.6.0
```

---

### 권장 조치

1. **즉시 실행**: `pnpm update lodash axios`
2. **테스트 실행**: `pnpm test`
3. **배포**: PR 생성 후 머지

---

### 무시 대상 (확인됨)

| CVE | 패키지 | 사유 |
|-----|--------|------|
| CVE-2023-xxxxx | dev-only-pkg | 개발 의존성, 프로덕션 미포함 |
```

## 트리거 키워드
- "audit", "보안 감사"
- "취약점", "CVE"
- "dependency 보안", "패키지 취약점"
