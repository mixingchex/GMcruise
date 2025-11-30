'use client';

import { useState, useEffect } from 'react';
import { FiSave, FiRefreshCw, FiEye, FiLink, FiExternalLink } from 'react-icons/fi';

const DEFAULT_TEMPLATE = `<!-- FORM_TOP -->
<section class="text-center pt-12 pb-20 px-4">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-4xl md:text-6xl font-black leading-tight my-8">
      <span class="text-yellow-400">"비교불가 차원이 다른 압도적인 시스템"</span>
      <span class="block text-2xl md:text-3xl font-bold mt-4 text-gray-200">
        고객을 '인솔'하고 '관리'하는<br />
        크루즈 마케터 전문가 과정
      </span>
    </h1>
    <!-- ... (Default content will be loaded from API or fallback) ... -->
  </div>
</section>
<!-- FORM_MIDDLE -->
`;

export default function B2BLandingEditorPage() {
    const [html, setHtml] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [previewPartnerId, setPreviewPartnerId] = useState('test');
    const [hqLink, setHqLink] = useState('');

    useEffect(() => {
        fetchTemplate();
        fetchAdminInfo();
    }, []);

    const fetchAdminInfo = async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.ok && data.user) {
                const link = `${window.location.origin}/b2b/${data.user.mallUserId || data.user.phone}`;
                setHqLink(link);
            }
        } catch (e) {
            console.error('Failed to fetch admin info', e);
        }
    };

    const fetchTemplate = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/system-config?key=B2B_LANDING_TEMPLATE');
            const data = await res.json();
            if (data.ok && data.config) {
                setHtml(data.config.configValue || '');
            } else {
                // 저장된 템플릿이 없으면 기본 템플릿 로드
                setHtml(DEFAULT_TEMPLATE);
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: '템플릿 로드 실패' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/system-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'B2B_LANDING_TEMPLATE',
                    value: html,
                    description: 'B2B Partner Landing Page HTML Template'
                })
            });
            const data = await res.json();
            if (data.ok) {
                setMessage({ type: 'success', text: '저장되었습니다. 모든 파트너 페이지에 즉시 반영됩니다.' });
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: `저장 실패: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">B2B 유입 랜딩페이지 편집기</h1>
                <div className="flex gap-2">
                    <button
                        onClick={fetchTemplate}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-2"
                    >
                        <FiRefreshCw /> 새로고침
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        <FiSave /> {saving ? '저장 중...' : '저장하기'}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-4">
                {/* 본사 링크 및 미리보기 섹션 */}
                <div className="mb-6 space-y-4">
                    {/* 본사 링크 */}
                    <div className="p-4 bg-blue-50 rounded border border-blue-200 flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className="flex-1">
                            <span className="font-bold text-blue-800 block mb-1">🏢 본사 유입 랜딩페이지 링크:</span>
                            <code className="text-sm bg-white px-2 py-1 rounded border border-blue-100 block w-full break-all text-blue-600">
                                {hqLink || '로딩 중...'}
                            </code>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(hqLink);
                                    alert('링크가 복사되었습니다!');
                                }}
                                className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 flex items-center justify-center gap-2 text-sm font-medium flex-1 md:flex-none"
                            >
                                <FiLink /> 링크 복사
                            </button>
                            <a
                                href={hqLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium flex-1 md:flex-none"
                            >
                                <FiExternalLink /> 바로가기
                            </a>
                        </div>
                    </div>

                    {/* 테스트 미리보기 */}
                    <div className="p-4 bg-gray-50 rounded border border-gray-200 flex items-center gap-4">
                        <div className="flex items-center gap-2 flex-1">
                            <span className="font-bold text-gray-700 whitespace-nowrap">테스트용 파트너 ID:</span>
                            <input
                                type="text"
                                value={previewPartnerId}
                                onChange={(e) => setPreviewPartnerId(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full max-w-xs"
                                placeholder="partner-id"
                            />
                        </div>
                        <a
                            href={`/b2b/${previewPartnerId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center gap-2 text-sm font-medium"
                        >
                            <FiEye /> 테스트 미리보기
                        </a>
                    </div>
                </div>

                <div className="mb-4 text-sm text-gray-600 bg-yellow-50 p-4 rounded border border-yellow-200">
                    <h3 className="font-bold text-yellow-800 text-lg mb-2">⚠️ HTML 편집 가이드 (필독)</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="font-bold text-gray-800">1. 입력폼 자동 생성 (이름, 연락처)</p>
                            <p className="mt-1">
                                아래의 <strong>주석 코드</strong>를 원하는 위치에 붙여넣으시면, 해당 위치에 <span className="text-blue-600 font-bold">이름 입력칸, 연락처 입력칸, 신청하기 버튼</span>이 자동으로 생성됩니다.
                            </p>
                            <div className="mt-2 p-2 bg-gray-800 text-yellow-300 font-mono rounded text-xs">
                                &lt;!-- FORM_TOP --&gt; <span className="text-gray-400">// 상단용 입력폼 (주로 메인 비주얼 아래)</span><br />
                                &lt;!-- FORM_MIDDLE --&gt; <span className="text-gray-400">// 중간용 입력폼 (설명 섹션 사이)</span>
                            </div>
                            <p className="mt-1 text-red-600 text-xs font-bold">
                                ※ 주의: 직접 &lt;input&gt; 태그를 작성하지 마세요! 위 주석 코드만 넣으면 시스템이 알아서 입력폼을 만들어줍니다.
                            </p>
                        </div>

                        <div className="border-t border-yellow-200 pt-2">
                            <p className="font-bold text-gray-800">2. 적용 범위</p>
                            <p>이곳에서 수정한 내용은 <strong>본사 및 모든 파트너(대리점장, 판매원)</strong>의 B2B 랜딩페이지에 공통으로 적용됩니다.</p>
                        </div>

                        <div className="border-t border-yellow-200 pt-2">
                            <p className="font-bold text-gray-800">3. 스타일링</p>
                            <p>Tailwind CSS 클래스를 자유롭게 사용하여 디자인할 수 있습니다.</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="h-96 flex items-center justify-center text-gray-500">로딩 중...</div>
                ) : (
                    <textarea
                        value={html}
                        onChange={(e) => setHtml(e.target.value)}
                        className="w-full h-[800px] font-mono text-sm p-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-900 text-gray-100"
                        spellCheck={false}
                    />
                )}
            </div>
        </div>
    );
}
