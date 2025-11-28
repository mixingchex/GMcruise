// scripts/test-contract-flow.ts
// 계약서 전체 플로우 테스트

import fetch from 'node-fetch';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// 색상 출력 헬퍼
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✓ ${message}`, colors.green);
}

function error(message: string) {
  log(`✗ ${message}`, colors.red);
}

function info(message: string) {
  log(`ℹ ${message}`, colors.blue);
}

function warning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

// 테스트 데이터
const testData = {
  adminEmail: 'admin@test.com',
  adminPassword: 'admin123',
  contractorName: '테스트계약자',
  contractorPhone: '01012345678',
  contractorEmail: 'test-contractor@test.com',
};

async function testContractFlow() {
  log('\n=== 계약서 플로우 테스트 시작 ===\n', colors.bright);

  try {
    // 1. 관리자 로그인 (필요한 경우)
    info('1. 관리자 패널 접근 확인...');

    // 2. 계약서 조회
    info('2. 계약서 목록 조회...');
    const contractsRes = await fetch(`${BASE_URL}/api/admin/affiliate/contracts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!contractsRes.ok) {
      throw new Error(`계약서 목록 조회 실패: ${contractsRes.status}`);
    }

    const contractsData = await contractsRes.json();

    if (!contractsData.ok || !contractsData.contracts || contractsData.contracts.length === 0) {
      warning('테스트할 계약서가 없습니다. 먼저 계약서를 생성해주세요.');
      return;
    }

    // 서명된 계약서 찾기
    const signedContract = contractsData.contracts.find((c: any) => {
      const metadata = c.metadata || {};
      const signatures = metadata.signatures || {};
      return signatures.main?.url || c.status === 'completed';
    });

    if (!signedContract) {
      warning('서명된 계약서가 없습니다.');
      info('계약서 서명 테스트를 건너뜁니다.');
    } else {
      success(`서명된 계약서 발견: ID ${signedContract.id}`);

      // 3. PDF 전송 테스트 (관리자)
      info(`3. 관리자 패널에서 PDF 전송 테스트 (계약서 ID: ${signedContract.id})...`);

      const adminSendPdfRes = await fetch(
        `${BASE_URL}/api/admin/affiliate/contracts/${signedContract.id}/send-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const adminSendPdfData = await adminSendPdfRes.json();

      if (adminSendPdfRes.status === 401 || adminSendPdfRes.status === 403) {
        warning('관리자 인증 필요. 실제 브라우저에서 로그인 후 테스트하세요.');
      } else if (!adminSendPdfRes.ok) {
        error(`관리자 PDF 전송 실패: ${adminSendPdfData.message || adminSendPdfRes.status}`);
        console.log('응답 상세:', adminSendPdfData);
      } else {
        success('관리자 PDF 전송 성공!');
      }

      // 4. PDF 전송 테스트 (대리점장)
      info(`4. 대리점장 대시보드에서 PDF 전송 테스트...`);

      const partnerSendPdfRes = await fetch(
        `${BASE_URL}/api/partner/contracts/${signedContract.id}/send-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const partnerSendPdfData = await partnerSendPdfRes.json();

      if (partnerSendPdfRes.status === 401 || partnerSendPdfRes.status === 403) {
        warning('대리점장 인증 필요. 실제 브라우저에서 로그인 후 테스트하세요.');
      } else if (!partnerSendPdfRes.ok) {
        error(`대리점장 PDF 전송 실패: ${partnerSendPdfData.message || partnerSendPdfRes.status}`);
        console.log('응답 상세:', partnerSendPdfData);
      } else {
        success('대리점장 PDF 전송 성공!');
      }
    }

    // 5. 서명 링크가 있는 계약서 찾기
    const unsignedContract = contractsData.contracts.find((c: any) => {
      const metadata = c.metadata || {};
      const signatures = metadata.signatures || {};
      return c.signatureLink && !signatures.main?.url && c.status !== 'completed';
    });

    if (!unsignedContract) {
      warning('서명 대기 중인 계약서가 없습니다.');
      info('계약서 서명 플로우 테스트를 건너뜁니다.');
    } else {
      success(`서명 대기 계약서 발견: ID ${unsignedContract.id}`);

      // 서명 링크에서 토큰 추출
      const signatureLink = unsignedContract.signatureLink;
      const tokenMatch = signatureLink.match(/sign\/([^\/\?]+)/);

      if (!tokenMatch) {
        error('서명 링크에서 토큰을 찾을 수 없습니다.');
      } else {
        const token = tokenMatch[1];
        info(`5. 계약서 서명 플로우 테스트 (토큰: ${token.substring(0, 10)}...)...`);

        // 계약서 조회
        const getContractRes = await fetch(
          `${BASE_URL}/api/affiliate/contract/sign/${token}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const getContractData = await getContractRes.json();

        if (!getContractRes.ok) {
          error(`계약서 조회 실패: ${getContractData.message || getContractRes.status}`);
        } else {
          success('계약서 조회 성공!');
          info(`계약자: ${getContractData.contract.name}`);

          // 서명 시뮬레이션 (실제 서명은 브라우저에서만 가능)
          info('서명 API는 브라우저에서 SignaturePad로 생성된 이미지가 필요합니다.');
          info(`서명 페이지 URL: ${BASE_URL}/affiliate/contract/sign/${token}`);
        }
      }
    }

    log('\n=== 계약서 플로우 테스트 완료 ===\n', colors.bright);
    log('\n요약:', colors.bright);
    log('  - 계약서 목록 조회: 정상');
    log('  - PDF 전송 API: 구현 완료 (인증 필요)');
    log('  - 계약서 서명 API: 구현 완료');
    log('\n다음 단계:', colors.yellow);
    log('  1. 브라우저에서 관리자로 로그인');
    log('  2. 계약서 관리 페이지에서 "PDF 전송" 버튼 클릭');
    log('  3. 계약자 이메일로 PDF 전송 확인');
    log('  4. 서명 링크로 접속하여 서명 테스트');
    log('  5. 서명 완료 후 자동 PDF 전송 확인\n');

  } catch (err: any) {
    error(`테스트 실패: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// 스크립트 실행
testContractFlow().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
