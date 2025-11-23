// app/api/cron/community-bot/route.ts
// 커뮤니티 자동 게시글/댓글 생성 봇 (5분마다 실행)

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { askGemini } from '@/lib/gemini';

// 한글 아이디 목록 (유튜브 댓글 스타일 - 다양하고 자연스러운 닉네임)
const KOREAN_NICKNAMES = [
  '송이엄마', '찡찡', '크루즈닷만세', '바다사랑', '여행러버', '크루즈킹', '해외여행러', 
  '선상낭만', '오션뷰', '크루즈매니아', '여행의신', '바다의왕자', '선상요리사', 
  '크루즈여행자', '해외탐험가', '선상파티', '오션드림', '크루즈마스터', '여행스타', 
  '바다의별', '선상로맨스', '크루즈러버', '해외여행러버', '선상낭만주의자',
  '민수아빠', '지영맘', '해외여행꿈나무', '크루즈초보', '바다를사랑해', '여행덕후', 
  '크루즈여행기', '선상에서커피한잔', '오션러버', '크루즈신', '바다의요정', '여행마니아',
  '크루즈여행러', '해외여행러버', '선상낭만가', '오션드리머', '크루즈매니아킹', '여행스타일',
  '바다의별빛', '선상로맨티스트', '크루즈러버킹', '해외여행러버킹', '선상낭만주의자킹',
  '김민수', '이영희', '박철수', '최지영', '정수진', '강민호', '윤서연', '장동혁',
  '한소희', '오지훈', '임태현', '신유진', '조민석', '배수지', '홍길동', '김철수',
  '이미영', '박준호', '최민지', '정현우', '강서연', '윤지훈', '장수진', '한동혁',
  '오소희', '임지훈', '신태현', '조유진', '배민석', '홍수지', '김영수', '이지은',
  '박민수', '최영희', '정철수', '강지영', '윤수진', '장민호', '한서연', '오동혁',
  '임소희', '신지훈', '조태현', '배유진', '홍민석', '김수지', '이철수', '박미영',
  '최준호', '정민지', '강현우', '윤서연', '장지훈', '한수진', '오동혁', '임소희',
  '신지훈', '조태현', '배유진', '홍민석', '김수지', '이철수', '박미영', '최준호',
  '정민지', '강현우', '윤서연', '장지훈', '한수진', '오동혁', '임소희', '신지훈',
  '크루즈좋아', '바다사랑이', '여행꿈나무', '선상낭만가', '오션드리머', '크루즈매니아킹',
  '여행스타일러', '바다의별빛', '선상로맨티스트', '크루즈러버킹', '해외여행러버킹',
  '크루즈초보자', '바다를사랑해요', '여행덕후킹', '크루즈여행기록', '선상에서커피',
  '오션러버킹', '크루즈신', '바다의요정', '여행마니아킹', '크루즈여행러버',
  '해외여행러버킹', '선상낭만가킹', '오션드리머킹', '크루즈매니아킹', '여행스타일러킹'
];

// 카테고리 목록
const CATEGORIES = ['travel-tip', 'qna', 'destination'];

// 봇 사용자 ID (봇 전용 계정)
const BOT_USER_ID = 1; // 관리자 계정 또는 봇 전용 계정 ID

/**
 * 게시글 길이 범위 선택 (비율에 따라)
 */
function selectPostLengthRange(): { min: number; max: number } {
  const random = Math.random();
  
  if (random < 0.2) {
    // 20%: 300자 이내
    return { min: 50, max: 300 };
  } else if (random < 0.7) {
    // 50%: 500자 이내
    return { min: 200, max: 500 };
  } else if (random < 0.9) {
    // 20%: 1000자 이내
    return { min: 500, max: 1000 };
  } else {
    // 10%: 3000자 이내
    return { min: 1000, max: 3000 };
  }
}

/**
 * AI를 사용하여 크루즈 관련 게시글 생성 (유튜브 댓글 스타일 참고)
 */
async function generatePost(): Promise<{ title: string; content: string; category: string } | null> {
  try {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const lengthRange = selectPostLengthRange();
    
    const prompt = `유튜브 크루즈 영상 댓글을 참고하여 크루즈 여행 커뮤니티 게시글을 작성해주세요.

참고할 유튜브 댓글 스타일:
- 실제 사람들이 정말 궁금해하고 도움이 필요한 질문들
- 행복하고 즐거워하는 감정 표현
- 구체적이고 실용적인 경험 공유
- 친근하고 자연스러운 말투
- 이모지 적절히 사용 (1-2개)
- 짧고 간결하지만 진심이 담긴 표현

요구사항:
- 카테고리: ${category === 'travel-tip' ? '여행팁' : category === 'qna' ? '질문답변' : '관광지 추천'}
- 실제 크루즈 여행객이 유튜브 댓글에 쓸 것처럼 자연스럽고 진솔한 톤
- 제목: 15-35자 정도, 궁금증이나 감동을 담은 제목
- 내용: ${lengthRange.min}-${lengthRange.max}자 정도, 구체적이고 실용적이며 감정이 담긴 내용
- 유튜브 댓글처럼 "정말 궁금해요", "도움 부탁드려요", "너무 좋았어요" 같은 표현 사용
- 한국어로 작성
- 반드시 ${lengthRange.min}자 이상 ${lengthRange.max}자 이내로 작성하세요

응답 형식:
제목: [제목]
내용: [내용]`;

    const response = await askGemini([
      { role: 'user', content: prompt }
    ], 0.8);

    if (!response || !response.text) {
      console.error('[COMMUNITY BOT] AI 응답 없음');
      return null;
    }

    const text = response.text.trim();
    const titleMatch = text.match(/제목:\s*(.+?)(?:\n|$)/);
    const contentMatch = text.match(/내용:\s*(.+?)(?:\n|$)/s);

    if (!titleMatch || !contentMatch) {
      // 형식이 다르면 전체를 제목으로, 나머지를 내용으로
      const lines = text.split('\n').filter(l => l.trim());
      const title = lines[0]?.replace(/^제목:\s*/, '').trim() || '크루즈 여행 후기';
      let content = lines.slice(1).join('\n').replace(/^내용:\s*/, '').trim() || text;
      
      // 길이 범위에 맞게 조정
      if (content.length > lengthRange.max) {
        content = content.substring(0, lengthRange.max);
      }
      
      return {
        title: title.substring(0, 100),
        content,
        category
      };
    }

    const title = titleMatch[1].trim().substring(0, 100);
    let content = contentMatch[1].trim();
    
    // 길이 범위에 맞게 조정
    if (content.length > lengthRange.max) {
      content = content.substring(0, lengthRange.max);
    }
    
    return {
      title,
      content,
      category
    };
  } catch (error) {
    console.error('[COMMUNITY BOT] 게시글 생성 실패:', error);
    return null;
  }
}

/**
 * 댓글이 부정적인지 감지
 */
async function detectNegativeSentiment(commentContent: string): Promise<boolean> {
  try {
    const prompt = `다음 댓글이 부정적(불만, 비판, 실망, 불만족 등)인지 판단해주세요.

댓글: "${commentContent}"

부정적인 표현 예시:
- "별로였어요", "실망했어요", "비추해요", "안 좋았어요"
- "비싸요", "불편했어요", "서비스가 나빠요"
- "추천 안 해요", "후회했어요", "별로예요"

긍정적이거나 중립적인 표현은 부정적이 아닙니다:
- "궁금해요", "어떤가요?", "추천해주세요"
- "좋았어요", "만족했어요", "추천해요"

응답 형식:
부정적이면: "YES"
부정적이 아니면: "NO"
댓글만 작성 (다른 설명 없이)`;

    const response = await askGemini([
      { role: 'user', content: prompt }
    ], 0.7);

    if (!response || !response.text) {
      return false;
    }

    const result = response.text.trim().toUpperCase();
    return result.includes('YES');
  } catch (error) {
    console.error('[COMMUNITY BOT] 감정 분석 실패:', error);
    return false; // 에러 시 부정적이 아니라고 가정
  }
}

/**
 * 부정적 댓글에 대한 긍정적 대응 댓글 생성
 */
async function generatePositiveResponse(negativeComment: string, postTitle: string, postContent: string): Promise<string | null> {
  try {
    const prompt = `다음 부정적인 댓글에 대해 긍정적이고 도움이 되는 대응 댓글을 작성해주세요.

부정적 댓글: "${negativeComment}"
게시글 제목: ${postTitle}
게시글 내용: ${postContent}

요구사항:
- 부정적인 내용을 직접 반박하지 않고, 긍정적인 관점으로 대응
- 공감과 이해를 표현하면서도 긍정적인 해결책이나 다른 관점 제시
- 친근하고 자연스러운 말투
- 20-70자 정도의 짧고 간결한 댓글
- 이모지 사용 가능 (1-2개, 자연스럽게)
- 한국어로 작성
- 댓글만 작성 (다른 설명 없이)

예시:
- "아쉽게 느끼셨군요. 저는 이렇게 해서 좋았어요..."
- "그런 경험도 있으시군요. 저는 이 부분이 좋았는데..."
- "이해해요. 다음에는 이렇게 해보시면 어떨까요?"`;

    const response = await askGemini([
      { role: 'user', content: prompt }
    ], 0.8);

    if (!response || !response.text) {
      return null;
    }

    const comment = response.text.trim().substring(0, 200);
    return comment;
  } catch (error) {
    console.error('[COMMUNITY BOT] 긍정적 대응 댓글 생성 실패:', error);
    return null;
  }
}

/**
 * 댓글 길이 범위 선택 (비율에 따라)
 */
function selectCommentLengthRange(): { min: number; max: number } {
  const random = Math.random();
  
  if (random < 0.4) {
    // 40%: 30자 이내
    return { min: 10, max: 30 };
  } else if (random < 0.7) {
    // 30%: 60자 이내
    return { min: 25, max: 60 };
  } else if (random < 0.8) {
    // 10%: 100자 이내
    return { min: 60, max: 100 };
  } else if (random < 0.85) {
    // 5%: 150자 이내
    return { min: 100, max: 150 };
  } else {
    // 5%: 200자 이내
    return { min: 150, max: 200 };
  }
}

/**
 * 게시글에 맞는 자연스러운 댓글 생성 (유튜브 댓글 스타일)
 */
async function generateComment(postTitle: string, postContent: string, postCategory: string): Promise<string | null> {
  try {
    const lengthRange = selectCommentLengthRange();
    
    const prompt = `유튜브 크루즈 영상 댓글 스타일을 참고하여 다음 게시글에 대한 자연스러운 댓글을 작성해주세요.

게시글 제목: ${postTitle}
게시글 내용: ${postContent}
카테고리: ${postCategory}

참고할 유튜브 댓글 스타일:
- 실제 사람들이 정말 궁금해하고 도움이 필요한 질문들
- 행복하고 즐거워하는 감정 표현 ("너무 좋았어요!", "정말 추천해요!")
- 공감과 격려 ("저도 궁금했어요", "도움됐어요 감사합니다")
- 구체적인 경험 공유 ("저도 거기 갔었는데...", "저는 이렇게 했어요")
- 친근하고 자연스러운 말투
- 짧고 간결하지만 진심이 담긴 표현

요구사항:
- 실제 유튜브 댓글처럼 자연스럽고 진솔한 톤
- ${lengthRange.min}-${lengthRange.max}자 정도의 짧고 간결한 댓글
- 게시글 내용과 관련된 공감, 질문, 조언, 경험 공유
- 이모지 사용 가능 (1-2개 정도, 자연스럽게)
- 한국어로 작성
- 댓글만 작성 (다른 설명 없이)
- "정말", "너무", "진짜", "꼭", "감사합니다" 같은 표현 자연스럽게 사용
- 반드시 ${lengthRange.min}자 이상 ${lengthRange.max}자 이내로 작성하세요`;

    const response = await askGemini([
      { role: 'user', content: prompt }
    ], 0.9);

    if (!response || !response.text) {
      return null;
    }

    const comment = response.text.trim().substring(0, 200);
    return comment;
  } catch (error) {
    console.error('[COMMUNITY BOT] 댓글 생성 실패:', error);
    return null;
  }
}

/**
 * 대댓글 길이 범위 선택 (비율에 따라)
 */
function selectReplyLengthRange(): { min: number; max: number } {
  const random = Math.random();
  
  if (random < 0.6) {
    // 60%: 20자 이내
    return { min: 5, max: 20 };
  } else {
    // 40%: 30자 이내
    return { min: 15, max: 30 };
  }
}

/**
 * 댓글에 대한 자연스러운 대댓글 생성 (AI끼리 대화)
 */
async function generateReply(commentContent: string, commentAuthor: string, postTitle: string): Promise<string | null> {
  try {
    const lengthRange = selectReplyLengthRange();
    
    const prompt = `다음 댓글에 대한 자연스러운 대댓글을 작성해주세요. 실제 사람들이 댓글에 답하는 것처럼 자연스럽게 대화하듯이 작성해주세요.

원본 댓글: "${commentContent}"
댓글 작성자: ${commentAuthor}
게시글 제목: ${postTitle}

요구사항:
- 댓글 내용에 자연스럽게 반응 (공감, 질문, 추가 정보, 경험 공유 등)
- 실제 사람들이 댓글에 답하는 것처럼 자연스러운 대화 톤
- ${lengthRange.min}-${lengthRange.max}자 정도의 짧고 간결한 대댓글
- 이모지 사용 가능 (1개 정도, 자연스럽게)
- 한국어로 작성
- 대댓글만 작성 (다른 설명 없이)
- "맞아요", "저도", "그렇군요", "추가로" 같은 자연스러운 연결 표현 사용
- 반드시 ${lengthRange.min}자 이상 ${lengthRange.max}자 이내로 작성하세요`;

    const response = await askGemini([
      { role: 'user', content: prompt }
    ], 0.85);

    if (!response || !response.text) {
      return null;
    }

    let reply = response.text.trim();
    
    // 길이 범위에 맞게 조정
    if (reply.length > lengthRange.max) {
      reply = reply.substring(0, lengthRange.max);
    }
    
    return reply;
  } catch (error) {
    console.error('[COMMUNITY BOT] 대댓글 생성 실패:', error);
    return null;
  }
}

/**
 * 봇 사용자 계정 확인 또는 생성
 */
async function getOrCreateBotUser() {
  try {
    // 봇 사용자 확인
    let botUser = await prisma.user.findUnique({
      where: { id: BOT_USER_ID }
    });

    if (!botUser) {
      // 봇 사용자 생성
      botUser = await prisma.user.create({
        data: {
          id: BOT_USER_ID,
          name: '크루즈봇',
          phone: '01000000000',
          email: 'bot@cruisedot.com',
          password: 'bot1234',
          role: 'community',
          onboarded: true
        }
      });
      console.log('[COMMUNITY BOT] 봇 사용자 생성 완료');
    }

    return botUser;
  } catch (error) {
    console.error('[COMMUNITY BOT] 봇 사용자 확인 실패:', error);
    return null;
  }
}

/**
 * POST: 봇 실행 (외부 cron 서비스에서 호출)
 * 
 * 서버 부하 최적화:
 * - AI 호출: 최대 8-10회 (게시글 1, 댓글 1, 기존 게시글 댓글 2-3, 대댓글 1-2, 감정 분석 1-2, 긍정적 대응 1-2)
 * - 예상 실행 시간: 20-30초 (각 AI 호출당 2-3초)
 * - 5분 간격 실행이므로 충분한 여유
 * - 타임아웃: 60초 (안전장치)
 */
export async function POST(req: Request) {
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 60000; // 60초 타임아웃
  
  try {
    // 보안: Cron 비밀 키 확인
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: '인증 실패' }, { status: 401 });
    }

    console.log('[COMMUNITY BOT] 봇 실행 시작...');

    // 타임아웃 체크 함수
    const checkTimeout = () => {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        throw new Error('봇 실행 시간 초과 (60초)');
      }
    };

    // 봇 사용자 확인
    checkTimeout();
    const botUser = await getOrCreateBotUser();
    if (!botUser) {
      return NextResponse.json({ ok: false, error: '봇 사용자 확인 실패' }, { status: 500 });
    }

    // 1. 게시글 생성
    checkTimeout();
    const postData = await generatePost();
    if (!postData) {
      return NextResponse.json({ ok: false, error: '게시글 생성 실패' }, { status: 500 });
    }

    console.log('[COMMUNITY BOT] 게시글 생성 완료:', postData.title);

    // 2. 게시글 저장
    const now = new Date();
    const post = await prisma.communityPost.create({
      data: {
        userId: botUser.id,
        title: postData.title,
        content: postData.content,
        category: postData.category,
        authorName: KOREAN_NICKNAMES[Math.floor(Math.random() * KOREAN_NICKNAMES.length)],
        updatedAt: now
      }
    });

    console.log('[COMMUNITY BOT] 게시글 저장 완료:', post.id);

    // 3. 댓글 생성 (게시글에 맞는 자연스러운 댓글)
    checkTimeout();
    const commentContent = await generateComment(postData.title, postData.content, postData.category);
    
    if (commentContent) {
      // 댓글 작성자 (봇이 아닌 다른 사용자처럼 보이게)
      const commentAuthor = KOREAN_NICKNAMES[Math.floor(Math.random() * KOREAN_NICKNAMES.length)];
      
      await prisma.communityComment.create({
        data: {
          postId: post.id,
          userId: botUser.id, // 봇 계정이지만 다른 닉네임 사용
          content: commentContent,
          authorName: commentAuthor,
          updatedAt: now
        }
      });

      // 게시글 댓글 수 업데이트
      await prisma.communityPost.update({
        where: { id: post.id },
        data: {
          comments: { increment: 1 }
        }
      });

      console.log('[COMMUNITY BOT] 댓글 저장 완료');
    }

    // 4. 기존 게시글에 댓글/대댓글 생성 (2-3개 게시글)
    let existingPostCommentsCreated = 0;
    let repliesCreated = 0;
    try {
      // 활성 게시글 중 랜덤으로 2-3개 선택
      const activePosts = await prisma.communityPost.findMany({
        where: {
          isDeleted: false
        },
        select: {
          id: true,
          title: true,
          content: true,
          category: true
        },
        take: 50, // 최근 50개 중에서 선택
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (activePosts.length > 0) {
        // 랜덤으로 2-3개 선택
        const selectedPosts = activePosts
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(3, activePosts.length));

        for (const selectedPost of selectedPosts) {
          try {
            checkTimeout(); // 각 게시글 처리 전 타임아웃 체크
            
            // 기존 게시글에 댓글 생성
            const commentContent = await generateComment(
              selectedPost.title,
              selectedPost.content || '',
              selectedPost.category || 'travel-tip'
            );

            if (commentContent) {
              const commentAuthor = KOREAN_NICKNAMES[Math.floor(Math.random() * KOREAN_NICKNAMES.length)];
              
              const newComment = await prisma.communityComment.create({
                data: {
                  postId: selectedPost.id,
                  userId: botUser.id,
                  content: commentContent,
                  authorName: commentAuthor,
                  updatedAt: now
                }
              });

              // 게시글 댓글 수 업데이트
              await prisma.communityPost.update({
                where: { id: selectedPost.id },
                data: {
                  comments: { increment: 1 }
                }
              });

              existingPostCommentsCreated++;
              console.log(`[COMMUNITY BOT] 기존 게시글 ${selectedPost.id}에 댓글 생성 완료`);

              // 50% 확률로 대댓글 생성 (AI끼리 대화)
              if (Math.random() > 0.5) {
                checkTimeout();
                const replyContent = await generateReply(
                  commentContent,
                  commentAuthor,
                  selectedPost.title
                );

                if (replyContent) {
                  const replyAuthor = KOREAN_NICKNAMES[Math.floor(Math.random() * KOREAN_NICKNAMES.length)];
                  
                  await prisma.communityComment.create({
                    data: {
                      postId: selectedPost.id,
                      userId: botUser.id,
                      content: replyContent,
                      authorName: replyAuthor,
                      parentCommentId: newComment.id,
                      updatedAt: now
                    }
                  });

                  // 게시글 댓글 수 업데이트
                  await prisma.communityPost.update({
                    where: { id: selectedPost.id },
                    data: {
                      comments: { increment: 1 }
                    }
                  });

                  repliesCreated++;
                  console.log(`[COMMUNITY BOT] 댓글 ${newComment.id}에 대댓글 생성 완료`);
                }
              }
            }
          } catch (error) {
            console.error(`[COMMUNITY BOT] 게시글 ${selectedPost.id} 댓글 생성 실패 (무시):`, error);
          }
        }
      }
    } catch (error) {
      console.error('[COMMUNITY BOT] 기존 게시글 댓글 생성 실패 (무시):', error);
    }

    // 5. 부정적 댓글 감지 및 긍정적 대응 (최근 댓글 중 1-2개 확인)
    let positiveResponsesCreated = 0;
    try {
      // 최근 댓글 중 봇이 작성하지 않은 댓글 확인 (실제 유저 댓글)
      const recentComments = await prisma.communityComment.findMany({
        where: {
          userId: { not: botUser.id }, // 봇이 아닌 실제 유저 댓글만
          parentCommentId: null, // 대댓글이 아닌 댓글만
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 최근 24시간 내
          }
        },
        include: {
          Post: {
            select: {
              id: true,
              title: true,
              content: true
            }
          }
        },
        take: 10,
        orderBy: {
          createdAt: 'desc'
        }
      });

      // 랜덤으로 1-2개 선택하여 부정적 댓글 감지
      const commentsToCheck = recentComments
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(2, recentComments.length));

      for (const comment of commentsToCheck) {
        try {
          checkTimeout(); // 각 댓글 처리 전 타임아웃 체크
          
          // 부정적 댓글 감지
          const isNegative = await detectNegativeSentiment(comment.content);
          
          if (isNegative) {
            // 이미 긍정적 대응이 있는지 확인 (중복 방지)
            const existingResponse = await prisma.communityComment.findFirst({
              where: {
                postId: comment.postId,
                parentCommentId: comment.id,
                userId: botUser.id
              }
            });

            if (!existingResponse && comment.Post) {
              checkTimeout();
              
              // 긍정적 대응 댓글 생성
              const positiveResponse = await generatePositiveResponse(
                comment.content,
                comment.Post.title,
                comment.Post.content || ''
              );

              if (positiveResponse) {
                const responseAuthor = KOREAN_NICKNAMES[Math.floor(Math.random() * KOREAN_NICKNAMES.length)];
                
                await prisma.communityComment.create({
                  data: {
                    postId: comment.postId,
                    userId: botUser.id,
                    content: positiveResponse,
                    authorName: responseAuthor,
                    parentCommentId: comment.id,
                    updatedAt: now
                  }
                });

                // 게시글 댓글 수 업데이트
                await prisma.communityPost.update({
                  where: { id: comment.postId },
                  data: {
                    comments: { increment: 1 }
                  }
                });

                positiveResponsesCreated++;
                console.log(`[COMMUNITY BOT] 부정적 댓글 ${comment.id}에 긍정적 대응 생성 완료`);
              }
            }
          }
        } catch (error) {
          console.error(`[COMMUNITY BOT] 댓글 ${comment.id} 감정 분석 실패 (무시):`, error);
        }
      }
    } catch (error) {
      console.error('[COMMUNITY BOT] 부정적 댓글 대응 실패 (무시):', error);
    }

    // 6. 기존 게시글에 좋아요와 뷰 증가 (5분마다 4개씩)
    try {
      const activePosts = await prisma.communityPost.findMany({
        where: {
          isDeleted: false
        },
        select: {
          id: true
        },
        take: 100
      });

      if (activePosts.length > 0) {
        const selectedPosts = activePosts
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(4, activePosts.length));

        for (const selectedPost of selectedPosts) {
          await prisma.communityPost.update({
            where: { id: selectedPost.id },
            data: {
              likes: { increment: 4 },
              views: { increment: 4 }
            }
          });
        }

        console.log(`[COMMUNITY BOT] ${selectedPosts.length}개 게시글에 좋아요/뷰 증가 완료`);
      }
    } catch (error) {
      console.error('[COMMUNITY BOT] 좋아요/뷰 증가 실패 (무시):', error);
    }

    return NextResponse.json({
      ok: true,
      message: '게시글과 댓글이 생성되었습니다.',
      post: {
        id: post.id,
        title: post.title,
        category: post.category
      },
      commentCreated: !!commentContent,
      existingPostComments: existingPostCommentsCreated,
      replies: repliesCreated,
      positiveResponses: positiveResponsesCreated
    });
    const executionTime = Date.now() - startTime;
    console.log(`[COMMUNITY BOT] 봇 실행 완료 (${executionTime}ms)`);
    
    return NextResponse.json({
      ok: true,
      message: '게시글과 댓글이 생성되었습니다.',
      post: {
        id: post.id,
        title: post.title,
        category: post.category
      },
      commentCreated: !!commentContent,
      existingPostComments: existingPostCommentsCreated,
      replies: repliesCreated,
      positiveResponses: positiveResponsesCreated,
      executionTime: `${executionTime}ms`
    });
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error('[COMMUNITY BOT] 오류:', error);
    console.error(`[COMMUNITY BOT] 실행 시간: ${executionTime}ms`);
    
    return NextResponse.json({
      ok: false,
      error: '봇 실행 실패',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      executionTime: `${executionTime}ms`
    }, { status: 500 });
  }
}

/**
 * GET: 테스트용 (실제 운영에서는 제거 권장)
 */
export async function GET(req: Request) {
  try {
    // 개발 환경에서만 허용
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ ok: false, error: '프로덕션에서는 GET 메서드를 사용할 수 없습니다.' }, { status: 403 });
    }

    console.log('[COMMUNITY BOT] 테스트 실행...');

    // 봇 사용자 확인
    const botUser = await getOrCreateBotUser();
    if (!botUser) {
      return NextResponse.json({ ok: false, error: '봇 사용자 확인 실패' }, { status: 500 });
    }

    // 게시글 생성 테스트
    const postData = await generatePost();
    if (!postData) {
      return NextResponse.json({ ok: false, error: '게시글 생성 실패' }, { status: 500 });
    }

    // 댓글 생성 테스트
    const commentContent = await generateComment(postData.title, postData.content, postData.category);

    return NextResponse.json({
      ok: true,
      message: '테스트 완료 (실제 저장 안 함)',
      generatedPost: postData,
      generatedComment: commentContent
    });
  } catch (error: any) {
    console.error('[COMMUNITY BOT] 테스트 오류:', error);
    return NextResponse.json({
      ok: false,
      error: '테스트 실패',
      details: error?.message
    }, { status: 500 });
  }
}

