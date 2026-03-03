export const dynamic = 'force-dynamic';

// app/api/admin/products/[productCode]/route.ts
// 상품 상세 조회 및 수정 API

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getCountryCode, getKoreanCountryName } from '@/lib/utils/countryMapping';
import { backupProductImages } from '@/lib/google-drive-product-backup';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인 (WO-PROD-04: 세션 만료 체크 추가, WO-PROD-08: 디버그 로그 제거)
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
    console.error('[Admin Products Detail] Auth check error:', error);
    return false;
  }
}

// GET: 상품 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productCode: string }> }
) {
  try {
    const { productCode } = await params;
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const product = await prisma.cruiseProduct.findUnique({
      where: { productCode: productCode },
      select: {
        id: true,
        productCode: true,
        cruiseLine: true,
        shipName: true,
        packageName: true,
        nights: true,
        days: true,
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
        saleStatus: true,
        isUrgent: true,
        isMainProduct: true,
        startDate: true,
        endDate: true,
        itineraryPattern: true,
        createdAt: true,
        updatedAt: true,
        MallProductContent: {
          select: {
            thumbnail: true,
            images: true,
            videos: true,
            layout: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });
    }

    // destination을 itineraryPattern에서 추출하여 응답에 포함
    let destination: string[] | null = null;
    if (product.itineraryPattern) {
      try {
        const pattern = typeof product.itineraryPattern === 'string' 
          ? JSON.parse(product.itineraryPattern) 
          : product.itineraryPattern;
        
        // 객체인 경우 destination 필드 확인
        if (pattern && typeof pattern === 'object' && !Array.isArray(pattern)) {
          if (pattern.destination && Array.isArray(pattern.destination)) {
            destination = pattern.destination;
          }
        }
      } catch (e) {
        console.error('[GET Product] Failed to parse itineraryPattern:', e);
      }
    }

    // MallProductContent를 mallProductContent로 변환 (프론트엔드 호환성)
    const { MallProductContent, ...restProduct } = product;

    // layout에서 destination도 추출
    let layoutDestination: string[] | null = null;
    if (MallProductContent?.layout) {
      try {
        const layout = typeof MallProductContent.layout === 'string'
          ? JSON.parse(MallProductContent.layout)
          : MallProductContent.layout;
        if (layout.destination && Array.isArray(layout.destination)) {
          layoutDestination = layout.destination;
        }
      } catch (e) {
        console.error('[GET Product] Failed to parse layout for destination:', e);
      }
    }

    return NextResponse.json({
      ok: true,
      product: {
        ...restProduct,
        mallProductContent: MallProductContent, // 소문자로 변환
        destination: destination || layoutDestination, // itineraryPattern 또는 layout에서 destination 가져오기
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString()
      }
    });
  } catch (error: any) {
    console.error('[Admin Product Detail API] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT: 상품 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ productCode: string }> }
) {
  try {
    const { productCode: productCodeParam } = await params;
    const cookieStore = await cookies();
    const sid = cookieStore.get(SESSION_COOKIE)?.value;
    const isAdmin = await checkAdminAuth(sid);

    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      productCode: newProductCode,
      cruiseLine,
      shipName,
      packageName,
      nights,
      days,
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
      thumbnail,
      detailBlocks,
      includedItems,
      excludedItems,
      itineraryDays,
      pricingRows,
      departureDate,
      refundPolicy,
      startDate,
      endDate,
      destination,
      itineraryPattern,
      recommendedKeywords,
      flightInfo,
      rating,
      reviewCount,
      hasEscort,
      hasLocalGuide,
      hasCruisedotStaff,
      hasTravelInsurance,
      contactOptions,
    } = body;

    // 상품 코드 변경 처리
    const updateProductCode = newProductCode && newProductCode !== productCodeParam;
    const targetProductCode = updateProductCode ? newProductCode : productCodeParam;

    // 상품 업데이트
    const updateData: any = {
      ...(cruiseLine !== undefined && { cruiseLine }),
      ...(shipName !== undefined && { shipName }),
      ...(packageName !== undefined && { packageName }),
      ...(nights !== undefined && { nights: parseInt(nights) }),
      ...(days !== undefined && { days: parseInt(days) }),
      ...(basePrice !== undefined && { basePrice: basePrice ? parseInt(basePrice) : null }),
      ...(description !== undefined && { description }),
      ...(source !== undefined && { source }),
      ...(category !== undefined && { category: category || null }),
      ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
      ...(isPopular !== undefined && { isPopular }),
      ...(isRecommended !== undefined && { isRecommended }),
      ...(isPremium !== undefined && { isPremium }),
      ...(isGeniePack !== undefined && { isGeniePack }),
      ...(isDomestic !== undefined && { isDomestic }),
      ...(isJapan !== undefined && { isJapan }),
      ...(isBudget !== undefined && { isBudget }),
      ...(isUrgent !== undefined && { isUrgent }),
      ...(isMainProduct !== undefined && { isMainProduct }),
      ...(saleStatus !== undefined && { saleStatus }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    };

    // itineraryPattern 처리
    if (itineraryPattern !== undefined) {
      // itineraryPattern이 직접 전달된 경우
      updateData.itineraryPattern = itineraryPattern;
    } else if (destination !== undefined && Array.isArray(destination)) {
      // destination이 전달된 경우 - itineraryPattern에 destination 저장 및 각 day에 국가 코드 할당
      const currentProduct = await prisma.cruiseProduct.findUnique({
        where: { productCode: productCodeParam },
        select: { itineraryPattern: true },
      });
      
      const currentPattern = currentProduct?.itineraryPattern || [];
      let patternObj: any;
      
      try {
        patternObj = typeof currentPattern === 'string' ? JSON.parse(currentPattern) : currentPattern;
      } catch (e) {
        patternObj = Array.isArray(currentPattern) ? currentPattern : {};
      }
      
      // destination의 한국어 이름을 국가 코드로 변환
      const selectedCountryCodes = destination
        .map((dest: string) => {
          // "스페인 (Spain)" 형식에서 한국어 이름만 추출
          const koreanName = dest.split(' (')[0].trim();
          return getCountryCode(koreanName);
        })
        .filter((code): code is string => code !== null && code !== 'KR');
      
      console.log('[Product Update] Selected countries:', {
        destination,
        selectedCountryCodes,
      });
      
      // itineraryPattern의 각 day에 국가 코드 할당
      let daysArray: any[] = [];
      if (Array.isArray(patternObj)) {
        daysArray = patternObj;
      } else if (patternObj.days && Array.isArray(patternObj.days)) {
        daysArray = patternObj.days;
      }
      
      // PortVisit 타입 일정에 순서대로 국가 코드 할당
      const portVisitDays = daysArray.filter((day: any) => day.type === 'PortVisit');
      portVisitDays.forEach((day: any, index: number) => {
        if (selectedCountryCodes[index]) {
          day.country = selectedCountryCodes[index];
        }
      });
      
      // Embarkation/Disembarkation 일정에도 첫 번째 국가 코드 할당 (country가 없는 경우)
      daysArray.forEach((day: any) => {
        if ((day.type === 'Embarkation' || day.type === 'Disembarkation') && !day.country && selectedCountryCodes[0]) {
          day.country = selectedCountryCodes[0];
        }
      });
      
      // destination을 itineraryPattern에 저장
      if (Array.isArray(patternObj)) {
        // 배열인 경우 객체로 변환
        updateData.itineraryPattern = {
          destination: destination,
          days: daysArray
        };
      } else {
        // 객체인 경우 destination 추가/업데이트
        updateData.itineraryPattern = {
          ...patternObj,
          destination: destination,
          days: daysArray
        };
      }
      
      console.log('[Product Update] Updated itineraryPattern:', {
        destination,
        daysCount: daysArray.length,
        portVisitCount: portVisitDays.length,
        selectedCountryCodes,
      });
    }

    // itineraryDays에서 기항지 정보를 itineraryPattern에 동기화 (크루즈 가이드 지니 연동용)
    if (itineraryDays !== undefined && Array.isArray(itineraryDays) && itineraryDays.length > 0) {
      console.log('[Product Update] itineraryDays에서 itineraryPattern 동기화 시작:', itineraryDays.length, '일');

      // 현재 itineraryPattern 가져오기
      const currentProduct = await prisma.cruiseProduct.findUnique({
        where: { productCode: productCodeParam },
        select: { itineraryPattern: true },
      });

      let currentPattern: any[] = [];
      try {
        const raw = currentProduct?.itineraryPattern;
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          currentPattern = Array.isArray(parsed) ? parsed : (parsed.days || []);
        }
      } catch (e) {
        currentPattern = [];
      }

      // itineraryDays 정보를 itineraryPattern에 반영
      const updatedPattern = itineraryDays.map((dayInfo: any, index: number) => {
        const existingDay = currentPattern.find((d: any) => d.day === dayInfo.day) || {};

        // 기항지 타입 결정 (BUG-05: 해상 여부 먼저 체크, 1일차 강제 지정 제거)
        let type: string;
        if (!dayInfo.arrivalLocation || dayInfo.arrivalLocation === '해상') {
          type = 'sea';
        } else {
          type = dayInfo.dayType || existingDay.type || 'PortVisit';
        }

        return {
          ...existingDay,
          day: dayInfo.day,
          type,
          location: dayInfo.arrivalLocation || existingDay.location || null,
          country: dayInfo.arrivalCountry || existingDay.country || null,
          currency: dayInfo.currency ?? existingDay.currency ?? null,
          language: dayInfo.language ?? existingDay.language ?? null,
          arrival: dayInfo.portArrivalTime || existingDay.arrival || null,
          departure: dayInfo.portDepartureTime || existingDay.departure || null,
        };
      });

      updateData.itineraryPattern = updatedPattern;

      console.log('[Product Update] itineraryPattern 동기화 완료:', {
        days: updatedPattern.length,
        sample: updatedPattern.slice(0, 3).map((d: any) => ({
          day: d.day,
          type: d.type,
          location: d.location,
          country: d.country,
          arrival: d.arrival,
        })),
      });
    }

    // 최종 데이터 정리: 허용된 필드만 포함
    const allowedFields = [
      'cruiseLine', 'shipName', 'packageName', 'nights', 'days', 
      'basePrice', 'description', 'source', 'category', 'tags',
      'isPopular', 'isRecommended', 'isPremium', 'isGeniePack', 'isDomestic', 'isJapan', 'isBudget', 'isUrgent', 'isMainProduct', 
    ];
    
    // 명시적으로 각 필드를 설정하여 recommendedKeywords가 절대 포함되지 않도록
    const finalUpdateData: any = {};
    
    if ('cruiseLine' in updateData && updateData.cruiseLine !== undefined) {
      finalUpdateData.cruiseLine = updateData.cruiseLine;
    }
    if ('shipName' in updateData && updateData.shipName !== undefined) {
      finalUpdateData.shipName = updateData.shipName;
    }
    if ('packageName' in updateData && updateData.packageName !== undefined) {
      finalUpdateData.packageName = updateData.packageName;
    }
    if ('nights' in updateData && updateData.nights !== undefined) {
      finalUpdateData.nights = updateData.nights;
    }
    if ('days' in updateData && updateData.days !== undefined) {
      finalUpdateData.days = updateData.days;
    }
    if ('basePrice' in updateData && updateData.basePrice !== undefined) {
      finalUpdateData.basePrice = updateData.basePrice;
    }
    if ('description' in updateData && updateData.description !== undefined) {
      finalUpdateData.description = updateData.description;
    }
    if ('source' in updateData && updateData.source !== undefined) {
      finalUpdateData.source = updateData.source;
    }
    if ('category' in updateData && updateData.category !== undefined) {
      finalUpdateData.category = updateData.category;
    }
    if ('tags' in updateData && updateData.tags !== undefined) {
      finalUpdateData.tags = updateData.tags;
    }
    if ('isPopular' in updateData && updateData.isPopular !== undefined) {
      finalUpdateData.isPopular = updateData.isPopular;
    }
    if ('isRecommended' in updateData && updateData.isRecommended !== undefined) {
      finalUpdateData.isRecommended = updateData.isRecommended;
    }
    if ('isPremium' in updateData && updateData.isPremium !== undefined) {
      finalUpdateData.isPremium = updateData.isPremium;
    }
    if ('isGeniePack' in updateData && updateData.isGeniePack !== undefined) {
      finalUpdateData.isGeniePack = updateData.isGeniePack;
    }
    if ('isDomestic' in updateData && updateData.isDomestic !== undefined) {
      finalUpdateData.isDomestic = updateData.isDomestic;
    }
    if ('isJapan' in updateData && updateData.isJapan !== undefined) {
      finalUpdateData.isJapan = updateData.isJapan;
    }
    if ('isBudget' in updateData && updateData.isBudget !== undefined) {
      finalUpdateData.isBudget = updateData.isBudget;
    }
    if ('isUrgent' in updateData && updateData.isUrgent !== undefined) {
      finalUpdateData.isUrgent = updateData.isUrgent;
    }
    if ('isMainProduct' in updateData && updateData.isMainProduct !== undefined) {
      finalUpdateData.isMainProduct = updateData.isMainProduct;
    }
    if ('saleStatus' in updateData && updateData.saleStatus !== undefined) {
      finalUpdateData.saleStatus = updateData.saleStatus;
    }
    if ('startDate' in updateData && updateData.startDate !== undefined) {
      finalUpdateData.startDate = updateData.startDate;
    }
    if ('endDate' in updateData && updateData.endDate !== undefined) {
      finalUpdateData.endDate = updateData.endDate;
    }
    if ('itineraryPattern' in updateData && updateData.itineraryPattern !== undefined) {
      finalUpdateData.itineraryPattern = updateData.itineraryPattern;
    }

    // 디버깅: finalUpdateData 확인
    console.log('[Product Update] finalUpdateData keys:', Object.keys(finalUpdateData));

    // 상품 코드 변경 시 기존 layout 데이터 보존을 위해 미리 조회
    // (CruiseProduct 삭제 → cascade로 MallProductContent 소실 방지)
    const contentToPreserve = updateProductCode
      ? await prisma.mallProductContent.findUnique({ where: { productCode: productCodeParam } })
      : null;

    // 상품 코드 변경 시
    if (updateProductCode) {
      // 기존 상품 삭제 후 새 코드로 생성 — $transaction으로 원자성 보장 (삭제 성공/생성 실패 시 롤백)
      await prisma.$transaction(async (tx) => {
        await tx.cruiseProduct.delete({
          where: { productCode: productCodeParam }
        });

        await tx.cruiseProduct.create({
          data: {
            productCode: targetProductCode,
            ...finalUpdateData
          }
        });
      });
    } else {
      // 상품 업데이트
      await prisma.cruiseProduct.update({
        where: { productCode: productCodeParam },
        data: finalUpdateData
      });
    }

    const product = await prisma.cruiseProduct.findUnique({
      where: { productCode: targetProductCode }
    });

    // saleStatus가 '판매중'일 때 AffiliateProduct 미존재 시 자동 생성
    if (saleStatus === '판매중') {
      if (!product?.id) {
        console.error(`[Product Update] AffiliateProduct 자동 생성 스킵 — product.id 없음: ${targetProductCode}`);
      } else {
      const now = new Date();
      const existingAffiliate = await prisma.affiliateProduct.findFirst({
        where: {
          productCode: targetProductCode,
          OR: [
            { effectiveTo: null },          // 만료 없는 버전
            { effectiveTo: { gt: now } },   // 아직 유효한 버전
          ],
        },
      });
      if (!existingAffiliate) {
        try {
          await prisma.affiliateProduct.create({
            data: {
              productCode: targetProductCode,
              cruiseProductId: product.id,
              title: (packageName || product.packageName || targetProductCode),
              status: 'active',
              currency: 'KRW',
              defaultSaleAmount: null,
              defaultCostAmount: null,
              defaultNetRevenue: null,
              metadata: null,
              isPublished: true,
              publishedAt: now,
              effectiveFrom: now,
              effectiveTo: null,
              updatedAt: now,
            },
          });
          console.log(`[Product Update] AffiliateProduct 자동 생성: ${targetProductCode}`);
        } catch (affiliateError: unknown) {
          // P2002: unique 제약 위반 (effectiveFrom 동일 시각 중복) — 이미 존재하면 무시
          const errMsg = affiliateError instanceof Error ? affiliateError.message : String(affiliateError);
          if (errMsg.includes('P2002')) {
            console.log(`[Product Update] AffiliateProduct 이미 존재 (unique 충돌 무시): ${targetProductCode}`);
          } else {
            console.error(`[Product Update] AffiliateProduct 자동 생성 실패: ${targetProductCode}`, errMsg);
          }
        }
      }
      } // end else (product.id exists)
    }

    // MallProductContent 업데이트 또는 생성
    // 상품 코드 변경 시: contentToPreserve(이전 코드의 content)를 기반으로 layout 보존
    const existingContent = contentToPreserve
      ?? await prisma.mallProductContent.findUnique({ where: { productCode: targetProductCode } });

    const layoutData = existingContent?.layout
      ? (typeof existingContent.layout === 'string'
          ? JSON.parse(existingContent.layout)
          : existingContent.layout)
      : {};

    // 상세페이지 블록 업데이트
    if (detailBlocks !== undefined) {
      layoutData.blocks = Array.isArray(detailBlocks) ? detailBlocks : [];
    }

    // 포함/불포함 사항 업데이트
    if (includedItems !== undefined) {
      layoutData.included = Array.isArray(includedItems) ? includedItems : [];
    }
    if (excludedItems !== undefined) {
      layoutData.excluded = Array.isArray(excludedItems) ? excludedItems : [];
    }

    // 여행일정 업데이트
    if (itineraryDays !== undefined) {
      layoutData.itinerary = Array.isArray(itineraryDays) ? itineraryDays : [];
    }

    // 요금표 업데이트
    if (pricingRows !== undefined) {
      layoutData.pricing = Array.isArray(pricingRows) ? pricingRows : [];
    }
    if (departureDate !== undefined) {
      layoutData.departureDate = departureDate || '';
    }

    // 환불/취소 규정 업데이트
    if (refundPolicy !== undefined) {
      layoutData.refundPolicy = refundPolicy || '';
    }

    // 추천 키워드 업데이트
    if (recommendedKeywords !== undefined) {
      layoutData.recommendedKeywords = Array.isArray(recommendedKeywords) ? recommendedKeywords : [];
    }

    // 항공 정보 업데이트
    if (flightInfo !== undefined) {
      layoutData.flightInfo = flightInfo || null;
    }

    // 별점 및 리뷰 개수 업데이트
    if (rating !== undefined) {
      layoutData.rating = rating || 4.4;
    }
    if (reviewCount !== undefined) {
      layoutData.reviewCount = reviewCount || 0;
    }
    
    // 서비스 옵션 업데이트
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

    // 문의 옵션 업데이트
    if (contactOptions !== undefined) {
      layoutData.contactOptions = contactOptions;
    }

    // 방문국가(destination) 업데이트 - layout에도 저장하여 로드 시 사용
    if (destination !== undefined && Array.isArray(destination)) {
      layoutData.destination = destination;
    }

    // 구글 드라이브에 이미지 백업 (로컬 이미지만)
    let finalThumbnail = thumbnail;
    let finalDetailBlocks = layoutData.blocks || [];
    let finalItineraryDays = layoutData.itinerary || [];
    
    try {
      const backupResult = await backupProductImages(
        targetProductCode,
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
      }
      if (itineraryDays !== undefined && backupResult.itineraryDays) {
        layoutData.itinerary = finalItineraryDays;
      }
    } catch (error: any) {
      console.error('[Product Update] Error backing up images to Google Drive:', error);
      // 백업 실패해도 계속 진행 (원본 URL 유지)
    }

    try {
      await prisma.mallProductContent.upsert({
        where: { productCode: targetProductCode },
        update: {
          thumbnail: finalThumbnail !== undefined ? finalThumbnail : undefined,
          layout: layoutData,
          updatedAt: new Date()
        },
        create: {
          productCode: targetProductCode,
          thumbnail: finalThumbnail || null,
          layout: layoutData,
          isActive: true,
          updatedAt: new Date()
        }
      });
    } catch (upsertError: unknown) {
      const errMsg = upsertError instanceof Error ? upsertError.message : String(upsertError);
      console.error('[Product Update] MallProductContent 저장 실패:', {
        productCode: targetProductCode,
        error: errMsg,
      });
      // 에러를 다시 throw하여 500 응답 반환 (기존 동작 유지)
      throw upsertError;
    }

    // 상세 페이지 캐시 무효화 (썸네일/이미지 변경 즉시 반영)
    try {
      revalidatePath(`/products/${targetProductCode}`);
      revalidatePath(`/partner`, 'layout'); // 파트너 페이지 전체 레이아웃
    } catch {
      // revalidatePath 실패해도 저장은 성공
    }

    return NextResponse.json({
      ok: true,
      product,
      message: '상품이 업데이트되었습니다.'
    });
  } catch (error: any) {
    console.error('[Admin Product Update API] Error:', error);
    console.error('[Admin Product Update API] Error details:', error.message);
    console.error('[Admin Product Update API] Error stack:', error.stack);
    return NextResponse.json(
      { 
        ok: false, 
        error: error.message || 'Failed to update product',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
