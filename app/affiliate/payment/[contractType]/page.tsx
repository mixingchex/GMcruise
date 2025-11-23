'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiArrowRight, FiLoader } from 'react-icons/fi';

type PaymentPageConfig = {
  contractType: string;
  label: string;
  price: number;
  paymentLink: string;
  cruiseDotPaymentLink: string | null;
  imageUrl: string | null;
};

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const contractType = params.contractType as string;
  const [config, setConfig] = useState<PaymentPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [payappLoading, setPayappLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [contractType]);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/affiliate/payment-pages');
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.configs) {
          const found = data.configs.find((c: any) => c.contractType === contractType);
          if (found) {
            setConfig(found);
          }
        }
      }
    } catch (error) {
      console.error('[PaymentPage] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    // 계약서 타입별 기본 Leadzen 링크
    const defaultLinks: Record<string, string> = {
      'SALES_AGENT': 'http://leadz.kr/yej',
      'BRANCH_MANAGER': 'http://leadz.kr/xWG',
      'CRUISE_STAFF': 'http://leadz.kr/yek',
      'PRIMARKETER': 'http://leadz.kr/ymF',
    };

    const paymentLink = config?.paymentLink || defaultLinks[contractType] || 'http://leadz.kr/yej';
    
    if (!paymentLink) {
      alert('결제 링크가 설정되지 않았습니다.');
      return;
    }

    setRedirecting(true);
    // 리드젠 링크로 리다이렉트 (현재 창에서 이동)
    window.location.href = paymentLink;
  };

  const handlePayAppPayment = async () => {
    if (!config) {
      alert('결제 정보를 불러올 수 없습니다.');
      return;
    }

    try {
      setPayappLoading(true);

      // URL에서 contractId와 사용자 정보 가져오기 (쿼리 파라미터 또는 세션)
      const urlParams = new URLSearchParams(window.location.search);
      const contractId = urlParams.get('contractId');
      const phone = urlParams.get('phone');
      const name = urlParams.get('name');

      if (!contractId || !phone || !name) {
        alert('결제 정보가 불완전합니다. 계약서 페이지에서 다시 시도해주세요.');
        return;
      }

      // 페이앱 결제 요청
      const response = await fetch('/api/payapp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          contractType: config.contractType,
          phone,
          name,
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok && data.payurl) {
        // 페이앱 결제 링크를 mabizschool.com 숏링크로 변환
        try {
          const shortlinkResponse = await fetch('/api/shortlink/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: data.payurl,
              contractType: config.contractType,
            }),
          });

          const shortlinkData = await shortlinkResponse.json();

          if (shortlinkResponse.ok && shortlinkData.ok && shortlinkData.shortUrl) {
            // 숏링크로 리다이렉트
            window.location.href = shortlinkData.shortUrl;
          } else {
            // 숏링크 생성 실패 시 원본 페이앱 링크로 이동
            window.location.href = data.payurl;
          }
        } catch (shortlinkError) {
          console.error('[PaymentPage] Shortlink creation error:', shortlinkError);
          // 숏링크 생성 실패 시 원본 페이앱 링크로 이동
          window.location.href = data.payurl;
        }
      } else {
        // 설정된 크루즈닷 결제 링크가 있으면 사용
        if (config.cruiseDotPaymentLink) {
          window.location.href = config.cruiseDotPaymentLink;
        } else {
          alert(data.message || '페이앱 결제 요청에 실패했습니다.');
          setPayappLoading(false);
        }
      }
    } catch (error: any) {
      console.error('[PaymentPage] PayApp error:', error);
      alert('결제 요청 중 오류가 발생했습니다.');
      setPayappLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FiLoader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">결제 페이지를 찾을 수 없습니다.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{config.label}</h1>
          <p className="text-xl text-gray-600">
            {(config.price / 10000).toLocaleString()}만원
          </p>
        </div>

        {/* 랜딩 페이지 이미지 */}
        {config.imageUrl && (
          <div className="mb-8 bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="relative w-full aspect-video">
              <Image
                src={config.imageUrl}
                alt={`${config.label} 랜딩 페이지`}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        )}

        {/* 결제 버튼 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">결제하기</h2>
            <p className="text-gray-600">
              아래 버튼을 클릭하여 결제 페이지로 이동합니다.
            </p>
          </div>

          <div className="space-y-4">
            {/* 리드젠 결제 버튼 */}
            <button
              onClick={handlePayment}
              disabled={redirecting}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {redirecting ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  이동 중...
                </>
              ) : (
                <>
                  리드젠 결제 페이지로 이동
                  <FiArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* 크루즈닷 페이앱 결제 버튼 */}
            <button
              onClick={handlePayAppPayment}
              disabled={payappLoading}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {payappLoading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  결제 준비 중...
                </>
              ) : (
                <>
                  크루즈닷 페이앱으로 결제하기
                  <FiArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-gray-500 text-center mt-4">
            결제는 안전한 결제 시스템을 통해 진행됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

