// 강조: **굵게**, !!빨간!!, ==형광펜==
export function renderEmphasis(text: string) {
  let s = text
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/!!(.+?)!!/g, '<span class="text-red-600 font-extrabold">$1</span>')
    .replace(/==(.+?)==/g, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  // 줄바꿈
  s = s.replace(/\n/g, '<br/>');
  // 이모지 → 그대로 표기 (별도 처리 불필요)
  return s;
}

export function formatDateK(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * "HH:MM" 형식의 시간 문자열을 [hours, minutes]로 파싱합니다.
 * @param timeStr - "14:30" 형식의 시간 문자열
 * @returns [hours, minutes]
 */
export function parseTime(timeStr: string): [number, number] {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return [hours, minutes];
}

/**
 * 경로에 따라 "어필리에이트" 용어를 적절히 번역합니다.
 * 관리자 패널(/admin)에서는 "어필리에이트"를 그대로 사용하고,
 * 대리점장/판매원몰(/partner)에서는 "공유"로 표시합니다.
 * @param pathname - 현재 경로 (예: "/admin/affiliate/profiles" 또는 "/partner/123/dashboard")
 * @returns "어필리에이트" 또는 "공유"
 */
export function getAffiliateTerm(pathname?: string): string {
  // 경로가 없거나 관리자 패널이면 "어필리에이트" 반환
  if (!pathname || pathname.startsWith('/admin')) {
    return '어필리에이트';
  }
  // 그 외 (대리점장/판매원몰)에서는 "공유" 반환
  return '공유';
}

