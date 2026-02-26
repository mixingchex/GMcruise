/**
 * scripts/fix-layout-key-migration.ts
 * DB의 MallProductContent.layout에서 구형 키를 신형 키로 마이그레이션
 *
 * 배경: POST API가 detailBlocks/includedItems/excludedItems/itineraryDays/pricingRows로 저장했으나
 *       PUT API와 편집 페이지는 blocks/included/excluded/itinerary/pricing로 읽으므로 키 불일치 발생.
 *       POST API 수정 후 기존 데이터 정리를 위한 일회성 스크립트.
 *
 * 실행: npx tsx scripts/fix-layout-key-migration.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KEY_MIGRATIONS: [string, string][] = [
  ['detailBlocks', 'blocks'],
  ['includedItems', 'included'],
  ['excludedItems', 'excluded'],
  ['itineraryDays', 'itinerary'],
  ['pricingRows', 'pricing'],
];

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log('[DRY RUN] 실제 DB 변경 없이 영향 범위만 확인합니다.\n');
  }

  const records = await prisma.mallProductContent.findMany({
    select: { productCode: true, layout: true },
  });

  let migratedCount = 0;
  let skippedCount = 0;

  for (const record of records) {
    const layout = record.layout as Record<string, unknown> | null;
    if (!layout || typeof layout !== 'object') {
      skippedCount++;
      continue;
    }

    let updated = false;
    const newLayout = { ...layout };

    for (const [oldKey, newKey] of KEY_MIGRATIONS) {
      if (oldKey in newLayout) {
        if (!(newKey in newLayout)) {
          // 신형 키 없음 → 구형 키 → 신형 키로 이동
          newLayout[newKey] = newLayout[oldKey];
          delete newLayout[oldKey];
          console.log(`  [MIGRATE] ${record.productCode}: ${oldKey} → ${newKey}`);
        } else {
          // 신형 키 이미 있음 → 구형 키만 삭제
          delete newLayout[oldKey];
          console.log(`  [CLEAN]   ${record.productCode}: 중복 ${oldKey} 삭제 (신형 ${newKey} 유지)`);
        }
        updated = true;
      }
    }

    if (updated) {
      migratedCount++;
      if (!isDryRun) {
        await prisma.mallProductContent.update({
          where: { productCode: record.productCode },
          data: { layout: newLayout },
        });
      }
    } else {
      skippedCount++;
    }
  }

  console.log('\n===== 마이그레이션 완료 =====');
  console.log(`처리: ${migratedCount}개 | 스킵: ${skippedCount}개 | 전체: ${records.length}개`);
  if (isDryRun) console.log('[DRY RUN] 실제 변경 없음. --dry-run 없이 재실행하면 적용됩니다.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
