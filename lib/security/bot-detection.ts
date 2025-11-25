/**
 * 봇 및 스크래퍼 탐지 유틸리티
 * User-Agent 기반 봇 차단 및 의심스러운 요청 탐지
 */

// 알려진 봇 User-Agent 패턴
const BOT_PATTERNS = [
  // 검색 엔진 봇 (허용)
  /googlebot/i,
  /bingbot/i,
  /slurp/i, // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /exabot/i,
  /facebot/i,
  /ia_archiver/i,
  
  // 스크래퍼 및 악성 봇 (차단)
  /scraper/i,
  /crawler/i,
  /spider/i,
  /bot/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /python-urllib/i,
  /java/i,
  /go-http-client/i,
  /node-fetch/i,
  /axios/i,
  /postman/i,
  /insomnia/i,
  /httpie/i,
  /rest-client/i,
  /apache-httpclient/i,
  /okhttp/i,
  /scrapy/i,
  /beautifulsoup/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /headless/i,
  /phantomjs/i,
  /casperjs/i,
  /nightmare/i,
  /webdriver/i,
  /chromedriver/i,
  /geckodriver/i,
];

// 허용된 검색 엔진 봇
const ALLOWED_BOTS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /exabot/i,
  /facebot/i,
  /ia_archiver/i,
];

/**
 * User-Agent가 봇인지 확인
 * @param userAgent User-Agent 문자열
 * @returns true if bot, false otherwise
 */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // User-Agent가 없으면 봇으로 간주
  
  const ua = userAgent.toLowerCase();
  
  // 허용된 검색 엔진 봇은 통과
  if (ALLOWED_BOTS.some(pattern => pattern.test(ua))) {
    return false;
  }
  
  // 차단할 봇 패턴 확인
  return BOT_PATTERNS.some(pattern => pattern.test(ua));
}

/**
 * 의심스러운 요청인지 확인
 * @param userAgent User-Agent 문자열
 * @param headers 요청 헤더
 * @returns true if suspicious, false otherwise
 */
export function isSuspiciousRequest(
  userAgent: string | null | undefined,
  headers: Headers | Record<string, string | string[] | undefined>
): boolean {
  // User-Agent가 없으면 의심스러움
  if (!userAgent) return true;
  
  // 일반적인 브라우저 헤더가 없으면 의심스러움
  const accept = headers['accept'] || headers['Accept'];
  const acceptLanguage = headers['accept-language'] || headers['Accept-Language'];
  const acceptEncoding = headers['accept-encoding'] || headers['Accept-Encoding'];
  
  // Accept 헤더가 없거나 비정상적이면 의심스러움
  if (!accept || typeof accept === 'string' && !accept.includes('text/html') && !accept.includes('application/json')) {
    return true;
  }
  
  // 일반적인 브라우저는 Accept-Language를 보냄
  if (!acceptLanguage) {
    return true;
  }
  
  return false;
}

/**
 * 스크래퍼 도구인지 확인
 * @param userAgent User-Agent 문자열
 * @returns true if scraper tool, false otherwise
 */
export function isScraperTool(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  
  const scraperPatterns = [
    /curl/i,
    /wget/i,
    /python-requests/i,
    /python-urllib/i,
    /scrapy/i,
    /beautifulsoup/i,
    /selenium/i,
    /puppeteer/i,
    /playwright/i,
    /headless/i,
    /phantomjs/i,
    /casperjs/i,
    /nightmare/i,
    /webdriver/i,
    /chromedriver/i,
    /geckodriver/i,
    /postman/i,
    /insomnia/i,
    /httpie/i,
    /rest-client/i,
  ];
  
  return scraperPatterns.some(pattern => pattern.test(userAgent));
}


