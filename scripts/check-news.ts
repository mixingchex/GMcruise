import prisma from '../lib/prisma';

async function checkNews() {
  try {
    // 최근 생성된 cruisedot-news 확인
    const recentNews = await prisma.communityPost.findMany({
      where: {
        category: 'cruisedot-news',
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
        authorName: true,
      },
    });

    console.log('📰 최근 크루즈뉘우스:', recentNews.length, '개');
    recentNews.forEach((news, index) => {
      console.log(`${index + 1}. [${news.id}] ${news.title}`);
      console.log(`   생성일: ${news.createdAt}`);
      console.log(`   작성자: ${news.authorName}`);
      console.log('');
    });

    // 오늘 생성된 뉴스 확인
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayNews = await prisma.communityPost.findMany({
      where: {
        category: 'cruisedot-news',
        isDeleted: false,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    console.log('📅 오늘 생성된 뉴스:', todayNews.length, '개');
    todayNews.forEach((news) => {
      console.log(`  - [${news.id}] ${news.title}`);
    });
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNews();
