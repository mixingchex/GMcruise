'use client';

/**
 * PartnerShareButton
 *
 * 파트너가 로그인한 상태로 상품 상세 페이지를 볼 때,
 * 현재 URL에 자신의 어필리에이트 코드(?agent=CODE 또는 ?affiliate=CODE)를
 * 자동으로 붙여서 복사할 수 있는 플로팅 버튼.
 *
 * 고객에게 줄 링크를 수동으로 만들 필요 없이, 버튼 하나로 해결.
 */

import { useEffect, useState } from 'react';
import { FiLink, FiCopy, FiCheckCircle, FiX } from 'react-icons/fi';
import { showSuccess, showError } from '@/components/ui/Toast';

type PartnerProfile = {
  type: string;
  affiliateCode: string | null;
  displayName: string | null;
};

export default function PartnerShareButton({ productCode }: { productCode: string }) {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // 파트너 프로필 로드 (로그인한 경우에만, 파트너가 아니면 null)
  useEffect(() => {
    fetch('/api/affiliate/me/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.profile?.affiliateCode) {
          setProfile(data.profile);
        }
      })
      .catch(() => {
        // 비로그인 또는 파트너 아닌 경우 — 버튼 미표시
      });
  }, []);

  // 어필리에이트 링크 계산
  useEffect(() => {
    if (!profile?.affiliateCode) return;
    const base = `${window.location.origin}/products/${productCode}`;
    const param =
      profile.type === 'BRANCH_MANAGER'
        ? `affiliate=${profile.affiliateCode}`
        : `agent=${profile.affiliateCode}`;
    setShareUrl(`${base}?${param}`);
  }, [profile, productCode]);

  // 파트너가 아니면 아무것도 렌더링하지 않음
  if (!profile?.affiliateCode || !shareUrl) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showSuccess('내 판매 링크가 복사되었습니다!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showError('링크 복사에 실패했습니다.');
    }
  };

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2">
      {/* 확장 패널 */}
      {expanded && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-80 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FiLink className="text-blue-600" size={16} />
              <span className="text-sm font-bold text-gray-900">내 판매 링크</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="닫기"
            >
              <FiX size={16} />
            </button>
          </div>

          {profile.displayName && (
            <p className="text-xs text-gray-500 mb-2">
              {profile.displayName}
              {profile.type === 'BRANCH_MANAGER' ? ' (대리점장)' : ' (판매원)'}
            </p>
          )}

          <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-gray-600 font-mono break-all line-clamp-2">{shareUrl}</p>
          </div>

          <button
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }`}
          >
            {copied ? (
              <>
                <FiCheckCircle size={16} />
                복사 완료!
              </>
            ) : (
              <>
                <FiCopy size={16} />
                링크 복사
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center mt-2">
            이 링크로 구매하면 내 실적으로 자동 연결됩니다
          </p>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className={`flex items-center gap-2 rounded-full shadow-lg px-4 py-3 text-sm font-bold transition-all active:scale-95 ${
          expanded
            ? 'bg-gray-700 text-white'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        aria-label="내 판매 링크 복사"
      >
        <FiLink size={18} />
        <span className="hidden sm:inline">내 링크로 공유</span>
      </button>
    </div>
  );
}
