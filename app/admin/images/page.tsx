// app/admin/images/page.tsx
// 이미지 라이브러리 관리 페이지

'use client';

import { useState, useEffect, useRef } from 'react';
import { FiUpload, FiCopy, FiCheck, FiFolder, FiFolderPlus, FiTrash2, FiSearch, FiImage, FiCode, FiX } from 'react-icons/fi';
import { showSuccess, showError } from '@/components/ui/Toast';
import Image from 'next/image';

interface ImageItem {
  name: string;
  url: string;
  webpUrl: string | null;
  size: number;
  modified: Date;
  code: {
    url: string;
    imageTag: string;
    htmlTag: string;
  };
}

export default function ImageLibraryPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [rootFolders, setRootFolders] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState('images');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImages();
  }, [currentFolder]);

  const loadImages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/images?folder=${encodeURIComponent(currentFolder)}`);
      const data = await response.json();

      if (data.ok) {
        setImages(data.images || []);
        setFolders(data.folders || []);
        setRootFolders(data.rootFolders || []);
      } else {
        showError(data.message || '이미지 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('이미지 목록 로드 에러:', error);
      showError('이미지 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', currentFolder);

      try {
        const response = await fetch('/api/admin/images/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.ok) {
          showSuccess(`이미지 업로드 완료: ${file.name}`);
          return data;
        } else {
          showError(`업로드 실패: ${file.name} - ${data.message}`);
          return null;
        }
      } catch (error) {
        console.error('업로드 에러:', error);
        showError(`업로드 실패: ${file.name}`);
        return null;
      }
    });

    await Promise.all(uploadPromises);
    setIsUploading(false);
    loadImages(); // 목록 새로고침
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(type);
      showSuccess('코드가 클립보드에 복사되었습니다!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('복사 에러:', error);
      showError('복사에 실패했습니다.');
    }
  };

  const filteredImages = images.filter(img =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">이미지 라이브러리</h1>
              <p className="text-gray-600">이미지를 업로드하고 관리하세요. 자동으로 WebP 변환됩니다.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <FiUpload className="w-5 h-5" />
                {isUploading ? '업로드 중...' : '이미지 업로드'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleUpload(e.target.files)}
                className="hidden"
              />
            </div>
          </div>

          {/* 검색 및 폴더 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="이미지 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={currentFolder}
                onChange={(e) => setCurrentFolder(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="images">기본 (images)</option>
                {rootFolders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title="새 폴더"
              >
                <FiFolderPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 새 폴더 입력 */}
          {showNewFolderInput && (
            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                placeholder="폴더 이름"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    setCurrentFolder(newFolderName.trim());
                    setNewFolderName('');
                    setShowNewFolderInput(false);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newFolderName.trim()) {
                    setCurrentFolder(newFolderName.trim());
                    setNewFolderName('');
                    setShowNewFolderInput(false);
                  }
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                이동
              </button>
            </div>
          )}
        </div>

        {/* 이미지 그리드 */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">이미지 목록을 불러오는 중...</p>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <FiImage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">이미지가 없습니다.</p>
            <p className="text-gray-400 text-sm mt-2">위의 "이미지 업로드" 버튼을 클릭하여 이미지를 업로드하세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredImages.map((image) => (
              <div
                key={image.url}
                className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <div className="aspect-square relative bg-gray-100">
                  <Image
                    src={image.webpUrl || image.url}
                    alt={image.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                  {image.webpUrl && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      WebP
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-800 truncate" title={image.name}>
                    {image.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{formatFileSize(image.size)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 이미지 상세 모달 */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{selectedImage.name}</h2>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <Image
                    src={selectedImage.webpUrl || selectedImage.url}
                    alt={selectedImage.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">파일 크기</p>
                    <p className="font-medium">{formatFileSize(selectedImage.size)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">형식</p>
                    <p className="font-medium">
                      {selectedImage.webpUrl ? 'WebP (최적화됨)' : '원본'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 코드 복사 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <FiCode className="w-5 h-5" />
                  소스코드 복사
                </h3>

                {/* Next.js Image 태그 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Next.js Image 태그</label>
                    <button
                      onClick={() => copyToClipboard(selectedImage.code.imageTag, 'imageTag')}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      {copiedCode === 'imageTag' ? (
                        <>
                          <FiCheck className="w-4 h-4" />
                          복사됨
                        </>
                      ) : (
                        <>
                          <FiCopy className="w-4 h-4" />
                          복사
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    {selectedImage.code.imageTag}
                  </pre>
                </div>

                {/* HTML img 태그 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">HTML img 태그</label>
                    <button
                      onClick={() => copyToClipboard(selectedImage.code.htmlTag, 'htmlTag')}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      {copiedCode === 'htmlTag' ? (
                        <>
                          <FiCheck className="w-4 h-4" />
                          복사됨
                        </>
                      ) : (
                        <>
                          <FiCopy className="w-4 h-4" />
                          복사
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    {selectedImage.code.htmlTag}
                  </pre>
                </div>

                {/* URL만 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">이미지 URL</label>
                    <button
                      onClick={() => copyToClipboard(selectedImage.code.url, 'url')}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      {copiedCode === 'url' ? (
                        <>
                          <FiCheck className="w-4 h-4" />
                          복사됨
                        </>
                      ) : (
                        <>
                          <FiCopy className="w-4 h-4" />
                          복사
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    {selectedImage.code.url}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

