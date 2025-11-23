// scripts/test-upload-sample.ts
// 샘플 문서 업로드 테스트

import { createProfileFolderStructure, uploadDocumentToDrive } from '../lib/affiliate/document-drive-sync';
import { uploadFileToDrive } from '../lib/google-drive';
import prisma from '../lib/prisma';

async function testUploadSample() {
  console.log('🚀 샘플 문서 업로드 테스트 시작...\n');

  try {
    // 1. 첫 번째 프로필 가져오기
    const profile = await prisma.affiliateProfile.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, displayName: true, affiliateCode: true },
    });

    if (!profile) {
      console.log('❌ 활성 프로필이 없습니다.');
      return;
    }

    console.log(`✅ 테스트 프로필: ${profile.displayName} (${profile.affiliateCode})\n`);

    // 2. 폴더 구조 생성
    console.log('📁 폴더 구조 생성 중...');
    const folderResult = await createProfileFolderStructure(profile.id);

    if (!folderResult.ok) {
      console.error('❌ 폴더 생성 실패:', folderResult.error);
      return;
    }

    console.log('✅ 폴더 생성 성공!\n');

    // 3. 샘플 텍스트 파일 생성 (신분증 대신)
    console.log('📤 샘플 신분증 이미지 업로드 중...');
    const sampleIdCard = Buffer.from(`
===========================================
        샘플 신분증 (테스트용)
===========================================
이름: ${profile.displayName}
프로필 코드: ${profile.affiliateCode}
생성일: ${new Date().toISOString()}
===========================================
이것은 테스트용 샘플 파일입니다.
실제 운영 환경에서는 실제 신분증 이미지가
업로드됩니다.
===========================================
    `, 'utf-8');

    const idCardResult = await uploadDocumentToDrive({
      profileId: profile.id,
      documentType: 'ID_CARD',
      buffer: sampleIdCard,
      fileName: 'sample_id_card.txt',
      mimeType: 'text/plain',
    });

    if (idCardResult.ok) {
      console.log('✅ 신분증 업로드 성공!');
      console.log(`   파일명: ${idCardResult.fileName}`);
      console.log(`   URL: ${idCardResult.url}\n`);
    } else {
      console.error('❌ 신분증 업로드 실패:', idCardResult.error, '\n');
    }

    // 4. 샘플 통장 사본 업로드
    console.log('📤 샘플 통장 사본 업로드 중...');
    const sampleBankbook = Buffer.from(`
===========================================
        샘플 통장 사본 (테스트용)
===========================================
이름: ${profile.displayName}
프로필 코드: ${profile.affiliateCode}
은행: 샘플은행
계좌번호: 123-456-789012
생성일: ${new Date().toISOString()}
===========================================
이것은 테스트용 샘플 파일입니다.
실제 운영 환경에서는 실제 통장 사본이
업로드됩니다.
===========================================
    `, 'utf-8');

    const bankbookResult = await uploadDocumentToDrive({
      profileId: profile.id,
      documentType: 'BANKBOOK',
      buffer: sampleBankbook,
      fileName: 'sample_bankbook.txt',
      mimeType: 'text/plain',
    });

    if (bankbookResult.ok) {
      console.log('✅ 통장 사본 업로드 성공!');
      console.log(`   파일명: ${bankbookResult.fileName}`);
      console.log(`   URL: ${bankbookResult.url}\n`);
    } else {
      console.error('❌ 통장 사본 업로드 실패:', bankbookResult.error, '\n');
    }

    // 5. 결과 요약
    console.log('🎉 테스트 완료!\n');
    console.log('📦 구글 드라이브 폴더 구조:');
    console.log(`   Affiliate_Documents/`);
    console.log(`   └── ${folderResult.profileFolderName}/`);
    console.log(`       ├── Contracts/`);
    console.log(`       ├── ID_Cards/ ${idCardResult.ok ? '← ' + idCardResult.fileName : ''}`);
    console.log(`       ├── Bankbooks/ ${bankbookResult.ok ? '← ' + bankbookResult.fileName : ''}`);
    console.log(`       └── Signatures/\n`);

    console.log('🔗 구글 드라이브 확인:');
    console.log('   https://drive.google.com/drive/folders/0AJVz1C-KYWR0Uk9PVA\n');

  } catch (error: any) {
    console.error('❌ 테스트 실패:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testUploadSample();






