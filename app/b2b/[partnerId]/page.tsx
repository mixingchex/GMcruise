'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiCheck, FiUser, FiPhone, FiArrowRight } from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

export default function PartnerB2BLandingPage() {
    const params = useParams();
    const router = useRouter();
    const partnerId = params?.partnerId as string;

    const [loading, setLoading] = useState(false);
    const [partnerName, setPartnerName] = useState<string>('');
    const [form, setForm] = useState({
        name: '',
        phone: '',
    });

    // 파트너 정보 로드 (선택사항: 이름을 표시하고 싶다면 API 필요, 
    // 여기서는 partnerId를 그대로 쓰거나, 클라이언트 사이드에서 간단히 처리)
    // 실제로는 partnerId(mallUserId)로 파트너 이름을 가져오는 API가 있으면 좋음.
    // 일단은 partnerId를 표시하거나 일반적인 문구 사용.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.phone) {
            showError('이름과 연락처를 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/b2b/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    phone: form.phone,
                    partnerId,
                }),
            });
            const json = await res.json();

            if (json.ok) {
                showSuccess(json.message);
                // 성공 페이지나 홈으로 이동
                // router.push('/auth/login'); // 또는 안내 페이지
                alert('신청이 완료되었습니다. 담당자가 곧 연락드리겠습니다.');
                setForm({ name: '', phone: '' });
            } else {
                showError(json.error || '신청에 실패했습니다.');
            }
        } catch (error) {
            console.error('Submit error:', error);
            showError('오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-6 text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">크루즈 가이드 지니</h1>
                    <p className="text-blue-100">7일 무료 체험 특별 프로모션</p>
                    {partnerId && (
                        <div className="mt-4 inline-block bg-blue-700 rounded-full px-4 py-1 text-sm text-blue-100">
                            추천인: {partnerId}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="mb-8 space-y-3">
                        <h2 className="text-xl font-bold text-gray-900 text-center">
                            지금 바로 시작하세요!
                        </h2>
                        <p className="text-gray-600 text-center text-sm">
                            크루즈 여행 상담의 혁신, 지니와 함께<br />
                            매출 상승의 기회를 잡으세요.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiUser className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="홍길동"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiPhone className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="010-1234-5678"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? '처리중...' : '7일 무료 체험 신청하기'}
                            {!loading && <FiArrowRight />}
                        </button>
                    </form>

                    {/* Benefits */}
                    <div className="mt-8 pt-8 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">체험 혜택</h3>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-sm text-gray-600">
                                <FiCheck className="text-green-500 mt-0.5" />
                                <span>전 세계 크루즈 실시간 조회 및 예약</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-gray-600">
                                <FiCheck className="text-green-500 mt-0.5" />
                                <span>AI 기반 고객 맞춤형 상품 추천</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-gray-600">
                                <FiCheck className="text-green-500 mt-0.5" />
                                <span>전문가 전용 대시보드 제공</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
