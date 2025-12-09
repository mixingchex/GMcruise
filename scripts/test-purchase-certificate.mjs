// scripts/test-purchase-certificate.mjs
// 구매확인서 생성 + 구글 드라이브 업로드 테스트

import { config } from 'dotenv';
config({ path: '.env.local' });

import { generateCertificatePng } from '../lib/certificate-generator.ts';
import { uploadFileToDrive, findOrCreateFolder } from '../lib/google-drive.ts';

async function testPurchaseCertificate() {
  console.log('=== 구매확인서 테스트 시작 ===\n');

  // 테스트 데이터
  const testData = {
    customerName: '홍길동',
    birthDate: '1985-03-15',
    productName: 'MSC 그랜디오사 지중해 7박 8일 크루즈',
    paymentAmount: 3500000,
    paymentDate: '2024-12-09',
    orderId: 'TEST-SAMPLE-20241209',
    managerName: '김상담',
    productDetails: {
      nights: 7,
      days: 8,
      cruiseLine: 'MSC Cruises',
      shipName: 'MSC Grandiosa',
      destinations: ['바르셀로나', '마르세유', '제노바', '로마'],
      flightIncluded: true,
      hasGuide: true,
      hasEscort: false,
      hasCruiseDotStaff: true,
      hasTravelInsurance: true,
    },
  };

  try {
    // 1. 이미지 생성
    console.log('1. 구매확인서 이미지 생성 중...');
    const imageBuffer = await generateCertificatePng(testData);
    console.log(`   ✓ 이미지 생성 완료 (${(imageBuffer.length / 1024).toFixed(1)} KB)\n`);

    // 2. 구글 드라이브 폴더 생성/확인
    console.log('2. 구글 드라이브 폴더 확인 중...');
    const monthFolder = new Date().toISOString().slice(0, 7);
    const folderResult = await findOrCreateFolder(`구매확인서_테스트_${monthFolder}`);

    if (!folderResult.ok || !folderResult.folderId) {
      console.error('   ✗ 폴더 생성 실패:', folderResult.error);
      return;
    }
    console.log(`   ✓ 폴더 준비 완료: ${folderResult.folderId}\n`);

    // 3. 이미지 업로드
    console.log('3. 구글 드라이브에 업로드 중...');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `구매확인서_샘플_${testData.customerName}_${dateStr}.png`;

    const uploadResult = await uploadFileToDrive({
      folderId: folderResult.folderId,
      fileName,
      mimeType: 'image/png',
      buffer: imageBuffer,
      makePublic: true, // 샘플이므로 공개로 설정
    });

    if (!uploadResult.ok) {
      console.error('   ✗ 업로드 실패:', uploadResult.error);
      return;
    }

    console.log(`   ✓ 업로드 완료!\n`);
    console.log('=== 결과 ===');
    console.log(`파일 ID: ${uploadResult.fileId}`);
    console.log(`파일 URL: https://drive.google.com/file/d/${uploadResult.fileId}/view`);
    console.log(`직접 이미지: https://drive.google.com/uc?id=${uploadResult.fileId}`);

  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

testPurchaseCertificate();
