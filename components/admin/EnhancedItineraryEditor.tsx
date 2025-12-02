// components/admin/EnhancedItineraryEditor.tsx
// 향상된 여행일정 에디터 (Day별 블록, 그룹 저장/불러오기)

'use client';

import { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiTrash2, FiChevronUp, FiChevronDown, FiSave, FiFolder, FiImage, FiVideo, FiFileText, FiX, FiSearch, FiUpload, FiMapPin } from 'react-icons/fi';
import { ContentBlock } from './ProductDetailEditor';
import countries from '@/data/countries.json';

export interface EnhancedItineraryDay {
  day: number;
  emoji?: string; // 왼쪽 이모티콘
  // 관광지 도착지 (크루즈 가이드 지니 연동)
  arrivalLocation?: string; // 관광지 도착지 텍스트 (한국어 도시명)
  arrivalCountry?: string; // 도착지 국가코드 (예: JP, TW, VN)
  arrivalCountryName?: string; // 도착지 국가명 (예: 일본, 대만, 베트남)
  portArrivalTime?: string; // 입항 시간 (HH:MM 형식) - 크루즈 가이드 지니 내일예정에 표시
  portDepartureTime?: string; // 출항 시간 (HH:MM 형식)
  // 일정 시작
  scheduleStartTime?: string; // 시간
  scheduleStartTitle?: string; // 일정제목 텍스트
  tourImages?: string[]; // 관광이미지 첨부
  tourText?: string; // 관광 텍스트
  // 일정 마무리
  scheduleEndTime?: string; // 시간
  scheduleEndTitle?: string; // 일정마무리 텍스트
  // 숙박
  accommodation?: string; // 숙박 어디에 텍스트
  accommodationImage?: string; // 숙박 사진 첨부
  // 식사
  breakfast?: '선상식' | '호텔식' | '현지식' | '정찬식' | '기내식' | '자유식' | '한식';
  lunch?: '선상식' | '호텔식' | '현지식' | '정찬식' | '기내식' | '자유식' | '한식';
  dinner?: '선상식' | '호텔식' | '현지식' | '정찬식' | '기내식' | '자유식' | '한식';
  // 기존 필드 (하위 호환성)
  departure?: string; // 출발지
  arrival?: string; // 도착지
  departureTime?: string; // 출발 시간
  arrivalTime?: string; // 도착 시간
  attractions?: string[]; // 관광지 목록
  blocks: ContentBlock[]; // 이미지, 동영상, 텍스트 블록
}

interface EnhancedItineraryEditorProps {
  days: EnhancedItineraryDay[];
  onChange: (days: EnhancedItineraryDay[]) => void;
  nights?: number; // O박
  totalDays?: number; // O일
  flightInfo?: any; // 항공 정보
  onAutoGenerate?: () => void; // 자동 생성 콜백
}

export default function EnhancedItineraryEditor({
  days,
  onChange,
  nights,
  totalDays,
  flightInfo,
  onAutoGenerate
}: EnhancedItineraryEditorProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [savedGroups, setSavedGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [showCruisePhotoModal, setShowCruisePhotoModal] = useState(false);
  const [cruiseFolders, setCruiseFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [cruiseImages, setCruiseImages] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectingForDay, setSelectingForDay] = useState<number | null>(null);
  const [selectingForBlockIndex, setSelectingForBlockIndex] = useState<number | null>(null);
  const [showPPTUpload, setShowPPTUpload] = useState(false);
  const [uploadingPPT, setUploadingPPT] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null);
  const [showAccommodationImagePicker, setShowAccommodationImagePicker] = useState<number | null>(null);
  const [showTourImagePicker, setShowTourImagePicker] = useState<number | null>(null);

  // 이미지 업로드 카테고리 모달 상태
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{
    dayNumber?: number;
    blockIndex?: number;
    file?: File;
    files?: FileList;
    type: 'single' | 'multiple' | 'tour' | 'accommodation';
    uploadType: 'image' | 'video';
  } | null>(null);
  const [categoryInput, setCategoryInput] = useState('');
  const [filenameInput, setFilenameInput] = useState('');

  // 여행 관련 이모티콘 60개
  const TRAVEL_EMOJIS = [
    '✈️', '🚢', '🏖️', '🌴', '🏝️', '🗺️', '🎒', '🧳', '📷', '🌅',
    '🌄', '🌊', '⛰️', '🏔️', '🌋', '🏜️', '🏕️', '⛺', '🏨', '🏰',
    '🗼', '🗽', '🏛️', '⛩️', '🕌', '🕍', '⛪', '🕋', '🎪', '🎡',
    '🎢', '🎠', '🌉', '🌁', '🌆', '🌇', '🌃', '🌌', '🌠', '⭐',
    '🌟', '💫', '🌈', '☀️', '🌙', '🌍', '🌎', '🌏', '🗾', '🏞️',
    '🌲', '🌳', '🌵', '🌿', '🍀', '🌾', '🌺', '🌻', '🌷', '🌹'
  ];

  // 식사 타입 옵션
  const MEAL_TYPES: Array<'선상식' | '호텔식' | '현지식' | '정찬식' | '기내식' | '자유식' | '한식'> = [
    '선상식', '호텔식', '현지식', '정찬식', '기내식', '자유식', '한식'
  ];

  // 도착지 옵션 (국가 + 지역) - countries.json에서 생성
  const destinationOptions = useMemo(() => {
    const options: { value: string; label: string; country: string; countryCode: string; city: string }[] = [];

    // 특수 옵션 추가
    options.push({ value: 'sea', label: '🚢 해상 (종일 항해)', country: '', countryCode: '', city: '해상' });

    (countries as any[]).forEach(cont => {
      (cont?.countries || []).forEach((c: any) => {
        const countryName = c?.name;
        const countryCode = c?.code || '';
        if (!countryName) return;

        // "일본 (Japan)" 형식에서 한국어 이름만 추출
        const koreanCountry = countryName.split(' (')[0].trim();

        // 지역이 있는 경우
        if (Array.isArray(c?.regions)) {
          c.regions.forEach((r: string) => {
            // "후쿠오카 (Fukuoka)" 형식에서 한국어만 추출
            const koreanCity = r.split(' (')[0].trim();
            options.push({
              value: `${koreanCountry}-${koreanCity}`,
              label: `${koreanCountry} - ${koreanCity}`,
              country: koreanCountry,
              countryCode: countryCode,
              city: koreanCity
            });
          });
        }

        // 국가만 있는 옵션도 추가
        options.push({
          value: koreanCountry,
          label: koreanCountry,
          country: koreanCountry,
          countryCode: countryCode,
          city: koreanCountry
        });
      });
    });

    // 중복 제거
    const map = new Map<string, typeof options[0]>();
    options.forEach(o => map.set(o.value, o));
    return Array.from(map.values());
  }, []);

  // 도착지 검색 상태
  const [destinationSearch, setDestinationSearch] = useState<{ [key: number]: string }>({});

  // 크루즈정보사진 폴더 목록 로드
  useEffect(() => {
    if (showCruisePhotoModal) {
      loadCruiseFolders();
    }
  }, [showCruisePhotoModal]);

  const loadCruiseFolders = async () => {
    try {
      const res = await fetch('/api/admin/mall/cruise-photos?listFolders=true', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.folders) {
          setCruiseFolders(data.folders);
        }
      }
    } catch (error) {
      console.error('Failed to load cruise folders:', error);
    }
  };

  const loadCruiseImages = async (folder: string) => {
    try {
      const res = await fetch(`/api/admin/mall/cruise-photos?folder=${encodeURIComponent(folder)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.images) {
          setCruiseImages(data.images);
        }
      }
    } catch (error) {
      console.error('Failed to load cruise images:', error);
    }
  };

  const handleSelectCruiseImage = (imageUrl: string) => {
    if (showTourImagePicker !== null) {
      // 관광이미지에 추가
      const day = days.find(d => d.day === showTourImagePicker);
      if (day) {
        updateDay(showTourImagePicker, {
          tourImages: [...(day.tourImages || []), imageUrl]
        });
      }
      setShowCruisePhotoModal(false);
      setShowTourImagePicker(null);
      setSelectedFolder('');
      setCruiseImages([]);
      setSearchTerm('');
    } else if (showAccommodationImagePicker !== null) {
      // 숙박 사진에 설정
      updateDay(showAccommodationImagePicker, { accommodationImage: imageUrl });
      setShowCruisePhotoModal(false);
      setShowAccommodationImagePicker(null);
      setSelectedFolder('');
      setCruiseImages([]);
      setSearchTerm('');
    } else if (selectingForDay !== null && selectingForBlockIndex !== null) {
      // 기존 블록에 설정
      updateBlock(selectingForDay, selectingForBlockIndex, { url: imageUrl });
      setShowCruisePhotoModal(false);
      setSelectingForDay(null);
      setSelectingForBlockIndex(null);
      setSelectedFolder('');
      setCruiseImages([]);
      setSearchTerm('');
    }
  };

  const filteredFolders = cruiseFolders.filter(folder =>
    folder.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 그룹 목록 로드
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/admin/itinerary-groups', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setSavedGroups(data.groups || []);
        }
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  // O박 O일 입력 시 자동으로 블록 생성
  useEffect(() => {
    if (totalDays && totalDays > 0) {
      // 기존 일정이 없거나, 일정 개수가 totalDays와 다를 때만 업데이트
      if (days.length === 0) {
        const newDays: EnhancedItineraryDay[] = [];
        for (let i = 1; i <= totalDays; i++) {
          newDays.push({
            day: i,
            blocks: []
          });
        }
        onChange(newDays);
      } else if (days.length < totalDays) {
        // 일정이 부족하면 추가
        const newDays = [...days];
        for (let i = days.length + 1; i <= totalDays; i++) {
          newDays.push({
            day: i,
            blocks: []
          });
        }
        onChange(newDays);
      } else if (days.length > totalDays) {
        // 일정이 많으면 제거
        const newDays = days.slice(0, totalDays).map((d, idx) => ({ ...d, day: idx + 1 }));
        onChange(newDays);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalDays]);

  // 항공 정보 기반 자동 일정 생성
  const generateFromFlightInfo = () => {
    if (!flightInfo) {
      alert('항공 정보가 없습니다. 먼저 항공 정보를 입력해주세요.');
      return;
    }

    const { departure, return: returnFlight, travelPeriod } = flightInfo;
    if (!departure || !returnFlight) {
      alert('출발/도착 항공 정보가 필요합니다.');
      return;
    }

    const newDays: EnhancedItineraryDay[] = [];

    // 출발일부터 시작
    const startDate = departure.date ? new Date(departure.date) : new Date();

    for (let i = 1; i <= (totalDays || 1); i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i - 1);

      const dayInfo: EnhancedItineraryDay = {
        day: i,
        blocks: []
      };

      // 첫날: 출발
      if (i === 1) {
        dayInfo.departure = departure.origin || '';
        dayInfo.arrival = departure.destination || '';
        dayInfo.departureTime = departure.departureTime || '';
        dayInfo.arrivalTime = departure.arrivalTime || '';
      }
      // 마지막날: 귀국
      else if (i === totalDays) {
        dayInfo.departure = returnFlight.origin || '';
        dayInfo.arrival = returnFlight.destination || '';
        dayInfo.departureTime = returnFlight.departureTime || '';
        dayInfo.arrivalTime = returnFlight.arrivalTime || '';
      }
      // 중간날: 크루즈 일정
      else {
        dayInfo.departure = '';
        dayInfo.arrival = '';
      }

      newDays.push(dayInfo);
    }

    onChange(newDays);
    if (onAutoGenerate) {
      onAutoGenerate();
    }
    alert(`${totalDays}일 일정이 항공 정보를 기반으로 생성되었습니다.`);
  };

  // PPT 업로드 및 파싱
  const handlePPTUpload = async (file: File) => {
    setUploadingPPT(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'ppt');

      const res = await fetch('/api/admin/parse-ppt', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.itinerary) {
          // 파싱된 일정을 적용
          const parsedDays: EnhancedItineraryDay[] = data.itinerary.map((day: any, index: number) => ({
            day: index + 1,
            departure: day.departure || '',
            arrival: day.arrival || '',
            departureTime: day.departureTime || '',
            arrivalTime: day.arrivalTime || '',
            attractions: day.attractions || [],
            blocks: day.blocks || []
          }));

          onChange(parsedDays);
          setShowPPTUpload(false);
          alert('PPT 문서에서 일정을 불러왔습니다.');
        } else {
          alert(`PPT 파싱 실패: ${data.error || '알 수 없는 오류'}`);
        }
      } else {
        alert('PPT 업로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to upload PPT:', error);
      alert('PPT 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingPPT(false);
    }
  };

  const addDay = () => {
    const newDay: EnhancedItineraryDay = {
      day: days.length + 1,
      blocks: []
    };
    onChange([...days, newDay]);
    setExpandedDay(newDay.day);
  };

  const removeDay = (day: number) => {
    if (!confirm('이 Day를 삭제하시겠습니까?')) return;
    const filtered = days.filter(d => d.day !== day);
    const reordered = filtered.map((d, idx) => ({ ...d, day: idx + 1 }));
    onChange(reordered);
  };

  const updateDay = (day: number, updates: Partial<EnhancedItineraryDay>) => {
    const updated = days.map(d => d.day === day ? { ...d, ...updates } : d);
    onChange(updated);
  };

  const moveDay = (day: number, direction: 'up' | 'down') => {
    const index = days.findIndex(d => d.day === day);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const newDays = [...days];
      [newDays[index], newDays[index - 1]] = [newDays[index - 1], newDays[index]];
      const reordered = newDays.map((d, idx) => ({ ...d, day: idx + 1 }));
      onChange(reordered);
    } else if (direction === 'down' && index < days.length - 1) {
      const newDays = [...days];
      [newDays[index], newDays[index + 1]] = [newDays[index + 1], newDays[index]];
      const reordered = newDays.map((d, idx) => ({ ...d, day: idx + 1 }));
      onChange(reordered);
    }
  };

  const addBlock = (dayNumber: number, type: 'image' | 'video' | 'text') => {
    const newBlock: ContentBlock =
      type === 'image'
        ? { type: 'image', id: `block-${Date.now()}`, url: '', alt: '' }
        : type === 'video'
          ? { type: 'video', id: `block-${Date.now()}`, url: '', title: '' }
          : { type: 'text', id: `block-${Date.now()}`, content: '' };

    const updated = days.map(d =>
      d.day === dayNumber
        ? { ...d, blocks: [...d.blocks, newBlock] }
        : d
    );
    onChange(updated);
  };

  const updateBlock = (dayNumber: number, blockIndex: number, updates: Partial<ContentBlock>) => {
    const updated = days.map(d => {
      if (d.day === dayNumber) {
        const newBlocks = [...d.blocks];
        newBlocks[blockIndex] = { ...newBlocks[blockIndex], ...updates } as ContentBlock;
        return { ...d, blocks: newBlocks };
      }
      return d;
    });
    onChange(updated);
  };

  const removeBlock = (dayNumber: number, blockIndex: number) => {
    if (!confirm('이 블록을 삭제하시겠습니까?')) return;
    const updated = days.map(d => {
      if (d.day === dayNumber) {
        return { ...d, blocks: d.blocks.filter((_, i) => i !== blockIndex) };
      }
      return d;
    });
    onChange(updated);
  };

  const addAttraction = (dayNumber: number, attraction: string) => {
    if (!attraction.trim()) return;
    const updated = days.map(d => {
      if (d.day === dayNumber) {
        return { ...d, attractions: [...(d.attractions || []), attraction.trim()] };
      }
      return d;
    });
    onChange(updated);
  };

  const removeAttraction = (dayNumber: number, index: number) => {
    const updated = days.map(d => {
      if (d.day === dayNumber) {
        return { ...d, attractions: d.attractions?.filter((_, i) => i !== index) || [] };
      }
      return d;
    });
    onChange(updated);
  };

  const saveAsGroup = async () => {
    if (!newGroupName.trim()) {
      alert('그룹 이름을 입력하세요.');
      return;
    }

    try {
      const res = await fetch('/api/admin/itinerary-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: `${days.length}일 일정`,
          itinerary: days
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          alert('그룹이 저장되었습니다.');
          setNewGroupName('');
          setShowGroupManager(false);
          loadGroups();
        } else {
          alert(`저장 실패: ${data.error}`);
        }
      }
    } catch (error) {
      console.error('Failed to save group:', error);
      alert('그룹 저장에 실패했습니다.');
    }
  };

  const loadGroup = async (groupId: number) => {
    try {
      const res = await fetch(`/api/admin/itinerary-groups/${groupId}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.group) {
          const parsedItinerary = typeof data.group.itinerary === 'string'
            ? JSON.parse(data.group.itinerary)
            : data.group.itinerary;

          if (Array.isArray(parsedItinerary)) {
            onChange(parsedItinerary);
            alert('그룹이 불러와졌습니다.');
            setShowGroupManager(false);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load group:', error);
      alert('그룹 불러오기에 실패했습니다.');
    }
  };

  const handleFileUpload = async (dayNumber: number, blockIndex: number, file: File, type: 'image' | 'video') => {
    // 이미지인 경우 카테고리 모달 표시
    if (type === 'image') {
      setPendingUpload({ dayNumber, blockIndex, file, type: 'single', uploadType: 'image' });
      setCategoryInput('');
      setFilenameInput(file.name.replace(/\.[^/.]+$/, ''));
      setShowCategoryModal(true);
    } else {
      // 비디오는 기존 방식대로 업로드
      await uploadFile(dayNumber, blockIndex, file, type);
    }
  };

  const uploadFile = async (dayNumber: number, blockIndex: number, file: File, type: 'image' | 'video', category?: string, filename?: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      if (category) {
        formData.append('category', category);
      }
      if (filename) {
        formData.append('filename', filename);
      }

      const res = await fetch('/api/admin/mall/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          updateBlock(dayNumber, blockIndex, { url: data.url });
        }
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('파일 업로드에 실패했습니다.');
    }
  };

  const handleTourImageUpload = async (dayNumber: number, file: File) => {
    setPendingUpload({ dayNumber, file, type: 'tour', uploadType: 'image' });
    setCategoryInput('');
    setFilenameInput(file.name.replace(/\.[^/.]+$/, ''));
    setShowCategoryModal(true);
  };

  const handleAccommodationImageUpload = async (dayNumber: number, file: File) => {
    setPendingUpload({ dayNumber, file, type: 'accommodation', uploadType: 'image' });
    setCategoryInput('');
    setFilenameInput(file.name.replace(/\.[^/.]+$/, ''));
    setShowCategoryModal(true);
  };

  const uploadTourImage = async (dayNumber: number, file: File, category: string, filename: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');
      formData.append('category', category);
      formData.append('filename', filename);

      const res = await fetch('/api/admin/mall/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          const day = days.find(d => d.day === dayNumber);
          if (day) {
            const updatedDays = days.map(d =>
              d.day === dayNumber
                ? { ...d, tourImages: [...(d.tourImages || []), data.url] }
                : d
            );
            onChange(updatedDays);
          }
        }
      }
    } catch (error) {
      console.error('Failed to upload tour image:', error);
      alert('파일 업로드에 실패했습니다.');
    }
  };

  const uploadAccommodationImage = async (dayNumber: number, file: File, category: string, filename: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');
      formData.append('category', category);
      formData.append('filename', filename);

      const res = await fetch('/api/admin/mall/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          const updatedDays = days.map(d =>
            d.day === dayNumber
              ? { ...d, accommodationImage: data.url }
              : d
          );
          onChange(updatedDays);
        }
      }
    } catch (error) {
      console.error('Failed to upload accommodation image:', error);
      alert('파일 업로드에 실패했습니다.');
    }
  };

  const handleCategorySubmit = async () => {
    if (!pendingUpload) return;

    if (!categoryInput.trim() || !filenameInput.trim()) {
      alert('카테고리와 파일명을 모두 입력해주세요.');
      return;
    }

    if (pendingUpload.type === 'single' && pendingUpload.dayNumber !== undefined && pendingUpload.blockIndex !== undefined && pendingUpload.file) {
      // 단일 블록 이미지 업로드
      await uploadFile(
        pendingUpload.dayNumber,
        pendingUpload.blockIndex,
        pendingUpload.file,
        pendingUpload.uploadType,
        categoryInput.trim(),
        filenameInput.trim()
      );
      setShowCategoryModal(false);
      setPendingUpload(null);
      setCategoryInput('');
      setFilenameInput('');
    } else if (pendingUpload.type === 'tour' && pendingUpload.dayNumber !== undefined && pendingUpload.file) {
      // 관광 이미지 업로드
      await uploadTourImage(
        pendingUpload.dayNumber,
        pendingUpload.file,
        categoryInput.trim(),
        filenameInput.trim()
      );
      setShowCategoryModal(false);
      setPendingUpload(null);
      setCategoryInput('');
      setFilenameInput('');
    } else if (pendingUpload.type === 'accommodation' && pendingUpload.dayNumber !== undefined && pendingUpload.file) {
      // 숙박 이미지 업로드
      await uploadAccommodationImage(
        pendingUpload.dayNumber,
        pendingUpload.file,
        categoryInput.trim(),
        filenameInput.trim()
      );
      setShowCategoryModal(false);
      setPendingUpload(null);
      setCategoryInput('');
      setFilenameInput('');
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">여행일정</h3>
        <div className="flex gap-2">
          {nights && totalDays && (
            <span className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
              {nights}박 {totalDays}일
            </span>
          )}
          {flightInfo && (
            <button
              onClick={generateFromFlightInfo}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              title="항공 정보를 기반으로 일정 자동 생성"
            >
              ✈️ 항공정보로 자동생성
            </button>
          )}
          <button
            onClick={() => setShowPPTUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
          >
            📄 PPT 불러오기
          </button>
          <button
            onClick={() => setShowGroupManager(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <FiFolder size={18} />
            그룹 관리
          </button>
          <button
            onClick={addDay}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiPlus size={18} />
            Day 추가
          </button>
        </div>
      </div>

      {/* 그룹 관리 모달 */}
      {showGroupManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">일정 그룹 관리</h3>
                <button
                  onClick={() => setShowGroupManager(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* 저장된 그룹 목록 */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">저장된 그룹 불러오기</h4>
                {savedGroups.length === 0 ? (
                  <p className="text-gray-500 text-sm">저장된 그룹이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {savedGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div>
                          <p className="font-medium text-gray-800">{group.name}</p>
                          {group.description && (
                            <p className="text-sm text-gray-500">{group.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => loadGroup(group.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          불러오기
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 새 그룹 저장 */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-700 mb-3">현재 일정을 그룹으로 저장</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="그룹 이름 입력..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveAsGroup();
                      }
                    }}
                  />
                  <button
                    onClick={saveAsGroup}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <FiSave size={18} />
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day 목록 */}
      {days.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">아직 일정이 없습니다</p>
          <button
            onClick={addDay}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            첫 Day 추가하기 →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((day, index) => {
            const isExpanded = expandedDay === day.day;

            return (
              <div
                key={day.day}
                className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors"
              >
                {/* Day 헤더 */}
                <div className="flex items-center gap-3 p-4 bg-gray-50">
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveDay(day.day, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                      title="위로"
                    >
                      <FiChevronUp size={18} />
                    </button>
                    <button
                      onClick={() => moveDay(day.day, 'down')}
                      disabled={index === days.length - 1}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                      title="아래로"
                    >
                      <FiChevronDown size={18} />
                    </button>
                  </div>

                  <div className="flex-1">
                    <p className="font-bold text-gray-900">Day {day.day}</p>
                    <p className="text-sm text-gray-600">
                      {day.departure && day.arrival
                        ? `${day.departure} → ${day.arrival}`
                        : day.departure || day.arrival || '정보 없음'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                    >
                      {isExpanded ? '접기' : '편집'}
                    </button>
                    <button
                      onClick={() => removeDay(day.day)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="삭제"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Day 편집 폼 */}
                {isExpanded && (
                  <div className="p-6 space-y-6">
                    {/* 이모티콘 선택 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        이모티콘 (왼쪽 표시)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowEmojiPicker(showEmojiPicker === day.day ? null : day.day)}
                          className="w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center text-2xl hover:border-blue-500 transition-colors bg-white"
                        >
                          {day.emoji || '선택'}
                        </button>
                        {showEmojiPicker === day.day && (
                          <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-10 gap-2">
                              {TRAVEL_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => {
                                    updateDay(day.day, { emoji });
                                    setShowEmojiPicker(null);
                                  }}
                                  className="w-10 h-10 text-2xl hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 관광지 도착지 (드롭다운) - 크루즈 가이드 지니 연동 */}
                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-center gap-2 mb-3">
                        <FiMapPin className="text-blue-600" size={18} />
                        <label className="text-sm font-semibold text-blue-800">
                          기항지 정보 (크루즈 가이드 지니 연동)
                        </label>
                      </div>
                      <p className="text-xs text-blue-600 mb-3">
                        이 정보는 크루즈 가이드 지니 &quot;내일 예정&quot;에 자동으로 표시됩니다.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 도착지 선택 (드롭다운) */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            도착지 선택 <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={destinationSearch[day.day] ?? day.arrivalLocation ?? ''}
                              onChange={(e) => {
                                setDestinationSearch({ ...destinationSearch, [day.day]: e.target.value });
                              }}
                              placeholder="도시명 검색 (예: 후쿠오카, 지룽, 다낭...)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            {destinationSearch[day.day] && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {destinationOptions
                                  .filter(opt =>
                                    opt.label.toLowerCase().includes((destinationSearch[day.day] || '').toLowerCase()) ||
                                    opt.city.toLowerCase().includes((destinationSearch[day.day] || '').toLowerCase())
                                  )
                                  .slice(0, 15)
                                  .map(opt => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        updateDay(day.day, {
                                          arrivalLocation: opt.city,
                                          arrivalCountry: opt.countryCode,
                                          arrivalCountryName: opt.country
                                        });
                                        setDestinationSearch({ ...destinationSearch, [day.day]: '' });
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                                    >
                                      <span className="font-medium">{opt.label}</span>
                                      {opt.countryCode && (
                                        <span className="ml-2 text-xs text-gray-500">({opt.countryCode})</span>
                                      )}
                                    </button>
                                  ))}
                                {destinationOptions.filter(opt =>
                                  opt.label.toLowerCase().includes((destinationSearch[day.day] || '').toLowerCase())
                                ).length === 0 && (
                                    <div className="px-3 py-2 text-sm text-gray-500">
                                      검색 결과가 없습니다
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                          {/* 선택된 도착지 표시 */}
                          {day.arrivalLocation && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-sm">
                                📍 {day.arrivalCountryName ? `${day.arrivalCountryName} - ` : ''}{day.arrivalLocation}
                                {day.arrivalCountry && <span className="text-blue-200">({day.arrivalCountry})</span>}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateDay(day.day, {
                                  arrivalLocation: '',
                                  arrivalCountry: '',
                                  arrivalCountryName: ''
                                })}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                초기화
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 입항 시간 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            입항 시간
                          </label>
                          <input
                            type="time"
                            value={day.portArrivalTime || ''}
                            onChange={(e) => updateDay(day.day, { portArrivalTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">크루즈가 기항지에 도착하는 시간</p>
                        </div>

                        {/* 출항 시간 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            출항 시간
                          </label>
                          <input
                            type="time"
                            value={day.portDepartureTime || ''}
                            onChange={(e) => updateDay(day.day, { portDepartureTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">크루즈가 기항지에서 출발하는 시간</p>
                        </div>
                      </div>
                    </div>

                    {/* 일정 시작 */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">일정 시작</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            시간
                          </label>
                          <input
                            type="time"
                            value={day.scheduleStartTime || ''}
                            onChange={(e) => updateDay(day.day, { scheduleStartTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            일정제목
                          </label>
                          <input
                            type="text"
                            value={day.scheduleStartTitle || ''}
                            onChange={(e) => updateDay(day.day, { scheduleStartTitle: e.target.value })}
                            placeholder="예: 알래스카 싯카 도착"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 관광이미지 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        관광이미지 첨부
                      </label>
                      <div className="space-y-2">
                        {day.tourImages && day.tourImages.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {day.tourImages.map((img, idx) => (
                              <div key={idx} className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img}
                                  alt={`관광 이미지 ${idx + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border border-gray-300"
                                />
                                <button
                                  onClick={() => {
                                    const newImages = [...day.tourImages!];
                                    newImages.splice(idx, 1);
                                    updateDay(day.day, { tourImages: newImages });
                                  }}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                                >
                                  <FiX size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowTourImagePicker(day.day);
                              setShowCruisePhotoModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                          >
                            <FiImage size={16} />
                            크루즈정보사진에서 선택
                          </button>
                          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm cursor-pointer">
                            <FiUpload size={16} />
                            파일 업로드
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={async (e) => {
                                const files = e.target.files;
                                if (files && files.length > 0) {
                                  // 첫 번째 파일만 사용 (다중 파일은 나중에 확장 가능)
                                  const file = files[0];
                                  handleTourImageUpload(day.day, file);
                                  // 같은 파일 다시 선택 가능하도록 리셋
                                  setTimeout(() => {
                                    if (e.target) {
                                      e.target.value = '';
                                    }
                                  }, 100);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* 관광 텍스트 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        관광 텍스트
                      </label>
                      <textarea
                        value={day.tourText || ''}
                        onChange={(e) => updateDay(day.day, { tourText: e.target.value })}
                        rows={4}
                        placeholder="관광 관련 설명을 입력하세요..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    {/* 일정 마무리 */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">일정 마무리</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            시간
                          </label>
                          <input
                            type="time"
                            value={day.scheduleEndTime || ''}
                            onChange={(e) => updateDay(day.day, { scheduleEndTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            일정마무리 텍스트
                          </label>
                          <input
                            type="text"
                            value={day.scheduleEndTitle || ''}
                            onChange={(e) => updateDay(day.day, { scheduleEndTitle: e.target.value })}
                            placeholder="예: 크루즈 출항"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 숙박 */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">숙박</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            숙박 어디에
                          </label>
                          <input
                            type="text"
                            value={day.accommodation || ''}
                            onChange={(e) => updateDay(day.day, { accommodation: e.target.value })}
                            placeholder="예: 로얄캐리비안 보이저호"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            숙박 사진 첨부
                          </label>
                          {day.accommodationImage ? (
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={day.accommodationImage}
                                alt="숙박 사진"
                                className="w-full h-64 object-cover rounded-lg border border-gray-300"
                              />
                              <button
                                onClick={() => updateDay(day.day, { accommodationImage: '' })}
                                className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                              >
                                <FiX size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setShowAccommodationImagePicker(day.day);
                                  setShowCruisePhotoModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                              >
                                <FiImage size={16} />
                                크루즈정보사진에서 선택
                              </button>
                              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm cursor-pointer">
                                <FiUpload size={16} />
                                파일 업로드
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleAccommodationImageUpload(day.day, file);
                                      // 같은 파일 다시 선택 가능하도록 리셋
                                      setTimeout(() => {
                                        if (e.target) {
                                          e.target.value = '';
                                        }
                                      }, 100);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 식사 */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">식사</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            아침
                          </label>
                          <select
                            value={day.breakfast || ''}
                            onChange={(e) => updateDay(day.day, { breakfast: e.target.value as any || undefined })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">선택 안함</option>
                            {MEAL_TYPES.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            점심
                          </label>
                          <select
                            value={day.lunch || ''}
                            onChange={(e) => updateDay(day.day, { lunch: e.target.value as any || undefined })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">선택 안함</option>
                            {MEAL_TYPES.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            저녁
                          </label>
                          <select
                            value={day.dinner || ''}
                            onChange={(e) => updateDay(day.day, { dinner: e.target.value as any || undefined })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">선택 안함</option>
                            {MEAL_TYPES.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 기존 콘텐츠 블록 (하위 호환성) */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-medium text-gray-700">
                          추가 콘텐츠 블록 (이미지/동영상/텍스트)
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => addBlock(day.day, 'image')}
                            className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                          >
                            <FiImage size={16} />
                            이미지
                          </button>
                          <button
                            onClick={() => addBlock(day.day, 'video')}
                            className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm"
                          >
                            <FiVideo size={16} />
                            동영상
                          </button>
                          <button
                            onClick={() => addBlock(day.day, 'text')}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                          >
                            <FiFileText size={16} />
                            텍스트
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {day.blocks.map((block, blockIndex) => (
                          <div
                            key={block.id}
                            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700">
                                {block.type === 'image' ? '🖼️ 이미지' :
                                  block.type === 'video' ? '🎥 동영상' : '📝 텍스트'}
                              </span>
                              <button
                                onClick={() => removeBlock(day.day, blockIndex)}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                              >
                                <FiX size={16} />
                              </button>
                            </div>

                            {block.type === 'image' && (
                              <div className="space-y-2">
                                {block.url ? (
                                  <div className="relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={block.url}
                                      alt={block.alt || '이미지'}
                                      className="w-full h-48 object-cover rounded-lg border border-gray-300"
                                    />
                                    <button
                                      onClick={() => updateBlock(day.day, blockIndex, { url: '' })}
                                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                                    >
                                      <FiX size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500">
                                      <FiImage size={20} />
                                      <span className="text-sm">이미지 업로드</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleFileUpload(day.day, blockIndex, file, 'image');
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                    <button
                                      onClick={() => {
                                        setSelectingForDay(day.day);
                                        setSelectingForBlockIndex(blockIndex);
                                        setShowCruisePhotoModal(true);
                                      }}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                    >
                                      <FiFolder size={16} />
                                      <span>크루즈정보사진에서 선택</span>
                                    </button>
                                  </div>
                                )}
                                <input
                                  type="text"
                                  value={block.alt || ''}
                                  onChange={(e) => updateBlock(day.day, blockIndex, { alt: e.target.value })}
                                  placeholder="이미지 설명"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                            )}

                            {block.type === 'video' && (
                              <div className="space-y-2">
                                {block.url ? (
                                  <div className="relative">
                                    <video
                                      src={block.url}
                                      controls
                                      className="w-full h-48 rounded-lg border border-gray-300"
                                    />
                                    <button
                                      onClick={() => updateBlock(day.day, blockIndex, { url: '' })}
                                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                                    >
                                      <FiX size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500">
                                    <FiVideo size={20} />
                                    <span className="text-sm">동영상 업로드</span>
                                    <input
                                      type="file"
                                      accept="video/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(day.day, blockIndex, file, 'video');
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                                <input
                                  type="url"
                                  value={block.url || ''}
                                  onChange={(e) => updateBlock(day.day, blockIndex, { url: e.target.value })}
                                  placeholder="또는 YouTube URL 입력"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                                <input
                                  type="text"
                                  value={block.title || ''}
                                  onChange={(e) => updateBlock(day.day, blockIndex, { title: e.target.value })}
                                  placeholder="동영상 제목"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                            )}

                            {block.type === 'text' && (
                              <textarea
                                value={block.content}
                                onChange={(e) => updateBlock(day.day, blockIndex, { content: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                                placeholder="텍스트 내용을 입력하세요..."
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PPT 업로드 모달 */}
      {showPPTUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">PPT 문서 불러오기</h3>
                <button
                  onClick={() => setShowPPTUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                PPT 문서를 업로드하면 시간, 장소, 관광지 정보를 자동으로 추출하여 일정에 적용합니다.
              </p>
              <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500">
                <FiFileText size={32} className="text-gray-400" />
                <span className="text-sm text-gray-600">PPT 파일 선택</span>
                <input
                  type="file"
                  accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handlePPTUpload(file);
                    }
                  }}
                  className="hidden"
                  disabled={uploadingPPT}
                />
              </label>
              {uploadingPPT && (
                <div className="mt-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">PPT 파싱 중...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 크루즈정보사진 선택 모달 */}
      {showCruisePhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">크루즈정보사진에서 선택</h3>
              <button
                onClick={() => {
                  setShowCruisePhotoModal(false);
                  setSelectingForDay(null);
                  setSelectingForBlockIndex(null);
                  setSelectedFolder('');
                  setCruiseImages([]);
                  setSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* 폴더 목록 */}
              <div className="w-1/3 border-r overflow-y-auto p-4">
                <div className="mb-4">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="폴더 검색..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  {filteredFolders.map((folder) => (
                    <button
                      key={folder}
                      onClick={() => {
                        setSelectedFolder(folder);
                        loadCruiseImages(folder);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedFolder === folder
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                      {folder}
                    </button>
                  ))}
                </div>
              </div>

              {/* 이미지 그리드 */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedFolder ? (
                  cruiseImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {cruiseImages.map((imageUrl) => (
                        <div
                          key={imageUrl}
                          onClick={() => handleSelectCruiseImage(imageUrl)}
                          className="relative aspect-square cursor-pointer group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageUrl}
                            alt={imageUrl}
                            className="w-full h-full object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-500 transition-colors"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 font-semibold">선택</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>이 폴더에 이미지가 없습니다.</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>왼쪽에서 폴더를 선택하세요.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 입력 모달 */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              이미지 저장 위치 설정
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              [크루즈정보사진] 폴더에 저장할 카테고리와 파일명을 입력하세요.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리 (폴더명) *
                </label>
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  placeholder="예: 코스타세레나, MSC크루즈 등"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  파일명 *
                </label>
                <input
                  type="text"
                  value={filenameInput}
                  onChange={(e) => setFilenameInput(e.target.value)}
                  placeholder="예: 선박외관, 객실사진 등"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setPendingUpload(null);
                  setCategoryInput('');
                  setFilenameInput('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCategorySubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




