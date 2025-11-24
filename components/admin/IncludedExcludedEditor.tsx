// components/admin/IncludedExcludedEditor.tsx
// 포함/불포함 사항 편집기

'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiX, FiEdit2, FiChevronDown } from 'react-icons/fi';
import suggestionsData from '@/data/included-excluded-suggestions.json';

interface IncludedExcludedEditorProps {
  included: string[];
  excluded: string[];
  onChange: (included: string[], excluded: string[]) => void;
}

export default function IncludedExcludedEditor({
  included,
  excluded,
  onChange
}: IncludedExcludedEditorProps) {
  const [editingIncludedIndex, setEditingIncludedIndex] = useState<number | null>(null);
  const [editingExcludedIndex, setEditingExcludedIndex] = useState<number | null>(null);
  const [newIncludedItem, setNewIncludedItem] = useState('');
  const [newExcludedItem, setNewExcludedItem] = useState('');
  const [showIncludedDropdown, setShowIncludedDropdown] = useState(false);
  const [showExcludedDropdown, setShowExcludedDropdown] = useState(false);
  const [includedSuggestions, setIncludedSuggestions] = useState<string[]>([]);
  const [excludedSuggestions, setExcludedSuggestions] = useState<string[]>([]);

  // 추천 항목 필터링
  useEffect(() => {
    if (newIncludedItem.trim()) {
      const filtered = suggestionsData.included.filter(item =>
        item.toLowerCase().includes(newIncludedItem.toLowerCase())
      ).slice(0, 30);
      setIncludedSuggestions(filtered);
      setShowIncludedDropdown(filtered.length > 0);
    } else {
      setIncludedSuggestions(suggestionsData.included.slice(0, 30));
      setShowIncludedDropdown(false);
    }
  }, [newIncludedItem]);

  useEffect(() => {
    if (newExcludedItem.trim()) {
      const filtered = suggestionsData.excluded.filter(item =>
        item.toLowerCase().includes(newExcludedItem.toLowerCase())
      ).slice(0, 30);
      setExcludedSuggestions(filtered);
      setShowExcludedDropdown(filtered.length > 0);
    } else {
      setExcludedSuggestions(suggestionsData.excluded.slice(0, 30));
      setShowExcludedDropdown(false);
    }
  }, [newExcludedItem]);

  const addIncludedItem = (item?: string) => {
    const itemToAdd = item || newIncludedItem.trim();
    if (itemToAdd) {
      onChange([...included, itemToAdd], excluded);
      setNewIncludedItem('');
      setShowIncludedDropdown(false);
    }
  };

  const addExcludedItem = (item?: string) => {
    const itemToAdd = item || newExcludedItem.trim();
    if (itemToAdd) {
      onChange(included, [...excluded, itemToAdd]);
      setNewExcludedItem('');
      setShowExcludedDropdown(false);
    }
  };

  const updateIncludedItem = (index: number, value: string) => {
    const newIncluded = [...included];
    newIncluded[index] = value;
    onChange(newIncluded, excluded);
    setEditingIncludedIndex(null);
  };

  const updateExcludedItem = (index: number, value: string) => {
    const newExcluded = [...excluded];
    newExcluded[index] = value;
    onChange(included, newExcluded);
    setEditingExcludedIndex(null);
  };

  const removeIncludedItem = (index: number) => {
    if (confirm('이 항목을 삭제하시겠습니까?')) {
      const newIncluded = included.filter((_, i) => i !== index);
      onChange(newIncluded, excluded);
    }
  };

  const removeExcludedItem = (index: number) => {
    if (confirm('이 항목을 삭제하시겠습니까?')) {
      const newExcluded = excluded.filter((_, i) => i !== index);
      onChange(included, newExcluded);
    }
  };

  return (
    <div className="space-y-8">
      {/* 포함 사항 - 위쪽 */}
      <div className="space-y-4 bg-green-50 p-6 rounded-lg border-2 border-green-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-green-700 flex items-center gap-2">
            <span className="text-2xl">✅</span>
            포함 사항 설정
          </h3>
        </div>
        
        <div className="space-y-2 mb-4">
          {included.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg border-2 border-dashed border-green-300">
              포함 사항이 없습니다. 아래에서 추가해주세요.
            </div>
          ) : (
            included.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-4 bg-white border-2 border-green-300 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                {editingIncludedIndex === index ? (
                  <input
                    type="text"
                    defaultValue={item}
                    onBlur={(e) => updateIncludedItem(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateIncludedItem(index, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingIncludedIndex(null);
                      }
                    }}
                    autoFocus
                    className="flex-1 px-3 py-2 border-2 border-green-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                ) : (
                  <>
                    <span className="flex-1 text-base text-gray-800 font-medium">{item}</span>
                    <button
                      onClick={() => setEditingIncludedIndex(index)}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                      title="수정"
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      onClick={() => removeIncludedItem(index)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <FiX size={18} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="relative flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newIncludedItem}
              onChange={(e) => setNewIncludedItem(e.target.value)}
              onFocus={() => setShowIncludedDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addIncludedItem();
                } else if (e.key === 'Escape') {
                  setShowIncludedDropdown(false);
                }
              }}
              placeholder="포함 사항을 입력하거나 추천 항목을 선택하세요..."
              className="w-full px-4 py-3 pr-10 border-2 border-green-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base"
            />
            <button
              type="button"
              onClick={() => setShowIncludedDropdown(!showIncludedDropdown)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <FiChevronDown size={20} className={showIncludedDropdown ? 'rotate-180 transition-transform' : ''} />
            </button>
            {showIncludedDropdown && includedSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border-2 border-green-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {includedSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => addIncludedItem(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-green-50 focus:bg-green-50 focus:outline-none transition-colors text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => addIncludedItem()}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-base flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <FiPlus size={20} />
            <span>추가</span>
          </button>
        </div>
      </div>

      {/* 불포함 사항 - 아래쪽 */}
      <div className="space-y-4 bg-red-50 p-6 rounded-lg border-2 border-red-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-red-700 flex items-center gap-2">
            <span className="text-2xl">❌</span>
            불포함 사항 설정
          </h3>
        </div>
        
        <div className="space-y-2 mb-4">
          {excluded.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg border-2 border-dashed border-red-300">
              불포함 사항이 없습니다. 아래에서 추가해주세요.
            </div>
          ) : (
            excluded.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-4 bg-white border-2 border-red-300 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                {editingExcludedIndex === index ? (
                  <input
                    type="text"
                    defaultValue={item}
                    onBlur={(e) => updateExcludedItem(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateExcludedItem(index, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingExcludedIndex(null);
                      }
                    }}
                    autoFocus
                    className="flex-1 px-3 py-2 border-2 border-red-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                ) : (
                  <>
                    <span className="flex-1 text-base text-gray-800 font-medium">{item}</span>
                    <button
                      onClick={() => setEditingExcludedIndex(index)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                      title="수정"
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      onClick={() => removeExcludedItem(index)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <FiX size={18} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="relative flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newExcludedItem}
              onChange={(e) => setNewExcludedItem(e.target.value)}
              onFocus={() => setShowExcludedDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addExcludedItem();
                } else if (e.key === 'Escape') {
                  setShowExcludedDropdown(false);
                }
              }}
              placeholder="불포함 사항을 입력하거나 추천 항목을 선택하세요..."
              className="w-full px-4 py-3 pr-10 border-2 border-red-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-base"
            />
            <button
              type="button"
              onClick={() => setShowExcludedDropdown(!showExcludedDropdown)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <FiChevronDown size={20} className={showExcludedDropdown ? 'rotate-180 transition-transform' : ''} />
            </button>
            {showExcludedDropdown && excludedSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border-2 border-red-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {excludedSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => addExcludedItem(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 focus:bg-red-50 focus:outline-none transition-colors text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => addExcludedItem()}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-base flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <FiPlus size={20} />
            <span>추가</span>
          </button>
        </div>
      </div>
    </div>
  );
}




















