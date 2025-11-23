// scripts/setup-seo-config.ts
// SEO 전역 설정 자동 적용 스크립트

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupSeoConfig() {
  try {
    console.log('🚀 SEO 전역 설정을 적용하는 중...');

    // 기존 설정 확인
    // @ts-ignore - seoGlobalConfig는 Prisma 스키마에 없을 수 있음
    const existing = await prisma.seoGlobalConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const seoData = {
      // Google Search Console
      googleSearchConsoleVerification: 'khbG5wojyUHCzjodTg4AZXUUXt6XBeoD0VGKKUXrZfo',
      googleSearchConsolePropertyId: '309238904', // 계정 ID
      
      // Google Analytics
      googleAnalyticsId: 'G-SH8PSWE0ZN',
      
      // 소셜 미디어 링크
      youtubeUrl: 'https://www.youtube.com/@cruisedotgini',
      naverBlogUrl: 'https://blog.naver.com/mastermpnica',
      kakaoChannelUrl: 'https://pf.kakao.com/_CzxgPn/friend',
      instagramUrl: 'https://www.instagram.com/bizmonica/',
      facebookUrl: null,
      twitterUrl: null,
      
      // 기본 SEO 설정
      defaultSiteName: '크루즈 가이드',
      defaultSiteDescription: 'AI 가이드 지니와 함께하는 특별한 크루즈 여행. 크루즈 상품 예약, 여행 준비, 실시간 안내까지 모든 것을 한 곳에서.',
      defaultKeywords: '크루즈, 크루즈 여행, AI 여행 도우미, 크루즈 가이드, 크루즈 상품, 크루즈 예약, 일본 크루즈, 해외 크루즈, 지중해 크루즈, 알래스카 크루즈, 카리브 크루즈, 크루즈 여행 패키지, 크루즈 선박, 크루즈 항구, 크루즈 터미널, 크루즈 여행 준비, 크루즈 체크리스트, 크루즈 여행 후기, 크루즈 커뮤니티, 크루즈닷, cruisedot, 크루즈닷지니AI',
      // @ts-ignore - process.env는 Node.js 환경에서 사용 가능
      defaultOgImage: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr'}/images/ai-cruise-logo.png`,
      
      // 연락처 정보
      contactPhone: '010-3289-3800',
      contactEmail: 'hyeseon28@naver.com',
      contactAddress: '경기 화성시 효행로 1068 (리더스프라자) 603-A60호',
    };

    if (existing) {
      // 기존 설정 업데이트
      // @ts-ignore - seoGlobalConfig는 Prisma 스키마에 없을 수 있음
      await prisma.seoGlobalConfig.update({
        where: { id: existing.id },
        data: seoData,
      });
      console.log('✅ 기존 SEO 설정이 업데이트되었습니다.');
    } else {
      // 새 설정 생성
      // @ts-ignore - seoGlobalConfig는 Prisma 스키마에 없을 수 있음
      await prisma.seoGlobalConfig.create({
        data: seoData,
      });
      console.log('✅ 새로운 SEO 설정이 생성되었습니다.');
    }

    console.log('\n📋 적용된 설정:');
    console.log('- Google Search Console Verification:', seoData.googleSearchConsoleVerification);
    console.log('- Google Analytics ID:', seoData.googleAnalyticsId);
    console.log('- YouTube:', seoData.youtubeUrl);
    console.log('- 네이버 블로그:', seoData.naverBlogUrl);
    console.log('- 카카오 채널:', seoData.kakaoChannelUrl);
    console.log('- Instagram:', seoData.instagramUrl);
    console.log('- 연락처:', seoData.contactPhone);
    console.log('- 이메일:', seoData.contactEmail);
    console.log('- 주소:', seoData.contactAddress);
    
    console.log('\n🎉 SEO 설정이 성공적으로 적용되었습니다!');
    console.log('💡 Google Search Console에서 "확인" 버튼을 클릭하여 사이트 소유권을 확인하세요.');
    
  } catch (error) {
    console.error('❌ SEO 설정 적용 중 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupSeoConfig()
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

