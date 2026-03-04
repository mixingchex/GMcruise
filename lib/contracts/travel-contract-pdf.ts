import puppeteer from 'puppeteer-core';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { generateTravelContractHTML } from './travel-contract-generator';
import { TravelContractData } from './types';
import { withPdfLimit } from './pdf-semaphore';
import { logger } from '@/lib/logger';

/** WO-CR-03: 배민도현체 TTF를 base64로 읽어 @font-face CSS를 반환 — 모듈 레벨 캐싱 */
let _customFontStyle: string | null = null;

function getCustomFontStyle(): string {
  if (_customFontStyle !== null) return _customFontStyle;
  const fontPath = join(process.cwd(), 'public', 'fonts', 'BaeMinDoHyeon.ttf');
  if (!existsSync(fontPath)) {
    _customFontStyle = '';
    return '';
  }
  const base64 = readFileSync(fontPath).toString('base64');
  _customFontStyle = `
    @font-face {
      font-family: 'BaeMinDoHyeon';
      src: url('data:font/truetype;base64,${base64}') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
  `;
  return _customFontStyle;
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

/** WO-CR-05: withPdfLimit으로 동시 실행 최대 2개 제한 */
export async function generateTravelContractPDF(
  data: TravelContractData,
  signatureImageUrl?: string,
  contractorSignatureUrl?: string,
  customerAddress?: string,
  companions?: Array<{ name: string; phone: string }>,
  signedAt?: Date, // WO-CR-13
): Promise<Buffer> {
  return withPdfLimit(async () => {
    const html = generateTravelContractHTML(
      data,
      signatureImageUrl,
      contractorSignatureUrl,
      customerAddress,
      companions,
      signedAt,
    );

    const fontStyle = getCustomFontStyle();

    const browser = await getBrowser();
    try {
      // WO-HI-01: page.close()를 try-finally로 보장
      const page = await browser.newPage();
      try {
        // WO-LO-04: waitUntil 'load' → 'domcontentloaded' (외부 네트워크 의존 없음)
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        // 배민도현체 @font-face 주입 (base64 임베드, 네트워크 불필요)
        if (fontStyle) {
          await page.addStyleTag({ content: fontStyle });
        }
        // WO-CR-04 / P0-07: 폰트 렌더링 완료 대기 — timeout 시 warn 후 계속 진행
        try {
          await Promise.race([
            page.evaluateHandle('document.fonts.ready'),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Font loading timeout after 3s')), 3000)
            ),
          ]);
        } catch (fontErr) {
          // 폰트 로딩 실패해도 계속 진행 (시스템 폰트로 렌더링)
          logger.warn('[PDF] 폰트 로딩 타임아웃 - 시스템 폰트로 대체', {
            error: fontErr instanceof Error ? fontErr.message : String(fontErr),
          });
        }
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0', bottom: '0', left: '0', right: '0' },
        });
        return Buffer.from(pdfBuffer);
      } finally {
        await page.close().catch(err =>
          logger.warn('[PDF] page.close 실패', { error: err instanceof Error ? err.message : String(err) })
        );
      }
    } finally {
      await browser.close();
    }
  });
}
