'use client';

import { useState, useCallback } from 'react';
import ChatShell from '@/components/ChatShell';
import { ChatMessage } from '@/lib/chat-types';
import { ChatInputPayload } from './types';
import { findOrigins, findDestinations, isCruise } from '@/lib/nav/selector';
import { gmapsDir, gmapsNearby } from '@/lib/nav/urls';

type Mode = 'go' | 'show' | 'free';
type Msg = { role: 'user' | 'assistant'; text?: string; };

interface ChatPageClientProps {
  initialTrip?: { cruiseName?: string; destinations?: string[]; start?: string; end?: string };
}

export default function ChatPageClient({ initialTrip }: ChatPageClientProps) {
  const [input, setInput] = useState(''); // Add input state

  const onSend = useCallback(async (payload: ChatInputPayload) => {
    console.log('Sending message:', payload);
    const { text, mode } = payload;

    if (mode === 'go') {
      const parts = text.split('에서').map(s => s.trim());
      let origin = '';
      let destination = '';

      if (parts.length === 2) {
        origin = parts[0];
        destination = parts[1].replace('까지', '').trim();
      } else {
        destination = text;
      }

      let responseText = '';
      let links = '';

      if (destination) {
        const dests = findDestinations(destination, origin);
        if (dests.length > 0) {
          const dest = dests[0]; // Prioritize the first matching destination
          responseText += `${dest.name_ko}으로 가는 길을 알려드릴게요.\n\n`;

          const originQ = origin || '현재 위치';

          // Transit option
          links += `- [대중교통 길찾기](${gmapsDir(originQ, dest.name_ko || dest.name, 'transit')})\n`;
          // Driving option
          links += `- [자동차 길찾기](${gmapsDir(originQ, dest.name_ko || dest.name, 'driving')})\n`;

          responseText += links;

          responseText += `\n실시간 소요시간·영업시간은 링크에서 자동 갱신됩니다.\n`;
          responseText += `네, 터미널에 대한 사진을 찾았어요! 🎉 모든 사진을 보여드릴게요!`;

        } else if (destination.includes('근처') || destination.includes('near')) {
          const keyword = destination.replace(/\s*(근처|near)/i, '').trim();
          responseText += `${keyword} 근처 장소를 찾아드릴게요.\n\n`;
          links += `- [${keyword} 근처 검색](${gmapsNearby(keyword)})\n`;
          responseText += links;
          responseText += `\n실시간 소요시간·영업시간은 링크에서 자동 갱신됩니다.\n`;
          responseText += `네, 터미널에 대한 사진을 찾았어요! 🎉 모든 사진을 보여드릴게요!`;

        } else {
          responseText += `죄송합니다, \'${destination}\'에 대한 정보를 찾을 수 없습니다. 정확한 장소 이름을 알려주시거나 다른 검색어를 사용해주세요.`;
        }
      } else {
        responseText += `어디로 가고 싶으신가요? 출발지와 목적지를 말씀해주시면 길을 찾아드릴게요.`;
      }
      return [{ role: 'assistant', text: responseText }];
    }

    // 기존 로직 유지 (show, free 모드)
    return [{ role: 'assistant', text: `You said: ${payload.text}` }];
  }, []);

  return (
    <ChatShell
      initialTrip={initialTrip}
      onSend={onSend}
      input={input} // Pass input to ChatShell
      setInput={setInput} // Pass setInput to ChatShell
    />
  );
}
