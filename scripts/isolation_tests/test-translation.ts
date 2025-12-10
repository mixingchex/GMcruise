/**
 * 통번역 기능 테스트 스크립트
 * 각 언어별로 외국어→한국어 번역이 제대로 작동하는지 확인
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경변수 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

// 테스트할 언어별 샘플 문장 (외국어 → 한국어 번역)
const TEST_PHRASES: Record<string, { code: string; text: string; expectedMeaning: string }> = {
  영어: { code: 'en-US', text: 'Where is the bathroom?', expectedMeaning: '화장실이 어디예요?' },
  일본어: { code: 'ja-JP', text: 'トイレはどこですか？', expectedMeaning: '화장실이 어디예요?' },
  중국어: { code: 'zh-CN', text: '厕所在哪里？', expectedMeaning: '화장실이 어디예요?' },
  광둥어: { code: 'zh-HK', text: '洗手間喺邊度？', expectedMeaning: '화장실이 어디예요?' },
  대만어: { code: 'zh-TW', text: '洗手間在哪裡？', expectedMeaning: '화장실이 어디예요?' },
  태국어: { code: 'th-TH', text: 'ห้องน้ำอยู่ที่ไหน?', expectedMeaning: '화장실이 어디예요?' },
  베트남어: { code: 'vi-VN', text: 'Nhà vệ sinh ở đâu?', expectedMeaning: '화장실이 어디예요?' },
  인도네시아어: { code: 'id-ID', text: 'Di mana kamar mandi?', expectedMeaning: '화장실이 어디예요?' },
  말레이어: { code: 'ms-MY', text: 'Di mana bilik air?', expectedMeaning: '화장실이 어디예요?' },
  프랑스어: { code: 'fr-FR', text: 'Où sont les toilettes?', expectedMeaning: '화장실이 어디예요?' },
  이탈리아어: { code: 'it-IT', text: "Dov'è il bagno?", expectedMeaning: '화장실이 어디예요?' },
  스페인어: { code: 'es-ES', text: '¿Dónde está el baño?', expectedMeaning: '화장실이 어디예요?' },
  독일어: { code: 'de-DE', text: 'Wo ist die Toilette?', expectedMeaning: '화장실이 어디예요?' },
  러시아어: { code: 'ru-RU', text: 'Где находится туалет?', expectedMeaning: '화장실이 어디예요?' },
};

// 언어 이름을 영어로 변환 (translator/page.tsx와 동일한 매핑)
const LANGUAGE_MAP: Record<string, string> = {
  '한국어': 'Korean',
  '영어': 'English',
  '일본어': 'Japanese',
  '중국어': 'Simplified Chinese',
  '광둥어': 'Cantonese',
  '대만어': 'Traditional Chinese',
  '태국어': 'Thai',
  '베트남어': 'Vietnamese',
  '인도네시아어': 'Indonesian',
  '말레이어': 'Malay',
  '프랑스어': 'French',
  '이탈리아어': 'Italian',
  '스페인어': 'Spanish',
  '독일어': 'German',
  '러시아어': 'Russian',
};

async function testTranslation(langName: string, fromText: string): Promise<{ success: boolean; result: string; error?: string }> {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const fromEnglish = LANGUAGE_MAP[langName];
    const toEnglish = 'Korean';

    // /api/chat의 translate 모드와 동일한 프롬프트 사용
    const prompt = `You are a professional translator. Translate the following text from ${fromEnglish} to ${toEnglish}.

CRITICAL RULES:
1. Output ONLY the translated text in ${toEnglish}. Nothing else.
2. Do NOT include the original text.
3. Do NOT add any explanations, prefixes, or suffixes.
4. Do NOT write "Translation:" or "Result:" or any similar labels.
5. Preserve all numbers, prices, currency symbols, and special characters exactly.
6. Translate the entire text completely, even if it's long.
7. If the text contains proper nouns (like "지니가이드", "지니가이드 3일체험"), translate them appropriately to ${toEnglish}.
8. Maintain the same tone and style as the original.

Source language: ${fromEnglish}
Target language: ${toEnglish}

Text to translate:
"${fromText}"

Now translate and output ONLY the translation in ${toEnglish} (no labels, no explanations, just the translation):`;

    const result = await model.generateContent(prompt);
    const translated = result.response.text()?.trim() || '';

    // 불필요한 접두사 제거
    let cleanedTranslation = translated
      .replace(/^Translation\s*[:：]\s*/i, '')
      .replace(/^Result\s*[:：]\s*/i, '')
      .replace(/^번역\s*[:：]\s*/i, '')
      .replace(/^결과\s*[:：]\s*/i, '')
      .replace(/^Here\s+is\s+the\s+translation\s*[:：]\s*/i, '')
      .replace(/^The\s+translation\s+is\s*[:：]\s*/i, '')
      .replace(/^Translated\s+text\s*[:：]\s*/i, '')
      .trim();

    // 따옴표로 감싸진 경우 제거
    if ((cleanedTranslation.startsWith('"') && cleanedTranslation.endsWith('"')) ||
      (cleanedTranslation.startsWith("'") && cleanedTranslation.endsWith("'"))) {
      cleanedTranslation = cleanedTranslation.slice(1, -1).trim();
    }

    if (!cleanedTranslation || cleanedTranslation === fromText) {
      return { success: false, result: cleanedTranslation, error: '번역 실패 (원문과 동일)' };
    }

    return { success: true, result: cleanedTranslation };
  } catch (error: any) {
    return { success: false, result: '', error: error.message || '알 수 없는 오류' };
  }
}

async function main() {
  console.log('🧪 통번역 기능 테스트 시작...\n');
  console.log('=' .repeat(80));

  let successCount = 0;
  let failCount = 0;
  const failedLanguages: string[] = [];

  for (const [langName, { text, expectedMeaning }] of Object.entries(TEST_PHRASES)) {
    process.stdout.write(`테스트: ${langName} → 한국어... `);

    const { success, result, error } = await testTranslation(langName, text);

    if (success) {
      console.log('✅ 성공');
      console.log(`   원문: ${text}`);
      console.log(`   번역: ${result}`);
      console.log(`   기대: ${expectedMeaning}`);
      successCount++;
    } else {
      console.log('❌ 실패');
      console.log(`   원문: ${text}`);
      console.log(`   결과: ${result || '(없음)'}`);
      console.log(`   에러: ${error || '알 수 없음'}`);
      failedLanguages.push(langName);
      failCount++;
    }
    console.log('-'.repeat(80));

    // API 호출 간격
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('=' .repeat(80));
  console.log('\n📊 테스트 결과 요약:');
  console.log(`   총 테스트: ${successCount + failCount}개`);
  console.log(`   성공: ${successCount}개`);
  console.log(`   실패: ${failCount}개`);

  if (failedLanguages.length > 0) {
    console.log(`\n❌ 실패한 언어: ${failedLanguages.join(', ')}`);
  } else {
    console.log('\n✨ 모든 언어 번역 테스트 통과!');
  }
}

main().catch(console.error);
