'use client';

import { useState, useEffect } from 'react';
import { FiDownloadCloud, FiSmartphone, FiX } from 'react-icons/fi';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallButtonGenie() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // iOS 체크
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);

    // 이미 설치되어 있는지 확인
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // PWA 설치 프롬프트 이벤트 리스너
    // Service Worker는 PWASetup 컴포넌트에서 페이지 로드 시 등록됨
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log('[PWA Install Genie] beforeinstallprompt 이벤트 발생');
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // iOS는 프로그래밍적으로 설치 프롬프트를 띄울 수 없으므로 수동 설치 가이드 표시
      setShowIOSGuide(true);
      return;
    }

    // deferredPrompt가 있으면 바로 설치 프롬프트 표시
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          console.log('크루즈닷AI PWA 설치 완료 - 바로 채팅 화면으로 이동');
          // PWA 설치 추적 API 호출
          try {
            await fetch('/api/pwa/install', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ type: 'genie' }),
            });
          } catch (error) {
            console.error('[PWA Install Genie] 설치 추적 오류:', error);
          }
          // 설치 완료 후 채팅 페이지로 이동
          window.location.href = '/chat?utm_source=pwa&utm_medium=home_screen';
        } else {
          console.log('크루즈닷AI PWA 설치 취소됨');
        }
      } catch (error: any) {
        console.error('[PWA Install Genie] 설치 오류:', error);
        // 에러 메시지가 있으면 표시, 없으면 기본 메시지
        const errorMessage = error?.message || '설치 중 오류가 발생했습니다.';
        if (errorMessage.includes('User dismissed') || errorMessage.includes('cancelled')) {
          // 사용자가 취소한 경우 조용히 처리
          console.log('[PWA Install Genie] 사용자가 설치를 취소했습니다.');
        } else {
          alert(`설치 중 오류가 발생했습니다: ${errorMessage}\n\n브라우저가 PWA 설치를 지원하지 않거나 이미 설치되어 있을 수 있습니다.`);
        }
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }

    // deferredPrompt가 없으면 beforeinstallprompt 이벤트를 기다림 (최대 5초)
    console.log('[PWA Install Genie] beforeinstallprompt 이벤트 대기 중...');
    const waitForPrompt = new Promise<BeforeInstallPromptEvent | null>((resolve) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('beforeinstallprompt', promptHandler);
        resolve(null);
      }, 5000);

      const promptHandler = (e: Event) => {
        e.preventDefault();
        clearTimeout(timeout);
        window.removeEventListener('beforeinstallprompt', promptHandler);
        resolve(e as BeforeInstallPromptEvent);
      };

      window.addEventListener('beforeinstallprompt', promptHandler);
    });

    const promptEvent = await waitForPrompt;

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          console.log('크루즈닷AI PWA 설치 완료 - 바로 채팅 화면으로 이동');
          // PWA 설치 추적 API 호출
          try {
            await fetch('/api/pwa/install', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ type: 'genie' }),
            });
          } catch (error) {
            console.error('[PWA Install Genie] 설치 추적 오류:', error);
          }
          window.location.href = '/chat?utm_source=pwa&utm_medium=home_screen';
        } else {
          console.log('크루즈닷AI PWA 설치 취소됨');
        }
      } catch (error: any) {
        console.error('[PWA Install Genie] 설치 오류:', error);
        // 에러 메시지가 있으면 표시, 없으면 기본 메시지
        const errorMessage = error?.message || '설치 중 오류가 발생했습니다.';
        if (errorMessage.includes('User dismissed') || errorMessage.includes('cancelled')) {
          // 사용자가 취소한 경우 조용히 처리
          console.log('[PWA Install Genie] 사용자가 설치를 취소했습니다.');
        } else {
          alert(`설치 중 오류가 발생했습니다: ${errorMessage}\n\n브라우저가 PWA 설치를 지원하지 않거나 이미 설치되어 있을 수 있습니다.`);
        }
      }
      return;
    }

    // 여전히 프롬프트가 없으면 사용자에게 안내
    console.warn('[PWA Install Genie] beforeinstallprompt 이벤트가 발생하지 않았습니다.');
    alert('자동 설치가 지원되지 않는 브라우저입니다.\n\nAndroid Chrome에서는 자동 설치가 가능하며, 다른 브라우저에서는 수동으로 설치해주세요.\n\n설치 방법:\n1. 브라우저 메뉴(⋮) 클릭\n2. "앱 설치" 또는 "홈 화면에 추가" 선택');
  };

  // 이미 설치되어 있으면 버튼 숨김
  if (isStandalone) {
    return (
      <div className="w-full bg-green-50 border-2 border-green-200 text-green-700 font-semibold py-4 px-6 rounded-xl text-center">
        ✅ 이미 바탕화면에 추가되어 있습니다.
      </div>
    );
  }

  return (
    <>
      {/* iOS 설치 가이드 모달 */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">iOS에서 홈 화면에 추가하기</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">
                iOS Safari에서는 자동 설치가 지원되지 않습니다. 아래 방법으로 수동으로 추가해주세요.
              </p>
              <ol className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold">1</span>
                  <span>Safari 하단의 <strong>공유 버튼(□↑)</strong> 클릭</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold">2</span>
                  <span>스크롤하여 <strong>"홈 화면에 추가"</strong> 선택</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold">3</span>
                  <span><strong>"추가"</strong> 버튼 클릭</span>
                </li>
              </ol>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-yellow-800">
                  💡 <strong>참고:</strong> Android Chrome에서는 버튼 클릭 시 자동으로 설치할 수 있습니다.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full mt-6 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 설치 버튼 */}
      <button
        onClick={handleInstallClick}
        disabled={false}
        className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <FiSmartphone className="text-2xl" />
        <span className="text-lg">📲 크루즈닷 바탕화면에 추가하기</span>
        {isIOS && (
          <span className="text-xs text-white opacity-80 ml-2">(수동 설치)</span>
        )}
      </button>
    </>
  );
}

