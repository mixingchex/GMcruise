'use client';

import { useState, useEffect } from 'react';
import { FiCopy, FiCheck, FiEye, FiEyeOff, FiSave, FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi';

type KakaoApiManager = {
  id: string;
  name: string;
  phone: string;
  notifyEnabled: boolean;
  registeredAt: string;
};

type KakaoApiKey = {
  id: string;
  identifier: string;
  key: string;
  registeredAt: string;
};

type KakaoSenderKey = {
  id: string;
  channelId: string;
  senderKey: string;
  registeredAt: string;
};

type ServerIp = {
  id: string;
  ip: string;
  registeredAt: string;
};

type AdminInfo = {
  email: string;
  emailFromName: string;
  emailSmtpHost: string;
  emailSmtpPort: string;
  emailSmtpPassword: string;
  geminiApiKey: string;
  kakaoJsKey: string;
  kakaoAppName: string;
  kakaoAppId: string;
  kakaoRestApiKey: string;
  kakaoAdminKey: string;
  kakaoChannelId: string;
  kakaoChannelName: string;
  kakaoChannelSearchId: string;
  kakaoChannelUrl: string;
  kakaoChannelChatUrl: string;
  kakaoChannelBotId: string;
  aligoApiKey: string;
  aligoUserId: string;
  aligoSenderPhone: string;
  aligoKakaoSenderKey: string;
  aligoKakaoChannelId: string;
  pgSignkey: string;
  pgFieldEncryptIv: string;
  pgFieldEncryptKey: string;
  pgSignkeyNonAuth: string;
  pgFieldEncryptIvNonAuth: string;
  pgFieldEncryptKeyNonAuth: string;
  pgMidAuth: string;
  pgMidPassword: string;
  pgMidNonAuth: string;
  pgAdminUrl: string;
  pgMerchantName: string;
  baseUrl: string;
  pgCallbackUrl: string;
  pgNotifyUrl: string;
  pgVirtualAccountUrl: string;
  sendMethod: string;
  youtubeApiKey: string;
  googleDriveServiceAccountEmail: string;
  googleDriveServiceAccountPrivateKey: string;
  googleDriveSharedDriveId: string;
  googleDriveRootFolderId: string;
  googleDrivePassportFolderId: string;
  kakaoApiManagers?: KakaoApiManager[];
  kakaoApiKeys?: KakaoApiKey[];
  kakaoSenderKeys?: KakaoSenderKey[];
  serverIps?: ServerIp[];
  currentIp?: string;
  createdAt?: string;
  updatedAt?: string;
};

type SmsConfig = {
  provider: string;
  apiKey: string;
  userId: string;
  senderPhone: string;
  kakaoSenderKey?: string;
  kakaoChannelId?: string;
  isActive: boolean;
};

type MarketingConfig = {
  id: number;
  googlePixelId: string;
  googleTagManagerId: string;
  googleAdsId: string;
  googleApiKey: string;
  googleTestMode: boolean;
  facebookPixelId: string;
  facebookAppId: string;
  facebookAccessToken: string;
  facebookTestMode: boolean;
  naverPixelId: string;
  kakaoPixelId: string;
  isGoogleEnabled: boolean;
  isFacebookEnabled: boolean;
  isNaverEnabled: boolean;
  isKakaoEnabled: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
};

export default function AdminSettingsPage() {
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [editableInfo, setEditableInfo] = useState<Partial<AdminInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // 각 카테고리별 편집 상태
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryEditableInfo, setCategoryEditableInfo] = useState<Partial<AdminInfo>>({});
  const [categorySaving, setCategorySaving] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showKakaoKey, setShowKakaoKey] = useState(false);
  const [showKakaoRestApiKey, setShowKakaoRestApiKey] = useState(false);
  const [showKakaoAdminKey, setShowKakaoAdminKey] = useState(false);
  const [showAligoApiKey, setShowAligoApiKey] = useState(false);
  const [showAligoKakaoSenderKey, setShowAligoKakaoSenderKey] = useState(false);
  
  // SMS API 설정 (DB에서 관리)
  const [smsConfig, setSmsConfig] = useState<SmsConfig | null>(null);
  const [isLoadingSmsConfig, setIsLoadingSmsConfig] = useState(false);
  const [isEditingSmsConfig, setIsEditingSmsConfig] = useState(false);
  const [editableSmsConfig, setEditableSmsConfig] = useState<Partial<SmsConfig>>({});
  const [showPgSignkey, setShowPgSignkey] = useState(false);
  const [showPgFieldEncryptKey, setShowPgFieldEncryptKey] = useState(false);
  const [showPgMidPassword, setShowPgMidPassword] = useState(false);
  const [showPgSignkeyNonAuth, setShowPgSignkeyNonAuth] = useState(false);
  const [showPgFieldEncryptKeyNonAuth, setShowPgFieldEncryptKeyNonAuth] = useState(false);
  const [showYoutubeApiKey, setShowYoutubeApiKey] = useState(false);
  const [showGoogleDrivePrivateKey, setShowGoogleDrivePrivateKey] = useState(false);
  
  // 마케팅 설정 (DB에서 관리)
  const [marketingConfig, setMarketingConfig] = useState<MarketingConfig | null>(null);
  const [isLoadingMarketingConfig, setIsLoadingMarketingConfig] = useState(false);
  const [isEditingMarketingConfig, setIsEditingMarketingConfig] = useState(false);
  const [isSavingMarketingConfig, setIsSavingMarketingConfig] = useState(false);
  const [editableMarketingConfig, setEditableMarketingConfig] = useState<Partial<MarketingConfig>>({});
  
  // SEO 전역 설정 (DB에서 관리)
  type SeoGlobalConfig = {
    id: number;
    googleSearchConsoleVerification: string;
    googleSearchConsolePropertyId: string;
    googleAnalyticsId: string;
    facebookUrl: string;
    instagramUrl: string;
    youtubeUrl: string;
    twitterUrl: string;
    naverBlogUrl: string;
    kakaoChannelUrl: string;
    defaultSiteName: string;
    defaultSiteDescription: string;
    defaultKeywords: string;
    defaultOgImage: string;
    contactPhone: string;
    contactEmail: string;
    contactAddress: string;
    metadata?: any;
    createdAt: string;
    updatedAt: string;
  };
  const [seoGlobalConfig, setSeoGlobalConfig] = useState<SeoGlobalConfig | null>(null);
  const [isLoadingSeoGlobalConfig, setIsLoadingSeoGlobalConfig] = useState(false);
  const [isEditingSeoGlobalConfig, setIsEditingSeoGlobalConfig] = useState(false);
  const [isSavingSeoGlobalConfig, setIsSavingSeoGlobalConfig] = useState(false);
  const [editableSeoGlobalConfig, setEditableSeoGlobalConfig] = useState<Partial<SeoGlobalConfig>>({});
  const [showGoogleApiKey, setShowGoogleApiKey] = useState(false);
  const [showFacebookAccessToken, setShowFacebookAccessToken] = useState(false);
  
  // 카카오톡 API 담당자 관리
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerPhone, setNewManagerPhone] = useState('');
  const [newManagerNotify, setNewManagerNotify] = useState(true);
  
  // API Key 관리
  const [newApiKeyIdentifier, setNewApiKeyIdentifier] = useState('');
  
  // Senderkey 관리
  const [newSenderKeyChannelId, setNewSenderKeyChannelId] = useState('');
  const [newSenderKey, setNewSenderKey] = useState('');
  
  // 서버 IP 관리
  const [newServerIp, setNewServerIp] = useState('');
  

  useEffect(() => {
    loadAdminInfo();
    loadSmsConfig();
    loadMarketingConfig();
    loadSeoGlobalConfig();
  }, []);

  const loadSmsConfig = async () => {
    try {
      setIsLoadingSmsConfig(true);
      const response = await fetch('/api/admin/settings/sms', {
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

  const loadMarketingConfig = async () => {
    try {
      setIsLoadingMarketingConfig(true);
      const response = await fetch('/api/admin/settings/marketing', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setMarketingConfig(data.config);
        setEditableMarketingConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to load marketing config:', error);
    } finally {
      setIsLoadingMarketingConfig(false);
    }
  };

  const handleSaveMarketingConfig = async () => {
    try {
      setIsSavingMarketingConfig(true);
      const response = await fetch('/api/admin/settings/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editableMarketingConfig),
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('로그인이 필요합니다. 페이지를 새로고침하고 다시 로그인해주세요.');
          window.location.href = '/admin/login';
          return;
        }
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        alert('저장 실패: 서버 오류가 발생했습니다. (상태 코드: ' + response.status + ')');
        return;
      }

      const data = await response.json();
      if (data.ok) {
        alert('✅ 마케팅 설정이 저장되었습니다!');
        setIsEditingMarketingConfig(false);
        await loadMarketingConfig();
      } else {
        alert('저장 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save marketing config:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('❌ 네트워크 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
      } else {
        alert('❌ 마케팅 설정 저장 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
      }
    } finally {
      setIsSavingMarketingConfig(false);
    }
  };

  const handleSaveSmsConfig = async () => {
    try {
      const response = await fetch('/api/admin/settings/sms', {
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
        alert('저장 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save SMS config:', error);
      alert('SMS 설정 저장 중 오류가 발생했습니다.');
    }
  };

  // SEO 전역 설정 로드
  const loadSeoGlobalConfig = async () => {
    try {
      setIsLoadingSeoGlobalConfig(true);
      const response = await fetch('/api/admin/settings/seo-global', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setSeoGlobalConfig(data.config);
        setEditableSeoGlobalConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to load SEO global config:', error);
    } finally {
      setIsLoadingSeoGlobalConfig(false);
    }
  };

  // SEO 전역 설정 저장
  const handleSaveSeoGlobalConfig = async () => {
    try {
      setIsSavingSeoGlobalConfig(true);
      const response = await fetch('/api/admin/settings/seo-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editableSeoGlobalConfig),
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('로그인이 필요합니다. 페이지를 새로고침하고 다시 로그인해주세요.');
          window.location.href = '/admin/login';
          return;
        }
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        alert('저장 실패: 서버 오류가 발생했습니다. (상태 코드: ' + response.status + ')');
        return;
      }

      const data = await response.json();
      if (data.ok) {
        alert('✅ SEO 전역 설정이 저장되었습니다!');
        setIsEditingSeoGlobalConfig(false);
        await loadSeoGlobalConfig();
      } else {
        alert('저장 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save SEO global config:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('❌ 네트워크 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
      } else {
        alert('❌ SEO 전역 설정 저장 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
      }
    } finally {
      setIsSavingSeoGlobalConfig(false);
    }
  };

  const loadAdminInfo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings/info', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok && data.info) {
        setAdminInfo(data.info);
        setEditableInfo(data.info);
      } else {
        console.error('Failed to load admin info:', data.error || 'Unknown error', data);
        // 에러가 발생해도 빈 객체라도 설정하여 UI가 깨지지 않도록
        const emptyInfo: AdminInfo = {
          email: '',
          emailFromName: '',
          emailSmtpHost: '',
          emailSmtpPort: '',
          emailSmtpPassword: '',
          geminiApiKey: '',
          kakaoJsKey: '',
          kakaoAppName: '',
          kakaoAppId: '',
          kakaoRestApiKey: '',
          kakaoAdminKey: '',
          kakaoChannelId: '',
          kakaoChannelName: '',
          kakaoChannelSearchId: '',
          kakaoChannelUrl: '',
          kakaoChannelChatUrl: '',
          kakaoChannelBotId: '',
          aligoApiKey: '',
          aligoUserId: '',
          aligoSenderPhone: '',
          aligoKakaoSenderKey: '',
          aligoKakaoChannelId: '',
          pgSignkey: '',
          pgFieldEncryptIv: '',
          pgFieldEncryptKey: '',
          pgSignkeyNonAuth: '',
          pgFieldEncryptIvNonAuth: '',
          pgFieldEncryptKeyNonAuth: '',
          pgMidAuth: '',
          pgMidPassword: '',
          pgMidNonAuth: '',
          pgAdminUrl: '',
          pgMerchantName: '',
          baseUrl: '',
          pgCallbackUrl: '',
          pgNotifyUrl: '',
          pgVirtualAccountUrl: '',
          sendMethod: '',
          youtubeApiKey: '',
          googleDriveServiceAccountEmail: '',
          googleDriveServiceAccountPrivateKey: '',
          googleDriveSharedDriveId: '',
          googleDriveRootFolderId: '',
          googleDrivePassportFolderId: '',
          kakaoApiManagers: [],
          kakaoApiKeys: [],
          kakaoSenderKeys: [],
          serverIps: [],
          currentIp: '',
        };
        setAdminInfo(emptyInfo);
        setEditableInfo(emptyInfo);
      }
    } catch (error) {
      console.error('Failed to load admin info:', error);
      // 네트워크 에러 등이 발생해도 빈 객체라도 설정
      const emptyInfo: AdminInfo = {
        email: '',
        emailFromName: '',
        emailSmtpHost: '',
        emailSmtpPort: '',
        emailSmtpPassword: '',
        geminiApiKey: '',
        kakaoJsKey: '',
        kakaoAppName: '',
        kakaoAppId: '',
        kakaoRestApiKey: '',
        kakaoAdminKey: '',
        kakaoChannelId: '',
        kakaoChannelName: '',
        kakaoChannelSearchId: '',
        kakaoChannelUrl: '',
        kakaoChannelChatUrl: '',
        kakaoChannelBotId: '',
        aligoApiKey: '',
        aligoUserId: '',
        aligoSenderPhone: '',
        aligoKakaoSenderKey: '',
        aligoKakaoChannelId: '',
        pgSignkey: '',
        pgFieldEncryptIv: '',
        pgFieldEncryptKey: '',
        pgSignkeyNonAuth: '',
        pgFieldEncryptIvNonAuth: '',
        pgFieldEncryptKeyNonAuth: '',
        pgMidAuth: '',
        pgMidPassword: '',
        pgMidNonAuth: '',
        pgAdminUrl: '',
        pgMerchantName: '',
        baseUrl: '',
        pgCallbackUrl: '',
        pgNotifyUrl: '',
        pgVirtualAccountUrl: '',
        sendMethod: '',
        youtubeApiKey: '',
        googleDriveServiceAccountEmail: '',
        googleDriveServiceAccountPrivateKey: '',
        googleDriveSharedDriveId: '',
        googleDriveRootFolderId: '',
        googleDrivePassportFolderId: '',
        kakaoApiManagers: [],
        kakaoApiKeys: [],
        kakaoSenderKeys: [],
        serverIps: [],
        currentIp: '',
      };
      setAdminInfo(emptyInfo);
      setEditableInfo(emptyInfo);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    try {
      setIsSaving(true);
      
      // 환경 변수 매핑
      const envMapping: Record<string, string> = {
        email: 'EMAIL_SMTP_USER',
        emailFromName: 'EMAIL_FROM_NAME',
        emailSmtpHost: 'EMAIL_SMTP_HOST',
        emailSmtpPort: 'EMAIL_SMTP_PORT',
        emailSmtpPassword: 'EMAIL_SMTP_PASSWORD',
        geminiApiKey: 'GEMINI_API_KEY',
        kakaoJsKey: 'NEXT_PUBLIC_KAKAO_JS_KEY',
        kakaoAppName: 'KAKAO_APP_NAME',
        kakaoAppId: 'KAKAO_APP_ID',
        kakaoRestApiKey: 'KAKAO_REST_API_KEY',
        kakaoAdminKey: 'KAKAO_ADMIN_KEY',
        kakaoChannelId: 'NEXT_PUBLIC_KAKAO_CHANNEL_ID',
        kakaoChannelBotId: 'KAKAO_CHANNEL_BOT_ID',
        kakaoChannelName: 'KAKAO_CHANNEL_NAME',
        kakaoChannelSearchId: 'KAKAO_CHANNEL_SEARCH_ID',
        kakaoChannelUrl: 'KAKAO_CHANNEL_URL',
        kakaoChannelChatUrl: 'KAKAO_CHANNEL_CHAT_URL',
        aligoApiKey: 'ALIGO_API_KEY',
        aligoUserId: 'ALIGO_USER_ID',
        aligoSenderPhone: 'ALIGO_SENDER_PHONE',
        aligoKakaoSenderKey: 'ALIGO_KAKAO_SENDER_KEY',
        aligoKakaoChannelId: 'ALIGO_KAKAO_CHANNEL_ID',
        pgSignkey: 'PG_SIGNKEY',
        pgFieldEncryptIv: 'PG_FIELD_ENCRYPT_IV',
        pgFieldEncryptKey: 'PG_FIELD_ENCRYPT_KEY',
        pgSignkeyNonAuth: 'PG_SIGNKEY_NON_AUTH',
        pgFieldEncryptIvNonAuth: 'PG_FIELD_ENCRYPT_IV_NON_AUTH',
        pgFieldEncryptKeyNonAuth: 'PG_FIELD_ENCRYPT_KEY_NON_AUTH',
        pgMidAuth: 'PG_MID_AUTH',
        pgMidPassword: 'PG_MID_PASSWORD',
        pgMidNonAuth: 'PG_MID_NON_AUTH',
        pgAdminUrl: 'PG_ADMIN_URL',
        pgMerchantName: 'PG_MERCHANT_NAME',
        baseUrl: 'NEXT_PUBLIC_BASE_URL',
        youtubeApiKey: 'YOUTUBE_API_KEY',
        googleDriveServiceAccountEmail: 'GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL',
        googleDriveServiceAccountPrivateKey: 'GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY',
        googleDriveSharedDriveId: 'GOOGLE_DRIVE_SHARED_DRIVE_ID',
        googleDriveRootFolderId: 'GOOGLE_DRIVE_ROOT_FOLDER_ID',
        googleDrivePassportFolderId: 'GOOGLE_DRIVE_PASSPORT_FOLDER_ID',
      };

      const updates: Record<string, string> = {};
      for (const [key, envKey] of Object.entries(envMapping)) {
        if (editableInfo[key as keyof AdminInfo] !== undefined && editableInfo[key as keyof AdminInfo] !== adminInfo?.[key as keyof AdminInfo]) {
          updates[envKey] = String(editableInfo[key as keyof AdminInfo] || '');
        }
      }

      if (Object.keys(updates).length === 0) {
        alert('변경된 내용이 없습니다.');
        setIsEditing(false);
        return;
      }

      const response = await fetch('/api/admin/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      });

      const data = await response.json();
      if (data.ok) {
        let message = data.message || '저장되었습니다.';
        
        // Vercel 업데이트 결과 추가
        if (data.vercelUpdated && data.vercelUpdated.length > 0) {
          message += `\n\n✅ Vercel 자동 업데이트: ${data.vercelUpdated.length}개 환경변수 업데이트 완료`;
        }
        if (data.vercelErrors && data.vercelErrors.length > 0) {
          message += `\n\n⚠️ Vercel 업데이트 경고:\n${data.vercelErrors.join('\n')}`;
        }
        
        if (data.warning) {
          message += '\n\n' + data.warning;
        }
        
        alert(message);
        setIsEditing(false);
        await loadAdminInfo(); // 다시 로드
      } else {
        alert('저장 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditableInfo(adminInfo || {});
    setIsEditing(false);
  };

  // 카테고리별 저장 함수
  const handleSaveCategory = async (category: string, fields: string[]) => {
    try {
      setCategorySaving(category);
      
      // 환경 변수 매핑
      const envMapping: Record<string, string> = {
        email: 'EMAIL_SMTP_USER',
        emailFromName: 'EMAIL_FROM_NAME',
        emailSmtpHost: 'EMAIL_SMTP_HOST',
        emailSmtpPort: 'EMAIL_SMTP_PORT',
        emailSmtpPassword: 'EMAIL_SMTP_PASSWORD',
        geminiApiKey: 'GEMINI_API_KEY',
        kakaoJsKey: 'NEXT_PUBLIC_KAKAO_JS_KEY',
        kakaoAppName: 'KAKAO_APP_NAME',
        kakaoAppId: 'KAKAO_APP_ID',
        kakaoRestApiKey: 'KAKAO_REST_API_KEY',
        kakaoAdminKey: 'KAKAO_ADMIN_KEY',
        kakaoChannelId: 'NEXT_PUBLIC_KAKAO_CHANNEL_ID',
        kakaoChannelBotId: 'KAKAO_CHANNEL_BOT_ID',
        kakaoChannelName: 'KAKAO_CHANNEL_NAME',
        kakaoChannelSearchId: 'KAKAO_CHANNEL_SEARCH_ID',
        kakaoChannelUrl: 'KAKAO_CHANNEL_URL',
        kakaoChannelChatUrl: 'KAKAO_CHANNEL_CHAT_URL',
        pgSignkey: 'PG_SIGNKEY',
        pgFieldEncryptIv: 'PG_FIELD_ENCRYPT_IV',
        pgFieldEncryptKey: 'PG_FIELD_ENCRYPT_KEY',
        pgSignkeyNonAuth: 'PG_SIGNKEY_NON_AUTH',
        pgFieldEncryptIvNonAuth: 'PG_FIELD_ENCRYPT_IV_NON_AUTH',
        pgFieldEncryptKeyNonAuth: 'PG_FIELD_ENCRYPT_KEY_NON_AUTH',
        pgMidAuth: 'PG_MID_AUTH',
        pgMidPassword: 'PG_MID_PASSWORD',
        pgMidNonAuth: 'PG_MID_NON_AUTH',
        pgAdminUrl: 'PG_ADMIN_URL',
        pgMerchantName: 'PG_MERCHANT_NAME',
        baseUrl: 'NEXT_PUBLIC_BASE_URL',
        youtubeApiKey: 'YOUTUBE_API_KEY',
        googleDriveServiceAccountEmail: 'GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL',
        googleDriveServiceAccountPrivateKey: 'GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY',
        googleDriveSharedDriveId: 'GOOGLE_DRIVE_SHARED_DRIVE_ID',
        googleDriveRootFolderId: 'GOOGLE_DRIVE_ROOT_FOLDER_ID',
        googleDrivePassportFolderId: 'GOOGLE_DRIVE_PASSPORT_FOLDER_ID',
      };

      const updates: Record<string, string> = {};
      for (const field of fields) {
        if (categoryEditableInfo[field as keyof AdminInfo] !== undefined && 
            categoryEditableInfo[field as keyof AdminInfo] !== adminInfo?.[field as keyof AdminInfo]) {
          const envKey = envMapping[field];
          if (envKey) {
            updates[envKey] = String(categoryEditableInfo[field as keyof AdminInfo] || '');
          }
        }
      }

      if (Object.keys(updates).length === 0) {
        alert('변경된 내용이 없습니다.');
        setEditingCategory(null);
        setCategorySaving(null);
        return;
      }

      const response = await fetch('/api/admin/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ updates }),
      });

      const data = await response.json();
      if (data.ok) {
        let message = data.message || '저장되었습니다.';
        
        // Vercel 업데이트 결과 추가
        if (data.vercelUpdated && data.vercelUpdated.length > 0) {
          message += `\n\n✅ Vercel 자동 업데이트: ${data.vercelUpdated.length}개 환경변수 업데이트 완료`;
        }
        if (data.vercelErrors && data.vercelErrors.length > 0) {
          message += `\n\n⚠️ Vercel 업데이트 경고:\n${data.vercelErrors.join('\n')}`;
        }
        
        if (data.warning) {
          message += '\n\n' + data.warning;
        }
        
        alert(message);
        setEditingCategory(null);
        setCategoryEditableInfo({});
        await loadAdminInfo(); // 다시 로드
      } else {
        alert('저장 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setCategorySaving(null);
    }
  };

  const handleStartEditCategory = (category: string, fields: string[]) => {
    const initialData: Partial<AdminInfo> = {};
    fields.forEach(field => {
      const key = field as keyof AdminInfo;
      const value = adminInfo?.[key];
      if (value !== undefined) {
        (initialData as any)[key] = value;
      }
    });
    setCategoryEditableInfo(initialData);
    setEditingCategory(category);
  };

  const handleCancelCategory = () => {
    setCategoryEditableInfo({});
    setEditingCategory(null);
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

  const handleAddManager = async () => {
    if (!newManagerName || !newManagerPhone) {
      alert('성명과 전화번호를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/admin/settings/kakao-managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newManagerName,
          phone: newManagerPhone,
          notifyEnabled: newManagerNotify,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setNewManagerName('');
        setNewManagerPhone('');
        setNewManagerNotify(true);
        await loadAdminInfo();
        alert('담당자가 추가되었습니다.');
      } else {
        alert('담당자 추가 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to add manager:', error);
      alert('담당자 추가 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteManager = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/settings/kakao-managers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.ok) {
        await loadAdminInfo();
        alert('담당자가 삭제되었습니다.');
      } else {
        alert('담당자 삭제 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete manager:', error);
      alert('담당자 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleRequestApiKey = async () => {
    if (!newApiKeyIdentifier) {
      alert('Identifier를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/admin/settings/kakao-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identifier: newApiKeyIdentifier,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setNewApiKeyIdentifier('');
        await loadAdminInfo();
        alert('API Key 발급신청이 완료되었습니다.');
      } else {
        alert('API Key 발급신청 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to request API key:', error);
      alert('API Key 발급신청 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/settings/kakao-api-keys/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.ok) {
        await loadAdminInfo();
        alert('API Key가 삭제되었습니다.');
      } else {
        alert('API Key 삭제 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      alert('API Key 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleAddServerIp = async () => {
    if (!newServerIp) {
      alert('IP번호를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/admin/settings/server-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ip: newServerIp,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setNewServerIp('');
        await loadAdminInfo();
        alert('IP가 추가되었습니다.');
      } else {
        alert('IP 추가 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to add server IP:', error);
      alert('IP 추가 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteServerIp = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/settings/server-ips/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.ok) {
        await loadAdminInfo();
        alert('IP가 삭제되었습니다.');
      } else {
        alert('IP 삭제 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete server IP:', error);
      alert('IP 삭제 중 오류가 발생했습니다.');
    }
  };

  const maskSensitiveInfo = (text: string, show: boolean) => {
    if (!text) return '';
    if (show) return text;
    if (text.length <= 8) return '•'.repeat(text.length);
    return text.substring(0, 4) + '•'.repeat(text.length - 8) + text.substring(text.length - 4);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-6 text-lg font-medium text-gray-700">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2 flex items-center gap-3">
            <span className="text-5xl">⚙️</span>
            관리자 정보
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            각 카테고리별로 개별 수정 및 저장이 가능합니다
          </p>
        </div>
      </div>

      {/* 회사 정보 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-3xl">🏢</span>
          회사 정보
        </h2>
        <div className="space-y-4">
          <InfoRow
            label="상호"
            value="크루즈닷"
            onCopy={() => copyToClipboard('크루즈닷', 'companyName')}
            copied={copiedField === 'companyName'}
          />
          <InfoRow
            label="대표"
            value="배연성"
            onCopy={() => copyToClipboard('배연성', 'representative')}
            copied={copiedField === 'representative'}
          />
          <InfoRow
            label="주소"
            value="경기 화성시 효행로 1068 (리더스프라자) 603-A60호"
            onCopy={() => copyToClipboard('경기 화성시 효행로 1068 (리더스프라자) 603-A60호', 'address')}
            copied={copiedField === 'address'}
          />
          <InfoRow
            label="대표번호"
            value="010-3289-3800"
            onCopy={() => copyToClipboard('010-3289-3800', 'phone')}
            copied={copiedField === 'phone'}
          />
          <InfoRow
            label="이메일"
            value="hyeseon28@naver.com"
            onCopy={() => copyToClipboard('hyeseon28@naver.com', 'companyEmail')}
            copied={copiedField === 'companyEmail'}
          />
          <InfoRow
            label="사업자등록번호"
            value="714-57-00419"
            onCopy={() => copyToClipboard('714-57-00419', 'businessNumber')}
            copied={copiedField === 'businessNumber'}
          />
          <InfoRow
            label="통신판매업신고번호"
            value="제 2025-화성동부-0320 호"
            onCopy={() => copyToClipboard('제 2025-화성동부-0320 호', 'telecomNumber')}
            copied={copiedField === 'telecomNumber'}
          />
          <InfoRow
            label="관광사업자 등록번호"
            value="2025-000004호"
            onCopy={() => copyToClipboard('2025-000004호', 'tourismNumber')}
            copied={copiedField === 'tourismNumber'}
          />
          <InfoRow
            label="개인정보보호 책임자"
            value="전혜선"
            onCopy={() => copyToClipboard('전혜선', 'privacyOfficer')}
            copied={copiedField === 'privacyOfficer'}
          />
        </div>
      </div>

      {/* 이메일 설정 정보 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-3xl">📧</span>
            이메일 발송 설정
          </h2>
          <div className="flex gap-3">
            {editingCategory === 'email' && (
              <button
                onClick={handleCancelCategory}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-semibold"
              >
                취소
              </button>
            )}
            <button
              onClick={editingCategory === 'email' 
                ? () => handleSaveCategory('email', ['email', 'emailFromName', 'emailSmtpHost', 'emailSmtpPort', 'emailSmtpPassword'])
                : () => handleStartEditCategory('email', ['email', 'emailFromName', 'emailSmtpHost', 'emailSmtpPort', 'emailSmtpPassword'])
              }
              disabled={categorySaving === 'email'}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${
                editingCategory === 'email'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${categorySaving === 'email' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {categorySaving === 'email' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  저장 중...
                </>
              ) : editingCategory === 'email' ? (
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
        <div className="space-y-4">
          <InfoRow
            label="이메일 주소"
            value={editingCategory === 'email' ? (categoryEditableInfo.email || '') : (adminInfo?.email || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.email || '', 'email')}
            copied={copiedField === 'email'}
            isEditing={editingCategory === 'email'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, email: value })}
          />
          <InfoRow
            label="발신자 이름"
            value={editingCategory === 'email' ? (categoryEditableInfo.emailFromName || '') : (adminInfo?.emailFromName || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.emailFromName || '', 'fromName')}
            copied={copiedField === 'fromName'}
            isEditing={editingCategory === 'email'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, emailFromName: value })}
          />
          <InfoRow
            label="SMTP 호스트"
            value={editingCategory === 'email' ? (categoryEditableInfo.emailSmtpHost || '') : (adminInfo?.emailSmtpHost || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.emailSmtpHost || '', 'smtpHost')}
            copied={copiedField === 'smtpHost'}
            isEditing={editingCategory === 'email'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, emailSmtpHost: value })}
          />
          <InfoRow
            label="SMTP 포트"
            value={editingCategory === 'email' ? (categoryEditableInfo.emailSmtpPort || '') : (adminInfo?.emailSmtpPort || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.emailSmtpPort || '', 'smtpPort')}
            copied={copiedField === 'smtpPort'}
            isEditing={editingCategory === 'email'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, emailSmtpPort: value })}
          />
          <EditablePasswordRow
            label="앱 비밀번호"
            value={editingCategory === 'email' ? (categoryEditableInfo.emailSmtpPassword || '') : (adminInfo?.emailSmtpPassword || '')}
            onCopy={() => copyToClipboard(adminInfo?.emailSmtpPassword || '', 'password')}
            copied={copiedField === 'password'}
            isEditing={editingCategory === 'email'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, emailSmtpPassword: value })}
            show={showPassword}
            onToggleShow={() => setShowPassword(!showPassword)}
          />
          <InfoRow
            label="발송 방식"
            value={adminInfo?.sendMethod || 'Gmail SMTP'}
            onCopy={() => copyToClipboard(adminInfo?.sendMethod || '', 'sendMethod')}
            copied={copiedField === 'sendMethod'}
          />
          <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ 발송 제한:</strong> Gmail SMTP는 일일 500통까지 발송 가능합니다. 
              더 많은 발송이 필요하면 SendGrid나 AWS SES를 고려하세요.
            </p>
          </div>
        </div>
      </div>

      {/* Gemini API 설정 정보 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-3xl">🤖</span>
            Gemini API 설정
          </h2>
          <div className="flex gap-3">
            {editingCategory === 'gemini' && (
              <button
                onClick={handleCancelCategory}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-semibold"
              >
                취소
              </button>
            )}
            <button
              onClick={editingCategory === 'gemini' 
                ? () => handleSaveCategory('gemini', ['geminiApiKey'])
                : () => handleStartEditCategory('gemini', ['geminiApiKey'])
              }
              disabled={categorySaving === 'gemini'}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${
                editingCategory === 'gemini'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${categorySaving === 'gemini' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {categorySaving === 'gemini' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  저장 중...
                </>
              ) : editingCategory === 'gemini' ? (
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
        <div className="space-y-4">
          <EditablePasswordRow
            label="API 키"
            value={editingCategory === 'gemini' ? (categoryEditableInfo.geminiApiKey || '') : (adminInfo?.geminiApiKey || '')}
            onCopy={() => copyToClipboard(adminInfo?.geminiApiKey || '', 'apiKey')}
            copied={copiedField === 'apiKey'}
            isEditing={editingCategory === 'gemini'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, geminiApiKey: value })}
            show={showApiKey}
            onToggleShow={() => setShowApiKey(!showApiKey)}
          />
        </div>
      </div>

      {/* 카카오톡 설정 정보 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-3xl">💬</span>
            카카오톡 설정
          </h2>
          <div className="flex gap-3">
            {editingCategory === 'kakao' && (
              <button
                onClick={handleCancelCategory}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-semibold"
              >
                취소
              </button>
            )}
            <button
              onClick={editingCategory === 'kakao' 
                ? () => handleSaveCategory('kakao', ['kakaoAppName', 'kakaoAppId', 'kakaoJsKey', 'kakaoRestApiKey', 'kakaoAdminKey', 'kakaoChannelId', 'kakaoChannelBotId', 'kakaoChannelName', 'kakaoChannelSearchId', 'kakaoChannelUrl', 'kakaoChannelChatUrl'])
                : () => handleStartEditCategory('kakao', ['kakaoAppName', 'kakaoAppId', 'kakaoJsKey', 'kakaoRestApiKey', 'kakaoAdminKey', 'kakaoChannelId', 'kakaoChannelBotId', 'kakaoChannelName', 'kakaoChannelSearchId', 'kakaoChannelUrl', 'kakaoChannelChatUrl'])
              }
              disabled={categorySaving === 'kakao'}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${
                editingCategory === 'kakao'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${categorySaving === 'kakao' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {categorySaving === 'kakao' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  저장 중...
                </>
              ) : editingCategory === 'kakao' ? (
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
        <div className="space-y-4">
          <InfoRow
            label="앱 이름"
            value={editingCategory === 'kakao' ? (categoryEditableInfo.kakaoAppName || '') : (adminInfo?.kakaoAppName || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.kakaoAppName || '', 'kakaoAppName')}
            copied={copiedField === 'kakaoAppName'}
            isEditing={editingCategory === 'kakao'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, kakaoAppName: value })}
          />
          <InfoRow
            label="앱 ID"
            value={editingCategory === 'kakao' ? (categoryEditableInfo.kakaoAppId || '') : (adminInfo?.kakaoAppId || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.kakaoAppId || '', 'kakaoAppId')}
            copied={copiedField === 'kakaoAppId'}
            isEditing={editingCategory === 'kakao'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, kakaoAppId: value })}
          />
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h3 className="text-lg font-bold text-blue-900 mb-3">📱 카카오 채널 정보</h3>
            <div className="space-y-3">
              <InfoRow
                label="채널 이름"
                value={editingCategory === 'kakao' ? (categoryEditableInfo.kakaoChannelName || '') : (adminInfo?.kakaoChannelName || 'N/A')}
                onCopy={() => copyToClipboard(adminInfo?.kakaoChannelName || '', 'kakaoChannelName')}
                copied={copiedField === 'kakaoChannelName'}
                isEditing={editingCategory === 'kakao'}
                onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, kakaoChannelName: value })}
              />
              <InfoRow
                label="검색용 아이디"
                value={editingCategory === 'kakao' ? (categoryEditableInfo.kakaoChannelSearchId || '') : (adminInfo?.kakaoChannelSearchId || 'N/A')}
                onCopy={() => copyToClipboard(adminInfo?.kakaoChannelSearchId || '', 'kakaoChannelSearchId')}
                copied={copiedField === 'kakaoChannelSearchId'}
                isEditing={editingCategory === 'kakao'}
                onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, kakaoChannelSearchId: value })}
              />
              <InfoRow
                label="채널 URL"
                value={editingCategory === 'kakao' ? (categoryEditableInfo.kakaoChannelUrl || '') : (adminInfo?.kakaoChannelUrl || 'N/A')}
                onCopy={() => copyToClipboard(adminInfo?.kakaoChannelUrl || '', 'kakaoChannelUrl')}
                copied={copiedField === 'kakaoChannelUrl'}
                isEditing={editingCategory === 'kakao'}
                onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, kakaoChannelUrl: value })}
              />
              <InfoRow
                label="채팅 URL"
                value={editingCategory === 'kakao' ? (categoryEditableInfo.kakaoChannelChatUrl || '') : (adminInfo?.kakaoChannelChatUrl || 'N/A')}
                onCopy={() => copyToClipboard(adminInfo?.kakaoChannelChatUrl || '', 'kakaoChannelChatUrl')}
                copied={copiedField === 'kakaoChannelChatUrl'}
                isEditing={editingCategory === 'kakao'}
                onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, kakaoChannelChatUrl: value })}
              />
          <EditablePasswordRow
            label="JavaScript 키"
            value={editingCategory === 'kakao' ? (categoryEditableInfo.kakaoJsKey || '') : (adminInfo?.kakaoJsKey || '')}
            onCopy={() => copyToClipboard(adminInfo?.kakaoJsKey || '', 'kakaoKey')}
            copied={copiedField === 'kakaoKey'}
            isEditing={editingCategory === 'kakao'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, kakaoJsKey: value })}
            show={showKakaoKey}
            onToggleShow={() => setShowKakaoKey(!showKakaoKey)}
          />
          <EditablePasswordRow
            label="REST API 키"
            value={editingCategory === 'kakao' ? (categoryEditableInfo.kakaoRestApiKey || '') : (adminInfo?.kakaoRestApiKey || '')}
            onCopy={() => copyToClipboard(adminInfo?.kakaoRestApiKey || '', 'kakaoRestApiKey')}
            copied={copiedField === 'kakaoRestApiKey'}
            isEditing={editingCategory === 'kakao'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, kakaoRestApiKey: value })}
            show={showKakaoRestApiKey}
            onToggleShow={() => setShowKakaoRestApiKey(!showKakaoRestApiKey)}
          />
          <EditablePasswordRow
            label="Admin 키 (서버 전용)"
            value={editingCategory === 'kakao' ? (categoryEditableInfo.kakaoAdminKey || '') : (adminInfo?.kakaoAdminKey || '')}
            onCopy={() => copyToClipboard(adminInfo?.kakaoAdminKey || '', 'kakaoAdminKey')}
            copied={copiedField === 'kakaoAdminKey'}
            isEditing={editingCategory === 'kakao'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, kakaoAdminKey: value })}
            show={showKakaoAdminKey}
            onToggleShow={() => setShowKakaoAdminKey(!showKakaoAdminKey)}
          />
          <InfoRow
            label="채널 공개 ID"
            value={editingCategory === 'kakao' ? (categoryEditableInfo.kakaoChannelId || '') : (adminInfo?.kakaoChannelId || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.kakaoChannelId || '', 'kakaoChannelId')}
            copied={copiedField === 'kakaoChannelId'}
            isEditing={editingCategory === 'kakao'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, kakaoChannelId: value })}
          />
          <InfoRow
            label="봇 ID"
            value={editingCategory === 'kakao' ? (categoryEditableInfo.kakaoChannelBotId || '') : (adminInfo?.kakaoChannelBotId || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.kakaoChannelBotId || '', 'kakaoChannelBotId')}
            copied={copiedField === 'kakaoChannelBotId'}
            isEditing={editingCategory === 'kakao'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, kakaoChannelBotId: value })}
          />
            </div>
          </div>
          <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>💡 안내:</strong> 카카오톡 공유 기능은 이 JavaScript 키를 사용합니다. 
              키가 설정되어 있으면 로그인 페이지에서 카카오톡 공유 버튼이 활성화됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* SMS API 설정 정보 */}
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
            <EditablePasswordRow
              label="API 키"
              value={isEditingSmsConfig ? (editableSmsConfig.apiKey || '') : (smsConfig?.apiKey || '')}
              onCopy={() => copyToClipboard(smsConfig?.apiKey || '', 'smsApiKey')}
              copied={copiedField === 'smsApiKey'}
              isEditing={isEditingSmsConfig}
              onValueChange={(value) => setEditableSmsConfig({ ...editableSmsConfig, apiKey: value })}
              show={showAligoApiKey}
              onToggleShow={() => setShowAligoApiKey(!showAligoApiKey)}
            />
            <InfoRow
              label="사용자 ID"
              value={isEditingSmsConfig ? (editableSmsConfig.userId || '') : (smsConfig?.userId || 'N/A')}
              onCopy={() => copyToClipboard(smsConfig?.userId || '', 'smsUserId')}
              copied={copiedField === 'smsUserId'}
              isEditing={isEditingSmsConfig}
              onValueChange={(value) => setEditableSmsConfig({ ...editableSmsConfig, userId: value })}
            />
            <InfoRow
              label="발신번호"
              value={isEditingSmsConfig ? (editableSmsConfig.senderPhone || '') : (smsConfig?.senderPhone || 'N/A')}
              onCopy={() => copyToClipboard(smsConfig?.senderPhone || '', 'smsSenderPhone')}
              copied={copiedField === 'smsSenderPhone'}
              isEditing={isEditingSmsConfig}
              onValueChange={(value) => setEditableSmsConfig({ ...editableSmsConfig, senderPhone: value })}
            />
            <InfoRow
              label="카카오 채널 ID"
              value={isEditingSmsConfig ? (editableSmsConfig.kakaoChannelId || '') : (smsConfig?.kakaoChannelId || 'N/A')}
              onCopy={() => copyToClipboard(smsConfig?.kakaoChannelId || '', 'smsKakaoChannelId')}
              copied={copiedField === 'smsKakaoChannelId'}
              isEditing={isEditingSmsConfig}
              onValueChange={(value) => setEditableSmsConfig({ ...editableSmsConfig, kakaoChannelId: value })}
            />
            <EditablePasswordRow
              label="카카오 채널 Senderkey"
              value={isEditingSmsConfig ? (editableSmsConfig.kakaoSenderKey || '') : (smsConfig?.kakaoSenderKey || '')}
              onCopy={() => copyToClipboard(smsConfig?.kakaoSenderKey || '', 'smsKakaoSenderKey')}
              copied={copiedField === 'smsKakaoSenderKey'}
              isEditing={isEditingSmsConfig}
              onValueChange={(value) => setEditableSmsConfig({ ...editableSmsConfig, kakaoSenderKey: value })}
              show={showAligoKakaoSenderKey}
              onToggleShow={() => setShowAligoKakaoSenderKey(!showAligoKakaoSenderKey)}
            />
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
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SEO 전역 설정 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-3xl">🔍</span>
            SEO 전역 설정
          </h2>
          <div className="flex gap-3">
            {isEditingSeoGlobalConfig && (
              <button
                onClick={() => {
                  setEditableSeoGlobalConfig(seoGlobalConfig || {});
                  setIsEditingSeoGlobalConfig(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-semibold"
              >
                취소
              </button>
            )}
            <button
              onClick={isEditingSeoGlobalConfig ? handleSaveSeoGlobalConfig : () => setIsEditingSeoGlobalConfig(true)}
              disabled={isSavingSeoGlobalConfig}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${
                isEditingSeoGlobalConfig
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSavingSeoGlobalConfig ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  저장 중...
                </>
              ) : isEditingSeoGlobalConfig ? (
                <>
                  <FiSave size={18} />
                  저장하기
                </>
              ) : (
                <>
                  <FiEdit2 size={18} />
                  편집하기
                </>
              )}
            </button>
          </div>
        </div>

        {isLoadingSeoGlobalConfig ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">SEO 설정을 불러오는 중...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google Search Console */}
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span>🔍</span>
                Google Search Console 설정
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Google Search Console Verification 코드
                  </label>
                  <div className="mb-2 p-3 bg-white rounded-lg border border-gray-300">
                    <p className="text-xs text-gray-600 mb-2">
                      <strong>📋 설정 방법:</strong>
                    </p>
                    <ol className="text-xs text-gray-700 list-decimal list-inside space-y-1 ml-2">
                      <li>
                        <a 
                          href="https://search.google.com/search-console" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          Google Search Console 접속 (클릭)
                        </a>
                      </li>
                      <li>왼쪽 상단의 <strong>"속성 추가"</strong> 버튼 클릭</li>
                      <li><strong>"URL 접두어"</strong> 선택 (예: https://cruisedot.co.kr)</li>
                      <li>사이트 URL 입력 후 <strong>"계속"</strong> 클릭</li>
                      <li><strong>"HTML 태그"</strong> 방법 선택</li>
                      <li>표시된 메타 태그에서 <code className="bg-gray-100 px-1 rounded">content="..."</code> 부분의 따옴표 안 값만 복사</li>
                      <li>아래 입력란에 붙여넣고 <strong>"저장하기"</strong> 클릭</li>
                    </ol>
                    <div className="mt-3 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                      <p className="text-xs text-green-800 font-semibold mb-1">
                        ✅ <strong>자동 적용:</strong> 저장하면 자동으로 사이트에 적용됩니다!
                      </p>
                      <p className="text-xs text-green-700">
                        Google Search Console에서 <strong>"확인"</strong> 버튼을 클릭하면 사이트 소유권이 확인됩니다.
                      </p>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.googleSearchConsoleVerification || '') : (seoGlobalConfig?.googleSearchConsoleVerification || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, googleSearchConsoleVerification: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="예: abc123def456ghi789"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Google Search Console 속성 ID (선택사항)
                  </label>
                  <input
                    type="text"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.googleSearchConsolePropertyId || '') : (seoGlobalConfig?.googleSearchConsolePropertyId || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, googleSearchConsolePropertyId: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="속성 ID (선택사항)"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Google Analytics */}
            <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
              <h3 className="text-lg font-bold text-green-900 mb-3 flex items-center gap-2">
                <span>📊</span>
                Google Analytics 설정
              </h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Google Analytics 4 Measurement ID
                </label>
                <div className="mb-2 p-3 bg-white rounded-lg border border-gray-300">
                  <p className="text-xs text-gray-600 mb-2">
                    <strong>📋 설정 방법:</strong>
                  </p>
                  <ol className="text-xs text-gray-700 list-decimal list-inside space-y-1 ml-2">
                    <li>
                      <a 
                        href="https://analytics.google.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Google Analytics 접속 (클릭)
                      </a>
                    </li>
                    <li>왼쪽 하단의 <strong>"관리"</strong> (톱니바퀴 아이콘) 클릭</li>
                    <li><strong>"속성"</strong> 열에서 <strong>"속성 설정"</strong> 클릭</li>
                    <li><strong>"측정 ID"</strong> 섹션에서 <code className="bg-gray-100 px-1 rounded">G-XXXXXXXXXX</code> 형식의 ID 확인</li>
                    <li>ID를 복사하여 아래 입력란에 붙여넣기</li>
                    <li><strong>"저장하기"</strong> 클릭하면 자동으로 적용됩니다</li>
                  </ol>
                  <div className="mt-3 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                    <p className="text-xs text-green-800 font-semibold">
                      ✅ <strong>자동 적용:</strong> 저장하면 자동으로 Google Analytics가 활성화됩니다!
                    </p>
                  </div>
                </div>
                <input
                  type="text"
                  value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.googleAnalyticsId || '') : (seoGlobalConfig?.googleAnalyticsId || '')}
                  onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, googleAnalyticsId: e.target.value })}
                  disabled={!isEditingSeoGlobalConfig}
                  placeholder="예: G-XXXXXXXXXX"
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            {/* 소셜 미디어 링크 */}
            <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
              <h3 className="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
                <span>🌐</span>
                소셜 미디어 링크
              </h3>
              <div className="mb-3 p-3 bg-white rounded-lg border border-gray-300">
                <p className="text-xs text-gray-600 mb-2">
                  <strong>📋 설정 방법:</strong> 각 소셜 미디어의 프로필/페이지 URL을 입력하세요. 구조화된 데이터에 자동으로 반영됩니다.
                </p>
                <ul className="text-xs text-gray-700 list-disc list-inside space-y-1 ml-2">
                  <li><strong>Facebook:</strong> 페이지 URL (예: https://www.facebook.com/yourpage)</li>
                  <li><strong>Instagram:</strong> 프로필 URL (예: https://www.instagram.com/yourprofile)</li>
                  <li><strong>YouTube:</strong> 채널 URL (예: https://www.youtube.com/@yourchannel)</li>
                  <li><strong>Twitter/X:</strong> 프로필 URL (예: https://twitter.com/yourprofile)</li>
                  <li><strong>네이버 블로그:</strong> 블로그 URL (예: https://blog.naver.com/yourblog)</li>
                  <li><strong>카카오톡 채널:</strong> 채널 URL (예: https://pf.kakao.com/yourchannel)</li>
                </ul>
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-green-800 font-semibold">
                    ✅ <strong>자동 적용:</strong> 저장하면 구조화된 데이터에 자동으로 반영됩니다!
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Facebook 페이지 URL</label>
                  <input
                    type="url"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.facebookUrl || '') : (seoGlobalConfig?.facebookUrl || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, facebookUrl: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="https://www.facebook.com/..."
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Instagram 프로필 URL</label>
                  <input
                    type="url"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.instagramUrl || '') : (seoGlobalConfig?.instagramUrl || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, instagramUrl: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="https://www.instagram.com/..."
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">YouTube 채널 URL</label>
                  <input
                    type="url"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.youtubeUrl || '') : (seoGlobalConfig?.youtubeUrl || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, youtubeUrl: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="https://www.youtube.com/@..."
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Twitter/X 프로필 URL</label>
                  <input
                    type="url"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.twitterUrl || '') : (seoGlobalConfig?.twitterUrl || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, twitterUrl: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="https://twitter.com/..."
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">네이버 블로그 URL</label>
                  <input
                    type="url"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.naverBlogUrl || '') : (seoGlobalConfig?.naverBlogUrl || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, naverBlogUrl: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="https://blog.naver.com/..."
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">카카오톡 채널 URL</label>
                  <input
                    type="url"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.kakaoChannelUrl || '') : (seoGlobalConfig?.kakaoChannelUrl || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, kakaoChannelUrl: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="https://pf.kakao.com/..."
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* 기본 SEO 설정 */}
            <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
              <h3 className="text-lg font-bold text-orange-900 mb-3 flex items-center gap-2">
                <span>⚙️</span>
                기본 SEO 설정
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">기본 사이트명</label>
                  <input
                    type="text"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.defaultSiteName || '') : (seoGlobalConfig?.defaultSiteName || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, defaultSiteName: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="크루즈 가이드"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">기본 사이트 설명</label>
                  <textarea
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.defaultSiteDescription || '') : (seoGlobalConfig?.defaultSiteDescription || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, defaultSiteDescription: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="AI 가이드 지니와 함께하는 특별한 크루즈 여행"
                    rows={3}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">기본 키워드 (쉼표로 구분)</label>
                  <input
                    type="text"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.defaultKeywords || '') : (seoGlobalConfig?.defaultKeywords || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, defaultKeywords: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="크루즈, 크루즈 여행, 일본 크루즈"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">기본 Open Graph 이미지 URL</label>
                  <input
                    type="url"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.defaultOgImage || '') : (seoGlobalConfig?.defaultOgImage || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, defaultOgImage: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="https://cruisedot.co.kr/images/ai-cruise-logo.png"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* 연락처 정보 */}
            <div className="border-2 border-teal-200 rounded-lg p-4 bg-teal-50">
              <h3 className="text-lg font-bold text-teal-900 mb-3 flex items-center gap-2">
                <span>📞</span>
                연락처 정보 (구조화된 데이터용)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">전화번호</label>
                  <input
                    type="tel"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.contactPhone || '') : (seoGlobalConfig?.contactPhone || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, contactPhone: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="010-3289-3800"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">이메일</label>
                  <input
                    type="email"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.contactEmail || '') : (seoGlobalConfig?.contactEmail || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, contactEmail: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="contact@cruisedot.co.kr"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">주소</label>
                  <input
                    type="text"
                    value={isEditingSeoGlobalConfig ? (editableSeoGlobalConfig.contactAddress || '') : (seoGlobalConfig?.contactAddress || '')}
                    onChange={(e) => setEditableSeoGlobalConfig({ ...editableSeoGlobalConfig, contactAddress: e.target.value })}
                    disabled={!isEditingSeoGlobalConfig}
                    placeholder="서울시 강남구..."
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 안내:</strong> SEO 설정을 변경하면 검색 엔진 최적화가 개선됩니다. 
                Google Search Console과 Google Analytics는 사이트 성능 모니터링에 필수입니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 카카오톡 API 담당자 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-3xl">👤</span>
          카카오톡 API 담당자
        </h2>
        <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 안내:</strong> 알림받기 체크하여 카카오톡 API 담당자 추가하시면, 카카오톡 API 발송 시 잔여포인트 10,000 P 미만일 경우 안내해 드리고 있습니다.
            <br />
            (잔여포인트 소진 알림 금액 변경을 원하신다면 고객센터로 문의 바랍니다.)
          </p>
        </div>
        
        {/* 담당자 목록 */}
        <div className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border-2 border-gray-300 px-4 py-2 text-left">등록일</th>
                  <th className="border-2 border-gray-300 px-4 py-2 text-left">담당자</th>
                  <th className="border-2 border-gray-300 px-4 py-2 text-left">휴대폰</th>
                  <th className="border-2 border-gray-300 px-4 py-2 text-left">관리</th>
                </tr>
              </thead>
              <tbody>
                {adminInfo?.kakaoApiManagers && adminInfo.kakaoApiManagers.length > 0 ? (
                  adminInfo.kakaoApiManagers.map((manager) => (
                    <tr key={manager.id} className="hover:bg-gray-50">
                      <td className="border-2 border-gray-300 px-4 py-2">{manager.registeredAt}</td>
                      <td className="border-2 border-gray-300 px-4 py-2">{manager.name}</td>
                      <td className="border-2 border-gray-300 px-4 py-2">
                        {manager.phone}
                        {manager.notifyEnabled && <span className="ml-2 text-xs text-blue-600">[문자알림]</span>}
                      </td>
                      <td className="border-2 border-gray-300 px-4 py-2">
                        <button
                          onClick={() => handleDeleteManager(manager.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="border-2 border-gray-300 px-4 py-4 text-center text-gray-500">
                      등록된 담당자가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 담당자 추가 폼 */}
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
          <h3 className="text-lg font-semibold mb-3">담당자 추가하기</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">성명</label>
              <input
                type="text"
                value={newManagerName}
                onChange={(e) => setNewManagerName(e.target.value)}
                placeholder="담당자 이름을 입력하세요"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">전화번호</label>
              <input
                type="tel"
                value={newManagerPhone}
                onChange={(e) => setNewManagerPhone(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notifyEnabled"
                checked={newManagerNotify}
                onChange={(e) => setNewManagerNotify(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="notifyEnabled" className="text-sm font-semibold text-gray-700">
                알림받기
              </label>
            </div>
            <button
              onClick={handleAddManager}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              <FiPlus size={18} />
              담당자 추가하기
            </button>
          </div>
        </div>
      </div>

      {/* 기존 API Key */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-3xl">🔑</span>
          기존 API Key
        </h2>
        
        {/* API Key 목록 */}
        <div className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border-2 border-gray-300 px-4 py-2 text-left">등록일</th>
                  <th className="border-2 border-gray-300 px-4 py-2 text-left">Identifier</th>
                  <th className="border-2 border-gray-300 px-4 py-2 text-left">발급키</th>
                  <th className="border-2 border-gray-300 px-4 py-2 text-left">관리</th>
                </tr>
              </thead>
              <tbody>
                {adminInfo?.kakaoApiKeys && adminInfo.kakaoApiKeys.length > 0 ? (
                  adminInfo.kakaoApiKeys.map((apiKey) => (
                    <tr key={apiKey.id} className="hover:bg-gray-50">
                      <td className="border-2 border-gray-300 px-4 py-2">{apiKey.registeredAt}</td>
                      <td className="border-2 border-gray-300 px-4 py-2">{apiKey.identifier}</td>
                      <td className="border-2 border-gray-300 px-4 py-2 font-mono text-sm">{apiKey.key}</td>
                      <td className="border-2 border-gray-300 px-4 py-2">
                        <button
                          onClick={() => handleDeleteApiKey(apiKey.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="border-2 border-gray-300 px-4 py-4 text-center text-gray-500">
                      등록된 API Key가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* API Key 발급신청 */}
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
          <h3 className="text-lg font-semibold mb-3">API Key 발급신청</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Identifier</label>
              <input
                type="text"
                value={newApiKeyIdentifier}
                onChange={(e) => setNewApiKeyIdentifier(e.target.value)}
                placeholder="Identifier를 입력하세요"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleRequestApiKey}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              <FiPlus size={18} />
              API Key 발급신청
            </button>
          </div>
        </div>
      </div>

      {/* Senderkey */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-3xl">📨</span>
          Senderkey
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border-2 border-gray-300 px-4 py-2 text-left">등록일</th>
                <th className="border-2 border-gray-300 px-4 py-2 text-left">카카오채널ID</th>
                <th className="border-2 border-gray-300 px-4 py-2 text-left">Senderkey</th>
              </tr>
            </thead>
            <tbody>
              {adminInfo?.kakaoSenderKeys && adminInfo.kakaoSenderKeys.length > 0 ? (
                adminInfo.kakaoSenderKeys.map((senderKey) => (
                  <tr key={senderKey.id} className="hover:bg-gray-50">
                    <td className="border-2 border-gray-300 px-4 py-2">{senderKey.registeredAt}</td>
                    <td className="border-2 border-gray-300 px-4 py-2">{senderKey.channelId}</td>
                    <td className="border-2 border-gray-300 px-4 py-2 font-mono text-sm">{senderKey.senderKey}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="border-2 border-gray-300 px-4 py-4 text-center text-gray-500">
                    등록된 Senderkey가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 발송 서버 IP */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-3xl">🌐</span>
          발송 서버 IP
        </h2>
        
        {adminInfo?.currentIp && (
          <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>현재 접속한 IP:</strong> {adminInfo.currentIp} (실제 발송할 서버 IP를 확인 하신 후 입력하시기 바랍니다)
            </p>
          </div>
        )}

        {/* IP 목록 */}
        <div className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border-2 border-gray-300 px-4 py-2 text-left">등록일</th>
                  <th className="border-2 border-gray-300 px-4 py-2 text-left">IP</th>
                  <th className="border-2 border-gray-300 px-4 py-2 text-left">관리</th>
                </tr>
              </thead>
              <tbody>
                {adminInfo?.serverIps && adminInfo.serverIps.length > 0 ? (
                  adminInfo.serverIps.map((ip) => (
                    <tr key={ip.id} className="hover:bg-gray-50">
                      <td className="border-2 border-gray-300 px-4 py-2">{ip.registeredAt}</td>
                      <td className="border-2 border-gray-300 px-4 py-2 font-mono">{ip.ip}</td>
                      <td className="border-2 border-gray-300 px-4 py-2">
                        <button
                          onClick={() => handleDeleteServerIp(ip.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="border-2 border-gray-300 px-4 py-4 text-center text-gray-500">
                      등록된 IP가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* IP 추가 폼 */}
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
          <h3 className="text-lg font-semibold mb-3">IP 추가하기</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">IP번호</label>
              <input
                type="text"
                value={newServerIp}
                onChange={(e) => setNewServerIp(e.target.value)}
                placeholder="125.132.80.142 또는 192.168.0."
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                * IP 대역을 추가하시려면 공란으로 비워두면 됩니다. 예: 192.168.0.
              </p>
            </div>
            <button
              onClick={handleAddServerIp}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              <FiPlus size={18} />
              IP 추가하기
            </button>
          </div>
        </div>
      </div>


      {/* PG 결제 설정 정보 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-3xl">💳</span>
            웰컴페이먼츠 PG 결제 설정
          </h2>
          <div className="flex gap-3">
            {editingCategory === 'pg' && (
              <button
                onClick={handleCancelCategory}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-semibold"
              >
                취소
              </button>
            )}
            <button
              onClick={editingCategory === 'pg' 
                ? () => handleSaveCategory('pg', ['pgMerchantName', 'pgMidAuth', 'pgMidNonAuth', 'pgMidPassword', 'pgSignkey', 'pgFieldEncryptIv', 'pgFieldEncryptKey', 'pgSignkeyNonAuth', 'pgFieldEncryptIvNonAuth', 'pgFieldEncryptKeyNonAuth', 'pgAdminUrl', 'baseUrl'])
                : () => handleStartEditCategory('pg', ['pgMerchantName', 'pgMidAuth', 'pgMidNonAuth', 'pgMidPassword', 'pgSignkey', 'pgFieldEncryptIv', 'pgFieldEncryptKey', 'pgSignkeyNonAuth', 'pgFieldEncryptIvNonAuth', 'pgFieldEncryptKeyNonAuth', 'pgAdminUrl', 'baseUrl'])
              }
              disabled={categorySaving === 'pg'}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${
                editingCategory === 'pg'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${categorySaving === 'pg' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {categorySaving === 'pg' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  저장 중...
                </>
              ) : editingCategory === 'pg' ? (
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
        <div className="space-y-4">
          <InfoRow
            label="가맹점 상호"
            value={editingCategory === 'pg' ? (categoryEditableInfo.pgMerchantName || '') : (adminInfo?.pgMerchantName || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.pgMerchantName || '', 'pgMerchantName')}
            copied={copiedField === 'pgMerchantName'}
            isEditing={editingCategory === 'pg'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, pgMerchantName: value })}
          />
          <InfoRow
            label="MID (인증)"
            value={editingCategory === 'pg' ? (categoryEditableInfo.pgMidAuth || '') : (adminInfo?.pgMidAuth || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.pgMidAuth || '', 'pgMidAuth')}
            copied={copiedField === 'pgMidAuth'}
            isEditing={editingCategory === 'pg'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, pgMidAuth: value })}
          />
          <InfoRow
            label="MID (비인증)"
            value={editingCategory === 'pg' ? (categoryEditableInfo.pgMidNonAuth || '') : (adminInfo?.pgMidNonAuth || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.pgMidNonAuth || '', 'pgMidNonAuth')}
            copied={copiedField === 'pgMidNonAuth'}
            isEditing={editingCategory === 'pg'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, pgMidNonAuth: value })}
          />
          <EditablePasswordRow
            label="MID 비밀번호"
            value={editingCategory === 'pg' ? (categoryEditableInfo.pgMidPassword || '') : (adminInfo?.pgMidPassword || '')}
            onCopy={() => copyToClipboard(adminInfo?.pgMidPassword || '', 'pgMidPassword')}
            copied={copiedField === 'pgMidPassword'}
            isEditing={editingCategory === 'pg'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, pgMidPassword: value })}
            show={showPgMidPassword}
            onToggleShow={() => setShowPgMidPassword(!showPgMidPassword)}
          />
          <InfoRow
            label="관리자 페이지 URL"
            value={editingCategory === 'pg' ? (categoryEditableInfo.pgAdminUrl || '') : (adminInfo?.pgAdminUrl || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.pgAdminUrl || '', 'pgAdminUrl')}
            copied={copiedField === 'pgAdminUrl'}
            isEditing={editingCategory === 'pg'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, pgAdminUrl: value })}
          />
          <EditablePasswordRow
            label="웹결제 Signkey (인증)"
            value={editingCategory === 'pg' ? (categoryEditableInfo.pgSignkey || '') : (adminInfo?.pgSignkey || '')}
            onCopy={() => copyToClipboard(adminInfo?.pgSignkey || '', 'pgSignkey')}
            copied={copiedField === 'pgSignkey'}
            isEditing={editingCategory === 'pg'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, pgSignkey: value })}
            show={showPgSignkey}
            onToggleShow={() => setShowPgSignkey(!showPgSignkey)}
          />
          <InfoRow
            label="필드암호화 IV (인증)"
            value={editingCategory === 'pg' ? (categoryEditableInfo.pgFieldEncryptIv || '') : (adminInfo?.pgFieldEncryptIv || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.pgFieldEncryptIv || '', 'pgFieldEncryptIv')}
            copied={copiedField === 'pgFieldEncryptIv'}
            isEditing={editingCategory === 'pg'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, pgFieldEncryptIv: value })}
          />
          <EditablePasswordRow
            label="필드암호화 KEY (API KEY) (인증)"
            value={editingCategory === 'pg' ? (categoryEditableInfo.pgFieldEncryptKey || '') : (adminInfo?.pgFieldEncryptKey || '')}
            onCopy={() => copyToClipboard(adminInfo?.pgFieldEncryptKey || '', 'pgFieldEncryptKey')}
            copied={copiedField === 'pgFieldEncryptKey'}
            isEditing={editingCategory === 'pg'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, pgFieldEncryptKey: value })}
            show={showPgFieldEncryptKey}
            onToggleShow={() => setShowPgFieldEncryptKey(!showPgFieldEncryptKey)}
          />
          <div className="mt-4 p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-3">🔐 비인증 MID (wpcrdot300) 설정</h3>
            <div className="space-y-4">
              <EditablePasswordRow
                label="웹결제 Signkey (비인증)"
                value={editingCategory === 'pg' ? (categoryEditableInfo.pgSignkeyNonAuth || '') : (adminInfo?.pgSignkeyNonAuth || '')}
                onCopy={() => copyToClipboard(adminInfo?.pgSignkeyNonAuth || '', 'pgSignkeyNonAuth')}
                copied={copiedField === 'pgSignkeyNonAuth'}
                isEditing={editingCategory === 'pg'}
                onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, pgSignkeyNonAuth: value })}
                show={showPgSignkeyNonAuth}
                onToggleShow={() => setShowPgSignkeyNonAuth(!showPgSignkeyNonAuth)}
              />
              <InfoRow
                label="필드암호화 IV (비인증)"
                value={editingCategory === 'pg' ? (categoryEditableInfo.pgFieldEncryptIvNonAuth || '') : (adminInfo?.pgFieldEncryptIvNonAuth || 'N/A')}
                onCopy={() => copyToClipboard(adminInfo?.pgFieldEncryptIvNonAuth || '', 'pgFieldEncryptIvNonAuth')}
                copied={copiedField === 'pgFieldEncryptIvNonAuth'}
                isEditing={editingCategory === 'pg'}
                onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, pgFieldEncryptIvNonAuth: value })}
              />
              <EditablePasswordRow
                label="필드암호화 KEY (API KEY) (비인증)"
                value={editingCategory === 'pg' ? (categoryEditableInfo.pgFieldEncryptKeyNonAuth || '') : (adminInfo?.pgFieldEncryptKeyNonAuth || '')}
                onCopy={() => copyToClipboard(adminInfo?.pgFieldEncryptKeyNonAuth || '', 'pgFieldEncryptKeyNonAuth')}
                copied={copiedField === 'pgFieldEncryptKeyNonAuth'}
                isEditing={editingCategory === 'pg'}
                onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, pgFieldEncryptKeyNonAuth: value })}
                show={showPgFieldEncryptKeyNonAuth}
                onToggleShow={() => setShowPgFieldEncryptKeyNonAuth(!showPgFieldEncryptKeyNonAuth)}
              />
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h3 className="text-lg font-bold text-blue-900 mb-3">🌐 배포 도메인 및 콜백 URL</h3>
            <div className="space-y-3">
              <InfoRow
                label="배포 도메인"
                value={editingCategory === 'pg' ? (categoryEditableInfo.baseUrl || '') : (adminInfo?.baseUrl || 'N/A')}
                onCopy={() => copyToClipboard(adminInfo?.baseUrl || '', 'baseUrl')}
                copied={copiedField === 'baseUrl'}
                isEditing={editingCategory === 'pg'}
                onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, baseUrl: value })}
              />
              {adminInfo?.pgCallbackUrl && (
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">결제 완료 리다이렉트 URL</label>
                    <a
                      href={adminInfo.pgCallbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all text-sm"
                    >
                      {adminInfo.pgCallbackUrl}
                    </a>
                  </div>
                  <button
                    onClick={() => copyToClipboard(adminInfo.pgCallbackUrl, 'pgCallbackUrl')}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    {copiedField === 'pgCallbackUrl' ? <FiCheck size={18} /> : <FiCopy size={18} />}
                    {copiedField === 'pgCallbackUrl' ? '복사됨' : '복사'}
                  </button>
                </div>
              )}
              {adminInfo?.pgNotifyUrl && (
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">결제수단 거래알림 URL</label>
                    <a
                      href={adminInfo.pgNotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all text-sm"
                    >
                      {adminInfo.pgNotifyUrl}
                    </a>
                  </div>
                  <button
                    onClick={() => copyToClipboard(adminInfo.pgNotifyUrl, 'pgNotifyUrl')}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    {copiedField === 'pgNotifyUrl' ? <FiCheck size={18} /> : <FiCopy size={18} />}
                    {copiedField === 'pgNotifyUrl' ? '복사됨' : '복사'}
                  </button>
                </div>
              )}
              {adminInfo?.pgVirtualAccountUrl && (
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">가상계좌 입금 통보 URL</label>
                    <a
                      href={adminInfo.pgVirtualAccountUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all text-sm"
                    >
                      {adminInfo.pgVirtualAccountUrl}
                    </a>
                  </div>
                  <button
                    onClick={() => copyToClipboard(adminInfo.pgVirtualAccountUrl, 'pgVirtualAccountUrl')}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    {copiedField === 'pgVirtualAccountUrl' ? <FiCheck size={18} /> : <FiCopy size={18} />}
                    {copiedField === 'pgVirtualAccountUrl' ? '복사됨' : '복사'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>💡 안내:</strong> 웰컴페이먼츠 PG 결제 연동을 위한 설정입니다. 
              인증 결제는 MID (인증)을, 비인증 결제는 MID (비인증)을 사용합니다.
              <br />
              <strong>⚠️ 중요:</strong> 위 콜백 URL들을 웰컴페이먼츠 관리자 페이지에 설정해야 합니다.
            </p>
          </div>
        </div>
      </div>

      {/* YouTube API 설정 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-3xl">📺</span>
            YouTube API 설정
          </h2>
          <div className="flex gap-3">
            {editingCategory === 'youtube' && (
              <button
                onClick={handleCancelCategory}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-semibold"
              >
                취소
              </button>
            )}
            <button
              onClick={editingCategory === 'youtube' 
                ? () => handleSaveCategory('youtube', ['youtubeApiKey'])
                : () => handleStartEditCategory('youtube', ['youtubeApiKey'])
              }
              disabled={categorySaving === 'youtube'}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${
                editingCategory === 'youtube'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${categorySaving === 'youtube' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {categorySaving === 'youtube' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  저장 중...
                </>
              ) : editingCategory === 'youtube' ? (
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
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-600 mb-1 block">YouTube Data API v3 키</label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono text-gray-800">
                  {maskSensitiveInfo(adminInfo?.youtubeApiKey || '', showYoutubeApiKey)}
                </span>
                <button
                  onClick={() => setShowYoutubeApiKey(!showYoutubeApiKey)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={showYoutubeApiKey ? '숨기기' : '보기'}
                >
                  {showYoutubeApiKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {editingCategory === 'youtube' && (
                <input
                  type={showYoutubeApiKey ? 'text' : 'password'}
                  value={categoryEditableInfo.youtubeApiKey || ''}
                  onChange={(e) => setCategoryEditableInfo({ ...categoryEditableInfo, youtubeApiKey: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="YouTube API 키를 입력하세요"
                />
              )}
            </div>
            <button
              onClick={() => copyToClipboard(adminInfo?.youtubeApiKey || '', 'youtubeApiKey')}
              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              {copiedField === 'youtubeApiKey' ? <FiCheck size={18} /> : <FiCopy size={18} />}
              {copiedField === 'youtubeApiKey' ? '복사됨' : '복사'}
            </button>
          </div>
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>💡 안내:</strong> YouTube Data API v3 키는 Google Cloud Console에서 발급받을 수 있습니다.
            </p>
            <p className="text-sm text-blue-800 mb-2">
              <strong>📝 발급 방법:</strong>
            </p>
            <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1 ml-2">
              <li>Google Cloud Console (https://console.cloud.google.com/) 접속</li>
              <li>프로젝트 선택 또는 새 프로젝트 생성</li>
              <li>API 및 서비스 → 라이브러리 → "YouTube Data API v3" 검색 및 활성화</li>
              <li>사용자 인증 정보 → API 키 만들기</li>
              <li>생성된 API 키를 위에 입력하세요</li>
            </ol>
            <p className="text-sm text-blue-800 mt-2">
              <strong>⚠️ 중요:</strong> API 키가 없으면 YouTube 영상 수집 스크립트를 실행할 수 없습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Google Drive 설정 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-3xl">☁️</span>
            Google Drive 설정
          </h2>
          <div className="flex gap-3">
            {editingCategory === 'googledrive' && (
              <button
                onClick={handleCancelCategory}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-semibold"
              >
                취소
              </button>
            )}
            <button
              onClick={editingCategory === 'googledrive' 
                ? () => handleSaveCategory('googledrive', ['googleDriveServiceAccountEmail', 'googleDriveServiceAccountPrivateKey', 'googleDriveSharedDriveId', 'googleDriveRootFolderId', 'googleDrivePassportFolderId'])
                : () => handleStartEditCategory('googledrive', ['googleDriveServiceAccountEmail', 'googleDriveServiceAccountPrivateKey', 'googleDriveSharedDriveId', 'googleDriveRootFolderId', 'googleDrivePassportFolderId'])
              }
              disabled={categorySaving === 'googledrive'}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${
                editingCategory === 'googledrive'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${categorySaving === 'googledrive' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {categorySaving === 'googledrive' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  저장 중...
                </>
              ) : editingCategory === 'googledrive' ? (
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
        <div className="space-y-4">
          <InfoRow
            label="서비스 계정 이메일"
            value={editingCategory === 'googledrive' ? (categoryEditableInfo.googleDriveServiceAccountEmail || '') : (adminInfo?.googleDriveServiceAccountEmail || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.googleDriveServiceAccountEmail || '', 'googleDriveServiceAccountEmail')}
            copied={copiedField === 'googleDriveServiceAccountEmail'}
            isEditing={editingCategory === 'googledrive'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, googleDriveServiceAccountEmail: value })}
          />
          <EditablePasswordRow
            label="서비스 계정 Private Key"
            value={editingCategory === 'googledrive' ? (categoryEditableInfo.googleDriveServiceAccountPrivateKey || '') : (adminInfo?.googleDriveServiceAccountPrivateKey || '')}
            onCopy={() => copyToClipboard(adminInfo?.googleDriveServiceAccountPrivateKey || '', 'googleDriveServiceAccountPrivateKey')}
            copied={copiedField === 'googleDriveServiceAccountPrivateKey'}
            isEditing={editingCategory === 'googledrive'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, googleDriveServiceAccountPrivateKey: value })}
            show={showGoogleDrivePrivateKey}
            onToggleShow={() => setShowGoogleDrivePrivateKey(!showGoogleDrivePrivateKey)}
          />
          <InfoRow
            label="공유 드라이브 ID"
            value={editingCategory === 'googledrive' ? (categoryEditableInfo.googleDriveSharedDriveId || '') : (adminInfo?.googleDriveSharedDriveId || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.googleDriveSharedDriveId || '', 'googleDriveSharedDriveId')}
            copied={copiedField === 'googleDriveSharedDriveId'}
            isEditing={editingCategory === 'googledrive'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, googleDriveSharedDriveId: value })}
          />
          <InfoRow
            label="루트 폴더 ID"
            value={editingCategory === 'googledrive' ? (categoryEditableInfo.googleDriveRootFolderId || '') : (adminInfo?.googleDriveRootFolderId || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.googleDriveRootFolderId || '', 'googleDriveRootFolderId')}
            copied={copiedField === 'googleDriveRootFolderId'}
            isEditing={editingCategory === 'googledrive'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, googleDriveRootFolderId: value })}
          />
          <InfoRow
            label="여권 폴더 ID"
            value={editingCategory === 'googledrive' ? (categoryEditableInfo.googleDrivePassportFolderId || '') : (adminInfo?.googleDrivePassportFolderId || 'N/A')}
            onCopy={() => copyToClipboard(adminInfo?.googleDrivePassportFolderId || '', 'googleDrivePassportFolderId')}
            copied={copiedField === 'googleDrivePassportFolderId'}
            isEditing={editingCategory === 'googledrive'}
            onValueChange={(value) => setCategoryEditableInfo({ ...categoryEditableInfo, googleDrivePassportFolderId: value })}
          />
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>💡 안내:</strong> Google Drive 자동화 기능을 위한 설정입니다.
            </p>
            <p className="text-sm text-blue-800 mb-2">
              <strong>📝 설정 방법:</strong>
            </p>
            <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1 ml-2">
              <li>Google Cloud Console에서 서비스 계정 생성</li>
              <li>서비스 계정 키(JSON) 다운로드</li>
              <li>JSON 파일의 <code>client_email</code>과 <code>private_key</code> 값을 입력</li>
              <li>Google Drive에서 공유 드라이브 및 폴더 ID 확인</li>
            </ol>
            <p className="text-sm text-blue-800 mt-2">
              <strong>⚠️ 중요:</strong> Private Key는 여러 줄로 입력해야 하며, <code>\n</code> 문자를 실제 줄바꿈으로 변환해야 합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 마케팅 픽셀 및 API 설정 */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-3xl">📊</span>
            마케팅 픽셀 및 API 설정
          </h2>
          <div className="flex gap-3">
            {isEditingMarketingConfig && (
              <button
                onClick={() => {
                  setEditableMarketingConfig(marketingConfig || {});
                  setIsEditingMarketingConfig(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-semibold"
              >
                취소
              </button>
            )}
            <button
              onClick={isEditingMarketingConfig ? handleSaveMarketingConfig : () => setIsEditingMarketingConfig(true)}
              disabled={isSavingMarketingConfig}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${
                isEditingMarketingConfig
                  ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isEditingMarketingConfig ? (
                <>
                  {isSavingMarketingConfig ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      저장 중...
                    </>
                  ) : (
                    <>
                      <FiSave size={18} />
                      저장하기
                    </>
                  )}
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
        {isLoadingMarketingConfig ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Google 설정 */}
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">🔵</span>
                  Google 설정
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEditingMarketingConfig ? (editableMarketingConfig.isGoogleEnabled || false) : (marketingConfig?.isGoogleEnabled || false)}
                    onChange={(e) => setEditableMarketingConfig({ ...editableMarketingConfig, isGoogleEnabled: e.target.checked })}
                    disabled={!isEditingMarketingConfig}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">활성화</span>
                </label>
              </div>
              <div className="space-y-4">
                <InfoRow
                  label="Google Analytics 4 (GA4) Measurement ID"
                  value={isEditingMarketingConfig ? (editableMarketingConfig.googlePixelId || '') : (marketingConfig?.googlePixelId || '')}
                  onCopy={() => copyToClipboard(marketingConfig?.googlePixelId || '', 'googlePixelId')}
                  copied={copiedField === 'googlePixelId'}
                  isEditing={isEditingMarketingConfig}
                  onValueChange={(value) => setEditableMarketingConfig({ ...editableMarketingConfig, googlePixelId: value })}
                />
                <InfoRow
                  label="Google Tag Manager Container ID"
                  value={isEditingMarketingConfig ? (editableMarketingConfig.googleTagManagerId || '') : (marketingConfig?.googleTagManagerId || '')}
                  onCopy={() => copyToClipboard(marketingConfig?.googleTagManagerId || '', 'googleTagManagerId')}
                  copied={copiedField === 'googleTagManagerId'}
                  isEditing={isEditingMarketingConfig}
                  onValueChange={(value) => setEditableMarketingConfig({ ...editableMarketingConfig, googleTagManagerId: value })}
                />
                <InfoRow
                  label="Google Ads Conversion ID"
                  value={isEditingMarketingConfig ? (editableMarketingConfig.googleAdsId || '') : (marketingConfig?.googleAdsId || '')}
                  onCopy={() => copyToClipboard(marketingConfig?.googleAdsId || '', 'googleAdsId')}
                  copied={copiedField === 'googleAdsId'}
                  isEditing={isEditingMarketingConfig}
                  onValueChange={(value) => setEditableMarketingConfig({ ...editableMarketingConfig, googleAdsId: value })}
                />
                <EditablePasswordRow
                  label="Google API Key"
                  value={isEditingMarketingConfig ? (editableMarketingConfig.googleApiKey || '') : (marketingConfig?.googleApiKey || '')}
                  onCopy={() => copyToClipboard(marketingConfig?.googleApiKey || '', 'googleApiKey')}
                  copied={copiedField === 'googleApiKey'}
                  isEditing={isEditingMarketingConfig}
                  onValueChange={(value) => setEditableMarketingConfig({ ...editableMarketingConfig, googleApiKey: value })}
                  show={showGoogleApiKey}
                  onToggleShow={() => setShowGoogleApiKey(!showGoogleApiKey)}
                />
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">테스트 모드</label>
                    {isEditingMarketingConfig ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editableMarketingConfig.googleTestMode || false}
                          onChange={(e) => setEditableMarketingConfig({ ...editableMarketingConfig, googleTestMode: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">테스트 모드 활성화 (개발/테스트 환경용)</span>
                      </label>
                    ) : (
                      <span className="text-sm text-gray-700">
                        {marketingConfig?.googleTestMode ? '활성화됨' : '비활성화됨'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Facebook 설정 */}
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">📘</span>
                  Facebook 설정
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEditingMarketingConfig ? (editableMarketingConfig.isFacebookEnabled || false) : (marketingConfig?.isFacebookEnabled || false)}
                    onChange={(e) => setEditableMarketingConfig({ ...editableMarketingConfig, isFacebookEnabled: e.target.checked })}
                    disabled={!isEditingMarketingConfig}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">활성화</span>
                </label>
              </div>
              <div className="space-y-4">
                <InfoRow
                  label="Facebook Pixel ID"
                  value={isEditingMarketingConfig ? (editableMarketingConfig.facebookPixelId || '') : (marketingConfig?.facebookPixelId || '')}
                  onCopy={() => copyToClipboard(marketingConfig?.facebookPixelId || '', 'facebookPixelId')}
                  copied={copiedField === 'facebookPixelId'}
                  isEditing={isEditingMarketingConfig}
                  onValueChange={(value) => setEditableMarketingConfig({ ...editableMarketingConfig, facebookPixelId: value })}
                />
                <InfoRow
                  label="Facebook App ID"
                  value={isEditingMarketingConfig ? (editableMarketingConfig.facebookAppId || '') : (marketingConfig?.facebookAppId || '')}
                  onCopy={() => copyToClipboard(marketingConfig?.facebookAppId || '', 'facebookAppId')}
                  copied={copiedField === 'facebookAppId'}
                  isEditing={isEditingMarketingConfig}
                  onValueChange={(value) => setEditableMarketingConfig({ ...editableMarketingConfig, facebookAppId: value })}
                />
                <EditablePasswordRow
                  label="Facebook Access Token"
                  value={isEditingMarketingConfig ? (editableMarketingConfig.facebookAccessToken || '') : (marketingConfig?.facebookAccessToken || '')}
                  onCopy={() => copyToClipboard(marketingConfig?.facebookAccessToken || '', 'facebookAccessToken')}
                  copied={copiedField === 'facebookAccessToken'}
                  isEditing={isEditingMarketingConfig}
                  onValueChange={(value) => setEditableMarketingConfig({ ...editableMarketingConfig, facebookAccessToken: value })}
                  show={showFacebookAccessToken}
                  onToggleShow={() => setShowFacebookAccessToken(!showFacebookAccessToken)}
                />
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">테스트 모드</label>
                    {isEditingMarketingConfig ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editableMarketingConfig.facebookTestMode || false}
                          onChange={(e) => setEditableMarketingConfig({ ...editableMarketingConfig, facebookTestMode: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">테스트 모드 활성화 (개발/테스트 환경용)</span>
                      </label>
                    ) : (
                      <span className="text-sm text-gray-700">
                        {marketingConfig?.facebookTestMode ? '활성화됨' : '비활성화됨'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 기타 마케팅 도구 */}
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">📱</span>
                기타 마케팅 도구
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">네이버 픽셀</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEditingMarketingConfig ? (editableMarketingConfig.isNaverEnabled || false) : (marketingConfig?.isNaverEnabled || false)}
                      onChange={(e) => setEditableMarketingConfig({ ...editableMarketingConfig, isNaverEnabled: e.target.checked })}
                      disabled={!isEditingMarketingConfig}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">활성화</span>
                  </label>
                </div>
                <InfoRow
                  label="네이버 픽셀 ID"
                  value={isEditingMarketingConfig ? (editableMarketingConfig.naverPixelId || '') : (marketingConfig?.naverPixelId || '')}
                  onCopy={() => copyToClipboard(marketingConfig?.naverPixelId || '', 'naverPixelId')}
                  copied={copiedField === 'naverPixelId'}
                  isEditing={isEditingMarketingConfig}
                  onValueChange={(value) => setEditableMarketingConfig({ ...editableMarketingConfig, naverPixelId: value })}
                />
                <div className="flex items-center justify-between mb-2 mt-4">
                  <span className="text-sm font-semibold text-gray-700">카카오 픽셀</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEditingMarketingConfig ? (editableMarketingConfig.isKakaoEnabled || false) : (marketingConfig?.isKakaoEnabled || false)}
                      onChange={(e) => setEditableMarketingConfig({ ...editableMarketingConfig, isKakaoEnabled: e.target.checked })}
                      disabled={!isEditingMarketingConfig}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">활성화</span>
                  </label>
                </div>
                <InfoRow
                  label="카카오 픽셀 ID"
                  value={isEditingMarketingConfig ? (editableMarketingConfig.kakaoPixelId || '') : (marketingConfig?.kakaoPixelId || '')}
                  onCopy={() => copyToClipboard(marketingConfig?.kakaoPixelId || '', 'kakaoPixelId')}
                  copied={copiedField === 'kakaoPixelId'}
                  isEditing={isEditingMarketingConfig}
                  onValueChange={(value) => setEditableMarketingConfig({ ...editableMarketingConfig, kakaoPixelId: value })}
                />
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                <strong>💡 안내:</strong> 픽셀 ID를 입력하고 활성화하면, 사이트의 모든 페이지에 자동으로 픽셀 스크립트가 주입됩니다.
              </p>
              <p className="text-sm text-blue-800 mb-2">
                <strong>📝 발급 방법:</strong>
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 ml-2">
                <li><strong>Google Analytics:</strong> analytics.google.com → 관리 → 속성 설정 → Measurement ID (G-XXXXXXXXXX)</li>
                <li><strong>Facebook Pixel:</strong> business.facebook.com → 이벤트 관리자 → 픽셀 ID 확인</li>
                <li><strong>네이버 픽셀:</strong> searchad.naver.com → 도구 → 픽셀 관리</li>
                <li><strong>카카오 픽셀:</strong> bizboard.kakao.com → 광고 → 픽셀 관리</li>
              </ul>
              <p className="text-sm text-blue-800 mt-2">
                <strong>⚠️ 중요:</strong> 테스트 모드를 활성화하면 실제 전환 데이터가 기록되지 않습니다. 운영 환경에서는 비활성화하세요.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-800 mb-2">💡 안내</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>이 정보들은 서버의 환경 변수에서 가져옵니다.</li>
          <li>비밀번호와 API 키는 보안을 위해 마스킹되어 표시됩니다.</li>
          <li>설정을 변경하려면 서버의 .env.local 파일을 수정한 후 서버를 재시작해야 합니다.</li>
        </ul>
      </div>
    </div>
  );
}

function InfoRow({ label, value, onCopy, copied, isEditing, onValueChange }: { 
  label: string; 
  value: string; 
  onCopy: () => void; 
  copied: boolean;
  isEditing?: boolean;
  onValueChange?: (value: string) => void;
}) {
  if (isEditing && onValueChange) {
    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
        <div className="flex-1">
          <label className="text-sm font-semibold text-gray-600 mb-1 block">{label}</label>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onValueChange(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            placeholder={`${label}을(를) 입력하세요`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
      <div className="flex-1">
        <label className="text-sm font-semibold text-gray-600 mb-1 block">{label}</label>
        <span className="text-lg font-medium text-gray-800">{value}</span>
      </div>
      <button
        onClick={onCopy}
        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
        {copied ? '복사됨' : '복사'}
      </button>
    </div>
  );
}

function EditablePasswordRow({ 
  label, 
  value, 
  onCopy, 
  copied, 
  isEditing, 
  onValueChange,
  show,
  onToggleShow
}: { 
  label: string; 
  value: string; 
  onCopy: () => void; 
  copied: boolean;
  isEditing?: boolean;
  onValueChange?: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  const maskSensitiveInfo = (text: string, show: boolean) => {
    if (!text) return '';
    if (show) return text;
    if (text.length <= 8) return '•'.repeat(text.length);
    return text.substring(0, 4) + '•'.repeat(text.length - 8) + text.substring(text.length - 4);
  };

  if (isEditing && onValueChange) {
    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
        <div className="flex-1">
          <label className="text-sm font-semibold text-gray-600 mb-1 block">{label}</label>
          <div className="flex items-center gap-2">
            <input
              type={show ? 'text' : 'password'}
              value={value || ''}
              onChange={(e) => onValueChange(e.target.value)}
              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              placeholder={`${label}을(를) 입력하세요`}
            />
            <button
              onClick={onToggleShow}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={show ? '숨기기' : '보기'}
            >
              {show ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200">
      <div className="flex-1">
        <label className="text-sm font-semibold text-gray-600 mb-1 block">{label}</label>
        <div className="flex items-center gap-2">
          <span className="text-lg font-mono text-gray-800">
            {maskSensitiveInfo(value || '', show)}
          </span>
          <button
            onClick={onToggleShow}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={show ? '숨기기' : '보기'}
          >
            {show ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
      </div>
      <button
        onClick={onCopy}
        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
        {copied ? '복사됨' : '복사'}
      </button>
    </div>
  );
}

