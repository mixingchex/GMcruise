// app/api/chat-bot/start/route.ts
// 채팅봇 시작 - 첫 질문 로드 (상품 정보 포함)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getProductDestinationImages, getCruiseReviewImages, getRoomImages } from '@/lib/cruise-images';

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
    console.error('[ChatBot Start] Failed to get user name:', error);
  }
  
  // 로그인하지 않은 경우 기본값
  return '행복♥';
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const productCode = searchParams.get('productCode');
    const shareToken = searchParams.get('shareToken'); // 공유 토큰 파라미터 추가
    const flowIdParam = searchParams.get('flowId'); // 미리보기용 flowId 파라미터
    const isPreview = searchParams.get('preview') === 'true'; // 미리보기 모드
    
    // 상품 정보 로드 (있는 경우)
    let productInfo = null;
    if (productCode) {
      try {
        const product = await prisma.cruiseProduct.findUnique({
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
            MallProductContent: {
              select: {
                layout: true,
              },
            },
          },
        });
        
        if (product) {
          productInfo = {
            productCode: product.productCode,
            packageName: product.packageName,
            cruiseLine: product.cruiseLine,
            shipName: product.shipName,
            nights: product.nights,
            days: product.days,
            basePrice: product.basePrice,
            startDate: product.startDate?.toISOString() || null,
            endDate: product.endDate?.toISOString() || null,
            itineraryPattern: product.itineraryPattern || '',
          };
        }
      } catch (error) {
        console.error('[ChatBot Start] Failed to load product:', error);
      }
    }
    
    // 플로우 찾기: flowId > shareToken > 활성화된 플로우 순서로 찾기
    let flow = null;
    
    // 1. 미리보기 모드: flowId로 직접 찾기 (비활성화된 플로우도 가능, 관리자용)
    if (flowIdParam && isPreview) {
      const flowId = parseInt(flowIdParam);
      if (!isNaN(flowId)) {
        flow = await prisma.chatBotFlow.findFirst({
          where: { 
            id: flowId,
            category: 'AI 지니 채팅봇(구매)', // 카테고리 체크는 유지
          },
          include: {
            ChatBotQuestion: {
              where: {
                isActive: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
        });
      }
    }
    
    // 2. shareToken으로 플로우 찾기 (공개 링크용)
    if (!flow && shareToken) {
      flow = await prisma.chatBotFlow.findFirst({
        where: {
          shareToken: shareToken,
          category: 'AI 지니 채팅봇(구매)',
          isPublic: true, // 공개 플로우만
        },
        orderBy: {
          order: 'asc',
        },
        include: {
          ChatBotQuestion: {
            where: {
              isActive: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });
    }
    
    // 3. shareToken 플로우가 없거나 shareToken이 없으면 활성화된 플로우 찾기
    if (!flow) {
      flow = await prisma.chatBotFlow.findFirst({
        where: {
          isActive: true,
          category: 'AI 지니 채팅봇(구매)',
        },
        orderBy: {
          order: 'asc',
        },
        include: {
          ChatBotQuestion: {
            where: {
              isActive: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });
    }

    if (!flow) {
      return NextResponse.json({
        ok: false,
        error: '활성화된 채팅봇 플로우가 없습니다.',
      });
    }

    // 시작 질문 찾기
    let question = null;
    if (flow.startQuestionId) {
      question = await prisma.chatBotQuestion.findUnique({
        where: { id: flow.startQuestionId },
      });
    } else if (flow.ChatBotQuestion.length > 0) {
      // 시작 질문이 없으면 첫 번째 질문 사용
      question = flow.ChatBotQuestion[0];
    }

    if (!question) {
      return NextResponse.json({
        ok: false,
        error: '시작 질문을 찾을 수 없습니다.',
      });
    }

    // 사용자 이름 가져오기
    const userName = await getUserName();
    
    // 상품 정보가 있으면 질문 텍스트에 동적으로 반영
    let questionText = question.questionText;
    let questionInformation = question.information;
    
    // 사용자 이름 삽입
    questionText = questionText.replace(/\{userName\}/g, userName);
    if (questionInformation) {
      questionInformation = questionInformation.replace(/\{userName\}/g, userName);
    }
    
    if (productInfo) {
      // 여행지 추출
      const destinations = extractDestinations({
        packageName: productInfo.packageName,
        itineraryPattern: productInfo.itineraryPattern || '',
      });
      
      // 상품 정보를 질문에 동적으로 삽입
      questionText = questionText
        .replace(/\{packageName\}/g, productInfo.packageName)
        .replace(/\{cruiseLine\}/g, productInfo.cruiseLine)
        .replace(/\{shipName\}/g, productInfo.shipName)
        .replace(/\{nights\}/g, String(productInfo.nights))
        .replace(/\{days\}/g, String(productInfo.days))
        .replace(/\{basePrice\}/g, productInfo.basePrice ? productInfo.basePrice.toLocaleString() : '가격 문의')
        .replace(/\{여행지\}/g, destinations);
      
      // 정보 필드에도 상품 정보 삽입
      // information이 null이면 빈 문자열로 초기화 (영상/이미지 추가를 위해)
      if (!questionInformation) {
        questionInformation = '';
      }
      
      questionInformation = questionInformation
        .replace(/\{packageName\}/g, productInfo.packageName)
        .replace(/\{cruiseLine\}/g, productInfo.cruiseLine)
        .replace(/\{shipName\}/g, productInfo.shipName)
        .replace(/\{nights\}/g, String(productInfo.nights))
        .replace(/\{days\}/g, String(productInfo.days))
        .replace(/\{basePrice\}/g, productInfo.basePrice ? productInfo.basePrice.toLocaleString() : '가격 문의')
        .replace(/\{여행지\}/g, destinations);
      
      // 크루즈 선사별 유튜브 영상 링크 추가 (q3에만)
      if (question.order === 3) {
        // 하드코딩된 영상 링크 사용 (YouTube API 사용 안 함)
        const videoUrl = productInfo ? getCruiseLineVideoUrl(productInfo.cruiseLine) : null;
        const finalVideoUrl = videoUrl || 'https://youtu.be/QcTTmP5Ldt4?si=mcG88DRo4wLmcv-B';
        const videoTitle = videoUrl ? `${productInfo.cruiseLine} 크루즈 실제 여행 영상` : 'MSC 크루즈 실제 여행 영상';
        
        // 중복 체크
        const videoId = finalVideoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)?.[1];
        const hasVideo = videoId && questionInformation.includes(videoId);
        if (!hasVideo && !questionInformation.includes(videoTitle)) {
          questionInformation += `\n\n📺 **${videoTitle}**\n\n영상을 클릭해서 보시면 크루즈 여행의 모든 장점과 이득을 확인하실 수 있어요! 🎬\n`;
          if (videoId) {
            questionInformation += `\n\n<div style="margin: 16px 0;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><iframe src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
          }
        }
      }

      // 크루즈 후기 사진 추가 (q6에만 - "이게 크루즈입니다" 섹션)
      if (question.order === 6) {
        try {
          let cruiseImages = [];
          if (productInfo) {
            // 크루즈정보사진 폴더에서 후기 사진 9장 가져오기
            cruiseImages = getCruiseReviewImages({
              packageName: productInfo.packageName,
              itineraryPattern: productInfo.itineraryPattern || '',
            }, 9);
          }
          
          // productInfo가 없거나 이미지가 없을 때 기본 이미지 사용
          if (cruiseImages.length === 0) {
            cruiseImages = getCruiseReviewImages({
              packageName: '크루즈',
              itineraryPattern: '',
            }, 9);
          }
          
          if (cruiseImages.length > 0) {
            const imagesToAdd = cruiseImages.filter(img => !questionInformation?.includes(img.url));

            if (imagesToAdd.length > 0) {
              let imageSection = '\n\n📸 **크루즈 후기 사진**\n\n';
              // 3x3 그리드로 이미지 표시
              imageSection += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0;">';
              imagesToAdd.forEach((img) => {
                imageSection += `<img src="${img.url}" alt="${img.title || '크루즈 후기 사진'}" style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.onerror=null;" />`;
              });
              imageSection += '</div>\n';
              
              questionInformation += imageSection;
            }
          }
        } catch (error) {
          console.error('[ChatBot Start] Failed to load cruise review images:', error);
          // 이미지 로드 실패해도 계속 진행
        }
      }

      // 여행지 이미지 추가 (q4에만)
      if (question.order === 4) {
        try {
          let destinationImages = [];
          if (productInfo) {
            // 여행지 이미지 가져오기
            destinationImages = getProductDestinationImages({
              packageName: productInfo.packageName,
              itineraryPattern: productInfo.itineraryPattern || '',
            });
          }
          
          // productInfo가 없거나 이미지가 없을 때 기본 이미지 사용
          if (destinationImages.length === 0) {
            destinationImages = getProductDestinationImages({
              packageName: '크루즈 여행',
              itineraryPattern: '',
            });
          }

          // 여행지 이미지가 있으면 추가
          if (destinationImages.length > 0) {
            const imagesToAdd = destinationImages.filter(img => !questionInformation?.includes(img.url));
            
            if (imagesToAdd.length > 0) {
              let imageSection = '\n\n';
              imagesToAdd.forEach((img) => {
                imageSection += `![${img.title}](${img.url})\n\n`;
              });
              
              questionInformation += imageSection;
            }
          }
        } catch (error) {
          console.error('[ChatBot Start] Failed to load destination images:', error);
          // 이미지 로드 실패해도 계속 진행
        }
      }

      // 객실 이미지 추가 (q21에만)
      if (question.order === 21) {
        try {
          // questionInformation이 null이면 빈 문자열로 초기화
          if (!questionInformation) {
            questionInformation = '';
          }
          
          // 객실 이미지 3장 가져오기
          const roomImages = getRoomImages(3);
          
          if (roomImages.length > 0) {
            const imagesToAdd = roomImages.filter(img => !questionInformation?.includes(img.url));

            if (imagesToAdd.length > 0) {
              let imageSection = '\n\n🏠 **객실 사진**\n\n';
              // 이미지를 가로로 나열
              imageSection += '<div style="display: flex; gap: 12px; margin: 16px 0; flex-wrap: wrap;">';
              imagesToAdd.forEach((img) => {
                imageSection += `<img src="${img.url}" alt="${img.title || '객실 사진'}" style="flex: 1; min-width: 200px; max-width: 300px; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.onerror=null;" />`;
              });
              imageSection += '</div>\n';
              
              questionInformation += imageSection;
            }
          }
        } catch (error) {
          console.error('[ChatBot Start] Failed to load room images:', error);
          // 이미지 로드 실패해도 계속 진행
        }
      }
    }
    
    // productInfo가 없을 때 기본 영상/이미지 추가
    if (!productInfo) {
      // 크루즈 선사별 유튜브 영상 링크 추가 (q3에만) - productInfo가 없을 때
      if (question.order === 3) {
        const defaultVideoUrl = 'https://youtu.be/QcTTmP5Ldt4?si=mcG88DRo4wLmcv-B';
        const defaultTitle = 'MSC 크루즈 실제 여행 영상';
        const defaultVideoId = defaultVideoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)?.[1];
        const hasDefaultVideo = defaultVideoId && questionInformation.includes(defaultVideoId);
        if (!hasDefaultVideo && !questionInformation.includes(defaultTitle)) {
          if (!questionInformation) {
            questionInformation = '';
          }
          questionInformation += `\n\n📺 **${defaultTitle}**\n\n영상을 클릭해서 보시면 크루즈 여행의 모든 장점과 이득을 확인하실 수 있어요! 🎬\n`;
          if (defaultVideoId) {
            questionInformation += `\n\n<div style="margin: 16px 0;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><iframe src="https://www.youtube.com/embed/${defaultVideoId}?rel=0&modestbranding=1" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
          }
        }
      }
      
      // 크루즈 후기 사진 추가 (q6에만) - productInfo가 없을 때
      if (question.order === 6) {
        try {
          if (!questionInformation) {
            questionInformation = '';
          }
          if (!questionInformation.includes('크루즈 후기 사진')) {
            const cruiseImages = getCruiseReviewImages({
              packageName: '크루즈',
              itineraryPattern: '',
            }, 9);
            
            if (cruiseImages.length > 0) {
              let imageSection = '\n\n📸 **크루즈 후기 사진**\n\n';
              imageSection += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0;">';
              cruiseImages.forEach((img) => {
                imageSection += `<img src="${img.url}" alt="${img.title || '크루즈 후기 사진'}" style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onerror="this.style.display='none'; this.onerror=null;" />`;
              });
              imageSection += '</div>\n';
              questionInformation += imageSection;
            }
          }
        } catch (error) {
          console.error('[ChatBot Start] Failed to load default cruise review images:', error);
        }
      }
      
      // 여행지 이미지 추가 (q4에만) - productInfo가 없을 때
      if (question.order === 4) {
        try {
          if (!questionInformation) {
            questionInformation = '';
          }
          const destinationImages = getProductDestinationImages({
            packageName: '크루즈 여행',
            itineraryPattern: '',
          });
          
          if (destinationImages.length > 0) {
            let imageSection = '\n\n';
            destinationImages.forEach((img) => {
              imageSection += `![${img.title}](${img.url})\n\n`;
            });
            questionInformation += imageSection;
          }
        } catch (error) {
          console.error('[ChatBot Start] Failed to load default destination images:', error);
        }
      }
    }

    // optionA, optionB, options에도 플레이스홀더 치환 적용
    let optionA = question.optionA;
    let optionB = question.optionB;
    let options = question.options && typeof question.options === 'object' 
      ? (Array.isArray(question.options) ? question.options : [])
      : null;
    
    if (productInfo) {
      const destinations = extractDestinations({
        packageName: productInfo.packageName,
        itineraryPattern: productInfo.itineraryPattern || '',
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

    return NextResponse.json({
      ok: true,
      question: {
        ...question,
        questionText,
        information: questionInformation,
        optionA,
        optionB,
        options,
      },
      flowId: flow.id,
      finalPageUrl: productCode ? `/products/${productCode}/payment` : flow.finalPageUrl,
      productInfo,
      userName, // 사용자 이름도 함께 반환
    });
  } catch (error) {
    console.error('[ChatBot Start] Error:', error);
    return NextResponse.json(
      { ok: false, error: '채팅봇을 시작하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
