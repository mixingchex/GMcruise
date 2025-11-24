const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const reservations = await prisma.reservation.findMany({
      take: 10,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          }
        },
        Trip: {
          select: {
            id: true,
            shipName: true,
            departureDate: true,
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    console.log('\n📋 테스트 가능한 예약 데이터:');
    console.log('==================================\n');
    
    if (reservations.length === 0) {
      console.log('❌ 예약 데이터가 없습니다.');
      return;
    }

    reservations.forEach((r, index) => {
      console.log(`${index + 1}. 예약 ID: ${r.id}`);
      console.log(`   └─ 예약자: ${r.User?.name || '미정'}`);
      console.log(`   └─ 전화번호: ${r.User?.phone || '미정'}`);
      console.log(`   └─ 이메일: ${r.User?.email || '미정'}`);
      console.log(`   └─ 인원: ${r.totalPeople}명`);
      if (r.Trip) {
        console.log(`   └─ 선박: ${r.Trip.shipName}`);
        console.log(`   └─ 출발일: ${r.Trip.departureDate ? new Date(r.Trip.departureDate).toLocaleDateString('ko-KR') : '미정'}`);
      }
      console.log(`   └─ 테스트 URL: http://localhost:3000/customer/passport/${r.id}`);
      console.log('');
    });

    console.log('\n✅ 위의 예약 ID와 전화번호로 테스트하세요!');
    
  } catch (error) {
    console.error('❌ 에러:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();






















