import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 랜덤 크루즈 상품 데이터 생성
const cruiseProducts = [
  {
    productCode: 'TEST-2025-HK-01',
    cruiseLine: 'MSC 크루즈',
    shipName: 'MSC Bellissima',
    packageName: '홍콩-제주 3박 4일 크루즈',
    nights: 3,
    days: 4,
    basePrice: 1200000,
    description: '홍콩에서 출발하여 제주도를 방문하는 특별한 크루즈 여행',
  },
  {
    productCode: 'TEST-2025-JP-02',
    cruiseLine: '로열 캐리비안',
    shipName: 'Spectrum of the Seas',
    packageName: '일본 오사카-도쿄 4박 5일 크루즈',
    nights: 4,
    days: 5,
    basePrice: 1800000,
    description: '일본의 주요 도시를 방문하는 프리미엄 크루즈 패키지',
  },
  {
    productCode: 'TEST-2025-TW-03',
    cruiseLine: '노르웨이 크루즈라인',
    shipName: 'Norwegian Joy',
    packageName: '대만 타이베이-가오슝 2박 3일 크루즈',
    nights: 2,
    days: 3,
    basePrice: 950000,
    description: '대만의 아름다운 항구 도시를 탐방하는 짧고 알찬 크루즈',
  },
];

// 객실 타입별 수당 데이터 생성 함수
function generateCommissionTiers(
  productCode: string,
  cabinTypes: string[],
  baseSaleAmount: number,
  baseCostAmount: number,
) {
  const tiers: any[] = [];
  const fareConfigs = [
    { category: 'PRIMARY_ADULT', label: '1,2번째 성인' },
    { category: 'ADDITIONAL_ADULT', label: '만 12세 이상 (3번째)' },
    { category: 'CHILD_2_11', label: '만 2-11세' },
    { category: 'INFANT_UNDER_2', label: '만 2세 미만' },
  ];

  cabinTypes.forEach((cabinType) => {
    fareConfigs.forEach((fare) => {
      // 객실 타입별 가격 차등 적용
      let saleMultiplier = 1.0;
      let costMultiplier = 1.0;
      
      if (cabinType === '발코니') {
        saleMultiplier = 1.2;
        costMultiplier = 1.15;
      } else if (cabinType === '오션뷰') {
        saleMultiplier = 1.1;
        costMultiplier = 1.08;
      } else {
        saleMultiplier = 1.0;
        costMultiplier = 1.0;
      }

      // 연령대별 가격 차등
      if (fare.category === 'ADDITIONAL_ADULT') {
        saleMultiplier *= 0.85;
        costMultiplier *= 0.85;
      } else if (fare.category === 'CHILD_2_11') {
        saleMultiplier *= 0.6;
        costMultiplier *= 0.6;
      } else if (fare.category === 'INFANT_UNDER_2') {
        saleMultiplier *= 0.2;
        costMultiplier *= 0.2;
      }

      const saleAmount = Math.round(baseSaleAmount * saleMultiplier);
      const costAmount = Math.round(baseCostAmount * costMultiplier);
      const netRevenue = saleAmount - costAmount;

      // 수당 계산 (랜덤하게 생성)
      // 본사 수당: 순이익의 40-60%
      const hqSharePercent = 0.4 + Math.random() * 0.2;
      const hqShareAmount = Math.round(netRevenue * hqSharePercent);

      // 대리점장 수당: 순이익의 20-35%
      const branchSharePercent = 0.2 + Math.random() * 0.15;
      const branchShareAmount = Math.round(netRevenue * branchSharePercent);

      // 판매원 수당: 순이익의 10-20%
      const salesSharePercent = 0.1 + Math.random() * 0.1;
      const salesShareAmount = Math.round(netRevenue * salesSharePercent);

      // 오버라이딩 (대리점장 수당 - 판매원 수당)
      const overrideAmount = Math.max(branchShareAmount - salesShareAmount, 0);

      tiers.push({
        cabinType,
        fareCategory: fare.category,
        fareLabel: fare.label,
        saleAmount,
        costAmount,
        hqShareAmount,
        branchShareAmount,
        salesShareAmount,
        overrideAmount,
        currency: 'KRW',
      });
    });
  });

  return tiers;
}

async function main() {
  console.log('🚀 어필리에이트 상품 샘플 생성 시작...\n');

  try {
    // 1. CruiseProduct 생성 또는 확인
    const createdCruiseProducts = [];
    for (const cruiseData of cruiseProducts) {
      const existing = await prisma.cruiseProduct.findUnique({
        where: { productCode: cruiseData.productCode },
      });

      let cruiseProduct;
      if (existing) {
        console.log(`✅ 기존 크루즈 상품 발견: ${cruiseData.productCode}`);
        cruiseProduct = existing;
      } else {
        cruiseProduct = await prisma.cruiseProduct.create({
          data: {
            ...cruiseData,
            itineraryPattern: [],
            updatedAt: new Date(),
          },
        });
        console.log(`✅ 크루즈 상품 생성: ${cruiseData.productCode} - ${cruiseData.packageName}`);
      }
      createdCruiseProducts.push(cruiseProduct);
    }

    console.log('\n');

    // 2. AffiliateProduct 생성
    const affiliateProducts = [
      {
        productCode: 'TEST-2025-HK-01',
        title: '[특가] 홍콩-제주 3박 4일 크루즈 패키지',
        defaultSaleAmount: 1200000,
        defaultCostAmount: 900000,
        defaultNetRevenue: 300000,
        cabinTypes: ['발코니', '오션뷰', '인사이드'],
      },
      {
        productCode: 'TEST-2025-JP-02',
        title: '[프리미엄] 일본 오사카-도쿄 4박 5일 크루즈',
        defaultSaleAmount: 1800000,
        defaultCostAmount: 1350000,
        defaultNetRevenue: 450000,
        cabinTypes: ['발코니', '오션뷰', '인사이드', '스위트'],
      },
      {
        productCode: 'TEST-2025-TW-03',
        title: '[알뜰] 대만 타이베이-가오슝 2박 3일 크루즈',
        defaultSaleAmount: 950000,
        defaultCostAmount: 750000,
        defaultNetRevenue: 200000,
        cabinTypes: ['오션뷰', '인사이드'],
      },
    ];

    const effectiveFrom = new Date();
    effectiveFrom.setDate(effectiveFrom.getDate() - 7); // 7일 전부터 적용

    const effectiveTo = new Date();
    effectiveTo.setFullYear(effectiveTo.getFullYear() + 1); // 1년 후까지

    for (let i = 0; i < affiliateProducts.length; i++) {
      const affiliateData = affiliateProducts[i];
      const cruiseProduct = createdCruiseProducts[i];

      // 기존 어필리에이트 상품 확인
      const existingAffiliate = await prisma.affiliateProduct.findFirst({
        where: {
          productCode: affiliateData.productCode,
          effectiveFrom: {
            lte: effectiveTo,
          },
          effectiveTo: {
            gte: effectiveFrom,
          },
        },
      });

      if (existingAffiliate) {
        console.log(`⚠️  기존 어필리에이트 상품 존재: ${affiliateData.productCode}`);
        console.log(`   ID: ${existingAffiliate.id}, 제목: ${existingAffiliate.title}`);
        continue;
      }

      // 수당 티어 생성
      const commissionTiers = generateCommissionTiers(
        affiliateData.productCode,
        affiliateData.cabinTypes,
        affiliateData.defaultSaleAmount,
        affiliateData.defaultCostAmount,
      );

      // AffiliateProduct 생성 (두 단계로 나눠서 생성)
      const affiliateProduct = await prisma.affiliateProduct.create({
        data: {
          productCode: affiliateData.productCode,
          title: affiliateData.title,
          CruiseProduct: cruiseProduct.id
            ? {
                connect: { id: cruiseProduct.id },
              }
            : undefined,
          status: 'active',
          currency: 'KRW',
          defaultSaleAmount: affiliateData.defaultSaleAmount,
          defaultCostAmount: affiliateData.defaultCostAmount,
          defaultNetRevenue: affiliateData.defaultNetRevenue,
          effectiveFrom,
          effectiveTo,
          isPublished: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // CommissionTier 생성
      if (commissionTiers.length > 0) {
        await prisma.affiliateCommissionTier.createMany({
          data: commissionTiers.map((tier) => ({
            ...tier,
            affiliateProductId: affiliateProduct.id,
            updatedAt: new Date(),
          })),
        });
      }

      // 생성된 상품 정보 조회
      const productWithTiers = await prisma.affiliateProduct.findUnique({
        where: { id: affiliateProduct.id },
        include: {
          AffiliateCommissionTier: true,
        },
      });

      console.log(`✅ 어필리에이트 상품 생성 완료:`);
      console.log(`   상품 코드: ${productWithTiers?.productCode}`);
      console.log(`   제목: ${productWithTiers?.title}`);
      console.log(`   기본 판매가: ${productWithTiers?.defaultSaleAmount?.toLocaleString()}원`);
      console.log(`   기본 입금가: ${productWithTiers?.defaultCostAmount?.toLocaleString()}원`);
      console.log(`   본사 순이익: ${productWithTiers?.defaultNetRevenue?.toLocaleString()}원`);
      console.log(`   수당 티어 수: ${productWithTiers?.AffiliateCommissionTier.length || 0}개`);
      console.log(`   객실 타입: ${affiliateData.cabinTypes.join(', ')}`);
      console.log('');
    }

    console.log('✨ 어필리에이트 상품 샘플 생성 완료!\n');
    console.log('📊 생성된 상품 요약:');
    console.log(`   - 총 ${affiliateProducts.length}개의 어필리에이트 상품`);
    console.log(`   - 각 상품마다 객실 타입별, 연령대별 수당 티어 생성됨`);
    console.log(`   - 대리점장, 판매원 대시보드에서 테스트 가능\n`);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

