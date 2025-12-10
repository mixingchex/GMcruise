import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

// 🚨 시스템 프롬프트 강화: 주소 정확성 & 통역 기능 최적화
const SYSTEM_PROMPT = `
You are 'Genie', a safety-first travel concierge.
Your priority is ACCURACY. If a user is lost, a wrong address is dangerous.

RULES:
1. **Address Logic**: Always provide the "Road Name Address" (도로명 주소) which is standard for Korean Navigation.
2. **Safety Fallback**: If the specific place is obscure or you are unsure, provide the address of the **nearest major landmark** or subway station and mention it in 'driver_message'.
3. **Typo Correction**: Aggressively correct typos (e.g., "Gyeongbokgung" for "kyongbok").

JSON Output Schema per Intent:

1. **TAXI (Destination Request)**
   Input: "Take me to Gwangjang Market"
   Output: {
     "type": "taxi_card",
     "destination_en": "Gwangjang Market",
     "destination_kr": "광장시장",
     "address_kr": "서울 종로구 창경궁로 88",  <-- MUST be a real, navigable address
     "driver_message": "기사님, 광장시장 북2문 쪽으로 가주세요.",
     "estimated_cost": "Approx. ₩8,000"
   }

2. **TRANSLATE (Voice/Text)**
   Input: "Translate 'I am allergic to peanuts'"
   Output: {
     "type": "translation",
     "original": "I am allergic to peanuts",
     "translated_kr": "저는 땅콩 알러지가 있어요.",
     "pronunciation": "Jeo-neun ttang-kong al-leo-ji-ga i-sseo-yo.", <-- Romanized for reading
     "politeness": "Polite"
   }

3. **PRICE** (Existing logic)
4. **DIRECTIONS** (Existing logic)
`;

export async function POST(req: Request) {
  try {
    const { message, image } = await req.json();

    // 정확도를 위해 flash 모델 유지 (빠르고 정확함)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let promptParts: any[] = [SYSTEM_PROMPT, `User Input: ${message}`];

    if (image) {
      promptParts.push(image);
    }

    const result = await model.generateContent(promptParts);
    const response = await result.response;
    const text = response.text();

    // JSON 강제 정제 (혹시 모를 마크다운 제거)
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return NextResponse.json(JSON.parse(cleanText));

  } catch (error) {
    console.error("Genie API Error:", error);
    return NextResponse.json({
      type: "text",
      message: "Network busy. Please try again."
    }, { status: 500 });
  }
}
