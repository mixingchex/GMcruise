// app/api/community/my-info/route.ts
// 내 정보 조회 API (커뮤니티 전용)

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    console.log('[MY INFO] Starting request...');
    const session = await getSession();
    
    if (!session || !session.userId) {
      console.log('[MY INFO] No session found');
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.userId);
    console.log('[MY INFO] User ID:', userId);

    // 사용자 정보 조회 (커뮤니티 전용)
    console.log('[MY INFO] Fetching user...');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        genieStatus: true,
        mallNickname: true,
        mallUserId: true,
      }
    });

    // 로그인한 모든 사용자 접근 가능
    if (!user) {
      console.log('[MY INFO] User not found');
      return NextResponse.json(
        { ok: false, error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    console.log('[MY INFO] User found:', user.name);

    // 내가 올린 커뮤니티 게시글
    console.log('[MY INFO] Fetching posts...');
    const myPosts = await prisma.communityPost.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        views: true,
        likes: true,
        comments: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            CommunityComment: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log('[MY INFO] Posts found:', myPosts.length);

    // 내가 올린 리뷰 (삭제되지 않은 것만)
    console.log('[MY INFO] Fetching reviews...');
    const myReviews = await prisma.cruiseReview.findMany({
      where: { 
        userId: user.id,
        isDeleted: false  // 삭제되지 않은 리뷰만 조회
      },
      select: {
        id: true,
        title: true,
        content: true,
        rating: true,
        cruiseLine: true,
        shipName: true,
        travelDate: true,
        images: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log('[MY INFO] Reviews found:', myReviews.length);

    // 내가 쓴 댓글
    console.log('[MY INFO] Fetching comments...');
    const myComments = await prisma.communityComment.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        Post: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log('[MY INFO] Comments found:', myComments.length);

    // 여행 문의 정보 (UserTrip 모델에서 조회) - 관리자가 배정한 여행 정보 포함
    console.log('[MY INFO] Fetching trips...');
    let myTrips = [];
    try {
      myTrips = await prisma.userTrip.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          cruiseName: true,
          startDate: true,
          endDate: true,
          status: true,
          companionType: true, // 동행유형 추가
          destination: true, // 목적지 추가
          nights: true,
          days: true,
          createdAt: true,
          productId: true,
          CruiseProduct: {
            select: {
              productCode: true,
              packageName: true,
              cruiseLine: true,
              shipName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      console.log('[MY INFO] Trips found:', myTrips.length);
    } catch (tripError: any) {
      console.error('[MY INFO] Error fetching trips:', tripError);
      console.error('[MY INFO] Trip error details:', tripError.message, tripError.stack);
      // trips는 빈 배열로 유지
    }

    // 크루즈 가이드 지니 연동 정보 확인 (mallUserId가 현재 사용자 ID와 일치하는 지니 사용자 찾기)
    console.log('[MY INFO] Fetching linked genie user...');
    let linkedGenieUser = null;
    try {
      linkedGenieUser = await prisma.user.findFirst({
        where: {
          mallUserId: user.id.toString(),
          genieStatus: { not: null },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          genieStatus: true,
          genieLinkedAt: true,
          isLocked: true,
        },
      });
      console.log('[MY INFO] Linked genie user found:', linkedGenieUser ? 'yes' : 'no');
    } catch (genieError: any) {
      console.error('[MY INFO] Error fetching linked genie user:', genieError);
      // linkedGenieUser는 null로 유지
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        genieStatus: user.genieStatus,
        genieName: user.mallNickname,
        geniePhone: user.mallUserId,
        linkedGenieUser: linkedGenieUser ? {
          id: linkedGenieUser.id,
          name: linkedGenieUser.name,
          phone: linkedGenieUser.phone,
          genieStatus: linkedGenieUser.genieStatus,
          genieLinkedAt: linkedGenieUser.genieLinkedAt?.toISOString() || null,
          isLocked: linkedGenieUser.isLocked,
        } : null,
      },
      posts: myPosts.map(post => ({
        ...post,
        commentCount: post._count.CommunityComment,
        createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
        updatedAt: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : post.updatedAt
      })),
      reviews: myReviews.map(review => {
        let images = [];
        try {
          if (Array.isArray(review.images)) {
            images = review.images;
          } else if (typeof review.images === 'string') {
            images = JSON.parse(review.images);
          }
        } catch (e) {
          console.error('[MY INFO] Failed to parse review images:', e);
          images = [];
        }
        return {
          ...review,
          travelDate: review.travelDate instanceof Date ? review.travelDate.toISOString() : (review.travelDate || null),
          images,
          createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt,
          updatedAt: review.updatedAt instanceof Date ? review.updatedAt.toISOString() : review.updatedAt
        };
      }),
      comments: myComments.map(comment => ({
        ...comment,
        createdAt: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt,
        updatedAt: comment.updatedAt instanceof Date ? comment.updatedAt.toISOString() : comment.updatedAt
      })),
      trips: myTrips.map(trip => ({
        ...trip,
        startDate: trip.startDate instanceof Date ? trip.startDate.toISOString() : trip.startDate,
        endDate: trip.endDate instanceof Date ? trip.endDate.toISOString() : trip.endDate,
        createdAt: trip.createdAt instanceof Date ? trip.createdAt.toISOString() : trip.createdAt,
        companionType: trip.companionType,
        destination: trip.destination ? (Array.isArray(trip.destination) ? trip.destination : [trip.destination]) : null,
        nights: trip.nights,
        days: trip.days,
      }))
    });
  } catch (error: any) {
    console.error('[MY INFO] Error:', error);
    console.error('[MY INFO] Error message:', error?.message);
    console.error('[MY INFO] Error stack:', error?.stack);
    console.error('[MY INFO] Error name:', error?.name);
    if (error?.code) {
      console.error('[MY INFO] Error code:', error.code);
    }
    return NextResponse.json(
      { 
        ok: false, 
        error: '정보를 불러오는 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

