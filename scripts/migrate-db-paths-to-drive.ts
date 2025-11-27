#!/usr/bin/env ts-node
import 'dotenv/config';

import prisma from '../lib/prisma';
import { uploadFileToDrive, optimizeDriveUrl } from '../lib/google-drive';
import { promises as fs } from 'fs';
import path from 'path';
import { lookup as lookupMime } from 'mime-types';

type MigrationResult = {
  model: string;
  field: string;
  recordId: number | string;
  oldPath: string;
  newUrl: string | null;
  status: 'migrated' | 'skipped' | 'error' | 'not-found';
  error?: string;
};

const ROOT_DIR = process.cwd();
const results: MigrationResult[] = [];

// 로컬 파일 경로를 Google Drive로 업로드하고 URL 반환
async function migrateLocalFileToDrive(
  localPath: string,
  targetFolderId: string,
  makePublic: boolean = true
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    // 절대 경로로 변환
    const absolutePath = localPath.startsWith('/')
      ? path.join(ROOT_DIR, 'public', localPath)
      : path.join(ROOT_DIR, localPath);

    // 파일 존재 확인
    try {
      await fs.access(absolutePath);
    } catch {
      return { ok: false, error: 'File not found' };
    }

    // 파일 읽기
    const buffer = await fs.readFile(absolutePath);
    const fileName = path.basename(absolutePath);
    const mimeType = lookupMime(fileName) || 'application/octet-stream';

    // Google Drive에 업로드
    const uploadResult = await uploadFileToDrive({
      folderId: targetFolderId,
      fileName,
      mimeType,
      buffer,
      makePublic,
    });

    if (!uploadResult.ok || !uploadResult.url) {
      return { ok: false, error: uploadResult.error || 'Upload failed' };
    }

    return { ok: true, url: uploadResult.url };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Unknown error' };
  }
}

// URL이 이미 Google Drive URL인지 확인
function isGoogleDriveUrl(url: string): boolean {
  return url.includes('drive.google.com') || url.includes('googleusercontent.com');
}

// 로컬 경로인지 확인
function isLocalPath(path: string): boolean {
  return (
    path.startsWith('/uploads/') ||
    path.startsWith('/images/') ||
    path.startsWith('/크루즈정보사진/') ||
    path.startsWith('uploads/') ||
    path.startsWith('public/')
  );
}

// 경로에서 타입 추론 (어떤 폴더에 업로드할지 결정)
function getTargetFolderForPath(filePath: string): { folderId: string; makePublic: boolean } | null {
  if (filePath.includes('/uploads/images/') || filePath.includes('/uploads/pages/')) {
    return {
      folderId: process.env.GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID || '',
      makePublic: true,
    };
  }
  if (filePath.includes('/uploads/profiles/')) {
    return {
      folderId: process.env.GOOGLE_DRIVE_UPLOADS_PROFILES_FOLDER_ID || '',
      makePublic: true,
    };
  }
  if (filePath.includes('/uploads/reviews/')) {
    return {
      folderId: process.env.GOOGLE_DRIVE_UPLOADS_REVIEWS_FOLDER_ID || '',
      makePublic: true,
    };
  }
  if (filePath.includes('/크루즈정보사진/')) {
    return {
      folderId: process.env.GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID || '',
      makePublic: true,
    };
  }
  // 기본값: 이미지 폴더
  return {
    folderId: process.env.GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID || '',
    makePublic: true,
  };
}

async function migrateUserImages() {
  console.log('[DB Migration] User 이미지 마이그레이션 시작...');
  
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { profileImage: { not: null } },
        { coverImage: { not: null } },
      ],
    },
    select: {
      id: true,
      profileImage: true,
      coverImage: true,
    },
  });

  for (const user of users) {
    // profileImage 마이그레이션
    if (user.profileImage && isLocalPath(user.profileImage) && !isGoogleDriveUrl(user.profileImage)) {
      const target = getTargetFolderForPath(user.profileImage);
      if (target && target.folderId) {
        const result = await migrateLocalFileToDrive(user.profileImage, target.folderId, target.makePublic);
        
        if (result.ok && result.url) {
          await prisma.user.update({
            where: { id: user.id },
            data: { profileImage: result.url },
          });
          results.push({
            model: 'User',
            field: 'profileImage',
            recordId: user.id,
            oldPath: user.profileImage,
            newUrl: result.url,
            status: 'migrated',
          });
          console.log(`[DB Migration] User ${user.id} profileImage 마이그레이션 완료`);
        } else {
          results.push({
            model: 'User',
            field: 'profileImage',
            recordId: user.id,
            oldPath: user.profileImage,
            newUrl: null,
            status: 'error',
            error: result.error,
          });
        }
      }
    }

    // coverImage 마이그레이션
    if (user.coverImage && isLocalPath(user.coverImage) && !isGoogleDriveUrl(user.coverImage)) {
      const target = getTargetFolderForPath(user.coverImage);
      if (target && target.folderId) {
        const result = await migrateLocalFileToDrive(user.coverImage, target.folderId, target.makePublic);
        
        if (result.ok && result.url) {
          await prisma.user.update({
            where: { id: user.id },
            data: { coverImage: result.url },
          });
          results.push({
            model: 'User',
            field: 'coverImage',
            recordId: user.id,
            oldPath: user.coverImage,
            newUrl: result.url,
            status: 'migrated',
          });
          console.log(`[DB Migration] User ${user.id} coverImage 마이그레이션 완료`);
        } else {
          results.push({
            model: 'User',
            field: 'coverImage',
            recordId: user.id,
            oldPath: user.coverImage,
            newUrl: null,
            status: 'error',
            error: result.error,
          });
        }
      }
    }
  }
}

async function migrateProductImages() {
  console.log('[DB Migration] Product 이미지 마이그레이션 시작...');
  
  const products = await prisma.cruiseProduct.findMany({
    where: {
      OR: [
        { galleryImages: { not: null } },
        { featuredImages: { not: null } },
      ],
    },
    select: {
      productCode: true,
      galleryImages: true,
      featuredImages: true,
    },
  });

  const productsFolderId = process.env.GOOGLE_DRIVE_PRODUCTS_FOLDER_ID;
  if (!productsFolderId) {
    console.warn('[DB Migration] GOOGLE_DRIVE_PRODUCTS_FOLDER_ID가 설정되지 않아 건너뜁니다.');
    return;
  }

  for (const product of products) {
    // galleryImages 마이그레이션
    if (product.galleryImages) {
      try {
        const images = Array.isArray(product.galleryImages)
          ? product.galleryImages
          : typeof product.galleryImages === 'string'
          ? JSON.parse(product.galleryImages)
          : [];

        const migratedImages: string[] = [];
        let hasChanges = false;

        for (const img of images) {
          if (typeof img === 'string' && isLocalPath(img) && !isGoogleDriveUrl(img)) {
            const result = await migrateLocalFileToDrive(img, productsFolderId, true);
            if (result.ok && result.url) {
              migratedImages.push(result.url);
              hasChanges = true;
            } else {
              migratedImages.push(img); // 실패 시 원본 유지
            }
          } else {
            migratedImages.push(img);
          }
        }

        if (hasChanges) {
          await prisma.cruiseProduct.update({
            where: { productCode: product.productCode },
            data: { galleryImages: migratedImages },
          });
          results.push({
            model: 'CruiseProduct',
            field: 'galleryImages',
            recordId: product.productCode,
            oldPath: JSON.stringify(images),
            newUrl: JSON.stringify(migratedImages),
            status: 'migrated',
          });
          console.log(`[DB Migration] Product ${product.productCode} galleryImages 마이그레이션 완료`);
        }
      } catch (error: any) {
        console.error(`[DB Migration] Product ${product.productCode} galleryImages 오류:`, error);
      }
    }

    // featuredImages 마이그레이션
    if (product.featuredImages) {
      try {
        const images = Array.isArray(product.featuredImages)
          ? product.featuredImages
          : typeof product.featuredImages === 'string'
          ? JSON.parse(product.featuredImages)
          : [];

        const migratedImages: string[] = [];
        let hasChanges = false;

        for (const img of images) {
          if (typeof img === 'string' && isLocalPath(img) && !isGoogleDriveUrl(img)) {
            const result = await migrateLocalFileToDrive(img, productsFolderId, true);
            if (result.ok && result.url) {
              migratedImages.push(result.url);
              hasChanges = true;
            } else {
              migratedImages.push(img);
            }
          } else {
            migratedImages.push(img);
          }
        }

        if (hasChanges) {
          await prisma.cruiseProduct.update({
            where: { productCode: product.productCode },
            data: { featuredImages: migratedImages },
          });
          results.push({
            model: 'CruiseProduct',
            field: 'featuredImages',
            recordId: product.productCode,
            oldPath: JSON.stringify(images),
            newUrl: JSON.stringify(migratedImages),
            status: 'migrated',
          });
          console.log(`[DB Migration] Product ${product.productCode} featuredImages 마이그레이션 완료`);
        }
      } catch (error: any) {
        console.error(`[DB Migration] Product ${product.productCode} featuredImages 오류:`, error);
      }
    }
  }
}

async function migrateReviewImages() {
  console.log('[DB Migration] CruiseReview 이미지 마이그레이션 시작...');
  
  const reviews = await prisma.cruiseReview.findMany({
    where: {
      images: { not: null },
    },
    select: {
      id: true,
      images: true,
    },
  });

  const reviewsFolderId = process.env.GOOGLE_DRIVE_UPLOADS_REVIEWS_FOLDER_ID;
  if (!reviewsFolderId) {
    console.warn('[DB Migration] GOOGLE_DRIVE_UPLOADS_REVIEWS_FOLDER_ID가 설정되지 않아 건너뜁니다.');
    return;
  }

  for (const review of reviews) {
    if (!review.images) continue;

    try {
      const images = Array.isArray(review.images)
        ? review.images
        : typeof review.images === 'string'
        ? JSON.parse(review.images)
        : [];

      const migratedImages: string[] = [];
      let hasChanges = false;

      for (const img of images) {
        if (typeof img === 'string' && isLocalPath(img) && !isGoogleDriveUrl(img)) {
          const result = await migrateLocalFileToDrive(img, reviewsFolderId, true);
          if (result.ok && result.url) {
            migratedImages.push(result.url);
            hasChanges = true;
          } else {
            migratedImages.push(img);
          }
        } else {
          migratedImages.push(img);
        }
      }

      if (hasChanges) {
        await prisma.cruiseReview.update({
          where: { id: review.id },
          data: { images: migratedImages },
        });
        results.push({
          model: 'CruiseReview',
          field: 'images',
          recordId: review.id,
          oldPath: JSON.stringify(images),
          newUrl: JSON.stringify(migratedImages),
          status: 'migrated',
        });
        console.log(`[DB Migration] CruiseReview ${review.id} images 마이그레이션 완료`);
      }
    } catch (error: any) {
      console.error(`[DB Migration] CruiseReview ${review.id} images 오류:`, error);
    }
  }
}

async function migrateCommunityPostImages() {
  console.log('[DB Migration] CommunityPost 이미지 마이그레이션 시작...');
  
  const posts = await prisma.communityPost.findMany({
    where: {
      images: { not: null },
    },
    select: {
      id: true,
      images: true,
    },
  });

  const imagesFolderId = process.env.GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID;
  if (!imagesFolderId) {
    console.warn('[DB Migration] GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID가 설정되지 않아 건너뜁니다.');
    return;
  }

  for (const post of posts) {
    if (!post.images) continue;

    try {
      const images = Array.isArray(post.images)
        ? post.images
        : typeof post.images === 'string'
        ? JSON.parse(post.images)
        : [];

      const migratedImages: string[] = [];
      let hasChanges = false;

      for (const img of images) {
        if (typeof img === 'string' && isLocalPath(img) && !isGoogleDriveUrl(img)) {
          const result = await migrateLocalFileToDrive(img, imagesFolderId, true);
          if (result.ok && result.url) {
            migratedImages.push(result.url);
            hasChanges = true;
          } else {
            migratedImages.push(img);
          }
        } else {
          migratedImages.push(img);
        }
      }

      if (hasChanges) {
        await prisma.communityPost.update({
          where: { id: post.id },
          data: { images: migratedImages },
        });
        results.push({
          model: 'CommunityPost',
          field: 'images',
          recordId: post.id,
          oldPath: JSON.stringify(images),
          newUrl: JSON.stringify(migratedImages),
          status: 'migrated',
        });
        console.log(`[DB Migration] CommunityPost ${post.id} images 마이그레이션 완료`);
      }
    } catch (error: any) {
      console.error(`[DB Migration] CommunityPost ${post.id} images 오류:`, error);
    }
  }
}

async function migrateReservationPassportImages() {
  console.log('[DB Migration] Reservation passportImage 마이그레이션 시작...');
  
  const reservations = await prisma.reservation.findMany({
    where: {
      passportImage: { not: null },
    },
    select: {
      id: true,
      passportImage: true,
    },
  });

  const passportFolderId = process.env.GOOGLE_DRIVE_PASSPORT_FOLDER_ID;
  if (!passportFolderId) {
    console.warn('[DB Migration] GOOGLE_DRIVE_PASSPORT_FOLDER_ID가 설정되지 않아 건너뜁니다.');
    return;
  }

  for (const reservation of reservations) {
    if (!reservation.passportImage) continue;
    if (!isLocalPath(reservation.passportImage) || isGoogleDriveUrl(reservation.passportImage)) {
      continue;
    }

    const result = await migrateLocalFileToDrive(reservation.passportImage, passportFolderId, false);
    
    if (result.ok && result.url) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { passportImage: result.url },
      });
      results.push({
        model: 'Reservation',
        field: 'passportImage',
        recordId: reservation.id,
        oldPath: reservation.passportImage,
        newUrl: result.url,
        status: 'migrated',
      });
      console.log(`[DB Migration] Reservation ${reservation.id} passportImage 마이그레이션 완료`);
    } else {
      results.push({
        model: 'Reservation',
        field: 'passportImage',
        recordId: reservation.id,
        oldPath: reservation.passportImage,
        newUrl: null,
        status: 'error',
        error: result.error,
      });
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('[DB Migration] DRY RUN 모드 - 실제 데이터베이스 변경 없음');
  }

  try {
    console.log('[DB Migration] 데이터베이스 경로 마이그레이션 시작...\n');

    if (!dryRun) {
      await migrateUserImages();
      await migrateProductImages();
      await migrateReviewImages();
      await migrateCommunityPostImages();
      await migrateReservationPassportImages();
    } else {
      console.log('[DB Migration] DRY RUN 모드에서는 실제 마이그레이션을 수행하지 않습니다.');
    }

    // 결과 저장
    const reportsDir = path.join(ROOT_DIR, 'migrations');
    try {
      await fs.access(reportsDir);
    } catch {
      await fs.mkdir(reportsDir, { recursive: true });
    }

    const reportPath = path.join(
      reportsDir,
      `db-paths-to-drive-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2), 'utf8');

    // 통계 출력
    const migrated = results.filter((r) => r.status === 'migrated').length;
    const errors = results.filter((r) => r.status === 'error').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    console.log('\n[DB Migration] 마이그레이션 완료!');
    console.log(`  - 마이그레이션됨: ${migrated}개`);
    console.log(`  - 오류: ${errors}개`);
    console.log(`  - 건너뜀: ${skipped}개`);
    console.log(`  - 보고서: ${reportPath}`);
  } catch (error: any) {
    console.error('[DB Migration] 치명적 오류:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[DB Migration] 스크립트 실행 중 치명적 오류:', error);
  process.exit(1);
});


