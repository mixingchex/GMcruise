'use client';

import { useState, useEffect } from 'react';
import { FiX, FiSend, FiLock, FiUnlock } from 'react-icons/fi';

interface CustomerNote {
  id: number;
  content: string;
  isInternal: boolean;
  createdByLabel: string;
  createdByName: string;
  createdAt: string;
}

interface Props {
  customerId: number;
  customerName: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNoteAdded?: () => void;
}

export default function CustomerNoteModal({ customerId, customerName, isOpen, onClose, onNoteAdded }: Props) {
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  // 고객 기록 로드
  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/customers/${customerId}/notes`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 기록 작성
  const handleSubmit = async () => {
    if (!newNote.trim()) {
      alert('기록 내용을 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/admin/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: newNote.trim(),
          isInternal,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || '기록 작성에 실패했습니다.');
      }

      // 성공
      setNewNote('');
      setIsInternal(false);
      await loadNotes();
      if (onNoteAdded) {
        onNoteAdded();
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      alert(error instanceof Error ? error.message : '기록 작성에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      loadNotes();
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">고객 기록</h2>
            <p className="text-sm text-gray-600 mt-1">
              {customerName || `고객 ID: ${customerId}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* 기록 목록 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              아직 기록이 없습니다.
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`p-4 rounded-lg border ${
                  note.isInternal
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                      {note.createdByLabel}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {note.createdByName}
                    </span>
                    {note.isInternal && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                        내부 기록
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(note.createdAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </div>

        {/* 기록 작성 폼 */}
        <div className="p-6 border-t bg-gray-50">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  {isInternal ? <FiLock size={14} /> : <FiUnlock size={14} />}
                  내부 기록 (다른 담당자에게만 공개)
                </span>
              </label>
            </div>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="고객에 대한 기록을 작성하세요..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Cmd/Ctrl + Enter로 저장
              </p>
              <button
                onClick={handleSubmit}
                disabled={isSaving || !newNote.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend size={16} />
                {isSaving ? '저장 중...' : '기록 작성'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

