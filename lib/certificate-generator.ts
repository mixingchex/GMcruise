// lib/certificate-generator.ts
// 구매확인증서 PNG 이미지 생성 (Vercel 서버리스 호환 - Satori 사용)
// 관리자 패널 Certificate.tsx와 동일한 양식

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

interface ProductDetails {
  tags?: string[];
  visitedCountries?: string[];
  destinations?: string[];
  nights?: number;
  days?: number;
  cruiseLine?: string;
  shipName?: string;
  included?: string[];
  excluded?: string[];
  refundPolicy?: string;
  hasGuide?: boolean;
  hasEscort?: boolean;
  hasCruiseDotStaff?: boolean;
  hasTravelInsurance?: boolean;
  flightIncluded?: boolean;
}

interface CertificateData {
  customerName: string;
  birthDate: string;
  productName: string;
  paymentAmount: number;
  paymentDate: string;
  orderId: string;
  managerName?: string;
  productDetails?: ProductDetails;
}

// 폰트 캐시
let fontCache: ArrayBuffer | null = null;

/**
 * 폰트 데이터 로드 (캐싱)
 */
async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) {
    return fontCache;
  }

  // Pretendard 폰트 사용 (CDN에서 로드)
  const fontUrl = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2';

  try {
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch font: ${response.status}`);
    }
    fontCache = await response.arrayBuffer();
    return fontCache;
  } catch (error) {
    console.error('[Certificate Generator] Font load error:', error);
    // 폴백: 기본 폰트 사용 시 에러 발생하므로 Noto Sans KR 시도
    const fallbackUrl = 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuozeLTq8H4hfeE.woff2';
    const fallbackResponse = await fetch(fallbackUrl);
    fontCache = await fallbackResponse.arrayBuffer();
    return fontCache;
  }
}

/**
 * 구매확인서 React Element 생성 (Satori용)
 */
function generateCertificateElement(data: CertificateData) {
  const formattedAmount = data.paymentAmount.toLocaleString('ko-KR');
  const now = new Date();
  const issueDate = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
  const pd = data.productDetails;

  // 상품 상세 정보 행들
  const detailRows: { label: string; value: string }[] = [];
  if (pd) {
    if (pd.tags && pd.tags.length > 0) {
      detailRows.push({ label: '후킹태그', value: pd.tags.join(', ') });
    }
    if (pd.visitedCountries && pd.visitedCountries.length > 0) {
      detailRows.push({ label: '방문국가', value: pd.visitedCountries.join(', ') });
    }
    if (pd.destinations && pd.destinations.length > 0) {
      detailRows.push({ label: '목적지', value: pd.destinations.join(', ') });
    }
    if (pd.nights || pd.days) {
      detailRows.push({ label: '여행기간', value: `${pd.nights || 0}박 ${pd.days || 0}일` });
    }
    if (pd.cruiseLine) {
      detailRows.push({ label: '크루즈 회사', value: pd.cruiseLine });
    }
    if (pd.shipName) {
      detailRows.push({ label: '선박명', value: pd.shipName });
    }
    detailRows.push({ label: '비행기', value: pd.flightIncluded ? '포함' : '불포함' });
    detailRows.push({ label: '인솔자', value: pd.hasEscort ? '있음' : '없음' });
    detailRows.push({ label: '가이드', value: pd.hasGuide ? '있음' : '없음' });
    detailRows.push({ label: '크루즈닷 전용 스탭', value: pd.hasCruiseDotStaff ? '있음' : '없음' });
    detailRows.push({ label: '여행자 보험', value: pd.hasTravelInsurance ? '포함' : '불포함' });
  }

  // Satori JSX 구조 (React.createElement 사용)
  const h = (type: string, props: Record<string, unknown> | null, ...children: unknown[]) => ({
    type,
    props: { ...props, children: children.length === 1 ? children[0] : children },
  });

  // 테이블 행 생성 헬퍼
  const tableRow = (label: string, value: string, bold = false) =>
    h('div', {
      style: {
        display: 'flex',
        borderBottom: '1px solid #d1d5db',
        width: '100%',
      },
    },
      h('div', {
        style: {
          padding: '8px 12px',
          fontWeight: 600,
          color: '#111827',
          backgroundColor: '#f9fafb',
          width: '25%',
          fontSize: 14,
        },
      }, label),
      h('div', {
        style: {
          padding: '8px 12px',
          color: '#111827',
          fontWeight: bold ? 700 : 400,
          width: '75%',
          fontSize: 14,
        },
      }, value)
    );

  return h('div', {
    style: {
      width: '800px',
      minHeight: '1100px',
      backgroundColor: 'white',
      padding: '60px 80px',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Pretendard',
    },
  },
    // 제목
    h('div', {
      style: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '24px',
      },
    },
      h('div', {
        style: {
          fontSize: 28,
          fontWeight: 700,
          color: '#111827',
          letterSpacing: '0.05em',
        },
      }, '구 매 확 인 증 서')
    ),

    // 정보 테이블
    h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        borderTop: '1px solid #d1d5db',
        marginBottom: '16px',
      },
    },
      tableRow('성명', data.customerName || '(고객명)'),
      tableRow('생년월일', data.birthDate || '(생년월일)'),
      tableRow('상품명', data.productName || '(상품명)'),
      // 상품 상세 정보 (있을 경우)
      ...(detailRows.length > 0
        ? [h('div', {
            style: {
              display: 'flex',
              borderBottom: '1px solid #d1d5db',
              width: '100%',
            },
          },
            h('div', {
              style: {
                padding: '8px 12px',
                fontWeight: 600,
                color: '#111827',
                backgroundColor: '#f9fafb',
                width: '25%',
                fontSize: 14,
              },
            }, '상품 상세 정보'),
            h('div', {
              style: {
                padding: '8px 12px',
                color: '#111827',
                width: '75%',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              },
            }, ...detailRows.map(row =>
              h('div', { style: { display: 'flex' } },
                h('span', { style: { fontWeight: 500, marginRight: '8px' } }, `${row.label}:`),
                h('span', {}, row.value)
              )
            ))
          )]
        : []),
      tableRow('결제금액', `${formattedAmount}원`, true),
      tableRow('결제일자', data.paymentDate || '(결제일자)'),
      tableRow('주문번호', data.orderId),
      ...(data.managerName ? [tableRow('담당자', data.managerName)] : [])
    ),

    // 하단 영역 (발행일 및 서명)
    h('div', {
      style: {
        marginTop: 'auto',
        paddingTop: '24px',
        display: 'flex',
        flexDirection: 'column',
      },
    },
      // 발행일
      h('div', {
        style: {
          display: 'flex',
          justifyContent: 'flex-end',
          fontSize: 14,
          color: '#111827',
          marginBottom: '16px',
        },
      }, issueDate),

      // 서명
      h('div', {
        style: {
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '16px',
        },
      },
        h('div', {
          style: {
            fontSize: 14,
            color: '#111827',
          },
        }, '크루즈닷 대표이사 [인]')
      ),

      // 슬로건
      h('div', {
        style: {
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb',
          fontSize: 14,
          color: '#6b7280',
          fontStyle: 'italic',
        },
      }, '크루즈 첫여행 크루즈닷, 두번째 부터 행복하게 크루즈닷 감사합니다')
    )
  );
}

/**
 * Generates a PNG image of the certificate.
 * Uses Satori + Resvg for serverless compatibility (no Puppeteer required).
 */
export async function generateCertificatePng(data: CertificateData): Promise<Buffer> {
  try {
    // 폰트 로드
    const fontData = await loadFont();

    // React Element 생성
    const element = generateCertificateElement(data);

    // SVG 생성 (Satori)
    const svg = await satori(element as React.ReactNode, {
      width: 800,
      height: 1100,
      fonts: [
        {
          name: 'Pretendard',
          data: fontData,
          weight: 400,
          style: 'normal',
        },
      ],
    });

    // PNG 변환 (Resvg)
    const resvg = new Resvg(svg, {
      background: 'white',
      fitTo: {
        mode: 'width',
        value: 1600, // 2x resolution for quality
      },
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    console.log(`[Certificate Generator] PNG generated successfully (${pngBuffer.length} bytes)`);
    return Buffer.from(pngBuffer);

  } catch (error) {
    console.error('[Certificate Generator] Error:', error);
    throw error;
  }
}

/**
 * Test function for local development
 */
export async function testCertificateGeneration(): Promise<void> {
  const testData: CertificateData = {
    customerName: '홍길동',
    birthDate: '1990-01-01',
    productName: 'MSC 그랜디오사 지중해 7박 8일',
    paymentAmount: 2500000,
    paymentDate: new Date().toISOString().split('T')[0],
    orderId: 'TEST-ORDER-12345',
    managerName: '김담당',
  };

  try {
    console.log('[Test] Generating certificate...');
    const buffer = await generateCertificatePng(testData);
    console.log(`[Test] Certificate generated successfully (${buffer.length} bytes)`);
    return;
  } catch (error) {
    console.error('[Test] Certificate generation failed:', error);
    throw error;
  }
}
