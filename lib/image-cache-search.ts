/**
 * DB에서 이미지 검색 (가벼운 모듈 - API 라우트용)
 * 무거운 googleapis 의존성 없이 Prisma만 사용
 */

import prisma from '@/lib/prisma';

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
          { title: { contains: term, mode: 'insensitive' as const } },
          { folder: { contains: term, mode: 'insensitive' as const } },
          { fileName: { contains: term, mode: 'insensitive' as const } },
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
