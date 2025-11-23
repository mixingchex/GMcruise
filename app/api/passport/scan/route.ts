import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resolveGeminiModelName } from '@/lib/ai/geminiModel';

// Node 런타임 사용 (Buffer 사용 가능)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * POST /api/passport/scan
 * 여권 이미지를 받아서 Gemini Vision AI로 정보를 추출합니다.
 */
export async function POST(req: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'GEMINI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: '이미지 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // 파일을 Buffer로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64String = buffer.toString('base64');

    // Gemini 모델 사용 (기존 vision API와 동일하게)
    const modelName = resolveGeminiModelName();
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.1, // 낮은 temperature로 빠르고 정확하게
        maxOutputTokens: 300, // 출력 토큰 제한 (속도 향상)
      }
    });

    // 최적화된 짧은 프롬프트 (속도 향상)
    const prompt = `여권 정보를 JSON으로만 추출:
{"korName":"한글명","engSurname":"영문성","engGivenName":"영문이름","passportNo":"여권번호","nationality":"국적코드","dateOfBirth":"YYYY-MM-DD","passportExpiryDate":"YYYY-MM-DD"}`;

    // Gemini Vision API 호출 (기존 vision API와 동일한 형식)
    console.log('[Passport Scan] Gemini API 호출 시작... 모델:', modelName);
    const result = await model.generateContent([
      { text: prompt },
      { 
        inlineData: { 
          data: base64String, 
          mimeType: file.type || 'image/jpeg' 
        } 
      },
    ]);

    const response = await result.response;
    const text = response.text();

    console.log('[Passport Scan] Gemini 응답:', text);
    console.log('[Passport Scan] 응답 길이:', text.length);

    // JSON 파싱
    let passportData;
    try {
      // Gemini가 가끔 마크다운 코드 블록으로 감싸서 반환하는 경우 처리
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        passportData = JSON.parse(jsonMatch[0]);
      } else {
        passportData = JSON.parse(text);
      }
    } catch (parseError) {
      console.error('[Passport Scan] JSON 파싱 실패:', text);
      return NextResponse.json(
        { 
          ok: false, 
          error: '여권 정보를 읽을 수 없습니다. 선명한 이미지를 업로드해주세요.',
          rawResponse: text 
        },
        { status: 400 }
      );
    }

    // 데이터 검증
    if (!passportData.passportNo && !passportData.korName && !passportData.engSurname) {
      return NextResponse.json(
        { 
          ok: false, 
          error: '여권 정보를 읽을 수 없습니다. 여권의 정보면(사진이 있는 면)을 선명하게 촬영해주세요.' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: passportData,
    });
  } catch (error: any) {
    console.error('[Passport Scan] Error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        error: error.message || '여권 스캔 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}
