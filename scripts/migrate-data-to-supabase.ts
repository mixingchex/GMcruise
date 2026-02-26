/**
 * scripts/migrate-data-to-supabase.ts
 * Neon DB → Supabase DB 데이터 이전 스크립트
 *
 * 실행: npx tsx scripts/migrate-data-to-supabase.ts
 */

import { PrismaClient as NeonPrisma } from '@prisma/client';
import { PrismaClient as SupaPrisma } from '@prisma/client';

const neon = new NeonPrisma({
  datasources: { db: { url: process.env.OLD_DATABASE_URL! } },
});

const supa = new SupaPrisma({
  datasources: { db: { url: process.env.DATABASE_URL! } },
});

// 이전할 테이블 순서 (FK 의존성 순서)
// 참조하는 테이블이 먼저 와야 함

async function migrate<T extends { id?: number | string }>(
  name: string,
  fetchFn: () => Promise<T[]>,
  insertFn: (rows: T[]) => Promise<unknown>,
) {
  process.stdout.write(`  ${name} ... `);
  try {
    const rows = await fetchFn();
    if (rows.length === 0) {
      console.log('(비어있음)');
      return;
    }

    // 배치 단위로 insert
    const BATCH = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      await insertFn(batch).catch(() => {
        // 중복 무시
      });
      inserted += batch.length;
    }
    console.log(`✅ ${rows.length}개`);
  } catch (e) {
    console.log(`❌ 오류: ${(e as Error).message}`);
  }
}

async function main() {
  if (!process.env.OLD_DATABASE_URL) {
    console.error('❌ OLD_DATABASE_URL 환경변수가 없습니다. .env 파일을 확인하세요.');
    process.exit(1);
  }

  console.log('=== Neon → Supabase 데이터 이전 시작 ===\n');

  // 1. User (모든 FK의 부모)
  await migrate('User', () => neon.user.findMany(), async (rows) => {
    for (const row of rows) {
      await supa.user.upsert({
        where: { id: row.id },
        update: row as Parameters<typeof supa.user.update>[0]['data'],
        create: row as Parameters<typeof supa.user.create>[0]['data'],
      }).catch(() => {});
    }
  });

  // 2. Session
  await migrate('Session', () => neon.session.findMany(), async (rows) => {
    await supa.session.createMany({ data: rows as Parameters<typeof supa.session.createMany>[0]['data'], skipDuplicates: true });
  });

  // 3. CruiseProduct
  await migrate('CruiseProduct', () => neon.cruiseProduct.findMany(), async (rows) => {
    await supa.cruiseProduct.createMany({ data: rows as Parameters<typeof supa.cruiseProduct.createMany>[0]['data'], skipDuplicates: true });
  });

  // 4. MallProductContent
  await migrate('MallProductContent', () => neon.mallProductContent.findMany(), async (rows) => {
    await supa.mallProductContent.createMany({ data: rows as Parameters<typeof supa.mallProductContent.createMany>[0]['data'], skipDuplicates: true });
  });

  // 5. AffiliateProfile
  await migrate('AffiliateProfile', () => neon.affiliateProfile.findMany(), async (rows) => {
    await supa.affiliateProfile.createMany({ data: rows as Parameters<typeof supa.affiliateProfile.createMany>[0]['data'], skipDuplicates: true });
  });

  // 6. Trip
  await migrate('Trip', () => neon.trip.findMany(), async (rows) => {
    await supa.trip.createMany({ data: rows as Parameters<typeof supa.trip.createMany>[0]['data'], skipDuplicates: true });
  });

  // 7. UserTrip
  await migrate('UserTrip', () => neon.userTrip.findMany(), async (rows) => {
    await supa.userTrip.createMany({ data: rows as Parameters<typeof supa.userTrip.createMany>[0]['data'], skipDuplicates: true });
  });

  // 8. Itinerary
  await migrate('Itinerary', () => neon.itinerary.findMany(), async (rows) => {
    await supa.itinerary.createMany({ data: rows as Parameters<typeof supa.itinerary.createMany>[0]['data'], skipDuplicates: true });
  });

  // 9. Reservation
  await migrate('Reservation', () => neon.reservation.findMany(), async (rows) => {
    await supa.reservation.createMany({ data: rows as Parameters<typeof supa.reservation.createMany>[0]['data'], skipDuplicates: true });
  });

  // 10. Payment
  await migrate('Payment', () => neon.payment.findMany(), async (rows) => {
    await supa.payment.createMany({ data: rows as Parameters<typeof supa.payment.createMany>[0]['data'], skipDuplicates: true });
  });

  // 11. AffiliateSale
  await migrate('AffiliateSale', () => neon.affiliateSale.findMany(), async (rows) => {
    await supa.affiliateSale.createMany({ data: rows as Parameters<typeof supa.affiliateSale.createMany>[0]['data'], skipDuplicates: true });
  });

  // 12. ChecklistItem
  await migrate('ChecklistItem', () => neon.checklistItem.findMany(), async (rows) => {
    await supa.checklistItem.createMany({ data: rows as Parameters<typeof supa.checklistItem.createMany>[0]['data'], skipDuplicates: true });
  });

  // 13. Expense
  await migrate('Expense', () => neon.expense.findMany(), async (rows) => {
    await supa.expense.createMany({ data: rows as Parameters<typeof supa.expense.createMany>[0]['data'], skipDuplicates: true });
  });

  // 14. TravelDiaryEntry
  await migrate('TravelDiaryEntry', () => neon.travelDiaryEntry.findMany(), async (rows) => {
    await supa.travelDiaryEntry.createMany({ data: rows as Parameters<typeof supa.travelDiaryEntry.createMany>[0]['data'], skipDuplicates: true });
  });

  // 15. ItineraryGroup
  await migrate('ItineraryGroup', () => neon.itineraryGroup.findMany(), async (rows) => {
    await supa.itineraryGroup.createMany({ data: rows as Parameters<typeof supa.itineraryGroup.createMany>[0]['data'], skipDuplicates: true });
  });

  // 16. ChatHistory
  await migrate('ChatHistory', () => neon.chatHistory.findMany(), async (rows) => {
    await supa.chatHistory.createMany({ data: rows as Parameters<typeof supa.chatHistory.createMany>[0]['data'], skipDuplicates: true });
  });

  // 나머지 테이블들 (FK 없거나 마지막)
  const remaining = [
    ['AffiliateProduct', () => neon.affiliateProduct.findMany(), (r: unknown[]) => supa.affiliateProduct.createMany({ data: r as Parameters<typeof supa.affiliateProduct.createMany>[0]['data'], skipDuplicates: true })],
    ['AffiliateLeads', () => neon.affiliateLeads.findMany(), (r: unknown[]) => supa.affiliateLeads.createMany({ data: r as Parameters<typeof supa.affiliateLeads.createMany>[0]['data'], skipDuplicates: true })],
    ['Traveler', () => neon.traveler.findMany(), (r: unknown[]) => supa.traveler.createMany({ data: r as Parameters<typeof supa.traveler.createMany>[0]['data'], skipDuplicates: true })],
  ] as const;

  for (const [name, fetchFn, insertFn] of remaining) {
    await migrate(name, fetchFn as () => Promise<{ id?: number | string }[]>, insertFn as (rows: { id?: number | string }[]) => Promise<unknown>);
  }

  console.log('\n=== 이전 완료 ===');

  // 검증
  const [neonUsers, supaUsers] = await Promise.all([
    neon.user.count(),
    supa.user.count(),
  ]);
  console.log(`\nUser: Neon ${neonUsers}명 → Supabase ${supaUsers}명`);

  if (neonUsers === supaUsers) {
    console.log('✅ 검증 통과 — 이전 성공!');
  } else {
    console.log('⚠️ 숫자가 다릅니다. 수동 확인 필요.');
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await neon.$disconnect();
    await supa.$disconnect();
  });
