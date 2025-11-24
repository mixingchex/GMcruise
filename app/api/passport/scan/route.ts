// 꼭 추가 ⬇️  Edge가 아닌 Node 런타임에서 실행 (Buffer 사용 가능)
export const runtime = 'nodejs';
// 이미지/파일 업로드는 캐시 X
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resolveGeminiModelName } from '@/lib/ai/geminiModel';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * POST /api/passport/scan
 * 여권 이미지를 받아서 Gemini Vision AI로 정보를 추출합니다.
 * 다양한 각도와 품질의 여권 사진도 인식 가능합니다.
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
    // 프론트엔드에서 'file' 또는 'passportImage' 둘 다 지원
    const file = (formData.get('file') || formData.get('passportImage')) as File | null;

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

    // Gemini 모델 사용 - OCR 정확도 향상을 위한 최적 설정
    const modelName = resolveGeminiModelName();
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0, // 가장 낮은 temperature로 일관성 있는 OCR 결과
        maxOutputTokens: 800, // 더 긴 응답을 위한 토큰 증가
        topP: 0.95,
        topK: 40,
      }
    });

    // 개선된 여권 정보 추출 프롬프트 (OCR 정확도 향상)
    const prompt = `This is a passport image. Please extract the information accurately even if the photo is blurry, tilted, or low quality.

IMPORTANT: You MUST return ONLY a JSON object. No other text, explanation, or markdown.

Extract the following information in this EXACT JSON format:
{
  "korName": "Korean name if visible (e.g., 홍길동), or empty string if not found",
  "engSurname": "English surname/family name in CAPITAL LETTERS (e.g., HONG)",
  "engGivenName": "English given name in CAPITAL LETTERS (e.g., GILDONG)",
  "passportNo": "Passport number (e.g., M12345678)",
  "nationality": "3-letter nationality code (e.g., KOR, USA, JPN)",
  "sex": "Gender: M for male, F for female (single letter only)",
  "dateOfBirth": "Date of birth in YYYY-MM-DD format (e.g., 1990-01-15)",
  "dateOfIssue": "Passport issue date in YYYY-MM-DD format (e.g., 2020-01-15)",
  "passportExpiryDate": "Passport expiry date in YYYY-MM-DD format (e.g., 2030-01-15)"
}

CRITICAL RULES:
1. Return ONLY the JSON object above. No markdown code blocks, no explanations.
2. If a field cannot be found, use empty string "".
3. Dates MUST be in YYYY-MM-DD format. Convert from YYMMDD or DDMMMYY if needed.
   - For 2-digit years: 00-49 = 20XX, 50-99 = 19XX
   - Month abbreviations: JAN=01, FEB=02, MAR=03, APR=04, MAY=05, JUN=06, JUL=07, AUG=08, SEP=09, OCT=10, NOV=11, DEC=12
4. Passport number: Remove all spaces and special characters.
5. English names: If format is "SURNAME/GIVEN NAME", split them correctly into surname and givenName.
6. Korean name: Look for Hangul characters (한글), usually at the bottom of passport.
7. Nationality: Must be exactly 3 uppercase letters (KOR, USA, CHN, JPN, etc).

Example passport fields to look for:
- Surname / 성
- Given names / 이름
- Passport No. / 여권번호
- Nationality / 국적
- Sex / 성별 (M or F, look for "Sex", "성별", or single letter M/F near other personal info)
- Date of birth / 생년월일 (look for "Date of birth", "생년월일", dates near beginning with DD MMM YYYY or YYMMDD format)
- Date of issue / 발급일 (look for "Date of issue", "발급일", dates between birth date and expiry date)
- Date of expiry / 만료일 (look for "Date of expiry", "만료일", dates usually 10 years after issue date)
- Personal No. / 주민등록번호 (ignore this field, do not extract)

If the image is rotated or upside down, still try to read it.
If text is partially visible, use context to infer missing characters.

Return ONLY the JSON object now:`;

    // Gemini Vision API 호출
    console.log('[Passport Scan] Gemini API 호출 시작...');
    console.log('[Passport Scan] 모델:', modelName);
    console.log('[Passport Scan] 이미지 크기:', buffer.length, 'bytes');
    console.log('[Passport Scan] 이미지 타입:', file.type);

    let result;
    try {
      result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            data: base64String,
            mimeType: file.type || 'image/jpeg'
          }
        },
      ]);
    } catch (apiError: any) {
      console.error('[Passport Scan] Gemini API 호출 실패:', apiError);
      console.error('[Passport Scan] 에러 메시지:', apiError.message);
      console.error('[Passport Scan] 에러 스택:', apiError.stack);

      return NextResponse.json(
        {
          ok: false,
          error: `AI 여권 인식 서비스에 오류가 발생했습니다.\n\n기술 정보: ${apiError.message}\n\n해결 방법:\n- 이미지 크기를 줄여보세요 (최대 5MB 권장)\n- 다른 이미지 형식으로 변환해보세요\n- 잠시 후 다시 시도해주세요`,
          technicalError: apiError.message,
          errorStack: apiError.stack
        },
        { status: 500 }
      );
    }

    let response;
    let text;
    try {
      response = await result.response;
      text = response.text();
    } catch (responseError: any) {
      console.error('[Passport Scan] Gemini 응답 처리 실패:', responseError);

      return NextResponse.json(
        {
          ok: false,
          error: 'AI 응답을 처리할 수 없습니다.\n\n잠시 후 다시 시도해주세요.',
          technicalError: responseError.message
        },
        { status: 500 }
      );
    }

    console.log('[Passport Scan] Gemini 응답:', text);
    console.log('[Passport Scan] 응답 길이:', text.length);

    if (!text || text.trim() === '') {
      console.error('[Passport Scan] 빈 응답 수신');
      return NextResponse.json(
        {
          ok: false,
          error: 'AI가 빈 응답을 반환했습니다.\n\n가능한 원인:\n- 이미지가 너무 흐릿합니다\n- 이미지가 여권이 아닙니다\n- 이미지가 손상되었습니다\n\n더 선명한 여권 사진을 업로드해주세요.',
          rawResponse: text,
          technicalError: 'Empty response from AI'
        },
        { status: 400 }
      );
    }

    // JSON 파싱 (개선된 에러 처리)
    let passportData;
    try {
      // 1. 마크다운 코드 블록 제거 (```json ... ``` 또는 ``` ... ```)
      let cleanedText = text.trim();
      cleanedText = cleanedText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');

      // 2. JSON 객체 추출
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        passportData = JSON.parse(jsonMatch[0]);
      } else {
        passportData = JSON.parse(cleanedText);
      }

      // 3. 필수 필드 검증
      if (typeof passportData !== 'object' || passportData === null) {
        throw new Error('Invalid JSON structure');
      }

      console.log('[Passport Scan] 파싱 성공:', passportData);
    } catch (parseError: any) {
      console.error('[Passport Scan] JSON 파싱 실패:', parseError.message);
      console.error('[Passport Scan] 원본 응답:', text);

      return NextResponse.json(
        {
          ok: false,
          error: '여권 정보를 읽을 수 없습니다. 여권의 정보면(사진이 있는 면)을 더 선명하게 촬영해주세요.\n\n💡 팁:\n- 밝은 곳에서 촬영하세요\n- 여권을 평평하게 놓고 정면에서 촬영하세요\n- 반사광이 없도록 주의하세요\n- 모든 텍스트가 보이도록 전체를 촬영하세요',
          rawResponse: text,
          technicalError: parseError.message
        },
        { status: 400 }
      );
    }

    // 데이터 검증 및 정규화
    const normalizedData = {
      korName: passportData.korName || '',
      engSurname: passportData.engSurname || '',
      engGivenName: passportData.engGivenName || '',
      passportNo: (passportData.passportNo || '').replace(/\s+/g, '').toUpperCase(),
      sex: (passportData.sex || '').toUpperCase().substring(0, 1), // M 또는 F만
      dateOfBirth: normalizeDate(passportData.dateOfBirth),
      dateOfIssue: normalizeDate(passportData.dateOfIssue),
      passportExpiryDate: normalizeDate(passportData.passportExpiryDate),
      nationality: (passportData.nationality || '').toUpperCase().substring(0, 3),
    };

    // 최소한 여권번호나 이름 중 하나는 있어야 함
    const hasPassportNo = normalizedData.passportNo && normalizedData.passportNo.length >= 8;
    const hasName = normalizedData.korName || normalizedData.engSurname;

    if (!hasPassportNo && !hasName) {
      console.error('[Passport Scan] 필수 정보 부족:', normalizedData);
      return NextResponse.json(
        {
          ok: false,
          error: '여권 정보를 읽을 수 없습니다.\n\n다음을 확인해주세요:\n✓ 여권의 정보면(사진이 있는 면)을 촬영했는지\n✓ 모든 텍스트가 선명하게 보이는지\n✓ 사진이 너무 어둡거나 밝지 않은지\n✓ 반사광이 텍스트를 가리지 않는지',
          rawResponse: text,
          extractedData: normalizedData
        },
        { status: 400 }
      );
    }

    // 경고: 일부 정보만 추출된 경우
    const warnings = [];
    if (!normalizedData.passportNo) warnings.push('여권번호');
    if (!normalizedData.engSurname) warnings.push('영문 성');
    if (!normalizedData.engGivenName) warnings.push('영문 이름');
    if (!normalizedData.sex) warnings.push('성별');
    if (!normalizedData.dateOfBirth) warnings.push('생년월일');
    if (!normalizedData.dateOfIssue) warnings.push('발급일');
    if (!normalizedData.passportExpiryDate) warnings.push('만료일');

    if (warnings.length > 0) {
      console.warn('[Passport Scan] 일부 정보 누락:', warnings.join(', '));
    }

    return NextResponse.json({
      ok: true,
      data: normalizedData,
      warnings: warnings.length > 0 ? `일부 정보를 읽지 못했습니다: ${warnings.join(', ')}. 수동으로 입력해주세요.` : null,
      rawText: text // 디버깅용 원본 응답
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

// 날짜 정규화 헬퍼 함수
function normalizeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  
  // 이미 YYYY-MM-DD 형식이면 그대로 반환
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // YYMMDD 형식 처리
  const cleaned = dateStr.replace(/[^0-9]/g, '');
  if (cleaned.length === 6) {
    const year = parseInt(cleaned.substring(0, 2));
    const month = cleaned.substring(2, 4);
    const day = cleaned.substring(4, 6);
    const fullYear = year < 50 ? `20${year.toString().padStart(2, '0')}` : `19${year.toString().padStart(2, '0')}`;
    return `${fullYear}-${month}-${day}`;
  }
  
  // YYYYMMDD 형식 처리
  if (cleaned.length === 8) {
    return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}`;
  }
  
  return dateStr;
}
