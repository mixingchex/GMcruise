/**
 * KnowledgeBase 문서들의 임베딩을 배치로 생성하는 스크립트
 * 임베딩이 없는 문서들에 대해 임베딩을 생성하고 저장합니다.
 * 
 * 사용법:
 *   npx tsx scripts/generate-knowledge-embeddings.ts
 *   또는
 *   npm run generate-embeddings (package.json에 스크립트 추가 필요)
 */

import prisma from '../lib/prisma';
import { generateEmbedding, normalizeVector } from '../lib/ai/embeddingUtils';
import { logger } from '../lib/logger';

async function generateEmbeddingsForAllDocuments() {
  try {
    logger.info('[Embedding Batch] 시작: 임베딩이 없는 KnowledgeBase 문서 찾기');

    // 임베딩이 없거나 오래된 문서 찾기
    const documentsWithoutEmbedding = await prisma.knowledgeBase.findMany({
      where: {
        OR: [
          { embedding: null },
          { embeddingUpdatedAt: null },
        ],
        isActive: true, // 활성화된 문서만
      },
      select: {
        id: true,
        title: true,
        content: true,
        keywords: true,
        embedding: true,
        embeddingUpdatedAt: true,
      },
    });

    logger.info(`[Embedding Batch] 임베딩이 필요한 문서: ${documentsWithoutEmbedding.length}개`);

    if (documentsWithoutEmbedding.length === 0) {
      logger.info('[Embedding Batch] 모든 문서에 임베딩이 있습니다.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // 각 문서에 대해 임베딩 생성
    for (const doc of documentsWithoutEmbedding) {
      try {
        logger.info(`[Embedding Batch] 처리 중: ${doc.id} - ${doc.title}`);

        // 임베딩 생성용 텍스트 조합
        const contentText = `${doc.title} ${doc.content} ${doc.keywords}`;

        // 임베딩 생성
        const embedding = await generateEmbedding(contentText);
        const normalizedEmbedding = normalizeVector(embedding);

        // DB에 저장
        await prisma.knowledgeBase.update({
          where: { id: doc.id },
          data: {
            embedding: normalizedEmbedding as any, // JSON 타입으로 저장
            embeddingUpdatedAt: new Date(),
          },
        });

        successCount++;
        logger.info(`[Embedding Batch] 완료: ${doc.id} - ${doc.title} (임베딩 차원: ${normalizedEmbedding.length})`);

        // API 호출 제한을 고려하여 약간의 지연 추가 (선택사항)
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 지연

      } catch (error: any) {
        failCount++;
        logger.error(`[Embedding Batch] 실패: ${doc.id} - ${doc.title}`, error.message);
        // 실패해도 다음 문서 계속 처리
      }
    }

    logger.info(`[Embedding Batch] 완료: 성공 ${successCount}개, 실패 ${failCount}개`);

  } catch (error: any) {
    logger.error('[Embedding Batch] 전체 오류:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
if (require.main === module) {
  generateEmbeddingsForAllDocuments()
    .then(() => {
      logger.info('[Embedding Batch] 스크립트 종료');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('[Embedding Batch] 스크립트 오류:', error);
      process.exit(1);
    });
}

export default generateEmbeddingsForAllDocuments;
