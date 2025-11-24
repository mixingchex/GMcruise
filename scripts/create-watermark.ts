// scripts/create-watermark.ts
// 크루즈닷 로고를 워터마크용으로 변환하는 스크립트

import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';

async function createWatermark() {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'ai-cruise-logo.png');
    const outputPath = path.join(process.cwd(), 'public', 'logo-watermark.png');

    // 원본 로고 파일 확인
    try {
      await fs.access(logoPath);
    } catch (error) {
      console.error('로고 파일을 찾을 수 없습니다:', logoPath);
      process.exit(1);
    }

    console.log('워터마크 이미지 생성 중...');

    // 원본 로고 읽기
    const logoBuffer = await fs.readFile(logoPath);
    
    // 로고 메타데이터 가져오기
    const metadata = await sharp(logoBuffer).metadata();
    console.log('원본 로고 크기:', metadata.width, 'x', metadata.height);

    // 워터마크용으로 변환
    // 1. 투명 배경 유지 (이미 PNG라면 투명도 유지)
    // 2. 적절한 크기로 조정 (최대 너비 400px)
    // 3. 약간의 투명도 적용 (불투명도 70%)
    
    const maxWidth = 400;
    const opacity = 0.7; // 70% 불투명도
    
    let watermarkBuffer: Buffer;
    
    if (metadata.width && metadata.width > maxWidth) {
      // 크기 조정이 필요한 경우
      const ratio = maxWidth / metadata.width;
      const newHeight = Math.round((metadata.height || 100) * ratio);
      
      watermarkBuffer = await sharp(logoBuffer)
        .resize(maxWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .ensureAlpha() // 알파 채널 보장
        .composite([
          {
            input: Buffer.from([255, 255, 255, Math.round(255 * opacity)]),
            raw: {
              width: 1,
              height: 1,
              channels: 4,
            },
            tile: true,
            blend: 'dest-in',
          },
        ])
        .png()
        .toBuffer();
    } else {
      // 크기 조정이 필요 없는 경우, 투명도만 적용
      watermarkBuffer = await sharp(logoBuffer)
        .ensureAlpha()
        .modulate({
          brightness: 1,
          saturation: 1,
        })
        .png()
        .toBuffer();
    }

    // 워터마크 이미지 저장
    await fs.writeFile(outputPath, watermarkBuffer);
    
    const outputMetadata = await sharp(watermarkBuffer).metadata();
    console.log('✅ 워터마크 이미지 생성 완료!');
    console.log('저장 위치:', outputPath);
    console.log('크기:', outputMetadata.width, 'x', outputMetadata.height);
    console.log('형식:', outputMetadata.format);
  } catch (error) {
    console.error('워터마크 생성 실패:', error);
    process.exit(1);
  }
}

createWatermark();

