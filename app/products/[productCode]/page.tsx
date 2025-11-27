import { notFound } from 'next/navigation';

import prisma from '@/lib/prisma';

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

  const partnerId = typeof resolvedSearchParams.partner === 'string' ? resolvedSearchParams.partner : undefined;



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



  // 2. 로그인 유저 확인 및 예약 여부 체크 (UserTrip 사용)

  const session = await getSession();

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

      {/* 파트너 트래킹 (URL에 파트너 ID가 있을 경우 작동) */}

      {partnerId && <AffiliateTracker mallUserId={partnerId} />}



      {/* 상품 상세 UI */}

      <ProductDetail 

        product={serializedProduct} 

        partnerId={partnerId}

        hasUserTrip={hasUserTrip} 

      />

    </div>

  );

}
