// scripts/update-seo-optimized.ts
// SEO 최적화된 설정 자동 적용 스크립트

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSeoOptimized() {
  try {
    console.log('🚀 SEO 최적화 설정을 적용하는 중...');

    // 기존 설정 확인
    // @ts-ignore - seoGlobalConfig는 Prisma 스키마에 없을 수 있음
    const existing = await prisma.seoGlobalConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    // 상위 노출 확률이 높은 키워드 (경쟁이 적고 검색량이 있는 키워드 우선)
    const optimizedKeywords = [
      // 핵심 키워드 (높은 검색량, 브랜드)
      '크루즈닷지니AI', '크루즈닷', 'cruisedot',
      
      // 1순위: 검색 의도가 명확한 키워드 (상위 노출 확률 높음)
      '크루즈 예약', '크루즈 예약 사이트', '크루즈 여행 예약', '크루즈 패키지 예약',
      '크루즈 가격', '크루즈 여행 가격', '크루즈 패키지 가격', '크루즈 여행 비용',
      '크루즈 일정', '크루즈 여행 일정', '크루즈 일정표', '크루즈 여행 일정 추천',
      
      // 2순위: 구체적인 지역/목적지 키워드 (경쟁 적음, 상위 노출 확률 높음)
      '일본 크루즈', '일본 크루즈 여행', '일본 크루즈 예약', '일본 크루즈 일정',
      '지중해 크루즈', '지중해 크루즈 여행', '지중해 크루즈 일정',
      '알래스카 크루즈', '알래스카 크루즈 여행', '알래스카 크루즈 일정',
      '카리브 크루즈', '카리브 크루즈 여행', '카리브 크루즈 일정',
      '부산 크루즈', '부산 크루즈 여행', '부산 크루즈 예약',
      '인천 크루즈', '인천 크루즈 여행', '인천 크루즈 예약',
      '제주 크루즈', '제주 크루즈 여행',
      
      // 3순위: 선사별 키워드 (브랜드 검색)
      'MSC 크루즈', 'MSC 크루즈 예약', 'MSC 크루즈 일정',
      '로열캐리비안 크루즈', '로열캐리비안 크루즈 예약',
      '노르웨이 크루즈', '노르웨이 크루즈 예약',
      '프린세스 크루즈', '프린세스 크루즈 예약',
      '코스타 크루즈', '코스타 크루즈 예약',
      
      // 4순위: 정보성 키워드 (경쟁 적음, 상위 노출 확률 높음)
      '크루즈 여행 준비', '크루즈 여행 준비물', '크루즈 여행 체크리스트',
      '크루즈 여행 가이드', '크루즈 여행 가이드북', '크루즈 여행 팁',
      '크루즈 여행 후기', '크루즈 여행 리뷰', '크루즈 여행 꿀팁',
      '크루즈 여행 정보', '크루즈 여행 상담', '크루즈 여행 추천',
      '크루즈 여행 추천지', '크루즈 여행 패키지',
      
      // 5순위: 일반 키워드 (높은 검색량, 경쟁 치열)
      '크루즈', '크루즈 여행', '크루즈 상품', '크루즈 가이드',
      'AI 여행 도우미', '크루즈 선박', '크루즈 항구', '크루즈 터미널',
      '크루즈 커뮤니티', '해외 크루즈'
    ].join(', ');

    const seoData = {
      // 기본 SEO 설정 (최적화)
      defaultSiteName: '크루즈 가이드 - 크루즈닷지니AI',
      defaultSiteDescription: '크루즈닷지니AI와 함께하는 특별한 크루즈 여행. 크루즈 예약, 일정, 가격 비교부터 여행 준비, 실시간 안내까지 모든 것을 한 곳에서. 일본 크루즈, 지중해 크루즈, 알래스카 크루즈 등 다양한 크루즈 여행 상품을 확인하세요.',
      defaultKeywords: optimizedKeywords,
      // @ts-ignore - process.env는 Node.js 환경에서 사용 가능
      defaultOgImage: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr'}/images/ai-cruise-logo.png`,
    };

    if (existing) {
      // 기존 설정 업데이트 (다른 설정은 유지)
      await (prisma as any).seoGlobalConfig.update({
        where: { id: existing.id },
        data: {
          ...seoData,
          // 기존 설정 유지
          googleSearchConsoleVerification: existing.googleSearchConsoleVerification,
          googleSearchConsolePropertyId: existing.googleSearchConsolePropertyId,
          googleAnalyticsId: existing.googleAnalyticsId,
          youtubeUrl: existing.youtubeUrl,
          naverBlogUrl: existing.naverBlogUrl,
          kakaoChannelUrl: existing.kakaoChannelUrl,
          instagramUrl: existing.instagramUrl,
          facebookUrl: existing.facebookUrl,
          twitterUrl: existing.twitterUrl,
          contactPhone: existing.contactPhone,
          contactEmail: existing.contactEmail,
          contactAddress: existing.contactAddress,
        },
      });
      console.log('✅ SEO 최적화 설정이 업데이트되었습니다.');
    } else {
      console.error('❌ 기존 SEO 설정을 찾을 수 없습니다. 먼저 setup-seo-config.ts를 실행하세요.');
      // @ts-ignore - process는 Node.js 환경에서 사용 가능
      process.exit(1);
    }

    console.log('\n📋 최적화된 SEO 설정:');
    console.log('- 기본 사이트명:', seoData.defaultSiteName);
    console.log('- 기본 사이트 설명:', seoData.defaultSiteDescription);
    console.log('- 기본 키워드 개수:', optimizedKeywords.split(', ').length, '개');
    console.log('- Open Graph 이미지:', seoData.defaultOgImage);
    
    console.log('\n🎯 키워드 전략:');
    console.log('1순위: 검색 의도가 명확한 키워드 (예약, 가격, 일정)');
    console.log('2순위: 구체적인 지역/목적지 키워드 (일본 크루즈, 지중해 크루즈 등)');
    console.log('3순위: 선사별 키워드 (MSC 크루즈, 로열캐리비안 크루즈 등)');
    console.log('4순위: 정보성 키워드 (준비, 가이드, 후기, 팁 등)');
    console.log('5순위: 일반 키워드 (크루즈, 크루즈 여행 등)');
    
    console.log('\n🎉 SEO 최적화 설정이 성공적으로 적용되었습니다!');
    
  } catch (error) {
    console.error('❌ SEO 최적화 설정 적용 중 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateSeoOptimized()
  .then(() => {
    console.log('\n✅ 완료!');
    // @ts-ignore - process는 Node.js 환경에서 사용 가능
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실패:', error);
    // @ts-ignore - process는 Node.js 환경에서 사용 가능
    process.exit(1);
  });

