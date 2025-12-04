// lib/certificate-generator.ts
// 구매확인증서 PNG 이미지 생성 (서버리스 환경 호환)

import puppeteerCore from 'puppeteer-core';

// @sparticuz/chromium 타입 정의
interface ChromiumModule {
  args: string[];
  executablePath: () => Promise<string>;
}

interface CertificateData {
  customerName: string;
  birthDate: string;
  productName: string;
  paymentAmount: number;
  paymentDate: string;
  orderId: string;
  managerName?: string;
}

/**
 * Generates the HTML for the certificate, matching the design of the React component.
 */
function generateCertificateHtml(data: CertificateData): string {
  const formattedAmount = data.paymentAmount.toLocaleString('ko-KR');
  const now = new Date();

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

    body {
      margin: 0;
      padding: 0;
      font-family: 'Pretendard', 'Malgun Gothic', sans-serif;
      background-color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }

    .certificate-container {
      width: 700px;
      height: 990px;
      background: white;
      padding: 60px;
      box-sizing: border-box;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .logo-area {
      margin-bottom: 40px;
      text-align: center;
    }

    .logo-text {
      font-size: 28px;
      font-weight: 800;
      color: #ef4444;
      letter-spacing: 2px;
    }

    .logo-subtext {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }

    .title {
      font-size: 32px;
      font-weight: 700;
      color: #111;
      letter-spacing: 10px;
      margin: 0 0 60px 0;
      text-align: center;
    }

    .info-table {
      width: 100%;
      border-top: 2px solid #e5e7eb;
      border-collapse: collapse;
      margin-bottom: 40px;
    }

    .info-table th, .info-table td {
      padding: 15px 10px;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
      font-size: 16px;
    }

    .info-table th {
      width: 120px;
      font-weight: 600;
      color: #374151;
      background-color: #f9fafb;
    }

    .info-table td {
      color: #111827;
      font-weight: 500;
    }

    .footer {
      margin-top: auto;
      width: 100%;
      text-align: right;
      padding-right: 20px;
      position: relative;
    }

    .date {
      font-size: 14px;
      color: #4b5563;
      margin-bottom: 20px;
    }

    .company-info {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
    }

    .company-name {
      font-size: 18px;
      font-weight: 700;
      color: #111;
    }

    .stamp-box {
      position: relative;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ef4444;
      border-radius: 50%;
    }

    .stamp-text {
      color: #ef4444;
      font-size: 12px;
      font-weight: bold;
    }

    .bottom-text {
      margin-top: 30px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <div class="logo-area">
      <div class="logo-text">CRUISE DOT</div>
      <div class="logo-subtext">크루즈닷</div>
    </div>

    <h1 class="title">구 매 확 인 증 서</h1>

    <table class="info-table">
      <tr>
        <th>성명</th>
        <td>${data.customerName}</td>
      </tr>
      <tr>
        <th>생년월일</th>
        <td>${data.birthDate || '(생년월일)'}</td>
      </tr>
      <tr>
        <th>상품명</th>
        <td>${data.productName}</td>
      </tr>
      <tr>
        <th>결제금액</th>
        <td><strong>${formattedAmount}원</strong></td>
      </tr>
      <tr>
        <th>결제일자</th>
        <td>${data.paymentDate}</td>
      </tr>
      <tr>
        <th>주문번호</th>
        <td>${data.orderId}</td>
      </tr>
      ${data.managerName ? `
      <tr>
        <th>담당자</th>
        <td>${data.managerName}</td>
      </tr>
      ` : ''}
    </table>

    <div class="footer">
      <div class="date">
        ${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일
      </div>

      <div class="company-info">
        <div class="company-name">크루즈닷 대표이사</div>
        <div class="stamp-box">
          <span class="stamp-text">직인</span>
        </div>
      </div>

      <div class="bottom-text">
        크루즈 첫여행 크루즈닷, 두번째 부터 행복하게 크루즈닷 감사합니다
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generates a PNG image of the certificate.
 * Works in both local and serverless (Vercel) environments.
 */
export async function generateCertificatePng(data: CertificateData): Promise<Buffer> {
  let browser = null;

  try {
    // 서버리스 환경 (Vercel) vs 로컬 환경 구분
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isServerless) {
      // Vercel/AWS Lambda 환경: @sparticuz/chromium 동적 import
      const chromium = await import('@sparticuz/chromium') as unknown as ChromiumModule;
      browser = await puppeteerCore.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      // 로컬 개발 환경: puppeteer 직접 사용
      // 동적 import로 로컬 puppeteer 사용 시도
      try {
        const puppeteer = await import('puppeteer');
        browser = await puppeteer.default.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });
      } catch {
        // 로컬 puppeteer가 없으면 puppeteer-core + 시스템 Chrome 사용
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH ||
          '/usr/bin/google-chrome-stable' ||
          '/usr/bin/chromium-browser';

        browser = await puppeteerCore.launch({
          headless: true,
          executablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });
      }
    }

    const page = await browser.newPage();

    // Set viewport to match certificate size (with higher DPI for quality)
    await page.setViewport({ width: 900, height: 1100, deviceScaleFactor: 2 });

    const html = generateCertificateHtml(data);
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Get the certificate element
    const element = await page.$('.certificate-container');

    if (!element) {
      throw new Error('Certificate container not found');
    }

    // Screenshot the element
    const imageBuffer = await element.screenshot({ type: 'png' });

    return imageBuffer as Buffer;

  } catch (error) {
    console.error('[Certificate Generator] Error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Test function for local development
 */
export async function testCertificateGeneration(): Promise<void> {
  const testData: CertificateData = {
    customerName: '홍길동',
    birthDate: '1990-01-01',
    productName: 'MSC 그랜디오사 지중해 7박 8일',
    paymentAmount: 2500000,
    paymentDate: new Date().toISOString().split('T')[0],
    orderId: 'TEST-ORDER-12345',
    managerName: '김담당',
  };

  try {
    console.log('[Test] Generating certificate...');
    const buffer = await generateCertificatePng(testData);
    console.log(`[Test] Certificate generated successfully (${buffer.length} bytes)`);
    return;
  } catch (error) {
    console.error('[Test] Certificate generation failed:', error);
    throw error;
  }
}
