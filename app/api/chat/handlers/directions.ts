import { gmDirUrl } from '@/lib/maps';
import type { ChatMessage } from '@/lib/chat-types';

export function handleDirections(text: string): ChatMessage[] {
  const m = text.match(/(.+?)에서\s+(.+?)까지/);
  if (!m) {
    return [{ type:'text', text:'출발지와 도착지를 "A에서 B까지" 형식으로 입력해 주세요.' }];
  }
  const from = m[1].trim();
  const to   = m[2].trim();

  // gmDirUrl은 옵션 객체를 받습니다
  const drivingUrl = gmDirUrl({ 
    origin: from, 
    destination: to, 
    mode: 'driving' 
  });
  const transitUrl = gmDirUrl({ 
    origin: from, 
    destination: to, 
    mode: 'transit' 
  });

  return [
    { type:'text', text:`확인했어요.\n출발지: ${from}\n도착지: ${to}` },
    {
      type:'map-links',
      title:'길찾기',
      links:[
        { label:'🚗 자동차 길찾기(구글 지도)', href: drivingUrl },
        { label:'🚇 대중교통 길찾기(구글 지도)', href: transitUrl },
      ],
    },
    { type:'text', text:'새 창에서 열려요. 지도에서 **시작**만 누르시면 됩니다.' }
  ];
}
