'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FiSend, FiClock, FiList, FiMessageSquare, FiMail, FiSmartphone, FiBell,
  FiUsers, FiSearch, FiPlus, FiEdit, FiTrash2, FiLoader,
  FiCheckCircle, FiAlertCircle, FiFilter, FiDownload, FiExternalLink,
  FiEye, FiPhone, FiUser, FiBarChart2
} from 'react-icons/fi';
import { SiKakaotalk } from 'react-icons/si';
import { showSuccess, showError, showWarning, showInfo } from '@/components/ui/Toast';
import { isSafeUrl } from '@/lib/utils/url-safety';

// 탭 타입
type TabType = 'instant' | 'scheduled' | 'history';
type SendMethodType = 'sms' | 'email' | 'kakao' | 'push' | 'app';

// 발송 대상 그룹
type TargetGroupType = 'trial' | 'purchased' | 'mall' | 'b2b' | 'landing' | 'custom';

// 메시지 내역 타입
interface MessageHistory {
  id: number;
  title: string;
  content: string;
  messageType: string;
  totalSent: number;
  totalRead: number;
  recipients: Array<{
    id: number;
    name: string;
    phone: string;
    readCount: number;
    messageId: number;
  }>;
  admin: {
    id: number;
    name: string;
  } | null;
  createdAt: string;
  isActive: boolean;
}

// 예약 메시지 타입
interface ScheduledMessage {
  id: number;
  title: string;
  category: string;
  groupName: string | null;
  sendMethod: string;
  senderName: string | null;
  senderPhone: string | null;
  senderEmail: string | null;
  isActive: boolean;
  startDate: string | null;
  startTime: string | null;
  stages: Array<{
    id: number;
    stageNumber: number;
    daysAfter: number;
    sendTime: string | null;
    title: string;
    content: string;
  }>;
  targetGroup?: {
    id: number;
    name: string;
    _count?: { members?: number; CustomerGroupMember?: number };
  } | null;
  createdAt: string;
}

// 상세 모달 상태
interface MessageDetail {
  message: MessageHistory;
  isOpen: boolean;
}

export default function MessageCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('instant');

  // 즉시 발송 상태
  const [sendMethod, setSendMethod] = useState<SendMethodType>('sms');
  const [targetGroup, setTargetGroup] = useState<TargetGroupType>('trial');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [senderName, setSenderName] = useState('크루즈가이드');
  const [senderPhone, setSenderPhone] = useState('');

  // 예약 메시지 상태
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);

  // 발송 내역 상태
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'sms' | 'email' | 'kakao' | 'push' | 'app'>('all');
  const [historySearch, setHistorySearch] = useState('');

  // 상세 모달
  const [messageDetail, setMessageDetail] = useState<MessageDetail | null>(null);

  // 통계 상태
  const [stats, setStats] = useState({
    totalSent: 0,
    totalRead: 0,
    smsCount: 0,
    emailCount: 0,
    kakaoCount: 0,
    pushCount: 0,
    appCount: 0,
  });

  // 고객 그룹 목록
  const [customerGroups, setCustomerGroups] = useState<Array<{ id: number; name: string; _count: { members?: number; CustomerGroupMember?: number } }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // 엑셀 백업 상태
  const [isExporting, setIsExporting] = useState(false);

  // 발송 대상 인원수
  const [targetCounts, setTargetCounts] = useState<{
    trial: number;
    purchased: number;
    mall: number;
    b2b: number;
    landing: number;
  }>({ trial: 0, purchased: 0, mall: 0, b2b: 0, landing: 0 });
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  // 알리고 API 설정 상태
  const [smsConfig, setSmsConfig] = useState<{
    isConfigured: boolean;
    senderPhone: string;
  }>({ isConfigured: false, senderPhone: '' });

  // 고객 목록 및 선택 상태
  interface Customer {
    id: number;
    name: string | null;
    phone: string | null;
    email: string | null;
    source: string | null;
    createdAt: string;
    selected?: boolean;
    agentId?: number | null;
    agentName?: string | null;
  }
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // 수동 입력 수신자
  const [manualRecipients, setManualRecipients] = useState<Array<{ name: string; phone?: string; email?: string }>>([]);
  const [newManualName, setNewManualName] = useState('');
  const [newManualPhone, setNewManualPhone] = useState('');
  const [newManualEmail, setNewManualEmail] = useState('');

  // 엑셀 업로드 수신자
  const [excelRecipients, setExcelRecipients] = useState<Array<{ name: string; phone?: string; email?: string }>>([]);

  // 상품 선택 (템플릿 변수용)
  const [selectedProduct, setSelectedProduct] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // 이메일용 이미지 및 버튼 상태
  const [emailImages, setEmailImages] = useState<Array<{ id: string; url: string; name: string }>>([]);
  const [emailButtons, setEmailButtons] = useState<Array<{ id: string; label: string; url: string }>>([]);

  // 고객 그룹 로드
  const loadCustomerGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/customer-groups', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setCustomerGroups(data.groups || []);
      }
    } catch (error) {
      console.error('고객 그룹 로드 실패:', error);
    }
  }, []);

  // 발송 대상 인원수 로드
  const loadTargetCounts = useCallback(async () => {
    setIsLoadingCounts(true);
    try {
      const res = await fetch('/api/admin/message-center/target-counts', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setTargetCounts(data.counts);
      }
    } catch (error) {
      console.error('발송 대상 인원수 로드 실패:', error);
    } finally {
      setIsLoadingCounts(false);
    }
  }, []);

  // 알리고 API 설정 확인
  const loadSmsConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings/sms', { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.config) {
        setSmsConfig({
          isConfigured: !!(data.config.apiKey && data.config.userId && data.config.senderPhone),
          senderPhone: data.config.senderPhone || '',
        });
        if (data.config.senderPhone) {
          setSenderPhone(data.config.senderPhone);
        }
      }
    } catch (error) {
      console.error('SMS 설정 로드 실패:', error);
    }
  }, []);

  // 고객 목록 로드
  const loadCustomers = useCallback(async (type: string) => {
    setIsLoadingCustomers(true);
    setCustomers([]); // 기존 목록 초기화
    setSelectedCustomers(new Set());
    setSelectAll(false);
    try {
      console.log('[Message Center] Loading customers for type:', type);
      const res = await fetch(`/api/admin/message-center/customers?type=${type}`, { credentials: 'include' });
      const data = await res.json();
      console.log('[Message Center] Customer API response:', { ok: data.ok, count: data.customers?.length, total: data.total });
      if (data.ok) {
        setCustomers(data.customers || []);
      } else {
        console.error('[Message Center] Customer load failed:', data.error);
      }
    } catch (error) {
      console.error('고객 목록 로드 실패:', error);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCustomers(new Set());
    } else {
      const allIds = new Set(filteredCustomers.map(c => c.id));
      setSelectedCustomers(allIds);
    }
    setSelectAll(!selectAll);
  };

  // 개별 선택
  const handleSelectCustomer = (id: number) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCustomers(newSelected);
    setSelectAll(newSelected.size === filteredCustomers.length);
  };

  // 필터링된 고객 목록
  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true;
    const search = customerSearch.toLowerCase();
    return (
      (c.name?.toLowerCase() || '').includes(search) ||
      (c.phone || '').includes(search) ||
      (c.email?.toLowerCase() || '').includes(search)
    );
  });

  // 수동 수신자 추가
  const handleAddManualRecipient = () => {
    if (sendMethod === 'email') {
      if (!newManualName.trim() || !newManualEmail.trim()) {
        showWarning('이름과 이메일을 모두 입력해주세요.');
        return;
      }
      if (!newManualEmail.includes('@')) {
        showWarning('올바른 이메일 형식을 입력해주세요.');
        return;
      }
      setManualRecipients([...manualRecipients, { name: newManualName.trim(), email: newManualEmail.trim() }]);
      setNewManualName('');
      setNewManualEmail('');
    } else {
      if (!newManualName.trim() || !newManualPhone.trim()) {
        showWarning('이름과 전화번호를 모두 입력해주세요.');
        return;
      }
      setManualRecipients([...manualRecipients, { name: newManualName.trim(), phone: newManualPhone.trim() }]);
      setNewManualName('');
      setNewManualPhone('');
    }
  };

  // 수동 수신자 삭제
  const handleRemoveManualRecipient = (index: number) => {
    setManualRecipients(manualRecipients.filter((_, i) => i !== index));
  };

  // 엑셀 양식 다운로드 (개선된 버전)
  const handleDownloadExcelTemplate = () => {
    let csvContent = '';
    let fileName = '';

    if (sendMethod === 'email') {
      csvContent = `이름,이메일
홍길동,hong@example.com
김철수,kim@example.com
박영희,park@example.com

=== 작성 안내 ===
1. 이름: 한글 또는 영문으로 입력
2. 이메일: 올바른 이메일 형식으로 입력
   - 예시: hong@example.com
3. 첫 번째 줄(이름,이메일)은 삭제하지 마세요
4. 예시 데이터는 삭제 후 실제 데이터를 입력하세요`;
      fileName = '이메일_수신자_양식.csv';
    } else {
      csvContent = `이름,전화번호
홍길동,01012345678
김철수,01098765432
박영희,01011112222
이민수,01033334444
최지영,01055556666

=== 작성 안내 ===
1. 이름: 한글 또는 영문으로 입력
2. 전화번호: 숫자만 입력 (하이픈 없이)
   - 예시: 01012345678
3. 첫 번째 줄(이름,전화번호)은 삭제하지 마세요
4. 예시 데이터는 삭제 후 실제 데이터를 입력하세요`;
      fileName = 'SMS_수신자_양식.csv';
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 엑셀 파일 업로드 (개선된 버전)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const recipients: Array<{ name: string; phone?: string; email?: string }> = [];

      // 헤더 찾기
      let startIdx = 0;
      const isEmailMode = sendMethod === 'email';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        if (isEmailMode) {
          if (line.includes('이름') && line.includes('이메일')) {
            startIdx = i + 1;
            break;
          }
        } else {
          if (line.includes('이름') && line.includes('전화')) {
            startIdx = i + 1;
            break;
          }
        }
      }

      // 데이터 파싱
      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('===') || line.startsWith('#')) continue;

        // 쉼표 또는 탭으로 분리
        const parts = line.split(/[,\t]/).map(s => s.trim().replace(/"/g, ''));
        if (parts.length >= 2) {
          const name = parts[0];

          if (isEmailMode) {
            const email = parts[1];
            // 유효성 검사: 이름이 있고, 이메일 형식이 맞는지
            if (name && email && email.includes('@')) {
              recipients.push({ name, email });
            }
          } else {
            const phone = parts[1].replace(/[^0-9]/g, '');
            // 유효성 검사: 이름이 있고, 전화번호가 10-11자리
            if (name && phone && phone.length >= 10 && phone.length <= 11) {
              recipients.push({ name, phone });
            }
          }
        }
      }

      if (recipients.length === 0) {
        const fieldName = isEmailMode ? '이메일' : '전화번호';
        showError(`유효한 수신자를 찾을 수 없습니다. 양식을 확인해주세요. (첫 번째 열: 이름, 두 번째 열: ${fieldName})`);
        return;
      }

      setExcelRecipients(recipients);
      showSuccess(`${recipients.length}명의 수신자를 불러왔습니다.`);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = ''; // 리셋
  };

  // 상품 목록 상태
  const [affiliateProducts, setAffiliateProducts] = useState<Array<{
    id: number;
    productCode: string;
    title: string;
    status: string;
  }>>([]);

  // 상품 목록 로드
  const loadAffiliateProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/affiliate/products', { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.products) {
        // 활성화된 상품만 필터링
        const activeProducts = data.products.filter((p: any) => p.status === 'ACTIVE' || p.isPublished);
        setAffiliateProducts(activeProducts);
      }
    } catch (error) {
      console.error('상품 목록 로드 실패:', error);
    }
  }, []);

  // 상품 선택 시 링크 자동 설정
  const handleProductSelect = (productCode: string) => {
    const product = affiliateProducts.find(p => p.productCode === productCode);
    if (product) {
      setSelectedProduct(product.title);
      // 상품 상세 페이지 링크 자동 생성
      setLinkUrl(`https://cruisemall.kr/product/${product.productCode}`);
    } else {
      setSelectedProduct('');
      setLinkUrl('');
    }
  };

  // SMS 호환 이모티콘 목록 (특수문자로 깨지지 않는 것들)
  const smsEmojis = [
    // 별/하트/기호
    '★', '☆', '♥', '♡', '◆', '◇', '■', '□', '●', '○',
    '△', '▲', '▽', '▼', '◁', '▷', '♠', '♣', '♤', '♧',
    // 화살표
    '→', '←', '↑', '↓', '↔', '⇒', '⇐', '⇑', '⇓', '⇔',
    // 체크/X
    '√', '✓', '✔', '✕', '✖', '✗', '✘', '○', '●', '◎',
    // 숫자 기호
    '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
    // 특수 기호
    '※', '★', '☆', '◈', '◐', '◑', '◒', '◓', '♨', '☎',
    '☏', '✉', '✈', '☀', '☁', '☂', '☃', '♬', '♪', '♩',
    // 괄호/꺾쇠
    '【', '】', '〔', '〕', '《', '》', '「', '」', '『', '』',
    // 선/구분선
    '─', '━', '│', '┃', '┌', '┐', '└', '┘', '├', '┤',
    // 기타 기호
    '◀', '▶', '◁', '▷', '♤', '♧', '♡', '♢', '⊙', '⊕',
  ];

  // 메시지 템플릿 변수 적용
  const applyMessageVariables = (text: string, recipient: { name: string; phone: string }) => {
    return text
      .replace(/\{이름\}/g, recipient.name || '고객님')
      .replace(/\{\{이름\}\}/g, recipient.name || '고객님')
      .replace(/\{연락처\}/g, recipient.phone || '')
      .replace(/\{\{연락처\}\}/g, recipient.phone || '')
      .replace(/\{상품\}/g, selectedProduct || '크루즈 상품')
      .replace(/\{\{상품명\}\}/g, selectedProduct || '크루즈 상품')
      .replace(/\{링크\}/g, linkUrl || '');
  };


  // 예약 메시지 로드
  const loadScheduledMessages = useCallback(async () => {
    setIsLoadingScheduled(true);
    try {
      const res = await fetch('/api/admin/scheduled-messages', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setScheduledMessages(data.messages || []);
      }
    } catch (error) {
      console.error('예약 메시지 로드 실패:', error);
    } finally {
      setIsLoadingScheduled(false);
    }
  }, []);

  // 발송 내역 로드
  const loadMessageHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/admin/messages?includeAffiliateMessages=true', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setMessageHistory(data.messages || []);

        // 통계 계산
        const messages = data.messages || [];
        const newStats = {
          totalSent: 0,
          totalRead: 0,
          smsCount: 0,
          emailCount: 0,
          kakaoCount: 0,
          pushCount: 0,
          appCount: 0,
        };

        messages.forEach((msg: MessageHistory) => {
          newStats.totalSent += msg.totalSent || 1;
          newStats.totalRead += msg.totalRead || 0;

          switch (msg.messageType) {
            case 'sms': newStats.smsCount++; break;
            case 'email': newStats.emailCount++; break;
            case 'kakao': newStats.kakaoCount++; break;
            case 'push':
            case 'announcement': newStats.pushCount++; break;
            default: newStats.appCount++; break;
          }
        });

        setStats(newStats);
      }
    } catch (error) {
      console.error('발송 내역 로드 실패:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadCustomerGroups();
    loadTargetCounts();
    loadSmsConfig();
    loadAffiliateProducts();
    // 초기 로드 시 trial 고객 목록도 함께 로드
    loadCustomers('trial');
  }, [loadCustomerGroups, loadTargetCounts, loadSmsConfig, loadAffiliateProducts, loadCustomers]);

  // 발송 대상 그룹 변경 시 고객 목록 로드 (버튼 클릭 시에도 직접 호출됨)
  useEffect(() => {
    // 초기 로드 시 중복 호출 방지를 위해 체크
    if (targetGroup !== 'custom' && targetGroup !== 'trial') {
      loadCustomers(targetGroup);
    }
  }, [targetGroup, loadCustomers]);

  useEffect(() => {
    if (activeTab === 'scheduled') {
      loadScheduledMessages();
    } else if (activeTab === 'history') {
      loadMessageHistory();
    }
  }, [activeTab, loadScheduledMessages, loadMessageHistory]);

  // 즉시 발송 처리
  const handleInstantSend = async () => {
    if (!title.trim() || !content.trim()) {
      showWarning('제목과 내용을 모두 입력해주세요.');
      return;
    }

    // 총 발송 대상 수 계산
    const totalRecipients = selectedCustomers.size + manualRecipients.length + excelRecipients.length;

    if (totalRecipients === 0) {
      showWarning('발송 대상을 선택해주세요. 고객 목록에서 선택하거나, 수동으로 수신자를 추가해주세요.');
      return;
    }

    const targetLabel = targetGroup === 'trial' ? '3일 무료체험 고객' :
      targetGroup === 'purchased' ? '구매 고객' :
      targetGroup === 'mall' ? '크루즈몰 고객' :
      targetGroup === 'b2b' ? 'B2B 유입 고객' :
      targetGroup === 'landing' ? '랜딩 유입 고객' : '선택한 고객 그룹';

    if (!confirm(`총 ${totalRecipients}명에게 ${sendMethod.toUpperCase()} 메시지를 발송하시겠습니까?\n\n- 선택된 ${targetLabel}: ${selectedCustomers.size}명\n- 수동 입력: ${manualRecipients.length}명\n- 엑셀 업로드: ${excelRecipients.length}명`)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      // 선택된 고객들의 정보 수집 (이름, 전화번호)
      const selectedRecipients: Array<{ name: string; phone: string }> = [];
      filteredCustomers.forEach(c => {
        if (selectedCustomers.has(c.id) && c.phone) {
          selectedRecipients.push({ name: c.name || '고객', phone: c.phone });
        }
      });

      // 수동 입력 + 엑셀 업로드 수신자 추가
      const allRecipients = [
        ...selectedRecipients,
        ...manualRecipients,
        ...excelRecipients,
      ];

      let endpoint = '';
      let body: any = {};

      if (sendMethod === 'push') {
        // 푸시 알림 (긴급 공지)
        endpoint = '/api/admin/broadcast';
        body = {
          title,
          message: content,
          targetGroup: targetGroup === 'custom' ? 'all' : targetGroup,
        };
      } else if (sendMethod === 'sms') {
        endpoint = '/api/admin/messages/send-sms';
        body = {
          title,
          content,
          recipients: allRecipients,
          productName: selectedProduct || '',
          linkUrl: linkUrl || '',
          senderName,
          senderPhone,
        };
      } else if (sendMethod === 'email') {
        // 이메일 주소가 있는 수신자만 필터링
        const emailRecipients = allRecipients.filter(r => {
          const customer = filteredCustomers.find(c => c.phone === r.phone);
          return customer?.email;
        }).map(r => {
          const customer = filteredCustomers.find(c => c.phone === r.phone);
          return { name: r.name, email: customer?.email || '', phone: r.phone };
        });

        // 유효한 버튼만 필터링 (label과 url 모두 있는 것만)
        const validButtons = emailButtons.filter(btn => btn.label.trim() && btn.url.trim());

        endpoint = '/api/admin/messages/send-email';
        body = {
          title,
          content,
          recipients: emailRecipients,
          productName: selectedProduct || '',
          linkUrl: linkUrl || '',
          senderName,
          images: emailImages.length > 0 ? emailImages : undefined,
          buttons: validButtons.length > 0 ? validButtons : undefined,
        };
      } else if (sendMethod === 'kakao') {
        endpoint = '/api/admin/messages/send-kakao';
        body = {
          title,
          content,
          targetGroup,
          groupId: targetGroup === 'custom' ? selectedGroupId : null,
        };
      } else {
        // 크루즈가이드 앱 메시지
        endpoint = '/api/admin/messages';
        body = {
          title,
          content,
          messageType: 'team-dashboard',
          targetGroup,
          groupId: targetGroup === 'custom' ? selectedGroupId : null,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        setSendResult({
          sent: data.result?.sent || data.sentCount || data.totalSent || 1,
          failed: data.result?.failed || data.failedCount || 0,
        });
        showSuccess(`발송 완료! (성공: ${data.result?.sent || data.sentCount || data.totalSent || 1}건)`);
        setTitle('');
        setContent('');
      } else {
        showError(data.error || '발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('발송 오류:', error);
      showError('발송 중 오류가 발생했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  // 예약 메시지 삭제
  const handleDeleteScheduled = async (id: number) => {
    if (!confirm('이 예약 메시지를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/admin/scheduled-messages/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        showSuccess('삭제되었습니다.');
        loadScheduledMessages();
      } else {
        showError(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      showError('삭제 중 오류가 발생했습니다.');
    }
  };

  // 엑셀 내보내기
  const handleExportExcel = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      // 구글 드라이브 스프레드시트로 내보내기
      const res = await fetch('/api/admin/messages/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: messageHistory }),
      });

      const data = await res.json();

      if (data.ok && data.spreadsheetUrl) {
        // 새 탭에서 스프레드시트 열기
        window.open(data.spreadsheetUrl, '_blank');
        showSuccess('구글 스프레드시트로 내보내기 완료!');
      } else if (data.ok && data.blob) {
        // 로컬 다운로드
        const blob = new Blob([data.blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `메시지발송내역_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // 간단한 CSV 다운로드
        const csvContent = generateCSV();
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `메시지발송내역_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showSuccess('CSV 파일로 다운로드 완료!');
      }
    } catch (error) {
      console.error('내보내기 오류:', error);
      // 폴백: CSV 다운로드
      const csvContent = generateCSV();
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `메시지발송내역_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('CSV 파일로 다운로드 완료!');
    } finally {
      setIsExporting(false);
    }
  };

  // CSV 생성
  const generateCSV = () => {
    const headers = ['발송일시', '담당자', '제목', '내용', '발송방법', '발송유형', '발송대상', '발송건수', '수신건수', '수신율'];
    const rows = messageHistory.map(msg => [
      new Date(msg.createdAt).toLocaleString('ko-KR'),
      msg.admin?.name || '시스템',
      msg.title,
      msg.content.replace(/\n/g, ' ').substring(0, 100),
      getMethodLabel(msg.messageType),
      getSenderTypeLabel(msg.messageType),
      msg.recipients?.map(r => r.name).join(', ') || '전체',
      (msg.totalSent || 1).toString(),
      (msg.totalRead || 0).toString(),
      `${Math.round(((msg.totalRead || 0) / (msg.totalSent || 1)) * 100)}%`,
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  };

  // 발송 방법 라벨
  const getMethodLabel = (type: string) => {
    switch (type) {
      case 'sms': return 'SMS';
      case 'email': return '이메일';
      case 'kakao': return '카카오톡';
      case 'push':
      case 'announcement': return '푸시알림';
      case 'agent-manager': return '팀메시지';
      case 'manager-agent': return '팀메시지';
      case 'manager-manager': return '팀메시지';
      case 'agent-admin': return '팀메시지';
      case 'manager-admin': return '팀메시지';
      case 'team-dashboard': return '팀메시지';
      default: return '앱메시지';
    }
  };

  // 발송 유형 라벨 (누가 누구에게)
  const getSenderTypeLabel = (type: string) => {
    switch (type) {
      case 'agent-manager': return '판매원→대리점장';
      case 'manager-agent': return '대리점장→판매원';
      case 'manager-manager': return '대리점장→대리점장';
      case 'agent-admin': return '판매원→본사';
      case 'manager-admin': return '대리점장→본사';
      case 'team-dashboard': return '본사→팀';
      case 'sms': return 'SMS발송';
      case 'email': return '이메일발송';
      case 'kakao': return '카카오발송';
      case 'push':
      case 'announcement': return '푸시발송';
      default: return '앱발송';
    }
  };

  // 발송 방법별 아이콘
  const getSendMethodIcon = (method: string) => {
    switch (method) {
      case 'sms': return <FiSmartphone className="text-green-600" />;
      case 'email': return <FiMail className="text-blue-600" />;
      case 'kakao': return <SiKakaotalk className="text-yellow-600" />;
      case 'push':
      case 'announcement': return <FiBell className="text-red-600" />;
      default: return <FiMessageSquare className="text-indigo-600" />;
    }
  };

  // 발송 방법별 색상
  const getMethodColor = (type: string) => {
    switch (type) {
      case 'sms': return 'bg-green-100 text-green-800 border-green-200';
      case 'email': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'kakao': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'push':
      case 'announcement': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  // 필터링된 메시지
  const filteredHistory = messageHistory.filter(msg => {
    if (historyFilter !== 'all') {
      if (historyFilter === 'app') {
        if (!['team-dashboard', 'info', 'notification'].includes(msg.messageType)) return false;
      } else if (historyFilter === 'push') {
        if (!['push', 'announcement'].includes(msg.messageType)) return false;
      } else if (msg.messageType !== historyFilter) {
        return false;
      }
    }

    if (historySearch) {
      const search = historySearch.toLowerCase();
      return (
        msg.title.toLowerCase().includes(search) ||
        msg.content.toLowerCase().includes(search) ||
        msg.admin?.name.toLowerCase().includes(search) ||
        msg.recipients?.some(r => r.name.toLowerCase().includes(search) || r.phone?.includes(search))
      );
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FiMessageSquare size={32} />
          메시지 센터
        </h1>
        <p className="mt-2 text-slate-300">
          SMS, 이메일, 카카오톡, 푸시 알림을 한 곳에서 관리하세요
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-xl shadow-md p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('instant')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'instant'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FiSend size={20} />
            즉시 발송
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'scheduled'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FiClock size={20} />
            예약 발송
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FiList size={20} />
            발송 내역
          </button>
        </div>
      </div>

      {/* 즉시 발송 탭 */}
      {activeTab === 'instant' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 발송 설정 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 발송 방법 선택 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FiSend className="text-blue-600" />
                발송 방법
              </h2>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { value: 'sms', label: 'SMS', icon: <FiSmartphone size={24} />, color: 'green' },
                  { value: 'email', label: '이메일', icon: <FiMail size={24} />, color: 'blue' },
                  { value: 'kakao', label: '카카오톡', icon: <SiKakaotalk size={24} />, color: 'yellow' },
                  { value: 'push', label: '푸시 알림', icon: <FiBell size={24} />, color: 'red' },
                  { value: 'app', label: '앱 메시지', icon: <FiSmartphone size={24} />, color: 'indigo' },
                ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSendMethod(method.value as SendMethodType)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      sendMethod === method.value
                        ? `bg-${method.color}-50 border-${method.color}-500 text-${method.color}-700`
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {method.icon}
                    <span className="text-sm font-semibold">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 발신자 정보 (SMS/이메일일 경우) */}
            {(sendMethod === 'sms' || sendMethod === 'email') && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FiUser className="text-blue-600" />
                  발신자 정보
                  {sendMethod === 'sms' && (
                    <a
                      href="/admin/settings"
                      className="ml-auto text-sm font-normal text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <FiExternalLink size={14} />
                      알리고 API 설정
                    </a>
                  )}
                </h2>

                {/* SMS 발송 시 알리고 API 상태 표시 */}
                {sendMethod === 'sms' && (
                  <div className={`mb-4 p-3 rounded-lg ${smsConfig.isConfigured ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <div className="flex items-center gap-2">
                      {smsConfig.isConfigured ? (
                        <>
                          <FiCheckCircle className="text-green-600" size={18} />
                          <span className="text-green-800 font-medium">알리고 API 연동됨</span>
                          {smsConfig.senderPhone && (
                            <span className="text-green-600 text-sm ml-2">발신번호: {smsConfig.senderPhone}</span>
                          )}
                        </>
                      ) : (
                        <>
                          <FiAlertCircle className="text-yellow-600" size={18} />
                          <span className="text-yellow-800 font-medium">알리고 API 설정 필요</span>
                          <a href="/admin/settings" className="text-yellow-700 underline text-sm ml-2">설정하기</a>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      발신자 이름
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="크루즈가이드"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {sendMethod === 'sms' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        발신 번호
                      </label>
                      <input
                        type="tel"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder="02-1234-5678"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={smsConfig.isConfigured && smsConfig.senderPhone !== ''}
                      />
                      {smsConfig.isConfigured && smsConfig.senderPhone && (
                        <p className="text-xs text-gray-500 mt-1">알리고 설정의 발신번호가 자동으로 사용됩니다</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 발송 대상 선택 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FiUsers className="text-blue-600" />
                발송 대상
                {isLoadingCounts && <FiLoader className="animate-spin text-gray-400" size={16} />}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[
                  { value: 'trial', label: '3일 무료체험', icon: '🎁', count: targetCounts.trial, desc: '크루즈닷AI 3일 무료체험 고객' },
                  { value: 'purchased', label: '구매고객', icon: '💳', count: targetCounts.purchased, desc: '상품 구매 완료 고객' },
                  { value: 'mall', label: '크루즈몰고객', icon: '🛒', count: targetCounts.mall, desc: '크루즈몰 가입 고객' },
                  { value: 'b2b', label: 'B2B유입', icon: '🏢', count: targetCounts.b2b, desc: 'B2B 랜딩페이지 유입' },
                  { value: 'landing', label: '랜딩유입', icon: '📄', count: targetCounts.landing, desc: '랜딩페이지 유입 고객' },
                  { value: 'custom', label: '그룹 선택', icon: '📁', count: null, desc: '특정 그룹 선택' },
                ].map((group) => (
                  <button
                    key={group.value}
                    onClick={() => {
                      const newGroup = group.value as TargetGroupType;
                      setTargetGroup(newGroup);
                      // custom이 아닌 경우 바로 고객 목록 로드 (동일 그룹 재클릭 시에도 새로고침)
                      if (newGroup !== 'custom') {
                        loadCustomers(newGroup);
                      }
                    }}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      targetGroup === group.value
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    title={group.desc}
                  >
                    <div className="text-2xl mb-1">{group.icon}</div>
                    <div className="text-sm font-semibold">{group.label}</div>
                    {group.count !== null && (
                      <div className="text-xs text-gray-500 mt-1">{group.count.toLocaleString()}명</div>
                    )}
                  </button>
                ))}
              </div>

              {/* 그룹 선택 시 드롭다운 */}
              {targetGroup === 'custom' && (
                <div className="mt-4">
                  <select
                    value={selectedGroupId || ''}
                    onChange={(e) => setSelectedGroupId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">고객 그룹 선택...</option>
                    {customerGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group._count?.members ?? group._count?.CustomerGroupMember ?? 0}명)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 고객 목록 표시 */}
              {targetGroup !== 'custom' && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-700">
                        고객 목록 ({filteredCustomers.length}명)
                      </span>
                      {isLoadingCustomers && <FiLoader className="animate-spin text-gray-400" size={16} />}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder="이름, 전화번호 검색..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="pl-9 pr-3 py-2 border rounded-lg text-sm w-48"
                        />
                      </div>
                      <button
                        onClick={handleSelectAll}
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                      >
                        {selectAll ? '전체 해제' : '전체 선택'}
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-blue-600 mb-2">
                    선택된 수신자: <span className="font-bold">{selectedCustomers.size}명</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left w-10">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={handleSelectAll}
                              className="rounded"
                            />
                          </th>
                          <th className="px-3 py-2 text-left">이름</th>
                          <th className="px-3 py-2 text-left">전화번호</th>
                          <th className="px-3 py-2 text-left">이메일</th>
                          <th className="px-3 py-2 text-left">담당자</th>
                          <th className="px-3 py-2 text-left">유입경로</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.slice(0, 100).map((customer) => (
                          <tr key={customer.id} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedCustomers.has(customer.id)}
                                onChange={() => handleSelectCustomer(customer.id)}
                                className="rounded"
                              />
                            </td>
                            <td className="px-3 py-2 font-medium">{customer.name || '-'}</td>
                            <td className="px-3 py-2">{customer.phone || '-'}</td>
                            <td className="px-3 py-2 text-gray-500 truncate max-w-[150px]">{customer.email || '-'}</td>
                            <td className="px-3 py-2">
                              {customer.agentName ? (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{customer.agentName}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{customer.source || '-'}</span>
                            </td>
                          </tr>
                        ))}
                        {filteredCustomers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                              {isLoadingCustomers ? '로딩 중...' : '해당 그룹에 고객이 없습니다'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredCustomers.length > 100 && (
                    <p className="text-xs text-gray-500 mt-2">* 최대 100명까지 표시됩니다. 검색을 이용해주세요.</p>
                  )}
                </div>
              )}
            </div>

            {/* 수동 수신자 입력 / 엑셀 업로드 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FiUser className="text-blue-600" />
                추가 수신자
              </h2>

              {/* 엑셀 양식 다운로드 / 업로드 */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <button
                  onClick={handleDownloadExcelTemplate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                >
                  <FiDownload size={16} />
                  엑셀 양식 다운로드
                </button>
                <label className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 cursor-pointer">
                  <FiPlus size={16} />
                  엑셀 파일 업로드
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                </label>
                {excelRecipients.length > 0 && (
                  <span className="text-sm text-green-600 font-medium">
                    엑셀에서 {excelRecipients.length}명 불러옴
                  </span>
                )}
              </div>

              {/* 수동 입력 */}
              <div className="flex items-end gap-2 mb-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                  <input
                    type="text"
                    value={newManualName}
                    onChange={(e) => setNewManualName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="flex-1">
                  {sendMethod === 'email' ? (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                      <input
                        type="email"
                        value={newManualEmail}
                        onChange={(e) => setNewManualEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                      <input
                        type="tel"
                        value={newManualPhone}
                        onChange={(e) => setNewManualPhone(e.target.value)}
                        placeholder="01012345678"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </>
                  )}
                </div>
                <button
                  onClick={handleAddManualRecipient}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  추가
                </button>
              </div>

              {/* 추가된 수신자 목록 */}
              {(manualRecipients.length > 0 || excelRecipients.length > 0) && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    추가 수신자 목록 ({manualRecipients.length + excelRecipients.length}명)
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {manualRecipients.map((r, idx) => (
                      <span key={`manual-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded text-sm">
                        {r.name} ({r.email || r.phone})
                        <button onClick={() => handleRemoveManualRecipient(idx)} className="text-red-500 hover:text-red-700">×</button>
                      </span>
                    ))}
                    {excelRecipients.map((r, idx) => (
                      <span key={`excel-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-sm">
                        {r.name} ({r.email || r.phone})
                      </span>
                    ))}
                  </div>
                  {excelRecipients.length > 0 && (
                    <button
                      onClick={() => setExcelRecipients([])}
                      className="mt-2 text-sm text-red-600 hover:underline"
                    >
                      엑셀 수신자 초기화
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 메시지 작성 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FiEdit className="text-blue-600" />
                메시지 작성
              </h2>

              {/* 템플릿 변수 가이드 */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-semibold text-blue-800 mb-2">📝 클릭하면 내용에 자동 삽입됩니다</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => setContent(content + '{이름}')}
                    className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 font-medium transition-colors"
                  >
                    {'{이름}'} <span className="text-gray-500">수신자 이름</span>
                  </button>
                  <button
                    onClick={() => setContent(content + '{연락처}')}
                    className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 font-medium transition-colors"
                  >
                    {'{연락처}'} <span className="text-gray-500">수신자 연락처</span>
                  </button>
                  <button
                    onClick={() => setContent(content + '{상품명}')}
                    className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 font-medium transition-colors"
                  >
                    {'{상품명}'} <span className="text-gray-500">선택한 상품</span>
                  </button>
                  <button
                    onClick={() => setContent(content + '{링크}')}
                    className="px-3 py-1.5 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 font-medium transition-colors"
                  >
                    {'{링크}'} <span className="text-gray-500">첨부 링크</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* 상품 선택 (드롭다운) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    상품 선택 (선택사항)
                  </label>
                  <select
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">상품을 선택하세요...</option>
                    {affiliateProducts.length > 0 ? (
                      affiliateProducts.map((product) => (
                        <option key={product.id} value={product.productCode}>
                          {product.title}
                        </option>
                      ))
                    ) : (
                      <option disabled>등록된 상품이 없습니다</option>
                    )}
                  </select>
                  {selectedProduct && (
                    <p className="text-xs text-green-600 mt-1">선택됨: {selectedProduct}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{'{상품}'} 변수에 자동으로 적용됩니다. 수당 등록된 활성 상품만 표시됩니다.</p>
                </div>

                {/* 링크 입력 (상품 선택 시 자동 입력) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    링크 첨부 {selectedProduct && <span className="text-green-600">(자동 연결됨)</span>}
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://cruisemall.kr/product/..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">{'{링크}'} 변수에 자동으로 적용됩니다. 상품 선택 시 자동으로 링크가 입력됩니다.</p>
                </div>

                {/* SMS 호환 이모티콘 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    SMS 호환 이모티콘 (깨지지 않는 특수문자)
                  </label>
                  <div className="p-3 bg-gray-50 border rounded-lg max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {smsEmojis.map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => setContent(content + emoji)}
                          className="w-8 h-8 flex items-center justify-center text-lg bg-white border rounded hover:bg-blue-50 hover:border-blue-300"
                          title={`클릭하면 내용에 추가됩니다`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">클릭하면 메시지 내용에 추가됩니다. 일반 이모지(😀)는 SMS에서 ????로 깨질 수 있습니다.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="메시지 제목을 입력하세요"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">{title.length}/100</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`안녕하세요, {이름}님!\n\n{상품명} 상품을 추천드립니다.\n\n자세한 내용은 아래 링크를 확인해주세요.\n{링크}`}
                    rows={8}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">{content.length}/1000</p>
                </div>

                {/* 이메일 전용: 이미지 추가 */}
                {sendMethod === 'email' && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📷 이미지 추가 (최대 5개)
                    </label>
                    <div className="space-y-3">
                      {/* 이미지 업로드 버튼 */}
                      {emailImages.length < 5 && (
                        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                          <FiPlus size={18} />
                          <span className="text-sm font-medium text-gray-600">이미지 업로드</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const base64 = event.target?.result as string;
                                  setEmailImages([...emailImages, {
                                    id: Date.now().toString(),
                                    url: base64,
                                    name: file.name
                                  }]);
                                };
                                reader.readAsDataURL(file);
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}

                      {/* 추가된 이미지 목록 */}
                      {emailImages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {emailImages.map((img) => (
                            <div key={img.id} className="relative group">
                              <img
                                src={img.url}
                                alt={img.name}
                                className="w-20 h-20 object-cover rounded-lg border"
                              />
                              <button
                                onClick={() => setEmailImages(emailImages.filter(i => i.id !== img.id))}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 이메일 전용: 버튼 추가 */}
                {sendMethod === 'email' && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🔘 버튼 추가 (최대 3개)
                    </label>
                    <div className="space-y-3">
                      {/* 추가된 버튼 목록 */}
                      {emailButtons.map((btn, idx) => (
                        <div key={btn.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-bold text-gray-500">{idx + 1}</span>
                          <input
                            type="text"
                            value={btn.label}
                            onChange={(e) => {
                              const updated = emailButtons.map(b =>
                                b.id === btn.id ? { ...b, label: e.target.value } : b
                              );
                              setEmailButtons(updated);
                            }}
                            placeholder="버튼 텍스트"
                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          />
                          <input
                            type="url"
                            value={btn.url}
                            onChange={(e) => {
                              const updated = emailButtons.map(b =>
                                b.id === btn.id ? { ...b, url: e.target.value } : b
                              );
                              setEmailButtons(updated);
                            }}
                            placeholder="https://..."
                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          />
                          <button
                            onClick={() => setEmailButtons(emailButtons.filter(b => b.id !== btn.id))}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      ))}

                      {/* 버튼 추가 */}
                      {emailButtons.length < 3 && (
                        <button
                          onClick={() => setEmailButtons([...emailButtons, {
                            id: Date.now().toString(),
                            label: '',
                            url: ''
                          }])}
                          className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors w-full justify-center"
                        >
                          <FiPlus size={16} />
                          <span className="text-sm font-medium">버튼 추가</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 미리보기 및 발송 */}
          <div className="space-y-6">
            {/* 발송 대상 요약 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4">발송 대상 요약</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">선택된 고객</span>
                  <span className="font-bold text-blue-600">{selectedCustomers.size}명</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">수동 입력 수신자</span>
                  <span className="font-bold text-indigo-600">{manualRecipients.length}명</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">엑셀 업로드 수신자</span>
                  <span className="font-bold text-green-600">{excelRecipients.length}명</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-blue-50 -mx-6 px-6">
                  <span className="font-semibold text-gray-800">총 발송 대상</span>
                  <span className="font-bold text-xl text-blue-700">
                    {selectedCustomers.size + manualRecipients.length + excelRecipients.length}명
                  </span>
                </div>
              </div>
            </div>

            {/* 미리보기 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4">미리보기</h2>
              <p className="text-xs text-gray-500 mb-2">* 변수가 적용된 예시입니다</p>
              <div className="bg-gray-100 rounded-2xl p-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    {getSendMethodIcon(sendMethod)}
                    <span className="font-semibold text-gray-900">{title || '제목 없음'}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {applyMessageVariables(content || '내용을 입력해주세요...', { name: '홍길동', phone: '01012345678' })}
                  </p>

                  {/* 이메일 이미지 미리보기 */}
                  {sendMethod === 'email' && emailImages.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {emailImages.map((img) => (
                        <img
                          key={img.id}
                          src={img.url}
                          alt={img.name}
                          className="w-full max-h-48 object-contain rounded-lg border"
                        />
                      ))}
                    </div>
                  )}

                  {/* 이메일 버튼 미리보기 */}
                  {sendMethod === 'email' && emailButtons.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {emailButtons.filter(btn => btn.label).map((btn) => (
                        <a
                          key={btn.id}
                          href={isSafeUrl(btn.url) ? btn.url : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          onClick={(e) => {
                            if (!isSafeUrl(btn.url)) {
                              e.preventDefault();
                            }
                          }}
                        >
                          {btn.label}
                        </a>
                      ))}
                    </div>
                  )}

                  {senderName && (
                    <p className="text-xs text-gray-500 mt-3 pt-2 border-t">
                      발신: {senderName} {senderPhone && `(${senderPhone})`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 발송 결과 */}
            {sendResult && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="text-green-600" size={20} />
                  <span className="font-semibold text-green-800">발송 완료</span>
                </div>
                <div className="text-sm text-green-700">
                  <p>• 성공: {sendResult.sent}건</p>
                  {sendResult.failed > 0 && <p>• 실패: {sendResult.failed}건</p>}
                </div>
              </div>
            )}

            {/* 주의사항 */}
            {sendMethod === 'push' && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <FiAlertCircle className="text-yellow-600 mt-0.5" size={18} />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">푸시 알림 주의사항</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>푸시 알림 허용 사용자에게만 전달됩니다</li>
                      <li>발송 후 취소할 수 없습니다</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 발송 버튼 */}
            <button
              onClick={handleInstantSend}
              disabled={isSending || !title.trim() || !content.trim()}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                isSending || !title.trim() || !content.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isSending ? (
                <>
                  <FiLoader className="animate-spin" size={20} />
                  발송 중...
                </>
              ) : (
                <>
                  <FiSend size={20} />
                  메시지 발송
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 예약 발송 탭 */}
      {activeTab === 'scheduled' && (
        <div className="space-y-6">
          {/* 상단 액션 */}
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              등록된 예약 메시지: <span className="font-bold text-blue-600">{scheduledMessages.length}개</span>
            </p>
            <a
              href="/admin/funnel"
              className="px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl font-bold hover:from-slate-800 hover:to-slate-700 flex items-center gap-2 shadow-lg"
            >
              <FiPlus size={20} />
              퍼널 메시지 관리
            </a>
          </div>

          {/* 예약 메시지 목록 */}
          {isLoadingScheduled ? (
            <div className="text-center py-16">
              <FiLoader className="inline-block animate-spin text-4xl text-blue-600 mb-4" />
              <p className="text-gray-600">로딩 중...</p>
            </div>
          ) : scheduledMessages.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <FiClock className="mx-auto text-6xl text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">등록된 예약 메시지가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-200 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{msg.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getMethodColor(msg.sendMethod)}`}>
                          {getSendMethodIcon(msg.sendMethod)}
                          <span className="ml-1">{getMethodLabel(msg.sendMethod)}</span>
                        </span>
                        {msg.targetGroup && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                            👥 {msg.targetGroup.name} ({msg.targetGroup._count?.members ?? msg.targetGroup._count?.CustomerGroupMember ?? 0}명)
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          msg.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {msg.isActive ? '활성' : '비활성'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {msg.senderName && <span>발신자: {msg.senderName}</span>}
                        {msg.senderPhone && <span>발신번호: {msg.senderPhone}</span>}
                        <span>단계: {msg.stages.length}개</span>
                        {msg.startDate && (
                          <span>시작일: {new Date(msg.startDate).toLocaleDateString('ko-KR')}</span>
                        )}
                        <span>생성일: {new Date(msg.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`/admin/funnel`}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        title="퍼널 메시지 관리에서 편집"
                      >
                        <FiEdit size={18} />
                      </a>
                      <button
                        onClick={() => handleDeleteScheduled(msg.id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 발송 내역 탭 */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <FiBarChart2 className="text-blue-600" />
                <span className="text-sm text-gray-600">총 발송</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSent}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <FiCheckCircle className="text-green-600" />
                <span className="text-sm text-gray-600">총 수신</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.totalRead}</p>
              <p className="text-xs text-gray-500">
                ({stats.totalSent > 0 ? Math.round((stats.totalRead / stats.totalSent) * 100) : 0}%)
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <FiSmartphone className="text-green-600" />
                <span className="text-sm text-gray-600">SMS</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.smsCount}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <FiMail className="text-blue-600" />
                <span className="text-sm text-gray-600">이메일</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.emailCount}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <SiKakaotalk className="text-yellow-600" />
                <span className="text-sm text-gray-600">카카오</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.kakaoCount}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <FiMessageSquare className="text-indigo-600" />
                <span className="text-sm text-gray-600">앱/푸시</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.appCount + stats.pushCount}</p>
            </div>
          </div>

          {/* 필터 및 액션 */}
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <FiFilter className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">필터:</span>
                {['all', 'sms', 'email', 'kakao', 'push', 'app'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setHistoryFilter(filter as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      historyFilter === filter
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter === 'all' ? '전체' : filter === 'push' ? '푸시' : filter === 'app' ? '앱' : filter.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="검색 (제목, 내용, 담당자, 수신자)"
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                  />
                </div>
                <button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-semibold disabled:bg-gray-400"
                >
                  {isExporting ? <FiLoader className="animate-spin" /> : <FiDownload />}
                  엑셀로 보기
                </button>
              </div>
            </div>
          </div>

          {/* 발송 내역 목록 */}
          {isLoadingHistory ? (
            <div className="text-center py-16">
              <FiLoader className="inline-block animate-spin text-4xl text-blue-600 mb-4" />
              <p className="text-gray-600">로딩 중...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <FiList className="mx-auto text-6xl text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">발송 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">발송일시</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">담당자</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">제목</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">방법</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">발송유형</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">수신자</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">발송/수신</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">수신율</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((msg: any) => {
                    const totalSent = msg.totalSent || 1;
                    const totalRead = msg.totalRead || 0;
                    const readRate = Math.round((totalRead / totalSent) * 100);

                    return (
                      <tr key={msg.id} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-900">
                            {new Date(msg.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(msg.createdAt).toLocaleTimeString('ko-KR')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <FiUser className="text-blue-600" size={14} />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{msg.admin?.name || '시스템'}</div>
                              <div className="text-xs text-gray-500">관리자</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{msg.title}</div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">{msg.content}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${getMethodColor(msg.messageType)}`}>
                            {getSendMethodIcon(msg.messageType)}
                            <span className="ml-1">{getMethodLabel(msg.messageType)}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium">
                            {getSenderTypeLabel(msg.messageType)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {msg.recipients && msg.recipients.length > 0 ? (
                            <div className="text-sm">
                              <span className="font-medium">{msg.recipients[0]?.name}</span>
                              {msg.recipients.length > 1 && (
                                <span className="text-gray-500"> 외 {msg.recipients.length - 1}명</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">전체</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-semibold text-blue-600">{totalSent}</span>
                            <span className="text-gray-400">/</span>
                            <span className="font-semibold text-green-600">{totalRead}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                            readRate >= 80 ? 'bg-green-100 text-green-800' :
                            readRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {readRate}%
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setMessageDetail({ message: msg, isOpen: true })}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <FiEye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 상세 모달 */}
      {messageDetail?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">메시지 상세 정보</h2>
              <button
                onClick={() => setMessageDetail(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* 발신 정보 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiUser className="text-blue-600" />
                  발신 정보
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">담당자:</span>
                    <span className="ml-2 font-medium">{messageDetail.message.admin?.name || '시스템'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">발송 방법:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${getMethodColor(messageDetail.message.messageType)}`}>
                      {getMethodLabel(messageDetail.message.messageType)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">발송일시:</span>
                    <span className="ml-2 font-medium">
                      {new Date(messageDetail.message.createdAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">발송 유형:</span>
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                      {getSenderTypeLabel(messageDetail.message.messageType)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">대상 구분:</span>
                    <span className="ml-2 font-medium">
                      {messageDetail.message.recipients && messageDetail.message.recipients.length > 1 ? '단체 발송' : '개인 발송'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 메시지 내용 */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiMessageSquare className="text-blue-600" />
                  메시지 내용
                </h3>
                <div className="bg-white rounded-lg p-4">
                  <p className="font-semibold text-lg mb-2">{messageDetail.message.title}</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{messageDetail.message.content}</p>
                </div>
              </div>

              {/* 수신자 목록 */}
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiUsers className="text-green-600" />
                  수신자 ({messageDetail.message.recipients?.length || 0}명)
                </h3>
                {messageDetail.message.recipients && messageDetail.message.recipients.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/50">
                        <tr>
                          <th className="text-left py-2 px-3">이름</th>
                          <th className="text-left py-2 px-3">연락처</th>
                          <th className="text-center py-2 px-3">수신 상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {messageDetail.message.recipients.map((recipient, idx) => (
                          <tr key={idx} className="border-t border-green-100">
                            <td className="py-2 px-3 font-medium">{recipient.name}</td>
                            <td className="py-2 px-3">
                              {recipient.phone ? (
                                <span className="flex items-center gap-1">
                                  <FiPhone size={12} />
                                  {recipient.phone}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {recipient.readCount > 0 ? (
                                <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded text-xs font-semibold">
                                  수신 완료
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-semibold">
                                  미확인
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">전체 발송</p>
                )}
              </div>

              {/* 통계 */}
              <div className="bg-purple-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiBarChart2 className="text-purple-600" />
                  발송 통계
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{messageDetail.message.totalSent || 1}</p>
                    <p className="text-xs text-gray-500">발송</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{messageDetail.message.totalRead || 0}</p>
                    <p className="text-xs text-gray-500">수신</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {Math.round(((messageDetail.message.totalRead || 0) / (messageDetail.message.totalSent || 1)) * 100)}%
                    </p>
                    <p className="text-xs text-gray-500">수신율</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
