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
 * AI를 사용하여 크루즈 관련 게시글 생성 (유튜브 댓글 스타일 참고)
 */
async function generatePost(): Promise<{ title: string; content: string; category: string } | null> {
  try {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    
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
- 내용: 80-180자 정도, 구체적이고 실용적이며 감정이 담긴 내용
- 유튜브 댓글처럼 "정말 궁금해요", "도움 부탁드려요", "너무 좋았어요" 같은 표현 사용
- 한국어로 작성

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
      const content = lines.slice(1).join('\n').replace(/^내용:\s*/, '').trim() || text;
      
      return {
        title: title.substring(0, 100),
        content: content.substring(0, 500),
        category
      };
    }

    return {
      title: titleMatch[1].trim().substring(0, 100),
      content: contentMatch[1].trim().substring(0, 500),
      category
    };
  } catch (error) {
    console.error('[COMMUNITY BOT] 게시글 생성 실패:', error);
    return null;
  }
}

/**
 * 게시글에 맞는 자연스러운 댓글 생성 (유튜브 댓글 스타일)
 */
async function generateComment(postTitle: string, postContent: string, postCategory: string): Promise<string | null> {
  try {
    const authorName = KOREAN_NICKNAMES[Math.floor(Math.random() * KOREAN_NICKNAMES.length)];
    
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
- 15-60자 정도의 짧고 간결한 댓글
- 게시글 내용과 관련된 공감, 질문, 조언, 경험 공유
- 이모지 사용 가능 (1-2개 정도, 자연스럽게)
- 한국어로 작성
- 댓글만 작성 (다른 설명 없이)
- "정말", "너무", "진짜", "꼭", "감사합니다" 같은 표현 자연스럽게 사용`;

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
 */
export async function POST(req: Request) {
  try {
    // 보안: Cron 비밀 키 확인
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: '인증 실패' }, { status: 401 });
    }

    console.log('[COMMUNITY BOT] 봇 실행 시작...');

    // 봇 사용자 확인
    const botUser = await getOrCreateBotUser();
    if (!botUser) {
      return NextResponse.json({ ok: false, error: '봇 사용자 확인 실패' }, { status: 500 });
    }

    // 1. 게시글 생성
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

    // 4. 기존 게시글에 좋아요와 뷰 증가 (5분마다 4개씩)
    try {
      // 활성 게시글 중 랜덤으로 4개 선택
      const activePosts = await prisma.communityPost.findMany({
        where: {
          isDeleted: false
        },
        select: {
          id: true
        },
        take: 100 // 최근 100개 중에서 선택
      });

      if (activePosts.length > 0) {
        // 랜덤으로 4개 선택 (또는 전체가 4개 미만이면 모두)
        const selectedPosts = activePosts
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(4, activePosts.length));

        // 각 게시글에 좋아요 4개, 뷰 4개씩 증가
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
      // 좋아요/뷰 증가 실패해도 게시글 생성은 성공으로 처리
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
      commentCreated: !!commentContent
    });
  } catch (error: any) {
    console.error('[COMMUNITY BOT] 오류:', error);
    return NextResponse.json({
      ok: false,
      error: '봇 실행 실패',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
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

