// lib/affiliate/contract-pdf.ts
// 계약서 PDF 생성 유틸리티

import puppeteer from 'puppeteer';
import { join } from 'path';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import prisma from '@/lib/prisma';
import { CONTRACT_SECTIONS, REQUIRED_CONSENTS, REFUND_CONSENTS } from './contract-sections';
import { EDUCATION_CONTRACT_SECTIONS } from './education-contract-sections';

interface ContractPDFData {
  contractId: number;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  residentId?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankAccountHolder?: string | null;
  contractType: string;
  signatures: {
    main?: { url: string | null; originalName: string | null } | null;
    education?: { url: string | null; originalName: string | null } | null;
    b2b?: { url: string | null; originalName: string | null } | null;
  };
  submittedAt?: Date | null;
  contractSignedAt?: Date | null;
  approvedAt?: Date | null;
}

/**
 * 계약서 PDF 생성
 */
export async function generateContractPDF(data: ContractPDFData): Promise<Buffer> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    });
  } catch (error: any) {
    const errorMessage = error?.message || '알 수 없는 오류';
    if (errorMessage.includes('libnspr4.so') || errorMessage.includes('shared libraries')) {
      throw new Error(
        'PDF 생성을 위해 필요한 시스템 라이브러리가 설치되지 않았습니다.\n' +
        '다음 명령어를 실행하여 필요한 라이브러리를 설치해주세요:\n\n' +
        'sudo apt-get update && sudo apt-get install -y \\\n' +
        '  libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \\\n' +
        '  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \\\n' +
        '  libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2'
      );
    }
    throw error;
  }

  try {
    const page = await browser.newPage();
    
    // 타임아웃 설정 (60초)
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);
    
    // 한글 폰트 지원을 위한 추가 설정
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9',
    });
    
    // 계약서 HTML 생성
    const html = await generateContractHTML(data);
    
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
    
    // 한글 폰트 로드 대기
    await page.evaluateHandle(() => document.fonts.ready);
    
    // 서명 이미지 로드 대기 (waitForTimeout 대신 setTimeout 사용)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // PDF 생성 (한글 폰트가 제대로 렌더링되도록 추가 옵션)
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      timeout: 60000,
      preferCSSPageSize: false,
    });

    return Buffer.from(pdf);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 계약서 HTML 생성
 */
async function generateContractHTML(data: ContractPDFData): Promise<string> {
  const signatureImages: string[] = [];
  
  // 서명 이미지를 base64로 변환하여 추가
  if (data.signatures.main?.url) {
    const base64Image = await getImageAsBase64(data.signatures.main.url);
    if (base64Image) {
      signatureImages.push(`<div class="signature-section">
        <h3>서명</h3>
        <img src="${base64Image}" alt="서명" class="signature-image" />
        <p class="signature-name">${data.name}</p>
      </div>`);
    }
  }
  
  if (data.signatures.education?.url) {
    const base64Image = await getImageAsBase64(data.signatures.education.url);
    if (base64Image) {
      signatureImages.push(`<div class="signature-section">
        <h3>교육 이수 서명</h3>
        <img src="${base64Image}" alt="교육 이수 서명" class="signature-image" />
        <p class="signature-name">${data.name}</p>
      </div>`);
    }
  }
  
  if (data.signatures.b2b?.url) {
    const base64Image = await getImageAsBase64(data.signatures.b2b.url);
    if (base64Image) {
      signatureImages.push(`<div class="signature-section">
        <h3>B2B 계약 서명</h3>
        <img src="${base64Image}" alt="B2B 계약 서명" class="signature-image" />
        <p class="signature-name">${data.name}</p>
      </div>`);
    }
  }

  const contractTypeLabel = {
    SALES_AGENT: '판매원',
    BRANCH_MANAGER: '대리점장',
    CRUISE_STAFF: '크루즈 스태프',
    PRIMARKETER: '프리마케터',
  }[data.contractType] || data.contractType;

  const submittedDate = data.submittedAt 
    ? new Date(data.submittedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  
  const signedDate = data.contractSignedAt 
    ? new Date(data.contractSignedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>어필리에이트 계약서</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      background: #fff;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .contract-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #333;
    }
    .contract-header h1 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .contract-info {
      margin-bottom: 30px;
    }
    .contract-info table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .contract-info table td {
      padding: 8px 12px;
      border: 1px solid #ddd;
    }
    .contract-info table td:first-child {
      background: #f5f5f5;
      font-weight: bold;
      width: 150px;
    }
    .contract-content {
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .contract-section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 12px;
      margin-top: 20px;
      color: #333;
      border-bottom: 2px solid #ddd;
      padding-bottom: 5px;
    }
    .clause {
      margin-bottom: 10px;
      text-align: justify;
      padding-left: 10px;
    }
    .consent-section {
      margin-top: 40px;
      margin-bottom: 30px;
      padding: 20px;
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .consent-item {
      margin-bottom: 15px;
    }
    .consent-title {
      margin-bottom: 5px;
      font-size: 14px;
    }
    .consent-description {
      margin-left: 20px;
      font-size: 13px;
      color: #666;
    }
    .agreement-statement {
      margin-top: 30px;
      padding: 15px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 5px;
      text-align: center;
    }
    .signature-section {
      margin-top: 40px;
      page-break-inside: avoid;
    }
    .signature-section h3 {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 15px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .signature-image {
      max-width: 300px;
      max-height: 150px;
      border: 1px solid #ddd;
      margin-bottom: 10px;
      display: block;
    }
    .signature-name {
      font-weight: bold;
      margin-top: 10px;
    }
    .contract-footer {
      margin-top: 50px;
      text-align: right;
      font-size: 12px;
      color: #666;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="contract-header">
    <h1>어필리에이트 계약서</h1>
    <p>계약 유형: ${contractTypeLabel}</p>
  </div>

  <div class="contract-info">
    <table>
      <tr>
        <td>성명</td>
        <td>${data.name}</td>
      </tr>
      <tr>
        <td>연락처</td>
        <td>${data.phone}</td>
      </tr>
      ${data.email ? `<tr>
        <td>이메일</td>
        <td>${data.email}</td>
      </tr>` : ''}
      ${data.address ? `<tr>
        <td>주소</td>
        <td>${data.address}</td>
      </tr>` : ''}
      ${data.residentId ? `<tr>
        <td>주민등록번호</td>
        <td>${maskResidentId(data.residentId)}</td>
      </tr>` : ''}
      ${data.bankName ? `<tr>
        <td>은행명</td>
        <td>${data.bankName}</td>
      </tr>` : ''}
      ${data.bankAccount ? `<tr>
        <td>계좌번호</td>
        <td>${data.bankAccount}</td>
      </tr>` : ''}
      ${data.bankAccountHolder ? `<tr>
        <td>예금주</td>
        <td>${data.bankAccountHolder}</td>
      </tr>` : ''}
      ${submittedDate ? `<tr>
        <td>제출일</td>
        <td>${submittedDate}</td>
      </tr>` : ''}
      ${signedDate ? `<tr>
        <td>서명일</td>
        <td>${signedDate}</td>
      </tr>` : ''}
    </table>
  </div>

  <div class="contract-content">
    <h2>어필리에이트 계약 내용</h2>
    ${CONTRACT_SECTIONS.map(section => `
      <div class="contract-section">
        <h3 class="section-title">${section.title}</h3>
        ${section.clauses.map(clause => `<p class="clause">${clause}</p>`).join('')}
      </div>
    `).join('')}
    
    <div class="consent-section">
      <h3 class="section-title">필수 동의 사항</h3>
      ${REQUIRED_CONSENTS.map((consent, index) => `
        <div class="consent-item">
          <p class="consent-title"><strong>${index + 1}. ${consent.title}</strong></p>
          <p class="consent-description">${consent.description}</p>
        </div>
      `).join('')}
      ${(() => {
        const contractType = data.contractType || 'SALES_AGENT';
        const refundConsent = REFUND_CONSENTS[contractType];
        if (!refundConsent) return '';
        return `
        <div class="consent-item">
          <p class="consent-title"><strong>${REQUIRED_CONSENTS.length + 1}. ${refundConsent.title}</strong></p>
          <p class="consent-description">${refundConsent.description}</p>
        </div>
        `;
      })()}
    </div>
    
    <div class="agreement-statement">
      <p><strong>위 어필리에이트 계약 내용 및 필수 동의 사항을 모두 확인하고 동의하며 서명합니다.</strong></p>
    </div>
  </div>

  ${(() => {
    // 교육 계약서 섹션 추가 (모든 계약서에 포함)
    const contractType = data.contractType || 'SALES_AGENT';
    let educationSections = null;
    
    console.log('[Contract PDF] Contract type for education sections:', contractType);
    
    if (contractType === 'SALES_AGENT') {
      educationSections = EDUCATION_CONTRACT_SECTIONS.SALES_AGENT;
    } else if (contractType === 'CRUISE_STAFF') {
      educationSections = EDUCATION_CONTRACT_SECTIONS.CRUISE_STAFF;
    } else if (contractType === 'PRIMARKETER') {
      educationSections = EDUCATION_CONTRACT_SECTIONS.PRIMARKETER;
    } else if (contractType === 'BRANCH_MANAGER') {
      educationSections = EDUCATION_CONTRACT_SECTIONS.BRANCH_MANAGER;
    }
    
    if (!educationSections || educationSections.length === 0) {
      console.warn('[Contract PDF] No education sections found for contract type:', contractType);
      return '';
    }
    
    console.log('[Contract PDF] Including education sections, count:', educationSections.length);
    
    return `
  <div class="contract-content" style="margin-top: 50px; page-break-before: always;">
    <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">교육 계약 내용</h2>
    ${educationSections.map((section, sectionIndex) => `
      <div class="contract-section" style="margin-bottom: 25px; page-break-inside: avoid;">
        <h3 class="section-title" style="font-size: 18px; font-weight: bold; margin-bottom: 12px; margin-top: 20px; color: #333; border-bottom: 2px solid #ddd; padding-bottom: 5px;">${section.title}</h3>
        ${section.clauses.map((clause, clauseIndex) => {
          if (clause === '') return '<br style="margin-bottom: 5px;" />';
          return `<p class="clause" style="margin-bottom: 10px; text-align: justify; padding-left: 10px; line-height: 1.8;">${clause}</p>`;
        }).join('')}
      </div>
    `).join('')}
    
    <div class="agreement-statement" style="margin-top: 30px; padding: 15px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; text-align: center;">
      <p style="font-weight: bold; font-size: 14px;"><strong>위 교육 계약 내용을 모두 확인하고 동의하며 서명합니다.</strong></p>
    </div>
  </div>
    `;
  })()}

  ${signatureImages.join('')}

  <div class="contract-footer">
    <p>본 계약서는 전자적으로 생성되었습니다.</p>
    <p>생성일시: ${new Date().toLocaleString('ko-KR')}</p>
  </div>
</body>
</html>
  `;
}

/**
 * 이미지를 base64로 변환
 */
async function getImageAsBase64(url: string): Promise<string | null> {
  try {
    // 이미 base64인 경우 그대로 반환
    if (url.startsWith('data:image/')) {
      return url;
    }

    // 파일 시스템 경로로 변환
    let filePath: string;
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // 외부 URL인 경우 fetch로 가져와서 base64로 변환
      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[Contract PDF] Failed to fetch image from URL:', url);
        return null;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get('content-type') || 'image/png';
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

    // 상대 경로인 경우 public 폴더에서 찾기
    if (url.startsWith('/')) {
      filePath = join(process.cwd(), 'public', url);
    } else {
      filePath = join(process.cwd(), 'public', url);
    }

    // 파일 존재 확인
    if (!existsSync(filePath)) {
      console.warn('[Contract PDF] Image file not found:', filePath);
      return null;
    }

    // 파일 읽기
    const fileBuffer = await readFile(filePath);
    
    // MIME 타입 결정
    const ext = filePath.toLowerCase().split('.').pop();
    let mimeType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') {
      mimeType = 'image/jpeg';
    } else if (ext === 'gif') {
      mimeType = 'image/gif';
    } else if (ext === 'webp') {
      mimeType = 'image/webp';
    }

    // base64로 변환
    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  } catch (error) {
    console.error('[Contract PDF] Error converting image to base64:', error);
    return null;
  }
}

/**
 * 주민등록번호 마스킹
 */
function maskResidentId(id: string): string {
  if (id.length <= 6) return id;
  return `${id.slice(0, 6)}-*******`;
}

/**
 * 계약서 PDF를 서버에 저장하고 구글 드라이브에 백업
 */
export async function saveContractPDF(contractId: number, pdfBuffer: Buffer): Promise<string> {
  // 1단계: 서버에 먼저 저장 (안정성 확보)
  const fileName = `contract-${contractId}-${Date.now()}.pdf`;
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'contracts');
  
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const filePath = join(uploadDir, fileName);
  await writeFile(filePath, pdfBuffer);
  const serverUrl = `/uploads/contracts/${fileName}`;
  console.log('[Contract PDF] 파일이 서버에 저장되었습니다:', serverUrl);

  // 2단계: 구글 드라이브 백업 (실패해도 계속 진행)
  try {
    const { uploadFileToDrive } = await import('@/lib/google-drive');
    
    // DB에서 폴더 ID 가져오기
    const { default: prisma } = await import('@/lib/prisma');
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: 'google_drive_contracts_folder_id' },
      select: { configValue: true },
    });

    const folderId = config?.configValue || process.env.GOOGLE_DRIVE_CONTRACTS_FOLDER_ID;

    if (folderId && folderId !== 'root') {
      const uploadResult = await uploadFileToDrive({
        folderId,
        fileName,
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
        makePublic: false, // 계약서는 비공개
      });

      if (uploadResult.ok && uploadResult.url) {
        console.log(`[Contract PDF] 구글 드라이브 백업 성공: ${uploadResult.url}`);
        // 백업 성공해도 서버 URL 반환 (서버가 기본)
      } else {
        console.warn('[Contract PDF] 구글 드라이브 백업 실패 (서버 저장은 성공):', uploadResult.error);
      }
    }
  } catch (error) {
    console.warn('[Contract PDF] 구글 드라이브 백업 중 오류 (서버 저장은 성공):', error);
    // 백업 실패해도 서버 저장은 성공했으므로 계속 진행
  }

  // 서버 URL 반환 (백업은 metadata에 저장 가능)
  return serverUrl;
}

/**
 * 계약서 데이터 조회 및 PDF 생성
 */
export async function generateContractPDFFromId(contractId: number): Promise<Buffer> {
  const contract = await prisma.affiliateContract.findUnique({
    where: { id: contractId },
    include: {
      User_AffiliateContract_userIdToUser: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!contract) {
    throw new Error('계약서를 찾을 수 없습니다.');
  }

  const metadata = contract.metadata as any;
  const signatures = metadata?.signatures || {};

  // 계약서 타입 확인 (metadata에서 가져오거나 contractType 필드 사용)
  const contractType = metadata?.contractType || contract.contractType || 'SALES_AGENT';

  const pdfData: ContractPDFData = {
    contractId: contract.id,
    name: contract.name || contract.User_AffiliateContract_userIdToUser?.name || '',
    phone: contract.phone || contract.User_AffiliateContract_userIdToUser?.phone || '',
    email: contract.email || contract.User_AffiliateContract_userIdToUser?.email || null,
    address: contract.address || '',
    residentId: contract.residentId || null,
    bankName: contract.bankName || null,
    bankAccount: contract.bankAccount || null,
    bankAccountHolder: contract.bankAccountHolder || null,
    contractType: contractType,
    signatures: {
      main: signatures.main || null,
      education: signatures.education || null,
      b2b: signatures.b2b || null,
    },
    submittedAt: contract.submittedAt,
    contractSignedAt: contract.contractSignedAt,
    approvedAt: contract.approvedAt,
  };

  console.log('[Contract PDF] PDF data prepared:', {
    contractId: pdfData.contractId,
    name: pdfData.name,
    phone: pdfData.phone,
    email: pdfData.email,
    contractType: pdfData.contractType,
  });

  return generateContractPDF(pdfData);
}


