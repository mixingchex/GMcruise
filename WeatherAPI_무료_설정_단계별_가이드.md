# WeatherAPI.com 무료 플랜 설정 단계별 가이드

**목표**: 100명까지 무료로 14일 날씨 예보 제공

---

## 📋 전체 과정 요약

1. WeatherAPI.com 계정 생성 및 API 키 발급
2. Vercel 환경변수 설정
3. 코드 구현 (lib/weather.ts 생성)
4. DailyBriefingCard 수정 (더미 데이터 → 실제 API)
5. 테스트 및 배포

**소요 시간**: 약 20분

---

## 1단계: WeatherAPI.com 계정 생성 및 API 키 발급

### 1-1. 사이트 접속
1. 브라우저에서 다음 주소로 이동:
   ```
   https://www.weatherapi.com
   ```

2. 상단 오른쪽의 **"Sign Up"** 버튼 클릭

### 1-2. 회원가입
1. 다음 정보 입력:
   - **Email**: 실제 이메일 주소 (예: your-email@gmail.com)
   - **Password**: 강력한 비밀번호
   - **Confirm Password**: 비밀번호 재입력
   - **Full Name**: 이름 (예: 홍길동)
   - **Company** (선택): 회사명 (예: 크루즈가이드)

2. **"Create Account"** 버튼 클릭

3. 이메일 인증 (필요 시)
   - 이메일로 인증 링크 확인
   - 링크 클릭하여 계정 활성화

### 1-3. API 키 확인
1. 로그인 후 **Dashboard**로 자동 이동
   - 또는 상단 메뉴에서 **"Dashboard"** 클릭

2. **"API Key"** 섹션에서 키 확인
   - 예시: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
   - 키는 약 32자 길이의 영문+숫자 조합

3. **"Copy"** 버튼 클릭하여 키 복사
   - ⚠️ **중요**: 키를 안전한 곳에 저장 (한 번만 표시될 수 있음)

### 1-4. 무료 플랜 확인
- Dashboard에서 **"Free Plan"** 확인
- **하루 1,000회** 호출 제한 확인
- **14일 예보** 제공 확인

---

## 2단계: Vercel 환경변수 설정

### 2-1. Vercel 대시보드 접속
1. 브라우저에서 https://vercel.com 접속
2. 로그인
3. 프로젝트 선택 (cruise-guide 또는 해당 프로젝트)

### 2-2. 환경변수 설정 페이지 이동
1. 프로젝트 대시보드에서 **"Settings"** 클릭
2. 왼쪽 메뉴에서 **"Environment Variables"** 클릭

### 2-3. 환경변수 추가
1. **"Add New"** 또는 **"Add"** 버튼 클릭

2. 다음 정보 입력:
   - **Key (이름)**: `WEATHER_API_KEY`
   - **Value (값)**: WeatherAPI.com에서 복사한 API 키 붙여넣기
     - 예: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
     - ⚠️ **주의**: 앞뒤 공백 없이 정확히 복사
   - **Environment**: 
     - ✅ **Production** 체크
     - ✅ **Preview** 체크
     - ✅ **Development** 체크
     - (또는 **"All"** 선택)

3. **"Save"** 버튼 클릭

### 2-4. 재배포
1. 환경변수 추가 후 자동으로 재배포가 시작될 수 있음
2. 재배포가 자동으로 시작되지 않으면:
   - **"Deployments"** 탭 클릭
   - 최신 배포 옆 **"..."** 메뉴 클릭
   - **"Redeploy"** 선택

---

## 3단계: 코드 구현

### 3-1. lib/weather.ts 파일 생성

프로젝트 루트에서 `lib/weather.ts` 파일을 생성하고 다음 코드를 붙여넣기:

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
 * 1시간 캐시 적용 (Next.js 자동 캐싱)
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

    // 1시간 캐시 적용 (Next.js 자동 캐싱)
    const response = await fetch(
      `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=${days}&lang=ko`,
      { 
        next: { revalidate: 3600 } // 1시간 캐시
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Weather] API 오류:', response.status, errorText);
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

### 3-2. 파일 저장
- 파일 저장: `Ctrl+S` (Windows) 또는 `Cmd+S` (Mac)

---

## 4단계: DailyBriefingCard 수정

### 4-1. 파일 열기
- `app/chat/components/DailyBriefingCard.tsx` 파일 열기

### 4-2. import 추가
파일 상단에 다음 import 추가:

```typescript
import { getWeatherForecast, type WeatherResponse } from '@/lib/weather';
```

### 4-3. 더미 데이터 함수 주석 처리 또는 제거
`generateMonthlyWeather` 함수를 찾아서 주석 처리:

```typescript
// 30일치(1개월) 날씨 데이터 생성 (더미 데이터) - 더 이상 사용하지 않음
// const generateMonthlyWeather = (country: string, countryCode?: string) => {
//   ...
// };
```

### 4-4. 실제 API 사용 코드 추가
컴포넌트 내부에 다음 코드 추가:

```typescript
// 날씨 데이터 상태
const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
const [weatherLoading, setWeatherLoading] = useState(false);

// 날씨 데이터 가져오기
useEffect(() => {
  if (briefing?.destination) {
    setWeatherLoading(true);
    getWeatherForecast(briefing.destination, 14)
      .then((data) => {
        setWeatherData(data);
      })
      .catch((error) => {
        console.error('[DailyBriefingCard] 날씨 데이터 가져오기 실패:', error);
      })
      .finally(() => {
        setWeatherLoading(false);
      });
  }
}, [briefing?.destination]);
```

### 4-5. 날씨 표시 부분 수정
기존 더미 데이터를 사용하는 부분을 찾아서 다음 코드로 교체:

```typescript
{/* 날씨 정보 표시 */}
{weatherLoading ? (
  <div className="text-center py-4">
    <p className="text-sm text-gray-500">날씨 정보를 불러오는 중...</p>
  </div>
) : weatherData ? (
  <div className="space-y-3">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg">🌤️</span>
      <p className="text-sm font-semibold text-gray-700">
        {weatherData.location.name}, {weatherData.location.country}
      </p>
    </div>
    
    {/* 현재 날씨 */}
    <div className="bg-white rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">현재 날씨</p>
          <p className="text-2xl font-bold">{Math.round(weatherData.current.temp_c)}°C</p>
          <p className="text-sm text-gray-600">{weatherData.current.condition.text}</p>
        </div>
        <div className="text-4xl">{weatherData.current.condition.icon}</div>
      </div>
    </div>

    {/* 14일 예보 */}
    <div className="grid grid-cols-7 gap-2">
      {weatherData.forecast.forecastday.map((day, index) => (
        <div 
          key={index} 
          className="text-center p-2 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
        >
          <p className="text-xs text-gray-600 mb-1">
            {new Date(day.date).toLocaleDateString('ko-KR', { 
              month: 'short', 
              day: 'numeric',
              weekday: 'short'
            })}
          </p>
          <p className="text-2xl mb-1">{day.day.condition.icon}</p>
          <p className="text-sm font-bold text-gray-800">{Math.round(day.day.maxtemp_c)}°</p>
          <p className="text-xs text-gray-500">{Math.round(day.day.mintemp_c)}°</p>
          <p className="text-xs text-gray-600 mt-1 truncate">{day.day.condition.text}</p>
        </div>
      ))}
    </div>
  </div>
) : (
  <div className="text-center py-4">
    <p className="text-sm text-gray-500">날씨 정보를 불러올 수 없습니다.</p>
  </div>
)}
```

---

## 5단계: 테스트 및 배포

### 5-1. 로컬 테스트
1. 터미널에서 프로젝트 실행:
   ```bash
   npm run dev
   ```

2. 브라우저에서 테스트:
   - 지니 브리핑 페이지 접속
   - 날씨 정보가 표시되는지 확인
   - 14일 예보가 정상적으로 표시되는지 확인

### 5-2. Git 커밋 및 푸시
```bash
git add lib/weather.ts
git add app/chat/components/DailyBriefingCard.tsx
git commit -m "feat: WeatherAPI.com 연동 - 14일 날씨 예보 추가"
git push
```

### 5-3. Vercel 자동 배포 확인
- Vercel 대시보드에서 배포 상태 확인
- 배포 완료 후 프로덕션 환경에서 테스트

---

## ✅ 체크리스트

### 계정 및 API 키
- [ ] WeatherAPI.com 계정 생성 완료
- [ ] API 키 발급 완료
- [ ] API 키 복사 및 안전한 곳에 보관

### Vercel 설정
- [ ] Vercel 환경변수에 `WEATHER_API_KEY` 추가
- [ ] Production, Preview, Development 모두 선택
- [ ] 재배포 완료

### 코드 구현
- [ ] `lib/weather.ts` 파일 생성 완료
- [ ] `DailyBriefingCard.tsx` 수정 완료
- [ ] 더미 데이터 함수 제거 또는 주석 처리
- [ ] 실제 API 호출 코드 추가

### 테스트
- [ ] 로컬 환경에서 테스트 완료
- [ ] 날씨 정보 정상 표시 확인
- [ ] 14일 예보 정상 표시 확인
- [ ] 프로덕션 환경에서 테스트 완료

---

## 🎯 호출량 모니터링

### 예상 호출량
- **20개 지역 × 1시간 캐시 = 하루 480회**
- WeatherAPI.com 무료 플랜: **하루 1,000회** → ✅ 충분

### 모니터링 방법
1. WeatherAPI.com Dashboard에서 호출량 확인
2. Vercel 로그에서 API 호출 확인
3. 하루 1,000회 초과 시 Starter 플랜 ($4/월) 고려

---

## 🆘 문제 해결

### "WEATHER_API_KEY가 설정되지 않았습니다" 오류
- **원인**: 환경변수가 설정되지 않았거나 재배포가 안 됨
- **해결**: 
  1. Vercel 환경변수 확인
  2. 재배포 실행
  3. 서버 재시작

### "날씨 API 요청 실패: 401" 오류
- **원인**: API 키가 잘못되었거나 만료됨
- **해결**: 
  1. WeatherAPI.com Dashboard에서 API 키 확인
  2. Vercel 환경변수 값 확인
  3. 재배포

### 날씨 정보가 표시되지 않음
- **원인**: 도시명이 잘못되었거나 API 호출 실패
- **해결**: 
  1. 브라우저 콘솔에서 오류 확인
  2. 서버 로그 확인
  3. 도시명 확인 (영문 도시명 사용 권장)

---

## 🎉 완료!

**이제 100명까지 무료로 14일 날씨 예보를 제공할 수 있습니다!**

- ✅ **비용**: $0 (무료)
- ✅ **예보 기간**: 14일
- ✅ **호출 제한**: 하루 1,000회 (충분)
- ✅ **상업적 사용**: 가능

**문제가 있으면 위의 문제 해결 섹션을 참고하세요!** 🌤️

