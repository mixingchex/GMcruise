import puppeteer from 'puppeteer-core';
import { generateTravelContractHTML } from './travel-contract-generator';
import { TravelContractData } from './types';

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
      const { existsSync } = await import('fs');
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

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
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
