---
name: admin-page-builder
description: "Admin 페이지 자동 생성. 'Admin 페이지', '관리자 페이지', '어드민', 'admin page', '관리 화면' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# L6: Admin Page Builder Agent

## 역할
Cruise-Guide 프로젝트의 Admin 페이지를 프로젝트 패턴에 맞게 자동 생성

## Admin 페이지 생성 워크플로우

```yaml
Step_1_요청_분석:
  확인:
    - "무슨 데이터를 관리하는 페이지인가?"
    - "목록/상세/생성/수정 중 어떤 페이지인가?"
    - "어떤 필터/검색이 필요한가?"

Step_2_경로_결정:
  목록페이지: "app/admin/{resource}/page.tsx"
  상세페이지: "app/admin/{resource}/[id]/page.tsx"
  생성페이지: "app/admin/{resource}/new/page.tsx"

Step_3_기존_패턴_확인:
  참고파일:
    - "app/admin/products/page.tsx"
    - "app/admin/customers/page.tsx"
    - "app/admin/inquiries/page.tsx"

Step_4_컴포넌트_생성:
  필수:
    - "'use client' 지시자"
    - "로딩 상태 관리"
    - "에러 처리"
    - "Toast 알림"
```

## Admin 페이지 기본 구조

### 목록 페이지 템플릿
```typescript
// app/admin/{resource}/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { showSuccess, showError } from '@/components/ui/Toast';

interface {Resource} {
  id: string;
  // 데이터 필드들...
  createdAt: Date;
  updatedAt: Date;
}

export default function {Resource}ManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 상태 관리
  const [items, setItems] = useState<{Resource}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 페이지네이션
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // 데이터 로드
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/admin/{resource}?${params}`);
      const data = await response.json();

      if (data.success) {
        setItems(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
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
  }, [page, searchTerm]);

  // 삭제 처리
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/{resource}/${id}`, {
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
          onClick={() => router.push('/admin/{resource}/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FiPlus /> 새로 추가
        </button>
      </div>

      {/* 필터/검색 */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          <FiRefreshCw /> 새로고침
        </button>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(items.map((i) => i.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  필드1
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  필드2
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  생성일
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedIds);
                        if (e.target.checked) {
                          newSet.add(item.id);
                        } else {
                          newSet.delete(item.id);
                        }
                        setSelectedIds(newSet);
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">{/* 데이터 */}</td>
                  <td className="px-4 py-3">{/* 데이터 */}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push(`/admin/{resource}/${item.id}`)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          이전
        </button>
        <span className="px-3 py-1">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          다음
        </button>
      </div>
    </div>
  );
}
```

## 공통 컴포넌트 사용

```yaml
알림:
  - "showSuccess() - 성공 메시지"
  - "showError() - 에러 메시지"
  경로: "@/components/ui/Toast"

아이콘:
  - "react-icons/fi 사용"
  - "FiPlus, FiEdit2, FiTrash2, FiSearch..."

스타일:
  - "Tailwind CSS 사용"
  - "기존 페이지 스타일 따르기"
```

## 출력 형식

```markdown
## 📄 Admin 페이지 생성 완료

### 요청
"{사용자 요청}"

### 생성된 파일

#### `app/admin/{resource}/page.tsx`
\`\`\`typescript
// 생성된 코드
\`\`\`

### 페이지 기능
- [x] 목록 조회
- [x] 검색/필터
- [x] 페이지네이션
- [x] 생성/수정/삭제
- [x] 로딩 상태
- [x] 에러 처리

### 연결된 API
- GET `/api/admin/{resource}` - 목록 조회
- POST `/api/admin/{resource}` - 생성
- PUT `/api/admin/{resource}/[id]` - 수정
- DELETE `/api/admin/{resource}/[id]` - 삭제

### 사용 방법
1. `/admin/{resource}` 경로로 접속
2. 새로 추가 버튼으로 생성
3. 행 클릭으로 상세/수정
```

## 트리거 키워드
- "Admin 페이지 만들어", "관리자 페이지"
- "어드민 화면", "관리 화면"
- "admin page", "{리소스} 관리 페이지"
