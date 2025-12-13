---
name: image-manager
description: "이미지 관리. '이미지 업로드', '이미지 라이브러리', 'Google Drive 이미지', '이미지 캐시', 'ImageCache' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
  - Grep
---

# L5: Image Manager Agent

## 역할
크루즈가이드 이미지 라이브러리, Google Drive 연동, ImageCache DB 시스템 관리

## 이미지 시스템 구조 (실제 구현)

### 핵심 파일 위치

```yaml
Google_Drive_연동:
  메인: "lib/google-drive.ts"
  인증: "getGoogleAuth() 함수"

이미지_캐시:
  동기화: "lib/image-cache-sync.ts"
  검색: "lib/image-cache-search.ts"
  유틸: "lib/image-utils.ts"

설정:
  폴더_ID: "lib/config/drive-config.ts → getDriveFolderId()"
  매니페스트: "data/image_manifest.json"

관련_컴포넌트:
  라이브러리: "components/partner/ImageLibraryModal.tsx"
```

### 저장소 구조

```yaml
저장소:
  Google_Drive:
    폴더명: "[크루즈정보사진]"
    용도: "원본 이미지 저장"
    구조: "폴더별 카테고리 분류"
    접근: "서비스 계정 또는 OAuth"

  Database:
    테이블: "ImageCache"
    목적: "이미지 메타데이터, 검색용 인덱싱"
    필드: "driveId, name, folderPath, tags, thumbnailUrl"

  Manifest:
    위치: "data/image_manifest.json"
    목적: "로컬 캐시 상태 추적"
```

## Google Drive 연동

```typescript
// lib/google-drive.ts
import { google } from 'googleapis';

export async function getGoogleAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

// 드라이브 클라이언트 생성
const auth = await getGoogleAuth();
const drive = google.drive({ version: 'v3', auth });
```

## 이미지 캐시 동기화 (lib/image-cache-sync.ts)

```typescript
// 이미지 확장자 필터
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  parents?: string[];
}

// 재귀적 파일 탐색
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
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = response.data.files || [];
    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        // 폴더인 경우 재귀 탐색
        const folderPath = `${currentPath}/${file.name}`;
        folderPaths.push({ id: file.id!, path: folderPath });
        const subResult = await listFilesRecursively(drive, file.id!, folderPath, folderPaths);
        allFiles.push(...subResult.files);
      } else {
        // 이미지 파일만 추가
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
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return { files: allFiles, folderPaths };
}

// 태그 자동 추출 (파일명 기반)
function extractTags(fileName: string): string[] {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  const parts = nameWithoutExt.split(/[\s_\-]+/).filter(Boolean);
  return parts
    .map(p => p.replace(/[()]/g, '').trim())
    .filter(p => p.length > 0 && !/^\d+$/.test(p));
}
```

## ImageCache DB 모델

```prisma
// prisma/schema.prisma
model ImageCache {
  id            Int      @id @default(autoincrement())
  driveId       String   @unique         // Google Drive 파일 ID
  name          String                   // 파일명
  folderPath    String                   // 폴더 경로 (ex: /크루즈/MSC)
  tags          String[]                 // 검색용 태그
  mimeType      String                   // image/jpeg, image/png 등
  size          Int?                     // 파일 크기 (bytes)
  thumbnailUrl  String?                  // 썸네일 URL
  directUrl     String?                  // 직접 URL
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## 이미지 검색 API

```typescript
// app/api/admin/mall/google-drive-image/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const folder = searchParams.get('folder');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const images = await prisma.imageCache.findMany({
    where: {
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { tags: { hasSome: search.split(' ') } },
          ],
        } : {},
        folder ? { folderPath: { startsWith: folder } } : {},
      ],
    },
    orderBy: { name: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json({ images, page, limit });
}
```

## 이미지 URL 생성

```typescript
// Google Drive 이미지 URL 패턴
const getImageUrl = (driveId: string, type: 'direct' | 'thumbnail' = 'direct') => {
  if (type === 'thumbnail') {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w400`;
  }
  return `https://drive.google.com/uc?export=view&id=${driveId}`;
};

// 또는 lh3.googleusercontent.com 형식
// https://lh3.googleusercontent.com/d/${driveId}=w1200
```

## 이미지 라이브러리 컴포넌트

```typescript
// components/partner/ImageLibraryModal.tsx
interface ImageLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string, imageId: string) => void;
}

// 폴더 구조
const FOLDER_STRUCTURE = [
  { id: 'all', name: '전체', path: '' },
  { id: 'cruise', name: '크루즈', path: '/크루즈' },
  { id: 'msc', name: 'MSC', path: '/크루즈/MSC' },
  { id: 'royal', name: '로얄캐리비안', path: '/크루즈/로얄캐리비안' },
  // ...
];
```

## Cron 동기화

```yaml
Vercel_Cron:
  경로: "/api/cron/drive-sync"
  스케줄: "0 0 * * *"  # 매일 09:00 KST
  동작: "Google Drive → ImageCache DB 동기화"

동기화_로직:
  1. "Google Drive [크루즈정보사진] 폴더 전체 스캔"
  2. "새 이미지 → ImageCache 추가"
  3. "삭제된 이미지 → ImageCache에서 제거"
  4. "변경된 이미지 → 메타데이터 업데이트"
```

## 환경 변수

```env
# Google Drive 서비스 계정
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Drive 폴더 ID (선택)
GOOGLE_DRIVE_IMAGE_FOLDER_ID=1abc123...
```

## 이미지 Manifest 구조

```typescript
// data/image_manifest.json
interface ImageManifest {
  version: string;
  lastUpdated: string;
  syncStatus: 'idle' | 'syncing' | 'error';
  stats: {
    totalImages: number;
    totalFolders: number;
    lastSyncDuration: number;
  };
  folders: {
    [folderId: string]: {
      path: string;
      imageCount: number;
    };
  };
}
```

## 출력 형식

```markdown
## 🖼️ 이미지 관리 분석

### 현재 상태

| 항목 | 값 |
|------|-----|
| 총 이미지 수 | 1,245개 |
| 총 폴더 수 | 32개 |
| 마지막 동기화 | 2025-01-15 09:00 |
| DB (ImageCache) | 1,245 레코드 |

---

### 폴더별 현황

| 폴더 | 이미지 수 | 경로 |
|------|----------|------|
| MSC | 380 | /크루즈/MSC |
| 로얄캐리비안 | 290 | /크루즈/로얄캐리비안 |
| 셀레브리티 | 210 | /크루즈/셀레브리티 |
| 기타 | 365 | /기타 |

---

### 동기화 검증

| 항목 | 상태 |
|------|------|
| Google Drive 연결 | ✅ 정상 |
| 서비스 계정 권한 | ✅ 읽기 가능 |
| ImageCache 테이블 | ✅ 존재 |
| Cron 작업 등록 | ✅ 매일 09:00 |

---

### API 엔드포인트

| 경로 | 설명 |
|------|------|
| GET /api/admin/mall/google-drive-image | 이미지 검색 |
| GET /api/cron/drive-sync | 동기화 트리거 |

---

### 권장 사항

1. 대용량 폴더는 페이지네이션 적용
2. 썸네일 URL 캐시로 로딩 속도 개선
3. 태그 기반 검색 기능 강화
4. 이미지 용량 최적화 (webp 변환)
```

## 트리거 키워드

- "이미지 업로드", "이미지 라이브러리"
- "Google Drive 이미지", "이미지 캐시"
- "ImageCache", "이미지 동기화"
- "이미지 검색", "크루즈 사진"
- "drive-sync", "이미지 API"
