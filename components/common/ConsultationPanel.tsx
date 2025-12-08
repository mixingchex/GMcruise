'use client';

import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiSave, FiMic, FiUpload, FiBell, FiClock, FiUser, FiMessageSquare, FiTrash2, FiEdit2, FiPlay, FiPause } from 'react-icons/fi';

// 상담기록 타입
interface ConsultationNote {
  id: string;
  type: 'note' | 'interaction';
  content: string;
  consultedAt: string;
  nextActionDate: string | null;
  nextActionNote: string | null;
  statusAfter: string | null;
  audioFileUrl: string | null;
  createdByName: string;
  createdByLabel: string;
  createdAt: string;
}

interface ConsultationPanelProps {
  // 고객 정보
  customerId?: number;  // User ID (관리자용)
  leadId?: number;      // AffiliateLead ID (파트너용)
  customerName?: string;
  customerPhone?: string;

  // API 엔드포인트
  apiEndpoint: 'admin' | 'partner';

  // 콜백
  onConsultationAdded?: () => void;

  // 옵션
  readOnly?: boolean;
  showNextAction?: boolean;
  nextActionDate?: string | null;
  nextActionNote?: string | null;
}

// 상태 옵션
const STATUS_OPTIONS = [
  { value: '', label: '상태 변경 없음' },
  { value: 'NEW', label: '신규' },
  { value: 'CONTACTED', label: '상담중' },
  { value: 'INTERESTED', label: '관심' },
  { value: 'NEGOTIATING', label: '협상중' },
  { value: 'PURCHASED', label: '구매완료' },
  { value: 'CANCELLED', label: '취소' },
  { value: 'active', label: '활성' },
  { value: 'package', label: '패키지' },
  { value: 'test', label: '체험' },
  { value: 'test-locked', label: '체험잠금' },
];

export default function ConsultationPanel({
  customerId,
  leadId,
  customerName,
  customerPhone,
  apiEndpoint,
  onConsultationAdded,
  readOnly = false,
  showNextAction = true,
  nextActionDate,
  nextActionNote,
}: ConsultationPanelProps) {
  const [consultations, setConsultations] = useState<ConsultationNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 폼 상태
  const [form, setForm] = useState({
    content: '',
    consultedAt: new Date().toISOString().slice(0, 16),
    nextActionDate: '',
    nextActionNote: '',
    statusAfter: '',
    audioFileUrl: '',
  });

  // 오디오 재생 상태
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // API 경로 결정
  const getApiUrl = () => {
    if (apiEndpoint === 'admin' && customerId) {
      return `/api/admin/customers/${customerId}/consultations`;
    } else if (apiEndpoint === 'partner' && leadId) {
      return `/api/partner/customers/${leadId}/consultations`;
    }
    return null;
  };

  const getUploadUrl = () => {
    return apiEndpoint === 'admin' ? '/api/admin/upload/audio' : '/api/partner/upload/audio';
  };

  // 상담기록 로드
  const loadConsultations = async () => {
    const apiUrl = getApiUrl();
    if (!apiUrl) return;

    try {
      setLoading(true);
      const response = await fetch(apiUrl, { credentials: 'include' });
      const data = await response.json();

      if (data.ok) {
        setConsultations(data.consultations || []);
      }
    } catch (error) {
      console.error('[ConsultationPanel] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 상담기록 저장
  const handleSubmit = async () => {
    const apiUrl = getApiUrl();
    if (!apiUrl || !form.content.trim()) {
      alert('상담 내용을 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (data.ok) {
        alert('상담기록이 저장되었습니다.');
        setForm({
          content: '',
          consultedAt: new Date().toISOString().slice(0, 16),
          nextActionDate: '',
          nextActionNote: '',
          statusAfter: '',
          audioFileUrl: '',
        });
        setShowForm(false);
        loadConsultations();
        onConsultationAdded?.();
      } else {
        alert(data.error || data.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('[ConsultationPanel] Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 녹음파일 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 오디오 파일 확인
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
      alert('오디오 파일만 업로드 가능합니다.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      if (customerId) formData.append('customerId', String(customerId));
      if (leadId) formData.append('leadId', String(leadId));

      const response = await fetch(getUploadUrl(), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (data.ok) {
        setForm({ ...form, audioFileUrl: data.url });
        alert('녹음 파일이 업로드되었습니다.');
      } else {
        alert(data.error || '업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('[ConsultationPanel] Upload error:', error);
      alert('업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 오디오 재생
  const toggleAudio = (url: string, id: string) => {
    if (playingAudioId === id) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingAudioId(null);
      setPlayingAudioId(id);
    }
  };

  useEffect(() => {
    loadConsultations();
    return () => {
      audioRef.current?.pause();
    };
  }, [customerId, leadId]);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <FiMessageSquare />
          상담기록
          <span className="text-sm font-normal text-gray-500">({consultations.length}건)</span>
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <FiPlus size={16} />
            기록 추가
          </button>
        )}
      </div>

      {/* 다음 조치 알람 표시 */}
      {showNextAction && nextActionDate && (
        <div className="mx-4 mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <FiBell size={16} />
            <span className="font-medium">다음 조치 예정</span>
            <span className="text-sm">{new Date(nextActionDate).toLocaleDateString('ko-KR')}</span>
          </div>
          {nextActionNote && (
            <p className="mt-1 text-sm text-yellow-700">{nextActionNote}</p>
          )}
        </div>
      )}

      {/* 상담기록 작성 폼 */}
      {showForm && !readOnly && (
        <div className="p-4 border-b bg-blue-50">
          <div className="space-y-3">
            {/* 상담 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상담 내용 *</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="상담 내용을 입력하세요..."
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            {/* 상담일시 + 상태변경 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상담일시</label>
                <input
                  type="datetime-local"
                  value={form.consultedAt}
                  onChange={(e) => setForm({ ...form, consultedAt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상담 후 상태</label>
                <select
                  value={form.statusAfter}
                  onChange={(e) => setForm({ ...form, statusAfter: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 다음 조치 알람 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FiBell className="inline mr-1" size={14} />
                  다음 조치 날짜
                </label>
                <input
                  type="date"
                  value={form.nextActionDate}
                  onChange={(e) => setForm({ ...form, nextActionDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">다음 조치 메모</label>
                <input
                  type="text"
                  value={form.nextActionNote}
                  onChange={(e) => setForm({ ...form, nextActionNote: e.target.value })}
                  placeholder="다음에 할 일..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            {/* 녹음파일 업로드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FiMic className="inline mr-1" size={14} />
                녹음 파일
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <FiUpload size={14} />
                  {isUploading ? '업로드 중...' : '파일 선택'}
                </button>
                {form.audioFileUrl && (
                  <span className="text-sm text-green-600">✓ 녹음파일 첨부됨</span>
                )}
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving || !form.content.trim()}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <FiSave size={14} />
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상담기록 목록 */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : consultations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            아직 상담기록이 없습니다.
          </div>
        ) : (
          <div className="divide-y">
            {consultations.map((consultation) => (
              <div key={consultation.id} className="p-4 hover:bg-gray-50">
                {/* 상담자 정보 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    consultation.createdByLabel === '본사' ? 'bg-gray-100 text-gray-700' :
                    consultation.createdByLabel === '대리점장' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {consultation.createdByLabel}
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {consultation.createdByName}
                  </span>
                  <span className="text-xs text-gray-400">
                    <FiClock className="inline mr-1" size={12} />
                    {new Date(consultation.consultedAt).toLocaleString('ko-KR')}
                  </span>
                </div>

                {/* 상담 내용 */}
                <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                  {consultation.content}
                </p>

                {/* 메타 정보 */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {consultation.statusAfter && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                      상태: {consultation.statusAfter}
                    </span>
                  )}
                  {consultation.nextActionDate && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                      <FiBell className="inline mr-1" size={10} />
                      {new Date(consultation.nextActionDate).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                  {consultation.audioFileUrl && (
                    <button
                      onClick={() => toggleAudio(consultation.audioFileUrl!, consultation.id)}
                      className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      {playingAudioId === consultation.id ? <FiPause size={10} /> : <FiPlay size={10} />}
                      녹음
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
