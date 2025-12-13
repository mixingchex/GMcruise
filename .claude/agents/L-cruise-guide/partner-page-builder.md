---
name: partner-page-builder
description: "Partner 페이지 자동 생성. 'Partner 페이지', '파트너 페이지', '파트너 화면', 'partner page' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# L7: Partner Page Builder Agent

## 역할
Cruise-Guide 프로젝트의 Partner 페이지를 프로젝트 패턴에 맞게 자동 생성

## Partner vs Admin 차이점

```yaml
Admin:
  - "전체 시스템 관리"
  - "모든 파트너의 데이터 접근"
  - "시스템 설정 변경 가능"

Partner:
  - "자신의 데이터만 관리"
  - "partnerId 기반 데이터 필터링"
  - "제한된 기능만 사용"
```

## Partner 페이지 생성 워크플로우

```yaml
Step_1_요청_분석:
  확인:
    - "무슨 데이터를 관리하는 페이지인가?"
    - "파트너에게 필요한 기능인가?"
    - "데이터 접근 범위는?"

Step_2_경로_결정:
  기본: "app/partner/[partnerId]/{resource}/page.tsx"
  클라이언트: "app/partner/[partnerId]/{resource}/{Resource}Client.tsx"

Step_3_인증_패턴:
  확인:
    - "파트너 세션 체크"
    - "partnerId 파라미터 검증"
    - "권한 확인"

Step_4_API_연결:
  경로: "/api/partner/{resource}"
  인증: "getPartnerSession()"
```

## Partner 페이지 기본 구조

### 페이지 컴포넌트
```typescript
// app/partner/[partnerId]/{resource}/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/session.server';
import {Resource}Client from './{Resource}Client';

interface PageProps {
  params: Promise<{ partnerId: string }>;
}

export default async function {Resource}Page({ params }: PageProps) {
  const { partnerId } = await params;
  const session = await getServerSession();

  // 인증 체크
  if (!session || session.partnerId !== partnerId) {
    redirect('/login');
  }

  return <{Resource}Client partnerId={partnerId} />;
}
```

### 클라이언트 컴포넌트
```typescript
// app/partner/[partnerId]/{resource}/{Resource}Client.tsx
'use client';

import { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import { showSuccess, showError } from '@/components/ui/Toast';

interface {Resource}ClientProps {
  partnerId: string;
}

interface {Resource}Item {
  id: string;
  // 데이터 필드들...
  createdAt: Date;
}

export default function {Resource}Client({ partnerId }: {Resource}ClientProps) {
  const [items, setItems] = useState<{Resource}Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 데이터 로드
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/partner/{resource}?search=${searchTerm}`);
      const data = await response.json();

      if (data.success) {
        setItems(data.data);
      } else {
        showError(data.error || '데이터를 불러오는데 실패했습니다');
      }
    } catch (error) {
      showError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  // 삭제 처리
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/partner/{resource}/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        showSuccess('삭제되었습니다');
        fetchData();
      } else {
        showError(data.error || '삭제에 실패했습니다');
      }
    } catch (error) {
      showError('서버 오류가 발생했습니다');
    }
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{리소스명} 관리</h1>
        <button
          onClick={() => {/* 모달 열기 또는 페이지 이동 */}}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FiPlus /> 새로 추가
        </button>
      </div>

      {/* 검색 */}
      <div className="relative mb-4">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      {/* 컨텐츠 */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          데이터가 없습니다
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  {/* 데이터 표시 */}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {/* 수정 */}}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Partner API 패턴

```typescript
// app/api/partner/{resource}/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPartnerSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getPartnerSession(request);

  if (!session?.partnerId) {
    return NextResponse.json(
      { success: false, error: '파트너 인증이 필요합니다' },
      { status: 401 }
    );
  }

  try {
    const data = await prisma.resource.findMany({
      where: { partnerId: session.partnerId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '서버 오류' },
      { status: 500 }
    );
  }
}
```

## 주요 Partner 기능

```yaml
고객관리:
  - "리드 목록"
  - "고객 상세"
  - "그룹 관리"

메시지:
  - "메시지 발송"
  - "예약 메시지"
  - "발송 내역"

통계:
  - "대시보드"
  - "판매 현황"
  - "수익 분석"
```

## 출력 형식

```markdown
## 📄 Partner 페이지 생성 완료

### 요청
"{사용자 요청}"

### 생성된 파일

#### 1. `app/partner/[partnerId]/{resource}/page.tsx`
서버 컴포넌트 - 인증 처리

#### 2. `app/partner/[partnerId]/{resource}/{Resource}Client.tsx`
클라이언트 컴포넌트 - UI 및 상호작용

### 페이지 기능
- [x] 파트너 인증 체크
- [x] 자기 데이터만 조회
- [x] CRUD 기능
- [x] 검색/필터

### 연결된 API
- `/api/partner/{resource}` - 파트너 전용 API

### 접속 경로
`/partner/{partnerId}/{resource}`
```

## 트리거 키워드
- "Partner 페이지", "파트너 페이지"
- "파트너 화면", "파트너 관리"
- "partner page", "{리소스} 파트너 페이지"
