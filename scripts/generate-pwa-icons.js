/**
 * PWA 아이콘 생성 스크립트
 * 
 * 사용법:
 * 1. 크루즈닷 로고 이미지를 public/images/cruisedot-logo.png에 배치
 * 2. npm run generate-pwa-icons 실행
 * 
 * 또는 ImageMagick을 사용하여 직접 생성:
 * convert public/images/cruisedot-logo.png -resize 192x192 -background white -gravity center -extent 192x192 public/icons/mall-icon-192.png
 * convert public/images/cruisedot-logo.png -resize 512x512 -background white -gravity center -extent 512x512 public/icons/mall-icon-512.png
 * convert public/images/cruisedot-logo.png -resize 192x192 -background "#FFB6C1" -gravity center -extent 192x192 public/icons/genie-icon-192.png
 * convert public/images/cruisedot-logo.png -resize 512x512 -background "#FFB6C1" -gravity center -extent 512x512 public/icons/genie-icon-512.png
 */

const fs = require('fs');
const path = require('path');

// 아이콘 디렉토리 생성
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('✅ 아이콘 디렉토리 생성:', iconsDir);
}

console.log(`
📱 PWA 아이콘 생성 가이드

아이콘을 생성하려면 ImageMagick이 필요합니다:

1. 크루즈몰 아이콘 (흰색 배경):
   convert public/images/ai-cruise-logo.png -resize 192x192 -background white -gravity center -extent 192x192 public/icons/mall-icon-192.png
   convert public/images/ai-cruise-logo.png -resize 512x512 -background white -gravity center -extent 512x512 public/icons/mall-icon-512.png

2. 크루즈가이드 지니 아이콘 (핑크색 배경):
   convert public/images/ai-cruise-logo.png -resize 192x192 -background "#FFB6C1" -gravity center -extent 192x192 public/icons/genie-icon-192.png
   convert public/images/ai-cruise-logo.png -resize 512x512 -background "#FFB6C1" -gravity center -extent 512x512 public/icons/genie-icon-512.png

또는 온라인 도구 사용:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

생성된 아이콘 파일:
- public/icons/mall-icon-192.png (크루즈몰, 192x192, 흰색 배경)
- public/icons/mall-icon-512.png (크루즈몰, 512x512, 흰색 배경)
- public/icons/genie-icon-192.png (크루즈가이드 지니, 192x192, 핑크색 배경)
- public/icons/genie-icon-512.png (크루즈가이드 지니, 512x512, 핑크색 배경)
`);







