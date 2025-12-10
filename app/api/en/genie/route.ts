import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/en/genie - English AI Brain (Independent from Korean version)
 *
 * Features:
 * - Text Chat (General Q&A)
 * - Vision (Image Analysis for Price Check, Menu Translation, etc.)
 * - JSON Output for UI Rendering
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// System prompt for English AI
const ENGLISH_SYSTEM_PROMPT = `You are "CruiseDot AI", a travel survival tool for foreigners visiting Korea.

YOUR ROLE:
- Help tourists navigate Korea safely and easily
- Provide practical, actionable information
- Be concise and mobile-friendly in responses

OUTPUT FORMAT:
Always respond in valid JSON format with this structure:
{
  "type": "text" | "taxi_card" | "price_analysis" | "directions" | "translation",
  "content": {
    // Type-specific content
  },
  "suggestions": ["Follow-up action 1", "Follow-up action 2"]
}

RESPONSE TYPES:

1. For general questions (type: "text"):
{
  "type": "text",
  "content": {
    "message": "Your helpful response here",
    "tips": ["Tip 1", "Tip 2"]
  }
}

2. For taxi destination requests (type: "taxi_card"):
{
  "type": "taxi_card",
  "content": {
    "destination_kr": "한국어 목적지",
    "destination_en": "English destination",
    "address_kr": "한국어 주소",
    "pronunciation": "Phonetic guide",
    "driver_note": "Extra instruction for driver in Korean"
  }
}

3. For price analysis from images (type: "price_analysis"):
{
  "type": "price_analysis",
  "content": {
    "items": [{"name": "Item", "price_krw": 10000, "price_usd": 7.50, "is_fair": true}],
    "total_krw": 10000,
    "total_usd": 7.50,
    "verdict": "Fair price" | "Slightly overpriced" | "Tourist trap warning",
    "tip": "Helpful tip about the price"
  }
}

4. For directions (type: "directions"):
{
  "type": "directions",
  "content": {
    "from": "Starting point",
    "to": "Destination",
    "method": "subway" | "bus" | "taxi" | "walk",
    "steps": ["Step 1", "Step 2"],
    "estimated_time": "15 min",
    "estimated_cost": "1,400 KRW"
  }
}

5. For translations (type: "translation"):
{
  "type": "translation",
  "content": {
    "original": "Original text",
    "translated": "Translated text",
    "pronunciation": "Phonetic guide",
    "context": "When to use this phrase"
  }
}

IMPORTANT RULES:
- Always output valid JSON only, no markdown
- Keep responses concise (mobile-friendly)
- Include Korean text where helpful for showing to locals
- Provide phonetic pronunciations for Korean phrases
- Be culturally aware and practical`;

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

function getModelName(hasImage: boolean): string {
  // Use vision model for image analysis
  if (hasImage) {
    return process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash';
  }
  return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
}

export async function POST(req: NextRequest) {
  try {
    // Validate API key
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'API configuration error', details: 'Missing GEMINI_API_KEY' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { message, image, mode } = body;

    // Validate input
    if (!message && !image) {
      return NextResponse.json(
        { error: 'Bad request', details: 'Message or image is required' },
        { status: 400 }
      );
    }

    // Build request contents
    const hasImage = !!image;
    const modelName = getModelName(hasImage);

    // Build parts array
    const parts: any[] = [];

    // Add system prompt as first user message (Gemini pattern)
    parts.push({ text: ENGLISH_SYSTEM_PROMPT + '\n\nUser request: ' + (message || 'Analyze this image') });

    // Add image if provided (base64)
    if (image) {
      // Extract base64 data and mime type
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

    // Call Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.9,
          topK: 20,
        },
      }),
      cache: 'no-store',
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text().catch(() => 'Unknown error');
      console.error('[EN Genie API] Gemini error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: 'AI service error', details: `Status ${geminiResponse.status}` },
        { status: 500 }
      );
    }

    const geminiData = await geminiResponse.json();

    // Extract text response
    const textResponse = geminiData?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text)
      .filter(Boolean)
      .join('') ?? '';

    // Try to parse as JSON
    let parsedResponse;
    try {
      // Clean up response (remove markdown code blocks if present)
      let cleanedResponse = textResponse.trim();
      cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

      // Extract JSON object
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback to text response
      parsedResponse = {
        type: 'text',
        content: {
          message: textResponse,
          tips: [],
        },
        suggestions: [],
      };
    }

    return NextResponse.json({
      ok: true,
      data: parsedResponse,
      model: modelName,
    });
  } catch (error: any) {
    console.error('[EN Genie API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'CruiseDot AI - English Genie',
    version: '1.0.0',
  });
}
