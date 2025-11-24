import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

interface OptimizeOptions {
  quality?: number;
  format?: 'webp' | 'png' | 'jpeg';
  maxWidth?: number;
}

async function optimizeImage(
  inputPath: string,
  outputPath: string,
  options: OptimizeOptions = {}
): Promise<{ originalSize: number; optimizedSize: number; saved: number }> {
  const stats = await fs.stat(inputPath);
  const originalSize = stats.size;

  let image = sharp(inputPath);

  // Resize if maxWidth is specified
  if (options.maxWidth) {
    const metadata = await image.metadata();
    if (metadata.width && metadata.width > options.maxWidth) {
      image = image.resize(options.maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
    }
  }

  // Optimize based on format
  if (options.format === 'webp') {
    await image.webp({ quality: options.quality || 85 }).toFile(outputPath);
  } else if (options.format === 'jpeg') {
    await image.jpeg({ quality: options.quality || 85, mozjpeg: true }).toFile(outputPath);
  } else {
    // PNG optimization
    await image
      .png({ quality: options.quality || 90, compressionLevel: 9 })
      .toFile(outputPath);
  }

  const optimizedStats = await fs.stat(outputPath);
  const optimizedSize = optimizedStats.size;

  return {
    originalSize,
    optimizedSize,
    saved: originalSize - optimizedSize,
  };
}

async function optimizeDirectory(
  dirPath: string,
  options: OptimizeOptions = {}
): Promise<void> {
  const files = await fs.readdir(dirPath, { withFileTypes: true });
  let totalOriginal = 0;
  let totalOptimized = 0;
  let totalSaved = 0;
  let processedCount = 0;

  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);

    if (file.isDirectory()) {
      await optimizeDirectory(fullPath, options);
      continue;
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
      continue;
    }

    // 파일 크기 확인 (500KB 이상인 파일만 최적화)
    const stats = await fs.stat(fullPath);
    if (stats.size < 500 * 1024) {
      continue; // 작은 파일은 스킵
    }

    try {
      // JPEG 파일만 WebP로 변환, PNG는 최적화만
      const isJpeg = ['.jpg', '.jpeg'].includes(ext);
      const outputPath = isJpeg 
        ? fullPath.replace(/\.(jpg|jpeg)$/i, '.webp')
        : fullPath; // PNG는 원본 파일을 최적화
      
      // 이미 WebP 파일이 있으면 스킵
      if (isJpeg) {
        try {
          await fs.access(outputPath);
          continue;
        } catch {
          // WebP 파일이 없으면 계속 진행
        }
      }
      
      console.log(`최적화 중: ${file.name} (${(stats.size / 1024 / 1024).toFixed(2)}MB)...`);
      
      let result;
      if (isJpeg) {
        // JPEG → WebP 변환
        result = await optimizeImage(fullPath, outputPath, {
          ...options,
          format: 'webp',
          maxWidth: 1920,
        });
        totalSaved += result.optimizedSize; // WebP 파일 크기만 카운트
      } else {
        // PNG 최적화 (원본 파일 덮어쓰기)
        const tempPath = fullPath + '.tmp';
        result = await optimizeImage(fullPath, tempPath, {
          ...options,
          format: 'png',
          maxWidth: 1920,
        });
        
        // 크기가 줄어들었을 때만 교체
        if (result.optimizedSize < result.originalSize) {
          await fs.rename(tempPath, fullPath);
          totalSaved += (result.originalSize - result.optimizedSize);
        } else {
          await fs.unlink(tempPath);
          continue; // 최적화 효과가 없으면 스킵
        }
      }

      totalOriginal += result.originalSize;
      totalOptimized += isJpeg ? result.optimizedSize : result.originalSize;
      processedCount++;

      const savedPercent = isJpeg 
        ? ((result.optimizedSize / result.originalSize) * 100).toFixed(1)
        : (((result.originalSize - result.optimizedSize) / result.originalSize) * 100).toFixed(1);
      
      if (isJpeg) {
        console.log(
          `  ✓ ${file.name}: WebP 생성 (${(result.originalSize / 1024 / 1024).toFixed(2)}MB → ${(result.optimizedSize / 1024 / 1024).toFixed(2)}MB, ${savedPercent}% 크기)`
        );
      } else {
        console.log(
          `  ✓ ${file.name}: 최적화 완료 (${(result.originalSize / 1024 / 1024).toFixed(2)}MB → ${(result.optimizedSize / 1024 / 1024).toFixed(2)}MB, ${savedPercent}% 절감)`
        );
      }
    } catch (error) {
      console.error(`  ✗ 오류 발생: ${file.name}`, error);
    }
  }

  if (processedCount > 0) {
    console.log('\n=== 최적화 완료 ===');
    console.log(`처리된 파일: ${processedCount}개`);
    console.log(`원본 총 용량: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB`);
    console.log(`최적화 후 용량: ${(totalOptimized / 1024 / 1024).toFixed(2)}MB`);
    console.log(`절감된 용량: ${(totalSaved / 1024 / 1024).toFixed(2)}MB (${((totalSaved / totalOriginal) * 100).toFixed(1)}%)`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0] || 'public/payment-pages';

  if (!targetDir) {
    console.error('사용법: tsx scripts/optimize-images.ts <디렉토리 경로>');
    process.exit(1);
  }

  try {
    await fs.access(targetDir);
    console.log(`\n📸 이미지 최적화 시작: ${targetDir}\n`);
    await optimizeDirectory(targetDir);
    console.log('\n✅ 모든 작업 완료!');
  } catch (error) {
    console.error(`❌ 오류: ${targetDir} 디렉토리를 찾을 수 없습니다.`, error);
    process.exit(1);
  }
}

main();

