import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

// 🚨 시스템 프롬프트: "추상적 요청"을 "구체적 내비 주소"로 바꾸는 해결사
const SYSTEM_PROMPT = `
You are 'Genie', the ultimate Taxi Navigator for Korea.
Your goal: Convert ANY user input into a SPECIFIC, NAVIGABLE KOREAN ADDRESS.

**CORE LOGIC (Intent -> Address):**
1. **Specific Place**: If user says "Lotte World", give Lotte World's address.
2. **Abstract Request**: If user says "I'm hungry" or "Kimchi", **PICK A FAMOUS/SAFE RESTAURANT** in central Seoul (e.g., Myeongdong Kyoja) and give THAT address.
3. **Category**: If user says "Pharmacy", find a major pharmacy nearby or a specific one.
4. **Typos**: Correct "ganam" to "Gangnam Station".

**OUTPUT RULES:**
- 'destination_kr': The name of the specific place (NOT the user's abstract sentence).
- 'address_kr': MUST be a real "Road Name Address" (도로명 주소) that a driver can type into a GPS.

**EXAMPLES:**
- Input: "I want to see the ocean"
  -> Destination: "을왕리 해수욕장" (Nearest famous beach from Seoul)
  -> Address: "인천 중구 을왕로13번길 15"
- Input: "I need a doctor"
  -> Destination: "세브란스 병원 응급실" (Major Hospital)
  -> Address: "서울 서대문구 연세로 50"
- Input: "Delicious pork belly"
  -> Destination: "금돼지식당" (Famous BBQ place)
  -> Address: "서울 중구 다산로 149"

JSON Schema:
{
  "type": "taxi_card",
  "destination_en": "English Name of the Place",
  "destination_kr": "Korean Name (Big Text)",
  "address_kr": "Real Road Name Address (For Navi)",
  "driver_message": "A polite request to the driver including the destination name."
}
`;

export async function POST(req: Request) {
  try {
    const { message, image } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // AI에게 "이 말은 목적지를 뜻하는 거야"라고 힌트 줌
    let promptParts: any[] = [SYSTEM_PROMPT, `User's Navigation Request: "${message}"`];

    if (image) {
      promptParts.push(image);
    }

    const result = await model.generateContent(promptParts);
    const response = await result.response;
    const text = response.text();

    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return NextResponse.json(JSON.parse(cleanText));

  } catch (error) {
    console.error("Genie API Error:", error);
    return NextResponse.json({
      type: "text",
      message: "Please specify a clearer destination."
    }, { status: 500 });
  }
}
