export const dynamic = 'force-dynamic';

// app/api/chat-bot/question/[id]/route.ts
// 특정 질문 로드

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getProductDestinationImages, getCruiseReviewImages, getRoomImages } from '@/lib/cruise-images';

// 문제 영상 맵핑 (order 7-13)
const PROBLEM_VIDEOS = [
  {
    title: '왜 부산 출발하는 크루즈가 없나요?',
    url: 'https://youtube.com/shorts/E0iLWnqjGfA?si=zUyU05vlIeYYSdNl',
    description: '부산 출발 크루즈에 대한 궁금증을 해결해보세요!',
  },
  {
    title: '실제 크루즈 크기는 어떨까?',
    url: 'https://youtu.be/ZAsw4sv5HZk?si=0-_A5YB0BfO4B-QF',
    description: '크루즈의 실제 크기와 규모를 확인해보세요!',
  },
  {
    title: '크루즈 여행 무료는 뭐고 유료는 뭐에요?',
    url: 'https://youtu.be/IKPCY9G0Uc4?si=Zs8_oUMNJ_hpYeV9',
    description: '크루즈 여행에서 무엇이 무료이고 무엇이 유료인지 궁금하시죠?',
  },
  {
    title: '크루즈 여행 처음이라구요? 안내를 받아야 하는 이유',
    url: 'https://youtu.be/DaKs6uK6IQM?si=yCAIy_ML3UqfZi7S',
    description: '처음 크루즈 여행을 가시는 분들을 위한 필수 안내!',
  },
  {
    title: '크루즈 자유여행 시작하면 맞이하는 현실',
    url: 'https://youtu.be/pDxwnanm3C4?si=Q8PRfcP-3DknHbiL',
    description: '자유여행으로 가면 어떤 현실을 맞이하게 될까요?',
  },
  {
    title: '크루즈 자유여행 터미널에 가면?',
    url: 'https://youtu.be/Gv7b6pVKt38?si=wf0-hjS8TN-vZgGf',
    description: '터미널에서 겪게 되는 현실적인 문제들',
  },
  {
    title: '크루즈 탑승 이렇게 하면 못타요',
    url: 'https://youtu.be/JURxMno7mME?si=BRJqibDqWTqQ8mNl',
    description: '탑승 전 꼭 알아야 할 주의사항들',
  },
  {
    title: '크루즈 터미널 초행길이라면 꼭 체크해야 할 꿀 팁',
    url: 'https://youtu.be/CSZy5MSUfx8?si=AjcILCQOhjuq7V0b',
    description: '터미널에서 놓치면 안 되는 중요한 팁들',
  },
];

// 해결책 영상 맵핑 (order 14-18)
const SOLUTION_VIDEOS = [
  {
    title: '크루즈 여행이 가성비 BEST인 이유',
    url: 'https://youtube.com/shorts/3SUQvs4qtXo?si=opMh0myd021J5EGH',
    description: '크루즈 여행이 왜 가성비 최고인지 확인해보세요!',
  },
  {
    title: '크루즈를 확실히 가성비 갑으로 가는법',
    url: 'https://youtube.com/shorts/5WvjUNk71a8?si=rm9yvIuoHbrTJhbC',
    description: '100만원 이상의 가성비를 아낄 수 있는 확실한 방법을 알려드려요!',
  },
  {
    title: '피해 없이 비행기 가성비 아끼면서 예약하는 방법 꿀팁',
    url: 'https://youtu.be/EnKJo9Ax6ys?si=9xuuCngwAkPPki_Q',
    description: '100만원 이상의 가성비를 아낄 수 있는 방법을 알려드려요!',
  },
  {
    title: '크루즈닷AI와 걱정없이 가는 방법',
    url: 'https://youtu.be/-p_6G69MgyQ?si=L8m9s-aN-kIzDMKy',
    description: '크루즈닷AI와 함께하면 모든 걱정이 사라져요!',
  },
  {
    title: '크루즈닷이 그래서 함께 한다면?',
    url: 'https://youtu.be/acYl4x4E6uw?si=F2L2SHXKy56mluZu',
    description: '크루즈닷과 함께하면 어떤 특별한 경험을 할 수 있을까요?',
  },
  {
    title: 'APEC 정상회담 숙소에 썼던 크루즈도 크루즈닷이?',
    url: 'https://youtu.be/QkC4Ymf7CR8?si=tgSkikI8DLrCf_Zu',
    description: '신뢰할 수 있는 크루즈닷의 실력과 경험',
  },
  {
    title: '행복하게 놀생각만 하세요',
    url: 'https://youtu.be/i7Btan_R09Q?si=51iRsYt_V57y7va6',
    description: '크루즈닷과 함께하면 모든 준비는 저희가 해드려요!',
  },
];

// 크루즈 선사별 유튜브 영상 링크 (기본값, 폴백용)
const CRUISE_LINE_VIDEOS: Record<string, string> = {
  '코스타': 'https://youtu.be/Y0aaA9SfvlU?si=6ZkJozqYRPF8C5Vl',
  'COSTA': 'https://youtu.be/Y0aaA9SfvlU?si=6ZkJozqYRPF8C5Vl',
  'MSC': 'https://youtu.be/QcTTmP5Ldt4?si=mcG88DRo4wLmcv-B',
  '로얄': 'https://youtu.be/AAf4CNX-7Co?si=0Z1x0_D3PVeGTbXu',
  'ROYAL': 'https://youtu.be/AAf4CNX-7Co?si=0Z1x0_D3PVeGTbXu',
  'ROYAL CARIBBEAN': 'https://youtu.be/AAf4CNX-7Co?si=0Z1x0_D3PVeGTbXu',
};

// 크루즈 선사에 맞는 유튜브 영상 링크 찾기 (폴백용)
function getCruiseLineVideoUrl(cruiseLine: string): string | null {
  const upperLine = cruiseLine.toUpperCase();
  for (const [key, url] of Object.entries(CRUISE_LINE_VIDEOS)) {
    if (upperLine.includes(key.toUpperCase())) {
      return url;
    }
  }
  return null;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    // shorts URL with query parameters
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})(?:\?|$)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// 상품 정보에서 여행지 추출
function extractDestinations(product: {
  packageName?: string;
  itineraryPattern?: string;
}): string {
  const destinations: string[] = [];
  
  if (product.packageName) {
    const packageName = product.packageName;
    if (packageName.includes('홍콩')) destinations.push('홍콩');
    if (packageName.includes('대만') || packageName.includes('타이완')) destinations.push('대만');
    if (packageName.includes('제주')) destinations.push('제주');
    if (packageName.includes('후쿠오카')) destinations.push('후쿠오카');
    if (packageName.includes('사세보')) destinations.push('사세보');
    if (packageName.includes('도쿄')) destinations.push('도쿄');
    if (packageName.includes('나가사키')) destinations.push('나가사키');
    if (packageName.includes('오키나와')) destinations.push('오키나와');
    if (packageName.includes('싱가포르')) destinations.push('싱가포르');
    if (packageName.includes('베트남')) destinations.push('베트남');
  }

  if (destinations.length === 0 && product.itineraryPattern) {
    const pattern = product.itineraryPattern;
    // pattern이 문자열인지 확인
    if (typeof pattern === 'string') {
      if (pattern.includes('홍콩')) destinations.push('홍콩');
      if (pattern.includes('대만') || pattern.includes('타이완')) destinations.push('대만');
      if (pattern.includes('제주')) destinations.push('제주');
      if (pattern.includes('후쿠오카')) destinations.push('후쿠오카');
      if (pattern.includes('사세보')) destinations.push('사세보');
      if (pattern.includes('도쿄')) destinations.push('도쿄');
      if (pattern.includes('나가사키')) destinations.push('나가사키');
      if (pattern.includes('오키나와')) destinations.push('오키나와');
      if (pattern.includes('싱가포르')) destinations.push('싱가포르');
      if (pattern.includes('베트남')) destinations.push('베트남');
    }
  }

  // 중복 제거 후 쉼표로 연결
  const uniqueDestinations = Array.from(new Set(destinations));
  return uniqueDestinations.length > 0 ? uniqueDestinations.join(', ') : '여행지';
}

// 사용자 이름 가져오기 (로그인 여부에 따라)
async function getUserName(): Promise<string> {
  try {
    const session = await getSession();
    if (session && session.userId) {
      const userId = parseInt(session.userId);
      if (!isNaN(userId)) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            mallNickname: true,
            name: true,
          },
        });
        
        // mallNickname이 있으면 사용, 없으면 name 사용
        if (user?.mallNickname) {
          return user.mallNickname;
        } else if (user?.name) {
          return user.name;
        }
      }
    }
  } catch (error) {
    console.error('[ChatBot Question] Failed to get user name:', error);
  }
  
  // 로그인하지 않은 경우 기본값
  return '행복♥';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = parseInt(params.id);

    if (isNaN(questionId)) {
      return NextResponse.json(
        { ok: false, error: '유효하지 않은 질문 ID입니다.' },
        { status: 400 }
      );
    }

    const question = await prisma.chatBotQuestion.findUnique({
      where: { id: questionId },
      include: {
        ChatBotFlow: true,
      },
    });

    if (!question) {
      return NextResponse.json(
        { ok: false, error: '질문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 다음 질문이 없으면 최종 페이지 URL 반환
    if (!question.nextQuestionIdA && !question.nextQuestionIdB && 
        (!question.nextQuestionIds || (Array.isArray(question.nextQuestionIds) && question.nextQuestionIds.length === 0))) {
      // 최종 페이지 URL에 partner 정보 추가 (구매 추적용)
      const searchParams = req.nextUrl.searchParams;
      const partnerId = searchParams.get('partner');
      let finalPageUrl = question.ChatBotFlow.finalPageUrl;
      
      if (finalPageUrl && partnerId) {
        const url = new URL(finalPageUrl, 'http://localhost'); // 상대 URL을 절대 URL로 변환하기 위한 임시 base
        url.searchParams.set('partner', partnerId);
        finalPageUrl = url.pathname + url.search; // pathname + search만 사용
      }
      
      return NextResponse.json({
        ok: true,
        question,
        finalPageUrl,
      });
    }

    // 상품 정보가 있으면 질문 텍스트에 동적으로 반영
    const searchParams = req.nextUrl.searchParams;
    const productCode = searchParams.get('productCode');
    
    // 사용자 이름 가져오기
    const userName = await getUserName();
    
    let questionText = question.questionText;
    let information = question.information || null;
    
    // 사용자 이름 삽입
    questionText = questionText.replace(/\{userName\}/g, userName);
    if (information) {
      information = information.replace(/\{userName\}/g, userName);
    } else {
      information = ''; // null이면 빈 문자열로 초기화
    }
    
    // 상품 정보 로드 (있는 경우)
    let product = null;
    let cruiseLineVideoUrl = null;
    let cruiseLineVideoId = null;
    
    if (productCode) {
      try {
        product = await prisma.cruiseProduct.findUnique({
          where: { productCode: productCode.toUpperCase() },
          select: {
            productCode: true,
            packageName: true,
            cruiseLine: true,
            shipName: true,
            nights: true,
            days: true,
            basePrice: true,
            startDate: true,
            endDate: true,
            itineraryPattern: true,
          },
        });
        
        if (product) {
          console.log('[ChatBot Question] Product loaded:', { productCode: product.productCode, cruiseLine: product.cruiseLine });
          cruiseLineVideoUrl = getCruiseLineVideoUrl(product.cruiseLine);
          cruiseLineVideoId = cruiseLineVideoUrl ? extractYouTubeId(cruiseLineVideoUrl) : null;
          // 여행지 추출
          const destinations = extractDestinations({
            packageName: product.packageName,
            itineraryPattern: product.itineraryPattern || '',
          });
          
          // 질문 텍스트에 상품 정보 삽입
          questionText = questionText
            .replace(/\{packageName\}/g, product.packageName)
            .replace(/\{cruiseLine\}/g, product.cruiseLine)
            .replace(/\{shipName\}/g, product.shipName)
            .replace(/\{nights\}/g, String(product.nights))
            .replace(/\{days\}/g, String(product.days))
            .replace(/\{basePrice\}/g, product.basePrice ? product.basePrice.toLocaleString() : '가격 문의')
            .replace(/\{startDate\}/g, product.startDate ? new Date(product.startDate).toLocaleDateString('ko-KR') : '일정 문의')
            .replace(/\{endDate\}/g, product.endDate ? new Date(product.endDate).toLocaleDateString('ko-KR') : '일정 문의')
            .replace(/\{여행지\}/g, destinations);
          
          // 정보 필드에도 상품 정보 삽입
          // information이 null이면 빈 문자열로 초기화 (영상/이미지 추가를 위해)
          if (!information) {
            information = '';
          }
          
          information = information
            .replace(/\{packageName\}/g, product.packageName)
            .replace(/\{cruiseLine\}/g, product.cruiseLine)
            .replace(/\{shipName\}/g, product.shipName)
            .replace(/\{nights\}/g, String(product.nights))
            .replace(/\{days\}/g, String(product.days))
            .replace(/\{basePrice\}/g, product.basePrice ? product.basePrice.toLocaleString() : '가격 문의')
            .replace(/\{startDate\}/g, product.startDate ? new Date(product.startDate).toLocaleDateString('ko-KR') : '일정 문의')
            .replace(/\{endDate\}/g, product.endDate ? new Date(product.endDate).toLocaleDateString('ko-KR') : '일정 문의')
            .replace(/\{여행지\}/g, destinations);
          
          // 크루즈 사진 추가 (order 2 - "크루즈 여행 타보신 적 있으세요?")
          if (question.order === 2) {
            try {
              if (!information) {
                information = '';
              }
              
              // 크루즈 사진 3장 가져오기 (상품 정보 기반)
              let cruiseImages = [];
              if (product) {
                // 크루즈정보사진 폴더에서 크루즈 사진 가져오기
                cruiseImages = getCruiseReviewImages({
                  packageName: product.packageName,
                  itineraryPattern: product.itineraryPattern || '',
                }, 3);
              }
              
              // product가 없거나 이미지가 없을 때 기본 이미지 사용
              if (cruiseImages.length === 0) {
                cruiseImages = getCruiseReviewImages({
                  packageName: '크루즈',
                  itineraryPattern: '',
                }, 3);
              }
              
              if (cruiseImages.length > 0) {
                let imageSection = '\n\n📸 **크루즈 사진**\n\n';
                // 3장을 가로로 나열 (클릭 가능하도록)
                const imageUrls = cruiseImages.map(i => i.url);
                imageSection += '<div style="display: flex; gap: 8px; margin: 16px 0; flex-wrap: wrap;">';
                cruiseImages.forEach((img, idx) => {
                  // 클릭 시 모달 열기 (data 속성 사용)
                  imageSection += `<img src="${img.url}" alt="${img.title || '크루즈 사진'}" data-image-gallery='${JSON.stringify(imageUrls)}' data-image-index="${idx}" class="cruise-image-clickable" style="flex: 1; min-width: 100px; max-width: 150px; height: 100px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;" onerror="this.style.display='none'; this.onerror=null;" />`;
                });
                imageSection += '</div>\n';
                imageSection += '<p style="font-size: 12px; color: #666; margin-top: -8px; margin-bottom: 8px;">💡 사진을 클릭하면 크게 볼 수 있어요!</p>\n';
                
                information += imageSection;
                console.log('[ChatBot Question] 크루즈 사진 추가 완료 (order 2):', cruiseImages.length, '장');
              }
            } catch (error) {
              console.error('[ChatBot Question] Failed to load cruise images for order 2:', error);
            }
          }

          // 크루즈 선사별 유튜브 영상 링크 추가 (q3에만)
          if (question.order === 3) {
            // 하드코딩된 영상 링크 사용 (YouTube API 사용 안 함)
            const videoUrl = cruiseLineVideoUrl || 'https://youtu.be/QcTTmP5Ldt4?si=mcG88DRo4wLmcv-B';
            const videoTitle = cruiseLineVideoUrl ? `${product.cruiseLine} 크루즈 실제 여행 영상` : 'MSC 크루즈 실제 여행 영상';
            
            // 중복 체크
            const videoId = extractYouTubeId(videoUrl);
            const hasVideo = videoId && information.includes(videoId);
            if (!hasVideo && !information.includes(videoTitle)) {
              information += `\n\n📺 **${videoTitle}**\n\n영상을 클릭해서 보시면 크루즈 여행의 모든 장점과 이득을 확인하실 수 있어요! 🎬\n`;
              if (videoId) {
                information += `\n\n<div style="margin: 16px 0;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><iframe src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
              }
            }
          }

          // 크루즈몰 후기 추가 (order 11 - "실제로 저희랑 다녀오신 분들 후기")
          if (question.order === 11) {
            try {
              if (!information) {
                information = '';
              }
              
              // DB에서 크루즈몰 후기 직접 조회
              try {
                const allReviews = await prisma.cruiseReview.findMany({
                  where: {
                    isApproved: true,
                    isDeleted: false,
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 9, // 필터링 후에도 충분한 수를 가져오기 위해
                  select: {
                    id: true,
                    authorName: true,
                    title: true,
                    content: true,
                    images: true,
                    rating: true,
                    cruiseLine: true,
                    shipName: true,
                  },
                });
                
                // 이미지가 실제로 있는 후기만 필터링
                const reviews = allReviews.filter(review => {
                  if (!review.images) return false;
                  try {
                    const images = Array.isArray(review.images) 
                      ? review.images 
                      : (typeof review.images === 'string' ? JSON.parse(review.images) : []);
                    return Array.isArray(images) && images.length > 0 && images.some((img: any) => img && img.trim());
                  } catch {
                    return false;
                  }
                }).slice(0, 3); // 최종 3개만
                
                if (reviews.length > 0) {
                  // 후기를 먼저 보여주기 위해 information 앞에 추가
                  let reviewsSection = '⭐ **실제 고객님 후기**\n\n';
                  
                  reviews.forEach((review, idx) => {
                    const authorName = review.authorName || '고객님';
                    const title = review.title || '크루즈 여행 후기';
                    const content = review.content || '';
                    const rating = review.rating || 5;
                    const stars = '⭐'.repeat(rating);
                    
                    reviewsSection += `**${idx + 1}. ${authorName}님** ${stars}\n`;
                    reviewsSection += `"${title}"\n`;
                    if (content) {
                      const shortContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
                      reviewsSection += `${shortContent}\n`;
                    }
                    reviewsSection += '\n';
                  });
                  
                  reviewsSection += '👉 더 많은 후기는 [크루즈몰](/)에서 확인하실 수 있어요!\n';
                  
                  // 후기를 information 앞에 추가 (먼저 보여주기)
                  information = reviewsSection + '\n\n---\n\n' + (information || '');
                  console.log('[ChatBot Question] 크루즈몰 후기 추가 완료:', reviews.length, '개');
                } else {
                  // DB에 후기가 없으면 기본 후기 텍스트 추가
                  if (!information.includes('실제 고객님 후기')) {
                    information += '\n\n⭐ **실제 고객님 후기**\n\n';
                    information += '**1. 송이엄마님** ⭐⭐⭐⭐⭐\n';
                    information += '"MSC 벨리시마 지중해 크루즈 최고의 여행!"\n';
                    information += '지중해 크루즈 여행을 다녀왔는데 정말 최고였습니다. 배도 크고 시설도 좋고 음식도 맛있었어요...\n\n';
                    information += '**2. 찡찡님** ⭐⭐⭐⭐⭐\n';
                    information += '"코스타 세레나 첫 크루즈 여행 후기"\n';
                    information += '평생 처음 크루즈 여행을 했는데 너무 좋았어요. 다음에도 또 가고 싶습니다...\n\n';
                    information += '👉 더 많은 후기는 [크루즈몰](/)에서 확인하실 수 있어요!\n';
                  }
                }
              } catch (error) {
                console.error('[ChatBot Question] Failed to load mall reviews from DB:', error);
                // 에러 발생 시 기본 후기 텍스트 추가
                if (!information.includes('실제 고객님 후기')) {
                  information += '\n\n⭐ **실제 고객님 후기**\n\n';
                  information += '**1. 송이엄마님** ⭐⭐⭐⭐⭐\n';
                  information += '"MSC 벨리시마 지중해 크루즈 최고의 여행!"\n';
                  information += '지중해 크루즈 여행을 다녀왔는데 정말 최고였습니다. 배도 크고 시설도 좋고 음식도 맛있었어요...\n\n';
                  information += '**2. 찡찡님** ⭐⭐⭐⭐⭐\n';
                  information += '"코스타 세레나 첫 크루즈 여행 후기"\n';
                  information += '평생 처음 크루즈 여행을 했는데 너무 좋았어요. 다음에도 또 가고 싶습니다...\n\n';
                  information += '👉 더 많은 후기는 [크루즈몰](/)에서 확인하실 수 있어요!\n';
                }
              }
            } catch (error) {
              console.error('[ChatBot Question] Failed to add mall reviews:', error);
            }
          }

          // 크루즈 후기 사진 추가 (q6에만 - "이게 크루즈입니다" 섹션)
          if (question.order === 6) {
            try {
              let cruiseImages = [];
              if (product) {
                // 크루즈정보사진 폴더에서 후기 사진 9장 가져오기
                cruiseImages = getCruiseReviewImages({
                  packageName: product.packageName,
                  itineraryPattern: product.itineraryPattern || '',
                }, 9);
              }
              
              // product가 없거나 이미지가 없을 때 기본 이미지 사용
              if (cruiseImages.length === 0) {
                cruiseImages = getCruiseReviewImages({
                  packageName: '크루즈',
                  itineraryPattern: '',
                }, 9);
              }
              
              if (cruiseImages.length > 0) {
                let imageSection = '\n\n📸 **크루즈 후기 사진**\n\n';
                // 3x3 그리드로 이미지 표시
                imageSection += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0;">';
                cruiseImages.forEach((img, idx) => {
                  imageSection += `<img src="${img.url}" alt="${img.title || '크루즈 후기 사진'}" style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.onerror=null;" />`;
                });
                imageSection += '</div>\n';
                
                information += imageSection;
              }
            } catch (error) {
              console.error('[ChatBot Question] Failed to load cruise review images:', error);
              // 이미지 로드 실패해도 계속 진행
            }
          }

          // 크루즈몰 후기 추가 (order 4 - "크루즈 터미널이 어디 있는지 아세요?")
          if (question.order === 4) {
            try {
              if (!information) {
                information = '';
              }
              
              // DB에서 크루즈몰 후기 직접 조회 (2개만)
              try {
                const allReviews = await prisma.cruiseReview.findMany({
                  where: {
                    isApproved: true,
                    isDeleted: false,
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 6, // 필터링 후에도 충분한 수를 가져오기 위해
                  select: {
                    id: true,
                    authorName: true,
                    title: true,
                    content: true,
                    images: true,
                    rating: true,
                    cruiseLine: true,
                    shipName: true,
                  },
                });
                
                // 이미지가 실제로 있는 후기만 필터링
                const reviews = allReviews.filter(review => {
                  if (!review.images) return false;
                  try {
                    const images = Array.isArray(review.images) 
                      ? review.images 
                      : (typeof review.images === 'string' ? JSON.parse(review.images) : []);
                    return Array.isArray(images) && images.length > 0 && images.some((img: any) => img && img.trim());
                  } catch {
                    return false;
                  }
                }).slice(0, 2); // 최종 2개만
                
                if (reviews.length > 0) {
                  // 후기를 먼저 보여주기 위해 information 앞에 추가
                  let reviewsSection = '⭐ **실제 고객님 후기**\n\n';
                  
                  reviews.forEach((review, idx) => {
                    const authorName = review.authorName || '고객님';
                    const title = review.title || '크루즈 여행 후기';
                    const content = review.content || '';
                    const rating = review.rating || 5;
                    const stars = '⭐'.repeat(rating);
                    
                    reviewsSection += `**${idx + 1}. ${authorName}님** ${stars}\n`;
                    reviewsSection += `"${title}"\n`;
                    if (content) {
                      const shortContent = content.length > 80 ? content.substring(0, 80) + '...' : content;
                      reviewsSection += `${shortContent}\n`;
                    }
                    reviewsSection += '\n';
                  });
                  
                  // 후기를 information 앞에 추가 (먼저 보여주기)
                  information = reviewsSection + '\n\n---\n\n' + (information || '');
                  console.log('[ChatBot Question] 크루즈몰 후기 추가 완료 (order 4):', reviews.length, '개');
                } else {
                  // DB에 후기가 없으면 기본 후기 텍스트 추가 (먼저 보여주기)
                  if (!information.includes('실제 고객님 후기')) {
                    let defaultReviewsSection = '⭐ **실제 고객님 후기**\n\n';
                    defaultReviewsSection += '**1. 송이엄마님** ⭐⭐⭐⭐⭐\n';
                    defaultReviewsSection += '"처음엔 터미널이 어딘지 몰라서 구글 지도만 10번도 더 봤어요. 택시 기사님도 정확히 모르셔서 한참 헤맸어요..."\n\n';
                    defaultReviewsSection += '**2. 찡찡님** ⭐⭐⭐⭐⭐\n';
                    defaultReviewsSection += '"크루즈 터미널 찾는 게 정말 어려웠어요. 다음엔 미리 알아봐야겠어요."\n\n';
                    // 후기를 information 앞에 추가 (먼저 보여주기)
                    information = defaultReviewsSection + '\n\n---\n\n' + (information || '');
                    console.log('[ChatBot Question] 기본 후기 텍스트 추가 완료 (order 4)');
                  }
                }
              } catch (error) {
                console.error('[ChatBot Question] Failed to load mall reviews from DB (order 4):', error);
                // 에러 발생 시 기본 후기 텍스트 추가 (먼저 보여주기)
                if (!information.includes('실제 고객님 후기')) {
                  let defaultReviewsSection = '⭐ **실제 고객님 후기**\n\n';
                  defaultReviewsSection += '**1. 송이엄마님** ⭐⭐⭐⭐⭐\n';
                  defaultReviewsSection += '"처음엔 터미널이 어딘지 몰라서 구글 지도만 10번도 더 봤어요. 택시 기사님도 정확히 모르셔서 한참 헤맸어요..."\n\n';
                  defaultReviewsSection += '**2. 찡찡님** ⭐⭐⭐⭐⭐\n';
                  defaultReviewsSection += '"크루즈 터미널 찾는 게 정말 어려웠어요. 다음엔 미리 알아봐야겠어요."\n\n';
                  // 후기를 information 앞에 추가 (먼저 보여주기)
                  information = defaultReviewsSection + '\n\n---\n\n' + (information || '');
                  console.log('[ChatBot Question] 기본 후기 텍스트 추가 완료 (order 4, error case)');
                }
              }
            } catch (error) {
              console.error('[ChatBot Question] Failed to add mall reviews (order 4):', error);
            }
          }

          // 여행지 이미지 추가 (order 4 또는 질문 텍스트에 "여행지 사진 보기" 또는 "📸" 포함된 경우)
          if (question.order === 4 || (question.questionText && (
            question.questionText.includes('여행지 사진 보기') || 
            question.questionText.includes('📸') ||
            question.questionText.includes('여행지 사진') ||
            question.questionText.includes('사진 보기')
          ))) {
            try {
              console.log('[ChatBot Question] 여행지 사진 추가 시도:', {
                questionId: question.id,
                order: question.order,
                questionText: question.questionText?.substring(0, 50),
                hasProduct: !!product,
                productName: product?.packageName,
              });
              
              // information이 null이면 빈 문자열로 초기화
              if (!information) {
                information = '';
              }
              
              let destinationImages = [];
              if (product) {
                // 여행지 이미지 가져오기
                destinationImages = getProductDestinationImages({
                  packageName: product.packageName,
                  itineraryPattern: product.itineraryPattern || '',
                });
                console.log('[ChatBot Question] Product 기반 이미지:', destinationImages.length, '장');
              }
              
              // product가 없거나 이미지가 없을 때 기본 이미지 사용
              if (destinationImages.length === 0) {
                destinationImages = getProductDestinationImages({
                  packageName: '크루즈 여행',
                  itineraryPattern: '',
                });
                console.log('[ChatBot Question] 기본 이미지:', destinationImages.length, '장');
              }

              // 여행지 이미지가 있으면 추가 (고객 후기와 동일한 HTML 그리드 형식)
              if (destinationImages.length > 0) {
                let imageSection = '\n\n📸 **여행지 사진**\n\n';
                // 2x3 그리드로 이미지 표시 (최대 5장)
                imageSection += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 16px 0;">';
                destinationImages.slice(0, 5).forEach((img, idx) => {
                  imageSection += `<img src="${img.url}" alt="${img.title || '여행지 사진'}" style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.onerror=null;" />`;
                });
                imageSection += '</div>\n';
                
                information += imageSection;
                console.log('[ChatBot Question] 여행지 사진 추가 완료:', destinationImages.length, '장');
              } else {
                console.warn('[ChatBot Question] 여행지 이미지를 찾을 수 없습니다.');
              }
            } catch (error) {
              console.error('[ChatBot Question] Failed to load destination images:', error);
              // 이미지 로드 실패해도 계속 진행
            }
          }

          // 객실 이미지 추가 (q21에만)
          if (question.order === 21) {
            try {
              // information이 null이면 빈 문자열로 초기화
              if (!information) {
                information = '';
              }
              
              // 객실 이미지 3장 가져오기
              const roomImages = getRoomImages(3);
              
              if (roomImages.length > 0) {
                let imageSection = '\n\n🏠 **객실 사진**\n\n';
                // 이미지를 가로로 나열
                imageSection += '<div style="display: flex; gap: 12px; margin: 16px 0; flex-wrap: wrap;">';
                roomImages.forEach((img, idx) => {
                  imageSection += `<img src="${img.url}" alt="${img.title || '객실 사진'}" style="flex: 1; min-width: 200px; max-width: 300px; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.onerror=null;" />`;
                });
                imageSection += '</div>\n';
                
                information += imageSection;
              }
            } catch (error) {
              console.error('[ChatBot Question] Failed to load room images:', error);
              // 이미지 로드 실패해도 계속 진행
            }
          }
          
        }
      } catch (error) {
        console.error('[ChatBot Question] Failed to load product:', error);
      }
    }
    
    // product가 없을 때 기본 영상/이미지 추가
    if (!product) {
      // 크루즈 선사별 유튜브 영상 링크 추가 (q3에만) - product가 없을 때
      if (question.order === 3) {
        const defaultVideoUrl = 'https://youtu.be/QcTTmP5Ldt4?si=mcG88DRo4wLmcv-B';
        const defaultTitle = 'MSC 크루즈 실제 여행 영상';
        const defaultVideoId = extractYouTubeId(defaultVideoUrl);
        const hasDefaultVideo = defaultVideoId && information.includes(defaultVideoId);
        if (!hasDefaultVideo && !information.includes(defaultTitle)) {
          if (!information) {
            information = '';
          }
          information += `\n\n📺 **${defaultTitle}**\n\n영상을 클릭해서 보시면 크루즈 여행의 모든 장점과 이득을 확인하실 수 있어요! 🎬\n`;
          if (defaultVideoId) {
            information += `\n\n<div style="margin: 16px 0;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><iframe src="https://www.youtube.com/embed/${defaultVideoId}?rel=0&modestbranding=1" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
          }
        }
      }
      
      // 크루즈 후기 사진 추가 (q6에만) - product가 없을 때
      if (question.order === 6) {
        try {
          if (!information) {
            information = '';
          }
          if (!information.includes('크루즈 후기 사진')) {
            const cruiseImages = getCruiseReviewImages({
              packageName: '크루즈',
              itineraryPattern: '',
            }, 9);
            
            if (cruiseImages.length > 0) {
              let imageSection = '\n\n📸 **크루즈 후기 사진**\n\n';
              imageSection += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0;">';
              cruiseImages.forEach((img, idx) => {
                imageSection += `<img src="${img.url}" alt="${img.title || '크루즈 후기 사진'}" style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.onerror=null;" />`;
              });
              imageSection += '</div>\n';
              information += imageSection;
            }
          }
        } catch (error) {
          console.error('[ChatBot Question] Failed to load default cruise review images:', error);
        }
      }
      
      // 여행지 이미지 추가 (order 4 또는 질문 텍스트에 "여행지 사진 보기" 또는 "📸" 포함된 경우) - product가 없을 때
      if (question.order === 4 || (question.questionText && (
        question.questionText.includes('여행지 사진 보기') || 
        question.questionText.includes('📸') ||
        question.questionText.includes('여행지 사진') ||
        question.questionText.includes('사진 보기')
      ))) {
        try {
          console.log('[ChatBot Question] 여행지 사진 추가 시도 (no product):', {
            questionId: question.id,
            order: question.order,
            questionText: question.questionText?.substring(0, 50),
          });
          
          if (!information) {
            information = '';
          }
          const destinationImages = getProductDestinationImages({
            packageName: '크루즈 여행',
            itineraryPattern: '',
          });
          
          if (destinationImages.length > 0) {
            let imageSection = '\n\n📸 **여행지 사진**\n\n';
            // 2x3 그리드로 이미지 표시 (최대 5장)
            imageSection += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 16px 0;">';
            destinationImages.slice(0, 5).forEach((img, idx) => {
              imageSection += `<img src="${img.url}" alt="${img.title || '여행지 사진'}" style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.onerror=null;" />`;
            });
            imageSection += '</div>\n';
            
            information += imageSection;
            console.log('[ChatBot Question] 여행지 사진 추가 완료 (no product):', destinationImages.length, '장');
          } else {
            console.warn('[ChatBot Question] 여행지 이미지를 찾을 수 없습니다 (no product).');
          }
        } catch (error) {
          console.error('[ChatBot Question] Failed to load default destination images:', error);
        }
      }
    }
    
    // order 4.5, 7-13, 14-18.7, 20.5는 product와 관계없이 항상 추가 (중복 체크 강화)
    // 부산 출발 크루즈 영상 추가 (order 4.5 또는 질문 텍스트로 확인)
    if (question.order === 4.5 || (question.questionText && question.questionText.includes('왜 부산 출발하는 크루즈가 없나요'))) {
      const busanVideo = PROBLEM_VIDEOS[0];
      if (!information) {
        information = '';
      }
      const videoId = extractYouTubeId(busanVideo.url);
      const hasVideo = information.includes(busanVideo.url) || 
                      information.includes(busanVideo.title) ||
                      (videoId && information.includes(videoId));
      if (!hasVideo) {
        information += `\n\n📺 **${busanVideo.title}**\n\n${busanVideo.description}\n\n영상을 보시고 다음으로 넘어가주세요.`;
        const videoId = extractYouTubeId(busanVideo.url);
        if (videoId) {
          information += `\n\n<div style="margin: 16px 0;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><iframe src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
        }
      }
    }
    
    // 문제 영상 추가 (order 7-9만) - product와 관계없이
    // order 10-13은 해결책 영상이므로 여기서 제외
    if (question.order >= 7 && question.order <= 9) {
      const problemIndex = question.order - 7;
      const adjustedIndex = problemIndex + 1; // 0번은 부산 출발 크루즈이므로 1부터 시작
      if (PROBLEM_VIDEOS[adjustedIndex]) {
        const video = PROBLEM_VIDEOS[adjustedIndex];
        if (!information) {
          information = '';
        }
        const videoId = extractYouTubeId(video.url);
        const hasVideo = information.includes(video.url) || 
                        information.includes(video.title) ||
                        (videoId && information.includes(videoId));
        // cruiseLineVideoId와 중복 체크
        const isDuplicateWithBase = cruiseLineVideoId && videoId && videoId === cruiseLineVideoId;
        if (!hasVideo && !isDuplicateWithBase) {
          information += `\n\n📺 **${video.title}**\n\n${video.description}\n\n영상을 클릭해서 보시고, 다음 문제로 넘어가주세요.`;
          const videoId = extractYouTubeId(video.url);
          if (videoId) {
            information += `\n\n<div style="margin: 16px 0;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><iframe src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
          }
        }
      }
    }
    
    // 해결책 영상 추가 (order 10-18, 18.5, 18.7) - product와 관계없이
    // order 기반 매핑과 질문 ID 기반 매핑 모두 지원
    if (question.order >= 10 && question.order <= 18.7) {
      let solutionIndex = -1;
      
      // order 기반 매핑
      if (question.order === 10) {
        solutionIndex = 3; // 크루즈닷 가이드 지니 AI와 걱정없이 가는 방법
      } else if (question.order === 11) {
        // Q11은 후기만 표시 (영상 없음)
        solutionIndex = -1;
      } else if (question.order === 12) {
        solutionIndex = 5; // APEC 정상회담 숙소에 썼던 크루즈도 크루즈닷이?
      } else if (question.order === 13) {
        solutionIndex = 4; // 크루즈닷이 그래서 함께 한다면?
      } else if (question.order === 14) {
        solutionIndex = 0;
      } else if (question.order === 15) {
        solutionIndex = 1;
      } else if (question.order === 16) {
        solutionIndex = 2;
      } else if (question.order === 17) {
        solutionIndex = 6; // 행복하게 놀생각만 하세요
      } else if (question.order === 18) {
        // order 18인 경우 질문 ID로 구분 (19=다섯번째, 20=여섯번째, 21=일곱번째)
        if (question.id === 19) {
          solutionIndex = 4; // 다섯번째 해결책
        } else if (question.id === 20) {
          solutionIndex = 5; // 여섯번째 해결책
        } else if (question.id === 21) {
          solutionIndex = 6; // 일곱번째 해결책
        } else {
          solutionIndex = 4; // 기본값: 다섯번째 해결책
        }
      } else if (question.order === 18.5) {
        solutionIndex = 5;
      } else if (question.order === 18.7) {
        solutionIndex = 6;
      }
      
      if (solutionIndex >= 0 && SOLUTION_VIDEOS[solutionIndex]) {
        const video = SOLUTION_VIDEOS[solutionIndex];
        if (!information) {
          information = '';
        }
        const videoId = extractYouTubeId(video.url);
        // 이 질문에 해당하는 영상만 체크 (다른 질문의 영상과 중복 체크하지 않음)
        // videoId로만 중복 체크 (URL이나 제목은 다른 질문과 겹칠 수 있음)
        // 하지만 이 질문의 information에 이미 같은 videoId가 있으면 추가하지 않음
        const hasVideo = videoId && information.includes(`embed/${videoId}`);
        // cruiseLineVideoId와 중복 체크
        const isDuplicateWithBase = cruiseLineVideoId && videoId && videoId === cruiseLineVideoId;
        if (!hasVideo && !isDuplicateWithBase && videoId) {
          // Q11은 후기만 표시하므로 영상 추가하지 않음
          if (question.order !== 11) {
            information += `\n\n📺 **${video.title}**\n\n${video.description}\n\n영상을 클릭해서 보시고, 다음 해결책으로 넘어가주세요.`;
            // YouTube iframe 직접 삽입 (마크다운 링크 대신)
            information += `\n\n<div style="margin: 16px 0;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><iframe src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
          }
        }
      }
    }
    
    // 코스타 발코니 룸 영상 추가 (order 20.5) - product와 관계없이
    if (question.order === 20.5) {
      const balconyVideo = {
        title: '코스타 발코니 룸은 어떻게 생겼죠?',
        url: 'https://youtube.com/shorts/adwUUww4thw?si=e7MDkktHds8b_ay3',
        description: '실제 코스타 발코니 룸의 모습을 확인해보세요!',
      };
      if (!information) {
        information = '';
      }
      const videoId = extractYouTubeId(balconyVideo.url);
      const hasVideo = information.includes(balconyVideo.url) || 
                      information.includes(balconyVideo.title) ||
                      (videoId && information.includes(videoId));
      if (!hasVideo) {
        information += `\n\n📺 **${balconyVideo.title}**\n\n${balconyVideo.description}\n\n영상을 보시고 객실 선택으로 넘어가주세요.`;
        const videoId = extractYouTubeId(balconyVideo.url);
        if (videoId) {
          information += `\n\n<div style="margin: 16px 0;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><iframe src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
        }
      }
    }

    // optionA, optionB, options에도 플레이스홀더 치환 적용
    let optionA = question.optionA;
    let optionB = question.optionB;
    let options = question.options && typeof question.options === 'object' 
      ? (Array.isArray(question.options) ? question.options : [])
      : null;
    
    if (productCode) {
      try {
        const product = await prisma.cruiseProduct.findUnique({
          where: { productCode: productCode.toUpperCase() },
          select: {
            packageName: true,
            itineraryPattern: true,
          },
        });
        
        if (product) {
          const destinations = extractDestinations({
            packageName: product.packageName,
            itineraryPattern: product.itineraryPattern || '',
          });
          
          // optionA, optionB 치환
          if (optionA) {
            optionA = optionA.replace(/\{여행지\}/g, destinations);
          }
          if (optionB) {
            optionB = optionB.replace(/\{여행지\}/g, destinations);
          }
          
          // options 배열 치환
          if (options && Array.isArray(options)) {
            options = options.map(opt => {
              if (typeof opt === 'string') {
                return opt.replace(/\{여행지\}/g, destinations);
              }
              return opt;
            });
          }
        }
      } catch (error) {
        console.error('[ChatBot Question] Failed to replace placeholders in options:', error);
      }
    }

    // 마지막 질문에 "가족과 상의해야 해요" 옵션 추가 (nextQuestionIdB가 없고 finalPageUrl이 있는 경우)
    let finalOptionB = optionB;
    if (!optionB && question.ChatBotFlow.finalPageUrl && !question.nextQuestionIdB) {
      finalOptionB = '가족과 상의해야 해요';
    }

    // 최종 페이지 URL에 partner 정보 추가 (구매 추적용)
    const partnerId = searchParams.get('partner');
    let finalPageUrl = question.ChatBotFlow.finalPageUrl;
    
    if (finalPageUrl && partnerId) {
      const url = new URL(finalPageUrl, 'http://localhost'); // 상대 URL을 절대 URL로 변환하기 위한 임시 base
      url.searchParams.set('partner', partnerId);
      finalPageUrl = url.pathname + url.search; // pathname + search만 사용
    }

    return NextResponse.json({
      ok: true,
      question: {
        ...question,
        questionText,
        information,
        optionA,
        optionB: finalOptionB,
        options,
        nextQuestionIds: question.nextQuestionIds && typeof question.nextQuestionIds === 'object'
          ? (Array.isArray(question.nextQuestionIds) ? question.nextQuestionIds : [])
          : null,
      },
      finalPageUrl,
    });
  } catch (error) {
    console.error('[ChatBot Question] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[ChatBot Question] Error details:', { errorMessage, errorStack });
    return NextResponse.json(
      { ok: false, error: `질문을 불러오는 중 오류가 발생했습니다: ${errorMessage}` },
      { status: 500 }
    );
  }
}
