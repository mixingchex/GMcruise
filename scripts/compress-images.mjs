import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHOTOS_DIR = path.join(__dirname, '..', 'public', '크루즈정보사진');
const BACKUP_DIR = path.join(__dirname, '..', 'public', '크루즈정보사진_backup');
const TARGET_SIZE_RATIO = 0.1; // 10% 목표

// 지원하는 이미지 확장자
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

// 디렉토리 재귀적으로 탐색하여 이미지 파일 찾기
function findImageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findImageFiles(filePath, fileList);
    } else {
      const ext = path.extname(file);
      if (IMAGE_EXTENSIONS.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

// 파일 크기 확인
function getFileSize(filePath) {
  return fs.statSync(filePath).size;
}

// 이미지 압축 (목표 크기까지 품질 조정)
async function compressImage(inputPath, outputPath, targetSize) {
  try {
    const originalSize = getFileSize(inputPath);
    const ext = path.extname(inputPath).toLowerCase();
    
    // 이미 목표 크기보다 작으면 스킵
    if (originalSize <= targetSize) {
      console.log(`✓ ${path.basename(inputPath)}: 이미 작음 (${(originalSize / 1024).toFixed(2)}KB)`);
      return { success: true, originalSize, finalSize: originalSize, skipped: true };
    }
    
    let quality = 80;
    let finalSize = originalSize;
    let attempts = 0;
    const maxAttempts = 20;
    
    // 목표 크기에 도달할 때까지 품질 조정
    while (finalSize > targetSize && attempts < maxAttempts) {
      const image = sharp(inputPath);
      const metadata = await image.metadata();
      
      // 이미지 크기도 조정 (너무 큰 경우)
      let width = metadata.width;
      let height = metadata.height;
      
      // 최대 너비 2000px로 제한
      if (width > 2000) {
        height = Math.round((height * 2000) / width);
        width = 2000;
      }
      
      let outputBuffer;
      
      if (ext === '.png') {
        // PNG는 WebP로 변환하거나 PNG 압축
        outputBuffer = await image
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();
      } else {
        // JPEG는 JPEG로 압축
        outputBuffer = await image
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
      }
      
      finalSize = outputBuffer.length;
      
      // 목표 크기에 도달했거나 더 작아졌으면 종료
      if (finalSize <= targetSize || quality <= 20) {
        fs.writeFileSync(outputPath, outputBuffer);
        break;
      }
      
      // 품질을 5씩 낮춤
      quality -= 5;
      attempts++;
    }
    
    // 최종 시도 (가장 낮은 품질)
    if (finalSize > targetSize && attempts >= maxAttempts) {
      const image = sharp(inputPath);
      const metadata = await image.metadata();
      
      let width = metadata.width;
      let height = metadata.height;
      
      if (width > 1500) {
        height = Math.round((height * 1500) / width);
        width = 1500;
      }
      
      let outputBuffer;
      if (ext === '.png') {
        outputBuffer = await image
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 50 })
          .toBuffer();
      } else {
        outputBuffer = await image
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 50, mozjpeg: true })
          .toBuffer();
      }
      
      finalSize = outputBuffer.length;
      fs.writeFileSync(outputPath, outputBuffer);
    }
    
    const compressionRatio = ((1 - finalSize / originalSize) * 100).toFixed(2);
    const sizeRatio = (finalSize / originalSize * 100).toFixed(2);
    
    console.log(`✓ ${path.basename(inputPath)}: ${(originalSize / 1024).toFixed(2)}KB → ${(finalSize / 1024).toFixed(2)}KB (${compressionRatio}% 감소, ${sizeRatio}% 크기)`);
    
    return { success: true, originalSize, finalSize, skipped: false };
    
  } catch (error) {
    console.error(`✗ ${path.basename(inputPath)}: 압축 실패 - ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 백업 생성
async function createBackup() {
  if (fs.existsSync(BACKUP_DIR)) {
    console.log(`⚠️  백업 디렉토리가 이미 존재합니다: ${BACKUP_DIR}`);
    console.log('기존 백업을 사용하거나 삭제 후 다시 실행하세요.\n');
    return false;
  }
  
  console.log('백업 생성 중...');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  
  // 디렉토리 구조 복사
  function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        const ext = path.extname(file);
        if (IMAGE_EXTENSIONS.includes(ext)) {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
  }
  
  copyDirectory(PHOTOS_DIR, BACKUP_DIR);
  console.log(`✓ 백업 완료: ${BACKUP_DIR}\n`);
  return true;
}

// 메인 함수
async function main() {
  console.log('이미지 압축 시작...\n');
  console.log(`대상 디렉토리: ${PHOTOS_DIR}`);
  console.log(`목표 크기: 원본의 ${TARGET_SIZE_RATIO * 100}%\n`);
  
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.error(`오류: ${PHOTOS_DIR} 디렉토리를 찾을 수 없습니다.`);
    process.exit(1);
  }
  
  // 백업 생성
  const backupCreated = await createBackup();
  if (!backupCreated) {
    console.log('기존 백업이 있거나 백업 생성에 실패했습니다.');
    console.log('계속 진행하시겠습니까? (Ctrl+C로 취소)');
    // 3초 대기
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // 이미지 파일 찾기
  console.log('이미지 파일 검색 중...');
  const imageFiles = findImageFiles(PHOTOS_DIR);
  console.log(`총 ${imageFiles.length}개의 이미지 파일을 찾았습니다.\n`);
  
  if (imageFiles.length === 0) {
    console.log('압축할 이미지 파일이 없습니다.');
    return;
  }
  
  // 통계
  let totalOriginalSize = 0;
  let totalFinalSize = 0;
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  
  // 각 이미지 압축
  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];
    const relativePath = path.relative(PHOTOS_DIR, imagePath);
    const targetSize = getFileSize(imagePath) * TARGET_SIZE_RATIO;
    
    console.log(`[${i + 1}/${imageFiles.length}] 처리 중: ${relativePath}`);
    
    const result = await compressImage(imagePath, imagePath, targetSize);
    
    if (result.success) {
      if (result.skipped) {
        skipCount++;
      } else {
        successCount++;
        totalOriginalSize += result.originalSize;
        totalFinalSize += result.finalSize;
      }
    } else {
      failCount++;
    }
  }
  
  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('압축 완료!');
  console.log('='.repeat(60));
  console.log(`총 파일 수: ${imageFiles.length}`);
  console.log(`성공: ${successCount}개`);
  console.log(`스킵: ${skipCount}개 (이미 작은 파일)`);
  console.log(`실패: ${failCount}개`);
  console.log(`\n원본 총 크기: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`압축 후 크기: ${(totalFinalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`절약된 공간: ${((totalOriginalSize - totalFinalSize) / 1024 / 1024).toFixed(2)}MB`);
  console.log(`압축률: ${((1 - totalFinalSize / totalOriginalSize) * 100).toFixed(2)}%`);
  console.log(`최종 크기 비율: ${(totalFinalSize / totalOriginalSize * 100).toFixed(2)}%`);
}

main().catch(console.error);

