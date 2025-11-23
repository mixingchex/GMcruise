'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 크루즈가이드 고객 페이지는 전체 고객 관리의 "구매 고객" 그룹으로 통합됨
export default function CruiseGuideCustomersRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/customers?customerGroup=purchase');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">리다이렉트 중...</p>
      </div>
    </div>
  );
}
