/**
 * scripts/migrate-passwords-to-bcrypt.ts
 *
 * 일회성 마이그레이션: User 테이블의 평문 비밀번호를 bcrypt 해시로 변환
 *
 * 실행 방법:
 *   tsx scripts/migrate-passwords-to-bcrypt.ts
 *   (또는) npx ts-node scripts/migrate-passwords-to-bcrypt.ts
 *
 * 특징:
 *   - 멱등성: 이미 bcrypt 해시인 행은 건너뜀 (startsWith('$2') 감지)
 *   - 배치 처리: BATCH_SIZE씩 처리하여 메모리 절약
 *   - 안전: 배포 후 코드 변경이 먼저 적용된 뒤에 실행해야 함
 *
 * 실행 타이밍:
 *   1. 코드 변경 배포 완료 (Lazy Migration 로직 포함)
 *   2. 30일 이상 운영 (대부분의 유저가 자동 재해시)
 *   3. 이 스크립트로 나머지 평문 비밀번호 일괄 변환
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;
const BATCH_SIZE = 100;

async function main() {
  console.log('====== bcrypt 비밀번호 마이그레이션 시작 ======');
  console.log(`배치 크기: ${BATCH_SIZE}, 해시 라운드: ${BCRYPT_ROUNDS}`);

  let processed = 0;
  let hashed = 0;
  let skipped = 0;
  let cursor: number | undefined;

  while (true) {
    const users = await prisma.user.findMany({
      where: cursor ? { id: { gt: cursor } } : undefined,
      select: { id: true, password: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
    });

    if (users.length === 0) break;
    cursor = users[users.length - 1].id;

    for (const user of users) {
      processed++;
      const pwd = user.password;

      // 이미 bcrypt 해시이거나 비어있으면 건너뜀
      if (!pwd || pwd.startsWith('$2')) {
        skipped++;
        continue;
      }

      try {
        const hashedPwd = await bcrypt.hash(pwd, BCRYPT_ROUNDS);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPwd },
        });
        hashed++;
      } catch (err) {
        console.error(`[ERROR] userId=${user.id} 해시 실패:`, err);
      }

      if (hashed % 50 === 0 && hashed > 0) {
        console.log(`진행: ${hashed}개 해시 완료, ${skipped}개 건너뜀, ${processed}개 처리됨`);
      }
    }
  }

  console.log('====== 마이그레이션 완료 ======');
  console.log(`총 처리: ${processed}개`);
  console.log(`해시 변환: ${hashed}개`);
  console.log(`건너뜀 (이미 해시): ${skipped}개`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('마이그레이션 실패:', e);
  process.exit(1);
});
