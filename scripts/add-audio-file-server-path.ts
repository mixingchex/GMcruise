// 스크립트: AffiliateSale 테이블에 audioFileServerPath 필드 추가
import prisma from '../lib/prisma';

async function addAudioFileServerPathField() {
  try {
    console.log('Adding audioFileServerPath field to AffiliateSale table...');
    
    // SQL 직접 실행
    await prisma.$executeRaw`
      ALTER TABLE "AffiliateSale" 
      ADD COLUMN IF NOT EXISTS "audioFileServerPath" TEXT;
    `;
    
    console.log('✅ audioFileServerPath field added successfully!');
  } catch (error: any) {
    console.error('❌ Error adding field:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addAudioFileServerPathField();




