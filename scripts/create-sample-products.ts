/**
 * 샘플 상품 15개 생성 스크립트
 * 수동 등록/편집을 위한 샘플 데이터
 * 
 * 실행 방법:
 * npx tsx scripts/create-sample-products.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 샘플 상품 데이터 (15개)
const sampleProducts = [
  {
    productCode: 'SAMPLE-001',
    cruiseLine: 'Costa Cruises',
    shipName: 'Costa Serena',
    packageName: '일본 3박 4일 크루즈',
    nights: 3,
    days: 4,
    basePrice: 890000,
    description: '일본의 아름다운 항구 도시들을 탐방하는 특별한 크루즈 여행입니다.',
    isPopular: true,
    isRecommended: false,
    isJapan: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '부산', country: '한국', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '후쿠오카', country: '일본', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'SeaDay', location: null, country: null },
      { day: 4, type: 'PortVisit', location: '부산', country: '한국', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-002',
    cruiseLine: 'Royal Caribbean',
    shipName: 'Quantum of the Seas',
    packageName: '싱가포르 4박 5일 크루즈',
    nights: 4,
    days: 5,
    basePrice: 1200000,
    description: '싱가포르를 출발하여 동남아시아의 아름다운 섬들을 탐방합니다.',
    isPopular: false,
    isRecommended: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '싱가포르', country: '싱가포르', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '쿠알라룸푸르', country: '말레이시아', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: '펜앙', country: '말레이시아', arrival: '08:00', departure: '17:00' },
      { day: 4, type: 'SeaDay', location: null, country: null },
      { day: 5, type: 'PortVisit', location: '싱가포르', country: '싱가포르', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-003',
    cruiseLine: 'MSC Cruises',
    shipName: 'MSC Bellissima',
    packageName: '지중해 7박 8일 크루즈',
    nights: 7,
    days: 8,
    basePrice: 2500000,
    description: '서부 지중해의 아름다운 도시들을 탐방하는 프리미엄 크루즈입니다.',
    isPopular: false,
    isRecommended: true,
    isPremium: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '제노바', country: '이탈리아', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '마르세유', country: '프랑스', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: '바르셀로나', country: '스페인', arrival: '08:00', departure: '18:00' },
      { day: 4, type: 'PortVisit', location: '팔마', country: '스페인', arrival: '08:00', departure: '17:00' },
      { day: 5, type: 'SeaDay', location: null, country: null },
      { day: 6, type: 'PortVisit', location: '나폴리', country: '이탈리아', arrival: '08:00', departure: '18:00' },
      { day: 7, type: 'PortVisit', location: '로마', country: '이탈리아', arrival: '08:00', departure: '17:00' },
      { day: 8, type: 'PortVisit', location: '제노바', country: '이탈리아', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-004',
    cruiseLine: 'Princess Cruises',
    shipName: 'Diamond Princess',
    packageName: '일본 4박 5일 크루즈',
    nights: 4,
    days: 5,
    basePrice: 950000,
    description: '일본의 주요 관광 도시를 방문하는 인기 크루즈 상품입니다.',
    isPopular: true,
    isRecommended: false,
    isJapan: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '요코하마', country: '일본', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '시모노세키', country: '일본', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: '나가사키', country: '일본', arrival: '08:00', departure: '17:00' },
      { day: 4, type: 'SeaDay', location: null, country: null },
      { day: 5, type: 'PortVisit', location: '요코하마', country: '일본', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-005',
    cruiseLine: 'Norwegian Cruise Line',
    shipName: 'Norwegian Joy',
    packageName: '알래스카 7박 8일 크루즈',
    nights: 7,
    days: 8,
    basePrice: 3200000,
    description: '알래스카의 장관을 감상하는 특별한 크루즈 여행입니다.',
    isPopular: false,
    isRecommended: true,
    isPremium: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '시애틀', country: '미국', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'SeaDay', location: null, country: null },
      { day: 3, type: 'PortVisit', location: '주노', country: '미국', arrival: '08:00', departure: '18:00' },
      { day: 4, type: 'PortVisit', location: '스카그웨이', country: '미국', arrival: '08:00', departure: '17:00' },
      { day: 5, type: 'PortVisit', location: '케이치칸', country: '미국', arrival: '08:00', departure: '18:00' },
      { day: 6, type: 'SeaDay', location: null, country: null },
      { day: 7, type: 'PortVisit', location: '빅토리아', country: '캐나다', arrival: '08:00', departure: '17:00' },
      { day: 8, type: 'PortVisit', location: '시애틀', country: '미국', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-006',
    cruiseLine: 'Celebrity Cruises',
    shipName: 'Celebrity Millennium',
    packageName: '동부 지중해 5박 6일 크루즈',
    nights: 5,
    days: 6,
    basePrice: 1800000,
    description: '그리스와 터키의 아름다운 도시들을 탐방하는 크루즈입니다.',
    isPopular: false,
    isRecommended: false,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '아테네', country: '그리스', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '산토리니', country: '그리스', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: '미코노스', country: '그리스', arrival: '08:00', departure: '17:00' },
      { day: 4, type: 'PortVisit', location: '쿠샤다시', country: '터키', arrival: '08:00', departure: '18:00' },
      { day: 5, type: 'SeaDay', location: null, country: null },
      { day: 6, type: 'PortVisit', location: '아테네', country: '그리스', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-007',
    cruiseLine: 'Costa Cruises',
    shipName: 'Costa Victoria',
    packageName: '일본 2박 3일 크루즈',
    nights: 2,
    days: 3,
    basePrice: 650000,
    description: '짧은 일정으로 일본을 즐기는 경제적인 크루즈 상품입니다.',
    isPopular: true,
    isRecommended: false,
    isJapan: true,
    isBudget: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '부산', country: '한국', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '후쿠오카', country: '일본', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: '부산', country: '한국', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-008',
    cruiseLine: 'Royal Caribbean',
    shipName: 'Spectrum of the Seas',
    packageName: '중국 5박 6일 크루즈',
    nights: 5,
    days: 6,
    basePrice: 1100000,
    description: '중국의 주요 도시들을 탐방하는 특별한 크루즈 여행입니다.',
    isPopular: false,
    isRecommended: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '상하이', country: '중국', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '베이징', country: '중국', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: '톈진', country: '중국', arrival: '08:00', departure: '17:00' },
      { day: 4, type: 'SeaDay', location: null, country: null },
      { day: 5, type: 'PortVisit', location: '칭다오', country: '중국', arrival: '08:00', departure: '18:00' },
      { day: 6, type: 'PortVisit', location: '상하이', country: '중국', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-009',
    cruiseLine: 'MSC Cruises',
    shipName: 'MSC Splendida',
    packageName: '이탈리아 6박 7일 크루즈',
    nights: 6,
    days: 7,
    basePrice: 2200000,
    description: '이탈리아의 아름다운 해안 도시들을 탐방하는 프리미엄 크루즈입니다.',
    isPopular: false,
    isRecommended: true,
    isPremium: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '제노바', country: '이탈리아', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '나폴리', country: '이탈리아', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: '시칠리아', country: '이탈리아', arrival: '08:00', departure: '17:00' },
      { day: 4, type: 'PortVisit', location: '몰타', country: '몰타', arrival: '08:00', departure: '18:00' },
      { day: 5, type: 'SeaDay', location: null, country: null },
      { day: 6, type: 'PortVisit', location: '바르셀로나', country: '스페인', arrival: '08:00', departure: '17:00' },
      { day: 7, type: 'PortVisit', location: '제노바', country: '이탈리아', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-010',
    cruiseLine: 'Princess Cruises',
    shipName: 'Majestic Princess',
    packageName: '일본 5박 6일 크루즈',
    nights: 5,
    days: 6,
    basePrice: 1300000,
    description: '일본의 다양한 지역을 탐방하는 인기 크루즈 상품입니다.',
    isPopular: true,
    isRecommended: false,
    isJapan: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '요코하마', country: '일본', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '도쿄', country: '일본', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: '오사카', country: '일본', arrival: '08:00', departure: '17:00' },
      { day: 4, type: 'PortVisit', location: '고베', country: '일본', arrival: '08:00', departure: '18:00' },
      { day: 5, type: 'SeaDay', location: null, country: null },
      { day: 6, type: 'PortVisit', location: '요코하마', country: '일본', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-011',
    cruiseLine: 'Norwegian Cruise Line',
    shipName: 'Norwegian Bliss',
    packageName: '카리브해 7박 8일 크루즈',
    nights: 7,
    days: 8,
    basePrice: 2800000,
    description: '카리브해의 열대 낙원을 탐방하는 특별한 크루즈 여행입니다.',
    isPopular: false,
    isRecommended: true,
    isPremium: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '마이애미', country: '미국', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'SeaDay', location: null, country: null },
      { day: 3, type: 'PortVisit', location: '세인트 토마스', country: '미국령 버진아일랜드', arrival: '08:00', departure: '18:00' },
      { day: 4, type: 'PortVisit', location: '세인트 키츠', country: '세인트키츠 네비스', arrival: '08:00', departure: '17:00' },
      { day: 5, type: 'PortVisit', location: '바베이도스', country: '바베이도스', arrival: '08:00', departure: '18:00' },
      { day: 6, type: 'SeaDay', location: null, country: null },
      { day: 7, type: 'PortVisit', location: '나소', country: '바하마', arrival: '08:00', departure: '17:00' },
      { day: 8, type: 'PortVisit', location: '마이애미', country: '미국', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-012',
    cruiseLine: 'Celebrity Cruises',
    shipName: 'Celebrity Solstice',
    packageName: '호주 10박 11일 크루즈',
    nights: 10,
    days: 11,
    basePrice: 3500000,
    description: '호주와 뉴질랜드의 아름다운 도시들을 탐방하는 장기 크루즈입니다.',
    isPopular: false,
    isRecommended: false,
    isPremium: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '시드니', country: '호주', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '멜버른', country: '호주', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'SeaDay', location: null, country: null },
      { day: 4, type: 'PortVisit', location: '호바트', country: '호주', arrival: '08:00', departure: '17:00' },
      { day: 5, type: 'SeaDay', location: null, country: null },
      { day: 6, type: 'PortVisit', location: '오클랜드', country: '뉴질랜드', arrival: '08:00', departure: '18:00' },
      { day: 7, type: 'PortVisit', location: '웰링턴', country: '뉴질랜드', arrival: '08:00', departure: '17:00' },
      { day: 8, type: 'PortVisit', location: '크라이스트처치', country: '뉴질랜드', arrival: '08:00', departure: '18:00' },
      { day: 9, type: 'SeaDay', location: null, country: null },
      { day: 10, type: 'PortVisit', location: '브리즈번', country: '호주', arrival: '08:00', departure: '17:00' },
      { day: 11, type: 'PortVisit', location: '시드니', country: '호주', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-013',
    cruiseLine: 'Costa Cruises',
    shipName: 'Costa Mediterranea',
    packageName: '일본 3박 4일 특가 크루즈',
    nights: 3,
    days: 4,
    basePrice: 750000,
    description: '일본 여행을 저렴하게 즐길 수 있는 특가 상품입니다.',
    isPopular: true,
    isRecommended: false,
    isJapan: true,
    isBudget: true,
    isUrgent: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '부산', country: '한국', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '사세보', country: '일본', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'SeaDay', location: null, country: null },
      { day: 4, type: 'PortVisit', location: '부산', country: '한국', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-014',
    cruiseLine: 'Royal Caribbean',
    shipName: 'Ovation of the Seas',
    packageName: '동남아시아 6박 7일 크루즈',
    nights: 6,
    days: 7,
    basePrice: 1500000,
    description: '동남아시아의 아름다운 섬과 도시들을 탐방하는 크루즈입니다.',
    isPopular: false,
    isRecommended: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '싱가포르', country: '싱가포르', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '쿠알라룸푸르', country: '말레이시아', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: '랑카위', country: '말레이시아', arrival: '08:00', departure: '17:00' },
      { day: 4, type: 'PortVisit', location: '푸켓', country: '태국', arrival: '08:00', departure: '18:00' },
      { day: 5, type: 'SeaDay', location: null, country: null },
      { day: 6, type: 'PortVisit', location: '방콕', country: '태국', arrival: '08:00', departure: '17:00' },
      { day: 7, type: 'PortVisit', location: '싱가포르', country: '싱가포르', arrival: '08:00' },
    ],
  },
  {
    productCode: 'SAMPLE-015',
    cruiseLine: 'MSC Cruises',
    shipName: 'MSC Grandiosa',
    packageName: '북유럽 8박 9일 크루즈',
    nights: 8,
    days: 9,
    basePrice: 3800000,
    description: '북유럽의 아름다운 도시들을 탐방하는 프리미엄 크루즈입니다.',
    isPopular: false,
    isRecommended: true,
    isPremium: true,
    itineraryPattern: [
      { day: 1, type: 'PortVisit', location: '코펜하겐', country: '덴마크', arrival: '18:00', departure: '20:00' },
      { day: 2, type: 'PortVisit', location: '오슬로', country: '노르웨이', arrival: '08:00', departure: '18:00' },
      { day: 3, type: 'PortVisit', location: '스톡홀름', country: '스웨덴', arrival: '08:00', departure: '17:00' },
      { day: 4, type: 'PortVisit', location: '헬싱키', country: '핀란드', arrival: '08:00', departure: '18:00' },
      { day: 5, type: 'PortVisit', location: '상트페테르부르크', country: '러시아', arrival: '08:00', departure: '17:00' },
      { day: 6, type: 'SeaDay', location: null, country: null },
      { day: 7, type: 'PortVisit', location: '탈린', country: '에스토니아', arrival: '08:00', departure: '18:00' },
      { day: 8, type: 'PortVisit', location: '리가', country: '라트비아', arrival: '08:00', departure: '17:00' },
      { day: 9, type: 'PortVisit', location: '코펜하겐', country: '덴마크', arrival: '08:00' },
    ],
  },
];

async function createSampleProducts() {
  console.log('🚀 샘플 상품 생성 시작...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const productData of sampleProducts) {
    try {
      // 기존 상품 확인
      const existing = await prisma.cruiseProduct.findUnique({
        where: { productCode: productData.productCode },
      });

      if (existing) {
        console.log(`⚠️  ${productData.productCode} 이미 존재합니다. 건너뜁니다.`);
        continue;
      }

      // 상품 생성
      const product = await prisma.cruiseProduct.create({
        data: {
          productCode: productData.productCode,
          cruiseLine: productData.cruiseLine,
          shipName: productData.shipName,
          packageName: productData.packageName,
          nights: productData.nights,
          days: productData.days,
          itineraryPattern: productData.itineraryPattern,
          basePrice: productData.basePrice,
          description: productData.description,
          source: 'cruisedot',  // 기본 크루즈닷 로고 표시
          saleStatus: '판매중',
          isPopular: productData.isPopular || false,
          isRecommended: productData.isRecommended || false,
          isPremium: productData.isPremium || false,
          isJapan: productData.isJapan || false,
          isBudget: productData.isBudget || false,
          isUrgent: productData.isUrgent || false,
          updatedAt: new Date(),
        },
      });

      // AffiliateProduct 생성 (메인몰에 표시되도록)
      const now = new Date();
      const effectiveFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7일 전부터 유효
      const effectiveTo = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1년 후까지 유효

      await prisma.affiliateProduct.create({
        data: {
          productCode: productData.productCode,
          cruiseProductId: product.id,
          title: productData.packageName,
          status: 'active',
          isPublished: true,
          effectiveFrom: effectiveFrom,
          effectiveTo: effectiveTo,
          currency: 'KRW',
          defaultSaleAmount: productData.basePrice,
          defaultCostAmount: Math.floor(productData.basePrice * 0.7), // 70%를 원가로 설정
          defaultNetRevenue: Math.floor(productData.basePrice * 0.3), // 30%를 순수익으로 설정
          updatedAt: new Date(),
        },
      });

      // 추천 키워드 자동 생성 (MallProductContent에 저장)
      const recommendedKeywords: string[] = [];
      
      // 패키지명에서 키워드 추출
      if (productData.packageName.includes('일본')) {
        recommendedKeywords.push('일본', '일본 크루즈', '일본 여행');
      }
      if (productData.packageName.includes('싱가포르')) {
        recommendedKeywords.push('싱가포르', '싱가포르 크루즈', '동남아');
      }
      if (productData.packageName.includes('지중해')) {
        recommendedKeywords.push('지중해', '지중해 크루즈', '유럽');
      }
      if (productData.packageName.includes('알래스카')) {
        recommendedKeywords.push('알래스카', '알래스카 크루즈', '미국');
      }
      if (productData.packageName.includes('카리브해')) {
        recommendedKeywords.push('카리브해', '카리브 크루즈', '열대');
      }
      if (productData.packageName.includes('동남아')) {
        recommendedKeywords.push('동남아', '동남아시아', '동남아 크루즈');
      }
      if (productData.packageName.includes('북유럽')) {
        recommendedKeywords.push('북유럽', '북유럽 크루즈', '유럽');
      }
      
      // 크루즈 라인 추가
      if (productData.cruiseLine) {
        const cruiseLineName = productData.cruiseLine.split('(')[0].trim();
        if (cruiseLineName && !recommendedKeywords.includes(cruiseLineName)) {
          recommendedKeywords.push(cruiseLineName);
        }
      }
      
      // 선박명 추가
      if (productData.shipName) {
        const shipName = productData.shipName.split('(')[0].trim();
        if (shipName && !recommendedKeywords.includes(shipName)) {
          recommendedKeywords.push(shipName);
        }
      }

      // MallProductContent 생성 (추천 키워드 포함)
      if (recommendedKeywords.length > 0) {
        await prisma.mallProductContent.upsert({
          where: { productCode: productData.productCode },
          update: {
            layout: {
              recommendedKeywords: recommendedKeywords,
            },
            updatedAt: new Date(),
          },
          create: {
            productCode: productData.productCode,
            layout: {
              recommendedKeywords: recommendedKeywords,
            },
            isActive: true,
            updatedAt: new Date(),
          },
        });
      }

      console.log(`✅ ${productData.productCode} 생성 완료: ${productData.packageName} (추천 키워드: ${recommendedKeywords.join(', ')})`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ ${productData.productCode} 생성 실패:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 생성 완료:`);
  console.log(`   ✅ 성공: ${successCount}개`);
  console.log(`   ❌ 실패: ${errorCount}개`);
  console.log(`\n💡 관리자 페이지에서 상품을 확인하고 편집할 수 있습니다: /admin/products`);
}

// 스크립트 실행
createSampleProducts()
  .catch((error) => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
