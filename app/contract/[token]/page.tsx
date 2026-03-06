'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface ContractData {
  id: number;
  token: string;
  contractData: {
    productName: string;
    mainTravelerName: string;
    mainTravelerPhone: string;
    affiliatePhone?: string;
    totalPeople: number;
    departureDate: string;
    returnDate: string;
  };
  status: string;
  isSigned: boolean;
  signedAt?: string;
  expiresAt?: string;
}

interface Companion {
  _id?: string;
  name: string;
  phone: string;
}

export default function ContractSignPage() {
  const params = useParams();
  const token = params.token as string;

  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<'review' | 'sign' | 'done'>('review');
  const [customerAddress, setCustomerAddress] = useState('');
  const [companions, setCompanions] = useState<Companion[]>([{ _id: crypto.randomUUID(), name: '', phone: '' }]);

  // 서명 캔버스 refs (여행자 서명, 계약자 서명)
  const sigCanvas = useRef<HTMLCanvasElement>(null);
  const contractorCanvas = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeCanvas, setActiveCanvas] = useState<'sig' | 'contractor'>('sig');
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const [contractorPhone, setContractorPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  // WO-CR-19: PDF 다운로드 상태
  const [downloading, setDownloading] = useState(false);

  // WO-LO-02: 로딩 타임아웃 5초
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      if (loading && !contract) {
        setError('계약서 로드에 시간이 걸리고 있습니다. 페이지를 새로고침해 주세요.');
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [loading, contract]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/contracts/${token}`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok || !data.ok) {
          throw new Error(data.error || '계약서를 불러올 수 없습니다.');
        }
        return data;
      })
      .then(data => {
        setContract(data.contract);
        if (data.contract.contractData?.mainTravelerPhone) {
          setContractorPhone(data.contract.contractData.mainTravelerPhone);
        }
        if (data.contract.isSigned) setStep('done');
      })
      .catch(err => setError(err instanceof Error ? err.message : '계약서를 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  }, [token]);

  // WO-CR-09: Canvas Retina DPI 수정
  const initCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    // CSS 크기에 맞게 실제 픽셀 크기 설정
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // 물리 픽셀 좌표로 흰색 채우기 (scale 적용 전 → 모든 픽셀 보장)
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  // P1-01: 3 RAF 체인으로 레이아웃 계산 완료 후 초기화
  useEffect(() => {
    if (step !== 'sign') return;
    let frameId: number;
    frameId = requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          initCanvas(sigCanvas.current);
          initCanvas(contractorCanvas.current);
        })
      )
    );
    return () => cancelAnimationFrame(frameId);
  }, [step, initCanvas]);

  // WO-CR-09: DPR 적용 후 getPos는 CSS 좌표 그대로 사용 (ctx.scale이 DPR 처리)
  const getPos = (e: React.MouseEvent | React.TouchEvent | TouchEvent | MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const te = e as TouchEvent | React.TouchEvent<HTMLCanvasElement>;
      const touch = (te as TouchEvent).touches?.[0] ?? (te as React.TouchEvent<HTMLCanvasElement>).touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    const me = e as MouseEvent | React.MouseEvent<HTMLCanvasElement>;
    return {
      x: (me as MouseEvent).clientX !== undefined
        ? (me as MouseEvent).clientX - rect.left
        : (me as React.MouseEvent<HTMLCanvasElement>).clientX - rect.left,
      y: (me as MouseEvent).clientY !== undefined
        ? (me as MouseEvent).clientY - rect.top
        : (me as React.MouseEvent<HTMLCanvasElement>).clientY - rect.top,
    };
  };

  const getActiveCanvasRef = useCallback(
    () => activeCanvas === 'sig' ? sigCanvas : contractorCanvas,
    [activeCanvas]
  );

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent | TouchEvent) => {
    if ('preventDefault' in e) e.preventDefault();
    const canvas = (activeCanvas === 'sig' ? sigCanvas : contractorCanvas).current;
    if (!canvas) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  }, [activeCanvas]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent | TouchEvent) => {
    if ('preventDefault' in e) e.preventDefault();
    if (!isDrawing) return;
    const canvas = (activeCanvas === 'sig' ? sigCanvas : contractorCanvas).current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, [isDrawing, activeCanvas]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  // WO-CR-10: 여행자 서명 캔버스 터치 이벤트 passive:false
  useEffect(() => {
    const canvas = sigCanvas.current;
    if (!canvas || step !== 'sign') return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      setActiveCanvas('sig');
      startDraw(e);
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      draw(e);
    };
    const handleTouchEnd = () => { endDraw(); };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [step, startDraw, draw, endDraw]);

  // WO-CR-10: 계약자 서명 캔버스 터치 이벤트 passive:false
  useEffect(() => {
    const canvas = contractorCanvas.current;
    if (!canvas || step !== 'sign') return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      setActiveCanvas('contractor');
      startDraw(e);
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      draw(e);
    };
    const handleTouchEnd = () => { endDraw(); };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [step, startDraw, draw, endDraw]);

  // P2-03: orientationchange / resize 시 canvas 재초기화
  useEffect(() => {
    if (step !== 'sign') return;
    const handleResize = () => {
      requestAnimationFrame(() => {
        initCanvas(sigCanvas.current);
        initCanvas(contractorCanvas.current);
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [step, initCanvas]);

  // P1-02: ctx.setTransform 리셋 후 initCanvas 호출
  const clearCanvas = useCallback((which: 'sig' | 'contractor') => {
    const canvas = (which === 'sig' ? sigCanvas : contractorCanvas).current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // 트랜스폼 완전 리셋
    initCanvas(canvas);
  }, [initCanvas]);

  // P1-03: Alpha Channel 체크 추가 (투명 픽셀 / 안티앨리어싱 오판 방지)
  const isCanvasEmpty = (canvas: HTMLCanvasElement | null): boolean => {
    if (!canvas) return true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a > 200 && (r < 240 || g < 240 || b < 240)) return false;
    }
    return true;
  };

  const addCompanion = () => {
    setCompanions(prev => [...prev, { _id: crypto.randomUUID(), name: '', phone: '' }]);
  };

  const removeCompanion = (i: number) => {
    setCompanions(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateCompanion = (i: number, field: 'name' | 'phone', value: string) => {
    setCompanions(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const handleSubmit = async () => {
    if (!customerAddress.trim() || customerAddress.trim().length < 5) {
      setSubmitError('주소를 정확히 입력해주세요.');
      return;
    }
    if (isCanvasEmpty(sigCanvas.current)) {
      setSubmitError('여행자 서명을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // WO-CR-11: PNG → JPEG 0.8 (서버에서 JPEG 허용 확인됨)
      const customerSignature = sigCanvas.current!.toDataURL('image/jpeg', 0.8);
      const contractorSignature = isCanvasEmpty(contractorCanvas.current)
        ? customerSignature
        : contractorCanvas.current!.toDataURL('image/jpeg', 0.8);

      // WO-ME-07: 빈 동행자 제외 + _id 필드 제거 (서버 isValidCompanion 키 개수 2 검증 통과)
      const validCompanions = companions
        .filter(c => c.name.trim() && c.phone.trim())
        .map(({ name, phone }) => ({ name, phone }));

      const res = await fetch(`/api/contracts/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerAddress: customerAddress.trim(),
          contractorPhone: contractorPhone.trim() || undefined,
          customerSignature,
          contractorSignature,
          companions: validCompanions,
          marketingConsent: agreeMarketing,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setSubmitError(data.error || '서명 처리에 실패했습니다.');
        return;
      }

      setStep('done');
    } catch {
      setSubmitError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // P1-05: 서명 제출 중 페이지 이탈 방지
  useEffect(() => {
    if (!submitting) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '서명을 저장하는 중입니다. 잠시 기다려주세요.';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [submitting]);

  // WO-CR-19: PDF 다운로드 — Fetch API로 교체 (진행 상태 표시)
  const handlePdfDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/contracts/${token}/pdf`);
      if (!res.ok) throw new Error('다운로드에 실패했습니다.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '여행계약서.pdf';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
      document.body.removeChild(a);
    } catch {
      setSubmitError('PDF 다운로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-[#1a3a6b] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">계약서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow max-w-sm">
          <div className="text-4xl mb-4">!</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">계약서 오류</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#1a3a6b] mb-3">서명 완료</h2>
          <p className="text-gray-600 text-sm mb-2">
            <strong>{contract?.contractData?.productName}</strong> 여행계약서 서명이 완료되었습니다.
          </p>
          <p className="text-gray-400 text-xs">
            담당자가 계약서를 검토 후 연락드리겠습니다.<br />
            감사합니다.
          </p>
          {submitError && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {submitError}
            </div>
          )}
          <div className="mt-6 space-y-3">
            {/* WO-CR-19: fetch 기반 다운로드 버튼 */}
            <button
              onClick={handlePdfDownload}
              disabled={downloading}
              className="block w-full text-center bg-[#1a3a6b] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#152d54] transition-colors disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {downloading ? '다운로드 중...' : '서명된 계약서 PDF 다운로드'}
            </button>
            <p className="text-xs text-center text-gray-400">
              계약서는 이메일로도 발송됩니다. 저장해두시면 여행 시 활용할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const cd = contract?.contractData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1a3a6b] text-white py-4 px-4 sticky top-0 z-10 shadow">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-black tracking-tight">
              크루즈<span className="text-[#c9a84c]">닷</span>
            </span>
            <span className="text-sm ml-2 opacity-70">여행계약서</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('review')}
              className={`text-xs px-3 py-1 rounded-full transition ${
                step === 'review'
                  ? 'bg-white text-[#1a3a6b] font-bold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              계약서 검토
            </button>
            {/* WO-CR-12: isSigned 상태면 서명하기 버튼 숨김 */}
            {!contract?.isSigned && (
              <button
                type="button"
                onClick={() => setStep('sign')}
                className={`text-xs px-3 py-1 rounded-full transition ${
                  step === 'sign'
                    ? 'bg-white text-[#1a3a6b] font-bold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                서명하기
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* 상품 요약 */}
        <div className="bg-white rounded-2xl shadow p-4 mb-4 border-l-4 border-[#c9a84c]">
          <p className="text-xs text-gray-400 mb-1">계약 상품</p>
          <h2 className="text-base font-bold text-[#1a3a6b]">{cd?.productName}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {cd?.departureDate} ~ {cd?.returnDate} &middot; {cd?.totalPeople}명
          </p>
          <p className="text-sm text-gray-500">여행자: {cd?.mainTravelerName}</p>
        </div>

        {/* ===== STEP 1: 계약서 검토 ===== */}
        {step === 'review' && (
          <div>
            <div className="bg-white rounded-2xl shadow overflow-hidden mb-4">
              <div className="bg-[#1a3a6b] px-4 py-3 text-white text-sm font-semibold">
                계약서 전문 — 아래 내용을 꼼꼼히 확인해주세요
              </div>
              <div className="p-4">
                <ContractPreview contractData={cd as ContractPreviewData} />
              </div>
            </div>
            {/* WO-CR-12: review step에서만 서명하기 버튼 표시 (isSigned 아닐 때) */}
            {!contract?.isSigned && (
              <button
                type="button"
                onClick={() => setStep('sign')}
                className="w-full bg-[#1a3a6b] text-white py-4 rounded-2xl font-bold text-base shadow hover:bg-[#16325a] transition"
              >
                계약서 내용 확인 완료 - 서명하기
              </button>
            )}
          </div>
        )}

        {/* ===== STEP 2: 서명 ===== */}
        {step === 'sign' && (
          <div className="space-y-4">

            {/* 주소 입력 */}
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="font-bold text-[#1a3a6b] mb-3">여행자 주소</h3>
              <input
                type="text"
                value={customerAddress}
                onChange={e => setCustomerAddress(e.target.value)}
                placeholder="도로명 주소를 입력해주세요 (예: 경기도 화성시 ...)"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a3a6b] focus:ring-1 focus:ring-[#1a3a6b]"
              />
            </div>

            {/* 계약자 연락처 */}
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="font-bold text-[#1a3a6b] mb-3">
                계약자 연락처 <span className="text-red-500">*</span>
              </h3>
              <input
                type="tel"
                inputMode="numeric"
                value={contractorPhone}
                onChange={e => setContractorPhone(e.target.value)}
                placeholder="010-0000-0000"
                maxLength={20}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a3a6b] focus:ring-1 focus:ring-[#1a3a6b]"
              />
              <p className="text-xs text-gray-400 mt-2">* 계약서에 기재될 연락처입니다. 확인 후 수정해주세요.</p>
            </div>

            {/* 동행자 명단 */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[#1a3a6b]">동행자 명단</h3>
                <button
                  type="button"
                  onClick={addCompanion}
                  className="text-xs bg-[#1a3a6b] text-white px-3 py-1 rounded-full"
                >
                  + 추가
                </button>
              </div>
              <div className="space-y-2">
                {companions.map((c, i) => (
                  <div key={c._id || i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={c.name}
                      onChange={e => updateCompanion(i, 'name', e.target.value)}
                      placeholder="성명"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a6b]"
                    />
                    <input
                      type="tel"
                      value={c.phone}
                      onChange={e => updateCompanion(i, 'phone', e.target.value)}
                      placeholder="연락처"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a6b]"
                    />
                    {companions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCompanion(i)}
                        className="text-red-400 text-lg leading-none px-1"
                        aria-label="동행자 삭제"
                      >
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {/* WO-ME-07: 빈 필드 안내 */}
              <p className="text-xs text-gray-400 mt-2">
                * 본인 외 동행자가 없으면 비워두셔도 됩니다. 이름과 연락처가 모두 입력된 행만 제출됩니다.
              </p>
            </div>

            {/* 여행자 서명 */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#1a3a6b]">
                  여행자 서명 <span className="text-red-500">*</span>
                </h3>
                <button
                  type="button"
                  onClick={() => { setActiveCanvas('sig'); clearCanvas('sig'); }}
                  className="text-xs text-gray-400 underline"
                >
                  지우기
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-2">아래 박스에 서명을 그려주세요</p>
              <div
                className="border-2 border-dashed border-[#1a3a6b] rounded-xl overflow-hidden cursor-crosshair"
                style={{ touchAction: 'none' }}
                onMouseEnter={() => setActiveCanvas('sig')}
              >
                {/* WO-CR-09/WO-CR-10: width/height 고정값 제거, 터치 이벤트는 useEffect에서 처리 */}
                <canvas
                  ref={sigCanvas}
                  style={{ width: '100%', height: '140px', display: 'block', touchAction: 'none' }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  aria-label="여행자 서명 입력 영역"
                  role="img"
                />
              </div>
            </div>

            {/* 계약자 서명 (선택) */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#1a3a6b]">
                  계약자 서명{' '}
                  {/* WO-ME-09: 문구 명확화 */}
                  <span className="text-gray-400 text-xs font-normal">
                    (선택 · 비워두면 여행자 서명을 계약자 서명으로 사용합니다)
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => { setActiveCanvas('contractor'); clearCanvas('contractor'); }}
                  className="text-xs text-gray-400 underline"
                >
                  지우기
                </button>
              </div>
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden cursor-crosshair"
                style={{ touchAction: 'none' }}
                onMouseEnter={() => setActiveCanvas('contractor')}
              >
                {/* WO-CR-09/WO-CR-10: width/height 고정값 제거, 터치 이벤트는 useEffect에서 처리 */}
                <canvas
                  ref={contractorCanvas}
                  style={{ width: '100%', height: '140px', display: 'block', touchAction: 'none' }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  aria-label="계약자 서명 입력 영역"
                  role="img"
                />
              </div>
            </div>

            {/* 개인정보 동의 */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-xs text-[#1a3a6b] font-semibold mb-2">개인정보 수집·이용 동의 안내</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                위 서명은 계약서 전문 내용(여행약관, 취소료 규정, 개인정보처리방침 포함)에 동의함을 의미합니다.
                서명 후에는 계약서가 확정되며, 담당자를 통해 서명된 계약서를 확인하실 수 있습니다.
              </p>
            </div>

            {/* 서명 = 전체 약관 동의 안내 (관리자가 계약 생성 시 약관 적용 완료) */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                아래 서명은 계약서 전문(국외여행표준약관·크루즈 특별약관·개인정보 수집이용·제3자 제공 동의 포함)에
                동의하는 것으로 간주됩니다.
              </p>
              {/* 마케팅 동의 (선택) */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeMarketing}
                  onChange={e => setAgreeMarketing(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#1a3a6b]"
                />
                <span className="text-sm text-gray-700">
                  <strong>[선택]</strong> 마케팅 정보 수신에 동의합니다. (동의 거부해도 계약에 불이익 없음)
                </span>
              </label>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {submitError}
              </div>
            )}

            {/* WO-LO-05: disabled 버튼 시각 개선 */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#1a3a6b] text-white py-4 rounded-2xl font-bold text-base shadow hover:bg-[#16325a] transition disabled:opacity-60 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? '처리 중...' : '계약서 서명 완료하기'}
            </button>

            <p className="text-center text-xs text-gray-400">
              궁금한 점은 담당자 ({cd?.affiliatePhone || '010-3289-3800'})에게 문의해주세요
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

// 계약서 미리보기에 필요한 타입
interface CancellationPolicyRow {
  period: string;
  charge: string;
}

interface ContractPreviewData {
  productName?: string;
  mainTravelerName?: string;
  mainTravelerPhone?: string;
  totalPeople?: number;
  departureDate?: string;
  returnDate?: string;
  nights?: number;
  days?: number;
  hasInsurance?: boolean;
  pricePerPerson?: number;
  totalAmount?: number;
  departure?: string;
  arrival?: string;
  airlineName?: string;
  shipName?: string;
  affiliateName?: string;
  isPackage?: boolean;
  cancellationPolicy?: CancellationPolicyRow[];
  mealCounts?: {
    breakfast: number;
    lunch: number;
    dinner: number;
  } | null;
  hasHotel?: boolean;
  excludedItems?: string[];
  otherNotes?: string | null;
  guaranteeType?: 'insurance' | 'mutual-aid' | 'deposit';
  localTransportType?: 'bus' | 'car' | 'other' | 'none';
  marketingConsent?: boolean;
  accommodationType?: string | null;
  roomOccupancy?: number | null;
  insurancePeriod?: string | null;
  insuredPerson?: string | null;
  inflightMealIncluded?: boolean;
}

// 계약서 미리보기 컴포넌트
function ContractPreview({ contractData }: { contractData: ContractPreviewData | null | undefined }) {
  if (!contractData) return null;
  const d = contractData;
  const isPackage = d.isPackage;

  return (
    <div className="text-sm space-y-3" style={{ fontFamily: 'Apple SD Gothic Neo, Noto Sans KR, sans-serif' }}>
      <div className="text-center border-b-2 border-[#1a3a6b] pb-2 mb-3">
        <div className="text-lg font-black text-[#1a3a6b]">
          크루즈<span className="text-[#c9a84c]">닷</span> 여행계약서
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {isPackage ? '기획(선택됨) / 희망' : '기획 / 희망(선택됨)'} 여행계약
        </div>
      </div>

      <table className="w-full text-xs border-collapse">
        <tbody>
          <InfoRow label="상품명" value={d.productName ?? ''} />
          <InfoRow
            label="여행기간"
            value={`${d.departureDate ?? ''} ~ ${d.returnDate ?? ''} (${d.nights ?? 0}박 ${d.days ?? 0}일)`}
          />
          <InfoRow label="여행보증" value="여행보증보험 가입" />
          <InfoRow label="여행자보험" value={d.hasInsurance ? '유' : '무'} />
          <InfoRow label="여행인원" value={`${d.totalPeople ?? 0}명`} />
          <InfoRow
            label="여행요금"
            value={`1인 ${(d.pricePerPerson ?? 0).toLocaleString()}원 / 총액 ${(d.totalAmount ?? 0).toLocaleString()}원`}
          />
          <InfoRow label="계좌정보" value="국민은행 531301-04-167150 (예금주: 배연성(크루즈닷))" />
          <InfoRow label="출발/도착" value={`${d.departure ?? ''} -> ${d.arrival ?? ''}`} />
          <InfoRow
            label="교통수단"
            value={[d.airlineName && `항공기(${d.airlineName})`, d.shipName && `선박(${d.shipName})`]
              .filter(Boolean)
              .join(', ')}
          />
          <InfoRow label="여행인솔자" value={isPackage ? '유' : '무'} />
          <InfoRow label="현지안내원" value={isPackage ? '유' : '무'} />
          <InfoRow label="현지교통" value={isPackage ? '버스' : '없음'} />
          <InfoRow label="담당자" value={d.affiliateName ?? ''} />
        </tbody>
      </table>

      <div className="mt-4">
        <div className="font-bold text-[#1a3a6b] text-xs mb-1">취소료 규정</div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#1a3a6b] text-white">
              <th className="border border-[#1a3a6b] px-2 py-1 text-left">해지 통보 시기</th>
              <th className="border border-[#1a3a6b] px-2 py-1 text-center">취소료</th>
            </tr>
          </thead>
          <tbody>
            {(d.cancellationPolicy ?? []).map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="border border-gray-300 px-2 py-1">{r.period}</td>
                <td className="border border-gray-300 px-2 py-1 text-center font-semibold">{r.charge}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        본 계약서의 전체 내용(표준약관 제1~21조, 크루즈 특별약관, 개인정보처리 동의)에 동의하고 서명합니다.
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="border border-gray-300 bg-blue-50 px-2 py-1 font-semibold text-[#1a3a6b] whitespace-nowrap w-20">
        {label}
      </td>
      <td className="border border-gray-300 px-2 py-1">{value}</td>
    </tr>
  );
}
