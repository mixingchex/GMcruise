'use client';

import { useState, useEffect } from 'react';
import { FiSave, FiRefreshCw, FiInfo, FiCheck, FiX } from 'react-icons/fi';
import { showSuccess, showError } from '@/components/ui/Toast';

interface GoogleDriveConfig {
  idCardFolderId: string;
  bankbookFolderId: string;
  salesAudioFolderId: string;
  contractsFolderId: string;
  signaturesFolderId: string;
  passportsFolderId: string;
  cruiseImagesFolderId: string;
  cruiseMaterialsFolderId: string;
  productsFolderId: string;
}

export default function GoogleDriveSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<GoogleDriveConfig>({
    idCardFolderId: '',
    bankbookFolderId: '',
    salesAudioFolderId: '',
    contractsFolderId: '',
    signaturesFolderId: '',
    passportsFolderId: '',
    cruiseImagesFolderId: '',
    cruiseMaterialsFolderId: '',
    productsFolderId: '',
  });
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/system/google-drive', {
        credentials: 'include',
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || '설정을 불러오는데 실패했습니다');
      }

      setConfig({
        idCardFolderId: json.config.idCardFolderId || '',
        bankbookFolderId: json.config.bankbookFolderId || '',
        salesAudioFolderId: json.config.salesAudioFolderId || '',
        contractsFolderId: json.config.contractsFolderId || '',
        signaturesFolderId: json.config.signaturesFolderId || '',
        passportsFolderId: json.config.passportsFolderId || '',
        cruiseImagesFolderId: json.config.cruiseImagesFolderId || '',
        cruiseMaterialsFolderId: json.config.cruiseMaterialsFolderId || '',
        productsFolderId: json.config.productsFolderId || '',
      });
    } catch (error: any) {
      console.error('[GoogleDriveSettings] Load error:', error);
      showError(error.message || '설정을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);

      const res = await fetch('/api/admin/system/google-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || '설정 저장에 실패했습니다');
      }

      showSuccess('Google Drive 설정이 저장되었습니다!');
    } catch (error: any) {
      console.error('[GoogleDriveSettings] Save error:', error);
      showError(error.message || '설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const validateFolderId = (folderId: string): boolean => {
    // Google Drive 폴더 ID는 보통 33자 길이의 알파벳/숫자 조합
    return folderId.length > 0 && /^[a-zA-Z0-9_-]+$/.test(folderId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Google Drive 설정</h1>
            <p className="text-gray-600">
              어필리에이트 시스템에서 사용할 Google Drive 폴더 ID를 설정합니다.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
            >
              <FiInfo size={18} />
              폴더 ID 찾기 가이드
            </button>
            <button
              onClick={loadConfig}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <FiRefreshCw size={18} />
              새로고침
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FiSave size={18} />
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>
      </div>

      {/* 폴더 ID 찾기 가이드 */}
      {showGuide && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
              <FiInfo className="text-blue-600" />
              Google Drive 폴더 ID 찾는 방법
            </h2>
            <button
              onClick={() => setShowGuide(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <FiX size={20} />
            </button>
          </div>
          <div className="space-y-4 text-sm text-blue-800">
            <div>
              <h3 className="font-bold mb-2">1단계: Google Drive 접속</h3>
              <p className="ml-4 mb-2">
                <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  Google Drive
                </a>에 접속하여 업로드할 폴더를 찾습니다.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">2단계: 폴더 열기</h3>
              <p className="ml-4 mb-2">업로드할 폴더를 클릭하여 엽니다.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">3단계: 폴더 ID 확인</h3>
              <p className="ml-4 mb-2">
                브라우저 주소창의 URL을 확인합니다. URL은 다음과 같은 형식입니다:
              </p>
              <code className="block ml-4 p-2 bg-white rounded border border-blue-300 text-xs break-all">
                https://drive.google.com/drive/folders/<span className="font-bold text-red-600">1MNOpqRSTuvwXYZabcdefghijklmno</span>
              </code>
              <p className="ml-4 mt-2">
                <span className="font-bold text-red-600">빨간색 부분</span>이 폴더 ID입니다.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">4단계: 폴더 ID 복사</h3>
              <p className="ml-4 mb-2">
                폴더 ID만 복사하여 아래 입력란에 붙여넣기 합니다. (예: <code className="bg-white px-1 rounded">1MNOpqRSTuvwXYZabcdefghijklmno</code>)
              </p>
            </div>
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
              <p className="font-bold text-yellow-900 mb-1">⚠️ 중요 사항</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-800">
                <li>각 폴더는 미리 생성되어 있어야 합니다.</li>
                <li>서비스 계정이 각 폴더에 접근 권한이 있어야 합니다.</li>
                <li>폴더 ID에는 공백이나 특수문자가 없어야 합니다.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 설정 입력 폼 */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* 신분증 폴더 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            신분증 업로드 폴더 ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.idCardFolderId}
            onChange={(e) => setConfig({ ...config, idCardFolderId: e.target.value.trim() })}
            placeholder="예: 1MNOpqRSTuvwXYZabcdefghijklmno"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              config.idCardFolderId && !validateFolderId(config.idCardFolderId)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {config.idCardFolderId && validateFolderId(config.idCardFolderId) ? (
            <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
              <FiCheck /> 올바른 형식입니다
            </p>
          ) : config.idCardFolderId ? (
            <p className="mt-1 text-sm text-red-600">올바른 폴더 ID 형식이 아닙니다</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              판매원/대리점장이 업로드한 신분증이 저장될 Google Drive 폴더 ID를 입력하세요
            </p>
          )}
        </div>

        {/* 통장 폴더 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            통장 업로드 폴더 ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.bankbookFolderId}
            onChange={(e) => setConfig({ ...config, bankbookFolderId: e.target.value.trim() })}
            placeholder="예: 1MNOpqRSTuvwXYZabcdefghijklmno"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              config.bankbookFolderId && !validateFolderId(config.bankbookFolderId)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {config.bankbookFolderId && validateFolderId(config.bankbookFolderId) ? (
            <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
              <FiCheck /> 올바른 형식입니다
            </p>
          ) : config.bankbookFolderId ? (
            <p className="mt-1 text-sm text-red-600">올바른 폴더 ID 형식이 아닙니다</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              판매원/대리점장이 업로드한 통장 사본이 저장될 Google Drive 폴더 ID를 입력하세요
            </p>
          )}
        </div>

        {/* 녹음 파일 폴더 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            녹음 파일 업로드 폴더 ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.salesAudioFolderId}
            onChange={(e) => setConfig({ ...config, salesAudioFolderId: e.target.value.trim() })}
            placeholder="예: 1MNOpqRSTuvwXYZabcdefghijklmno"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              config.salesAudioFolderId && !validateFolderId(config.salesAudioFolderId)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {config.salesAudioFolderId && validateFolderId(config.salesAudioFolderId) ? (
            <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
              <FiCheck /> 올바른 형식입니다
            </p>
          ) : config.salesAudioFolderId ? (
            <p className="mt-1 text-sm text-red-600">올바른 폴더 ID 형식이 아닙니다</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              판매 확정 시 업로드되는 녹음 파일이 저장될 Google Drive 폴더 ID를 입력하세요
            </p>
          )}
        </div>

        {/* 구분선: 어필리에이트 관련 추가 폴더 */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            📄 어필리에이트 계약서 관련
          </h3>
        </div>

        {/* 계약서 PDF 폴더 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            계약서 PDF 폴더 ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.contractsFolderId}
            onChange={(e) => setConfig({ ...config, contractsFolderId: e.target.value.trim() })}
            placeholder="예: 1ABCdefghijklmnopqrstuvwxyz"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              config.contractsFolderId && !validateFolderId(config.contractsFolderId)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {config.contractsFolderId && validateFolderId(config.contractsFolderId) ? (
            <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
              <FiCheck /> 올바른 형식입니다
            </p>
          ) : config.contractsFolderId ? (
            <p className="mt-1 text-sm text-red-600">올바른 폴더 ID 형식이 아닙니다</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              생성된 계약서 PDF가 저장될 Google Drive 폴더 ID를 입력하세요
            </p>
          )}
        </div>

        {/* 계약서 서명 폴더 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            계약서 서명 폴더 ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.signaturesFolderId}
            onChange={(e) => setConfig({ ...config, signaturesFolderId: e.target.value.trim() })}
            placeholder="예: 1DEFghijklmnopqrstuvwxyzab"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              config.signaturesFolderId && !validateFolderId(config.signaturesFolderId)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {config.signaturesFolderId && validateFolderId(config.signaturesFolderId) ? (
            <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
              <FiCheck /> 올바른 형식입니다
            </p>
          ) : config.signaturesFolderId ? (
            <p className="mt-1 text-sm text-red-600">올바른 폴더 ID 형식이 아닙니다</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              판매원/대리점장이 서명한 서명 이미지가 저장될 Google Drive 폴더 ID를 입력하세요
            </p>
          )}
        </div>

        {/* 구분선: 고객 관련 */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            🛂 고객 관련
          </h3>
        </div>

        {/* 여권 제출 폴더 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            여권 제출 폴더 ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.passportsFolderId}
            onChange={(e) => setConfig({ ...config, passportsFolderId: e.target.value.trim() })}
            placeholder="예: 1GHIjklmnopqrstuvwxyzabcdef"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              config.passportsFolderId && !validateFolderId(config.passportsFolderId)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {config.passportsFolderId && validateFolderId(config.passportsFolderId) ? (
            <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
              <FiCheck /> 올바른 형식입니다
            </p>
          ) : config.passportsFolderId ? (
            <p className="mt-1 text-sm text-red-600">올바른 폴더 ID 형식이 아닙니다</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              고객이 제출한 여권 사본이 저장될 Google Drive 폴더 ID를 입력하세요
            </p>
          )}
        </div>

        {/* 구분선: 크루즈 상품 관련 */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            🚢 크루즈 상품 관련
          </h3>
        </div>

        {/* 크루즈정보사진 폴더 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            크루즈정보사진 폴더 ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.cruiseImagesFolderId}
            onChange={(e) => setConfig({ ...config, cruiseImagesFolderId: e.target.value.trim() })}
            placeholder="예: 1JKLmnopqrstuvwxyzabcdefgh"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              config.cruiseImagesFolderId && !validateFolderId(config.cruiseImagesFolderId)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {config.cruiseImagesFolderId && validateFolderId(config.cruiseImagesFolderId) ? (
            <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
              <FiCheck /> 올바른 형식입니다
            </p>
          ) : config.cruiseImagesFolderId ? (
            <p className="mt-1 text-sm text-red-600">올바른 폴더 ID 형식이 아닙니다</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              크루즈 상품 이미지 및 사진이 저장될 Google Drive 폴더 ID를 입력하세요
            </p>
          )}
        </div>

        {/* 크루즈 자료 폴더 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            크루즈 자료 폴더 ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.cruiseMaterialsFolderId}
            onChange={(e) => setConfig({ ...config, cruiseMaterialsFolderId: e.target.value.trim() })}
            placeholder="예: 1MNOpqrstuvwxyzabcdefghij"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              config.cruiseMaterialsFolderId && !validateFolderId(config.cruiseMaterialsFolderId)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {config.cruiseMaterialsFolderId && validateFolderId(config.cruiseMaterialsFolderId) ? (
            <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
              <FiCheck /> 올바른 형식입니다
            </p>
          ) : config.cruiseMaterialsFolderId ? (
            <p className="mt-1 text-sm text-red-600">올바른 폴더 ID 형식이 아닙니다</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              앞으로 업데이트될 크루즈 관련 이미지 및 자료가 저장될 Google Drive 폴더 ID를 입력하세요
            </p>
          )}
        </div>

        {/* 상품 폴더 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            상품 폴더 ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.productsFolderId}
            onChange={(e) => setConfig({ ...config, productsFolderId: e.target.value.trim() })}
            placeholder="예: 1PRODUCTSpqrstuvwxyzabcdefgh"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              config.productsFolderId && !validateFolderId(config.productsFolderId)
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {config.productsFolderId && validateFolderId(config.productsFolderId) ? (
            <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
              <FiCheck /> 올바른 형식입니다
            </p>
          ) : config.productsFolderId ? (
            <p className="mt-1 text-sm text-red-600">올바른 폴더 ID 형식이 아닙니다</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              상품 썸네일, 상세페이지 이미지 등이 백업될 Google Drive 폴더 ID를 입력하세요. [상세페이지]나 [크루즈정보사진]에서 이 폴더의 이미지를 가져와 사용할 수 있습니다.
            </p>
          )}
        </div>

        {/* 저장 버튼 */}
        <div className="pt-4 border-t">
          <button
            onClick={saveConfig}
            disabled={
              saving ||
              !config.idCardFolderId ||
              !config.bankbookFolderId ||
              !config.salesAudioFolderId ||
              !config.contractsFolderId ||
              !config.signaturesFolderId ||
              !config.passportsFolderId ||
              !config.cruiseImagesFolderId ||
              !config.cruiseMaterialsFolderId ||
              !config.productsFolderId ||
              !validateFolderId(config.idCardFolderId) ||
              !validateFolderId(config.bankbookFolderId) ||
              !validateFolderId(config.salesAudioFolderId) ||
              !validateFolderId(config.contractsFolderId) ||
              !validateFolderId(config.signaturesFolderId) ||
              !validateFolderId(config.passportsFolderId) ||
              !validateFolderId(config.cruiseImagesFolderId) ||
              !validateFolderId(config.cruiseMaterialsFolderId) ||
              !validateFolderId(config.productsFolderId)
            }
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave size={20} />
            {saving ? '저장 중...' : '설정 저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

