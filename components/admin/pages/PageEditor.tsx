// components/admin/pages/PageEditor.tsx
// 실제 페이지를 iframe으로 로드하고 편집 가능하게 만드는 컴포넌트

'use client';

import { useState, useEffect, useRef } from 'react';
import { FiEdit, FiSave, FiX, FiImage, FiSmile, FiType } from 'react-icons/fi';
import EmojiPicker from './EmojiPicker';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

interface PageContent {
  id: number;
  pagePath: string;
  section: string;
  itemId: string | null;
  contentType: string;
  content: any;
  order: number;
  isActive: boolean;
}

interface PageEditorProps {
  pagePath: string;
  contents: PageContent[];
  onSave: (id: number, data: any) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onAdd: (section: string, contentType: string) => Promise<void>;
  autoEditId?: number | null; // 자동으로 편집할 콘텐츠 ID
}

export default function PageEditor({
  pagePath,
  contents,
  onSave,
  onDelete,
  onAdd,
  autoEditId,
}: PageEditorProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<any>(null);

  // 콘텐츠를 섹션별로 그룹화
  useEffect(() => {
    const contentMap: any = {};
    contents.forEach((c) => {
      if (!contentMap[c.section]) {
        contentMap[c.section] = {};
      }
      contentMap[c.section][c.itemId || 'default'] = c;
    });
    setPageContent(contentMap);
  }, [contents]);

  // 자동 편집 모드 진입
  useEffect(() => {
    if (autoEditId && contents.length > 0) {
      const contentToEdit = contents.find(c => c.id === autoEditId);
      if (contentToEdit) {
        setEditingId(contentToEdit.id);
        setEditData({
          contentType: contentToEdit.contentType,
          content: { ...contentToEdit.content },
          order: contentToEdit.order,
        });
      }
    }
  }, [autoEditId, contents]);

  const getContent = (section: string, itemId: string | null) => {
    return pageContent?.[section]?.[itemId || 'default'] || null;
  };

  const startEdit = (content: PageContent) => {
    setEditingId(content.id);
    setEditData({
      contentType: content.contentType,
      content: { ...content.content },
      order: content.order,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
    setShowEmojiPicker(null);
  };

  const handleSave = async () => {
    if (!editingId) return;
    await onSave(editingId, editData);
    cancelEdit();
  };

  const renderEditableElement = (
    content: PageContent | null,
    section: string,
    itemId: string | null,
    children: React.ReactNode,
    className: string = '',
    contentType?: string
  ) => {
    const isEditing = content && editingId === content.id;
    const isHovered = content && hoveredId === content.id;
    const detectedType = contentType || content?.contentType || 'text';

    if (isEditing && content) {
      return renderEditor(content);
    }

    return (
      <div
        className={`relative group ${className}`}
        onMouseEnter={() => {
          if (content) {
            setHoveredId(content.id);
          }
        }}
        onMouseLeave={() => setHoveredId(null)}
        onClick={(e) => {
          // 콘텐츠가 없을 때 클릭하면 바로 추가
          if (!content) {
            e.preventDefault();
            e.stopPropagation();
            const finalContentType = contentType ||
              (section.includes('emoji') || itemId?.includes('emoji') ? 'emoji' :
                section.includes('image') || itemId?.includes('image') ? 'image' :
                  section.includes('button') || itemId?.includes('button') ? 'button' : 'text');
            onAdd(section, finalContentType);
          }
        }}
        data-content-id={content?.id}
        data-section={section}
        data-item-id={itemId}
      >
        {children}
        {content && isHovered && (
          <div className="absolute top-0 right-0 z-50 flex gap-1 bg-white border border-gray-300 rounded shadow-lg p-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                startEdit(content);
              }}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="편집"
            >
              <FiEdit size={16} />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('정말 삭제하시겠습니까?')) {
                  onDelete(content.id);
                }
              }}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="삭제"
            >
              ×
            </button>
          </div>
        )}
        {!content && (
          <div className="absolute inset-0 border-2 border-dashed border-blue-300 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-blue-50 bg-opacity-50 z-10 cursor-pointer">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const finalContentType = contentType ||
                  (section.includes('emoji') || itemId?.includes('emoji') ? 'emoji' :
                    section.includes('image') || itemId?.includes('image') ? 'image' :
                      section.includes('button') || itemId?.includes('button') ? 'button' : 'text');
                onAdd(section, finalContentType);
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700"
            >
              + 콘텐츠 추가
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderEditor = (content: PageContent) => {
    return (
      <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg space-y-3 my-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            편집 중: {content.contentType}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm"
            >
              <FiSave size={14} /> 저장
            </button>
            <button
              onClick={cancelEdit}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 flex items-center gap-1 text-sm"
            >
              <FiX size={14} /> 취소
            </button>
          </div>
        </div>

        {/* 콘텐츠 타입 선택 */}
        <div>
          <label className="block text-sm font-semibold mb-1">콘텐츠 타입</label>
          <select
            value={editData.contentType}
            onChange={(e) => {
              const newType = e.target.value;
              const defaultContent: any = {
                text: { text: '' },
                emoji: { emoji: '✨' },
                image: { image: '' },
                button: { title: '', link: '#' },
                link: { text: '', link: '#' },
                list: { items: [] },
              };
              setEditData({
                ...editData,
                contentType: newType,
                content: defaultContent[newType] || {},
              });
            }}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="text">텍스트</option>
            <option value="emoji">이모티콘</option>
            <option value="image">이미지</option>
            <option value="button">버튼</option>
            <option value="link">링크</option>
            <option value="list">리스트</option>
          </select>
        </div>

        {/* 텍스트 편집 */}
        {editData.contentType === 'text' && (
          <div>
            <label className="block text-sm font-semibold mb-1">텍스트</label>
            <textarea
              value={editData.content.text || ''}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  content: { ...editData.content, text: e.target.value },
                })
              }
              className="w-full px-3 py-2 border rounded-lg"
              rows={4}
            />
          </div>
        )}

        {/* 이모티콘 편집 */}
        {editData.contentType === 'emoji' && (
          <div className="relative">
            <label className="block text-sm font-semibold mb-1">이모티콘 (100개 추천)</label>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-4xl p-2 border rounded-lg bg-white min-w-[60px] text-center">
                {editData.content.emoji || '✨'}
              </div>
              <button
                onClick={() => setShowEmojiPicker(showEmojiPicker === `emoji-${content.id}` ? null : `emoji-${content.id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FiSmile /> 100개 추천 이모티콘 선택
              </button>
            </div>
            <input
              type="text"
              value={editData.content.emoji || ''}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  content: { ...editData.content, emoji: e.target.value },
                })
              }
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="이모티콘 직접 입력 (예: 🎉)"
            />
            {showEmojiPicker === `emoji-${content.id}` && (
              <div className="mt-2 relative">
                <EmojiPicker
                  value={editData.content.emoji || ''}
                  onChange={(emoji) => {
                    setEditData({
                      ...editData,
                      content: { ...editData.content, emoji },
                    });
                    setShowEmojiPicker(null);
                  }}
                  onClose={() => setShowEmojiPicker(null)}
                />
              </div>
            )}
          </div>
        )}

        {/* 이미지 편집 */}
        {editData.contentType === 'image' && (
          <div>
            <label className="block text-sm font-semibold mb-1">이미지</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                try {
                  const formData = new FormData();
                  formData.append('file', file);

                  const res = await fetch('/api/admin/pages/upload', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData,
                  });

                  const data = await res.json();
                  if (data.ok) {
                    setEditData({
                      ...editData,
                      content: { ...editData.content, image: data.url },
                    });
                  } else {
                    alert('업로드 실패: ' + data.error);
                  }
                } catch (error) {
                  console.error('Upload error:', error);
                  alert('업로드 중 오류가 발생했습니다.');
                }
              }}
              className="w-full px-3 py-2 border rounded-lg mb-2"
            />
            <input
              type="text"
              value={editData.content.image || ''}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  content: { ...editData.content, image: e.target.value },
                })
              }
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="또는 이미지 URL 직접 입력"
            />
            {editData.content.image && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={editData.content.image}
                alt="Preview"
                className="mt-2 max-w-xs rounded-lg border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
        )}

        {/* 버튼 편집 */}
        {editData.contentType === 'button' && (
          <>
            <div>
              <label className="block text-sm font-semibold mb-1">버튼 텍스트</label>
              <input
                type="text"
                value={editData.content.title || ''}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    content: { ...editData.content, title: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">링크 URL</label>
              <input
                type="text"
                value={editData.content.link || ''}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    content: { ...editData.content, link: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </>
        )}

        {/* 링크 편집 */}
        {editData.contentType === 'link' && (
          <>
            <div>
              <label className="block text-sm font-semibold mb-1">링크 텍스트</label>
              <input
                type="text"
                value={editData.content.text || ''}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    content: { ...editData.content, text: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">링크 URL</label>
              <input
                type="text"
                value={editData.content.link || ''}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    content: { ...editData.content, link: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </>
        )}

        {/* 리스트 편집 */}
        {editData.contentType === 'list' && (
          <div>
            <label className="block text-sm font-semibold mb-1">
              리스트 항목 (각 항목: 브이표시 이모티콘 + 텍스트)
            </label>
            <div className="space-y-3">
              {(editData.content.items || []).map((item: any, idx: number) => {
                const itemData = typeof item === 'string'
                  ? { emoji: '✓', text: item }
                  : { emoji: item.emoji || '✓', text: item.text || item };
                const pickerId = `list-${content.id}-${idx}`;

                return (
                  <div key={idx} className="p-3 border rounded-lg bg-white relative">
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-xs text-gray-600 w-20">브이표시:</label>
                      <div className="flex items-center gap-2 flex-1 relative">
                        <div className="text-2xl p-1 border rounded bg-gray-50 min-w-[40px] text-center">
                          {itemData.emoji}
                        </div>
                        <button
                          onClick={() => {
                            setShowEmojiPicker(showEmojiPicker === pickerId ? null : pickerId);
                          }}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                        >
                          <FiSmile size={12} /> 100개 선택
                        </button>
                        {showEmojiPicker === pickerId && (
                          <div className="absolute top-full left-0 mt-1 z-50">
                            <EmojiPicker
                              value={itemData.emoji}
                              onChange={(emoji) => {
                                const newItems = [...(editData.content.items || [])];
                                newItems[idx] = { emoji, text: itemData.text };
                                setEditData({
                                  ...editData,
                                  content: { ...editData.content, items: newItems },
                                });
                                setShowEmojiPicker(null);
                              }}
                              onClose={() => setShowEmojiPicker(null)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 w-20">텍스트:</label>
                      <input
                        type="text"
                        value={itemData.text}
                        onChange={(e) => {
                          const newItems = [...(editData.content.items || [])];
                          newItems[idx] = { emoji: itemData.emoji, text: e.target.value };
                          setEditData({
                            ...editData,
                            content: { ...editData.content, items: newItems },
                          });
                        }}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        placeholder="항목 텍스트 입력"
                      />
                      <button
                        onClick={() => {
                          const newItems = (editData.content.items || []).filter((_: any, i: number) => i !== idx);
                          setEditData({
                            ...editData,
                            content: { ...editData.content, items: newItems },
                          });
                        }}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => {
                  const newItems = [...(editData.content.items || []), { emoji: '✓', text: '새 항목' }];
                  setEditData({
                    ...editData,
                    content: { ...editData.content, items: newItems },
                  });
                }}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                + 항목 추가
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 서비스 페이지 렌더링 (실제 페이지 구조 그대로)
  if (pagePath === '/support/service') {
    const headerTitleContent = getContent('header', 'title');
    const headerSubtitleContent = getContent('header', 'subtitle');
    const highlightTitleContent = getContent('highlight', 'title');
    const highlightTextContent = getContent('highlight', 'text');
    const highlightButtonContent = getContent('highlight', 'button');

    // 서비스 목록
    const serviceContents = contents.filter(c => c.section === 'services').sort((a, b) => a.order - b.order);
    const defaultServices = [
      { icon: '🧞', title: 'AI 크루즈 가이드 지니', description: '24시간 언제든지 크루즈 여행에 대한 질문을 할 수 있는 AI 어시스턴트입니다.', features: ['길찾기 및 경로 안내', '사진 검색 및 갤러리', '실시간 질문 응답', '다국어 지원'] },
      { icon: '📱', title: '모바일 앱 서비스', description: '스마트폰에서 언제든지 크루즈 정보를 확인하고, 여행 준비를 도와드립니다.', features: ['여행 준비물 체크리스트', '환율 계산기', '번역기', '지갑 관리'] },
      { icon: '🎫', title: '크루즈 예약 서비스', description: '다양한 크루즈 상품을 비교하고 예약할 수 있는 종합 플랫폼입니다.', features: ['다양한 크루즈 상품 비교', '실시간 예약 가능', '안전한 결제 시스템', '예약 관리'] },
      { icon: '📺', title: '크루즈닷 지니 TV', description: '크루즈 여행 영상, Shorts, 라이브 방송을 통해 크루즈 여행의 생생한 경험을 공유합니다.', features: ['YouTube Shorts', '여행 영상 콘텐츠', '라이브 방송', '후기 영상'] },
      { icon: '💬', title: '커뮤니티', description: '크루즈 여행자들과 정보를 공유하고, 여행 팁과 후기를 나누는 공간입니다.', features: ['여행 후기 게시판', '질문답변', '여행 팁 공유', '일정 공유'] },
      { icon: '🛡️', title: '해외여행자보험', description: '안전한 크루즈 여행을 위한 해외여행자보험 정보를 제공합니다.', features: ['보험 상품 비교', '보험 가입 안내', '보험료 계산', '보험 청구 안내'] },
    ];

    const services = serviceContents.length > 0
      ? serviceContents.map((sc: PageContent) => {
        const emojiContent = contents.find(c => c.section === 'services' && c.itemId === sc.itemId && c.contentType === 'emoji');
        const titleContent = contents.find(c => c.section === 'services' && c.itemId === sc.itemId && c.contentType === 'text' && (c.itemId?.includes('title') || (c.content.text && c.content.text.length < 50)));
        const descContent = contents.find(c => c.section === 'services' && c.itemId === sc.itemId && c.contentType === 'text' && c.content.text && c.content.text.length >= 50);
        const featuresContent = contents.find(c => c.section === 'services' && c.itemId === sc.itemId && c.contentType === 'list');

        return {
          id: sc.id,
          icon: emojiContent?.content?.emoji || '✨',
          title: titleContent?.content?.text || sc.content?.title || '서비스',
          description: descContent?.content?.text || sc.content?.description || '',
          features: featuresContent?.content?.items || sc.content?.features || [],
          itemId: sc.itemId,
        };
      })
      : defaultServices.map((s, idx) => ({ ...s, id: idx, itemId: `service-${idx}` }));

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            {/* 이전으로 가기 버튼 */}
            <div className="mb-6">
              <Link
                href="/admin/pages"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
              >
                <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
                <span className="font-medium">관리자 패널로 돌아가기</span>
              </Link>
            </div>

            {/* 헤더 */}
            <div className="text-center mb-12">
              {renderEditableElement(
                headerTitleContent,
                'header',
                'title',
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  {headerTitleContent?.content?.text || '크루즈닷 서비스 소개'}
                </h1>,
                '',
                'text'
              )}
              {renderEditableElement(
                headerSubtitleContent,
                'header',
                'subtitle',
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  {headerSubtitleContent?.content?.text || '크루즈 여행의 모든 것을 한 곳에서 제공하는 종합 플랫폼'}
                </p>,
                '',
                'text'
              )}
            </div>

            {/* 서비스 목록 */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {services.map((service: any, index: number) => {
                const emojiContent = contents.find(c => c.section === 'services' && c.itemId === service.itemId && c.contentType === 'emoji');
                const titleContent = contents.find(c => c.section === 'services' && c.itemId === service.itemId && c.contentType === 'text' && (c.itemId?.includes('title') || (c.content.text && c.content.text.length < 50)));
                const descContent = contents.find(c => c.section === 'services' && c.itemId === service.itemId && c.contentType === 'text' && c.content.text && c.content.text.length >= 50);
                const featuresContent = contents.find(c => c.section === 'services' && c.itemId === service.itemId && c.contentType === 'list');

                return (
                  <div
                    key={service.id || index}
                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100 relative"
                  >
                    {renderEditableElement(
                      emojiContent || null,
                      'services',
                      `${service.itemId}-emoji`,
                      <div className="text-5xl mb-4">
                        {service.icon}
                      </div>,
                      '',
                      'emoji'
                    )}
                    {renderEditableElement(
                      titleContent || null,
                      'services',
                      `${service.itemId}-title`,
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        {service.title}
                      </h3>,
                      '',
                      'text'
                    )}
                    {renderEditableElement(
                      descContent || null,
                      'services',
                      `${service.itemId}-description`,
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        {service.description}
                      </p>,
                      '',
                      'text'
                    )}
                    {featuresContent ? (
                      <div>
                        {renderEditableElement(
                          featuresContent,
                          'services',
                          `${service.itemId}-features`,
                          <ul className="space-y-2">
                            {(featuresContent.content.items || []).map((item: any, idx: number) => {
                              const itemData = typeof item === 'string'
                                ? { emoji: '✓', text: item }
                                : { emoji: item.emoji || '✓', text: item.text || item };
                              return (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                  <span className="text-blue-500 mt-1">{itemData.emoji}</span>
                                  <span>{itemData.text}</span>
                                </li>
                              );
                            })}
                          </ul>,
                          '',
                          'list'
                        )}
                      </div>
                    ) : (
                      <div>
                        {renderEditableElement(
                          null,
                          'services',
                          `${service.itemId}-features`,
                          <ul className="space-y-2">
                            {service.features.map((feature: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="text-blue-500 mt-1">✓</span>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>,
                          '',
                          'list'
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 하이라이트 */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-white text-center relative">
              {renderEditableElement(
                highlightTitleContent,
                'highlight',
                'title',
                <h2 className="text-3xl font-bold mb-4">
                  {highlightTitleContent?.content?.text || '크루즈 여행, 더 쉽고 편리하게!'}
                </h2>,
                '',
                'text'
              )}
              {renderEditableElement(
                highlightTextContent,
                'highlight',
                'text',
                <p className="text-lg mb-6 opacity-90">
                  {highlightTextContent?.content?.text || '크루즈닷과 함께하면 크루즈 여행 준비부터 여행 중까지 모든 것이 간편해집니다.'}
                </p>,
                '',
                'text'
              )}
              {renderEditableElement(
                highlightButtonContent,
                'highlight',
                'button',
                <div className="flex flex-wrap justify-center gap-4">
                  <a
                    href={highlightButtonContent?.content?.link || 'https://www.cruisedot.co.kr/i/6nx'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={(e) => {
                      if (!highlightButtonContent) {
                        e.preventDefault();
                      }
                    }}
                  >
                    {highlightButtonContent?.content?.title || '상담하기'}
                  </a>
                </div>,
                '',
                'button'
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 기본 렌더링 (다른 페이지들)
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-gray-500">
        {pagePath} 페이지 편집 기능은 준비 중입니다.
      </p>
    </div>
  );
}
