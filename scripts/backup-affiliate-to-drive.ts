/**
 * 기존 어필리에이트 계약서/서명/신분증/통장사본을 Google Drive에 백업하는 스크립트
 *
 * 폴더 구조: Affiliate_Documents -> [Code]_[Name] -> [Signatures|ID_Cards|BankBooks]
 *
 * 실행: npx ts-node scripts/backup-affiliate-to-drive.ts
 */

import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import { Readable } from 'stream';

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
async function findOrCreateFolder(
  drive: any,
  folderName: string,
  parentFolderId: string
): Promise<string> {
  // 기존 폴더 찾기
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

  // 새 폴더 생성
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
 * Base64 이미지를 Drive에 업로드
 */
async function uploadBase64ImageToDrive(
  drive: any,
  base64Data: string,
  fileName: string,
  folderId: string
): Promise<{ ok: boolean; fileId?: string; url?: string }> {
  try {
    // base64 데이터 추출 (data:image/png;base64, 제거)
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      console.error('Invalid base64 data format');
      return { ok: false };
    }

    const mimeType = matches[1];
    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, 'base64');

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    console.log(`    파일 업로드 완료: ${fileName}`);
    return {
      ok: true,
      fileId: response.data.id,
      url: response.data.webViewLink,
    };
  } catch (error) {
    console.error(`    파일 업로드 실패: ${fileName}`, error);
    return { ok: false };
  }
}

/**
 * 로컬 파일을 Drive에 업로드
 */
async function uploadLocalFileToDrive(
  drive: any,
  filePath: string,
  fileName: string,
  folderId: string
): Promise<{ ok: boolean; fileId?: string; url?: string }> {
  try {
    const fs = await import('fs');
    const path = await import('path');

    // 서버 로컬 경로 처리
    let fullPath = filePath;
    if (filePath.startsWith('/uploads/')) {
      fullPath = path.join(process.cwd(), 'public', filePath);
    }

    if (!fs.existsSync(fullPath)) {
      console.error(`    파일 없음: ${fullPath}`);
      return { ok: false };
    }

    const buffer = fs.readFileSync(fullPath);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // MIME 타입 추정
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    console.log(`    파일 업로드 완료: ${fileName}`);
    return {
      ok: true,
      fileId: response.data.id,
      url: response.data.webViewLink,
    };
  } catch (error) {
    console.error(`    파일 업로드 실패: ${fileName}`, error);
    return { ok: false };
  }
}

async function backupAffiliates() {
  console.log('=== 어필리에이트 Drive 백업 시작 ===\n');

  const auth = getServiceAccountAuth();
  const drive = google.drive({ version: 'v3', auth });

  // boss2~boss5 사용자 조회
  const targetPhones = ['boss2', 'boss3', 'boss4', 'boss5'];

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
      select: {
        id: true,
        name: true,
        metadata: true,
      },
    });

    // 문서 조회
    const docs = await prisma.affiliateDocument.findMany({
      where: { profileId: profile.id },
      select: {
        documentType: true,
        filePath: true,
        fileName: true,
      },
    });

    // 폴더명: [Code]_[Name]
    const folderName = `${profile.affiliateCode}_${user.name}`;

    // 파트너 폴더 생성
    const partnerFolderId = await findOrCreateFolder(
      drive,
      folderName,
      AFFILIATE_DOCUMENTS_FOLDER_ID
    );

    // 서명 이미지 백업 및 계약서 PDF 생성
    if (contract) {
      const metadata = contract.metadata as any;
      const signatures = metadata?.signatures;

      if (signatures) {
        const signaturesFolderId = await findOrCreateFolder(
          drive,
          'Signatures',
          partnerFolderId
        );

        // main, b2b, education 서명 처리
        for (const sigType of ['main', 'b2b', 'education']) {
          const sig = signatures[sigType];
          if (sig?.url && sig.url.startsWith('data:image')) {
            const fileName = `${sigType}_signature_${contract.name}_${contract.id}.png`;
            await uploadBase64ImageToDrive(
              drive,
              sig.url,
              fileName,
              signaturesFolderId
            );
          }
        }
      }

      // 계약서 PDF 생성 및 Contracts 폴더에 저장
      try {
        console.log(`  계약서 PDF 생성 중...`);
        const { generateContractPDFFromId } = await import('../lib/affiliate/contract-pdf');
        const pdfBuffer = await generateContractPDFFromId(contract.id);

        // Contracts 폴더 생성
        const contractsFolderId = await findOrCreateFolder(
          drive,
          'Contracts',
          partnerFolderId
        );

        // PDF 업로드
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const pdfFileName = `contract_${contract.name}_${contract.id}_${timestamp}.pdf`;

        const stream = new Readable();
        stream.push(pdfBuffer);
        stream.push(null);

        const pdfResponse = await drive.files.create({
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
      } catch (pdfError: any) {
        console.error(`    계약서 PDF 생성/업로드 실패:`, pdfError?.message || pdfError);
      }
    }

    // 신분증/통장사본 백업
    for (const doc of docs) {
      let subFolderName = 'Etc';
      if (doc.documentType === 'idCard') {
        subFolderName = 'ID_Cards';
      } else if (doc.documentType === 'bankbook') {
        subFolderName = 'BankBooks';
      }

      const subFolderId = await findOrCreateFolder(
        drive,
        subFolderName,
        partnerFolderId
      );

      if (doc.filePath) {
        await uploadLocalFileToDrive(
          drive,
          doc.filePath,
          doc.fileName || `${doc.documentType}_${user.phone}`,
          subFolderId
        );
      }
    }

    console.log(`  ${user.phone} 백업 완료`);
  }

  console.log('\n=== 백업 완료 ===');
  console.log(`\n📊 Drive 폴더: https://drive.google.com/drive/folders/${AFFILIATE_DOCUMENTS_FOLDER_ID}`);

  await prisma.$disconnect();
}

backupAffiliates().catch(console.error);
