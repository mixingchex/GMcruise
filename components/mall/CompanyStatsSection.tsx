'use client';

import { useEffect, useState, useRef, useMemo } from 'react';

// 숫자 카운트업 애니메이션 훅
function useCountUp(end: number, duration: number = 2000, prefix: string = '', suffix: string = '') {
  const [count, setCount] = useState(0);
  const [displayValue, setDisplayValue] = useState(prefix + '0' + suffix);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutCubic 함수
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.floor(easeOutCubic * end);

      if (currentCount !== countRef.current) {
        countRef.current = currentCount;
        setCount(currentCount);

        // 숫자 포맷팅 (쉼표 추가)
        const formatted = currentCount.toLocaleString('ko-KR');
        setDisplayValue(prefix + formatted + suffix);
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // 최종 값 설정
        const finalFormatted = end.toLocaleString('ko-KR');
        setDisplayValue(prefix + finalFormatted + suffix);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [end, duration, prefix, suffix]);

  return displayValue;
}

interface CompanyStatsConfig {
  title: string;
  subtitle: string;
  satisfactionScore: number;
  topRowCards: Array<{
    icon: string;
    value: string;
    description: string;
  }>;
  bottomRowCards: Array<{
    icon: string;
    value: string;
    description: string;
    bgColor: 'blue' | 'yellow' | 'green';
    autoIncrement?: boolean;
    incrementInterval?: number;
    incrementAmount?: number;
  }>;
}

export default function CompanyStatsSection({ config }: { config?: CompanyStatsConfig }) {
  const defaultConfig: CompanyStatsConfig = {
    title: '크루즈닷의 경험과 신뢰',
    subtitle: '직접 여행해보고 꼼꼼히 따져보는 크루즈 전문',
    satisfactionScore: 4.8,
    topRowCards: [
      { icon: '👨‍💼', value: '총 67회', description: '상담 매니저 크루즈 경험' },
      { icon: '✈️', value: '11년~', description: '패키지 크루즈 인솔자 경력' },
      { icon: '🏢', value: '11년~', description: '크루즈 서비스만 연구한시간' },
    ],
    bottomRowCards: [
      { icon: '📊', value: '222명', description: '다음 크루즈 준비', bgColor: 'blue', autoIncrement: true, incrementInterval: 3, incrementAmount: 3 },
      { icon: '💬', value: '13,491', description: '지금 크루즈 문의', bgColor: 'yellow', autoIncrement: true, incrementInterval: 5, incrementAmount: 9 },
      { icon: '🎉', value: '3217명', description: '크루즈닷 회원', bgColor: 'green' },
    ],
  };

  // 하단 카드의 자동 증가를 위한 상태
  const [dynamicValues, setDynamicValues] = useState<{ [key: number]: number }>({});
  const intervalsRef = useRef<{ [key: number]: NodeJS.Timeout }>({});
  const animationFramesRef = useRef<{ [key: number]: number }>({});

  // finalConfig를 useMemo로 메모이제이션하여 무한 루프 방지
  const finalConfig: CompanyStatsConfig = useMemo(() => ({
    title: config?.title || defaultConfig.title,
    subtitle: config?.subtitle || defaultConfig.subtitle,
    satisfactionScore: config?.satisfactionScore || defaultConfig.satisfactionScore,
    // 항상 최신 기본값 사용 (데이터베이스 설정 무시)
    topRowCards: defaultConfig.topRowCards,
    bottomRowCards: defaultConfig.bottomRowCards,
  }), [config?.title, config?.subtitle, config?.satisfactionScore]);

  // 각 하단 카드별로 독립적인 자동 증가 설정
  useEffect(() => {
    // bottomRowCards는 항상 같은 배열이므로 직접 사용
    const bottomRowCards = defaultConfig.bottomRowCards;
    bottomRowCards.forEach((card, idx) => {
      // 기존 interval과 animation frame 정리
      if (intervalsRef.current[idx]) {
        clearInterval(intervalsRef.current[idx]);
        delete intervalsRef.current[idx];
      }
      if (animationFramesRef.current[idx]) {
        cancelAnimationFrame(animationFramesRef.current[idx]);
        delete animationFramesRef.current[idx];
      }

      if (card.autoIncrement) {
        const numericValue = parseInt(card.value.replace(/[^0-9]/g, '')) || 0;

        // 초기값 설정
        setDynamicValues(prev => ({ ...prev, [idx]: numericValue }));

        // 초기 카운트업 애니메이션
        let startTime: number | null = null;
        const duration = 2000;

        const animate = (currentTime: number) => {
          if (!startTime) startTime = currentTime;
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOutCubic = 1 - Math.pow(1 - progress, 3);

          const currentValue = Math.floor(easeOutCubic * numericValue);
          setDynamicValues(prev => ({
            ...prev,
            [idx]: currentValue,
          }));

          if (progress < 1) {
            animationFramesRef.current[idx] = requestAnimationFrame(animate);
          } else {
            // 애니메이션 완료 후 최종값 설정
            setDynamicValues(prev => ({ ...prev, [idx]: numericValue }));

            // 자동 증가 시작 - 계속 증가하도록
            intervalsRef.current[idx] = setInterval(() => {
              setDynamicValues(prev => {
                const current = prev[idx] || numericValue;
                const newValue = current + (card.incrementAmount || 1);
                return {
                  ...prev,
                  [idx]: newValue,
                };
              });
            }, (card.incrementInterval || 3) * 1000);
          }
        };

        animationFramesRef.current[idx] = requestAnimationFrame(animate);
      } else {
        // 자동 증가가 비활성화된 경우 초기값만 설정
        const numericValue = parseInt(card.value.replace(/[^0-9]/g, '')) || 0;
        setDynamicValues(prev => ({ ...prev, [idx]: numericValue }));
      }
    });

    // Cleanup 함수
    return () => {
      Object.values(intervalsRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      Object.values(animationFramesRef.current).forEach(frameId => {
        if (frameId) cancelAnimationFrame(frameId);
      });
      intervalsRef.current = {};
      animationFramesRef.current = {};
    };
  }, []); // 빈 의존성 배열 - bottomRowCards는 항상 같으므로 한 번만 실행

  return (
    <section className="relative bg-white py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        {/* 상단 배너 배경 이미지 (동영상 대신 사용 - 빠른 로딩) */}
        <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 rounded-2xl overflow-hidden shadow-2xl mb-10 sm:mb-12 md:mb-16 lg:mb-20">
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center animate-subtle-zoom"
            style={{
              backgroundImage: `url('${encodeURI('/크루즈정보사진/크루즈배경이미지/고화질배경이미지 (5).png')}')`,
            }}
          />
          {/* 배경 위 어두운 오버레이 (텍스트 가독성) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

          {/* 비디오 위 텍스트 오버레이 */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 sm:pb-12 md:pb-16 text-white z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-2 sm:mb-4 drop-shadow-2xl text-center px-4">
              {finalConfig.title}
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl font-semibold drop-shadow-lg text-center px-4">
              {finalConfig.subtitle}
            </p>
          </div>
        </div>

        {/* 별점 및 만족도 표시 */}
        <div className="text-center mb-10 sm:mb-12 md:mb-16 lg:mb-20">
          <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 md:gap-5 mb-6">
            {/* 별 4개 + 반개 */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
              {/* 별 4개 (완전) */}
              {[...Array(4)].map((_, i) => (
                <svg
                  key={i}
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 text-yellow-400 drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              {/* 반별 1개 */}
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <defs>
                    <clipPath id="halfStar">
                      <rect x="0" y="0" width="10" height="20" />
                    </clipPath>
                  </defs>
                  {/* 배경 빈 별 (회색) - 전체 */}
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                    fill="#d1d5db"
                  />
                  {/* 앞쪽 왼쪽 절반만 노란색 별 */}
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                    fill="#facc15"
                    clipPath="url(#halfStar)"
                    className="drop-shadow-lg"
                  />
                </svg>
              </div>
            </div>
            {/* 만족도 텍스트 */}
            <div className="text-center px-2">
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-700 font-bold mb-1 sm:mb-2">
                고객 만족도
              </p>
              <p className="text-red-600 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black drop-shadow-lg">
                {finalConfig.satisfactionScore}점
              </p>
            </div>
          </div>
        </div>

        {/* 상단 통계 카드 그리드 - 모던한 디자인 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-10 sm:mb-12 md:mb-16">
          {finalConfig.topRowCards.map((card, idx) => (
            <div
              key={idx}
              className="group relative bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 shadow-lg hover:shadow-2xl border border-gray-200 hover:border-blue-400 transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* 호버 시 배경 효과 */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-100/0 group-hover:from-blue-50/50 group-hover:to-blue-100/30 rounded-xl sm:rounded-2xl transition-all duration-300"></div>

              <div className="relative text-center">
                <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-3 sm:mb-4 md:mb-6 transform group-hover:scale-110 transition-transform duration-300">
                  {card.icon}
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-blue-600 mb-3 sm:mb-4 md:mb-6 leading-none">
                  {card.value}
                </div>
                <div className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 font-semibold leading-relaxed">
                  {card.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 통계 카드 - 숫자 애니메이션 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {finalConfig.bottomRowCards.map((card, idx) => {
            const bgColors = {
              blue: {
                gradient: 'from-blue-500 to-blue-600',
                bg: 'bg-blue-50',
                border: 'border-blue-300',
                text: 'text-blue-700',
              },
              yellow: {
                gradient: 'from-yellow-400 to-yellow-500',
                bg: 'bg-yellow-50',
                border: 'border-yellow-300',
                text: 'text-yellow-700',
              },
              green: {
                gradient: 'from-green-500 to-green-600',
                bg: 'bg-green-50',
                border: 'border-green-300',
                text: 'text-green-700',
              },
            };

            const colorScheme = bgColors[card.bgColor];

            // 동적 값 표시 (자동 증가가 활성화된 경우)
            let displayValue = card.value;
            if (card.autoIncrement && dynamicValues[idx] !== undefined) {
              const numericValue = dynamicValues[idx];
              const valueMatch = card.value.match(/^([^0-9]*)([0-9]+)(.*)$/);
              if (valueMatch) {
                const [, prefix, , suffix] = valueMatch;
                displayValue = prefix + numericValue.toLocaleString('ko-KR') + suffix;
              } else {
                displayValue = numericValue.toLocaleString('ko-KR') + (card.value.match(/[^0-9]+$/) || [''])[0];
              }
            }

            return (
              <div
                key={idx}
                className={`group relative ${colorScheme.bg} rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 text-center shadow-lg hover:shadow-xl border-2 ${colorScheme.border} transition-all duration-300 transform hover:-translate-y-1 overflow-hidden`}
              >
                {/* 그라데이션 배경 효과 */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorScheme.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                <div className="relative">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-3 sm:mb-4 md:mb-6 transform group-hover:scale-110 transition-transform duration-300">
                    {card.icon}
                  </div>
                  <div className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black ${colorScheme.text} mb-2 sm:mb-3 md:mb-4 leading-none`}>
                    {displayValue}
                  </div>
                  <div className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 font-semibold leading-relaxed">
                    {card.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
