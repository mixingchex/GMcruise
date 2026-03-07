import { notFound } from 'next/navigation';

import prisma from '@/lib/prisma';

// [WO-FE-17] 1시간 → 1분으로 단축 (판매중지/판매완료 상품 최대 1분 내 반영)
// 어드민에서 saleStatus 변경 시 revalidatePath('/products/[code]') 호출 권장
export const revalidate = 60;

import ProductDetail from '@/components/mall/ProductDetail';

import AffiliateTracker from '@/components/affiliate/AffiliateTracker';

import { getSession } from '@/lib/session';



interface PageProps {

  params: Promise<{ productCode: string }>;

  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;

}



export default async function ProductDetailPage({ params, searchParams }: PageProps) {

  const { productCode } = await params;

  const resolvedSearchParams = await searchParams;

  // Support multiple URL parameters: 'partner', 'affiliate', 'agent'
  const partnerParam = typeof resolvedSearchParams.partner === 'string' ? resolvedSearchParams.partner : undefined;
  const affiliateParam = typeof resolvedSearchParams.affiliate === 'string' ? resolvedSearchParams.affiliate : undefined;
  const agentParam = typeof resolvedSearchParams.agent === 'string' ? resolvedSearchParams.agent : undefined;

  // partnerId can be mallUserId (partner param) or affiliateCode (affiliate/agent param)
  let partnerId: string | undefined = partnerParam;
  let affiliateCode: string | undefined = affiliateParam || agentParam;

  // If affiliate or agent param is provided, we need to find the mallUserId from affiliateCode
  if ((affiliateParam || agentParam) && !partnerParam) {
    const codeToSearch = affiliateParam || agentParam;
    const affiliateProfile = await prisma.affiliateProfile.findUnique({
      where: { affiliateCode: codeToSearch },
      select: {
        affiliateCode: true,
        User: {
          select: {
            mallUserId: true,
          },
        },
      },
    });

    if (affiliateProfile?.User?.mallUserId) {
      partnerId = affiliateProfile.User.mallUserId;
      affiliateCode = affiliateProfile.affiliateCode;
    }
  }



  // 1. 상품 정보 조회

  const product = await prisma.cruiseProduct.findUnique({

    where: { productCode },

    include: {

      MallProductContent: true,

    },

  });



  if (!product) {

    return notFound();

  }

  // 2. 로그인 유저 확인 (saleStatus 체크보다 먼저 — 관리자 바이패스용)
  const session = await getSession();
  const isAdmin = session?.role === 'admin';

  // 판매중지/준비중/삭제 상품: 관리자만 접근 가능, 일반 유저는 404
  const isNonSaleStatus = ['판매중지', '준비중', '삭제'].includes(product.saleStatus || '');
  if (isNonSaleStatus && !isAdmin) {
    return notFound();
  }
  const isAdminTestMode = isNonSaleStatus && isAdmin;

  let hasUserTrip = false;



  if (session?.userId) {

    const count = await prisma.userTrip.count({

      where: { 

        userId: parseInt(session.userId), 

        productId: product.id 

      }

    });

    hasUserTrip = count > 0;

  }



  // 3. 데이터 직렬화 (Server -> Client 전달 시 필수)

  const serializedProduct = JSON.parse(JSON.stringify(product));



  return (

    <div className="min-h-screen bg-gray-50">

      {/* 관리자 테스트 모드 배너 */}
      {isAdminTestMode && (
        <div className="bg-yellow-400 text-yellow-900 text-center py-2 px-4 font-bold text-sm sticky top-0 z-50">
          🔒 관리자 전용 테스트 상품 — 일반 고객에게 노출되지 않습니다
        </div>
      )}

      {/* 파트너 트래킹 (URL에 파트너 ID가 있을 경우 작동) */}

      {partnerId && <AffiliateTracker mallUserId={partnerId} affiliateCode={affiliateCode} />}



      {/* 상품 상세 UI */}

      <ProductDetail

        product={serializedProduct}

        partnerId={partnerId}

        hasUserTrip={hasUserTrip}

      />

    </div>

  );

}
