'use client';

import { useState } from 'react';
import { FiSend, FiUsers, FiAlertCircle, FiCheckCircle, FiLoader } from 'react-icons/fi';
import { showSuccess, showError } from '@/components/ui/Toast';
import { logger } from '@/lib/logger';

type TargetGroup = 'all' | 'active' | 'inProgress' | 'hibernated';

export default function BroadcastPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetGroup, setTargetGroup] = useState<TargetGroup>('all');
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{
    sent: number;
    failed: number;
    targetCount: number | string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      showError('제목과 내용을 모두 입력해주세요.');
      return;
    }

    if (!confirm(`정말로 ${getTargetGroupLabel(targetGroup)}에게 공지를 발송하시겠습니까?`)) {
      return;
    }

    setIsSending(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          targetGroup,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setLastResult(data.result);
        showSuccess(`공지가 성공적으로 발송되었습니다. (${data.result.sent}명)`);
        // 폼 초기화
        setTitle('');
        setMessage('');
      } else {
        showError(data.error || '공지 발송에 실패했습니다.');
      }
    } catch (error) {
      logger.error('[Broadcast] 발송 오류:', error);
      showError('공지 발송 중 오류가 발생했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  const getTargetGroupLabel = (group: TargetGroup): string => {
    switch (group) {
      case 'all':
        return '전체 사용자';
      case 'active':
        return '활성 사용자';
      case 'inProgress':
        return '여행 중인 사용자';
      case 'hibernated':
        return '동면 사용자';
      default:
        return '전체 사용자';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-red-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <FiAlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">긴급 공지 발송</h1>
              <p className="text-gray-600 mt-1">모든 사용자 또는 특정 그룹에게 즉시 공지를 발송합니다.</p>
            </div>
          </div>
        </div>

        {/* 발송 폼 */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 대상 그룹 선택 */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                <FiUsers className="inline mr-2" />
                발송 대상
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { value: 'all', label: '전체 사용자', icon: '👥' },
                  { value: 'active', label: '활성 사용자', icon: '✅' },
                  { value: 'inProgress', label: '여행 중', icon: '🚢' },
                  { value: 'hibernated', label: '동면 사용자', icon: '💤' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTargetGroup(option.value as TargetGroup)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      targetGroup === option.value
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{option.icon}</div>
                    <div className="text-sm font-semibold">{option.label}</div>
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                선택된 대상: <span className="font-semibold">{getTargetGroupLabel(targetGroup)}</span>
              </p>
            </div>

            {/* 제목 입력 */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 긴급 안내, 중요 공지 등"
                required
                maxLength={100}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              <p className="text-sm text-gray-500 mt-1">{title.length}/100</p>
            </div>

            {/* 내용 입력 */}
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">
                내용 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="발송할 공지 내용을 입력하세요..."
                required
                rows={8}
                maxLength={500}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base resize-none"
              />
              <p className="text-sm text-gray-500 mt-1">{message.length}/500</p>
            </div>

            {/* 발송 결과 */}
            {lastResult && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">발송 완료</span>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p>• 발송 성공: {lastResult.sent}명</p>
                  {lastResult.failed > 0 && (
                    <p>• 발송 실패: {lastResult.failed}명</p>
                  )}
                  <p>• 대상 인원: {lastResult.targetCount === '전체' ? '전체 사용자' : `${lastResult.targetCount}명`}</p>
                </div>
              </div>
            )}

            {/* 주의사항 */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">⚠️ 주의사항</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>발송된 공지는 즉시 모든 대상 사용자에게 전달됩니다.</li>
                    <li>발송 후 취소할 수 없으니 내용을 꼼꼼히 확인해주세요.</li>
                    <li>푸시 알림이 활성화된 사용자에게만 전달됩니다.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 발송 버튼 */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSending || !title.trim() || !message.trim()}
                className={`flex-1 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-bold text-lg hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 ${
                  isSending || !title.trim() || !message.trim()
                    ? 'opacity-50 cursor-not-allowed'
                    : 'shadow-lg hover:shadow-xl'
                }`}
              >
                {isSending ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  <>
                    <FiSend className="w-5 h-5" />
                    공지 발송하기
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


