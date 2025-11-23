import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  if (!sid) {
    console.log('[Admin Landing Pages] No session ID');
    return false;
  }
  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: { User: true },
    });

    if (!session) {
      console.log('[Admin Landing Pages] Session not found:', sid?.substring(0, 10) + '...');
      return false;
    }

    if (!session.User) {
      console.log('[Admin Landing Pages] User not found in session:', { sessionId: session.id, userId: session.userId });
      return false;
    }

    const isAdmin = session.User.role === 'admin';
    console.log('[Admin Landing Pages] Auth check:', { userId: session.userId, role: session.User.role, isAdmin });
    return isAdmin;
  } catch (error: any) {
    console.error('[Admin Landing Pages] Auth check error:', error);
    console.error('[Admin Landing Pages] Auth check error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    return false;
  }
}

// GET: 랜딩페이지 목록 조회
export async function GET(req: NextRequest) {
  try {
    const sid = cookies().get(SESSION_COOKIE)?.value;
    if (!sid) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다' }, { status: 401 });
    }

    const isAdmin = await checkAdminAuth(sid);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const where: any = {};
    if (category && category !== '전체') {
      where.category = category;
    }

    let landingPagesRaw;
    try {
      landingPagesRaw = await prisma.landingPage.findMany({
        where,
        include: {
          CustomerGroup: {
            select: {
              id: true,
              name: true,
            },
          },
          User: {
            select: {
              id: true,
              name: true,
              role: true,
              AffiliateProfile: {
                select: {
                  id: true,
                  type: true,
                  displayName: true,
                  affiliateCode: true,
                  branchLabel: true,
                },
              },
            },
          },
          _count: {
            select: {
              SharedLandingPages: true,
            },
          },
          SharedLandingPages: {
            include: {
              ManagerProfile: {
                select: {
                  id: true,
                  displayName: true,
                  branchLabel: true,
                  affiliateCode: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (queryError: any) {
      console.error('[Admin Landing Pages] Database query error:', queryError);
      console.error('[Admin Landing Pages] Error details:', {
        message: queryError?.message,
        code: queryError?.code,
        meta: queryError?.meta,
        stack: queryError?.stack,
      });
      return NextResponse.json(
        { 
          ok: false, 
          error: '랜딩페이지 목록을 불러오는 중 오류가 발생했습니다.',
          details: process.env.NODE_ENV === 'development' ? queryError?.message : undefined
        },
        { status: 500 }
      );
    }

    const landingPages = landingPagesRaw.map((page) => {
      const ownerProfile = page.User?.AffiliateProfile;
      const inferredOwnerType =
        page.User?.role === 'admin'
          ? 'ADMIN'
          : ownerProfile?.type
            ? ownerProfile.type
            : 'OTHER';

      const owner = page.User
        ? {
            userId: page.User.id,
            name: page.User.name ?? null,
            role: page.User.role ?? null,
            type: inferredOwnerType,
            displayName: ownerProfile?.displayName ?? null,
            affiliateCode: ownerProfile?.affiliateCode ?? null,
            branchLabel: ownerProfile?.branchLabel ?? null,
            profileId: ownerProfile?.id ?? null,
          }
        : null;

      const { User, _count, SharedLandingPages, ...rest } = page;

      return {
        ...rest,
        owner,
        sharedLandingCount: _count?.SharedLandingPages ?? 0,
        sharedToManagers: (SharedLandingPages ?? []).map((shared) => ({
          managerProfileId: shared.managerProfileId,
          displayName: shared.ManagerProfile?.displayName ?? null,
          branchLabel: shared.ManagerProfile?.branchLabel ?? null,
          affiliateCode: shared.ManagerProfile?.affiliateCode ?? null,
          category: shared.category ?? '관리자 보너스',
          sharedAt: shared.createdAt.toISOString(),
        })),
      };
    });

    return NextResponse.json({
      ok: true,
      landingPages,
    });
  } catch (error: any) {
    console.error('[Admin Landing Pages] GET error:', error);
    console.error('[Admin Landing Pages] Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        ok: false, 
        error: '랜딩페이지 목록을 불러오는 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST: 새 랜딩페이지 생성
export async function POST(req: NextRequest) {
  try {
    const sid = cookies().get(SESSION_COOKIE)?.value;
    if (!sid) {
      return NextResponse.json({ ok: false, error: '인증이 필요합니다' }, { status: 401 });
    }

    const isAdmin = await checkAdminAuth(sid);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sid },
      select: { userId: true },
    });

    if (!session) {
      return NextResponse.json({ ok: false, error: '세션을 찾을 수 없습니다' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError: any) {
      console.error('[Admin Landing Pages] JSON parse error:', parseError);
      return NextResponse.json(
        { ok: false, error: '요청 데이터를 파싱할 수 없습니다.' },
        { status: 400 }
      );
    }

    console.log('[Admin Landing Pages] Received data:', {
      hasTitle: !!body.title,
      title: body.title?.substring(0, 50),
      hasHtmlContent: !!body.htmlContent,
      htmlContentLength: body.htmlContent?.length || 0,
      infoCollection: body.infoCollection,
      businessInfoType: typeof body.businessInfo,
      businessInfoKeys: body.businessInfo ? Object.keys(body.businessInfo) : null,
      groupId: body.groupId,
      marketingAccountId: body.marketingAccountId,
      marketingFunnelId: body.marketingFunnelId,
    });

    const {
      title,
      exposureTitle,
      category,
      pageGroup,
      description,
      htmlContent,
      headerScript,
      businessInfo,
      exposureImage,
      attachmentFile,
      groupId,
      additionalGroupId,
      checkDuplicateGroup,
      inputLimit,
      completionPageUrl,
      buttonTitle,
      commentEnabled,
      infoCollection,
      scheduledMessageId,
      isPublic = true, // 기본값: 공개
      marketingAccountId,
      marketingFunnelId,
      funnelOrder,
    } = body;

    // businessInfo에서 commentSettings 추출
    let commentSettings = null;
    if (businessInfo && typeof businessInfo === 'object' && 'commentSettings' in businessInfo) {
      commentSettings = businessInfo.commentSettings;
    }

    if (!title || !htmlContent) {
      return NextResponse.json(
        { ok: false, error: '제목과 HTML 내용은 필수입니다' },
        { status: 400 }
      );
    }

    // slug 생성 (제목 기반, 중복 체크)
    let baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    if (!baseSlug) {
      baseSlug = `landing-${Date.now()}`;
    }

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.landingPage.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const now = new Date();
    let landingPage;
    try {
      // businessInfo를 JSON으로 변환 (이미 객체인 경우)
      let businessInfoJson = null;
      if (businessInfo) {
        if (typeof businessInfo === 'string') {
          try {
            businessInfoJson = JSON.parse(businessInfo);
          } catch {
            businessInfoJson = businessInfo;
          }
        } else {
          businessInfoJson = businessInfo;
        }
      }

      console.log('[Admin Landing Pages] Creating landing page with data:', {
        adminId: session.userId,
        title: title?.substring(0, 50),
        slug,
        hasHtmlContent: !!htmlContent,
        htmlContentLength: htmlContent?.length || 0,
        groupId: groupId ? parseInt(String(groupId)) : null,
        marketingAccountId: marketingAccountId || null,
        marketingFunnelId: marketingFunnelId || null,
        businessInfoType: typeof businessInfoJson,
      });

      landingPage = await prisma.landingPage.create({
        data: {
          adminId: session.userId,
          title,
          exposureTitle: exposureTitle || null,
          category: category || null,
          pageGroup: pageGroup || null,
          description: description || null,
          htmlContent,
          headerScript: headerScript || null,
          businessInfo: businessInfoJson,
          exposureImage: exposureImage || null,
          attachmentFile: attachmentFile || null,
          slug,
          isActive: true,
          isPublic: isPublic !== undefined ? isPublic : true,
          marketingAccountId: marketingAccountId ? parseInt(String(marketingAccountId)) : null,
          marketingFunnelId: marketingFunnelId ? parseInt(String(marketingFunnelId)) : null,
          funnelOrder: funnelOrder ? parseInt(String(funnelOrder)) : null,
          groupId: groupId ? parseInt(String(groupId)) : null,
          additionalGroupId: additionalGroupId ? parseInt(String(additionalGroupId)) : null,
          checkDuplicateGroup: checkDuplicateGroup || false,
          inputLimit: inputLimit || '무제한 허용',
          completionPageUrl: completionPageUrl || null,
          buttonTitle: buttonTitle || '신청하기',
          commentEnabled: commentEnabled || false,
          infoCollection: infoCollection || false,
          scheduledMessageId: scheduledMessageId ? parseInt(String(scheduledMessageId)) : null,
          smsNotification: false, // 스키마에 있지만 사용하지 않음
          updatedAt: now, // updatedAt 필수 필드 (스키마에 @updatedAt 데코레이터가 없으므로 수동 설정)
        },
        include: {
          CustomerGroup: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (createError: any) {
      console.error('[Admin Landing Pages] Create database error:', createError);
      console.error('[Admin Landing Pages] Error details:', {
        message: createError?.message,
        code: createError?.code,
        meta: createError?.meta,
        stack: createError?.stack,
        cause: createError?.cause,
        name: createError?.name,
      });
      
      // Prisma 에러인 경우 더 자세한 정보 제공
      let errorMessage = '랜딩페이지 생성에 실패했습니다.';
      if (createError?.code === 'P2002') {
        const target = createError?.meta?.target;
        if (Array.isArray(target) && target.includes('slug')) {
          errorMessage = '이미 존재하는 슬러그입니다.';
        } else {
          errorMessage = '중복된 데이터가 있습니다.';
        }
      } else if (createError?.code === 'P2003') {
        errorMessage = '연결된 데이터를 찾을 수 없습니다. (외래 키 제약 조건 위반)';
      } else if (createError?.code === 'P2011') {
        errorMessage = '필수 필드가 누락되었습니다.';
      } else if (createError?.message) {
        errorMessage = createError.message;
      }
      
      return NextResponse.json(
        { 
          ok: false, 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? {
            message: createError?.message,
            code: createError?.code,
            meta: createError?.meta,
            name: createError?.name,
          } : undefined
        },
        { status: 500 }
      );
    }

    // 댓글 자동 생성은 백그라운드에서 처리 (클라이언트에서 호출)
    // 댓글 생성은 별도 API 엔드포인트에서 처리됩니다

    return NextResponse.json({
      ok: true,
      landingPage,
    });
  } catch (error: any) {
    console.error('[Admin Landing Pages] POST error:', error);
    console.error('[Admin Landing Pages] Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        ok: false, 
        error: '랜딩페이지 생성 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

