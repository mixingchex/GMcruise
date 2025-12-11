// app/admin/affiliate/links/page.tsx
// 링크 관리 페이지

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiExternalLink,
  FiX,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

type AffiliateLink = {
  id: number;
  code: string;
  title: string | null;
  productCode: string | null;
  status: string;
  expiresAt: string | null;
  lastAccessedAt: string | null;
  campaignName: string | null;
  description: string | null;
  createdAt: string;
  landingPageId?: number | null;
  landingPage?: {
    id: number;
    title: string;
    slug: string;
    category: string | null;
  } | null;
  manager: {
    id: number;
    displayName: string | null;
    affiliateCode: string | null;
  } | null;
  agent: {
    id: number;
    displayName: string | null;
    affiliateCode: string | null;
  } | null;
  product: {
    id: number;
    productCode: string;
    title: string;
  } | null;
  issuedBy: {
    id: number;
    name: string | null;
  } | null;
  _count: {
    leads: number;
    sales: number;
  };
  url?: string;
};

type ProductOption = {
  id: number;
  productCode: string;
  label: string;
  cruiseLine: string;
  shipName: string;
  packageName: string;
  basePrice: number | null;
};

type LandingPageOption = {
  id: number;
  title: string;
  slug: string;
  category: string | null;
  description: string | null;
  ownerName: string;
  ownerType: string;
  affiliateCode: string | null;
  label: string;
  url: string;
};

type PartnerOption = {
  id: number;
  displayName: string;
  affiliateCode: string | null;
  landingSlug: string | null;
  phone: string | null;
  mallUserId: string | null;
  label: string;
};

export default function LinksPage() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLink, setSelectedLink] = useState<AffiliateLink | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReissueModalOpen, setIsReissueModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    productCode: '',
    managerId: '',
    agentId: '',
    expiresAt: '',
    campaignName: '',
    description: '',
  });
  const [reissueExpiresAt, setReissueExpiresAt] = useState('');
  
  // 옵션 데이터
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPageOption[]>([]);
  const [managers, setManagers] = useState<PartnerOption[]>([]);
  const [agents, setAgents] = useState<PartnerOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'iphone' | 'samsung'>('iphone');
  
  // 전체선택 체크박스
  const [selectAllManagers, setSelectAllManagers] = useState(false);
  const [selectAllAgents, setSelectAllAgents] = useState(false);
  
  // 생성된 링크 목록
  const [generatedLinks, setGeneratedLinks] = useState<Array<{ url: string; partner: string; type: string; affiliateCode: string | null }>>([]);
  const [showLinksModal, setShowLinksModal] = useState(false);
  
  // 링크 타입 선택 (랜딩페이지 vs 상품)
  const [linkType, setLinkType] = useState<'landing' | 'product'>('landing');
  const [selectedLandingPageId, setSelectedLandingPageId] = useState<string>('');
  
  // 이모티콘 피커 상태
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<'title' | 'campaign' | null>(null);
  const titleEmojiPickerRef = useRef<HTMLDivElement>(null);
  const campaignEmojiPickerRef = useRef<HTMLDivElement>(null);
  
  // 이모티콘 피커 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const titlePicker = titleEmojiPickerRef.current;
      const campaignPicker = campaignEmojiPickerRef.current;
      
      if (emojiPickerOpen === 'title' && titlePicker && !titlePicker.contains(target)) {
        setEmojiPickerOpen(null);
      } else if (emojiPickerOpen === 'campaign' && campaignPicker && !campaignPicker.contains(target)) {
        setEmojiPickerOpen(null);
      }
    };
    
    if (emojiPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [emojiPickerOpen]);

  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      const res = await fetch('/api/admin/affiliate/links/options');
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setProducts(json.products || []);
          setLandingPages(json.landingPages || []);
          setManagers(json.managers || []);
          setAgents(json.agents || []);
        }
      }
    } catch (error) {
      console.error('[Links] Load options error', error);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const loadLinks = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const res = await fetch(`/api/admin/affiliate/links?${params.toString()}`);
      
      if (!res.ok) {
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error(`서버 오류 (${res.status}): ${text || '알 수 없는 오류'}`);
        }
        throw new Error(json.message || '링크 목록을 불러오지 못했습니다.');
      }

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.message || '링크 목록을 불러오지 못했습니다.');
      }

      // 링크 URL 생성 (랜딩페이지 링크는 직접 랜딩페이지 URL로 생성)
      const linksWithUrl = (json.links || []).map((link: AffiliateLink) => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        
        // 랜딩페이지 링크인 경우
        if (link.landingPageId && link.landingPage) {
          const affiliateCode = link.manager?.affiliateCode || link.agent?.affiliateCode;
          let landingUrl = '';
          
          // slug가 있으면 slug 사용, 없으면 ID 사용
          const landingIdentifier = link.landingPage.slug || link.landingPageId?.toString() || '';
          
          if (affiliateCode && landingIdentifier) {
            // 파트너별 랜딩페이지: /store/{affiliateCode}/{slug 또는 id}
            landingUrl = `${baseUrl}/store/${affiliateCode}/${landingIdentifier}`;
          } else if (landingIdentifier) {
            // 관리자 랜딩페이지: /landing/{slug 또는 id}
            landingUrl = `${baseUrl}/landing/${landingIdentifier}`;
          }
          
          // 쿼리 파라미터 추가
          const params = new URLSearchParams();
          if (link.code) {
            params.append('link', link.code);
          }
          if (link.productCode) {
            params.append('product', link.productCode);
          }
          const queryString = params.toString();
          if (queryString) {
            landingUrl += `?${queryString}`;
          }
          
          return { ...link, url: landingUrl };
        }
        
        // trial 링크인 경우 (3일 체험 초대 링크) - 전체 구매몰이 아닌 로그인 페이지로
        if (link.code && link.code.startsWith('trial-')) {
          const params = new URLSearchParams();
          params.append('trial', link.code);
          if (link.agent?.affiliateCode) {
            params.append('affiliate', link.agent.affiliateCode);
          } else if (link.manager?.affiliateCode) {
            params.append('affiliate', link.manager.affiliateCode);
          }
          const loginUrl = `${baseUrl}/login-test?${params.toString()}`;
          return { ...link, url: loginUrl };
        }
        
        // 상품 링크인 경우
        let linkUrl = link.productCode ? `${baseUrl}/products/${link.productCode}` : `${baseUrl}/products`;
        const params = new URLSearchParams();
        if (link.manager?.affiliateCode) {
          params.append('affiliate', link.manager.affiliateCode);
        }
        if (link.agent?.affiliateCode) {
          params.append('agent', link.agent.affiliateCode);
        }
        if (link.code) {
          params.append('link', link.code);
        }
        if (params.toString()) {
          linkUrl += `?${params.toString()}`;
        }
        return { ...link, url: linkUrl };
      });

      setLinks(linksWithUrl);
    } catch (error: any) {
      console.error('[Links] Load error', error);
      showError(error.message || '링크 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadLinks();
    loadOptions();
  }, [loadLinks, loadOptions]);

  const handleUpdateLink = async () => {
    if (!selectedLink) return;

    // 랜딩페이지 링크 타입인 경우
    if (linkType === 'landing') {
      if (!selectedLandingPageId) {
        showError('랜딩페이지를 선택해주세요.');
        return;
      }

      try {
        const res = await fetch(`/api/admin/affiliate/links/${selectedLink.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            productCode: formData.productCode || null,
            expiresAt: formData.expiresAt || null,
            campaignName: formData.campaignName,
            description: formData.description,
            landingPageId: Number(selectedLandingPageId),
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.message || '링크 수정에 실패했습니다.');
        }

        showSuccess('링크가 수정되었습니다.');
        setIsEditModalOpen(false);
        setSelectedLink(null);
        loadLinks();
      } catch (error: any) {
        console.error('[Links] Update error', error);
        showError(error.message || '링크 수정 중 오류가 발생했습니다.');
      }
      return;
    }

    // 상품 링크 타입인 경우
    if (!formData.productCode.trim()) {
      showError('상품 코드를 입력해주세요.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/affiliate/links/${selectedLink.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          productCode: formData.productCode,
          expiresAt: formData.expiresAt || null,
          campaignName: formData.campaignName,
          description: formData.description,
          landingPageId: null, // 상품 링크는 랜딩페이지 제거
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '링크 수정에 실패했습니다.');
      }

      showSuccess('링크가 수정되었습니다.');
      setIsEditModalOpen(false);
      setSelectedLink(null);
      loadLinks();
    } catch (error: any) {
      console.error('[Links] Update error', error);
      showError(error.message || '링크 수정 중 오류가 발생했습니다.');
    }
  };

  const handleCreateLink = async () => {
    // 랜딩페이지 링크 타입인 경우
    if (linkType === 'landing') {
      if (!selectedLandingPageId) {
        showError('랜딩페이지를 선택해주세요.');
        return;
      }

      const selectedLandingPage = landingPages.find(lp => lp.id.toString() === selectedLandingPageId);
      if (!selectedLandingPage) {
        showError('선택한 랜딩페이지를 찾을 수 없습니다.');
        return;
      }

      try {
        // 전체선택 처리
        let managerIds: number[] | null = null;
        let agentIds: number[] | null = null;

        if (selectAllManagers) {
          managerIds = managers.map(m => m.id);
        } else if (formData.managerId) {
          managerIds = [Number(formData.managerId)];
        }

        if (selectAllAgents) {
          agentIds = agents.map(a => a.id);
        } else if (formData.agentId) {
          agentIds = [Number(formData.agentId)];
        }

        // 서버에 링크 생성 요청
        const res = await fetch('/api/admin/affiliate/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            productCode: formData.productCode || null,
            managerId: managerIds && managerIds.length === 1 ? managerIds[0] : null,
            managerIds: managerIds && managerIds.length > 1 ? managerIds : null,
            agentId: agentIds && agentIds.length === 1 ? agentIds[0] : null,
            agentIds: agentIds && agentIds.length > 1 ? agentIds : null,
            expiresAt: formData.expiresAt || null,
            campaignName: formData.campaignName,
            description: formData.description,
            landingPageId: Number(selectedLandingPageId), // 랜딩페이지 ID 추가
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          const errorMessage = json.message || json.error || '링크 생성에 실패했습니다.';
          const errorDetails = json.details ? `\n상세: ${JSON.stringify(json.details)}` : '';
          throw new Error(errorMessage + errorDetails);
        }

        // 생성된 링크 URL 생성 (랜딩페이지 링크는 직접 랜딩페이지 URL로 생성)
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const productCode = formData.productCode || '';
        const generatedLinks: Array<{ url: string; partner: string; type: string; affiliateCode: string | null }> = [];

        const createdLinks = json.links || (json.link ? [json.link] : []);
        
        // 랜딩페이지 정보 다시 조회 (링크 생성 후에도 사용하기 위해)
        const currentLandingPage = landingPages.find(lp => lp.id.toString() === selectedLandingPageId);
        
        for (const link of createdLinks) {
          // 랜딩페이지 링크인 경우 직접 랜딩페이지 URL 생성
          if (currentLandingPage) {
            const affiliateCode = link.manager?.affiliateCode || link.agent?.affiliateCode;
            let landingUrl = '';
            
            // slug가 있으면 slug 사용, 없으면 ID 사용
            const landingIdentifier = currentLandingPage.slug || currentLandingPage.id.toString();
            
            if (affiliateCode) {
              // 파트너별 랜딩페이지: /store/{affiliateCode}/{slug 또는 id}
              landingUrl = `${baseUrl}/store/${affiliateCode}/${landingIdentifier}`;
            } else {
              // 관리자 랜딩페이지: /landing/{slug 또는 id}
              landingUrl = `${baseUrl}/landing/${landingIdentifier}`;
            }
            
            if (landingUrl) {
              // 쿼리 파라미터 추가 (링크 코드, 상품 코드)
              const params = new URLSearchParams();
              if (link.code) {
                params.append('link', link.code);
              }
              if (productCode) {
                params.append('product', productCode);
              }
              const queryString = params.toString();
              if (queryString) {
                landingUrl += `?${queryString}`;
              }
              
              generatedLinks.push({
                url: landingUrl,
                partner: link.manager?.displayName || link.agent?.displayName || '공통',
                type: link.manager ? '대리점장' : link.agent ? '판매원' : '공통',
                affiliateCode: affiliateCode || null
              });
            }
          } else {
            // 상품 링크인 경우 기존 로직
            const params = new URLSearchParams();
            
            // affiliateCode 추가
            if (link.manager?.affiliateCode) {
              params.append('affiliate', link.manager.affiliateCode);
            }
            if (link.agent?.affiliateCode) {
              params.append('agent', link.agent.affiliateCode);
            }
            
            // 링크 코드 추가
            if (link.code) {
              params.append('link', link.code);
            }
            
            // 상품 코드 추가
            if (productCode) {
              params.append('product', productCode);
            }
            
            const queryString = params.toString();
            const linkUrl = `${baseUrl}/products${queryString ? `?${queryString}` : ''}`;
            
            generatedLinks.push({
              url: linkUrl,
              partner: link.manager?.displayName || link.agent?.displayName || '공통',
              type: link.manager ? '대리점장' : link.agent ? '판매원' : '공통',
              affiliateCode: link.manager?.affiliateCode || link.agent?.affiliateCode || null
            });
          }
        }

        if (generatedLinks.length === 0) {
          showError('생성할 링크가 없습니다.');
          return;
        }

        // 링크 목록을 클립보드에 복사
        const linksText = generatedLinks.map(l => `${l.partner} (${l.type}): ${l.url}`).join('\n');
        await navigator.clipboard.writeText(linksText);
        
        // 링크 목록을 모달로 표시
        setGeneratedLinks(generatedLinks);
        setShowLinksModal(true);
        
        showSuccess(`${generatedLinks.length}개의 링크가 생성되어 클립보드에 복사되었습니다.`);
        loadLinks(); // 링크 목록 새로고침
      } catch (error: any) {
        console.error('[Links] Create error', error);
        showError(error.message || '링크 생성 중 오류가 발생했습니다.');
      }
      return;
    }

    // 상품 링크 타입인 경우 (기존 로직)
    if (!formData.productCode.trim()) {
      showError('상품 코드를 입력해주세요.');
      return;
    }

    try {
      // 전체선택 처리
      let managerIds: number[] | null = null;
      let agentIds: number[] | null = null;

      if (selectAllManagers) {
        managerIds = managers.map(m => m.id);
      } else if (formData.managerId) {
        managerIds = [Number(formData.managerId)];
      }

      if (selectAllAgents) {
        agentIds = agents.map(a => a.id);
      } else if (formData.agentId) {
        agentIds = [Number(formData.agentId)];
      }

      // 상품 페이지 링크 생성
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const productCode = formData.productCode;
      const generatedLinks: Array<{ url: string; partner: string; type: string; affiliateCode: string | null }> = [];

      // 대리점장 링크 생성
      if (managerIds && managerIds.length > 0) {
        for (const managerId of managerIds) {
          const manager = managers.find(m => m.id === managerId);
          if (manager?.affiliateCode) {
            const productUrl = `${baseUrl}/products/${productCode}?affiliate=${manager.affiliateCode}`;
            generatedLinks.push({
              url: productUrl,
              partner: manager.displayName || '대리점장',
              type: '대리점장',
              affiliateCode: manager.affiliateCode
            });
          }
        }
      }

      // 판매원 링크 생성
      if (agentIds && agentIds.length > 0) {
        for (const agentId of agentIds) {
          const agent = agents.find(a => a.id === agentId);
          if (agent?.affiliateCode) {
            const productUrl = `${baseUrl}/products/${productCode}?agent=${agent.affiliateCode}`;
            generatedLinks.push({
              url: productUrl,
              partner: agent.displayName || '판매원',
              type: '판매원',
              affiliateCode: agent.affiliateCode
            });
          }
        }
      }

      // 공통 링크
      if (!managerIds && !agentIds) {
        const commonUrl = `${baseUrl}/products/${productCode}`;
        generatedLinks.push({
          url: commonUrl,
          partner: '공통',
          type: '공통',
          affiliateCode: null
        });
      }

      // 링크 목록을 클립보드에 복사
      const linksText = generatedLinks.map(l => `${l.partner} (${l.type}): ${l.url}`).join('\n');
      await navigator.clipboard.writeText(linksText);
      
      // 링크 목록을 모달로 표시
      setGeneratedLinks(generatedLinks);
      setShowLinksModal(true);
      
      showSuccess(`${generatedLinks.length}개의 링크가 생성되어 클립보드에 복사되었습니다.`);
    } catch (error: any) {
      console.error('[Links] Create error', error);
      showError(error.message || '링크 생성 중 오류가 발생했습니다.');
    }
  };

  const handleReissueLink = async () => {
    if (!selectedLink) return;

    try {
      const res = await fetch(`/api/admin/affiliate/links/${selectedLink.id}/reissue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newExpiresAt: reissueExpiresAt || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || '링크 재발급에 실패했습니다.');
      }

      showSuccess('링크가 재발급되었습니다.');
      setIsReissueModalOpen(false);
      setSelectedLink(null);
      setReissueExpiresAt('');
      loadLinks();
    } catch (error: any) {
      console.error('[Links] Reissue error', error);
      showError(error.message || '링크 재발급 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    if (!confirm('정말 이 링크를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/affiliate/links/${linkId}`, {
        method: 'DELETE',
      });

      // 응답이 비어있거나 JSON이 아닌 경우 처리
      let json;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          json = await res.json();
        } catch (parseError) {
          console.error('[Links] JSON parse error', parseError);
          throw new Error('서버 응답을 처리할 수 없습니다.');
        }
      } else {
        // JSON이 아닌 경우
        if (!res.ok) {
          throw new Error(`서버 오류: ${res.status} ${res.statusText}`);
        }
        json = { ok: true, message: '링크가 삭제되었습니다.' };
      }

      if (!res.ok || !json.ok) {
        throw new Error(json.message || '링크 삭제에 실패했습니다.');
      }

      showSuccess(json.message || '링크가 삭제되었습니다.');
      loadLinks();
    } catch (error: any) {
      console.error('[Links] Delete error', error);
      showError(error.message || '링크 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleExpireLink = async (linkId: number) => {
    if (!confirm('정말 이 링크를 만료 처리하시겠습니까?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/affiliate/links/${linkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'EXPIRED',
        }),
      });

      // 응답이 비어있거나 JSON이 아닌 경우 처리
      let json;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          json = await res.json();
        } catch (parseError) {
          console.error('[Links] JSON parse error', parseError);
          throw new Error('서버 응답을 처리할 수 없습니다.');
        }
      } else {
        // JSON이 아닌 경우
        if (!res.ok) {
          throw new Error(`서버 오류: ${res.status} ${res.statusText}`);
        }
        json = { ok: true, message: '링크가 만료 처리되었습니다.' };
      }

      if (!res.ok || !json.ok) {
        throw new Error(json.message || '링크 만료 처리에 실패했습니다.');
      }

      showSuccess(json.message || '링크가 만료 처리되었습니다.');
      loadLinks();
    } catch (error: any) {
      console.error('[Links] Expire error', error);
      showError(error.message || '링크 만료 처리 중 오류가 발생했습니다.');
    }
  };

  const getStatusBadge = (link: AffiliateLink) => {
    const now = new Date();
    const expiresAt = link.expiresAt ? new Date(link.expiresAt) : null;
    const isExpired = expiresAt && expiresAt < now;
    const isExpiringSoon = expiresAt && expiresAt > now && expiresAt.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;

    switch (link.status) {
      case 'ACTIVE':
        if (isExpired) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              <FiXCircle />
              만료됨
            </span>
          );
        }
        if (isExpiringSoon) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
              <FiClock />
              만료 임박
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            <FiCheckCircle />
            활성
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            <FiXCircle />
            만료됨
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            비활성
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            취소됨
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {link.status}
          </span>
        );
    }
  };

  const filteredLinks = links.filter((link) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        link.code.toLowerCase().includes(term) ||
        link.productCode?.toLowerCase().includes(term) ||
        link.title?.toLowerCase().includes(term) ||
        link.campaignName?.toLowerCase().includes(term) ||
        link.manager?.displayName?.toLowerCase().includes(term) ||
        link.agent?.displayName?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="p-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">링크 관리</h1>
          <p className="text-sm text-gray-600 mt-1">
            구매 링크를 생성, 만료, 재발급할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadLinks}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            <FiRefreshCw />
            새로고침
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
          >
            <FiPlus />
            링크 생성
          </button>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="링크 코드, 상품코드, 캠페인명, 담당자로 검색..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">전체</option>
          <option value="ACTIVE">활성</option>
          <option value="EXPIRED">만료됨</option>
          <option value="INACTIVE">비활성</option>
          <option value="REVOKED">취소됨</option>
        </select>
      </div>

      {/* 링크 목록 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : filteredLinks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">링크가 없습니다.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  링크 코드
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  상품
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  담당자
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  캠페인
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  만료일
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  통계
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLinks.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{link.code}</div>
                    {link.title && (
                      <div className="text-xs text-gray-500">{link.title}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {link.product?.title || link.productCode || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {link.manager?.displayName && (
                      <div>대리점장: {link.manager.displayName}</div>
                    )}
                    {link.agent?.displayName && (
                      <div className="text-xs text-gray-500">판매원: {link.agent.displayName}</div>
                    )}
                    {!link.manager && !link.agent && <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {link.campaignName || '-'}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(link)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {link.expiresAt ? (
                      <div>
                        {new Date(link.expiresAt).toLocaleDateString('ko-KR')}
                        {(() => {
                          const expiresAt = new Date(link.expiresAt!);
                          const now = new Date();
                          const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
                            return (
                              <div className="text-xs text-yellow-600 mt-1">
                                {daysUntilExpiry}일 후 만료
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : (
                      <span className="text-gray-400">만료일 없음</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>리드: {link._count.leads}</div>
                    <div className="text-xs">판매: {link._count.sales}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {link.url && (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <FiExternalLink />
                          열기
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setSelectedLink(link);
                          setIsEditModalOpen(true);
                          // 링크 정보를 폼에 설정
                          setFormData({
                            title: link.title || '',
                            productCode: link.productCode || '',
                            managerId: link.manager?.id?.toString() || '',
                            agentId: link.agent?.id?.toString() || '',
                            expiresAt: link.expiresAt ? new Date(link.expiresAt).toISOString().split('T')[0] : '',
                            campaignName: link.campaignName || '',
                            description: (link as any).description || '',
                          });
                          // 랜딩페이지 정보 설정
                          if (link.landingPageId) {
                            setSelectedLandingPageId(link.landingPageId.toString());
                            setLinkType('landing');
                          } else if (link.productCode) {
                            setLinkType('product');
                            setSelectedLandingPageId('');
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <FiEdit2 />
                        수정
                      </button>
                      {link.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedLink(link);
                              setIsReissueModalOpen(true);
                              // 기본값: 30일 후
                              const defaultDate = new Date();
                              defaultDate.setDate(defaultDate.getDate() + 30);
                              setReissueExpiresAt(defaultDate.toISOString().split('T')[0]);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            <FiCopy />
                            재발급
                          </button>
                          <button
                            onClick={() => handleExpireLink(link.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-yellow-200 bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-100"
                          >
                            <FiClock />
                            만료
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        <FiTrash2 />
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 링크 생성 모달 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl my-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* 왼쪽: 폼 */}
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">링크 생성</h2>
                  <p className="text-sm text-gray-600 mt-1">상품 링크를 생성하여 판매원/대리점장에게 배포합니다.</p>
                </div>

                <div className="space-y-4">
                  {/* 링크 타입 선택 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">링크 타입 <span className="text-red-500">*</span></label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setLinkType('landing');
                          setFormData(prev => ({ ...prev, productCode: '' }));
                        }}
                        className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                          linkType === 'landing'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-2xl">📄</span>
                          <span>랜딩페이지 링크</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkType('product');
                          setSelectedLandingPageId('');
                        }}
                        className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                          linkType === 'product'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-2xl">🛍️</span>
                          <span>상품 링크</span>
                        </div>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {linkType === 'landing' 
                        ? '랜딩페이지로 연결되는 링크를 생성합니다.'
                        : '상품 상세 페이지로 연결되는 링크를 생성합니다.'}
                    </p>
                  </div>

                  {/* 랜딩페이지 링크 타입일 때 */}
                  {linkType === 'landing' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          랜딩페이지 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedLandingPageId}
                          onChange={(e) => setSelectedLandingPageId(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          disabled={loadingOptions}
                        >
                          <option value="">랜딩페이지를 선택하세요</option>
                          {landingPages.map((lp) => (
                            <option key={lp.id} value={lp.id.toString()}>
                              {lp.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          마케팅 자동화 &gt; 랜딩페이지 관리에서 생성한 랜딩페이지를 선택하세요.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          상품 코드 (선택)
                        </label>
                        <select
                          value={formData.productCode}
                          onChange={(e) => setFormData((prev) => ({ ...prev, productCode: e.target.value }))}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          disabled={loadingOptions}
                        >
                          <option value="">상품 코드 없이 링크 생성</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.productCode}>
                              {product.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          선택하면 랜딩페이지 URL에 상품 코드가 쿼리 파라미터로 추가됩니다.
                        </p>
                      </div>
                    </>
                  )}

                  {/* 상품 링크 타입일 때 */}
                  {linkType === 'product' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        상품 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.productCode}
                        onChange={(e) => setFormData((prev) => ({ ...prev, productCode: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        disabled={loadingOptions}
                      >
                        <option value="">상품을 선택하세요</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.productCode}>
                            {product.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        상품 상세 페이지로 연결되는 링크를 생성합니다.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">링크 제목</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="예) 10월 프로모션 링크"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => setEmojiPickerOpen(emojiPickerOpen === 'title' ? null : 'title')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="이모티콘 추가"
                      >
                        <span className="text-lg">😊</span>
                      </button>
                      {emojiPickerOpen === 'title' && (
                        <div ref={titleEmojiPickerRef} className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-80">
                          <div className="text-xs font-semibold text-gray-700 mb-2">인기 이모티콘</div>
                          <div className="grid grid-cols-8 gap-2">
                            {['🎉', '🎊', '🎁', '🎈', '⚡', '🔥', '💥', '✅', '🎯', '🎪', '🎨', '💰', '💵', '💳', '🚀', '⏰', '⏳', '🕐', '🎭', '🎬', '🌟', '⭐', '✨', '🎀', '🎂', '💎', '🏆', '🎖️', '🥇', '🎗️', '🎫', '🎟️', '🎡', '🎠', '🎢'].map((emoji, index) => (
                              <button
                                key={`${emoji}-${index}`}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, title: (prev.title || '') + emoji }));
                                  setEmojiPickerOpen(null);
                                }}
                                className="text-2xl hover:bg-gray-100 rounded-lg p-1 transition-colors"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">대리점장 (선택)</label>
                    <select
                      value={formData.managerId}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, managerId: e.target.value }));
                        setSelectAllManagers(false);
                      }}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      disabled={loadingOptions || selectAllManagers}
                    >
                      <option value="">공통 링크 (모든 대리점장 사용 가능)</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id.toString()}>
                          {manager.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="selectAllManagers"
                        checked={selectAllManagers}
                        onChange={(e) => {
                          setSelectAllManagers(e.target.checked);
                          if (e.target.checked) {
                            setFormData((prev) => ({ ...prev, managerId: '' }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="selectAllManagers" className="text-sm text-gray-700 cursor-pointer">
                        모든 대리점장 전체선택 ({managers.length}명) - 각 개인별 링크 생성
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectAllManagers 
                        ? `전체선택 시 ${managers.length}명의 대리점장에게 각각 개별 링크가 생성됩니다.`
                        : '비워두면 모든 대리점장이 사용할 수 있는 공통 링크가 생성됩니다.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">판매원 (선택)</label>
                    <select
                      value={formData.agentId}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, agentId: e.target.value }));
                        setSelectAllAgents(false);
                      }}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      disabled={loadingOptions || selectAllAgents}
                    >
                      <option value="">공통 링크 (모든 판매원 사용 가능)</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id.toString()}>
                          {agent.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="selectAllAgents"
                        checked={selectAllAgents}
                        onChange={(e) => {
                          setSelectAllAgents(e.target.checked);
                          if (e.target.checked) {
                            setFormData((prev) => ({ ...prev, agentId: '' }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="selectAllAgents" className="text-sm text-gray-700 cursor-pointer">
                        모든 판매원 전체선택 ({agents.length}명) - 각 개인별 링크 생성
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectAllAgents 
                        ? `전체선택 시 ${agents.length}명의 판매원에게 각각 개별 링크가 생성됩니다.`
                        : '비워두면 모든 판매원이 사용할 수 있는 공통 링크가 생성됩니다.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">만료일 (선택)</label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">만료일을 설정하지 않으면 만료되지 않습니다.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">캠페인명</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.campaignName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, campaignName: e.target.value }))}
                        placeholder="예) 10월 프로모션"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => setEmojiPickerOpen(emojiPickerOpen === 'campaign' ? null : 'campaign')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="이모티콘 추가"
                      >
                        <span className="text-lg">😊</span>
                      </button>
                      {emojiPickerOpen === 'campaign' && (
                        <div ref={campaignEmojiPickerRef} className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-80">
                          <div className="text-xs font-semibold text-gray-700 mb-2">인기 이모티콘</div>
                          <div className="grid grid-cols-8 gap-2">
                            {['🎉', '🎊', '🎁', '🎈', '⚡', '🔥', '💥', '✅', '🎯', '🎪', '🎨', '💰', '💵', '💳', '🚀', '⏰', '⏳', '🕐', '🎭', '🎬', '🌟', '⭐', '✨', '🎀', '🎂', '💎', '🏆', '🎖️', '🥇', '🎗️', '🎫', '🎟️', '🎡', '🎠', '🎢'].map((emoji, index) => (
                              <button
                                key={`${emoji}-${index}`}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, campaignName: (prev.campaignName || '') + emoji }));
                                  setEmojiPickerOpen(null);
                                }}
                                className="text-2xl hover:bg-gray-100 rounded-lg p-1 transition-colors"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">설명</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      placeholder="링크에 대한 설명..."
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setFormData({
                        title: '',
                        productCode: '',
                        managerId: '',
                        agentId: '',
                        expiresAt: '',
                        campaignName: '',
                        description: '',
                      });
                    }}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCreateLink}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
                  >
                    <FiPlus />
                    생성
                  </button>
                </div>
              </div>

              {/* 오른쪽: 스마트폰 미리보기 */}
              <div className="lg:sticky lg:top-6 h-fit">
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">미리보기</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewDevice('iphone')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          previewDevice === 'iphone'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        📱 iPhone
                      </button>
                      <button
                        onClick={() => setPreviewDevice('samsung')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          previewDevice === 'samsung'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        📱 Samsung
                      </button>
                    </div>
                  </div>

                  {/* 스마트폰 프레임 */}
                  <div className={`relative mx-auto ${previewDevice === 'iphone' ? 'w-[375px]' : 'w-[360px]'}`}>
                    {/* 스마트폰 외곽 */}
                    <div className={`relative bg-black rounded-[2.5rem] p-2 ${previewDevice === 'iphone' ? 'shadow-2xl' : 'shadow-xl rounded-[3rem]'}`}>
                      {/* 노치/상단바 */}
                      <div className={`bg-black rounded-t-[2rem] ${previewDevice === 'iphone' ? 'h-8' : 'h-6'} flex items-center justify-center`}>
                        <div className={`bg-gray-800 rounded-full ${previewDevice === 'iphone' ? 'w-32 h-5' : 'w-24 h-4'}`}></div>
                      </div>
                      
                      {/* 화면 */}
                      <div className="bg-white rounded-[1.5rem] overflow-hidden">
                        <div className="h-[600px] overflow-y-auto">
                          {/* 링크 미리보기 내용 */}
                          <div className="p-4">
                            {formData.productCode ? (
                              <>
                                <div className="mb-4">
                                  <div className="h-48 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl mb-4 flex items-center justify-center">
                                    <span className="text-white text-2xl font-bold">
                                      {products.find(p => p.productCode === formData.productCode)?.packageName || '상품 이미지'}
                                    </span>
                                  </div>
                                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                                    {products.find(p => p.productCode === formData.productCode)?.label || formData.productCode}
                                  </h2>
                                  {formData.title && (
                                    <p className="text-sm text-gray-600 mb-2">{formData.title}</p>
                                  )}
                                  {formData.campaignName && (
                                    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded">
                                      {formData.campaignName}
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-2 text-xs text-gray-600">
                                  <div className="flex justify-between">
                                    <span>상품 코드:</span>
                                    <span className="font-mono">{formData.productCode}</span>
                                  </div>
                                  {formData.managerId && (
                                    <div className="flex justify-between">
                                      <span>대리점장:</span>
                                      <span>{managers.find(m => m.id.toString() === formData.managerId)?.displayName || '선택됨'}</span>
                                    </div>
                                  )}
                                  {formData.agentId && (
                                    <div className="flex justify-between">
                                      <span>판매원:</span>
                                      <span>{agents.find(a => a.id.toString() === formData.agentId)?.displayName || '선택됨'}</span>
                                    </div>
                                  )}
                                  {!formData.managerId && !formData.agentId && (
                                    <div className="text-blue-600 font-semibold">✓ 공통 링크 (모든 파트너 사용 가능)</div>
                                  )}
                                </div>
                                <div className="mt-4">
                                  <div className="bg-gray-100 rounded-lg p-3 text-xs font-mono break-all">
                                    {(() => {
                                      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                                      let url = `${baseUrl}/products/${formData.productCode}`;
                                      const params = new URLSearchParams();
                                      if (formData.managerId) {
                                        const manager = managers.find(m => m.id.toString() === formData.managerId);
                                        if (manager?.affiliateCode) {
                                          params.append('affiliate', manager.affiliateCode);
                                        }
                                      }
                                      if (formData.agentId) {
                                        const agent = agents.find(a => a.id.toString() === formData.agentId);
                                        if (agent?.affiliateCode) {
                                          params.append('agent', agent.affiliateCode);
                                        }
                                      }
                                      if (params.toString()) {
                                        url += `?${params.toString()}`;
                                      }
                                      return url;
                                    })()}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-400">
                                <div className="text-center">
                                  <div className="text-4xl mb-2">📱</div>
                                  <p className="text-sm">상품을 선택하면<br />미리보기가 표시됩니다</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* 하단 홈 인디케이터 */}
                      <div className={`bg-black rounded-b-[2rem] ${previewDevice === 'iphone' ? 'h-6' : 'h-4'} flex items-center justify-center`}>
                        <div className={`bg-white rounded-full ${previewDevice === 'iphone' ? 'w-32 h-1' : 'w-24 h-1'}`}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 생성된 링크 목록 모달 */}
      {showLinksModal && generatedLinks.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">생성된 링크 목록</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    총 {generatedLinks.length}개의 링크가 생성되었습니다. (클립보드에 복사됨)
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowLinksModal(false);
                    setGeneratedLinks([]);
                    setIsCreateModalOpen(false);
                    setFormData({
                      title: '',
                      productCode: '',
                      managerId: '',
                      agentId: '',
                      expiresAt: '',
                      campaignName: '',
                      description: '',
                    });
                    setSelectAllManagers(false);
                    setSelectAllAgents(false);
                    setSelectedLandingPageId('');
                    setLinkType('landing');
                    loadLinks();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {generatedLinks.map((link, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-700">
                            {link.type}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">{link.partner}</span>
                          {link.affiliateCode && (
                            <span className="text-xs text-gray-500">({link.affiliateCode})</span>
                          )}
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-300">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 break-all font-mono"
                          >
                            {link.url}
                          </a>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(link.url);
                          showSuccess('링크가 복사되었습니다!');
                        }}
                        className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <FiCopy />
                        복사
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    const allLinks = generatedLinks.map(l => l.url).join('\n');
                    navigator.clipboard.writeText(allLinks);
                    showSuccess('모든 링크가 복사되었습니다!');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
                >
                  <FiCopy />
                  전체 링크 복사
                </button>
                <button
                  onClick={() => {
                    setShowLinksModal(false);
                    setGeneratedLinks([]);
                    setIsCreateModalOpen(false);
                    setFormData({
                      title: '',
                      productCode: '',
                      managerId: '',
                      agentId: '',
                      expiresAt: '',
                      campaignName: '',
                      description: '',
                    });
                    setSelectAllManagers(false);
                    setSelectAllAgents(false);
                    setSelectedLandingPageId('');
                    setLinkType('landing');
                    loadLinks();
                  }}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 링크 수정 모달 */}
      {isEditModalOpen && selectedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl my-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* 왼쪽: 폼 */}
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">링크 수정</h2>
                  <p className="text-sm text-gray-600 mt-1">링크 정보를 수정합니다.</p>
                </div>

                <div className="space-y-4">
                  {/* 링크 타입 선택 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">링크 타입 <span className="text-red-500">*</span></label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setLinkType('landing');
                          if (!selectedLandingPageId) {
                            setFormData(prev => ({ ...prev, productCode: '' }));
                          }
                        }}
                        className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                          linkType === 'landing'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-2xl">📄</span>
                          <span>랜딩페이지 링크</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkType('product');
                          setSelectedLandingPageId('');
                        }}
                        className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                          linkType === 'product'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-2xl">🛍️</span>
                          <span>상품 링크</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 랜딩페이지 링크 타입일 때 */}
                  {linkType === 'landing' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          랜딩페이지 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedLandingPageId}
                          onChange={(e) => setSelectedLandingPageId(e.target.value)}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          disabled={loadingOptions}
                        >
                          <option value="">랜딩페이지를 선택하세요</option>
                          {landingPages.map((lp) => (
                            <option key={lp.id} value={lp.id.toString()}>
                              {lp.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          상품 코드 (선택)
                        </label>
                        <select
                          value={formData.productCode}
                          onChange={(e) => setFormData((prev) => ({ ...prev, productCode: e.target.value }))}
                          className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          disabled={loadingOptions}
                        >
                          <option value="">상품 코드 없이 링크 생성</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.productCode}>
                              {product.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* 상품 링크 타입일 때 */}
                  {linkType === 'product' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        상품 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.productCode}
                        onChange={(e) => setFormData((prev) => ({ ...prev, productCode: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        disabled={loadingOptions}
                      >
                        <option value="">상품을 선택하세요</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.productCode}>
                            {product.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 링크 제목 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">링크 제목</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="예) 10월 프로모션 링크"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => setEmojiPickerOpen(emojiPickerOpen === 'title' ? null : 'title')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="이모티콘 추가"
                      >
                        <span className="text-lg">😊</span>
                      </button>
                      {emojiPickerOpen === 'title' && (
                        <div ref={titleEmojiPickerRef} className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-80">
                          <div className="text-xs font-semibold text-gray-700 mb-2">인기 이모티콘</div>
                          <div className="grid grid-cols-8 gap-2">
                            {['🎉', '🎊', '🎁', '🎈', '⚡', '🔥', '💥', '✅', '🎯', '🎪', '🎨', '💰', '💵', '💳', '🚀', '⏰', '⏳', '🕐', '🎭', '🎬', '🌟', '⭐', '✨', '🎀', '🎂', '💎', '🏆', '🎖️', '🥇', '🎗️', '🎫', '🎟️', '🎡', '🎠', '🎢'].map((emoji, index) => (
                              <button
                                key={`${emoji}-${index}`}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, title: (prev.title || '') + emoji }));
                                  setEmojiPickerOpen(null);
                                }}
                                className="text-2xl hover:bg-gray-100 rounded-lg p-1 transition-colors"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 만료일 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">만료일 (선택)</label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">만료일을 설정하지 않으면 만료되지 않습니다.</p>
                  </div>

                  {/* 캠페인명 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">캠페인명</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.campaignName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, campaignName: e.target.value }))}
                        placeholder="예) 10월 프로모션"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => setEmojiPickerOpen(emojiPickerOpen === 'campaign' ? null : 'campaign')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="이모티콘 추가"
                      >
                        <span className="text-lg">😊</span>
                      </button>
                      {emojiPickerOpen === 'campaign' && (
                        <div ref={campaignEmojiPickerRef} className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-80">
                          <div className="text-xs font-semibold text-gray-700 mb-2">인기 이모티콘</div>
                          <div className="grid grid-cols-8 gap-2">
                            {['🎉', '🎊', '🎁', '🎈', '⚡', '🔥', '💥', '✅', '🎯', '🎪', '🎨', '💰', '💵', '💳', '🚀', '⏰', '⏳', '🕐', '🎭', '🎬', '🌟', '⭐', '✨', '🎀', '🎂', '💎', '🏆', '🎖️', '🥇', '🎗️', '🎫', '🎟️', '🎡', '🎠', '🎢'].map((emoji, index) => (
                              <button
                                key={`${emoji}-${index}`}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, campaignName: (prev.campaignName || '') + emoji }));
                                  setEmojiPickerOpen(null);
                                }}
                                className="text-2xl hover:bg-gray-100 rounded-lg p-1 transition-colors"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 설명 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">설명</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="링크에 대한 설명..."
                      rows={3}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setSelectedLink(null);
                      setFormData({
                        title: '',
                        productCode: '',
                        managerId: '',
                        agentId: '',
                        expiresAt: '',
                        campaignName: '',
                        description: '',
                      });
                      setSelectedLandingPageId('');
                      setLinkType('landing');
                    }}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleUpdateLink}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
                  >
                    수정
                  </button>
                </div>
              </div>

              {/* 오른쪽: 미리보기 (생성 모달과 동일) */}
              <div className="hidden lg:block">
                {/* 미리보기는 생성 모달과 동일한 구조 사용 */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 링크 재발급 모달 */}
      {isReissueModalOpen && selectedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">링크 재발급</h2>
              <p className="text-sm text-gray-600 mt-1">
                기존 링크를 복사하여 새 링크를 생성합니다. 기존 링크는 비활성화됩니다.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">기존 링크 코드:</span>
                    <span className="font-semibold">{selectedLink.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">상품:</span>
                    <span className="font-semibold">{selectedLink.product?.title || selectedLink.productCode}</span>
                  </div>
                  {selectedLink.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">기존 만료일:</span>
                      <span className="font-semibold">
                        {new Date(selectedLink.expiresAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  새 만료일 (선택)
                </label>
                <input
                  type="date"
                  value={reissueExpiresAt}
                  onChange={(e) => setReissueExpiresAt(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  만료일을 설정하지 않으면 기본값(30일 후)이 적용됩니다.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <FiAlertCircle className="text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">재발급 안내</p>
                    <p>
                      재발급 시 기존 링크는 비활성화되고 새로운 링크가 생성됩니다. 기존 링크의 통계는 유지됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsReissueModalOpen(false);
                  setSelectedLink(null);
                  setReissueExpiresAt('');
                }}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleReissueLink}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-green-700"
              >
                <FiCopy />
                재발급
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
















