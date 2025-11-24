'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiArrowLeft,
  FiExternalLink,
  FiRefreshCw,
  FiSave,
  FiUser,
  FiUpload,
  FiCheck,
  FiFile,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

type EditableField =
  | 'profileTitle'
  | 'landingAnnouncement'
  | 'welcomeMessage'
  | 'bio'
  | 'profileImage'
  | 'coverImage'
  | 'kakaoLink'
  | 'contactPhone'
  | 'contactEmail'
  | 'homepageUrl'
  | 'instagramHandle'
  | 'youtubeChannel';

type AffiliateProfile = {
  id: number;
  affiliateCode: string;
  type: 'BRANCH_MANAGER' | 'SALES_AGENT' | 'HQ';
  status: string;
  displayName?: string | null;
  branchLabel?: string | null;
  nickname?: string | null;
  profileTitle?: string | null;
  landingSlug?: string | null;
  landingAnnouncement?: string | null;
  welcomeMessage?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  homepageUrl?: string | null;
  kakaoLink?: string | null;
  instagramHandle?: string | null;
  youtubeChannel?: string | null;
  published: boolean;
  user: {
    name: string | null;
    email: string | null;
    phone: string | null;
    mallUserId: string | null;
    mallNickname: string | null;
  } | null;
};

type FormState = Record<EditableField, string>;

type AffiliateTypeLabel = Record<AffiliateProfile['type'], string>;

const EMPTY_FORM: FormState = {
  profileTitle: '',
  landingAnnouncement: '',
  welcomeMessage: '',
  bio: '',
  profileImage: '',
  coverImage: '',
  kakaoLink: '',
  contactPhone: '',
  contactEmail: '',
  homepageUrl: '',
  instagramHandle: '',
  youtubeChannel: '',
};

const TYPE_LABEL: AffiliateTypeLabel = {
  HQ: '본사',
  BRANCH_MANAGER: '대리점장',
  SALES_AGENT: '판매원',
};

type MyProfileClientProps = {
  initialProfile?: AffiliateProfile | null;
  readOnly?: boolean; // 관리자 모드일 때 true
};

export default function MyProfileClient({ initialProfile = null, readOnly = false }: MyProfileClientProps = {}) {
  const router = useRouter();
  const [profile, setProfile] = useState<AffiliateProfile | null>(initialProfile);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const landingUrl = useMemo(() => {
    if (!profile?.affiliateCode || !profile?.landingSlug) return null;
    return `/store/${profile.affiliateCode}/${profile.landingSlug}`;
  }, [profile?.affiliateCode, profile?.landingSlug]);

  const partnerMallUrl = useMemo(() => {
    if (!profile?.user?.mallUserId) return null;
    return `/${profile.user.mallUserId}/shop`;
  }, [profile?.user?.mallUserId]);

  const dashboardUrl = useMemo(() => {
    if (!profile?.user?.mallUserId) return '/partner';
    return `/${profile.user.mallUserId}/dashboard`;
  }, [profile?.user?.mallUserId]);

  // 초기 프로필 데이터가 있으면 폼 상태 설정
  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setFormState({
        profileTitle: initialProfile.profileTitle ?? '',
        landingAnnouncement: initialProfile.landingAnnouncement ?? '',
        welcomeMessage: initialProfile.welcomeMessage ?? '',
        bio: initialProfile.bio ?? '',
        profileImage: initialProfile.profileImage ?? '',
        coverImage: initialProfile.coverImage ?? '',
        kakaoLink: initialProfile.kakaoLink ?? '',
        contactPhone: initialProfile.contactPhone ?? '',
        contactEmail: initialProfile.contactEmail ?? '',
        homepageUrl: initialProfile.homepageUrl ?? '',
        instagramHandle: initialProfile.instagramHandle ?? '',
        youtubeChannel: initialProfile.youtubeChannel ?? '',
      });
      setLoading(false);
    }
  }, [initialProfile]);

  useEffect(() => {
    // 초기 프로필이 없을 때만 API 호출
    if (initialProfile) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/affiliate/me/profile', { credentials: 'include' });
        if (res.status === 401) {
          // mallUserId를 가져와서 개인 프로필로 리다이렉트
          const meRes = await fetch('/api/auth/me', { credentials: 'include' });
          const meJson = await meRes.json();
          if (meJson?.ok && meJson?.user?.mallUserId) {
            router.push(`/${meJson.user.mallUserId}/profile`);
          } else {
            router.push('/partner');
          }
          return;
        }
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message || '프로필 정보를 불러오지 못했습니다.');
        }
        const profileData: AffiliateProfile = json.profile;
        setProfile(profileData);
        setFormState({
          profileTitle: profileData.profileTitle ?? '',
          landingAnnouncement: profileData.landingAnnouncement ?? '',
          welcomeMessage: profileData.welcomeMessage ?? '',
          bio: profileData.bio ?? '',
          profileImage: profileData.profileImage ?? '',
          coverImage: profileData.coverImage ?? '',
          kakaoLink: profileData.kakaoLink ?? '',
          contactPhone: profileData.contactPhone ?? '',
          contactEmail: profileData.contactEmail ?? '',
          homepageUrl: profileData.homepageUrl ?? '',
          instagramHandle: profileData.instagramHandle ?? '',
          youtubeChannel: profileData.youtubeChannel ?? '',
        });
      } catch (err: any) {
        console.error('[AffiliateMyProfile] fetch error', err);
        setError(err.message || '프로필 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router, initialProfile]);

  const handleChange = (field: EditableField, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: Partial<FormState> = {};
      (Object.keys(formState) as EditableField[]).forEach((key) => {
        payload[key] = formState[key].trim();
      });

      const res = await fetch('/api/affiliate/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '프로필을 저장하지 못했습니다.');
      }

      const updated: AffiliateProfile = json.profile;
      setProfile(updated);
      showSuccess('프로필이 저장되었어요.');
    } catch (err: any) {
      console.error('[AffiliateMyProfile] save error', err);
      showError(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">프로필을 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <h1 className="text-lg font-semibold text-red-600 mb-2">프로필을 찾을 수 없어요</h1>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <Link
            href={dashboardUrl || '/partner'}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
          >
            <FiArrowLeft className="text-base" /> 대시보드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="mx-auto w-full max-w-5xl px-4 pt-12">
        <div className="mb-6">
          <Link
            href={dashboardUrl || '/partner'}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <FiArrowLeft className="text-base" /> 대시보드로 돌아가기
          </Link>
        </div>

        <header className="mb-8 rounded-3xl bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <FiUser className="text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">나의 어필리에이트 프로필</h1>
                  <p className="text-sm text-slate-600">
                    {profile.user?.name ?? '사용자'} · {TYPE_LABEL[profile.type]}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                  코드: {profile.affiliateCode}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  상태: {profile.status}
                </span>
                {landingUrl && (
                  <a
                    href={landingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    <FiExternalLink className="text-base" /> 랜딩 페이지 보기
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {profile.type === 'BRANCH_MANAGER' && (
                <Link
                  href="/affiliate/team"
                  className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100"
                >
                  팀 관리
                </Link>
              )}
              <button
                onClick={() => {
                  setFormState({
                    profileTitle: profile.profileTitle ?? '',
                    landingAnnouncement: profile.landingAnnouncement ?? '',
                    welcomeMessage: profile.welcomeMessage ?? '',
                    bio: profile.bio ?? '',
                    profileImage: profile.profileImage ?? '',
                    coverImage: profile.coverImage ?? '',
                    kakaoLink: profile.kakaoLink ?? '',
                    contactPhone: profile.contactPhone ?? '',
                    contactEmail: profile.contactEmail ?? '',
                    homepageUrl: profile.homepageUrl ?? '',
                    instagramHandle: profile.instagramHandle ?? '',
                    youtubeChannel: profile.youtubeChannel ?? '',
                  });
                  showSuccess('최신 저장 값으로 초기화했습니다.');
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                disabled={saving}
              >
                <FiRefreshCw className="text-base" /> 되돌리기
              </button>
              {!readOnly && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:bg-blue-300"
                >
                  <FiSave className="text-base" />
                  {saving ? '저장 중...' : '저장하기'}
                </button>
              )}
              {readOnly && (
                <span className="inline-flex items-center gap-2 rounded-xl bg-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-800">
                  관리자 모드 (읽기 전용)
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-8">
          <section className="rounded-3xl bg-white/90 p-6 shadow-sm backdrop-blur">
            <h2 className="mb-4 text-lg font-bold text-slate-900">본사에서 설정한 기본 정보</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <dl className="space-y-1 text-sm">
                <dt className="font-semibold text-slate-600">표시 이름</dt>
                <dd className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
                  {profile.displayName || '—'}
                </dd>
              </dl>
              <dl className="space-y-1 text-sm">
                <dt className="font-semibold text-slate-600">지점명 / 팀명</dt>
                <dd className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
                  {profile.branchLabel || '—'}
                </dd>
              </dl>
              <dl className="space-y-1 text-sm">
                <dt className="font-semibold text-slate-600">닉네임</dt>
                <dd className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
                  {profile.nickname || '—'}
                </dd>
              </dl>
              <dl className="space-y-1 text-sm">
                <dt className="font-semibold text-slate-600">랜딩 슬러그</dt>
                <dd className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
                  {profile.landingSlug || '—'}
                </dd>
              </dl>
              <dl className="space-y-1 text-sm">
                <dt className="font-semibold text-slate-600">파트너 아이디</dt>
                <dd className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-slate-800 flex items-center gap-2">
                  <span>{profile.user?.mallUserId || '발급 예정'}</span>
                  <span className="text-xs font-normal text-slate-500">(초기 비밀번호: qwe1)</span>
                </dd>
              </dl>
              <dl className="space-y-1 text-sm">
                <dt className="font-semibold text-slate-600">파트너몰 링크</dt>
                <dd className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
                  {partnerMallUrl ? (
                    <a
                      href={partnerMallUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      <FiExternalLink className="text-base" /> {partnerMallUrl}
                    </a>
                  ) : (
                    '발급 예정'
                  )}
                </dd>
              </dl>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              기본 정보는 본사에서만 수정할 수 있습니다. 변경이 필요하면 운영팀에 문의해주세요.
            </p>
          </section>

          <section className="rounded-3xl bg-white/90 p-6 shadow-sm backdrop-blur">
            <h2 className="mb-4 text-lg font-bold text-slate-900">랜딩 페이지 콘텐츠</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500">프로필 제목</label>
                  <input
                    value={formState.profileTitle}
                    onChange={(e) => handleChange('profileTitle', e.target.value)}
                    placeholder="예: 크루즈닷 부산지점"
                    disabled={readOnly}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500">랜딩 공지</label>
                  <textarea
                    value={formState.landingAnnouncement}
                    onChange={(e) => handleChange('landingAnnouncement', e.target.value)}
                    rows={3}
                    placeholder="방문자에게 보여줄 공지사항을 입력하세요."
                    disabled={readOnly}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500">환영 메시지</label>
                  <textarea
                    value={formState.welcomeMessage}
                    onChange={(e) => handleChange('welcomeMessage', e.target.value)}
                    rows={3}
                    placeholder="파트너몰 방문 고객에게 전할 인사를 입력하세요."
                    disabled={readOnly}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500">프로필 이미지 URL</label>
                  <input
                    value={formState.profileImage}
                    onChange={(e) => handleChange('profileImage', e.target.value)}
                    placeholder="이미지 URL을 입력하세요"
                    disabled={readOnly}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  {formState.profileImage && (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                      <p className="mb-2 font-semibold text-slate-600">미리보기</p>
                      <Image
                        src={formState.profileImage}
                        alt="프로필 미리보기"
                        width={200}
                        height={200}
                        className="h-auto w-full max-w-[200px] rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500">커버 이미지 URL</label>
                  <input
                    value={formState.coverImage}
                    onChange={(e) => handleChange('coverImage', e.target.value)}
                    placeholder="커버 이미지 URL을 입력하세요"
                    disabled={readOnly}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white/90 p-6 shadow-sm backdrop-blur">
            <h2 className="mb-4 text-lg font-bold text-slate-900">연락처 및 SNS 정보</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500">카카오톡 채널 링크</label>
                <input
                  value={formState.kakaoLink}
                  onChange={(e) => handleChange('kakaoLink', e.target.value)}
                  placeholder="https://"
                  disabled={readOnly}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500">연락처</label>
                <input
                  value={formState.contactPhone}
                  onChange={(e) => handleChange('contactPhone', e.target.value)}
                  placeholder="010-0000-0000"
                  disabled={readOnly}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500">이메일</label>
                <input
                  value={formState.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  placeholder="example@cruisedot.com"
                  disabled={readOnly}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500">홈페이지</label>
                <input
                  value={formState.homepageUrl}
                  onChange={(e) => handleChange('homepageUrl', e.target.value)}
                  placeholder="https://"
                  disabled={readOnly}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500">인스타그램 핸들</label>
                <input
                  value={formState.instagramHandle}
                  onChange={(e) => handleChange('instagramHandle', e.target.value)}
                  placeholder="@cruisedot"
                  disabled={readOnly}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500">유튜브 채널 링크</label>
                <input
                  value={formState.youtubeChannel}
                  onChange={(e) => handleChange('youtubeChannel', e.target.value)}
                  placeholder="https://"
                  disabled={readOnly}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white/90 p-6 shadow-sm backdrop-blur">
            <h2 className="mb-4 text-lg font-bold text-slate-900">소개 및 설명</h2>
            <textarea
              value={formState.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              rows={6}
              placeholder="소개 문구를 입력하세요."
              disabled={readOnly}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </section>

          {/* 신분증/통장 업로드 */}
          {!readOnly && (profile.type === 'SALES_AGENT' || profile.type === 'BRANCH_MANAGER') && (
            <section className="rounded-3xl bg-white/90 p-6 shadow-sm backdrop-blur">
              <h2 className="mb-4 text-lg font-bold text-slate-900">📄 신분증/통장 업로드</h2>
              <div className="mb-4 rounded-xl bg-yellow-50 border border-yellow-200 p-4">
                <p className="text-sm text-yellow-700">
                  계약서 승인을 위해 신분증과 통장 사본을 업로드해주세요. 관리자가 확인 후 승인합니다.
                </p>
              </div>
              <DocumentUploadSection profile={profile} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// 신분증/통장 업로드 섹션 컴포넌트
function DocumentUploadSection({ profile }: { profile: AffiliateProfile }) {
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [bankbookFile, setBankbookFile] = useState<File | null>(null);
  const [idCardUploading, setIdCardUploading] = useState(false);
  const [bankbookUploading, setBankbookUploading] = useState(false);
  const [idCardDoc, setIdCardDoc] = useState<{
    filePath: string;
    isApproved: boolean;
  } | null>(null);
  const [bankbookDoc, setBankbookDoc] = useState<{
    filePath: string;
    isApproved: boolean;
  } | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // 문서 목록 로드
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoadingDocs(true);
        const res = await fetch('/api/affiliate/profile/upload-documents', {
          credentials: 'include',
        });
        const json = await res.json();
        if (res.ok && json.ok && json.documents) {
          const idCard = json.documents.find((d: any) => d.documentType === 'ID_CARD');
          const bankbook = json.documents.find((d: any) => d.documentType === 'BANKBOOK');
          if (idCard) {
            setIdCardDoc({
              filePath: idCard.filePath,
              isApproved: idCard.isApproved || false,
            });
          }
          if (bankbook) {
            setBankbookDoc({
              filePath: bankbook.filePath,
              isApproved: bankbook.isApproved || false,
            });
          }
        }
      } catch (error) {
        console.error('[DocumentUpload] Load documents error:', error);
      } finally {
        setLoadingDocs(false);
      }
    };
    
    loadDocuments();
  }, [profile]);

  const handleIdCardUpload = async () => {
    if (!idCardFile) {
      showError('신분증 파일을 선택해주세요');
      return;
    }

    setIdCardUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', idCardFile);
      formData.append('documentType', 'ID_CARD');

      const res = await fetch('/api/affiliate/profile/upload-documents', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || '신분증 업로드에 실패했습니다');
      }

      showSuccess('완료되었습니다');
      setIdCardFile(null);
      
      // 문서 목록 다시 로드
      const docRes = await fetch('/api/affiliate/profile/upload-documents', {
        credentials: 'include',
      });
      const docJson = await docRes.json();
      if (docRes.ok && docJson.ok && docJson.documents) {
        const idCard = docJson.documents.find((d: any) => d.documentType === 'ID_CARD');
        if (idCard) {
          setIdCardDoc({
            filePath: idCard.filePath,
            isApproved: idCard.isApproved || false,
          });
        }
      }
      
      // 파일 입력 초기화
      const input = document.getElementById('idCardInput') as HTMLInputElement;
      if (input) input.value = '';
    } catch (error: any) {
      console.error('[DocumentUpload] IdCard upload error:', error);
      showError(error.message || '신분증 업로드 중 오류가 발생했습니다');
    } finally {
      setIdCardUploading(false);
    }
  };

  const handleBankbookUpload = async () => {
    if (!bankbookFile) {
      showError('통장 파일을 선택해주세요');
      return;
    }

    setBankbookUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', bankbookFile);
      formData.append('documentType', 'BANKBOOK');

      const res = await fetch('/api/affiliate/profile/upload-documents', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || '통장 업로드에 실패했습니다');
      }

      showSuccess('완료되었습니다');
      setBankbookFile(null);
      
      // 문서 목록 다시 로드
      const docRes = await fetch('/api/affiliate/profile/upload-documents', {
        credentials: 'include',
      });
      const docJson = await docRes.json();
      if (docRes.ok && docJson.ok && docJson.documents) {
        const bankbook = docJson.documents.find((d: any) => d.documentType === 'BANKBOOK');
        if (bankbook) {
          setBankbookDoc({
            filePath: bankbook.filePath,
            isApproved: bankbook.isApproved || false,
          });
        }
      }
      
      // 파일 입력 초기화
      const input = document.getElementById('bankbookInput') as HTMLInputElement;
      if (input) input.value = '';
    } catch (error: any) {
      console.error('[DocumentUpload] Bankbook upload error:', error);
      showError(error.message || '통장 업로드 중 오류가 발생했습니다');
    } finally {
      setBankbookUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 신분증 업로드 */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          신분증 사본 <span className="text-red-500">*</span>
        </label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          {loadingDocs ? (
            <p className="text-xs text-slate-500 mb-2">문서 정보를 불러오는 중...</p>
          ) : idCardDoc ? (
            <div className="space-y-3">
              {/* 승인된 경우 이미지 미리보기 */}
              {idCardDoc.isApproved && idCardDoc.filePath && (
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <FiCheck className="text-green-600" />
                    <span className="text-xs font-semibold text-green-700">✅ 승인 완료 - 활성화됨</span>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-green-200 bg-white">
                    <img
                      src={idCardDoc.filePath.startsWith('http') ? idCardDoc.filePath : (typeof window !== 'undefined' ? `${window.location.origin}${idCardDoc.filePath}` : idCardDoc.filePath)}
                      alt="신분증"
                      className="w-full h-auto max-h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        const url = idCardDoc.filePath.startsWith('http') ? idCardDoc.filePath : (typeof window !== 'undefined' ? `${window.location.origin}${idCardDoc.filePath}` : idCardDoc.filePath);
                        if (typeof window !== 'undefined') {
                          window.open(url, '_blank');
                        }
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <FiCheck className="text-base" />
                  <span className="font-semibold">업로드 완료</span>
                  {!idCardDoc.isApproved && (
                    <span className="text-xs text-yellow-600">(승인 대기 중)</span>
                  )}
                </div>
                <a
                  href={idCardDoc.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <FiFile className="text-base" />
                  확인하기
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mb-2">신분증 사본을 업로드해주세요 (JPG, PNG, PDF)</p>
          )}
          <div className="flex items-center gap-2">
            <input
              id="idCardInput"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              onChange={(e) => setIdCardFile(e.target.files?.[0] || null)}
              className="flex-1 text-xs text-slate-700 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={idCardUploading}
            />
            <button
              type="button"
              onClick={handleIdCardUpload}
              disabled={!idCardFile || idCardUploading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              <FiUpload className="text-base" />
              {idCardUploading ? '업로드 중...' : '업로드'}
            </button>
          </div>
        </div>
      </div>

      {/* 통장 업로드 */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          통장 사본 <span className="text-red-500">*</span>
        </label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          {loadingDocs ? (
            <p className="text-xs text-slate-500 mb-2">문서 정보를 불러오는 중...</p>
          ) : bankbookDoc ? (
            <div className="space-y-3">
              {/* 승인된 경우 이미지 미리보기 */}
              {bankbookDoc.isApproved && bankbookDoc.filePath && (
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <FiCheck className="text-green-600" />
                    <span className="text-xs font-semibold text-green-700">✅ 승인 완료 - 활성화됨</span>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-green-200 bg-white">
                    <img
                      src={bankbookDoc.filePath.startsWith('http') ? bankbookDoc.filePath : (typeof window !== 'undefined' ? `${window.location.origin}${bankbookDoc.filePath}` : bankbookDoc.filePath)}
                      alt="통장사본"
                      className="w-full h-auto max-h-48 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        const url = bankbookDoc.filePath.startsWith('http') ? bankbookDoc.filePath : (typeof window !== 'undefined' ? `${window.location.origin}${bankbookDoc.filePath}` : bankbookDoc.filePath);
                        if (typeof window !== 'undefined') {
                          window.open(url, '_blank');
                        }
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <FiCheck className="text-base" />
                  <span className="font-semibold">업로드 완료</span>
                  {!bankbookDoc.isApproved && (
                    <span className="text-xs text-yellow-600">(승인 대기 중)</span>
                  )}
                </div>
                <a
                  href={bankbookDoc.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <FiFile className="text-base" />
                  확인하기
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mb-2">통장 사본을 업로드해주세요 (JPG, PNG, PDF)</p>
          )}
          <div className="flex items-center gap-2">
            <input
              id="bankbookInput"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              onChange={(e) => setBankbookFile(e.target.files?.[0] || null)}
              className="flex-1 text-xs text-slate-700 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={bankbookUploading}
            />
            <button
              type="button"
              onClick={handleBankbookUpload}
              disabled={!bankbookFile || bankbookUploading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              <FiUpload className="text-base" />
              {bankbookUploading ? '업로드 중...' : '업로드'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
