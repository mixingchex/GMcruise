import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 테스트할 크루즈 상품 조회
    const products = await prisma.cruiseProduct.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            productCode: true,
            packageName: true,
            basePrice: true,
            cruiseLine: true,
            shipName: true,
            saleStatus: true,
        },
    });

    console.log('\n=== 결제 테스트용 크루즈 상품 ===\n');

    if (products.length === 0) {
        console.log('❌ 등록된 크루즈 상품이 없습니다.');
        return;
    }

    products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.packageName}`);
        console.log(`   상품코드: ${product.productCode}`);
        console.log(`   크루즈: ${product.cruiseLine} - ${product.shipName}`);
        console.log(`   기본가격: ${product.basePrice?.toLocaleString() || 'N/A'}원`);
        console.log(`   판매상태: ${product.saleStatus}`);
        console.log(`   테스트 URL: http://localhost:3000/products/${product.productCode}/payment`);
        console.log('');
    });

    console.log('\n💡 위 URL 중 하나를 브라우저에서 열어 결제 테스트를 진행하세요.\n');
}

main()
    .catch((e) => {
        console.error('Error:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
