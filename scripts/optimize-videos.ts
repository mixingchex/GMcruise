import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface VideoOptimizeResult {
  originalSize: number;
  optimizedSize: number;
  saved: number;
  savedPercent: number;
}

async function optimizeVideo(
  inputPath: string,
  outputPath: string
): Promise<VideoOptimizeResult> {
  const stats = await fs.stat(inputPath);
  const originalSize = stats.size;

  console.log(`  최적화 중: ${path.basename(inputPath)} (${(originalSize / 1024 / 1024).toFixed(2)}MB)...`);

  // ffmpeg 명령어: H.264 코덱, CRF 28 (고품질 압축), 빠른 인코딩
  const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -preset medium -crf 28 -c:a aac -b:a 128k -movflags +faststart -y "${outputPath}"`;

  try {
    execSync(ffmpegCommand, { stdio: 'inherit' });
    
    const optimizedStats = await fs.stat(outputPath);
    const optimizedSize = optimizedStats.size;
    const saved = originalSize - optimizedSize;
    const savedPercent = ((saved / originalSize) * 100);

    return {
      originalSize,
      optimizedSize,
      saved,
      savedPercent,
    };
  } catch (error) {
    console.error(`  ✗ 오류 발생: ${path.basename(inputPath)}`, error);
    throw error;
  }
}

async function optimizeDirectory(dirPath: string): Promise<void> {
  const files = await fs.readdir(dirPath, { withFileTypes: true });
  let totalOriginal = 0;
  let totalOptimized = 0;
  let totalSaved = 0;
  let processedCount = 0;
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm'];

  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    const ext = path.extname(file.name).toLowerCase();

    if (!videoExtensions.includes(ext)) {
      continue;
    }

    // 이미 최적화된 파일 스킵 (원본 파일만 처리)
    if (file.name.includes('_optimized') || file.name.includes('.optimized')) {
      continue;
    }

    try {
      const outputPath = fullPath.replace(/\.(mp4|mov|avi|webm)$/i, '_optimized.mp4');
      
      // 이미 최적화된 파일이 있으면 스킵
      try {
        await fs.access(outputPath);
        console.log(`  ⊘ 스킵: ${file.name} (이미 최적화됨)`);
        continue;
      } catch {
        // 최적화된 파일이 없으면 진행
      }

      console.log(`\n📹 처리 중: ${file.name}`);
      const result = await optimizeVideo(fullPath, outputPath);

      totalOriginal += result.originalSize;
      totalOptimized += result.optimizedSize;
      totalSaved += result.saved;
      processedCount++;

      console.log(
        `  ✓ 완료: ${(result.originalSize / 1024 / 1024).toFixed(2)}MB → ${(result.optimizedSize / 1024 / 1024).toFixed(2)}MB (${result.savedPercent.toFixed(1)}% 절감)`
      );

      // 원본 파일 백업 (원본 이름에 _original 추가)
      const backupPath = fullPath.replace(/\.(mp4|mov|avi|webm)$/i, '_original.$1');
      await fs.rename(fullPath, backupPath);
      console.log(`  ✓ 원본 백업: ${path.basename(backupPath)}`);

      // 최적화된 파일을 원본 이름으로 변경
      await fs.rename(outputPath, fullPath);
      console.log(`  ✓ 최적화된 파일 적용: ${file.name}`);

    } catch (error) {
      console.error(`  ✗ 실패: ${file.name}`, error);
    }
  }

  if (processedCount > 0) {
    console.log('\n=== 최적화 완료 ===');
    console.log(`처리된 파일: ${processedCount}개`);
    console.log(`원본 총 용량: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB`);
    console.log(`최적화 후 용량: ${(totalOptimized / 1024 / 1024).toFixed(2)}MB`);
    console.log(`절감된 용량: ${(totalSaved / 1024 / 1024).toFixed(2)}MB (${((totalSaved / totalOriginal) * 100).toFixed(1)}%)`);
  } else {
    console.log('\n처리할 비디오 파일이 없습니다.');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0] || 'public/videos';

  if (!targetDir) {
    console.error('사용법: npx tsx scripts/optimize-videos.ts <디렉토리 경로>');
    process.exit(1);
  }

  try {
    await fs.access(targetDir);
    console.log(`\n🎬 비디오 최적화 시작: ${targetDir}\n`);
    await optimizeDirectory(targetDir);
    console.log('\n✅ 모든 작업 완료!');
  } catch (error) {
    console.error(`❌ 오류: ${targetDir} 디렉토리를 찾을 수 없습니다.`, error);
    process.exit(1);
  }
}

main();


