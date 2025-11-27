// app/affiliate/contract/sign/page.tsx
// 계약서 서명 페이지 (쿼리 파라미터 방식: ?token=...)

'use client';

import { logger } from '@/lib/logger';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FiCheckCircle, FiXCircle, FiAlertCircle, FiClock, FiX } from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';
import SignaturePad from 'signature_pad';
import { CONTRACT_SECTIONS, REQUIRED_CONSENTS, REFUND_CONSENTS } from '@/lib/affiliate/contract-sections';
import { EDUCATION_CONTRACT_SECTIONS } from '@/lib/affiliate/education-contract-sections';

type Contract = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  metadata: any;
  signatureLink: string | null;
  signatureLinkExpiresAt: string | null;
  contractType?: string;
};

function ContractSignPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token');

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedByName, setSignedByName] = useState('');
  const [signaturePad, setSignaturePad] = useState<SignaturePad | null>(null);
  const [error, setError] = useState<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showEducationContractModal, setShowEducationContractModal] = useState(false);
  
  // 필수 동의 체크박스 상태
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentNonCompete, setConsentNonCompete] = useState(false);
  const [consentDbUse, setConsentDbUse] = useState(false);
  const [consentPenalty, setConsentPenalty] = useState(false);
  const [consentRefund, setConsentRefund] = useState(false);

  useEffect(() => {
    if (token) {
      loadContract();
    } else {
      setError('토큰이 없습니다. 유효한 링크로 접속해주세요.');
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!signatureCanvasRef.current) return;

    const canvas = signatureCanvasRef.current;
    
    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const context = canvas.getContext('2d');
      if (context) {
        context.scale(ratio, ratio);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }
    };

    resizeCanvas();

    const pad = new SignaturePad(canvas, {
      backgroundColor: '#ffffff',
      penColor: '#2563eb',
      minWidth: 1.5,
      maxWidth: 3,
    });

    setSignaturePad(pad);

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      pad.off();
    };
  }, [contract]); // contract가 로드된 후에 캔버스 초기화

  const loadContract = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const res = await fetch(`/api/affiliate/contract/sign?token=${encodeURIComponent(token || '')}`);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || '계약서를 불러오지 못했습니다.');
      }

      const loadedContract = json.contract;
      
      // 만료 시간 체크
      if (loadedContract.signatureLinkExpiresAt) {
        const expiresAt = new Date(loadedContract.signatureLinkExpiresAt);
        const now = new Date();
        if (now > expiresAt) {
          throw new Error('싸인 링크가 만료되었습니다. 관리자에게 새 링크를 요청해주세요.');
        }
      }

      setContract(loadedContract);
      setSignedByName(loadedContract.name || '');
    } catch (error: any) {
      logger.error('[ContractSign] Load error', error);
      setError(error.message || '계약서를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSignature = () => {
    if (signaturePad) {
      signaturePad.clear();
    }
  };

  const dataUrlToFile = (dataUrl: string, defaultName: string): File => {
    const parts = dataUrl.split(',');
    if (parts.length < 2) {
      throw new Error('잘못된 데이터 URL 형식입니다.');
    }
    const match = parts[0].match(/data:(.*?);base64/);
    const mimeType = match?.[1] || 'image/png';
    const binaryString = atob(parts[1]);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new File([bytes], defaultName, { type: mimeType });
  };

  const handleSubmit = async () => {
    if (!signedByName.trim()) {
      showError('서명자 이름을 입력해주세요.');
      return;
    }

    if (!signaturePad || signaturePad.isEmpty()) {
      showError('서명을 해주세요.');
      return;
    }

    // 필수 동의 체크
    if (!consentPrivacy) {
      showError('개인정보 및 고객 DB 사용 제한에 동의해주세요.');
      return;
    }
    if (!consentNonCompete) {
      showError('경업 및 리크루팅 금지 조항에 동의해주세요.');
      return;
    }
    if (!consentDbUse) {
      showError('고객 DB 보안 및 반환 의무 조항에 동의해주세요.');
      return;
    }
    if (!consentPenalty) {
      showError('손해배상 및 위약벌 조항에 동의해주세요.');
      return;
    }
    if (contract?.contractType && REFUND_CONSENTS[contract.contractType] && !consentRefund) {
      showError('환불 조항에 동의해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadingSignature(true);
      
      // 싸인 이미지를 File로 변환
      const signatureImage = signaturePad.toDataURL('image/png');
      const fileName = `contract-signature-${Date.now()}.png`;
      const signatureFile = dataUrlToFile(signatureImage, fileName);

      // 싸인 이미지 업로드
      const formData = new FormData();
      formData.append('file', signatureFile);
      formData.append('fileName', fileName);

      const uploadRes = await fetch('/api/affiliate/contracts/upload?type=signature', {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson?.ok) {
        throw new Error(uploadJson?.message || '싸인 업로드에 실패했습니다.');
      }

      if (!uploadJson.url || !uploadJson.fileId) {
        throw new Error('업로드가 완료되었지만 파일 정보를 받지 못했습니다.');
      }

      // 계약서에 싸인 저장 (필수 동의 항목도 함께 전송)
      const res = await fetch(`/api/affiliate/contract/sign?token=${encodeURIComponent(token || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureUrl: uploadJson.url,
          signatureFileId: uploadJson.fileId,
          signatureOriginalName: uploadJson.originalName || fileName,
          signedByName: signedByName.trim(),
          // 필수 동의 항목 추가
          consentPrivacy,
          consentNonCompete,
          consentDbUse,
          consentPenalty,
          consentRefund: contract?.contractType && REFUND_CONSENTS[contract.contractType] ? consentRefund : null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || '서명 처리에 실패했습니다.');
      }

      showSuccess('서명이 완료되었습니다.');
      setTimeout(() => {
        router.push('/affiliate/contract/success');
      }, 2000);
    } catch (error: any) {
      logger.error('[ContractSign] Submit error', error);
      showError(error.message || '서명 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
      setUploadingSignature(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">계약서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <FiXCircle className="mx-auto text-red-500 text-5xl mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">오류 발생</h1>
          <p className="text-gray-600 mb-4">{error || '계약서를 찾을 수 없습니다.'}</p>
          {contract?.signatureLinkExpiresAt && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                링크 만료일: {new Date(contract.signatureLinkExpiresAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 이미 서명된 경우 체크 (contractSignedAt이 있는 경우)
  if (contract.status === 'completed' || contract.metadata?.signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <FiCheckCircle className="mx-auto text-green-500 text-5xl mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">서명 완료</h1>
          <p className="text-gray-600">이 계약서는 이미 서명이 완료되었습니다.</p>
        </div>
      </div>
    );
  }

  // 만료 시간 표시
  const expiresAt = contract.signatureLinkExpiresAt ? new Date(contract.signatureLinkExpiresAt) : null;
  const isExpiringSoon = expiresAt && (expiresAt.getTime() - Date.now()) < 24 * 60 * 60 * 1000; // 24시간 이내

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">계약서 서명</h1>
            <p className="text-gray-600">
              아래 내용을 확인하시고 서명해주세요.
            </p>
            {isExpiringSoon && expiresAt && (
              <div className="mt-3 flex items-center gap-2 text-orange-600 text-sm">
                <FiClock />
                <span>이 링크는 {expiresAt.toLocaleDateString('ko-KR')}에 만료됩니다.</span>
              </div>
            )}
          </div>

          {/* 계약서 정보 */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">계약서 정보</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <span className="text-sm text-gray-500">이름</span>
                <p className="font-semibold text-gray-900">{contract.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">전화번호</span>
                <p className="font-semibold text-gray-900">{contract.phone}</p>
              </div>
              {contract.email && (
                <div>
                  <span className="text-sm text-gray-500">이메일</span>
                  <p className="font-semibold text-gray-900">{contract.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* 계약서 전문 보기 버튼 */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">계약서 전문 확인</h2>
            <p className="text-sm text-gray-700 mb-4">
              아래 버튼을 클릭하여 계약서 전문을 확인하신 후 서명해주세요.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {/* 크루즈닷 어필리에이트 계약서 - 모든 타입 */}
              <button
                type="button"
                onClick={() => setShowContractModal(true)}
                className="rounded-xl border border-blue-500 bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                크루즈닷 어필리에이트 계약서 전문 보기
              </button>
              
              {/* 교육 계약서 - 모든 타입 */}
              <button
                type="button"
                onClick={() => setShowEducationContractModal(true)}
                className="rounded-xl border border-blue-500 bg-white px-6 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                교육 계약서 전문 보기
              </button>
            </div>
          </div>

          {/* 필수 동의 */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">필수 동의</h2>
            <div className="space-y-3 text-sm text-gray-700">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentPrivacy}
                  onChange={(e) => setConsentPrivacy(e.target.checked)}
                  className="mt-1 h-4 w-4"
                  required
                />
                <span>
                  <span className="font-semibold">{REQUIRED_CONSENTS[0].title}</span>
                  <br />
                  <span className="text-xs text-gray-600">{REQUIRED_CONSENTS[0].description}</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentNonCompete}
                  onChange={(e) => setConsentNonCompete(e.target.checked)}
                  className="mt-1 h-4 w-4"
                  required
                />
                <span>
                  <span className="font-semibold">{REQUIRED_CONSENTS[1].title}</span>
                  <br />
                  <span className="text-xs text-gray-600">{REQUIRED_CONSENTS[1].description}</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentDbUse}
                  onChange={(e) => setConsentDbUse(e.target.checked)}
                  className="mt-1 h-4 w-4"
                  required
                />
                <span>
                  <span className="font-semibold">{REQUIRED_CONSENTS[2].title}</span>
                  <br />
                  <span className="text-xs text-gray-600">{REQUIRED_CONSENTS[2].description}</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentPenalty}
                  onChange={(e) => setConsentPenalty(e.target.checked)}
                  className="mt-1 h-4 w-4"
                  required
                />
                <span>
                  <span className="font-semibold">{REQUIRED_CONSENTS[3].title}</span>
                  <br />
                  <span className="text-xs text-gray-600">{REQUIRED_CONSENTS[3].description}</span>
                </span>
              </label>
              {contract?.contractType && REFUND_CONSENTS[contract.contractType] && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentRefund}
                    onChange={(e) => setConsentRefund(e.target.checked)}
                    className="mt-1 h-4 w-4"
                    required
                  />
                  <span>
                    <span className="font-semibold">{REFUND_CONSENTS[contract.contractType].title}</span>
                    <br />
                    <span className="text-xs text-gray-600">{REFUND_CONSENTS[contract.contractType].description}</span>
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* 서명자 이름 입력 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              서명자 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={signedByName}
              onChange={(e) => setSignedByName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="서명자 이름을 입력하세요"
            />
          </div>

          {/* 서명 영역 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              서명 <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white">
              <canvas
                ref={signatureCanvasRef}
                className="w-full cursor-crosshair"
                style={{ height: '300px', touchAction: 'none' }}
              />
            </div>
            <button
              type="button"
              onClick={handleClearSignature}
              className="mt-2 text-sm text-gray-600 hover:text-gray-800"
            >
              서명 지우기
            </button>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-2">
              <FiAlertCircle className="text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">서명 전 확인사항</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>계약서 내용을 반드시 확인하신 후 서명해주세요.</li>
                  <li>서명 후에는 수정할 수 없습니다.</li>
                  <li>서명 완료 후 계약서는 자동으로 저장됩니다.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || uploadingSignature}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold shadow hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {isSubmitting || uploadingSignature ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  처리 중...
                </>
              ) : (
                <>
                  <FiCheckCircle />
                  서명 완료
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 계약서 전문 모달 */}
      {showContractModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 px-4"
          onClick={() => setShowContractModal(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">크루즈닷 어필리에이트 계약서 전문</h3>
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              >
                <FiX />
              </button>
            </div>
            <div className="h-[70vh] overflow-y-auto px-6 py-4 text-sm leading-relaxed text-slate-700 space-y-6">
              {CONTRACT_SECTIONS.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h4 className="font-semibold text-slate-900">{section.title}</h4>
                  <ul className="list-disc space-y-1 pl-5">
                    {section.clauses.map((clause, index) => (
                      <li key={index}>{clause}</li>
                    ))}
                  </ul>
                </div>
              ))}
              
              {/* 필수 동의 항목 */}
              <div className="mt-6 pt-6 border-t border-slate-300">
                <h4 className="font-semibold text-slate-900 mb-4">필수 동의 사항</h4>
                <ul className="space-y-3">
                  {REQUIRED_CONSENTS.map((consent, index) => (
                    <li key={index} className="space-y-1">
                      <p className="font-semibold text-slate-900">{index + 1}. {consent.title}</p>
                      <p className="text-slate-600 text-xs ml-4">{consent.description}</p>
                    </li>
                  ))}
                  {contract.contractType && REFUND_CONSENTS[contract.contractType] && (
                    <li className="space-y-1">
                      <p className="font-semibold text-slate-900">
                        {REQUIRED_CONSENTS.length + 1}. {REFUND_CONSENTS[contract.contractType].title}
                      </p>
                      <p className="text-slate-600 text-xs ml-4">{REFUND_CONSENTS[contract.contractType].description}</p>
                    </li>
                  )}
                </ul>
              </div>
              
              <p className="text-xs text-slate-500 mt-4">
                ※ 본 계약서는 전자 서명으로 체결되며, 갑(크루즈닷)의 최종 승인을 통해 효력이 발생합니다.
              </p>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 교육 계약서 전문 모달 */}
      {showEducationContractModal && contract && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4"
          onClick={() => setShowEducationContractModal(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">
                {contract.contractType === 'BRANCH_MANAGER' ? '대리점장' : 
                 contract.contractType === 'CRUISE_STAFF' ? '크루즈스탭' : 
                 contract.contractType === 'PRIMARKETER' ? '프리마케터' : '판매원'} 교육 계약서
              </h3>
              <button
                type="button"
                onClick={() => setShowEducationContractModal(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              >
                <FiX />
              </button>
            </div>
            <div className="h-[70vh] overflow-y-auto px-6 py-4 text-sm leading-relaxed text-slate-700 space-y-4">
              {/* 전문 전체 내용만 표시 */}
              {(() => {
                const contractType = contract.contractType || 'SALES_AGENT';
                const sections = EDUCATION_CONTRACT_SECTIONS[contractType] || [];
                
                return sections.map((section) => (
                  <div key={section.title} className="space-y-3">
                    <h4 className="text-lg font-bold text-slate-900">{section.title}</h4>
                    <div className="space-y-2">
                      {section.clauses.map((clause, index) => {
                        if (clause === '') {
                          return <div key={index} className="h-2" />;
                        }
                        if (clause.startsWith('제') && clause.includes('조')) {
                          return (
                            <h5 key={index} className="font-semibold text-slate-900 mt-4 mb-2">
                              {clause}
                            </h5>
                          );
                        }
                        if (clause.match(/^\d+\./)) {
                          return (
                            <div key={index} className="ml-4 text-slate-700">
                              {clause}
                            </div>
                          );
                        }
                        return (
                          <p key={index} className="text-slate-700 leading-relaxed">
                            {clause}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
              
              <p className="text-xs text-slate-500 mt-4">
                ※ 본 교육 계약서는 전자 서명으로 체결되며, 갑(크루즈닷)의 최종 승인을 통해 효력이 발생합니다.
              </p>
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowEducationContractModal(false)}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
              >
                확인했습니다
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContractSignPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <ContractSignPageContent />
    </Suspense>
  );
}

