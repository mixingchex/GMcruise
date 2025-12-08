/**
 * 구글 드라이브 [크루즈정보사진] → DB ImageCache 동기화
 * 매일 cron으로 실행되어 새 사진을 DB에 반영
 */

import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { getDriveFolderId } from '@/lib/config/drive-config';
import { logger } from '@/lib/logger';
import path from 'path';

// 이미지 확장자
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// Google Drive Auth
function getAuth() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credentials) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON 환경변수가 설정되지 않았습니다.');
  }

  const parsed = JSON.parse(credentials);
  return new google.auth.GoogleAuth({
    credentials: parsed,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  parents?: string[];
}

interface FolderPath {
  id: string;
  path: string;
}

/**
 * 폴더 내 모든 파일을 재귀적으로 가져오기
 */
async function listFilesRecursively(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  currentPath: string,
  folderPaths: FolderPath[] = []
): Promise<{ files: DriveFile[]; folderPaths: FolderPath[] }> {
  const allFiles: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, webContentLink, thumbnailLink, parents)',
      pageSize: 1000,
      pageToken,
    });

    const files = response.data.files || [];
    pageToken = response.data.nextPageToken || undefined;

    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        // 폴더인 경우 재귀 탐색
        const folderPath = `${currentPath}/${file.name}`;
        folderPaths.push({ id: file.id!, path: folderPath });

        const subResult = await listFilesRecursively(
          drive,
          file.id!,
          folderPath,
          folderPaths
        );
        allFiles.push(...subResult.files);
      } else {
        // 이미지 파일인 경우
        const ext = path.extname(file.name || '').toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          allFiles.push({
            id: file.id!,
            name: file.name!,
            mimeType: file.mimeType!,
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

/**
 * 파일 이름에서 태그 추출
 */
function extractTags(fileName: string): string[] {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  // 파일명을 공백, 언더스코어, 하이픈으로 분리
  const parts = nameWithoutExt.split(/[\s_\-]+/).filter(Boolean);
  // 숫자만 있는 태그 제거, 괄호 제거
  return parts
    .map(p => p.replace(/[()]/g, '').trim())
    .filter(p => p.length > 0 && !/^\d+$/.test(p));
}

/**
 * 구글 드라이브 크루즈정보사진 → DB 동기화
 */
export async function syncImageCache(): Promise<{
  success: boolean;
  added: number;
  updated: number;
  deleted: number;
  total: number;
  error?: string;
}> {
  try {
    logger.log('[ImageCacheSync] 이미지 캐시 동기화 시작...');

    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    // 크루즈정보사진 폴더 ID 가져오기
    const cruiseImagesFolderId = await getDriveFolderId('CRUISE_IMAGES');
    logger.log('[ImageCacheSync] 폴더 ID:', cruiseImagesFolderId);

    // 폴더 경로 매핑 (폴더 ID → 경로)
    const folderPaths: FolderPath[] = [
      { id: cruiseImagesFolderId, path: '/크루즈정보사진' }
    ];

    // 모든 이미지 파일 가져오기
    const { files, folderPaths: allFolderPaths } = await listFilesRecursively(
      drive,
      cruiseImagesFolderId,
      '/크루즈정보사진',
      folderPaths
    );

    logger.log(`[ImageCacheSync] 총 ${files.length}개 이미지 파일 발견`);

    // 폴더 ID → 경로 매핑
    const folderIdToPath = new Map<string, string>();
    for (const fp of allFolderPaths) {
      folderIdToPath.set(fp.id, fp.path);
    }

    // 현재 DB에 있는 모든 driveFileId 가져오기
    const existingIds = new Set(
      (await prisma.imageCache.findMany({ select: { driveFileId: true } }))
        .map(item => item.driveFileId)
    );

    // 드라이브에서 가져온 파일 ID 세트
    const driveFileIds = new Set(files.map(f => f.id));

    let added = 0;
    let updated = 0;

    // 배치로 upsert 처리
    const batchSize = 100;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      await Promise.all(batch.map(async (file) => {
        // 부모 폴더 경로 찾기
        const parentId = file.parents?.[0];
        const folderPath = parentId ? (folderIdToPath.get(parentId) || '/크루즈정보사진') : '/크루즈정보사진';
        const filePath = `${folderPath}/${file.name}`;

        const title = path.basename(file.name, path.extname(file.name));
        const tags = extractTags(file.name);

        // 구글 드라이브 직접 URL 생성
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

      logger.log(`[ImageCacheSync] 처리 중: ${Math.min(i + batchSize, files.length)}/${files.length}`);
    }

    // 드라이브에서 삭제된 파일 DB에서도 삭제
    const toDelete = [...existingIds].filter(id => !driveFileIds.has(id));
    if (toDelete.length > 0) {
      await prisma.imageCache.deleteMany({
        where: { driveFileId: { in: toDelete } }
      });
    }

    const total = await prisma.imageCache.count();

    logger.log(`[ImageCacheSync] 완료 - 추가: ${added}, 업데이트: ${updated}, 삭제: ${toDelete.length}, 총: ${total}`);

    return {
      success: true,
      added,
      updated,
      deleted: toDelete.length,
      total,
    };
  } catch (error: any) {
    logger.error('[ImageCacheSync] 동기화 실패:', error);
    return {
      success: false,
      added: 0,
      updated: 0,
      deleted: 0,
      total: 0,
      error: error.message,
    };
  }
}

/**
 * DB에서 이미지 검색 (기존 searchPhotos 대체)
 */
export async function searchImagesFromDB(query: string): Promise<{
  items: Array<{ url: string; title: string; tags: string[] }>;
}> {
  if (!query || !query.trim()) {
    return { items: [] };
  }

  const searchTerms = query.trim().toLowerCase().split(/\s+/);

  // DB에서 검색 (title, folder, tags에서 검색)
  const images = await prisma.imageCache.findMany({
    where: {
      OR: searchTerms.map(term => ({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { folder: { contains: term, mode: 'insensitive' } },
          { fileName: { contains: term, mode: 'insensitive' } },
          { tags: { hasSome: [term] } },
        ]
      }))
    },
    orderBy: [
      { folder: 'asc' },
      { title: 'asc' },
    ],
    take: 200,
  });

  // 점수 기반 정렬
  const scored = images.map(img => {
    let score = 0;
    const titleLower = img.title.toLowerCase();
    const folderLower = img.folder.toLowerCase();

    for (const term of searchTerms) {
      if (folderLower.includes(term)) score += 3;
      if (titleLower.includes(term)) score += 2;
      if (img.tags.some(tag => tag.toLowerCase().includes(term))) score += 2;
    }

    return { score, img };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    items: scored.slice(0, 200).map(s => ({
      url: s.img.driveUrl || s.img.path,
      title: s.img.title,
      tags: s.img.tags,
    }))
  };
}

/**
 * DB에서 하위 폴더 목록 가져오기
 */
export async function getSubfoldersFromDB(folderName: string): Promise<Array<{
  name: string;
  displayName: string;
  icon: string;
  photoCount: number;
}>> {
  const searchTerm = folderName.toLowerCase();

  // 해당 폴더 하위의 모든 이미지 가져오기
  const images = await prisma.imageCache.findMany({
    where: {
      folder: { contains: searchTerm, mode: 'insensitive' }
    },
    select: { folder: true }
  });

  // 하위 폴더 추출
  const subfolderCounts = new Map<string, number>();

  for (const img of images) {
    const folderParts = img.folder.split('/');
    const searchIndex = folderParts.findIndex(p => p.toLowerCase().includes(searchTerm));

    if (searchIndex >= 0 && searchIndex < folderParts.length - 1) {
      const subfolderPath = folderParts.slice(0, searchIndex + 2).join('/');
      subfolderCounts.set(subfolderPath, (subfolderCounts.get(subfolderPath) || 0) + 1);
    }
  }

  const folderIconMap: Record<string, string> = {
    '객실': '🛏️',
    '내부시설': '🏛️',
    '수영장': '🏊',
    '자쿠지': '🛁',
    '엑티비티': '🎯',
    '지도': '🗺️',
    '쉽맵': '🗺️',
    '키즈': '👶',
    '행사': '🎉',
    '외관': '🚢',
    '와이파이': '📶',
    'qna': '❓',
  };

  const subfolders = Array.from(subfolderCounts.entries()).map(([fullPath, count]) => {
    const displayName = fullPath.split('/').pop() || fullPath;

    let icon = '📁';
    for (const [keyword, emoji] of Object.entries(folderIconMap)) {
      if (displayName.includes(keyword)) {
        icon = emoji;
        break;
      }
    }

    return {
      name: fullPath,
      displayName,
      icon,
      photoCount: count,
    };
  });

  return subfolders.sort((a, b) => b.photoCount - a.photoCount);
}
