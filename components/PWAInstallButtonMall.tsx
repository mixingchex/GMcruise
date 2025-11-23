'use client';

import { useState, useEffect } from 'react';
import { FiDownloadCloud, FiSmartphone } from 'react-icons/fi';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallButtonMall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // iOS 체크
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);

    // 이미 설치되어 있는지 확인
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Service Worker 등록 (PWA 설치 조건 만족을 위해)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      }).then((registration) => {
        console.log('[PWA Install Mall] Service Worker 등록 완료:', registration.scope);
      }).catch((error) => {
        console.warn('[PWA Install Mall] Service Worker 등록 실패:', error);
      });
    }

    // PWA 설치 프롬프트 이벤트 리스너
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log('[PWA Install Mall] beforeinstallprompt 이벤트 발생');
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // iOS는 프로그래밍적으로 설치 프롬프트를 띄울 수 없으므로 조용히 처리
      console.log('[PWA Install Mall] iOS에서는 Safari 공유 버튼을 통해 수동으로 추가해야 합니다.');
      return;
    }

    // manifest 링크를 mall로 강제 변경 (다른 버튼이 덮어쓴 경우 대비)
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (link) {
      link.href = '/manifest-mall.json';
      console.log('[PWA Install Mall] manifest를 /manifest-mall.json으로 변경');
    } else {
      // manifest 링크가 없으면 생성
      const newLink = document.createElement('link');
      newLink.rel = 'manifest';
      newLink.href = '/manifest-mall.json';
      document.head.appendChild(newLink);
      console.log('[PWA Install Mall] manifest 링크 생성: /manifest-mall.json');
    }
    
    // 페이지 새로고침하여 manifest 변경사항 적용 (필요시)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Service Worker 등록 (PWA 설치 조건 만족을 위해)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        console.log('[PWA Install] Service Worker 등록 완료:', registration.scope);
      } catch (error) {
        console.warn('[PWA Install] Service Worker 등록 실패:', error);
      }
    }

    // deferredPrompt가 있으면 바로 설치 프롬프트 표시
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          console.log('크루즈몰 PWA 설치 완료 - 자동 로그인 상태 유지');
          // PWA 설치 추적 API 호출
          try {
            await fetch('/api/pwa/install', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ type: 'mall' }),
            });
          } catch (error) {
            console.error('[PWA Install Mall] 설치 추적 오류:', error);
          }
          // 설치 완료 후 메인 페이지로 이동 (자동 로그인 상태 유지)
          window.location.href = '/?utm_source=pwa&utm_medium=home_screen';
        } else {
          console.log('크루즈몰 PWA 설치 취소됨');
        }
      } catch (error) {
        console.error('PWA 설치 오류:', error);
        alert('설치 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }

    // deferredPrompt가 없으면 beforeinstallprompt 이벤트를 기다림 (최대 5초)
    console.log('[PWA Install Mall] beforeinstallprompt 이벤트 대기 중...');
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
          console.log('크루즈몰 PWA 설치 완료 - 자동 로그인 상태 유지');
          // PWA 설치 추적 API 호출
          try {
            await fetch('/api/pwa/install', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ type: 'mall' }),
            });
          } catch (error) {
            console.error('[PWA Install Mall] 설치 추적 오류:', error);
          }
          window.location.href = '/?utm_source=pwa&utm_medium=home_screen';
        } else {
          console.log('크루즈몰 PWA 설치 취소됨');
        }
      } catch (error) {
        console.error('PWA 설치 오류:', error);
        alert('설치 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
      return;
    }

    // 여전히 프롬프트가 없으면 조용히 실패 처리 (alert 제거)
    console.warn('[PWA Install Mall] beforeinstallprompt 이벤트가 발생하지 않았습니다. 브라우저가 자동 설치를 지원하지 않거나 이미 설치되어 있을 수 있습니다.');
  };

  // 이미 설치되어 있으면 버튼 숨김
  if (isStandalone) {
    return (
      <div className="w-full bg-green-50 border-2 border-green-200 text-green-700 font-semibold py-4 px-6 rounded-xl text-center">
        ✅ 이미 바탕화면에 추가되어 있습니다.
      </div>
    );
  }

  // 항상 버튼 표시 (설치 가능 여부와 관계없이)
  return (
    <button
      onClick={handleInstallClick}
      disabled={false}
      className="w-full bg-white hover:bg-gray-50 text-gray-900 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 ease-in-out transform hover:scale-105 border-2 border-gray-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
    >
      <FiSmartphone className="text-2xl" />
      <span className="text-lg">📲 크루즈몰 바탕화면에 추가하기</span>
    </button>
  );
}

