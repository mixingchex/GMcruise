'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiLock, FiVideo, FiX } from 'react-icons/fi';
import VideoConference from '@/components/video/VideoConference';
import { showError } from '@/components/ui/Toast';

export default function MeetingJoinPage() {
  const params = useParams();
  const router = useRouter();
  const meetingLink = params.meetingLink as string;
  
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    // URL에서 비밀번호 확인
    const urlParams = new URLSearchParams(window.location.search);
    const urlPassword = urlParams.get('password');
    
    if (urlPassword) {
      setPassword(urlPassword);
    }

    // 미팅 정보 조회
    checkMeeting();
  }, [meetingLink]);

  const checkMeeting = async () => {
    try {
      setLoading(true);
      const url = `/api/video/rooms/${meetingLink}${password ? `?password=${password}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (data.requiresPassword) {
          setShowPasswordInput(true);
        } else {
          showError(data.error || '미팅에 참가할 수 없습니다.');
          setTimeout(() => router.push('/'), 2000);
        }
        return;
      }

      setRoomInfo(data.room);
      setShowPasswordInput(false);
      
      // maxParticipants 정보 저장
      if (data.room.maxParticipants) {
        // 나중에 VideoConference에 전달하기 위해 저장
      }
    } catch (error) {
      console.error('[MeetingJoin] Error:', error);
      showError('미팅 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!userName.trim()) {
      showError('이름을 입력해주세요.');
      return;
    }

    if (showPasswordInput && !password.trim()) {
      showError('비밀번호를 입력해주세요.');
      return;
    }

    if (showPasswordInput) {
      await checkMeeting();
      if (!roomInfo) return;
    }

    setJoined(true);
  };

  if (joined && roomInfo) {
    return (
      <VideoConference
        roomId={roomInfo.roomId}
        userName={userName}
        onLeave={() => router.push('/')}
        isHost={roomInfo.isHost || false}
        maxParticipants={roomInfo.maxParticipants || 50}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <FiVideo className="text-3xl text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">화상 회의 참가</h1>
          {roomInfo && (
            <p className="text-gray-600">{roomInfo.title}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">이름만 입력하면 바로 참여할 수 있습니다</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">미팅 정보 확인 중...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 이름 입력 - 간단하게 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                참가자 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="이름을 입력하세요"
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                onKeyPress={(e) => e.key === 'Enter' && userName.trim() && handleJoin()}
              />
              <p className="text-xs text-gray-500 mt-1">Enter 키를 누르면 바로 참여합니다</p>
            </div>

            {/* 비밀번호 입력 */}
            {showPasswordInput && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiLock className="inline mr-1" />
                  미팅 비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                />
              </div>
            )}

            {/* 미팅 정보 */}
            {roomInfo && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">호스트:</span>
                  <span className="font-semibold text-gray-900">{roomInfo.hostName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">참가자:</span>
                  <span className="font-semibold text-gray-900">
                    {roomInfo.currentParticipants} / {roomInfo.maxParticipants}명
                  </span>
                </div>
              </div>
            )}

            {/* 참가 버튼 */}
            <button
              onClick={handleJoin}
              disabled={!userName.trim() || (showPasswordInput && !password.trim())}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              미팅 참가하기
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

