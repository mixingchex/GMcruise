/**
 * 기존 계약서를 전체 내용 포함 PDF로 생성하여 Google Drive에 백업하는 스크립트
 *
 * 이 스크립트는 contract-pdf.ts의 generateContractHTML과 동일한 로직을 사용하여
 * 전체 계약서 내용(계약 조항, 동의 사항, 서명)이 포함된 PDF를 생성합니다.
 *
 * 실행: node scripts/backup-full-contract-pdfs.cjs
 */

const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const { Readable } = require('stream');
const puppeteer = require('puppeteer');

const prisma = new PrismaClient();

// 루트 폴더 ID (Affiliate_Documents)
const AFFILIATE_DOCUMENTS_FOLDER_ID = '1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI';

// 계약서 섹션 (contract-sections.ts에서 가져옴)
const CONTRACT_SECTIONS = [
  {
    title: '제1조 (목적)',
    clauses: [
      '본 계약은 어필리에이트(이하 "을")가 크루즈닷(이하 "갑")의 크루즈 여행 상품을 홍보하고 판매함에 있어 양 당사자 간의 권리와 의무를 명확히 하는 것을 목적으로 합니다.',
    ],
  },
  {
    title: '제2조 (계약 기간)',
    clauses: [
      '1. 본 계약의 기간은 계약 체결일로부터 1년으로 합니다.',
      '2. 계약 기간 만료 1개월 전까지 양 당사자 어느 일방이 서면으로 해지 의사를 표시하지 않는 한, 본 계약은 동일한 조건으로 1년씩 자동 연장됩니다.',
    ],
  },
  {
    title: '제3조 (을의 의무)',
    clauses: [
      '1. 을은 갑의 크루즈 여행 상품을 성실히 홍보하고 판매해야 합니다.',
      '2. 을은 갑이 제공하는 상품 정보를 정확하게 전달해야 합니다.',
      '3. 을은 고객의 개인정보를 관련 법령에 따라 보호해야 합니다.',
      '4. 을은 갑의 브랜드 이미지를 손상시키는 행위를 해서는 안 됩니다.',
    ],
  },
  {
    title: '제4조 (갑의 의무)',
    clauses: [
      '1. 갑은 을에게 판매에 필요한 상품 정보와 마케팅 자료를 제공해야 합니다.',
      '2. 갑은 약정된 수수료를 정해진 기간 내에 지급해야 합니다.',
      '3. 갑은 을의 판매 활동을 위한 기술적 지원을 제공해야 합니다.',
    ],
  },
  {
    title: '제5조 (수수료)',
    clauses: [
      '1. 갑은 을이 판매한 상품에 대해 별도로 정한 수수료율에 따라 수수료를 지급합니다.',
      '2. 수수료는 고객의 여행 출발 후 익월 말일에 지급합니다.',
      '3. 고객의 취소 또는 환불 시 수수료는 조정될 수 있습니다.',
    ],
  },
  {
    title: '제6조 (계약 해지)',
    clauses: [
      '1. 양 당사자는 30일 전 서면 통지로 본 계약을 해지할 수 있습니다.',
      '2. 다음의 경우 상대방에 대한 통지로 즉시 계약을 해지할 수 있습니다:',
      '   - 상대방이 본 계약의 중요한 조항을 위반한 경우',
      '   - 상대방이 파산, 회생 절차 등에 들어간 경우',
      '   - 상대방의 행위로 인해 자사의 명예나 신용이 심각하게 손상된 경우',
    ],
  },
  {
    title: '제7조 (비밀유지)',
    clauses: [
      '양 당사자는 본 계약의 이행 과정에서 알게 된 상대방의 영업 비밀 및 기밀 정보를 계약 기간 중은 물론 계약 종료 후에도 제3자에게 누설하거나 본 계약의 목적 외의 용도로 사용해서는 안 됩니다.',
    ],
  },
  {
    title: '제8조 (분쟁 해결)',
    clauses: [
      '1. 본 계약과 관련된 분쟁은 우선 양 당사자 간의 협의로 해결합니다.',
      '2. 협의가 이루어지지 않을 경우 갑의 소재지를 관할하는 법원을 전속 관할 법원으로 합니다.',
    ],
  },
];

const REQUIRED_CONSENTS = [
  {
    id: 'personalInfo',
    title: '개인정보 수집 및 이용 동의',
    description: '어필리에이트 활동을 위해 필요한 개인정보(성명, 연락처, 이메일, 계좌정보 등)를 수집하고 이용하는 것에 동의합니다.',
    required: true,
  },
  {
    id: 'marketing',
    title: '마케팅 정보 수신 동의',
    description: '크루즈닷의 프로모션, 이벤트, 신상품 정보 등 마케팅 정보를 이메일, SMS 등으로 수신하는 것에 동의합니다.',
    required: true,
  },
  {
    id: 'terms',
    title: '어필리에이트 이용약관 동의',
    description: '크루즈닷 어필리에이트 프로그램의 이용약관을 읽고 이해하였으며, 이에 동의합니다.',
    required: true,
  },
];

function getServiceAccountAuth() {
  const privateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error('Google Service Account credentials not configured');
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

async function findOrCreateFolder(drive, folderName, parentFolderId) {
  const searchResponse = await drive.files.list({
    q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    console.log(`  폴더 발견: ${folderName}`);
    return searchResponse.data.files[0].id;
  }

  const createResponse = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  console.log(`  폴더 생성: ${folderName}`);
  return createResponse.data.id;
}

/**
 * 전체 계약서 내용이 포함된 PDF 생성 (contract-pdf.ts와 동일한 구조)
 */
async function generateFullContractPDF(contract) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();

    const metadata = contract.metadata || {};
    const signatures = metadata.signatures || {};

    const contractTypeLabel = {
      SALES_AGENT: '판매원',
      BRANCH_MANAGER: '대리점장',
      CRUISE_STAFF: '크루즈 스태프',
      PRIMARKETER: '프리마케터',
      SUBSCRIPTION_AGENT: '정액제',
    }[metadata.contractType || 'SALES_AGENT'] || '판매원';

    const submittedDate = contract.submittedAt
      ? new Date(contract.submittedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    const signedDate = contract.contractSignedAt
      ? new Date(contract.contractSignedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    // 서명 이미지 HTML 생성
    let signatureImagesHtml = '';

    if (signatures.main?.url && signatures.main.url.startsWith('data:image')) {
      signatureImagesHtml += `
        <div class="signature-section">
          <h3>서명</h3>
          <img src="${signatures.main.url}" alt="서명" class="signature-image" />
          <p class="signature-name">${contract.name}</p>
        </div>
      `;
    }

    if (signatures.education?.url && signatures.education.url.startsWith('data:image')) {
      signatureImagesHtml += `
        <div class="signature-section">
          <h3>교육 이수 서명</h3>
          <img src="${signatures.education.url}" alt="교육 이수 서명" class="signature-image" />
          <p class="signature-name">${contract.name}</p>
        </div>
      `;
    }

    if (signatures.b2b?.url && signatures.b2b.url.startsWith('data:image')) {
      signatureImagesHtml += `
        <div class="signature-section">
          <h3>B2B 계약 서명</h3>
          <img src="${signatures.b2b.url}" alt="B2B 계약 서명" class="signature-image" />
          <p class="signature-name">${contract.name}</p>
        </div>
      `;
    }

    // 주민등록번호 마스킹
    const maskResidentId = (id) => {
      if (!id || id.length <= 6) return id || '';
      return `${id.slice(0, 6)}-*******`;
    };

    const html = `
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
        <td>${contract.name || ''}</td>
      </tr>
      <tr>
        <td>연락처</td>
        <td>${contract.phone || ''}</td>
      </tr>
      ${contract.email ? `<tr>
        <td>이메일</td>
        <td>${contract.email}</td>
      </tr>` : ''}
      ${contract.address ? `<tr>
        <td>주소</td>
        <td>${contract.address}</td>
      </tr>` : ''}
      ${contract.residentId ? `<tr>
        <td>주민등록번호</td>
        <td>${maskResidentId(contract.residentId)}</td>
      </tr>` : ''}
      ${contract.bankName ? `<tr>
        <td>은행명</td>
        <td>${contract.bankName}</td>
      </tr>` : ''}
      ${contract.bankAccount ? `<tr>
        <td>계좌번호</td>
        <td>${contract.bankAccount}</td>
      </tr>` : ''}
      ${contract.bankAccountHolder ? `<tr>
        <td>예금주</td>
        <td>${contract.bankAccountHolder}</td>
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
    </div>

    <div class="agreement-statement">
      <p><strong>위 어필리에이트 계약 내용 및 필수 동의 사항을 모두 확인하고 동의하며 서명합니다.</strong></p>
    </div>
  </div>

  ${signatureImagesHtml}

  <div class="contract-footer">
    <p>본 계약서는 전자적으로 생성되었습니다.</p>
    <p>생성일시: ${new Date().toLocaleString('ko-KR')}</p>
  </div>
</body>
</html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.evaluateHandle(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      timeout: 60000,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function backupContractPDFs() {
  console.log('=== 전체 계약서 PDF Drive 백업 시작 ===\n');

  const auth = getServiceAccountAuth();
  const drive = google.drive({ version: 'v3', auth });

  // boss3, boss4, boss5 사용자 조회 (계약서가 있는 사용자)
  const targetPhones = ['boss3', 'boss4', 'boss5'];

  const users = await prisma.user.findMany({
    where: {
      phone: { in: targetPhones },
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
  });

  console.log(`총 ${users.length}명의 파트너 발견\n`);

  for (const user of users) {
    console.log(`\n=== ${user.phone} (${user.name}) 처리 중 ===`);

    // 프로필 조회
    const profile = await prisma.affiliateProfile.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        affiliateCode: true,
        displayName: true,
      },
    });

    if (!profile) {
      console.log(`  프로필 없음, 건너뜀`);
      continue;
    }

    // 계약서 조회
    const contract = await prisma.affiliateContract.findFirst({
      where: { userId: user.id },
    });

    if (!contract) {
      console.log(`  계약서 없음, 건너뜀`);
      continue;
    }

    // 폴더명: [Code]_[Name]
    const folderName = `${profile.affiliateCode}_${user.name}`;

    // 파트너 폴더 찾기
    const partnerFolderId = await findOrCreateFolder(
      drive,
      folderName,
      AFFILIATE_DOCUMENTS_FOLDER_ID
    );

    // Contracts 폴더 찾기/생성
    const contractsFolderId = await findOrCreateFolder(
      drive,
      'Contracts',
      partnerFolderId
    );

    // 기존 PDF 파일 삭제 (중복 방지)
    try {
      const existingFiles = await drive.files.list({
        q: `'${contractsFolderId}' in parents and name contains 'contract_' and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (existingFiles.data.files && existingFiles.data.files.length > 0) {
        for (const file of existingFiles.data.files) {
          await drive.files.delete({
            fileId: file.id,
            supportsAllDrives: true,
          });
          console.log(`  기존 파일 삭제: ${file.name}`);
        }
      }
    } catch (e) {
      // 삭제 실패해도 계속 진행
    }

    // PDF 생성
    console.log(`  전체 계약서 PDF 생성 중...`);
    try {
      const pdfBuffer = await generateFullContractPDF(contract);

      // PDF 업로드
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const pdfFileName = `contract_${contract.name}_${contract.id}_${timestamp}.pdf`;

      const stream = new Readable();
      stream.push(pdfBuffer);
      stream.push(null);

      await drive.files.create({
        requestBody: {
          name: pdfFileName,
          parents: [contractsFolderId],
        },
        media: {
          mimeType: 'application/pdf',
          body: stream,
        },
        fields: 'id, webViewLink',
        supportsAllDrives: true,
      });

      console.log(`    계약서 PDF 업로드 완료: ${pdfFileName}`);
    } catch (pdfError) {
      console.error(`    계약서 PDF 생성/업로드 실패:`, pdfError.message || pdfError);
    }

    console.log(`  ${user.phone} 백업 완료`);
  }

  console.log('\n=== 백업 완료 ===');
  console.log(`\n📊 Drive 폴더: https://drive.google.com/drive/folders/${AFFILIATE_DOCUMENTS_FOLDER_ID}`);

  await prisma.$disconnect();
}

backupContractPDFs().catch(console.error);
