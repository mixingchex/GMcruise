// scripts/upload-sample-certificate.mjs
// 샘플 구매확인서 이미지를 구글 드라이브에 업로드
// lib/certificate-generator.ts의 Puppeteer 기반 생성기 사용

import { config } from 'dotenv';
config({ path: '.env.local' });

import { google } from 'googleapis';
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// 이미지를 base64로 인코딩
function getImageBase64(relativePath) {
  const fullPath = join(projectRoot, 'public', relativePath);
  const buffer = readFileSync(fullPath);
  const ext = relativePath.split('.').pop().toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// 로고와 도장 이미지 base64
const logoBase64 = getImageBase64('images/ai-cruise-logo.png');
const stampBase64 = getImageBase64('images/cruisedot-stamp.png');

// 테스트 데이터
const testData = {
  customerName: '홍길동',
  birthDate: '1985-03-15',
  productName: 'MSC 그랜디오사 지중해 7박 8일 크루즈',
  paymentAmount: 3500000,
  paymentDate: '2024-12-09',
  orderId: 'TEST-SAMPLE-20241209',
  managerName: '김상담',
};

// 구글 인증 (프로젝트 패턴과 동일)
function getGoogleAuth() {
  const privateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error('Google 서비스 계정 정보가 없습니다. GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL을 확인해주세요.');
  }

  console.log('   Service Account:', clientEmail);

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

// 구매확인서 HTML 생성 (Certificate.tsx와 동일한 양식)
function generateCertificateHTML(data) {
  const formattedAmount = data.paymentAmount.toLocaleString('ko-KR');
  const now = new Date();
  const issueDate = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
      background: #fff;
      width: 800px;
      min-height: 1100px;
      padding: 60px 80px;
    }
    .certificate {
      display: flex;
      flex-direction: column;
      min-height: 980px;
    }
    .logo {
      text-align: center;
      margin-bottom: 20px;
    }
    .logo img {
      height: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .title {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #111827;
      margin-bottom: 5px;
    }
    .subtitle {
      font-size: 14px;
      color: #6b7280;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #d1d5db;
      margin-bottom: 20px;
    }
    .info-table tr {
      border-bottom: 1px solid #d1d5db;
    }
    .info-table tr:last-child {
      border-bottom: none;
    }
    .label-cell {
      background: #f9fafb;
      padding: 12px 16px;
      font-weight: 600;
      color: #374151;
      width: 25%;
      font-size: 14px;
      border-right: 1px solid #d1d5db;
    }
    .value-cell {
      padding: 12px 16px;
      color: #111827;
      font-size: 14px;
    }
    .value-cell.amount {
      font-weight: 700;
      font-size: 18px;
      color: #1d4ed8;
    }
    .footer {
      margin-top: auto;
      padding-top: 40px;
    }
    .issue-date {
      text-align: right;
      font-size: 14px;
      color: #374151;
      margin-bottom: 20px;
    }
    .company-section {
      text-align: right;
      margin-bottom: 30px;
      position: relative;
    }
    .company-name {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-right: 10px;
    }
    .seal {
      display: inline-block;
      vertical-align: middle;
    }
    .seal img {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
    .slogan {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 13px;
      color: #9ca3af;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="logo">
      <img src="${logoBase64}" alt="크루즈닷 로고" />
    </div>
    <div class="header">
      <h1 class="title">구 매 확 인 증 서</h1>
      <p class="subtitle">Purchase Certificate</p>
    </div>

    <table class="info-table">
      <tr>
        <td class="label-cell">성명</td>
        <td class="value-cell">${data.customerName}</td>
      </tr>
      <tr>
        <td class="label-cell">생년월일</td>
        <td class="value-cell">${data.birthDate || '-'}</td>
      </tr>
      <tr>
        <td class="label-cell">상품명</td>
        <td class="value-cell">${data.productName}</td>
      </tr>
      <tr>
        <td class="label-cell">결제금액</td>
        <td class="value-cell amount">${formattedAmount}원</td>
      </tr>
      <tr>
        <td class="label-cell">결제일자</td>
        <td class="value-cell">${data.paymentDate}</td>
      </tr>
      <tr>
        <td class="label-cell">주문번호</td>
        <td class="value-cell">${data.orderId}</td>
      </tr>
      ${data.managerName ? `
      <tr>
        <td class="label-cell">담당자</td>
        <td class="value-cell">${data.managerName}</td>
      </tr>` : ''}
    </table>

    <div class="footer">
      <div class="issue-date">${issueDate}</div>
      <div class="company-section">
        <span class="company-name">크루즈닷 대표이사</span>
        <span class="seal"><img src="${stampBase64}" alt="인" /></span>
      </div>
      <div class="slogan">크루즈 첫여행 크루즈닷, 두번째 부터 행복하게 크루즈닷 감사합니다</div>
    </div>
  </div>
</body>
</html>
  `;
}

// Puppeteer로 구매확인서 PNG 생성 (한글 폰트 지원)
async function generateCertificateImage() {
  let browser;

  try {
    console.log('   Puppeteer 브라우저 실행 중...');

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 1100, deviceScaleFactor: 2 });

    // 한글 폰트 설정
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9',
    });

    // HTML 로드
    const html = generateCertificateHTML(testData);
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // 폰트 로드 대기
    await page.evaluateHandle(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 스크린샷
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true,
      omitBackground: false,
    });

    return Buffer.from(screenshot);

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 구글 드라이브 업로드
async function uploadToDrive(imageBuffer) {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  // 구매확인서 폴더 ID (lib/google-automation.ts 참조)
  const CERTIFICATE_FOLDER_ID = '1RpcvgcjVSW7nlvy5x9tJZyaYyYbutXpz';

  // 파일 업로드
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `구매확인서_샘플_홍길동_${dateStr}.png`;

  const { Readable } = await import('stream');
  const stream = Readable.from(imageBuffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: 'image/png',
      parents: [CERTIFICATE_FOLDER_ID],
    },
    media: {
      mimeType: 'image/png',
      body: stream,
    },
    fields: 'id, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  // 공개 권한 설정
  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });

  return {
    fileId: response.data.id,
    viewLink: `https://drive.google.com/file/d/${response.data.id}/view`,
    directLink: `https://drive.google.com/uc?id=${response.data.id}`,
  };
}

async function main() {
  console.log('=== 샘플 구매확인서 이미지 생성 및 업로드 ===\n');

  try {
    // 1. 이미지 생성
    console.log('1. 구매확인서 이미지 생성 중...');
    const imageBuffer = await generateCertificateImage();
    console.log(`   ✓ 이미지 생성 완료 (${(imageBuffer.length / 1024).toFixed(1)} KB)\n`);

    // 2. 구글 드라이브 업로드
    console.log('2. 구글 드라이브에 업로드 중...');
    const result = await uploadToDrive(imageBuffer);
    console.log('   ✓ 업로드 완료!\n');

    console.log('=== 결과 ===');
    console.log('파일 ID:', result.fileId);
    console.log('');
    console.log('🔗 보기 링크:');
    console.log(result.viewLink);
    console.log('');
    console.log('🖼️ 직접 이미지 링크:');
    console.log(result.directLink);

  } catch (error) {
    console.error('❌ 오류:', error.message);
    if (error.message.includes('GOOGLE_SERVICE_ACCOUNT_KEY')) {
      console.log('\n💡 구글 서비스 계정 키가 필요합니다.');
    }
  }
}

main();
