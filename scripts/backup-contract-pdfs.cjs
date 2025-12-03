/**
 * 기존 계약서를 PDF로 생성하여 Google Drive에 백업하는 스크립트 (CommonJS 버전)
 *
 * 실행: node scripts/backup-contract-pdfs.cjs
 */

const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const { Readable } = require('stream');
const puppeteer = require('puppeteer');

const prisma = new PrismaClient();

// 루트 폴더 ID (Affiliate_Documents)
const AFFILIATE_DOCUMENTS_FOLDER_ID = '1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI';

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

/**
 * 폴더를 찾거나 생성
 */
async function findOrCreateFolder(drive, folderName, parentFolderId) {
  const searchResponse = await drive.files.list({
    q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    console.log(`  폴더 발견: ${folderName} (${searchResponse.data.files[0].id})`);
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

  console.log(`  폴더 생성: ${folderName} (${createResponse.data.id})`);
  return createResponse.data.id;
}

/**
 * 간단한 PDF 생성 (계약서 정보 포함)
 */
async function generateSimpleContractPDF(contract) {
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
    }[metadata.contractType || 'SALES_AGENT'] || '판매원';

    const signedDate = contract.contractSignedAt
      ? new Date(contract.contractSignedAt).toLocaleDateString('ko-KR')
      : '';

    // 서명 이미지 HTML
    let signatureHtml = '';
    for (const [type, sig] of Object.entries(signatures)) {
      if (sig && sig.url && sig.url.startsWith('data:image')) {
        signatureHtml += `
          <div style="margin: 20px 0;">
            <h4>${type === 'main' ? '계약 서명' : type === 'b2b' ? 'B2B 계약 서명' : '교육 이수 서명'}</h4>
            <img src="${sig.url}" style="max-width: 300px; max-height: 150px; border: 1px solid #ddd;" />
          </div>
        `;
      }
    }

    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>어필리에이트 계약서</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; line-height: 1.6; }
    h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    td { padding: 10px; border: 1px solid #ddd; }
    td:first-child { background: #f5f5f5; font-weight: bold; width: 120px; }
    .signatures { margin-top: 40px; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>어필리에이트 계약서</h1>
  <p style="text-align: center;">계약 유형: ${contractTypeLabel}</p>

  <table>
    <tr><td>성명</td><td>${contract.name || ''}</td></tr>
    <tr><td>연락처</td><td>${contract.phone || ''}</td></tr>
    ${contract.email ? `<tr><td>이메일</td><td>${contract.email}</td></tr>` : ''}
    ${contract.address ? `<tr><td>주소</td><td>${contract.address}</td></tr>` : ''}
    ${contract.bankName ? `<tr><td>은행명</td><td>${contract.bankName}</td></tr>` : ''}
    ${contract.bankAccount ? `<tr><td>계좌번호</td><td>${contract.bankAccount}</td></tr>` : ''}
    ${contract.bankAccountHolder ? `<tr><td>예금주</td><td>${contract.bankAccountHolder}</td></tr>` : ''}
    ${signedDate ? `<tr><td>서명일</td><td>${signedDate}</td></tr>` : ''}
  </table>

  <div class="signatures">
    <h3>서명</h3>
    ${signatureHtml || '<p>서명 없음</p>'}
  </div>

  <div class="footer">
    <p>본 계약서는 전자적으로 생성되었습니다.</p>
    <p>생성일시: ${new Date().toLocaleString('ko-KR')}</p>
  </div>
</body>
</html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.evaluateHandle(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function backupContractPDFs() {
  console.log('=== 계약서 PDF Drive 백업 시작 ===\n');

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

    // Contracts 폴더 생성
    const contractsFolderId = await findOrCreateFolder(
      drive,
      'Contracts',
      partnerFolderId
    );

    // PDF 생성
    console.log(`  계약서 PDF 생성 중...`);
    try {
      const pdfBuffer = await generateSimpleContractPDF(contract);

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
