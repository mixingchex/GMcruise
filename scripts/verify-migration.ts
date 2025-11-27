#!/usr/bin/env ts-node
import 'dotenv/config';

import prisma from '../lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

type VerificationResult = {
  model: string;
  field: string;
  recordId: number | string;
  url: string;
  status: 'valid' | 'invalid' | 'local-path' | 'missing';
  error?: string;
};

const results: VerificationResult[] = [];

// Google Drive URL인지 확인
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

// URL 접근 가능 여부 확인 (간단한 검증)
async function verifyUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyUserImages() {
  console.log('[Verification] User 이미지 검증 시작...');
  
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
    if (user.profileImage) {
      if (isLocalPath(user.profileImage)) {
        results.push({
          model: 'User',
          field: 'profileImage',
          recordId: user.id,
          url: user.profileImage,
          status: 'local-path',
        });
      } else if (isGoogleDriveUrl(user.profileImage)) {
        const isValid = await verifyUrl(user.profileImage);
        results.push({
          model: 'User',
          field: 'profileImage',
          recordId: user.id,
          url: user.profileImage,
          status: isValid ? 'valid' : 'invalid',
        });
      } else {
        results.push({
          model: 'User',
          field: 'profileImage',
          recordId: user.id,
          url: user.profileImage,
          status: 'invalid',
        });
      }
    }

    if (user.coverImage) {
      if (isLocalPath(user.coverImage)) {
        results.push({
          model: 'User',
          field: 'coverImage',
          recordId: user.id,
          url: user.coverImage,
          status: 'local-path',
        });
      } else if (isGoogleDriveUrl(user.coverImage)) {
        const isValid = await verifyUrl(user.coverImage);
        results.push({
          model: 'User',
          field: 'coverImage',
          recordId: user.id,
          url: user.coverImage,
          status: isValid ? 'valid' : 'invalid',
        });
      } else {
        results.push({
          model: 'User',
          field: 'coverImage',
          recordId: user.id,
          url: user.coverImage,
          status: 'invalid',
        });
      }
    }
  }
}

async function verifyProductImages() {
  console.log('[Verification] Product 이미지 검증 시작...');
  
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

  for (const product of products) {
    // galleryImages 검증
    if (product.galleryImages) {
      try {
        const images = Array.isArray(product.galleryImages)
          ? product.galleryImages
          : typeof product.galleryImages === 'string'
          ? JSON.parse(product.galleryImages)
          : [];

        for (const img of images) {
          if (typeof img === 'string') {
            if (isLocalPath(img)) {
              results.push({
                model: 'CruiseProduct',
                field: 'galleryImages',
                recordId: product.productCode,
                url: img,
                status: 'local-path',
              });
            } else if (isGoogleDriveUrl(img)) {
              const isValid = await verifyUrl(img);
              results.push({
                model: 'CruiseProduct',
                field: 'galleryImages',
                recordId: product.productCode,
                url: img,
                status: isValid ? 'valid' : 'invalid',
              });
            }
          }
        }
      } catch (error: any) {
        console.error(`[Verification] Product ${product.productCode} galleryImages 오류:`, error);
      }
    }

    // featuredImages 검증
    if (product.featuredImages) {
      try {
        const images = Array.isArray(product.featuredImages)
          ? product.featuredImages
          : typeof product.featuredImages === 'string'
          ? JSON.parse(product.featuredImages)
          : [];

        for (const img of images) {
          if (typeof img === 'string') {
            if (isLocalPath(img)) {
              results.push({
                model: 'CruiseProduct',
                field: 'featuredImages',
                recordId: product.productCode,
                url: img,
                status: 'local-path',
              });
            } else if (isGoogleDriveUrl(img)) {
              const isValid = await verifyUrl(img);
              results.push({
                model: 'CruiseProduct',
                field: 'featuredImages',
                recordId: product.productCode,
                url: img,
                status: isValid ? 'valid' : 'invalid',
              });
            }
          }
        }
      } catch (error: any) {
        console.error(`[Verification] Product ${product.productCode} featuredImages 오류:`, error);
      }
    }
  }
}

async function verifyReviewImages() {
  console.log('[Verification] CruiseReview 이미지 검증 시작...');
  
  const reviews = await prisma.cruiseReview.findMany({
    where: {
      images: { not: null },
    },
    select: {
      id: true,
      images: true,
    },
  });

  for (const review of reviews) {
    if (!review.images) continue;

    try {
      const images = Array.isArray(review.images)
        ? review.images
        : typeof review.images === 'string'
        ? JSON.parse(review.images)
        : [];

      for (const img of images) {
        if (typeof img === 'string') {
          if (isLocalPath(img)) {
            results.push({
              model: 'CruiseReview',
              field: 'images',
              recordId: review.id,
              url: img,
              status: 'local-path',
            });
          } else if (isGoogleDriveUrl(img)) {
            const isValid = await verifyUrl(img);
            results.push({
              model: 'CruiseReview',
              field: 'images',
              recordId: review.id,
              url: img,
              status: isValid ? 'valid' : 'invalid',
            });
          }
        }
      }
    } catch (error: any) {
      console.error(`[Verification] CruiseReview ${review.id} images 오류:`, error);
    }
  }
}

async function verifyCommunityPostImages() {
  console.log('[Verification] CommunityPost 이미지 검증 시작...');
  
  const posts = await prisma.communityPost.findMany({
    where: {
      images: { not: null },
    },
    select: {
      id: true,
      images: true,
    },
  });

  for (const post of posts) {
    if (!post.images) continue;

    try {
      const images = Array.isArray(post.images)
        ? post.images
        : typeof post.images === 'string'
        ? JSON.parse(post.images)
        : [];

      for (const img of images) {
        if (typeof img === 'string') {
          if (isLocalPath(img)) {
            results.push({
              model: 'CommunityPost',
              field: 'images',
              recordId: post.id,
              url: img,
              status: 'local-path',
            });
          } else if (isGoogleDriveUrl(img)) {
            const isValid = await verifyUrl(img);
            results.push({
              model: 'CommunityPost',
              field: 'images',
              recordId: post.id,
              url: img,
              status: isValid ? 'valid' : 'invalid',
            });
          }
        }
      }
    } catch (error: any) {
      console.error(`[Verification] CommunityPost ${post.id} images 오류:`, error);
    }
  }
}

async function verifyReservationPassportImages() {
  console.log('[Verification] Reservation passportImage 검증 시작...');
  
  const reservations = await prisma.reservation.findMany({
    where: {
      passportImage: { not: null },
    },
    select: {
      id: true,
      passportImage: true,
    },
  });

  for (const reservation of reservations) {
    if (!reservation.passportImage) continue;

    if (isLocalPath(reservation.passportImage)) {
      results.push({
        model: 'Reservation',
        field: 'passportImage',
        recordId: reservation.id,
        url: reservation.passportImage,
        status: 'local-path',
      });
    } else if (isGoogleDriveUrl(reservation.passportImage)) {
      const isValid = await verifyUrl(reservation.passportImage);
      results.push({
        model: 'Reservation',
        field: 'passportImage',
        recordId: reservation.id,
        url: reservation.passportImage,
        status: isValid ? 'valid' : 'invalid',
      });
    } else {
      results.push({
        model: 'Reservation',
        field: 'passportImage',
        recordId: reservation.id,
        url: reservation.passportImage,
        status: 'invalid',
      });
    }
  }
}

async function main() {
  try {
    console.log('[Verification] 마이그레이션 검증 시작...\n');

    await verifyUserImages();
    await verifyProductImages();
    await verifyReviewImages();
    await verifyCommunityPostImages();
    await verifyReservationPassportImages();

    // 결과 저장
    const reportsDir = path.join(process.cwd(), 'migrations');
    try {
      await fs.access(reportsDir);
    } catch {
      await fs.mkdir(reportsDir, { recursive: true });
    }

    const reportPath = path.join(
      reportsDir,
      `verification-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2), 'utf8');

    // 통계 출력
    const valid = results.filter((r) => r.status === 'valid').length;
    const invalid = results.filter((r) => r.status === 'invalid').length;
    const localPaths = results.filter((r) => r.status === 'local-path').length;
    const missing = results.filter((r) => r.status === 'missing').length;

    console.log('\n[Verification] 검증 완료!');
    console.log(`  - 유효한 URL: ${valid}개`);
    console.log(`  - 무효한 URL: ${invalid}개`);
    console.log(`  - 로컬 경로 (마이그레이션 필요): ${localPaths}개`);
    console.log(`  - 누락: ${missing}개`);
    console.log(`  - 보고서: ${reportPath}`);

    if (localPaths > 0) {
      console.log(`\n⚠️  ${localPaths}개의 로컬 경로가 발견되었습니다. 마이그레이션이 필요합니다.`);
    }

    if (invalid > 0) {
      console.log(`\n⚠️  ${invalid}개의 무효한 URL이 발견되었습니다. 확인이 필요합니다.`);
    }
  } catch (error: any) {
    console.error('[Verification] 치명적 오류:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[Verification] 스크립트 실행 중 치명적 오류:', error);
  process.exit(1);
});


