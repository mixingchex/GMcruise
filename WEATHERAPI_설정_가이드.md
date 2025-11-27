# WeatherAPI.com 설정 가이드 (14일 예보)

WeatherAPI.com을 사용하여 크루즈가이드에 14일 날씨 예보를 제공하는 방법입니다.

---

## 📋 목차
1. [WeatherAPI.com 계정 생성](#1-weatherapicom-계정-생성)
2. [API 키 발급](#2-api-키-발급)
3. [Vercel 환경변수 설정](#3-vercel-환경변수-설정)
4. [코드 구현](#4-코드-구현)
5. [캐싱 전략](#5-캐싱-전략)

---

## 1. WeatherAPI.com 계정 생성

### 1-1. 사이트 접속
1. 브라우저에서 다음 주소로 이동:
   ```
   https://www.weatherapi.com
   ```

2. 상단 오른쪽의 **"Sign Up"** 버튼 클릭

### 1-2. 회원가입
1. 다음 정보 입력:
   - **Email**: 실제 이메일 주소
   - **Password**: 강력한 비밀번호
   - **Confirm Password**: 비밀번호 재입력
   - **Full Name**: 이름
   - **Company** (선택): 회사명

2. **"Create Account"** 버튼 클릭

3. 이메일 인증 (필요 시)

---

## 2. API 키 발급

### 2-1. 로그인
1. WeatherAPI.com에서 **"Sign In"** 클릭
2. 이메일과 비밀번호 입력
3. 로그인

### 2-2. API 키 확인
1. 로그인 후 **Dashboard**로 이동
2. **"API Key"** 섹션에서 키 확인
   - 예시: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
   - 키는 약 32자 길이의 영문+숫자 조합

### 2-3. 플랜 확인
- **Free**: 하루 1,000회 호출
- **Starter ($4/월)**: 하루 10,000회 호출 (권장)
- **Business ($7/월)**: 하루 50,000회 호출

---

## 3. Vercel 환경변수 설정

### 3-1. Vercel 대시보드 접속
1. https://vercel.com 접속
2. 로그인
3. 프로젝트 선택

### 3-2. 환경변수 추가
1. **Settings** → **Environment Variables** 클릭
2. **"Add New"** 버튼 클릭
3. 다음 정보 입력:
   - **Key**: `WEATHER_API_KEY`
   - **Value**: WeatherAPI.com에서 발급받은 API 키
   - **Environment**: 
     - ✅ Production
     - ✅ Preview
     - ✅ Development
     - (또는 **"All"** 선택)

4. **"Save"** 버튼 클릭

### 3-3. 재배포
- 환경변수 추가 후 자동 재배포 또는 수동 Redeploy

---

## 4. 코드 구현

### 4-1. 날씨 API 함수 생성

`lib/weather.ts` 파일 생성:

```typescript
// lib/weather.ts
export interface WeatherForecast {
  date: string;
  day: {
    maxtemp_c: number;
    mintemp_c: number;
    condition: {
      text: string;
      icon: string;
    };
  };
  hour: Array<{
    time: string;
    temp_c: number;
    condition: {
      text: string;
      icon: string;
    };
  }>;
}

export interface WeatherResponse {
  location: {
    name: string;
    country: string;
  };
  current: {
    temp_c: number;
    condition: {
      text: string;
      icon: string;
    };
  };
  forecast: {
    forecastday: WeatherForecast[];
  };
}

/**
 * WeatherAPI.com을 사용하여 14일 날씨 예보 가져오기
 */
export async function getWeatherForecast(
  city: string,
  days: number = 14
): Promise<WeatherResponse | null> {
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    
    if (!apiKey) {
      console.warn('[Weather] WEATHER_API_KEY가 설정되지 않았습니다.');
      return null;
    }

    const response = await fetch(
      `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=${days}&lang=ko`,
      { 
        next: { revalidate: 3600 } // 1시간 캐시
      }
    );

    if (!response.ok) {
      throw new Error(`날씨 API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Weather] 날씨 정보 가져오기 실패:', error);
    return null;
  }
}

/**
 * 현재 날씨만 가져오기
 */
export async function getCurrentWeather(city: string) {
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    
    if (!apiKey) {
      return null;
    }

    const response = await fetch(
      `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}&lang=ko`,
      { 
        next: { revalidate: 3600 } // 1시간 캐시
      }
    );

    if (!response.ok) {
      throw new Error(`날씨 API 요청 실패: ${response.status}`);
    }

    const data = await response.json();
    return {
      location: data.location,
      current: data.current,
    };
  } catch (error) {
    console.error('[Weather] 현재 날씨 가져오기 실패:', error);
    return null;
  }
}
```

### 4-2. DailyBriefingCard 수정

`app/chat/components/DailyBriefingCard.tsx` 수정:

```typescript
// 기존 더미 데이터 함수 제거 또는 주석 처리
// const generateMonthlyWeather = (country: string, countryCode?: string) => { ... }

// 실제 API 사용 함수 추가
import { getWeatherForecast } from '@/lib/weather';

// 컴포넌트 내부에서 사용
const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);

useEffect(() => {
  if (briefing?.destination) {
    getWeatherForecast(briefing.destination, 14).then(setWeatherData);
  }
}, [briefing?.destination]);

// 날씨 표시 부분 수정
{weatherData ? (
  <div>
    <p className="text-sm text-gray-600">
      {weatherData.location.name}, {weatherData.location.country}
    </p>
    <div className="grid grid-cols-7 gap-2">
      {weatherData.forecast.forecastday.slice(0, 14).map((day, index) => (
        <div key={index} className="text-center">
          <p className="text-xs">{day.date}</p>
          <p className="text-lg">{day.day.condition.icon}</p>
          <p className="text-sm font-bold">{day.day.maxtemp_c}°</p>
          <p className="text-xs text-gray-500">{day.day.mintemp_c}°</p>
        </div>
      ))}
    </div>
  </div>
) : (
  <p className="text-sm text-gray-500">날씨 정보를 불러오는 중...</p>
)}
```

---

## 5. 캐싱 전략

### 5-1. Next.js 캐싱 (기본)
```typescript
// 1시간 캐시
{ next: { revalidate: 3600 } }
```

### 5-2. Redis 캐싱 (선택사항, 더 효율적)
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function getWeatherForecastCached(
  city: string,
  days: number = 14
): Promise<WeatherResponse | null> {
  const cacheKey = `weather:${city}:${days}`;
  
  // 캐시 확인
  const cached = await redis.get(cacheKey);
  if (cached) {
    return cached as WeatherResponse;
  }

  // API 호출
  const weather = await getWeatherForecast(city, days);
  
  if (weather) {
    // 1시간 캐시 저장
    await redis.setex(cacheKey, 3600, weather);
  }

  return weather;
}
```

### 5-3. 지역별 캐싱 전략
```typescript
// 인기 지역: 1시간 캐시
const popularCities = ['Seoul', 'Tokyo', 'Bangkok', 'Singapore'];
const cacheTime = popularCities.includes(city) ? 3600 : 10800; // 1시간 또는 3시간

// Redis 캐시
await redis.setex(cacheKey, cacheTime, weather);
```

---

## 📊 호출 최적화 계산

### 시나리오: 100개 지역 지원

#### 전략 1: 1시간 캐시
- 100개 지역 × 24회/일 = **하루 2,400회**
- WeatherAPI.com 무료: ❌ 부족 (1,000회 제한)
- WeatherAPI.com Starter: ✅ 충분 (10,000회)

#### 전략 2: 3시간 캐시
- 100개 지역 × 8회/일 = **하루 800회**
- WeatherAPI.com 무료: ✅ 가능 (1,000회 제한)

#### 전략 3: 인기 지역 우선
- 인기 30개 지역: 1시간 캐시 = 720회/일
- 일반 70개 지역: 3시간 캐시 = 560회/일
- **총 1,280회/일**
- WeatherAPI.com 무료: ⚠️ 초과 (Starter 권장)

---

## ✅ 체크리스트

- [ ] WeatherAPI.com 계정 생성 완료
- [ ] API 키 발급 완료
- [ ] Vercel 환경변수에 `WEATHER_API_KEY` 추가
- [ ] 코드 구현 완료
- [ ] 캐싱 전략 적용
- [ ] 테스트 완료
- [ ] 필요시 Starter 플랜 업그레이드 ($4/월)

---

## 🎯 결론

**WeatherAPI.com을 사용하면 14일 예보를 제공할 수 있습니다!**

- ✅ **14일 예보** (OpenWeather는 5일만)
- ✅ **저렴한 비용** ($4/월로 충분)
- ✅ **적절한 캐싱으로 효율적 사용 가능**

**구현 후 더미 데이터를 실제 데이터로 교체하세요!** 🌤️


