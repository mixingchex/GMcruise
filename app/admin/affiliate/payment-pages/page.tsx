'use client';

import { useEffect, useState } from 'react';
import { FiSave, FiRefreshCw, FiExternalLink, FiUpload, FiImage, FiLink, FiZap } from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';
import Image from 'next/image';

type PaymentPageConfig = {
  contractType: 'SALES_AGENT' | 'BRANCH_MANAGER' | 'CRUISE_STAFF' | 'PRIMARKETER';
  label: string;
  price: number;
  paymentLink: string;
  cruiseDotPaymentLink: string | null; // 크루즈닷 페이앱 결제 링크
  imageUrl: string | null;
  imageFile?: File | null;
};

const DEFAULT_CONFIGS: PaymentPageConfig[] = [
  {
    contractType: 'SALES_AGENT',
    label: '판매원 계약서',
    price: 3300000,
    paymentLink: 'http://leadz.kr/yej',
    cruiseDotPaymentLink: null,
    imageUrl: null,
  },
  {
    contractType: 'BRANCH_MANAGER',
    label: '대리점장 계약서',
    price: 7500000,
    paymentLink: 'http://leadz.kr/xWG',
    cruiseDotPaymentLink: null,
    imageUrl: null,
  },
  {
    contractType: 'CRUISE_STAFF',
    label: '크루즈스탭 계약서',
    price: 5400000,
    paymentLink: 'http://leadz.kr/yek',
    cruiseDotPaymentLink: null,
    imageUrl: null,
  },
  {
    contractType: 'PRIMARKETER',
    label: '프리마케터 계약서',
    price: 1000000,
    paymentLink: 'http://leadz.kr/ymF',
    cruiseDotPaymentLink: null,
    imageUrl: null,
  },
];

export default function PaymentPagesManagementPage() {
  const [configs, setConfigs] = useState<PaymentPageConfig[]>(DEFAULT_CONFIGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [generatingLinkIndex, setGeneratingLinkIndex] = useState<number | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/affiliate/payment-pages');
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.configs && data.configs.length > 0) {
          // 저장된 설정과 기본값 병합
          const mergedConfigs = DEFAULT_CONFIGS.map((defaultConfig) => {
            const savedConfig = data.configs.find(
              (c: any) => c.contractType === defaultConfig.contractType
            );
            return savedConfig
              ? { ...defaultConfig, ...savedConfig }
              : defaultConfig;
          });
          setConfigs(mergedConfigs);
        } else {
          // 저장된 설정이 없으면 기본값 사용
          setConfigs(DEFAULT_CONFIGS);
        }
      }
    } catch (error: any) {
      console.error('[PaymentPages] Load error:', error);
      showError('설정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (
    index: number,
    field: keyof PaymentPageConfig,
    value: string | number
  ) => {
    const updated = [...configs];
    updated[index] = { ...updated[index], [field]: value };
    setConfigs(updated);
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      setUploadingIndex(index);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'payment-page');
      formData.append('contractType', configs[index].contractType);

      const response = await fetch('/api/admin/affiliate/payment-pages/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.url) {
          const updated = [...configs];
          updated[index] = { ...updated[index], imageUrl: data.url };
          setConfigs(updated);
          showSuccess('이미지가 업로드되었습니다.');
        } else {
          showError(data.message || '이미지 업로드에 실패했습니다.');
        }
      } else {
        const errorData = await response.json();
        showError(errorData.message || '이미지 업로드에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('[PaymentPages] Image upload error:', error);
      showError('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/affiliate/payment-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      });

      const data = await response.json();
      if (response.ok && data.ok) {
        showSuccess('결제 페이지 설정이 저장되었습니다.');
      } else {
        showError(data.message || '저장에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('[PaymentPages] Save error:', error);
      showError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price: number) => {
    return `${(price / 10000).toLocaleString()}만원`;
  };

  const handleGeneratePayAppLink = async (index: number) => {
    const config = configs[index];
    if (!config) return;

    try {
      setGeneratingLinkIndex(index);

      // 테스트용 계약서 정보 (실제로는 관리자가 입력하거나 샘플 데이터 사용)
      const testContractId = '999999';
      const testPhone = '01012345678';
      const testName = '테스트';

      // 페이앱 결제 링크 생성 요청
      const payappResponse = await fetch('/api/payapp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: testContractId,
          contractType: config.contractType,
          phone: testPhone,
          name: testName,
        }),
      });

      const payappData = await payappResponse.json();

      if (!payappResponse.ok || !payappData.ok || !payappData.payurl) {
        showError(payappData.message || '페이앱 결제 링크 생성에 실패했습니다.');
        return;
      }

      const payappUrl = payappData.payurl;

      // 숏링크 생성 요청
      const shortlinkResponse = await fetch('/api/shortlink/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: payappUrl,
          contractType: config.contractType,
        }),
      });

      const shortlinkData = await shortlinkResponse.json();

      if (!shortlinkResponse.ok || !shortlinkData.ok || !shortlinkData.shortUrl) {
        showError(shortlinkData.message || '숏링크 생성에 실패했습니다.');
        return;
      }

      // 생성된 숏링크를 설정에 저장
      const updated = [...configs];
      updated[index] = { ...updated[index], cruiseDotPaymentLink: shortlinkData.shortUrl };
      setConfigs(updated);

      showSuccess(`페이앱 결제 링크가 생성되었습니다: ${shortlinkData.shortUrl}`);
    } catch (error: any) {
      console.error('[PaymentPages] Generate PayApp link error:', error);
      showError('페이앱 링크 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingLinkIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              💳 어필리에이트 결제 페이지 관리
            </h1>
            <p className="text-gray-600">
              각 계약서 타입별 결제 링크와 랜딩 페이지 이미지를 관리합니다.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadConfigs}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <FiSave className={saving ? 'animate-spin' : ''} />
              저장
            </button>
          </div>
        </div>
      </div>

      {/* 설정 카드들 */}
      <div className="grid grid-cols-1 gap-6">
        {configs.map((config, index) => (
          <div key={config.contractType} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">{config.label}</h2>
              <span className="text-lg font-semibold text-blue-600">
                {formatPrice(config.price)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 결제 링크 설정 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FiLink className="inline mr-2" />
                    리드젠 결제 링크
                  </label>
                  <input
                    type="url"
                    value={config.paymentLink}
                    onChange={(e) => handleConfigChange(index, 'paymentLink', e.target.value)}
                    placeholder="http://leadz.kr/..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  {config.paymentLink && (
                    <a
                      href={config.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FiExternalLink />
                      링크 열기
                    </a>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      <FiLink className="inline mr-2" />
                      크루즈닷 페이앱 결제 링크 (숏링크)
                    </label>
                    <button
                      onClick={() => handleGeneratePayAppLink(index)}
                      disabled={generatingLinkIndex === index}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiZap className={generatingLinkIndex === index ? 'animate-spin' : ''} />
                      {generatingLinkIndex === index ? '생성 중...' : '자동 생성'}
                    </button>
                  </div>
                  <input
                    type="url"
                    value={config.cruiseDotPaymentLink || ''}
                    onChange={(e) => handleConfigChange(index, 'cruiseDotPaymentLink', e.target.value)}
                    placeholder="https://www.cruisedot.co.kr/p/..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                  />
                  {config.cruiseDotPaymentLink && (
                    <div className="mt-2 space-y-1">
                      <a
                        href={config.cruiseDotPaymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                      >
                        <FiExternalLink />
                        숏링크 열기
                      </a>
                      <p className="text-xs text-gray-500">
                        {config.cruiseDotPaymentLink.includes('/p/')
                          ? '✅ 숏링크로 생성되었습니다.'
                          : '⚠️ 숏링크 형식(/p/코드)을 권장합니다.'}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    &quot;자동 생성&quot; 버튼을 클릭하면 페이앱 결제 링크를 숏링크로 자동 생성합니다.
                    <br />
                    환경 변수 SHORTLINK_DOMAIN으로 도메인을 설정할 수 있습니다.
                  </p>
                </div>
              </div>

              {/* 이미지 업로드 */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiImage className="inline mr-2" />
                  랜딩 페이지 이미지
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  {config.imageUrl ? (
                    <div className="space-y-3">
                      <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={config.imageUrl}
                          alt={`${config.label} 랜딩 페이지`}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(index, file);
                              }
                            }}
                            className="hidden"
                            disabled={uploadingIndex !== null}
                          />
                          <span className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200 disabled:opacity-50">
                            <FiUpload className={uploadingIndex === index ? 'animate-spin' : ''} />
                            {uploadingIndex === index ? '업로드 중...' : '이미지 변경'}
                          </span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(index, file);
                          }
                        }}
                        className="hidden"
                        disabled={uploadingIndex !== null}
                      />
                      <div className={`flex flex-col items-center justify-center py-8 text-gray-500 ${uploadingIndex === index ? 'opacity-50' : ''}`}>
                        <FiUpload className={`w-12 h-12 mb-3 ${uploadingIndex === index ? 'animate-spin' : ''}`} />
                        <p className="text-sm font-semibold">
                          {uploadingIndex === index ? '업로드 중...' : '이미지 업로드'}
                        </p>
                        <p className="text-xs mt-1">PNG, JPG, GIF 파일</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}