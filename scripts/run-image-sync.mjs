/**
 * 이미지 캐시 동기화 스크립트
 * 실행: node scripts/run-image-sync.mjs
 */

import 'dotenv/config';
import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function getAuth() {
  // 환경변수에서 Private Key 찾기
  const rawPrivateKey =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY;

  if (!rawPrivateKey) {
    throw new Error('Google Service Account Private Key 환경변수가 없습니다.');
  }

  // 환경변수에서 Client Email 찾기
  const clientEmail =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL;

  if (!clientEmail) {
    throw new Error('Google Service Account Email 환경변수가 없습니다.');
  }

  // Private Key 형식 보정 (\\n → 실제 줄바꿈)
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

async function listFilesRecursively(drive, folderId, currentPath, folderPaths = []) {
  const allFiles = [];
  let pageToken;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, webContentLink, thumbnailLink, parents)',
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = response.data.files || [];
    pageToken = response.data.nextPageToken;

    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        const folderPath = `${currentPath}/${file.name}`;
        folderPaths.push({ id: file.id, path: folderPath });

        const subResult = await listFilesRecursively(
          drive,
          file.id,
          folderPath,
          folderPaths
        );
        allFiles.push(...subResult.files);
      } else {
        const ext = path.extname(file.name || '').toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          allFiles.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            webContentLink: file.webContentLink,
            thumbnailLink: file.thumbnailLink,
            parents: file.parents,
          });
        }
      }
    }
  } while (pageToken);

  return { files: allFiles, folderPaths };
}

function extractTags(fileName) {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  const parts = nameWithoutExt.split(/[\s_\-]+/).filter(Boolean);
  return parts
    .map(p => p.replace(/[()]/g, '').trim())
    .filter(p => p.length > 0 && !/^\d+$/.test(p));
}

async function syncImageCache() {
  try {
    console.log('[ImageCacheSync] 이미지 캐시 동기화 시작...');

    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    // 크루즈정보사진 폴더 ID (drive-config.ts에서 가져온 값)
    const cruiseImagesFolderId = '17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck';
    console.log('[ImageCacheSync] 폴더 ID:', cruiseImagesFolderId);

    const folderPaths = [
      { id: cruiseImagesFolderId, path: '/크루즈정보사진' }
    ];

    const { files, folderPaths: allFolderPaths } = await listFilesRecursively(
      drive,
      cruiseImagesFolderId,
      '/크루즈정보사진',
      folderPaths
    );

    console.log(`[ImageCacheSync] 총 ${files.length}개 이미지 파일 발견`);

    const folderIdToPath = new Map();
    for (const fp of allFolderPaths) {
      folderIdToPath.set(fp.id, fp.path);
    }

    const existingIds = new Set(
      (await prisma.imageCache.findMany({ select: { driveFileId: true } }))
        .map(item => item.driveFileId)
    );

    const driveFileIds = new Set(files.map(f => f.id));

    let added = 0;
    let updated = 0;

    const batchSize = 100;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      await Promise.all(batch.map(async (file) => {
        const parentId = file.parents?.[0];
        const folderPath = parentId ? (folderIdToPath.get(parentId) || '/크루즈정보사진') : '/크루즈정보사진';
        const filePath = `${folderPath}/${file.name}`;

        const title = path.basename(file.name, path.extname(file.name));
        const tags = extractTags(file.name);

        const driveUrl = `https://drive.google.com/uc?export=view&id=${file.id}`;
        const thumbnailUrl = file.thumbnailLink || driveUrl;

        const data = {
          path: filePath,
          fileName: file.name,
          folder: folderPath,
          title,
          tags,
          mimeType: file.mimeType,
          fileSize: file.size ? parseInt(file.size) : null,
          driveUrl,
          thumbnailUrl,
          syncedAt: new Date(),
        };

        const isNew = !existingIds.has(file.id);

        await prisma.imageCache.upsert({
          where: { driveFileId: file.id },
          create: {
            driveFileId: file.id,
            ...data,
          },
          update: data,
        });

        if (isNew) added++;
        else updated++;
      }));

      console.log(`[ImageCacheSync] 처리 중: ${Math.min(i + batchSize, files.length)}/${files.length}`);
    }

    const toDelete = [...existingIds].filter(id => !driveFileIds.has(id));
    if (toDelete.length > 0) {
      await prisma.imageCache.deleteMany({
        where: { driveFileId: { in: toDelete } }
      });
    }

    const total = await prisma.imageCache.count();

    console.log(`[ImageCacheSync] 완료 - 추가: ${added}, 업데이트: ${updated}, 삭제: ${toDelete.length}, 총: ${total}`);

    return {
      success: true,
      added,
      updated,
      deleted: toDelete.length,
      total,
    };
  } catch (error) {
    console.error('[ImageCacheSync] 동기화 실패:', error);
    return {
      success: false,
      added: 0,
      updated: 0,
      deleted: 0,
      total: 0,
      error: error.message,
    };
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
syncImageCache().then(result => {
  console.log('동기화 결과:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});
