'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 메인몰 고객 관리 페이지는 전체 고객 관리의 "크루즈몰 고객" 그룹으로 통합됨
export default function MallCustomersRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/customers?customerGroup=mall');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">리다이렉트 중...</p>
      </div>
    </div>
  );
}
