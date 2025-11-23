// 커뮤니티 데이터 확인 스크립트 (Node.js 버전 - 더 안전함)
// 사용법: node scripts/check-community-data-safe.js

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkCommunityData() {
  try {
    console.log('🔍 커뮤니티 데이터 확인 중...\n');

    // CommunityPost 데이터 확인
    const totalPosts = await prisma.communityPost.count();
    const activePosts = await prisma.communityPost.count({
      where: { isDeleted: false }
    });
    const deletedPosts = await prisma.communityPost.count({
      where: { isDeleted: true }
    });

    console.log('📊 CommunityPost 데이터:');
    console.log(`  - 전체: ${totalPosts}개`);
    console.log(`  - 활성: ${activePosts}개`);
    console.log(`  - 삭제됨: ${deletedPosts}개\n`);

    // CommunityComment 데이터 확인
    const totalComments = await prisma.communityComment.count();
    console.log('📊 CommunityComment 데이터:');
    console.log(`  - 전체: ${totalComments}개\n`);

    // 카테고리별 게시글 수
    const postsByCategory = await prisma.communityPost.groupBy({
      by: ['category'],
      where: { isDeleted: false },
      _count: { id: true }
    });

    console.log('📊 카테고리별 게시글 수:');
    if (postsByCategory.length === 0) {
      console.log('  - 데이터 없음');
    } else {
      postsByCategory
        .sort((a, b) => b._count.id - a._count.id)
        .forEach(item => {
          console.log(`  - ${item.category}: ${item._count.id}개`);
        });
    }

    // 최근 게시글 5개 확인
    const recentPosts = await prisma.communityPost.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        authorName: true,
        createdAt: true
      }
    });

    console.log('\n📊 최근 게시글 5개:');
    if (recentPosts.length === 0) {
      console.log('  - 데이터 없음');
    } else {
      recentPosts.forEach((post, index) => {
        console.log(`  ${index + 1}. [${post.category}] ${post.title} (작성자: ${post.authorName || '익명'}, ID: ${post.id})`);
        console.log(`     생성일: ${post.createdAt.toISOString()}`);
      });
    }

    console.log('\n✅ 확인 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error('상세:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCommunityData();

