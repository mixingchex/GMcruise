// app/api/weather/forecast/route.ts
// WeatherAPI.com 날씨 예보 API Route (서버 사이드)

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const days = parseInt(searchParams.get('days') || '14');

    if (!city) {
      return NextResponse.json(
        { ok: false, error: '도시명(city)이 필요합니다.' },
        { status: 400 }
      );
    }

    // 환경변수 직접 확인
    const apiKey = process.env.WEATHER_API_KEY;

    if (!apiKey) {
      console.error('[Weather API] WEATHER_API_KEY 환경변수가 설정되지 않았습니다.');
      return NextResponse.json(
        { ok: false, error: 'WEATHER_API_KEY 환경변수가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // WeatherAPI.com 직접 호출
    const response = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=${days}&lang=ko`,
      {
        cache: 'no-store' // 캐싱 비활성화
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Weather API] API 응답 오류:', response.status, errorText);
      return NextResponse.json(
        { ok: false, error: `날씨 API 요청 실패: ${response.status}` },
        { status: 500 }
      );
    }

    const weatherData = await response.json();

    return NextResponse.json({
      ok: true,
      data: weatherData,
    });
  } catch (error: any) {
    console.error('[Weather API] 오류:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '날씨 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


