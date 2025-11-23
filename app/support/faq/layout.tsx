// app/support/faq/layout.tsx
// FAQ 페이지 SEO 메타데이터 및 구조화된 데이터

import type { Metadata } from 'next';
import Script from 'next/script';
import { generateMetadata as generateSeoMetadata } from '@/lib/seo/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const pagePath = '/support/faq';
  return generateSeoMetadata(pagePath, {
    title: '자주 묻는 질문 (FAQ) - 크루즈 가이드 | 크루즈 여행 궁금증 해결',
    description: '크루즈 여행에 대한 자주 묻는 질문과 답변을 확인하세요. 크루즈 예약, 준비, 여행 중 궁금한 모든 것을 한 곳에서 해결하세요.',
    image: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr'}/images/ai-cruise-logo.png`,
    url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr'}/support/faq`,
  });
}

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://cruisedot.co.kr';
  
  // FAQ 페이지용 구조화된 데이터 (FAQPage Schema)
  // 실제 FAQ 데이터와 일치하도록 구성
  const faqPageData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '크루즈 국내 출발 많나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '크루즈 국내 출발에 대한 자세한 내용을 영상으로 확인하실 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '코스타 세레나호 발코니 객실은 어떻게 생겼을까요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '코스타 세레나호 발코니 객실을 영상으로 확인하실 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '크루즈 여행 완전 가성비로 가는 방법은 뭘까요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '크루즈 여행을 가성비 있게 즐기는 방법을 영상으로 확인하실 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '크루즈 여행 준비물은 무엇이 필요할까요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '크루즈 여행을 위한 필수 준비물과 체크리스트를 확인하실 수 있습니다. 체크리스트 페이지에서 상세한 준비물 목록을 확인하세요.',
        },
      },
      {
        '@type': 'Question',
        name: '크루즈 여행 비용은 얼마나 드나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '크루즈 여행의 비용 구조와 예산 계획에 대한 정보를 확인하실 수 있습니다. 상품별 가격은 상품 목록 페이지에서 확인하세요.',
        },
      },
      {
        '@type': 'Question',
        name: '크루즈 여행 일정은 어떻게 확인하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '크루즈 여행 일정은 예약한 상품의 상세 페이지에서 확인하실 수 있습니다. 일정 페이지에서 오늘의 브리핑도 확인하세요.',
        },
      },
      {
        '@type': 'Question',
        name: '크루즈 예약은 어떻게 하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '크루즈 상품 목록에서 원하는 상품을 선택하고 예약하실 수 있습니다. 상세한 예약 절차는 상품 페이지에서 확인하세요.',
        },
      },
    ],
  };

  return (
    <>
      {/* 구조화된 데이터 (JSON-LD) - FAQPage */}
      <Script
        id="faq-page-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqPageData),
        }}
      />
      {children}
    </>
  );
}

