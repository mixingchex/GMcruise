// 봇 사용자 계정 확인 스크립트
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkBotUser() {
  try {
    console.log('🔍 봇 사용자 계정 확인 중...\n');
    
    const botUser = await prisma.user.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    if (botUser) {
      console.log('✅ 봇 사용자 계정이 존재합니다:');
      console.log(JSON.stringify(botUser, null, 2));
    } else {
      console.log('❌ 봇 사용자 계정이 없습니다.');
      console.log('💡 봇이 처음 실행될 때 자동으로 생성됩니다.');
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBotUser();










