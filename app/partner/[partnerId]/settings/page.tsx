'use client';

import { useState, useEffect } from 'react';
import { FiSave, FiEdit2, FiEye, FiEyeOff, FiCopy, FiCheck, FiKey } from 'react-icons/fi';
import { useParams } from 'next/navigation';
import { showSuccess, showError } from '@/components/ui/Toast';

type SmsConfig = {
  provider: string;
  apiKey: string;
  userId: string;
  senderPhone: string;
  kakaoSenderKey?: string;
  kakaoChannelId?: string;
  isActive: boolean;
};

export default function PartnerSettingsPage() {
  const params = useParams();
  const partnerId = params.partnerId as string;

  const [smsConfig, setSmsConfig] = useState<SmsConfig | null>(null);
  const [isLoadingSmsConfig, setIsLoadingSmsConfig] = useState(false);
  const [isEditingSmsConfig, setIsEditingSmsConfig] = useState(false);
  const [editableSmsConfig, setEditableSmsConfig] = useState<Partial<SmsConfig>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [showKakaoSenderKey, setShowKakaoSenderKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 비밀번호 변경 관련 상태
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    loadSmsConfig();
  }, []);

  const loadSmsConfig = async () => {
    try {
      setIsLoadingSmsConfig(true);
      const response = await fetch('/api/partner/settings/sms', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setSmsConfig(data.config);
        setEditableSmsConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to load SMS config:', error);
    } finally {
      setIsLoadingSmsConfig(false);
    }
  };

  const handleSaveSmsConfig = async () => {
    try {
      const response = await fetch('/api/partner/settings/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editableSmsConfig),
      });

      const data = await response.json();
      if (data.ok) {
        alert('SMS API 설정이 저장되었습니다.');
        setIsEditingSmsConfig(false);
        await loadSmsConfig();
      } else {
        alert('저장 실패: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save SMS config:', error);
      alert('SMS 설정 저장 중 오류가 발생했습니다.');
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('복사 실패');
    }
  };

  const maskSensitiveInfo = (text: string, show: boolean) => {
    if (!text) return '';
    if (show) return text;
    if (text.length <= 8) return '•'.repeat(text.length);
    return text.substring(0, 4) + '•'.repeat(text.length - 8) + text.substring(text.length - 4);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.trim().length === 0) {
      showError('새 비밀번호를 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/partner/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await response.json();
      if (data.ok) {
        showSuccess('비밀번호가 성공적으로 변경되었습니다.');
        setIsEditingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showError(data.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      showError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">⚙️ 설정</h1>
        <p className="text-gray-600">계정 설정과 SMS API 설정을 관리하세요</p>
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiKey className="text-3xl text-blue-600" />
            비밀번호 변경
          </h2>
          <div className="flex gap-3">
            {isEditingPassword && (
              <button
                onClick={() => {
                  setIsEditingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-semibold"
              >
                취소
              </button>
            )}
            <button
              onClick={isEditingPassword ? handleChangePassword : () => setIsEditingPassword(true)}
              disabled={isChangingPassword}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${
                isEditingPassword
                  ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isChangingPassword ? (
                <>
                  <span className="animate-spin">⏳</span>
                  변경 중...
                </>
              ) : isEditingPassword ? (
                <>
                  <FiSave size={18} />
                  변경하기
                </>
              ) : (
                <>
                  <FiEdit2 size={18} />
                  수정하기
                </>
              )}
            </button>
          </div>
        </div>
        {isEditingPassword ? (
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              <label className="text-sm font-semibold text-gray-600 mb-1 block">
                현재 비밀번호 (선택사항)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="현재 비밀번호를 입력하세요 (선택사항)"
                />
                <button
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={showCurrentPassword ? '숨기기' : '보기'}
                >
                  {showCurrentPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                현재 비밀번호를 입력하면 더 안전합니다. 비워두어도 변경 가능합니다.
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              <label className="text-sm font-semibold text-gray-600 mb-1 block">
                새 비밀번호 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="새 비밀번호를 입력하세요"
                  required
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={showNewPassword ? '숨기기' : '보기'}
                >
                  {showNewPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              <label className="text-sm font-semibold text-gray-600 mb-1 block">
                새 비밀번호 확인 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="새 비밀번호를 다시 입력하세요"
                  required
                />
                <button
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={showConfirmPassword ? '숨기기' : '보기'}
                >
                  {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 안내:</strong> 비밀번호를 변경하면 관리자 패널에서도 즉시 확인할 수 있습니다.
                <br />
                비밀번호는 문자와 숫자를 모두 포함할 수 있으며, 평문으로 저장되어 관리자 패널에서 그대로 확인 가능합니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
            <p className="text-gray-600">
              비밀번호를 변경하려면 "수정하기" 버튼을 클릭하세요.
            </p>
          </div>
        )}
      </div>

      {/* SMS API 설정 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-3xl">📱</span>
            SMS API 설정
          </h2>
          <div className="flex gap-3">
            {isEditingSmsConfig && (
              <button
                onClick={() => {
                  setEditableSmsConfig(smsConfig || {});
                  setIsEditingSmsConfig(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-semibold"
              >
                취소
              </button>
            )}
            <button
              onClick={isEditingSmsConfig ? handleSaveSmsConfig : () => setIsEditingSmsConfig(true)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${
                isEditingSmsConfig
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isEditingSmsConfig ? (
                <>
                  <FiSave size={18} />
                  저장하기
                </>
              ) : (
                <>
                  <FiEdit2 size={18} />
                  수정하기
                </>
              )}
            </button>
          </div>
        </div>
        {isLoadingSmsConfig ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">제공자</label>
                {isEditingSmsConfig ? (
                  <select
                    value={editableSmsConfig.provider || 'aligo'}
                    onChange={(e) => setEditableSmsConfig({ ...editableSmsConfig, provider: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="aligo">알리고</option>
                    <option value="coolsms">쿨SMS</option>
                    <option value="twilio">Twilio</option>
                  </select>
                ) : (
                  <span className="text-lg font-medium text-gray-800">{smsConfig?.provider || 'N/A'}</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">API 키</label>
                {isEditingSmsConfig ? (
                  <div className="flex items-center gap-2">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={editableSmsConfig.apiKey || ''}
                      onChange={(e) => setEditableSmsConfig({ ...editableSmsConfig, apiKey: e.target.value })}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="API 키를 입력하세요"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title={showApiKey ? '숨기기' : '보기'}
                    >
                      {showApiKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono text-gray-800">
                      {maskSensitiveInfo(smsConfig?.apiKey || '', showApiKey)}
                    </span>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title={showApiKey ? '숨기기' : '보기'}
                    >
                      {showApiKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => copyToClipboard(smsConfig?.apiKey || '', 'smsApiKey')}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copiedField === 'smsApiKey' ? <FiCheck size={18} /> : <FiCopy size={18} />}
                {copiedField === 'smsApiKey' ? '복사됨' : '복사'}
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">사용자 ID</label>
                {isEditingSmsConfig ? (
                  <input
                    type="text"
                    value={editableSmsConfig.userId || ''}
                    onChange={(e) => setEditableSmsConfig({ ...editableSmsConfig, userId: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="사용자 ID를 입력하세요"
                  />
                ) : (
                  <span className="text-lg font-medium text-gray-800">{smsConfig?.userId || 'N/A'}</span>
                )}
              </div>
              <button
                onClick={() => copyToClipboard(smsConfig?.userId || '', 'smsUserId')}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copiedField === 'smsUserId' ? <FiCheck size={18} /> : <FiCopy size={18} />}
                {copiedField === 'smsUserId' ? '복사됨' : '복사'}
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">발신번호</label>
                {isEditingSmsConfig ? (
                  <input
                    type="text"
                    value={editableSmsConfig.senderPhone || ''}
                    onChange={(e) => setEditableSmsConfig({ ...editableSmsConfig, senderPhone: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="발신번호를 입력하세요"
                  />
                ) : (
                  <span className="text-lg font-medium text-gray-800">{smsConfig?.senderPhone || 'N/A'}</span>
                )}
              </div>
              <button
                onClick={() => copyToClipboard(smsConfig?.senderPhone || '', 'smsSenderPhone')}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copiedField === 'smsSenderPhone' ? <FiCheck size={18} /> : <FiCopy size={18} />}
                {copiedField === 'smsSenderPhone' ? '복사됨' : '복사'}
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">카카오 채널 ID</label>
                {isEditingSmsConfig ? (
                  <input
                    type="text"
                    value={editableSmsConfig.kakaoChannelId || ''}
                    onChange={(e) => setEditableSmsConfig({ ...editableSmsConfig, kakaoChannelId: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="카카오 채널 ID를 입력하세요"
                  />
                ) : (
                  <span className="text-lg font-medium text-gray-800">{smsConfig?.kakaoChannelId || 'N/A'}</span>
                )}
              </div>
              <button
                onClick={() => copyToClipboard(smsConfig?.kakaoChannelId || '', 'smsKakaoChannelId')}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copiedField === 'smsKakaoChannelId' ? <FiCheck size={18} /> : <FiCopy size={18} />}
                {copiedField === 'smsKakaoChannelId' ? '복사됨' : '복사'}
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">카카오 채널 Senderkey</label>
                {isEditingSmsConfig ? (
                  <div className="flex items-center gap-2">
                    <input
                      type={showKakaoSenderKey ? 'text' : 'password'}
                      value={editableSmsConfig.kakaoSenderKey || ''}
                      onChange={(e) => setEditableSmsConfig({ ...editableSmsConfig, kakaoSenderKey: e.target.value })}
                      className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="카카오 채널 Senderkey를 입력하세요"
                    />
                    <button
                      onClick={() => setShowKakaoSenderKey(!showKakaoSenderKey)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title={showKakaoSenderKey ? '숨기기' : '보기'}
                    >
                      {showKakaoSenderKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono text-gray-800">
                      {maskSensitiveInfo(smsConfig?.kakaoSenderKey || '', showKakaoSenderKey)}
                    </span>
                    <button
                      onClick={() => setShowKakaoSenderKey(!showKakaoSenderKey)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title={showKakaoSenderKey ? '숨기기' : '보기'}
                    >
                      {showKakaoSenderKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => copyToClipboard(smsConfig?.kakaoSenderKey || '', 'smsKakaoSenderKey')}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copiedField === 'smsKakaoSenderKey' ? <FiCheck size={18} /> : <FiCopy size={18} />}
                {copiedField === 'smsKakaoSenderKey' ? '복사됨' : '복사'}
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-600 mb-1 block">활성화 상태</label>
                {isEditingSmsConfig ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editableSmsConfig.isActive !== false}
                      onChange={(e) => setEditableSmsConfig({ ...editableSmsConfig, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-lg font-medium text-gray-800">
                      {editableSmsConfig.isActive !== false ? '활성화' : '비활성화'}
                    </span>
                  </label>
                ) : (
                  <span className="text-lg font-medium text-gray-800">
                    {smsConfig?.isActive ? '활성화' : '비활성화'}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>💡 안내:</strong> SMS API 설정을 변경하면 즉시 적용됩니다. 
                다른 API 제공자로 변경하려면 제공자를 선택하고 해당 API의 정보를 입력하세요.
                <br />
                <strong>필수 입력 항목:</strong> 제공자, API 키, 사용자 ID, 발신번호
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}






