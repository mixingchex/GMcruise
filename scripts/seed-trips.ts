import prisma from '@/lib/prisma';

async function main() {
  // 여행 상품 샘플 데이터 생성
  const trip = await prisma.trip.create({
    data: {
      productCode: 'TEST-2025-MSC-01',
      shipName: 'MSC Bellissima',
      departureDate: new Date('2025-05-10'),
    },
  });

  console.log('여행 상품 샘플 데이터 생성 완료:');
  console.log(`- ProductCode: ${trip.productCode}`);
  console.log(`- ShipName: ${trip.shipName}`);
  console.log(`- DepartureDate: ${trip.departureDate.toISOString().split('T')[0]}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


