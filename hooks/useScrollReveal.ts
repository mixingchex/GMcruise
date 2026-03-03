import { useEffect, useRef } from 'react';

/**
 * IntersectionObserver 기반 스크롤 reveal 훅
 * - 요소가 뷰포트에 진입할 때 reveal-hidden → reveal-visible 클래스 교체
 * - globals.css의 .reveal-hidden / .reveal-visible 클래스와 함께 사용
 */
export function useScrollReveal(
  threshold: number = 0.15
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.classList.add('reveal-hidden');

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove('reveal-hidden');
          el.classList.add('reveal-visible');
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
