export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { backupProductImages } from '@/lib/google-drive-product-backup';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인 (WO-PROD-04: 세션 만료 체크 추가)
async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  if (!sid) return false;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { role: true },
        },
      },
    });

    if (!session || !session.User) return false;
    if (session.expiresAt && session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: sid } }).catch(() => {});
      return false;
    }
    return session.User.role === 'admin';
  } catch (error) {
    console.error('[Admin Products] Auth check error:', error);
    return false;
  }
}

/**
 * GET /api/admin/products
 * 크루즈 상품 목록 조회 (관리자 전용)
 */
export async function GET(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 });
    }

    const products = await prisma.cruiseProduct.findMany({
      select: {
        id: true,
        productCode: true,
        cruiseLine: true,
        shipName: true,
        packageName: true,
        nights: true,
        days: true,
        itineraryPattern: true,
        basePrice: true,
        description: true,
        source: true,
        category: true,
        tags: true,
        isPopular: true,
        isRecommended: true,
        isPremium: true,
        isGeniePack: true,
        isDomestic: true,
        isJapan: true,
        isBudget: true,
        isUrgent: true,
        isMainProduct: true,
        saleStatus: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        MallProductContent: {
          select: {
            layout: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ ok: true, products });
  } catch (error) {
    console.error('[GET /api/admin/products] Error:', error);
    return NextResponse.json(
      { ok: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/products
 * 새 크루즈 상품 등록
 * 
 * 주의: 이 API는 상품만 생성하며, 랜딩페이지는 자동으로 생성하지 않습니다.
 * 랜딩페이지가 필요한 경우:
 * 1. 별도로 랜딩페이지를 생성하세요 (/api/admin/landing-pages 또는 /api/partner/landing-pages)
 * 2. 어필리에이트 링크를 생성할 때 metadata.landingPageId로 상품과 연결하세요
 */
export async function POST(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 });
    }

    const {
      productCode,
      cruiseLine,
      shipName,
      packageName,
      nights,
      days,
      itineraryPattern,
      basePrice,
      description,
      source,
      category,
      tags,
      isPopular,
      isRecommended,
      isPremium,
      isGeniePack,
      isDomestic,
      isJapan,
      isBudget,
      isUrgent,
      isMainProduct,
      saleStatus,
      startDate,
      endDate,
      destination,
      recommendedKeywords,
      thumbnail,
      detailBlocks,
      includedItems,
      excludedItems,
      itineraryDays,
      pricingRows,
      departureDate,
      refundPolicy,
      flightInfo,
      rating,
      reviewCount,
      hasEscort,
      hasLocalGuide,
      hasCruisedotStaff,
      hasTravelInsurance,
      contactOptions, // 8번: 문의 옵션 (결제하기, 전화상담, 크루즈닷AI 채팅봇)
    } = await req.json();

    // 필수 필드 검증
    if (!productCode || !cruiseLine || !shipName || !packageName) {
      return NextResponse.json(
        { ok: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // itineraryPattern 검증 및 정규화
    let normalizedItineraryPattern: any[] = [];
    if (Array.isArray(itineraryPattern) && itineraryPattern.length > 0) {
      // 배열인 경우 그대로 사용 (모든 필드 포함: day, type, location, country, currency, language, arrival, departure, time 등)
      normalizedItineraryPattern = itineraryPattern.map((day: any) => ({
        day: day.day || 0,
        type: day.type || 'PortVisit',
        location: day.location || null,
        country: day.country || null,
        currency: day.currency || null,
        language: day.language || null,
        arrival: day.arrival || null,
        departure: day.departure || null,
        time: day.time || null,
      }));
    } else if (itineraryPattern && typeof itineraryPattern === 'object') {
      // 객체인 경우 배열로 변환
      normalizedItineraryPattern = [itineraryPattern];
    }

    // 상품 생성
    const product = await prisma.cruiseProduct.create({
      data: {
        productCode,
        cruiseLine,
        shipName,
        packageName,
        nights: nights || 0,
        days: days || 0,
        itineraryPattern: normalizedItineraryPattern, // 정규화된 itineraryPattern 저장
        basePrice: basePrice || null,
        description: description || null,
        source: source || 'manual',
        category: category || null,
        tags: Array.isArray(tags) ? tags : [],
        isPopular: isPopular || false,
        isRecommended: isRecommended || false,
        isPremium: isPremium || false,
        isGeniePack: isGeniePack || false,
        isDomestic: isDomestic || false,
        isJapan: isJapan || false,
        isBudget: isBudget || false,
        isUrgent: isUrgent || false, // 긴급 상품 여부 추가
        isMainProduct: isMainProduct || false, // 주력 상품 여부 추가
        // 수동 등록 상품은 항상 판매중으로 설정
        saleStatus: (source === 'manual' || !saleStatus) ? '판매중' : saleStatus,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        updatedAt: new Date(), // updatedAt 필드 추가
      },
    });

    // MallProductContent 생성 (추천 키워드 및 기타 메타데이터 저장)
    const layoutData: any = {};
    
    if (recommendedKeywords !== undefined) {
      layoutData.recommendedKeywords = Array.isArray(recommendedKeywords) ? recommendedKeywords : [];
    }
    
    if (thumbnail !== undefined) {
      layoutData.thumbnail = thumbnail || null;
    }
    
    if (detailBlocks !== undefined) {
      layoutData.blocks = detailBlocks || [];
    }
    
    if (includedItems !== undefined) {
      layoutData.included = includedItems || [];
    }
    
    if (excludedItems !== undefined) {
      layoutData.excluded = excludedItems || [];
    }
    
    if (itineraryDays !== undefined) {
      layoutData.itinerary = itineraryDays || [];
    }
    
    if (pricingRows !== undefined) {
      layoutData.pricing = pricingRows || [];
    }
    
    if (departureDate !== undefined) {
      layoutData.departureDate = departureDate || null;
    }
    
    if (refundPolicy !== undefined) {
      layoutData.refundPolicy = refundPolicy || '';
    }
    
    if (flightInfo !== undefined) {
      layoutData.flightInfo = flightInfo || null;
    }
    
    if (rating !== undefined) {
      layoutData.rating = rating || 4.4;
    }
    
    if (reviewCount !== undefined) {
      layoutData.reviewCount = reviewCount || 0;
    }
    
    if (hasEscort !== undefined) {
      layoutData.hasEscort = hasEscort || false;
    }
    
    if (hasLocalGuide !== undefined) {
      layoutData.hasLocalGuide = hasLocalGuide || false;
    }
    
    if (hasCruisedotStaff !== undefined) {
      layoutData.hasCruisedotStaff = hasCruisedotStaff || false;
    }
    
    if (hasTravelInsurance !== undefined) {
      layoutData.hasTravelInsurance = hasTravelInsurance || false;
    }

    // 8번: 문의 옵션 저장
    if (contactOptions !== undefined) {
      layoutData.contactOptions = contactOptions;
    }

    // destination이 있으면 layout에 저장
    if (destination !== undefined && Array.isArray(destination)) {
      layoutData.destination = destination;
    }

    // 구글 드라이브에 이미지 백업 (로컬 이미지만)
    let finalThumbnail = thumbnail;
    let finalDetailBlocks = layoutData.blocks || [];
    let finalItineraryDays = layoutData.itinerary || [];
    
    try {
      const backupResult = await backupProductImages(
        productCode,
        thumbnail,
        detailBlocks !== undefined ? detailBlocks : layoutData.blocks,
        itineraryDays !== undefined ? itineraryDays : layoutData.itinerary
      );
      
      finalThumbnail = backupResult.thumbnail;
      finalDetailBlocks = backupResult.detailBlocks;
      if (backupResult.itineraryDays) {
        finalItineraryDays = backupResult.itineraryDays;
      }
      
      // 백업된 블록을 layoutData에 반영
      if (detailBlocks !== undefined) {
        layoutData.blocks = finalDetailBlocks;
      } else if (layoutData.blocks) {
        layoutData.blocks = finalDetailBlocks;
      }
      
      if (itineraryDays !== undefined && backupResult.itineraryDays) {
        layoutData.itinerary = finalItineraryDays;
      } else if (layoutData.itinerary && backupResult.itineraryDays) {
        layoutData.itinerary = finalItineraryDays;
      }
      
      // 썸네일도 업데이트
      if (finalThumbnail) {
        layoutData.thumbnail = finalThumbnail;
      }
    } catch (error: any) {
      console.error('[Product Create] Error backing up images to Google Drive:', error);
      // 백업 실패해도 계속 진행 (원본 URL 유지)
    }

    // MallProductContent 생성 또는 업데이트
    if (Object.keys(layoutData).length > 0) {
      const now = new Date();
      await prisma.mallProductContent.upsert({
        where: { productCode },
        update: {
          layout: layoutData,
          updatedAt: now,
        },
        create: {
          productCode,
          layout: layoutData,
          isActive: true,
          updatedAt: now,
        },
      });
    }

    return NextResponse.json({ ok: true, product });
  } catch (error) {
    console.error('POST /api/admin/products error:', error);
    return NextResponse.json({ ok: false, message: 'Server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/products/[id]
 * 크루즈 상품 수정
 */
export async function PUT(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 });
    }

    // [WO-PROD-05] Mass Assignment 방지 — 화이트리스트 필드만 명시적 추출
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ ok: false, message: 'Product ID required' }, { status: 400 });
    }

    const {
      cruiseLine, shipName, packageName, nights, days, itineraryPattern,
      basePrice, description, source, category, tags,
      isPopular, isRecommended, isPremium, isGeniePack,
      isDomestic, isJapan, isBudget, isUrgent, isMainProduct,
      saleStatus, startDate, endDate,
    } = body;

    const processedData: Record<string, unknown> = {};
    if (cruiseLine !== undefined) processedData.cruiseLine = cruiseLine;
    if (shipName !== undefined) processedData.shipName = shipName;
    if (packageName !== undefined) processedData.packageName = packageName;
    if (nights !== undefined) processedData.nights = nights;
    if (days !== undefined) processedData.days = days;
    if (basePrice !== undefined) processedData.basePrice = basePrice;
    if (description !== undefined) processedData.description = description;
    if (source !== undefined) processedData.source = source;
    if (category !== undefined) processedData.category = category;
    if (tags !== undefined) processedData.tags = tags;
    if (isPopular !== undefined) processedData.isPopular = isPopular;
    if (isRecommended !== undefined) processedData.isRecommended = isRecommended;
    if (isPremium !== undefined) processedData.isPremium = isPremium;
    if (isGeniePack !== undefined) processedData.isGeniePack = isGeniePack;
    if (isDomestic !== undefined) processedData.isDomestic = isDomestic;
    if (isJapan !== undefined) processedData.isJapan = isJapan;
    if (isBudget !== undefined) processedData.isBudget = isBudget;
    if (isUrgent !== undefined) processedData.isUrgent = isUrgent;
    if (isMainProduct !== undefined) processedData.isMainProduct = isMainProduct;
    if (saleStatus !== undefined) processedData.saleStatus = saleStatus;
    if (itineraryPattern !== undefined) processedData.itineraryPattern = itineraryPattern;
    if (startDate !== undefined) processedData.startDate = startDate;
    if (endDate !== undefined) processedData.endDate = endDate;

    // itineraryPattern 검증 및 정규화
    if (processedData.itineraryPattern !== undefined) {
      if (Array.isArray(processedData.itineraryPattern) && processedData.itineraryPattern.length > 0) {
        // 배열인 경우 모든 필드를 정규화하여 저장
        processedData.itineraryPattern = processedData.itineraryPattern.map((day: any) => ({
          day: day.day || 0,
          type: day.type || 'PortVisit',
          location: day.location || null,
          country: day.country || null,
          currency: day.currency || null,
          language: day.language || null,
          arrival: day.arrival || null,
          departure: day.departure || null,
          time: day.time || null,
        }));
      } else if (processedData.itineraryPattern && typeof processedData.itineraryPattern === 'object') {
        // 객체인 경우 배열로 변환
        processedData.itineraryPattern = [processedData.itineraryPattern];
      } else {
        // 빈 배열 또는 null인 경우 빈 배열로 설정
        processedData.itineraryPattern = [];
      }
    }
    
    if (processedData.startDate) {
      processedData.startDate = new Date(processedData.startDate as string | number);
    } else if (processedData.startDate === '') {
      processedData.startDate = null;
    }
    if (processedData.endDate) {
      processedData.endDate = new Date(processedData.endDate as string | number);
    } else if (processedData.endDate === '') {
      processedData.endDate = null;
    }
    
    // updatedAt 필드 자동 업데이트
    processedData.updatedAt = new Date();

    const product = await prisma.cruiseProduct.update({
      where: { id: parseInt(id) },
      data: processedData,
      select: {
        id: true,
        productCode: true,
        cruiseLine: true,
        shipName: true,
        packageName: true,
        nights: true,
        days: true,
        itineraryPattern: true,
        basePrice: true,
        description: true,
        source: true,
        category: true,
        tags: true,
        isPopular: true,
        isRecommended: true,
        isUrgent: true,
        isMainProduct: true,
        saleStatus: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 판매 상태가 변경된 경우 공개 상품 API 캐시 즉시 무효화
    try {
      revalidatePath('/api/public/products');
      revalidatePath('/', 'layout');
    } catch {
      // revalidatePath 실패해도 저장은 성공
    }

    return NextResponse.json({ ok: true, product });
  } catch (error: any) {
    console.error('PUT /api/admin/products error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: 'Server error',
        ...(process.env.NODE_ENV !== 'production' && { error: error.message || String(error) }),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/products
 * 크루즈 상품 삭제
 */
export async function DELETE(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: 'Admin access required' }, { status: 403 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ ok: false, message: 'Product ID required' }, { status: 400 });
    }

    // 삭제 전 상품 정보 확인
    const product = await prisma.cruiseProduct.findUnique({
      where: { id: parseInt(id) },
      select: { productCode: true, packageName: true },
    });

    if (!product) {
      return NextResponse.json({ ok: false, message: 'Product not found' }, { status: 404 });
    }

    // 보호된 테스트 상품은 삭제 불가
    const PROTECTED_PRODUCT_CODES = ['SAMPLE-MED-001', 'REAL-CRUISE-01'];
    if (PROTECTED_PRODUCT_CODES.includes(product.productCode)) {
      return NextResponse.json({
        ok: false,
        message: `테스트 상품 "${product.packageName}"은(는) 삭제할 수 없습니다. (시스템 테스트용 보호 상품)`,
      }, { status: 403 });
    }

    await prisma.cruiseProduct.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ ok: true, message: 'Product deleted' });
  } catch (error) {
    console.error('DELETE /api/admin/products error:', error);
    return NextResponse.json({ ok: false, message: 'Server error' }, { status: 500 });
  }
}
