/**
 * 기존 계약서를 API를 통해 전체 내용 포함 PDF로 생성하여 Google Drive에 백업하는 스크립트
 *
 * 이 스크립트는 실제 계약서 PDF API(/api/affiliate/contracts/[contractId]/pdf)를 호출하여
 * 모든 계약서 내용(어필리에이트 계약 + 교육 계약 + 서명)이 포함된 완전한 PDF를 생성합니다.
 *
 * 실행 전 서버가 실행되고 있어야 합니다: npm run dev
 * 실행: node scripts/backup-full-contracts-via-api.cjs
 */

const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const { Readable } = require('stream');

const prisma = new PrismaClient();

// 루트 폴더 ID (Affiliate_Documents)
const AFFILIATE_DOCUMENTS_FOLDER_ID = '1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI';

// 서버 주소
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

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
 * API를 통해 PDF 다운로드
 */
async function downloadPDFFromAPI(contractId) {
  const url = `${SERVER_URL}/api/affiliate/contracts/${contractId}/pdf`;
  console.log(`  API 호출: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/pdf',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 호출 실패: ${response.status} - ${errorText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`  PDF 다운로드 완료: ${buffer.length} bytes`);
  return buffer;
}

async function backupContractPDFs() {
  console.log('=== 전체 계약서 PDF Drive 백업 시작 (API 방식) ===\n');
  console.log(`서버 주소: ${SERVER_URL}\n`);

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

    // API를 통해 PDF 생성 및 다운로드
    console.log(`  전체 계약서 PDF 생성 중 (API 호출)...`);
    try {
      const pdfBuffer = await downloadPDFFromAPI(contract.id);

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
