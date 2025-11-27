#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';

/**
 * .env.local 파일에 Private Key 추가 스크립트
 */

const ENV_FILE = path.join(process.cwd(), '.env.local');
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC3ocieialo9oSe
ZZfHLnH/GkWXeRFW8qbZFk4/vI9sBLfq5/eDzCAI8o9HZdBw2oJCZXhu6BPD930K
qhcBN/XkpsHA5HsIuNsO9kBNWD3nCiCNTgHZzacWjGqjm5QVYUu0nZ5P5rvCvA0r
t3LqgZ+C3oPHkbtC5oLyR+QhYUHxo+2+Yc1JJkWDaASo5AvRnGgSsIguREdQ9EnW
9jonQOL1AbflbeaaWjaLkZb4GTUGsWlZXDb7elFdr9pJ1x26W90SyM5NUdEvduSa
qV+37GuYSH1qHzFTA/UW0UD4AVMSZ1eBBR9tCFPrMtpANhWu+hV3x7j0rQBIMZYG
yOWcIj+dAgMBAAECggEAEbdCAPQ3ATFcn2DIa9Gcnd04VDdnPNmGz0V09yEx6lyU
1yIvTD/SjLUaAuwHrVuSBZB/NfPzNDdu5isoB64RGFDI5dslI4pHWAIvN0cJcdNq
9eGjZr04dCxyfVDyexLlQt+R+RN0Od/6mqUa07+oVpqGYX07G7vcFj5pUURuID8O
o9Ffriby1liTAC/7fncOh5SEjFrUor7ULSGcWcyzxUjys9JK7IainU9HzX+jYk
EhRpsa7OaqqlmJ5czkfa19wu7BrNAEZtIVMKhFI1qDMJ+YCouqlobvW0JRy4PZZ/
O/EhZX6a/A12DoNJQhwHE4vqol7gy78vwIimUetI4QKBgQDnscK8ULcUh6SDi7yF
YlQZXNZsZaWoqgiXiwYNHKZmfndBiL1jVm0ycyAs/KdFhnI9uEUTObreReK3UK0l
5BsvSW8eQqSWNq0R3jV89fhyz1TtfiB7WUKoOmhN+Cyp3cQpArSYWc7xEbqOPcXR
/594yAwS4fXTWZi8ozJZQw5AVwKBgQDK5Un4qwUlkB+FYdDDO8VDqhYo7Ow5xv6K
zVaqpF3Bo2lSzkiT5WZio9nbotXzwAapuxeG1/g9DDSQAAWT/cwh3gMk2uIzEsdW
QVvCt0nWPpyqTIXM8m85hOuvS5dwwEujODn2IBKa4w+x/U88BDipOnaDRIl7wLXA
dX67pLN3KwKBgQC4knN/cQ1n3WbBJGBaIaq9SafHUnJVmp6dmrKHX3tvyu9V1YiJ
yh/TQMMxE1Rtnl0DrffZCPREfYfOYQaOWNkPIoDSqmRTBdt5kHsrwQba7y/IweE+
Yi0ntt/AvSNXbsMFqJIVi/W/NVBYX/1m/SwdG8ACit86LvXt0FQbp7+CoQKBgQCH
G6JjdbbKqatjzZwPteiJQ2TYQdSYMNvloBD7NtK8FE4ZdwY7fgHs44E6Ube5RgDp
240yHPTP6iXCUlFkmBfr4YQkcaE5M2MMHB+3jQgdI7p9aNGchT/thIbRRzwEN/jm
KpXmQLtC6rrT4oN1yrXUcvriNKx8fPpKu7L1zxo22wKBgQCzHN8NWxNvCcvs5oyw
lS0UBVw75EKl0aHtnEcXTnHBmH+1Ht+NEuYwjSO1ouLGem1FRsE+vs/Y6AciSA2B
5VBsFJhH77kSEuVRi9vCnIi2nEykynJl989B53kzzAk07Q7H9DL1aNZPEwdqlW/Q
NQaF/h9r2T7RuzpFPOXCk9uuiw==
-----END PRIVATE KEY-----`;

function addPrivateKey() {
  if (!fs.existsSync(ENV_FILE)) {
    console.error('❌ .env.local 파일이 없습니다.');
    process.exit(1);
  }

  const content = fs.readFileSync(ENV_FILE, 'utf-8');

  // 이미 Private Key가 있는지 확인
  if (content.includes('GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY')) {
    console.log('⚠️  GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY가 이미 존재합니다.');
    console.log('   기존 값을 유지합니다.');
    return;
  }

  // Private Key 추가 (인용부호로 감싸서 여러 줄 처리)
  const privateKeyLine = `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="${PRIVATE_KEY.replace(/\n/g, '\\n')}"`;

  // 파일 끝에 추가
  const newContent = content.trim() + '\n\n' + privateKeyLine + '\n';

  fs.writeFileSync(ENV_FILE, newContent, 'utf-8');
  console.log('✅ GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY 추가 완료!');
}

addPrivateKey();

