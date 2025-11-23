'use client';

import { useState } from 'react';

interface LandingPaymentButtonProps {
  productPurchase: {
    enabled?: boolean;
    paymentProvider?: 'payapp' | 'welcomepay' | string;
    productName?: string;
    sellingPrice?: number | string | null;
    useQuantity?: boolean;
    purchaseQuantity?: number | string | null;
    paymentType?: 'basic' | 'cardInput' | string;
    paymentGroupId?: number | string | null;
    dbGroupId?: number | string | null;
  };
  landingPageId: number;
  landingPageSlug: string;
}

export function LandingPaymentButton({ productPurchase, landingPageId, landingPageSlug }: LandingPaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentRequest = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // 랜딩페이지 결제 요청 API 호출
      const response = await fetch(`/api/public/landing-pages/${landingPageSlug}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || '결제 요청에 실패했습니다.');
      }

      if (data.paymentUrl) {
        // PG 결제창으로 리다이렉트
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('결제 URL을 받지 못했습니다.');
      }
    } catch (error) {
      console.error('[LandingPaymentButton] Payment request error:', error);
      alert(error instanceof Error ? error.message : '결제 요청 중 오류가 발생했습니다. 다시 시도해주세요.');
      setIsProcessing(false);
    }
  };

  return (
    <button
      type="button"
      className="lp-secondary-button"
      onClick={handlePaymentRequest}
      disabled={isProcessing}
    >
      {isProcessing ? '처리 중...' : '결제 요청하기'}
    </button>
  );
}

