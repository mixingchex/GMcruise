/**
 * 임베딩 스크립트 테스트
 * 테스트 문서를 생성하고 임베딩이 제대로 생성되는지 확인
 */

import prisma from '../lib/prisma';
import { generateEmbedding, normalizeVector } from '../lib/ai/embeddingUtils';
import { logger } from '../lib/logger';

async function testEmbeddingScript() {
  try {
    logger.info('[Test] 임베딩 스크립트 테스트 시작');

    // 1. 테스트 문서 생성
    const testDoc = await prisma.knowledgeBase.create({
      data: {
        category: 'test',
        title: '테스트 문서',
        content: '이것은 임베딩 생성 테스트를 위한 문서입니다.',
        keywords: '테스트, 임베딩',
        isActive: true,
        updatedAt: new Date(),
      },
    });

    logger.info(`[Test] 테스트 문서 생성 완료: ID ${testDoc.id}`);

    // 2. 임베딩이 없는지 확인
    const docBefore = await prisma.knowledgeBase.findUnique({
      where: { id: testDoc.id },
      select: { embedding: true, embeddingUpdatedAt: true },
    });

    logger.info(`[Test] 임베딩 생성 전: embedding=${docBefore?.embedding ? '있음' : '없음'}, embeddingUpdatedAt=${docBefore?.embeddingUpdatedAt || 'null'}`);

    // 3. 임베딩 생성
    const contentText = `${testDoc.title} ${testDoc.content} ${testDoc.keywords}`;
    const embedding = await generateEmbedding(contentText);
    const normalizedEmbedding = normalizeVector(embedding);

    await prisma.knowledgeBase.update({
      where: { id: testDoc.id },
      data: {
        embedding: normalizedEmbedding as any,
        embeddingUpdatedAt: new Date(),
      },
    });

    logger.info(`[Test] 임베딩 생성 완료: 차원 ${normalizedEmbedding.length}`);

    // 4. 임베딩이 생성되었는지 확인
    const docAfter = await prisma.knowledgeBase.findUnique({
      where: { id: testDoc.id },
      select: { embedding: true, embeddingUpdatedAt: true },
    });

    logger.info(`[Test] 임베딩 생성 후: embedding=${docAfter?.embedding ? '있음' : '없음'}, embeddingUpdatedAt=${docAfter?.embeddingUpdatedAt || 'null'}`);

    // 5. 테스트 문서 삭제
    await prisma.knowledgeBase.delete({
      where: { id: testDoc.id },
    });

    logger.info('[Test] 테스트 문서 삭제 완료');

    if (docAfter?.embedding && docAfter?.embeddingUpdatedAt) {
      logger.info('[Test] ✅ 임베딩 스크립트가 정상 작동합니다!');
      console.log('\n✅ 모든 테스트 통과! 임베딩 스크립트가 정상 작동합니다.\n');
    } else {
      logger.error('[Test] ❌ 임베딩 생성 실패');
      console.log('\n❌ 임베딩 생성에 실패했습니다.\n');
      process.exit(1);
    }
  } catch (error: any) {
    logger.error('[Test] 테스트 실패:', error);
    console.error('\n❌ 테스트 실패:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testEmbeddingScript()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('테스트 실행 실패:', error);
    process.exit(1);
  });

