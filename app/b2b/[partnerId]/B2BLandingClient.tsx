'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiArrowRight, FiX } from 'react-icons/fi';

// 캐시 로그인 유틸리티 (localStorage 기반 7일 체험)
const TRIAL_CACHE_KEY = 'cruise_trial_session';

interface TrialSession {
    name: string;
    phone: string;
    mallUserId: string;
    startedAt: string;
    expiresAt: string;
}

function getTrialSession(): TrialSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const cached = localStorage.getItem(TRIAL_CACHE_KEY);
        if (!cached) return null;
        const session: TrialSession = JSON.parse(cached);
        // 만료 체크
        if (new Date(session.expiresAt) < new Date()) {
            localStorage.removeItem(TRIAL_CACHE_KEY);
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

function setTrialSession(session: TrialSession): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TRIAL_CACHE_KEY, JSON.stringify(session));
}

interface B2BLandingClientProps {
    partnerId?: string;
    initialTemplate: string;
}

export default function B2BLandingClient({ partnerId, initialTemplate }: B2BLandingClientProps) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkingCache, setCheckingCache] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // 캐시된 세션 확인 제거 - B2B 랜딩페이지는 항상 표시되어야 함
    useEffect(() => {
        // B2B 랜딩페이지는 항상 표시 (세션 체크 로직 제거)
        setCheckingCache(false);
    }, []);

    // 전역 함수 등록 (HTML onclick 이벤트용)
    useEffect(() => {
        (window as any).openImage = (src: string) => {
            setSelectedImage(src);
        };
        return () => {
            delete (window as any).openImage;
        };
    }, []);

    const handleSubmit = async (event: React.FormEvent, formLocation: string = 'main') => {
        event.preventDefault();
        if (loading) return;

        setError(null);

        const trimmedName = name.trim();
        const trimmedPhone = phone.trim().replace(/[^0-9]/g, '');

        if (!trimmedName || trimmedName.length < 2) {
            setError('이름을 정확히 입력해주세요.');
            return;
        }

        if (!trimmedPhone || !/^01([0|1|6|7|8|9])([0-9]{3,4})([0-9]{4})$/.test(trimmedPhone)) {
            setError('올바른 휴대폰 번호를 입력해주세요.');
            return;
        }

        try {
            setLoading(true);

            const response = await fetch('/api/subscription/trial/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: trimmedName,
                    phone: trimmedPhone,
                    partnerId: partnerId,
                    source: 'B2B_LANDING' // 명시적 소스
                }),
            });

            const data = await response.json();

            if (!response.ok || !data?.ok) {
                setError(data?.error || '무료 체험 시작에 실패했습니다.');
                setLoading(false);
                return;
            }

            if (data.trial) {
                setTrialSession({
                    name: data.trial.name,
                    phone: data.trial.phone,
                    mallUserId: data.trial.trialId,
                    startedAt: data.trial.startedAt,
                    expiresAt: data.trial.expiresAt,
                });
                router.push('/trial/dashboard');
            } else {
                setError('체험 정보를 받지 못했습니다.');
                setLoading(false);
            }
        } catch (err: any) {
            console.error('[Subscription Login] Error:', err);
            setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            setLoading(false);
        }
    };

    if (checkingCache) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">체험 세션 확인 중...</p>
                </div>
            </div>
        );
    }

    // Template Parsing
    const parts = initialTemplate.split(/<!-- FORM_(TOP|MIDDLE) -->/);
    // parts[0] = content before TOP
    // parts[1] = "TOP" (captured group)
    // parts[2] = content between TOP and MIDDLE
    // parts[3] = "MIDDLE" (captured group)
    // parts[4] = content after MIDDLE

    const renderForm = (location: string) => (
        <form onSubmit={(e) => handleSubmit(e, location)} className="space-y-4 my-8">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                required
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-4 text-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                disabled={loading}
            />
            <input
                type="tel"
                value={phone}
                onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9-]/g, '');
                    setPhone(value);
                }}
                placeholder="휴대폰번호 입력 (010-1234-5678)"
                required
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg p-4 text-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                disabled={loading}
            />

            {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-black text-xl py-5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>처리 중...</span>
                    </>
                ) : (
                    <>
                        <span>7일 무료 체험 시작하기</span>
                        <FiArrowRight className="h-5 w-5" />
                    </>
                )}
            </button>
        </form>
    );

    return (
        <>
            {/* Render Template Parts */}
            {parts.map((part, index) => {
                if (part === 'TOP') return <div key={index}>{renderForm('top')}</div>;
                if (part === 'MIDDLE') return <div key={index}>{renderForm('middle')}</div>;
                return <div key={index} dangerouslySetInnerHTML={{ __html: part }} />;
            })}

            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                        onClick={() => setSelectedImage(null)}
                    >
                        <FiX size={32} />
                    </button>
                    <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
                        <div className="relative w-full h-full min-h-[50vh]">
                            <Image
                                src={selectedImage}
                                alt="확대 이미지"
                                fill
                                className="object-contain rounded-lg shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
