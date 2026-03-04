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
  const [companions, setCompanions] = useState<Companion[]>([{ name: '', phone: '' }]);

  // 서명 캔버스 refs (여행자 서명, 계약자 서명)
  const sigCanvas = useRef<HTMLCanvasElement>(null);
  const contractorCanvas = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeCanvas, setActiveCanvas] = useState<'sig' | 'contractor'>('sig');
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/contracts/${token}`)
      .then(r => r.json())
      .then(data => {
        if (!data.ok) {
          setError(data.error || '계약서를 불러올 수 없습니다.');
        } else {
          setContract(data.contract);
          if (data.contract.isSigned) {
            setStep('done');
          }
        }
      })
      .catch(() => setError('네트워크 오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [token]);

  // 서명 캔버스 초기화
  const initCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a3a6b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    if (step === 'sign') {
      setTimeout(() => {
        initCanvas(sigCanvas.current);
        initCanvas(contractorCanvas.current);
      }, 100);
    }
  }, [step, initCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const getActiveCanvasRef = () => activeCanvas === 'sig' ? sigCanvas : contractorCanvas;

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = getActiveCanvasRef().current;
    if (!canvas) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = getActiveCanvasRef().current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = (which: 'sig' | 'contractor') => {
    const canvas = (which === 'sig' ? sigCanvas : contractorCanvas).current;
    initCanvas(canvas);
  };

  const isCanvasEmpty = (canvas: HTMLCanvasElement | null): boolean => {
    if (!canvas) return true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    // 모든 픽셀이 흰색(255,255,255,255)인지 확인
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) return false;
    }
    return true;
  };

  const addCompanion = () => {
    setCompanions(prev => [...prev, { name: '', phone: '' }]);
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
      const customerSignature = sigCanvas.current!.toDataURL('image/png');
      const contractorSignature = isCanvasEmpty(contractorCanvas.current)
        ? customerSignature
        : contractorCanvas.current!.toDataURL('image/png');

      const validCompanions = companions.filter(c => c.name.trim() && c.phone.trim());

      const res = await fetch(`/api/contracts/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerAddress: customerAddress.trim(),
          customerSignature,
          contractorSignature,
          companions: validCompanions,
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
            <strong>{contract?.contractData.productName}</strong> 여행계약서 서명이 완료되었습니다.
          </p>
          <p className="text-gray-400 text-xs">
            담당자가 계약서를 검토 후 연락드리겠습니다.<br />
            감사합니다.
          </p>
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
              onClick={() => setStep('review')}
              className={`text-xs px-3 py-1 rounded-full transition ${
                step === 'review'
                  ? 'bg-white text-[#1a3a6b] font-bold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              계약서 검토
            </button>
            <button
              onClick={() => setStep('sign')}
              className={`text-xs px-3 py-1 rounded-full transition ${
                step === 'sign'
                  ? 'bg-white text-[#1a3a6b] font-bold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              서명하기
            </button>
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
            <button
              onClick={() => setStep('sign')}
              className="w-full bg-[#1a3a6b] text-white py-4 rounded-2xl font-bold text-base shadow hover:bg-[#16325a] transition"
            >
              계약서 내용 확인 완료 - 서명하기
            </button>
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

            {/* 동행자 명단 */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[#1a3a6b]">동행자 명단</h3>
                <button
                  onClick={addCompanion}
                  className="text-xs bg-[#1a3a6b] text-white px-3 py-1 rounded-full"
                >
                  + 추가
                </button>
              </div>
              <div className="space-y-2">
                {companions.map((c, i) => (
                  <div key={i} className="flex gap-2 items-center">
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
              <p className="text-xs text-gray-400 mt-2">* 본인 외 동행자가 없으면 비워두셔도 됩니다.</p>
            </div>

            {/* 여행자 서명 */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#1a3a6b]">
                  여행자 서명 <span className="text-red-500">*</span>
                </h3>
                <button
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
                <canvas
                  ref={sigCanvas}
                  width={600}
                  height={160}
                  style={{ width: '100%', height: '140px', display: 'block' }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>
            </div>

            {/* 계약자 서명 (선택) */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#1a3a6b]">
                  계약자 서명{' '}
                  <span className="text-gray-400 text-xs font-normal">
                    (선택 · 비워두면 위 서명 사용)
                  </span>
                </h3>
                <button
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
                <canvas
                  ref={contractorCanvas}
                  width={600}
                  height={160}
                  style={{ width: '100%', height: '140px', display: 'block' }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
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

            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#1a3a6b] text-white py-4 rounded-2xl font-bold text-base shadow hover:bg-[#16325a] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '처리 중...' : '계약서 서명 완료하기'}
            </button>

            <p className="text-center text-xs text-gray-400">
              궁금한 점은 담당자 ({cd?.mainTravelerPhone || '크루즈닷'})에게 문의해주세요
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
