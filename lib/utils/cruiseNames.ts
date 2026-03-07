// lib/utils/cruiseNames.ts
// 크루즈선 데이터에서 한국어 이름을 추출하는 유틸리티 함수

import cruiseShipsData from '@/data/cruise_ships.json';

/**
 * 크루즈 라인의 한국어 이름을 반환합니다.
 * 이미 한국어로 저장되어 있으면 그대로 반환, 영어로 저장되어 있으면 변환
 * @param cruiseLine 크루즈 라인 이름 (한국어 또는 영어)
 * @returns 한국어 크루즈 라인 이름
 */
export function getKoreanCruiseLineName(cruiseLine: string): string {
  if (!cruiseLine) return cruiseLine;

  // 이미 한국어로 저장되어 있는 경우 (괄호 앞 부분이 한국어)
  const koreanPart = cruiseLine.split('(')[0].trim();
  if (koreanPart && /[가-힣]/.test(koreanPart)) {
    return koreanPart;
  }

  // 영어로 저장되어 있는 경우 변환 시도
  for (const line of cruiseShipsData as any[]) {
    const cruiseLineEnglish = line.cruise_line.match(/\(([^)]+)\)/)?.[1] || '';
    const cruiseLineShort = line.cruise_line.split('(')[0].trim();
    
    if (cruiseLineEnglish.toLowerCase() === cruiseLine.toLowerCase() ||
        cruiseLine.toLowerCase().includes(cruiseLineEnglish.toLowerCase())) {
      return cruiseLineShort;
    }
  }

  // 찾지 못하면 원본 반환
  return cruiseLine;
}

/**
 * 선박명의 한국어 이름을 반환합니다.
 * 이미 한국어로 저장되어 있으면 그대로 반환, 영어로 저장되어 있으면 변환
 * @param cruiseLine 크루즈 라인 이름
 * @param shipName 선박명 (한국어 또는 영어)
 * @returns 한국어 선박명
 */
export function getKoreanShipName(cruiseLine: string, shipName: string): string {
  if (!shipName) return shipName;

  // 이미 한국어로 저장되어 있는 경우 (괄호 앞 부분이 한국어)
  const koreanPart = shipName.split('(')[0].trim();
  if (koreanPart && /[가-힣]/.test(koreanPart)) {
    return koreanPart;
  }

  // 영어로 저장되어 있는 경우 변환 시도
  for (const line of cruiseShipsData as any[]) {
    const cruiseLineEnglish = line.cruise_line.match(/\(([^)]+)\)/)?.[1] || '';
    const cruiseLineShort = line.cruise_line.split('(')[0].trim();
    
    const isMatchingLine = 
      cruiseLineEnglish.toLowerCase() === cruiseLine.toLowerCase() ||
      cruiseLineShort.toLowerCase().includes(cruiseLine.toLowerCase()) ||
      cruiseLine.toLowerCase().includes(cruiseLineEnglish.toLowerCase());

    if (isMatchingLine) {
      for (const ship of line.ships) {
        const shipEnglish = ship.match(/\(([^)]+)\)/)?.[1] || '';
        const shipShort = ship.split('(')[0].trim();
        
        if (shipEnglish.toLowerCase() === shipName.toLowerCase() ||
            shipName.toLowerCase().includes(shipEnglish.toLowerCase())) {
          let koreanShipName = shipShort;
          const cruiseLineKeywords = cruiseLineShort.split(' ').filter((word: string) => word.length > 1);
          for (const keyword of cruiseLineKeywords) {
            if (koreanShipName.startsWith(keyword + ' ')) {
              koreanShipName = koreanShipName.substring(keyword.length + 1);
              break;
            }
          }
          return koreanShipName;
        }
      }
    }
  }

  // 찾지 못하면 원본 반환
  return shipName;
}

/**
 * 여행 기간을 포맷팅합니다.
 * @param startDate 시작일 (Date 또는 string)
 * @param endDate 종료일 (Date 또는 string)
 * @param nights 박수
 * @param days 일수
 * @returns 포맷된 여행 기간 문자열 (예: "2024-01-15 ~ 2024-01-19 (4박 5일)")
 */
export function formatTravelPeriod(
  startDate: Date | string | null,
  endDate: Date | string | null,
  nights?: number | null,
  days?: number | null
): string {
  // YYYY-MM-DD 로컬 날짜 파싱 (UTC 변환으로 인한 하루 오차 방지)
  const parseLocalDate = (d: Date | string): Date => {
    if (d instanceof Date) return d;
    const parts = d.split('T')[0].split('-').map(Number); // ISO 문자열에서 날짜 부분만 추출
    return new Date(parts[0], parts[1] - 1, parts[2]); // 로컬 타임존으로 생성
  };

  // YYYY-MM-DD 형식으로 변환 (로컬 타임존 기준)
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (!startDate || !endDate) {
    // 날짜가 없으면 박수/일수만 표시 (DB 값이 올바른 경우에 한해)
    if (nights != null && days != null && nights >= 0 && days > nights) {
      return `${nights}박 ${days}일`;
    }
    if (nights != null && nights >= 0) {
      return `${nights}박 ${nights + 1}일`;
    }
    return '';
  }

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  const startStr = formatDate(start);
  const endStr = formatDate(end);

  // 날짜에서 직접 계산 — DB에 저장된 nights/days 값은 잘못 입력될 수 있으므로 신뢰하지 않음
  // (예: days=1, nights=7인 경우 → 날짜로 재계산하면 8일 7박)
  const diffMs = end.getTime() - start.getTime();
  const calcDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  if (calcDays > 1) {
    const calcNights = calcDays - 1;
    return `${startStr} ~ ${endStr} (${calcNights}박 ${calcDays}일)`;
  }

  return `${startStr} ~ ${endStr}`;
}

