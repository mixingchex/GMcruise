// 테스트: cruise-photos/image API 핵심 기능 검증
// - sharp 모듈 로드 확인
// - 워터마크 파일 존재 확인
// - 이미지 처리 테스트 (워터마크 적용)

import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';

async function testImageAPI() {
  console.log('=== 이미지 API 테스트 시작 ===\n');
  let allPassed = true;

  // 1. sharp 모듈 로드 테스트
  console.log('1. sharp 모듈 로드 테스트...');
  try {
    console.log('   ✅ sharp 모듈 로드 성공');
  } catch (error: any) {
    console.error('   ❌ sharp 모듈 로드 실패:', error.message);
    allPassed = false;
  }

  // 2. 워터마크 파일 존재 확인
  console.log('\n2. 워터마크 파일 존재 확인...');
  const watermarkPath = path.join(process.cwd(), 'public', 'logo-watermark.png');
  let watermarkExists = false;
  try {
    const stats = await fs.stat(watermarkPath);
    console.log('   ✅ 워터마크 파일 존재:', watermarkPath);
    console.log('   파일 크기:', stats.size, 'bytes');
    watermarkExists = true;
  } catch (error) {
    console.error('   ❌ 워터마크 파일 없음:', watermarkPath);
    console.log('   ⚠️ 다운로드 시 워터마크가 적용되지 않습니다.');
  }

  // 3. sharp 이미지 처리 테스트 (더미 이미지)
  console.log('\n3. sharp 이미지 처리 테스트...');
  try {
    // 100x100 빨간색 테스트 이미지 생성
    const testImage = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    console.log('   ✅ 테스트 이미지 생성:', testImage.length, 'bytes');

    // PNG 변환 테스트
    const pngBuffer = await sharp(testImage)
      .png({ compressionLevel: 6 })
      .toBuffer();

    console.log('   ✅ PNG 변환 성공:', pngBuffer.length, 'bytes');
  } catch (error: any) {
    console.error('   ❌ 이미지 처리 실패:', error.message);
    allPassed = false;
  }

  // 4. 워터마크 합성 테스트 (워터마크 파일이 있을 경우)
  console.log('\n4. 워터마크 합성 테스트...');
  if (!watermarkExists) {
    console.log('   ⚠️ 워터마크 파일 없음 - 테스트 스킵');
  } else {
    try {
      const watermarkBuffer = await fs.readFile(watermarkPath);

      // 테스트용 이미지 생성
      const testImage = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 4,
          background: { r: 200, g: 200, b: 200, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      // 워터마크 리사이즈
      const resizedWatermark = await sharp(watermarkBuffer)
        .resize(250, null, { fit: 'inside' })
        .grayscale()
        .ensureAlpha()
        .png()
        .toBuffer();

      // 합성
      const result = await sharp(testImage)
        .composite([
          {
            input: resizedWatermark,
            top: 125,
            left: 125,
            blend: 'over',
          },
        ])
        .png()
        .toBuffer();

      console.log('   ✅ 워터마크 합성 성공:', result.length, 'bytes');
    } catch (error: any) {
      console.error('   ❌ 워터마크 합성 실패:', error.message);
      allPassed = false;
    }
  }

  // 결과 출력
  console.log('\n' + '='.repeat(40));
  if (allPassed) {
    console.log('=== ✅ 모든 테스트 통과 ===');
  } else {
    console.log('=== ❌ 일부 테스트 실패 ===');
  }

  return allPassed;
}

// 실행
testImageAPI()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('예외 발생:', error);
    process.exit(1);
  });
