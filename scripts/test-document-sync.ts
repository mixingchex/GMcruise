// scripts/test-document-sync.ts
// 문서 동기화 테스트 스크립트

import prisma from '../lib/prisma';
import { createProfileFolderStructure, uploadContractPDFToDrive } from '../lib/affiliate/document-drive-sync';

async function testDocumentSync() {
  console.log('🚀 문서 동기화 테스트 시작...\n');

  try {
    // 1. 활성 프로필 조회
    const profiles = await prisma.affiliateProfile.findMany({
      where: {
        status: 'ACTIVE',
        type: { in: ['BRANCH_MANAGER', 'SALES_AGENT'] },
      },
      select: {
        id: true,
        affiliateCode: true,
        displayName: true,
        type: true,
      },
      take: 1, // 첫 번째 프로필만 테스트
    });

    if (profiles.length === 0) {
      console.log('❌ 활성 프로필이 없습니다.');
      return;
    }

    const profile = profiles[0];
    console.log(`✅ 테스트 프로필: ${profile.displayName} (ID: ${profile.id}, 코드: ${profile.affiliateCode})`);
    console.log(`   타입: ${profile.type}\n`);

    // 2. 폴더 구조 생성 테스트
    console.log('📁 구글 드라이브 폴더 구조 생성 중...');
    const folderResult = await createProfileFolderStructure(profile.id);

    if (!folderResult.ok) {
      console.error('❌ 폴더 생성 실패:', folderResult.error);
      return;
    }

    console.log('✅ 폴더 구조 생성 성공!');
    console.log(`   폴더 이름: ${folderResult.profileFolderName}`);
    console.log(`   하위 폴더: ${Object.keys(folderResult.folderIds || {}).join(', ')}\n`);

    // 3. 계약서 조회
    const contracts = await prisma.affiliateContract.findMany({
      where: {
        invitedByProfileId: profile.id,
        status: { in: ['approved', 'completed'] },
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
      take: 1,
    });

    if (contracts.length === 0) {
      console.log('⚠️ 이 프로필에 연결된 계약서가 없습니다.');
      console.log('✅ 폴더 구조 생성 테스트는 성공했습니다!\n');
      return;
    }

    const contract = contracts[0];
    console.log(`📄 계약서 발견: ${contract.name} (ID: ${contract.id}, 상태: ${contract.status})`);

    // 4. 계약서 PDF 업로드 테스트
    console.log('📤 계약서 PDF를 구글 드라이브에 업로드 중...');
    const uploadResult = await uploadContractPDFToDrive(contract.id);

    if (!uploadResult.ok) {
      console.error('❌ PDF 업로드 실패:', uploadResult.error);
      return;
    }

    console.log('✅ PDF 업로드 성공!');
    console.log(`   파일명: ${uploadResult.fileName}`);
    console.log(`   URL: ${uploadResult.url}`);
    console.log(`   파일 ID: ${uploadResult.fileId}\n`);

    console.log('🎉 모든 테스트 완료!\n');
    console.log('📦 구글 드라이브 폴더 구조:');
    console.log(`   Affiliate_Documents/`);
    console.log(`   └── ${folderResult.profileFolderName}/`);
    console.log(`       ├── Contracts/ ← ${uploadResult.fileName}`);
    console.log(`       ├── ID_Cards/`);
    console.log(`       ├── Bankbooks/`);
    console.log(`       └── Signatures/\n`);

  } catch (error: any) {
    console.error('❌ 테스트 실패:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testDocumentSync();






