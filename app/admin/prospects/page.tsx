'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 잠재고객관리 페이지는 전체 고객 관리의 "잠재고객" 그룹으로 통합됨
// (마케팅 자동화의 잠재고객관리가 없어지고 잠재고객으로 통합)
export default function ProspectsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/customers?customerGroup=prospects');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">리다이렉트 중...</p>
      </div>
    </div>
  );
}
