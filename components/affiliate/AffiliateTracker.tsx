'use client';

import { useEffect } from 'react';

interface AffiliateTrackerProps {
  mallUserId: string;
  affiliateCode?: string | null;
}

export default function AffiliateTracker({ mallUserId, affiliateCode }: AffiliateTrackerProps) {
  useEffect(() => {
    if (!mallUserId) return;

    // 서버 API를 통해 HttpOnly 쿠키 설정 — XSS로 쿠키 탈취 방지
    fetch('/api/affiliate/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mallUserId, affiliateCode: affiliateCode ?? null }),
      credentials: 'include',
    }).catch(() => {}); // 추적 실패는 무시 (결제 흐름에 영향 없음)
  }, [mallUserId, affiliateCode]);

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null;
}










