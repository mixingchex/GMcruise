import puppeteer from 'puppeteer-core';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { generateTravelContractHTML } from './travel-contract-generator';
import { TravelContractData } from './types';

/** 배민도현체 TTF를 base64로 읽어 @font-face CSS를 반환 */
function getCustomFontStyle(): string {
  const fontPath = join(process.cwd(), 'public', 'fonts', 'BaeMinDoHyeon.ttf');
  if (!existsSync(fontPath)) return '';
  const base64 = readFileSync(fontPath).toString('base64');
  return `
    @font-face {
      font-family: 'BaeMinDoHyeon';
      src: url('data:font/truetype;base64,${base64}') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
  `;
}

async function getBrowser() {
  // Vercel serverless 환경
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  // 로컬 환경
  const localPaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const executablePath of localPaths) {
    try {
      if (existsSync(executablePath)) {
        return puppeteer.launch({
          executablePath,
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      }
    } catch {}
  }
  // fallback: puppeteer 기본 번들
  return puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
}

export async function generateTravelContractPDF(
  data: TravelContractData,
  signatureImageUrl?: string,
  contractorSignatureUrl?: string,
  customerAddress?: string,
  companions?: Array<{ name: string; phone: string }>,
): Promise<Buffer> {
  const html = generateTravelContractHTML(
    data,
    signatureImageUrl,
    contractorSignatureUrl,
    customerAddress,
    companions,
  );

  const fontStyle = getCustomFontStyle();

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    // networkidle0 대신 load 사용 (외부 네트워크 의존 없음)
    await page.setContent(html, { waitUntil: 'load' });
    // 배민도현체 @font-face 주입 (base64 임베드, 네트워크 불필요)
    if (fontStyle) {
      await page.addStyleTag({ content: fontStyle });
    }
    // 폰트 렌더링 완료 대기
    await page.evaluateHandle('document.fonts.ready');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
