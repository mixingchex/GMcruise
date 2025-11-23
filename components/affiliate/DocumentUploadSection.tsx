// components/affiliate/DocumentUploadSection.tsx
// 신분증 및 통장사본 업로드 섹션

'use client';

import { useState, useEffect, useRef } from 'react';
import { FiUpload, FiCheckCircle, FiXCircle, FiFile, FiRefreshCw, FiEye, FiClock } from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

type Document = {
  id: number;
  documentType: 'ID_CARD' | 'BANKBOOK';
  filePath: string;
  fileName: string | null;
  fileSize: number | null;
  status: string;
  uploadedAt: string;
  reviewedAt: string | null;
  isApproved: boolean;
};

export default function DocumentUploadSection() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<'ID_CARD' | 'BANKBOOK' | null>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);
  const bankbookInputRef = useRef<HTMLInputElement>(null);

  // 문서 목록 로드
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/affiliate/profile/upload-documents', {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || '문서 목록을 불러오지 못했습니다');
      }
      setDocuments(json.documents || []);
    } catch (error: any) {
      console.error('[DocumentUpload] Load documents error:', error);
      showError(error.message || '문서 목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // 파일 업로드 처리
  const handleFileUpload = async (file: File, documentType: 'ID_CARD' | 'BANKBOOK') => {
    if (!file) return;

    // 파일 형식 확인
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError('지원하는 파일 형식: JPG, PNG, WEBP');
      return;
    }

    // 파일 크기 확인 (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      showError('파일 크기는 10MB를 초과할 수 없습니다');
      return;
    }

    setUploading(documentType);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const res = await fetch('/api/affiliate/profile/upload-documents', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || '파일 업로드에 실패했습니다');
      }

      showSuccess(json.message || '파일이 업로드되었습니다');
      await loadDocuments(); // 목록 새로고침
    } catch (error: any) {
      console.error('[DocumentUpload] Upload error:', error);
      showError(error.message || '파일 업로드 중 오류가 발생했습니다');
    } finally {
      setUploading(null);
      // 파일 input 초기화
      if (documentType === 'ID_CARD' && idCardInputRef.current) {
        idCardInputRef.current.value = '';
      }
      if (documentType === 'BANKBOOK' && bankbookInputRef.current) {
        bankbookInputRef.current.value = '';
      }
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, documentType: 'ID_CARD' | 'BANKBOOK') => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, documentType);
    }
  };

  // 문서 상태 표시
  const getStatusInfo = (status: string, isApproved: boolean) => {
    if (isApproved) {
      return {
        label: '승인됨',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: <FiCheckCircle className="text-base" />,
      };
    }
    switch (status) {
      case 'UPLOADED':
        return {
          label: '검토 대기',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          icon: <FiClock className="text-base" />,
        };
      case 'REJECTED':
        return {
          label: '반려됨',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          icon: <FiXCircle className="text-base" />,
        };
      default:
        return {
          label: '알 수 없음',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: <FiFile className="text-base" />,
        };
    }
  };

  const idCardDoc = documents.find(d => d.documentType === 'ID_CARD');
  const bankbookDoc = documents.find(d => d.documentType === 'BANKBOOK');

  return (
    <section className="rounded-2xl bg-white p-4 shadow-lg md:rounded-3xl md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 md:text-xl flex items-center gap-2">
          <FiFile className="text-blue-600" />
          세금 신고용 서류 업로드
        </h2>
        <button
          onClick={loadDocuments}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          <FiRefreshCw className={`text-base ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
        <p className="text-xs text-blue-800">
          <strong>💡 안내:</strong> 원천징수 3.3% 신고를 위해 신분증과 통장사본을 업로드해주세요.
          <br />
          관리자 검토 후 승인되면 정산이 진행됩니다.
        </p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">
          문서 목록을 불러오는 중입니다...
        </div>
      ) : (
        <div className="space-y-4">
          {/* 신분증 업로드 */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">신분증</h3>
              {idCardDoc && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                    getStatusInfo(idCardDoc.status, idCardDoc.isApproved).color
                  } ${getStatusInfo(idCardDoc.status, idCardDoc.isApproved).bgColor}`}
                >
                  {getStatusInfo(idCardDoc.status, idCardDoc.isApproved).icon}
                  {getStatusInfo(idCardDoc.status, idCardDoc.isApproved).label}
                </span>
              )}
            </div>
            {idCardDoc ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {idCardDoc.fileName || '신분증 파일'}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={idCardDoc.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <FiEye className="text-base" />
                      <span>보기</span>
                    </a>
                    {idCardDoc.fileSize && (
                      <span className="text-xs text-gray-500">
                        ({(idCardDoc.fileSize / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    )}
                  </div>
                </div>
                {idCardDoc.uploadedAt && (
                  <p className="text-xs text-gray-500">
                    업로드일: {new Date(idCardDoc.uploadedAt).toLocaleString('ko-KR')}
                  </p>
                )}
                <button
                  onClick={() => idCardInputRef.current?.click()}
                  disabled={uploading === 'ID_CARD'}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploading === 'ID_CARD' ? '업로드 중...' : '다시 업로드'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => idCardInputRef.current?.click()}
                disabled={uploading === 'ID_CARD'}
                className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50"
              >
                <FiUpload className="mx-auto mb-2 text-2xl text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">
                  {uploading === 'ID_CARD' ? '업로드 중...' : '신분증 업로드'}
                </p>
                <p className="mt-1 text-xs text-gray-500">JPG, PNG, WEBP (최대 10MB)</p>
              </button>
            )}
            <input
              ref={idCardInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => handleFileSelect(e, 'ID_CARD')}
              className="hidden"
            />
          </div>

          {/* 통장사본 업로드 */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">통장사본</h3>
              {bankbookDoc && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                    getStatusInfo(bankbookDoc.status, bankbookDoc.isApproved).color
                  } ${getStatusInfo(bankbookDoc.status, bankbookDoc.isApproved).bgColor}`}
                >
                  {getStatusInfo(bankbookDoc.status, bankbookDoc.isApproved).icon}
                  {getStatusInfo(bankbookDoc.status, bankbookDoc.isApproved).label}
                </span>
              )}
            </div>
            {bankbookDoc ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {bankbookDoc.fileName || '통장사본 파일'}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={bankbookDoc.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <FiEye className="text-base" />
                      <span>보기</span>
                    </a>
                    {bankbookDoc.fileSize && (
                      <span className="text-xs text-gray-500">
                        ({(bankbookDoc.fileSize / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    )}
                  </div>
                </div>
                {bankbookDoc.uploadedAt && (
                  <p className="text-xs text-gray-500">
                    업로드일: {new Date(bankbookDoc.uploadedAt).toLocaleString('ko-KR')}
                  </p>
                )}
                <button
                  onClick={() => bankbookInputRef.current?.click()}
                  disabled={uploading === 'BANKBOOK'}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploading === 'BANKBOOK' ? '업로드 중...' : '다시 업로드'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => bankbookInputRef.current?.click()}
                disabled={uploading === 'BANKBOOK'}
                className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50"
              >
                <FiUpload className="mx-auto mb-2 text-2xl text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">
                  {uploading === 'BANKBOOK' ? '업로드 중...' : '통장사본 업로드'}
                </p>
                <p className="mt-1 text-xs text-gray-500">JPG, PNG, WEBP (최대 10MB)</p>
              </button>
            )}
            <input
              ref={bankbookInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => handleFileSelect(e, 'BANKBOOK')}
              className="hidden"
            />
          </div>
        </div>
      )}
    </section>
  );
}






