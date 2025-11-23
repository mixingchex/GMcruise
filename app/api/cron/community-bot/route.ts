// app/api/cron/community-bot/route.ts
// 커뮤니티 자동 게시글/댓글 생성 봇 (5분마다 실행)

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { askGemini } from '@/lib/gemini';

// 한글 아이디 목록
const KOREAN_NICKNAMES = [
  '송이엄마', '찡찡', '크루즈닷만세', '바다사랑', '여행러버', '크루즈킹', '해외여행러', 
  '선상낭만', '오션뷰', '크루즈매니아', '여행의신', '바다의왕자', '선상요리사', 
  '크루즈여행자', '해외탐험가', '선상파티', '오션드림', '크루즈마스터', '여행스타', 
  '바다의별', '선상로맨스', '크루즈러버', '해외여행러버', '선상낭만주의자'
];

// 카테고리 목록
const CATEGORIES = ['travel-tip', 'qna', 'destination'];

// 봇 사용자 ID (봇 전용 계정)
const BOT_USER_ID = 1; // 관리자 계정 또는 봇 전용 계정 ID

/**
 * AI를 사용하여 크루즈 관련 게시글 생성
 */
async function generatePost(): Promise<{ title: string; content: string; category: string } | null> {
  try {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    
    const prompt = `크루즈 여행 커뮤니티에 올릴 게시글을 작성해주세요.

요구사항:
- 카테고리: ${category === 'travel-tip' ? '여행팁' : category === 'qna' ? '질문답변' : '관광지 추천'}
- 실제 크루즈 여행객이 쓴 것처럼 자연스럽고 친근한 톤
- 제목: 20-40자 정도, 간결하고 매력적
- 내용: 100-200자 정도, 구체적이고 실용적
- 이모지 사용 가능 (적당히)
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
 * 게시글에 맞는 자연스러운 댓글 생성
 */
async function generateComment(postTitle: string, postContent: string, postCategory: string): Promise<string | null> {
  try {
    const authorName = KOREAN_NICKNAMES[Math.floor(Math.random() * KOREAN_NICKNAMES.length)];
    
    const prompt = `다음 크루즈 커뮤니티 게시글에 대한 자연스러운 댓글을 작성해주세요.

게시글 제목: ${postTitle}
게시글 내용: ${postContent}
카테고리: ${postCategory}

요구사항:
- 실제 사용자가 쓴 것처럼 자연스럽고 친근한 톤
- 20-50자 정도의 짧고 간결한 댓글
- 게시글 내용과 관련된 공감, 질문, 조언 등
- 이모지 사용 가능 (1-2개 정도)
- 한국어로 작성
- 댓글만 작성 (다른 설명 없이)`;

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

