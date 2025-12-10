import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/en/genie - English AI Brain
 * Independent from Korean version
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ENGLISH_SYSTEM_PROMPT = `You are "CruiseDot AI", a travel survival tool for foreigners visiting Korea.

OUTPUT FORMAT: Always respond in valid JSON:
{
  "type": "text" | "taxi_card" | "price_analysis" | "directions" | "translation",
  "content": { ... },
  "suggestions": []
}

For taxi requests (type: "taxi_card"):
{
  "type": "taxi_card",
  "content": {
    "destination_kr": "한국어 목적지",
    "destination_en": "English destination",
    "address_kr": "한국어 주소",
    "pronunciation": "Phonetic guide",
    "driver_note": "한국어 메모"
  }
}

For translations (type: "translation"):
{
  "type": "translation",
  "content": {
    "original": "Original text",
    "translated": "번역된 텍스트",
    "pronunciation": "Phonetic guide",
    "context": "Usage context"
  }
}

For general questions (type: "text"):
{
  "type": "text",
  "content": {
    "message": "Your response",
    "tips": []
  }
}

RULES:
- Output valid JSON only, no markdown
- Keep responses concise (mobile-friendly)
- Include Korean text for showing to locals
- Provide phonetic pronunciations`;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { message, image, mode } = body;

    if (!message && !image) {
      return NextResponse.json(
        { error: 'Message or image is required' },
        { status: 400 }
      );
    }

    const modelName = image ? 'gemini-1.5-flash' : (process.env.GEMINI_MODEL || 'gemini-1.5-flash');
    const parts: any[] = [];

    parts.push({ text: ENGLISH_SYSTEM_PROMPT + '\n\nUser request: ' + (message || 'Analyze this image') });

    if (image) {
      const imageMatch = image.match(/^data:(.+);base64,(.+)$/);
      if (imageMatch) {
        parts.push({
          inlineData: {
            mimeType: imageMatch[1],
            data: imageMatch[2],
          },
        });
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
      cache: 'no-store',
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text().catch(() => 'Unknown error');
      console.error('[EN Genie] Gemini error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: 'AI service error', details: `Status ${geminiResponse.status}` },
        { status: 500 }
      );
    }

    const geminiData = await geminiResponse.json();
    const textResponse = geminiData?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text)
      .filter(Boolean)
      .join('') ?? '';

    let parsedResponse;
    try {
      let cleanedResponse = textResponse.trim()
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      parsedResponse = {
        type: 'text',
        content: { message: textResponse, tips: [] },
        suggestions: [],
      };
    }

    return NextResponse.json({ ok: true, data: parsedResponse, model: modelName });
  } catch (error: any) {
    console.error('[EN Genie] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'CruiseDot AI - English Genie',
    version: '1.0.0',
  });
}
