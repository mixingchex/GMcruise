import { create } from 'zustand';
import { showError, showSuccess } from '@/components/ui/Toast';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ChecklistStore {
  items: ChecklistItem[];
  isLoading: boolean;
  error: string | null;
  
  // 데이터 로드
  loadItems: () => Promise<void>;
  
  // CRUD 작업
  addItem: (text: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  
  // 로컬 상태 관리
  setItems: (items: ChecklistItem[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 마이그레이션
  migrateFromLocalStorage: () => Promise<void>;
}

// 기본 체크리스트 항목들
const defaultItems: Omit<ChecklistItem, 'id'>[] = [
  { text: '여권 및 신분증', completed: false },
  { text: '크루즈 승선권/E-Ticket', completed: false },
  { text: '해외 사용 가능 신용카드', completed: false },
  { text: '상비약(멀미약, 소화제 등)', completed: false },
  { text: '선상 정찬용 의류', completed: false },
  { text: '편안한 일상복', completed: false },
  { text: '수영복 및 선글라스', completed: false },
  { text: '충전기 및 어댑터', completed: false },
  { text: '카메라 또는 스마트폰', completed: false },
  { text: '여행용 세면도구', completed: false },
];

// localStorage 키 (마이그레이션용)
const STORAGE_KEY = 'cruise-guide-checklist';
const MIGRATION_KEY = 'checklist-migrated-to-server';

export const useChecklistStore = create<ChecklistStore>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  
  // 서버에서 데이터 로드 (localStorage fallback 제거)
  loadItems: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/checklist', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load checklist');
      }

      const data = await response.json();
      
      if (Array.isArray(data.items)) {
        // 서버 형식(id: number)을 클라이언트 형식(id: string)으로 변환
        const items: ChecklistItem[] = data.items.map((item: any) => ({
          id: item.id.toString(),
          text: item.text || '',
          completed: item.completed || false,
        }));
        set({ items });
      } else {
        set({ items: [] });
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
      const errorMsg = '체크리스트를 불러오는데 실패했습니다. 인터넷 연결을 확인해주세요.';
      set({ items: [], error: errorMsg });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // 항목 추가 (API만 사용)
  addItem: async (text: string) => {
    try {
      const response = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to add checklist item');
      }

      const data = await response.json();
      if (data.item) {
        // 서버 형식을 클라이언트 형식으로 변환
        const newItem: ChecklistItem = {
          id: data.item.id.toString(),
          text: data.item.text || '',
          completed: data.item.completed || false,
        };
        set((state) => ({ items: [...state.items, newItem] }));
        showSuccess('항목이 추가되었습니다.');
      } else {
        throw new Error('서버 응답 형식 오류');
      }
    } catch (error) {
      console.error('Error adding checklist item:', error);
      const errorMsg = '항목 추가에 실패했습니다. 인터넷 연결을 확인해주세요.';
      set({ error: errorMsg });
      showError(errorMsg);
    }
  },
  
  // 항목 삭제 (API만 사용)
  removeItem: async (id: string) => {
    try {
      const response = await fetch('/api/checklist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: parseInt(id) }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete checklist item');
      }

      // 성공 시 로컬 상태에서 제거
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));
      showSuccess('항목이 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      const errorMsg = '항목 삭제에 실패했습니다. 인터넷 연결을 확인해주세요.';
      set({ error: errorMsg });
      showError(errorMsg);
    }
  },
  
  // 완료 상태 토글 (API만 사용)
  toggleItem: async (id: string) => {
    // 현재 상태 확인
    const currentItem = get().items.find(item => item.id === id);
    if (!currentItem) return;

    const newCompleted = !currentItem.completed;

    try {
      const response = await fetch('/api/checklist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: parseInt(id), completed: newCompleted }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle checklist item');
      }

      const data = await response.json();
      if (data.item) {
        // 서버 형식을 클라이언트 형식으로 변환
        const updatedItem: ChecklistItem = {
          id: data.item.id.toString(),
          text: data.item.text || '',
          completed: data.item.completed || false,
        };
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? updatedItem : item
          ),
        }));
      } else {
        throw new Error('서버 응답 형식 오류');
      }
    } catch (error) {
      console.error('Error toggling checklist item:', error);
      const errorMsg = '상태 변경에 실패했습니다. 인터넷 연결을 확인해주세요.';
      set({ error: errorMsg });
      showError(errorMsg);
    }
  },
  
  // 로컬 상태 직접 설정
  setItems: (items) => set({ items }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // LocalStorage에서 서버로 마이그레이션
  migrateFromLocalStorage: async () => {
    if (typeof window === 'undefined') return;
    
    // 이미 마이그레이션 했으면 스킵
    const migrated = localStorage.getItem(MIGRATION_KEY);
    if (migrated) return;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        localStorage.setItem(MIGRATION_KEY, 'true');
        return;
      }

      const localItems: ChecklistItem[] = JSON.parse(saved);
      
      if (!Array.isArray(localItems) || localItems.length === 0) {
        localStorage.setItem(MIGRATION_KEY, 'true');
        return;
      }

      // 각 항목을 서버로 전송
      for (const item of localItems) {
        await fetch('/api/checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text: item.text }),
        });
        
        // 완료 상태도 반영 (필요시)
        // if (item.completed) {
        //   await toggleItem(newId);
        // }
      }

      // 마이그레이션 완료 표시
      localStorage.setItem(MIGRATION_KEY, 'true');
      localStorage.removeItem(STORAGE_KEY); // 기존 데이터 삭제
      
      console.log(`✅ ${localItems.length}개 체크리스트 항목 마이그레이션 완료`);
      
      // 서버에서 다시 로드
      await get().loadItems();
    } catch (error) {
      console.error('Migration error:', error);
    }
  },
}));
