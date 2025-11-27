import 'dotenv/config';
import prisma from '../lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../lib/logger';

async function main() {
  logger.log('🧪 관리자 설정 저장/읽기 플로우 시뮬레이션 시작\n');

  try {
    // 1. SystemConfig에 admin_email 저장 테스트
    const testAdminEmail = 'test-admin@cruisedot.local';
    logger.log('1️⃣ SystemConfig에 admin_email 저장 테스트...');
    
    const config = await prisma.systemConfig.upsert({
      where: { configKey: 'admin_email' },
      update: {
        configValue: testAdminEmail,
        updatedAt: new Date(),
      },
      create: {
        configKey: 'admin_email',
        configValue: testAdminEmail,
        description: '관리자 문의 알림 이메일 주소',
        category: 'email',
        updatedAt: new Date(),
      },
    });
    
    logger.log(`   ✅ SystemConfig 저장 완료: ${config.configKey} = ${config.configValue}`);

    // 2. SystemConfig에서 admin_email 읽기 테스트
    logger.log('\n2️⃣ SystemConfig에서 admin_email 읽기 테스트...');
    
    const readConfig = await prisma.systemConfig.findUnique({
      where: { configKey: 'admin_email' },
    });
    
    if (readConfig && readConfig.configValue === testAdminEmail) {
      logger.log(`   ✅ SystemConfig 읽기 성공: ${readConfig.configValue}`);
    } else {
      throw new Error('SystemConfig 읽기 실패 또는 값 불일치');
    }

    // 3. .env.local 파일 읽기 테스트 (실제 업데이트는 하지 않음)
    logger.log('\n3️⃣ .env.local 파일 읽기 테스트...');
    
    const envPath = path.join(process.cwd(), '.env.local');
    try {
      const envContent = await fs.readFile(envPath, 'utf-8');
      const hasAdminEmail = envContent.includes('ADMIN_EMAIL');
      logger.log(`   ✅ .env.local 파일 읽기 성공 (ADMIN_EMAIL 존재: ${hasAdminEmail})`);
    } catch (error) {
      logger.warn(`   ⚠️  .env.local 파일 읽기 실패 (파일이 없을 수 있음): ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }

    // 4. 환경 변수에서 admin_email 읽기 (SystemConfig 우선, 없으면 .env)
    logger.log('\n4️⃣ 환경 변수에서 admin_email 읽기 테스트...');
    
    const adminEmailConfig = await prisma.systemConfig.findUnique({
      where: { configKey: 'admin_email' },
    });
    const adminEmail = adminEmailConfig?.configValue || process.env.ADMIN_EMAIL || process.env.EMAIL_SMTP_USER || '';
    
    if (adminEmail) {
      logger.log(`   ✅ admin_email 읽기 성공: ${adminEmail}`);
    } else {
      logger.warn(`   ⚠️  admin_email이 설정되지 않음`);
    }

    // 5. 설정 정보 조회 시뮬레이션 (API와 동일한 로직)
    logger.log('\n5️⃣ 설정 정보 조회 시뮬레이션...');
    
    const settingsInfo = {
      email: process.env.EMAIL_SMTP_USER || '',
      emailSmtpHost: process.env.EMAIL_SMTP_HOST || '',
      emailSmtpPort: process.env.EMAIL_SMTP_PORT || '',
      adminEmail: adminEmail,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
    };
    
    logger.log('   ✅ 설정 정보 조회 성공:');
    logger.log(`      - EMAIL_SMTP_USER: ${settingsInfo.email ? '설정됨' : '미설정'}`);
    logger.log(`      - EMAIL_SMTP_HOST: ${settingsInfo.emailSmtpHost || '미설정'}`);
    logger.log(`      - EMAIL_SMTP_PORT: ${settingsInfo.emailSmtpPort || '미설정'}`);
    logger.log(`      - ADMIN_EMAIL: ${settingsInfo.adminEmail || '미설정'}`);
    logger.log(`      - NEXT_PUBLIC_BASE_URL: ${settingsInfo.baseUrl || '미설정'}`);

    logger.log('\n✅ 관리자 설정 저장/읽기 플로우 시뮬레이션 완료!');
  } catch (error) {
    logger.error('❌ 관리자 설정 플로우 시뮬레이션 실패:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

