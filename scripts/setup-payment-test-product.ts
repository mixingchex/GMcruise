import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const productCode = 'PAYMENT-TEST-1000';

    // 상품 조회
    const product = await prisma.cruiseProduct.findUnique({
        where: { productCode },
        include: { MallProductContent: true },
    });

    if (!product) {
        console.error('❌ 상품을 찾을 수 없습니다:', productCode);
        return;
    }

    // 요금표 샘플 데이터
    const pricingData = [
        {
            id: 'room_1',
            roomType: '내부 (Interior)',
            adult: 100000,
            adult3rd: 80000,
            child2to11: 50000,
            infantUnder2: 10000,
        },
        {
            id: 'room_2',
            roomType: '오션뷰 (Oceanview)',
            adult: 150000,
            adult3rd: 120000,
            child2to11: 75000,
            infantUnder2: 10000,
        },
        {
            id: 'room_3',
            roomType: '발코니 (Balcony)',
            adult: 200000,
            adult3rd: 160000,
            child2to11: 100000,
            infantUnder2: 10000,
        },
    ];

    // Layout 데이터 생성
    const layoutData = {
        pricing: pricingData,
        highlights: [
            '웰컴페이먼츠 결제 테스트용 상품입니다',
            '실제 결제가 진행되므로 주의하세요',
            '테스트 후 환불 처리가 필요합니다',
        ],
    };

    // MallProductContent 업데이트 또는 생성
    if (product.MallProductContent) {
        await prisma.mallProductContent.update({
            where: { productCode },
            data: {
                layout: layoutData,
                updatedAt: new Date(),
            },
        });
        console.log('✅ 기존 MallProductContent 업데이트 완료');
    } else {
        await prisma.mallProductContent.create({
            data: {
                productCode,
                layout: layoutData,
                updatedAt: new Date(),
            },
        });
        console.log('✅ 새 MallProductContent 생성 완료');
    }

    console.log('\n=== 결제 테스트 준비 완료 ===\n');
    console.log('테스트 URL: http://localhost:3000/products/PAYMENT-TEST-1000/payment');
    console.log('\n요금표:');
    pricingData.forEach((row) => {
        console.log(`  ${row.roomType}:`);
        console.log(`    - 1,2번째 성인: ${row.adult.toLocaleString()}원`);
        console.log(`    - 만 12세 이상: ${row.adult3rd.toLocaleString()}원`);
        console.log(`    - 만 2-11세: ${row.child2to11.toLocaleString()}원`);
        console.log(`    - 만 2세 미만: ${row.infantUnder2.toLocaleString()}원`);
    });
}

main()
    .catch((e) => {
        console.error('Error:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
