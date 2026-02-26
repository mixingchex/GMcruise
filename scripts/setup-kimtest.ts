import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 144 },
    select: { id: true, name: true, email: true, phone: true },
  });
  console.log('김테스트:', user);

  const trips = await prisma.userTrip.findMany({
    where: { userId: 144 },
    include: {
      Itinerary: true,
      CruiseProduct: { select: { productCode: true, shipName: true } },
    },
  });
  console.log('UserTrip 수:', trips.length);
  trips.forEach(t => {
    console.log('  -', t.id, t.status, t.startDate?.toISOString().slice(0, 10), 'Itinerary:', t.Itinerary.length, '개');
  });

  if (trips.length > 0) {
    console.log('이미 UserTrip 있음 — 스킵');
    return;
  }

  const product = await prisma.cruiseProduct.findFirst({
    where: { productCode: { not: { startsWith: 'PAYMENT-TEST' } } },
    orderBy: { id: 'asc' },
    select: { id: true, productCode: true, shipName: true, packageName: true, nights: true, days: true, itineraryPattern: true },
  });
  console.log('사용할 상품:', product?.productCode, product?.packageName ?? product?.shipName);

  if (!product) { console.log('상품 없음'); return; }

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() + 30);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (product.nights ?? 7));

  const ut = await prisma.userTrip.create({
    data: {
      userId: 144,
      productId: product.id,
      cruiseName: product.packageName ?? product.shipName,
      destination: JSON.stringify([]),
      startDate,
      endDate,
      nights: product.nights ?? 0,
      days: product.days ?? 0,
      status: 'Upcoming',
      updatedAt: new Date(),
    },
  });
  console.log('UserTrip 생성:', ut.id);

  const pattern = product.itineraryPattern;
  const list = Array.isArray(pattern) ? (pattern as Array<Record<string, unknown>>) : [];

  if (list.length > 0) {
    const itinData = list.map((p, idx) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + idx);
      const loc = p.location as string | undefined;
      const typ = p.type as string | undefined;
      const isSea = !loc || loc === '해상' || typ === 'sea';
      return {
        userTripId: ut.id,
        day: typeof p.day === 'number' ? p.day : idx + 1,
        date,
        type: isSea ? 'sea' : (typ ?? 'PortVisit'),
        location: isSea ? null : (loc ?? null),
        country: (p.country as string) ?? null,
        arrival: (p.arrival as string) ?? null,
        departure: (p.departure as string) ?? null,
        updatedAt: new Date(),
      };
    });
    const created = await prisma.itinerary.createMany({ data: itinData });
    console.log('Itinerary 생성:', created.count, '개');
  } else {
    console.log('itineraryPattern 없음 — Itinerary 미생성');
  }

  console.log('완료! 여행 기간:', startDate.toISOString().slice(0, 10), '~', endDate.toISOString().slice(0, 10));
}

main().catch(console.error).finally(() => prisma.$disconnect());
