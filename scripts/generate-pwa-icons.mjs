#!/usr/bin/env node

/**
 * PWA 아이콘 생성 스크립트
 * 크루즈닷 로고를 사용하여 핑크색/흰색 배경 아이콘 생성
 */

import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const iconsDir = join(projectRoot, 'public', 'icons');
const logoPath = join(projectRoot, 'public', 'images', 'ai-cruise-logo.png');

// 아이콘 디렉토리 생성
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
  console.log('✅ 아이콘 디렉토리 생성:', iconsDir);
}

// 로고 파일 확인
if (!existsSync(logoPath)) {
  console.error('❌ 로고 파일을 찾을 수 없습니다:', logoPath);
  console.log('💡 /public/images/ai-cruise-logo.png 파일이 필요합니다.');
  process.exit(1);
}

console.log('📱 PWA 아이콘 생성 시작...\n');

/**
 * 아이콘 생성 함수
 * @param {string} outputPath - 출력 파일 경로
 * @param {number} size - 아이콘 크기 (192 또는 512)
 * @param {string} backgroundColor - 배경색 (hex)
 * @param {string} name - 아이콘 이름 (로깅용)
 */
async function generateIcon(outputPath, size, backgroundColor, name) {
  try {
    // 로고 이미지 로드
    const logo = sharp(logoPath);
    const logoMetadata = await logo.metadata();
    
    // 로고를 중앙에 배치하기 위한 계산
    // 로고를 아이콘 크기의 70%로 축소
    const logoSize = Math.floor(size * 0.7);
    const padding = Math.floor((size - logoSize) / 2);
    
    // 핑크색/흰색 배경 생성
    const background = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: backgroundColor
      }
    });
    
    // 로고 리사이즈
    const resizedLogo = await logo
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    // 배경과 로고 합성
    await background
      .composite([{
        input: resizedLogo,
        top: padding,
        left: padding
      }])
      .png()
      .toFile(outputPath);
    
    console.log(`✅ ${name} 생성 완료: ${outputPath} (${size}x${size}, 배경: ${backgroundColor})`);
  } catch (error) {
    console.error(`❌ ${name} 생성 실패:`, error.message);
  }
}

// 크루즈닷AI 아이콘 생성 (핑크색 배경)
console.log('🎨 크루즈닷AI 아이콘 생성 중...');
await generateIcon(
  join(iconsDir, 'genie-icon-192.png'),
  192,
  '#FFB6C1', // 핑크색
  '크루즈닷AI 192x192'
);

await generateIcon(
  join(iconsDir, 'genie-icon-512.png'),
  512,
  '#FFB6C1', // 핑크색
  '크루즈닷AI 512x512'
);

// 크루즈몰 아이콘 생성 (흰색 배경)
console.log('\n🛒 크루즈몰 아이콘 생성 중...');
await generateIcon(
  join(iconsDir, 'mall-icon-192.png'),
  192,
  '#FFFFFF', // 흰색
  '크루즈몰 192x192'
);

await generateIcon(
  join(iconsDir, 'mall-icon-512.png'),
  512,
  '#FFFFFF', // 흰색
  '크루즈몰 512x512'
);

console.log('\n✨ 모든 아이콘 생성 완료!');
console.log('\n생성된 파일:');
console.log('  - /public/icons/genie-icon-192.png (크루즈닷AI, 핑크 배경)');
console.log('  - /public/icons/genie-icon-512.png (크루즈닷AI, 핑크 배경)');
console.log('  - /public/icons/mall-icon-192.png (크루즈몰, 흰색 배경)');
console.log('  - /public/icons/mall-icon-512.png (크루즈몰, 흰색 배경)');







