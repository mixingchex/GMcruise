// scripts/apply-indexes.ts
// 인덱스 마이그레이션 실행 스크립트

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

async function applyIndexes() {
  try {
    logger.log('[Apply Indexes] 인덱스 적용 시작');

    const sqlFile = join(process.cwd(), 'prisma', 'migrations', 'add_performance_indexes.sql');
    const sql = readFileSync(sqlFile, 'utf-8');

    // SQL 문을 세미콜론으로 분리
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await prisma.$executeRawUnsafe(statement);
          logger.log(`[Apply Indexes] 인덱스 적용 성공: ${statement.substring(0, 50)}...`);
        } catch (error: any) {
          // 이미 존재하는 인덱스는 무시
          if (error.message?.includes('already exists') || error.code === '42P07') {
            logger.log(`[Apply Indexes] 인덱스 이미 존재 (무시): ${statement.substring(0, 50)}...`);
          } else {
            logger.error(`[Apply Indexes] 인덱스 적용 실패:`, error);
            throw error;
          }
        }
      }
    }

    logger.log('[Apply Indexes] 모든 인덱스 적용 완료');

  } catch (error) {
    logger.error('[Apply Indexes] 오류:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 직접 실행 시
if (import.meta.url === `file://${process.argv[1]}`) {
  applyIndexes()
    .then(() => {
      logger.log('[Apply Indexes] 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[Apply Indexes] 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { applyIndexes };


