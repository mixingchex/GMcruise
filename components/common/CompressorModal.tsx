
'use client';

import { useState, useRef } from 'react';
import { FiX, FiVideo, FiImage, FiFileText, FiLayers, FiDownload, FiUploadCloud, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import JSZip from 'jszip';
import imageCompression from 'browser-image-compression';
import { showError, showSuccess } from '@/components/ui/Toast';

interface CompressorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabType = 'video' | 'image' | 'pdf' | 'webp';
type CompressionLevel = 'low' | 'medium' | 'high'; // low: 약하게(화질우선), medium: 보통, high: 강하게(용량우선)

export default function CompressorModal({ isOpen, onClose }: CompressorModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('video');
    const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [resultFile, setResultFile] = useState<{ url: string; name: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const resetState = () => {
        setIsProcessing(false);
        setProgress(0);
        setStatusMessage('');
        setResultFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        resetState();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        resetState();
        setIsProcessing(true);

        try {
            if (activeTab === 'video') {
                await processVideo(files[0]);
            } else if (activeTab === 'image') {
                await processImages(Array.from(files));
            } else if (activeTab === 'pdf') {
                await processPdfs(Array.from(files));
            } else if (activeTab === 'webp') {
                await processWebP(Array.from(files));
            }
        } catch (error: any) {
            console.error('Compression error:', error);
            showError(error.message || '작업 중 오류가 발생했습니다.');
            setStatusMessage('오류 발생: ' + (error.message || '알 수 없는 오류'));
        } finally {
            setIsProcessing(false);
        }
    };

    // 1. Video Compression (Server-side)
    const processVideo = async (file: File) => {
        setStatusMessage('서버로 전송 중...');
        setProgress(10);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('level', compressionLevel);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/compress/video', true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 50; // Upload is first 50%
                setProgress(Math.round(percentComplete));
            }
        };

        xhr.onload = async () => {
            if (xhr.status === 200) {
                setProgress(100);
                setStatusMessage('압축 완료! 다운로드 준비 중...');

                // Blob response handling
                const blob = xhr.response;
                const url = window.URL.createObjectURL(blob);
                setResultFile({
                    url,
                    name: `compressed_${file.name.replace(/\.[^/.]+$/, "")}.mp4`
                });
                showSuccess('동영상 압축이 완료되었습니다.');
            } else {
                setStatusMessage('서버 처리 실패');
                showError('동영상 압축에 실패했습니다.');
            }
            setIsProcessing(false);
        };

        xhr.onerror = () => {
            setStatusMessage('네트워크 오류');
            showError('네트워크 오류가 발생했습니다.');
            setIsProcessing(false);
        };

        xhr.responseType = 'blob';
        xhr.send(formData);

        // Fake progress for server processing part (50-90%)
        let currentProgress = 50;
        const interval = setInterval(() => {
            if (xhr.readyState === 4) {
                clearInterval(interval);
                return;
            }
            if (currentProgress < 90) {
                currentProgress += 1;
                setProgress(currentProgress);
                setStatusMessage('서버에서 압축 중...');
            }
        }, 500);
    };

    // 2. Image Compression (Client-side)
    const processImages = async (files: File[]) => {
        setStatusMessage('이미지 압축 중...');
        const zip = new JSZip();

        // Configure options based on level
        let options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        };

        if (compressionLevel === 'low') { // 약하게 (화질 우선)
            options.maxSizeMB = 2;
            options.maxWidthOrHeight = 2560;
        } else if (compressionLevel === 'high') { // 강하게 (용량 우선)
            options.maxSizeMB = 0.5;
            options.maxWidthOrHeight = 1280;
        }

        let processedCount = 0;

        // If single file, just compress and offer download directly (no zip needed ideally, but user asked for zip for multiple)
        // Logic: Always zip for consistency if multiple, or just file if single? 
        // User request: "복수선택해서 한번에 zip 파일로 압축... 단일선택 이미지 불러오는거라면 단일 이미지로 압축"

        if (files.length === 1) {
            const file = files[0];
            const compressedFile = await imageCompression(file, options);
            const url = URL.createObjectURL(compressedFile);
            setResultFile({
                url,
                name: `compressed_${file.name}`
            });
            setProgress(100);
            setStatusMessage('완료!');
            return;
        }

        for (const file of files) {
            try {
                const compressedFile = await imageCompression(file, options);
                zip.file(file.name, compressedFile);
                processedCount++;
                setProgress(Math.round((processedCount / files.length) * 90));
            } catch (e) {
                console.error(`Failed to compress ${file.name}`, e);
            }
        }

        setStatusMessage('ZIP 파일 생성 중...');
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);

        setResultFile({
            url,
            name: 'compressed_images.zip'
        });
        setProgress(100);
        setStatusMessage('완료!');
    };

    // 3. PDF Compression (Client-side ZIP only for now)
    const processPdfs = async (files: File[]) => {
        setStatusMessage('PDF 처리 중...');

        if (files.length === 1) {
            // Just pass through for single PDF as we can't compress client-side effectively without heavy libs
            const file = files[0];
            const url = URL.createObjectURL(file);
            setResultFile({
                url,
                name: file.name // No name change as no compression
            });
            setProgress(100);
            setStatusMessage('완료! (단일 파일은 원본 유지)');
            return;
        }

        const zip = new JSZip();
        files.forEach(file => {
            zip.file(file.name, file);
        });

        setStatusMessage('ZIP 파일 생성 중...');
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);

        setResultFile({
            url,
            name: 'documents.zip'
        });
        setProgress(100);
        setStatusMessage('완료!');
    };

    // 4. WebP Conversion (Client-side)
    const processWebP = async (files: File[]) => {
        setStatusMessage('WebP 변환 중...');
        const zip = new JSZip();
        // Options for conversion: use browser-image-compression with fileType
        // Note: browser-image-compression might not strictly support 'fileType' output option in all versions, 
        // but we can use canvas or just try. Actually, browser-image-compression is mainly for size.
        // Let's use a canvas approach for WebP conversion if the lib doesn't support it directly, 
        // BUT browser-image-compression v2+ supports fileType. Let's assume standard usage or fallback.
        // Actually simpler: create an image element, draw to canvas, toDataURL('image/webp').

        let processedCount = 0;

        const convertToWebP = async (file: File): Promise<Blob> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { reject(new Error('Canvas context error')); return; }
                    ctx.drawImage(img, 0, 0);

                    let quality = 0.8;
                    if (compressionLevel === 'low') quality = 0.95;
                    if (compressionLevel === 'high') quality = 0.6;

                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Conversion failed'));
                    }, 'image/webp', quality);
                };
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });
        };

        if (files.length === 1) {
            const file = files[0];
            const webpBlob = await convertToWebP(file);
            const url = URL.createObjectURL(webpBlob);
            const name = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            setResultFile({ url, name });
            setProgress(100);
            setStatusMessage('완료!');
            return;
        }

        for (const file of files) {
            try {
                const webpBlob = await convertToWebP(file);
                const name = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                zip.file(name, webpBlob);
                processedCount++;
                setProgress(Math.round((processedCount / files.length) * 90));
            } catch (e) {
                console.error(`Failed to convert ${file.name}`, e);
            }
        }

        setStatusMessage('ZIP 파일 생성 중...');
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);

        setResultFile({
            url,
            name: 'converted_webp_images.zip'
        });
        setProgress(100);
        setStatusMessage('완료!');
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-5 border-b flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FiLayers className="text-blue-600" />
                        만능 압축기
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <FiX className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    <button
                        onClick={() => handleTabChange('video')}
                        className={`flex-1 py-4 font-medium text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'video' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <FiVideo className="w-5 h-5" /> 동영상 압축
                    </button>
                    <button
                        onClick={() => handleTabChange('image')}
                        className={`flex-1 py-4 font-medium text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'image' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <FiImage className="w-5 h-5" /> 이미지 압축
                    </button>
                    <button
                        onClick={() => handleTabChange('pdf')}
                        className={`flex-1 py-4 font-medium text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'pdf' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <FiFileText className="w-5 h-5" /> 문서(PDF)
                    </button>
                    <button
                        onClick={() => handleTabChange('webp')}
                        className={`flex-1 py-4 font-medium text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'webp' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <FiLayers className="w-5 h-5" /> WebP 변환
                    </button>
                </div>

                {/* Options */}
                {!isProcessing && !resultFile && activeTab !== 'pdf' && (
                    <div className="px-8 py-4 bg-gray-50 border-b flex items-center justify-center gap-6">
                        <span className="text-sm font-bold text-gray-600">압축 강도:</span>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="level"
                                    checked={compressionLevel === 'low'}
                                    onChange={() => setCompressionLevel('low')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">약하게 (화질 우선)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="level"
                                    checked={compressionLevel === 'medium'}
                                    onChange={() => setCompressionLevel('medium')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">보통</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="level"
                                    checked={compressionLevel === 'high'}
                                    onChange={() => setCompressionLevel('high')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">강하게 (용량 우선)</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-8 flex-1 overflow-y-auto min-h-[300px] flex flex-col items-center justify-center">
                    {!isProcessing && !resultFile && (
                        <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-10 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}>
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                                <FiUploadCloud className="w-10 h-10" />
                            </div>
                            <p className="text-lg font-bold text-gray-700 mb-2">
                                {activeTab === 'video' && '동영상 파일을 선택하세요'}
                                {activeTab === 'image' && '이미지 파일들을 선택하세요 (PNG, JPG, GIF)'}
                                {activeTab === 'pdf' && 'PDF 파일들을 선택하세요'}
                                {activeTab === 'webp' && '변환할 이미지를 선택하세요'}
                            </p>
                            <p className="text-sm text-gray-500">
                                {activeTab === 'video' ? '단일 파일 (MP4, MOV 등)' : '여러 파일 선택 가능'}
                            </p>
                            <button className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md">
                                파일 불러오기
                            </button>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="w-full max-w-md text-center">
                            <div className="mb-6 relative pt-4">
                                <div className="w-20 h-20 mx-auto border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pt-4 font-bold text-blue-600">
                                    {progress}%
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">{statusMessage}</h3>
                            <p className="text-gray-500 text-sm">잠시만 기다려주세요...</p>
                        </div>
                    )}

                    {resultFile && !isProcessing && (
                        <div className="w-full max-w-md text-center animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto text-green-600">
                                <FiCheckCircle className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">작업 완료!</h3>
                            <p className="text-gray-600 mb-8 break-all">{resultFile.name}</p>

                            <div className="flex gap-3 justify-center">
                                <a
                                    href={resultFile.url}
                                    download={resultFile.name}
                                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg hover:scale-105 transform"
                                >
                                    <FiDownload className="w-5 h-5" /> 다운로드
                                </a>
                                <button
                                    onClick={resetState}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    다른 파일 작업
                                </button>
                            </div>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple={activeTab !== 'video'}
                        accept={
                            activeTab === 'video' ? 'video/*' :
                                activeTab === 'pdf' ? 'application/pdf' :
                                    'image/*'
                        }
                        onChange={handleFileChange}
                    />
                </div>

                <div className="p-4 bg-gray-50 text-xs text-gray-400 text-center border-t">
                    * 서버에 저장되지 않으며, 브라우저 종료 시 데이터는 사라집니다.
                </div>
            </div>
        </div>
    );
}
