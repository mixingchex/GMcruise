// scripts/add-nationality-column.ts
// Traveler 테이블에 nationality 컬럼 추가 스크립트

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('[Add Nationality Column] Traveler 테이블에 nationality 컬럼 추가 시작...');
    
    // Raw SQL로 컬럼 추가 (IF NOT EXISTS로 안전하게)
    await prisma.$executeRaw`
      ALTER TABLE "Traveler" 
      ADD COLUMN IF NOT EXISTS "nationality" TEXT;
    `;
    
    console.log('[Add Nationality Column] ✅ nationality 컬럼 추가 완료!');
  } catch (error: any) {
    console.error('[Add Nationality Column] ❌ 에러:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });







