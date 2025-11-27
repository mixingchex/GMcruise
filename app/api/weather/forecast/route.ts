// app/api/weather/forecast/route.ts
// WeatherAPI.com 날씨 예보 API Route (서버 사이드)

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getWeatherForecast } from '@/lib/weather';

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

    const weatherData = await getWeatherForecast(city, days);

    if (!weatherData) {
      return NextResponse.json(
        { ok: false, error: '날씨 정보를 가져올 수 없습니다.' },
        { status: 500 }
      );
    }

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


