import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSampleProducts() {
  console.log('🚢 샘플 크루즈 상품 추가 시작...\n');

  try {
    // 기존 샘플 상품 삭제
    await prisma.cruiseProduct.deleteMany({
      where: {
        productCode: {
          in: [
            'LOTTE_MEDITERRANEAN_2025',
            'LOTTE_ALASKA_2025',
            'LOTTE_CARIBBEAN_2025',
            'CRUISEDOT_JAPAN_ONSEN_2025',
            'CRUISEDOT_SOUTHEAST_5_2025',
            'CRUISEDOT_MEDITERRANEAN_LUX_2025',
            'DOUBLEU_OKINAWA_2025',
            'DOUBLEU_NORTHERN_EUROPE_2025',
            'DOUBLEU_WORLD_CRUISE_2025'
          ]
        }
      }
    });

    // 1. 롯데JTB - 지중해 크루즈
    const product1 = await prisma.cruiseProduct.create({
      data: {
        productCode: 'LOTTE_MEDITERRANEAN_2025',
        cruiseLine: 'MSC 크루즈',
        shipName: 'MSC 벨리시마',
        packageName: '[롯데JTB] 지중해 크루즈 7박8일',
        nights: 7,
        days: 8,
        itineraryPattern: ['로마(치비타베키아)', '마르세유', '바르셀로나', '제노바'],
        basePrice: 2390000,
        description: `⛴️ MSC 벨리시마로 떠나는 지중해 낭만 크루즈!

🌟 상품 특징:
• 최신형 초대형 크루즈 MSC 벨리시마 탑승
• 지중해의 3대 보석 로마-마르셀유-바르셀로나 완전 정복
• 한국어 가이드 동행, 안심 여행
• 5성급 선상 호텔에서의 프리미엄 휴식

📍 여행 일정:
1일차: 인천 출발 → 로마(치비타베키아) 도착
2일차: 로마 자유 관광 → 승선
3일차: 해상 항해 (선내 시설 자유 이용)
4일차: 마르세유 기항 (프랑스 남부 관광)
5일차: 바르셀로나 기항 (가우디 건축물 관광)
6일차: 제노바 기항 (이탈리아 북부 관광)
7일차: 해상 항해 → 로마 도착
8일차: 로마 → 인천 귀국

🛳️ 선박 정보:
• 총톤수: 171,598톤
• 승객 정원: 4,500명
• 진수년도: 2019년
• 선내 시설: 레스토랑 12개, 바 20개, 극장, 카지노, 워터파크, 스파

💎 특별 혜택:
• 조식/중식/석식 뷔페 무제한 제공
• 선내 엔터테인먼트 무료 이용
• 무제한 와이파이 (프리미엄 패키지 구매 시)
• 면세점 쇼핑 할인 쿠폰`,
        source: 'lottejtb',
        category: '지중해',
        tags: ['MSC', '지중해', '유럽', '패밀리', '럭셔리'],
        isPopular: true,
        isRecommended: true,
        isPremium: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ 상품 1 추가: 롯데JTB 지중해 크루즈');

    // 2. 롯데JTB - 알래스카 크루즈
    const product2 = await prisma.cruiseProduct.create({
      data: {
        productCode: 'LOTTE_ALASKA_2025',
        cruiseLine: '프린세스 크루즈',
        shipName: '루비 프린세스',
        packageName: '[롯데JTB] 알래스카 빙하 크루즈 9박10일',
        nights: 9,
        days: 10,
        itineraryPattern: ['시애틀', '주노', '스캐그웨이', '케치칸', '빅토리아'],
        basePrice: 3790000,
        description: `❄️ 알래스카의 빙하와 야생동물을 만나는 프리미엄 크루즈!

🌟 상품 특징:
• 프린세스 크루즈 대형 선박 루비 프린세스 탑승
• 빙하 국립공원 근접 항해 (글레이셔 베이)
• 야생 고래, 바다사자, 독수리 관찰 기회
• 알래스카 골드러시 역사 체험

📍 여행 일정:
1일차: 인천 출발 → 시애틀 도착
2일차: 시애틀 관광 → 승선
3일차: 해상 항해 (인사이드 패시지)
4일차: 주노 기항 (알래스카 주도 관광)
5일차: 스캐그웨이 기항 (골드러시 마을)
6일차: 글레이셔 베이 크루징 (빙하 관람)
7일차: 케치칸 기항 (토템 폴 관람)
8일차: 빅토리아 기항 (캐나다)
9일차: 시애틀 하선 → 시내 관광
10일차: 시애틀 → 인천 귀국

🛳️ 선박 정보:
• 총톤수: 113,561톤
• 승객 정원: 3,080명
• 진수년도: 2008년
• 선내 시설: 레스토랑 14개, 극장, 카지노, 스파, 아트 갤러리

💎 특별 혜택:
• 빙하 크루징 최적 항로
• 알래스카 랜드 투어 옵션
• 야생동물 관찰 프로그램`,
        source: 'lottejtb',
        category: '알래스카',
        tags: ['프린세스', '알래스카', '빙하', '자연', '럭셔리'],
        isPopular: true,
        isPremium: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ 상품 2 추가: 롯데JTB 알래스카 크루즈');

    // 3. 롯데JTB - 카리브해 크루즈
    const product3 = await prisma.cruiseProduct.create({
      data: {
        productCode: 'LOTTE_CARIBBEAN_2025',
        cruiseLine: '로얄캐리비안',
        shipName: '심포니 오브 더 시즈',
        packageName: '[롯데JTB] 카리브해 환상 크루즈 8박9일',
        nights: 8,
        days: 9,
        itineraryPattern: ['마이애미', '코즈멜', '로아탄', '코스타마야', '나소'],
        basePrice: 3290000,
        description: `🏝️ 세계 최대 크루즈선으로 떠나는 카리브해 천국!

🌟 상품 특징:
• 세계 최대 크루즈선 심포니 오브 더 시즈 탑승
• 카리브해 최고의 에메랄드 빛 바다
• 선상 워터파크, 아이스링크, 서핑 시뮬레이터
• 완벽한 가족 휴가

📍 여행 일정:
1일차: 인천 출발 → 마이애미 도착
2일차: 마이애미 → 승선
3일차: 코즈멜 기항 (멕시코 마야 유적지)
4일차: 로아탄 기항 (온두라스 스노클링)
5일차: 코스타마야 기항 (마야 문명 체험)
6일차: 해상 항해 (선내 엔터테인먼트)
7일차: 나소 기항 (바하마 아틀란티스)
8일차: 마이애미 하선 → 시내 관광
9일차: 마이애미 → 인천 귀국

🛳️ 선박 정보:
• 총톤수: 228,081톤 (세계 최대급)
• 승객 정원: 6,680명
• 진수년도: 2018년
• 선내 시설: 레스토랑 20개, 워터파크, 아이스링크, 서핑장, 집라인

💎 특별 혜택:
• 세계 최대 크루즈선 체험
• 카리브해 완벽한 날씨
• 다양한 해양 액티비티`,
        source: 'lottejtb',
        category: '카리브해',
        tags: ['로얄캐리비안', '카리브해', '패밀리', '액티비티', '대형선'],
        isPopular: true,
        isMainProduct: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ 상품 3 추가: 롯데JTB 카리브해 크루즈');

    // 4. 크루즈닷 - 일본 온천 크루즈
    const product4 = await prisma.cruiseProduct.create({
      data: {
        productCode: 'CRUISEDOT_JAPAN_ONSEN_2025',
        cruiseLine: '코스타 크루즈',
        shipName: '코스타 세레나',
        packageName: '[크루즈닷] 일본 온천 크루즈 4박5일',
        nights: 4,
        days: 5,
        itineraryPattern: ['부산', '후쿠오카', '벳푸', '나가사키'],
        basePrice: 790000,
        description: `♨️ 크루즈와 온천을 동시에! 일본 규슈 온천 여행

🌟 상품 특징:
• 부산 출발 노비자 여행
• 벳푸 온천 온천 체험 포함
• 후쿠오카 쇼핑 + 나가사키 관광
• 가성비 최고의 단기 크루즈

📍 여행 일정:
1일차: 부산항 승선 → 출항
2일차: 후쿠오카 기항 (텐진, 하카타 쇼핑)
3일차: 벳푸 기항 (온천 체험, 지옥온천 관광)
4일차: 나가사키 기항 (하우스텐보스, 평화공원)
5일차: 부산항 하선

🛳️ 선박 정보:
• 총톤수: 114,500톤
• 승객 정원: 3,780명
• 진수년도: 2007년
• 선내 시설: 이탈리안 레스토랑, 극장, 카지노, 스파

💎 특별 혜택:
• 노비자 간편 여행
• 벳푸 온천 입장권 포함
• 전 일정 식사 제공`,
        source: 'cruisedot',
        category: '일본',
        tags: ['코스타', '일본', '온천', '단기', '가성비'],
        isPopular: true,
        isJapan: true,
        isBudget: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ 상품 4 추가: 크루즈닷 일본 온천 크루즈');

    // 5. 크루즈닷 - 동남아 5개국 크루즈
    const product5 = await prisma.cruiseProduct.create({
      data: {
        productCode: 'CRUISEDOT_SOUTHEAST_5_2025',
        cruiseLine: 'NCL',
        shipName: 'Norwegian Spirit',
        packageName: '[크루즈닷] 동남아 5개국 크루즈 10박11일',
        nights: 10,
        days: 11,
        itineraryPattern: ['싱가포르', '푸켓', '랑카위', '페낭', '포트클랑', '싱가포르'],
        basePrice: 2190000,
        description: `🌴 동남아시아 5개국을 한번에! 열대 낙원 크루즈

🌟 상품 특징:
• 싱가포르, 태국, 말레이시아 완전 정복
• 열대 해변과 이국적인 문화 체험
• 자유여행자를 위한 완벽한 루트
• 노르웨이언 크루즈 프리스타일 다이닝

📍 여행 일정:
1일차: 인천 출발 → 싱가포르 도착
2일차: 싱가포르 관광 → 승선
3일차: 해상 항해
4일차: 푸켓 기항 (태국 파통 비치)
5일차: 랑카위 기항 (말레이시아 면세섬)
6일차: 페낭 기항 (조지타운 유네스코)
7일차: 포트클랑 기항 (쿠알라룸푸르 투어)
8일차: 해상 항해
9일차: 싱가포르 하선 → 시내 관광
10일차: 센토사섬 자유 관광
11일차: 싱가포르 → 인천 귀국

🛳️ 선박 정보:
• 총톤수: 75,904톤
• 승객 정원: 1,966명
• 진수년도: 2004년
• 선내 시설: 프리스타일 레스토랑 10개, 극장, 카지노

💎 특별 혜택:
• 5개국 다양한 문화 체험
• 프리스타일 다이닝 (예약 불필요)
• 열대 해변 천국`,
        source: 'cruisedot',
        category: '동남아',
        tags: ['NCL', '동남아', '싱가포르', '태국', '말레이시아'],
        isRecommended: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ 상품 5 추가: 크루즈닷 동남아 5개국 크루즈');

    // 6. 크루즈닷 - 지중해 럭셔리 크루즈
    const product6 = await prisma.cruiseProduct.create({
      data: {
        productCode: 'CRUISEDOT_MEDITERRANEAN_LUX_2025',
        cruiseLine: '실버시 크루즈',
        shipName: '실버 뮤즈',
        packageName: '[크루즈닷] 지중해 럭셔리 크루즈 12박13일',
        nights: 12,
        days: 13,
        itineraryPattern: ['로마', '몬테카를로', '바르셀로나', '마요르카', '이비자', '발렌시아', '알리칸테'],
        basePrice: 10900000,
        description: `👑 최고급 럭셔리 크루즈로 즐기는 지중해

🌟 상품 특징:
• 6성급 올인클루시브 크루즈
• 전 객실 발코니, 집사 서비스
• 미슐랭 셰프 레스토랑
• 소규모 럭셔리 크루징 (596명)

📍 여행 일정:
1일차: 인천 출발 → 로마 도착
2일차: 로마 시내 관광 → 승선
3일차: 해상 항해
4일차: 몬테카를로 기항 (모나코 카지노)
5일차: 바르셀로나 기항 (가우디 건축)
6일차: 마요르카 기항 (발레아레스 제도)
7일차: 이비자 기항 (지중해 파티 아일랜드)
8일차: 발렌시아 기항 (스페인 문화)
9일차: 알리칸테 기항
10일차: 해상 항해
11일차: 로마 도착 → 시내 자유 관광
12일차: 바티칸, 콜로세움 관광
13일차: 로마 → 인천 귀국

🛳️ 선박 정보:
• 총톤수: 40,700톤
• 승객 정원: 596명 (소규모 럭셔리)
• 진수년도: 2017년
• 선내 시설: 미슐랭 레스토랑 8개, 스파, 갤러리, 도서관

💎 특별 혜택:
• 올인클루시브 (주류, 팁, 와이파이 포함)
• 집사 서비스
• 미슐랭 스타 셰프 요리
• VIP 소규모 크루징`,
        source: 'cruisedot',
        category: '지중해',
        tags: ['실버시', '지중해', '럭셔리', '올인클루시브', '소형선'],
        isPremium: true,
        isRecommended: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ 상품 6 추가: 크루즈닷 지중해 럭셔리 크루즈');

    // 7. 더블유 - 오키나와 단기 크루즈
    const product7 = await prisma.cruiseProduct.create({
      data: {
        productCode: 'DOUBLEU_OKINAWA_2025',
        cruiseLine: '스펙트럼 오브 더 시즈',
        shipName: '스펙트럼 오브 더 시즈',
        packageName: '[더블유] 오키나와 단기 크루즈 3박4일',
        nights: 3,
        days: 4,
        itineraryPattern: ['상하이', '오키나와', '상하이'],
        basePrice: 490000,
        description: `🌺 주말을 이용한 초단기 오키나와 여행!

🌟 상품 특징:
• 3박4일 초단기 일정
• 상하이 출발 저렴한 가격
• 오키나와 에메랄드 바다
• 최신 로얄캐리비안 선박

📍 여행 일정:
1일차: 인천 → 상하이 → 승선
2일차: 해상 항해 (선내 시설 이용)
3일차: 오키나와 기항 (나하 시내, 슈리성)
4일차: 상하이 하선 → 인천 귀국

🛳️ 선박 정보:
• 총톤수: 168,666톤
• 승객 정원: 4,180명
• 진수년도: 2019년
• 선내 시설: 스카이다이빙 시뮬레이터, 범퍼카, 서핑장

💎 특별 혜택:
• 초저가 단기 크루즈
• 최신형 선박
• 주말 여행 최적`,
        source: 'wcruise',
        category: '일본',
        tags: ['로얄캐리비안', '오키나와', '단기', '가성비', '주말여행'],
        isPopular: true,
        isBudget: true,
        isJapan: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ 상품 7 추가: 더블유 오키나와 단기 크루즈');

    // 8. 더블유 - 북유럽 4개국 크루즈
    const product8 = await prisma.cruiseProduct.create({
      data: {
        productCode: 'DOUBLEU_NORTHERN_EUROPE_2025',
        cruiseLine: 'P&O 크루즈',
        shipName: 'Iona',
        packageName: '[더블유] 북유럽 4개국 크루즈 11박12일',
        nights: 11,
        days: 12,
        itineraryPattern: ['런던', '코펜하겐', '스톡홀름', '헬싱키', '상트페테르부르크'],
        basePrice: 4290000,
        description: `🏰 북유럽의 동화같은 나라들을 탐험하다!

🌟 상품 특징:
• 영국, 덴마크, 스웨덴, 핀란드, 러시아 5개국
• 발트해 크루징의 정석
• 백야 체험 (6-8월 출발)
• P&O 크루즈 최신 LNG 선박

📍 여행 일정:
1일차: 인천 출발 → 런던 도착
2일차: 런던 관광 → 사우샘프턴 승선
3일차: 해상 항해
4일차: 코펜하겐 기항 (덴마크 인어공주)
5일차: 스톡홀름 기항 (스웨덴 구시가지)
6일차: 헬싱키 기항 (핀란드 사우나)
7-8일차: 상트페테르부르크 기항 (에르미타주 박물관)
9일차: 해상 항해
10일차: 사우샘프턴 하선 → 런던 관광
11일차: 런던 자유 관광
12일차: 런던 → 인천 귀국

🛳️ 선박 정보:
• 총톤수: 184,089톤
• 승객 정원: 5,200명
• 진수년도: 2020년 (최신)
• 선내 시설: LNG 친환경 선박, 스카이 돔, 극장

💎 특별 혜택:
• 백야 체험 (여름 시즌)
• 5개국 다채로운 문화
• 친환경 LNG 선박`,
        source: 'wcruise',
        category: '북유럽',
        tags: ['P&O', '북유럽', '발트해', '5개국', '친환경'],
        isRecommended: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ 상품 8 추가: 더블유 북유럽 4개국 크루즈');

    // 9. 더블유 - 세계일주 크루즈
    const product9 = await prisma.cruiseProduct.create({
      data: {
        productCode: 'DOUBLEU_WORLD_CRUISE_2025',
        cruiseLine: '큐나드',
        shipName: 'Queen Mary 2',
        packageName: '[더블유] 세계일주 크루즈 108박109일',
        nights: 108,
        days: 109,
        itineraryPattern: ['사우샘프턴', '뉴욕', '파나마운하', '로스앤젤레스', '하와이', '오클랜드', '시드니', '싱가포르', '뭄바이', '수에즈운하', '로마'],
        basePrice: 34900000,
        description: `🌍 평생의 버킷리스트! 108일 세계일주 크루즈

🌟 상품 특징:
• 큐나드 전설의 Queen Mary 2 탑승
• 5대륙 39개 항구 방문
• 파나마운하, 수에즈운하 통과 체험
• 세계에서 가장 유명한 대서양 횡단 크루즈선

📍 주요 일정 하이라이트:
Week 1-2: 유럽 → 대서양 횡단 → 뉴욕
Week 3-4: 카리브해 → 파나마운하 통과
Week 5-6: 태평양 → 하와이 → 타히티
Week 7-8: 뉴질랜드 → 호주 (오클랜드, 시드니)
Week 9-10: 동남아 (싱가포르, 말레이시아)
Week 11-12: 인도 → 중동
Week 13-14: 수에즈운하 → 지중해 → 유럽 귀항

🛳️ 선박 정보:
• 총톤수: 148,528톤
• 승객 정원: 2,691명
• 진수년도: 2004년 (전설의 명함)
• 선내 시설: 프라네타리움, 도서관 8,000권, 볼룸, 왕실 극장

💎 특별 혜택:
• 전설의 대양 횡단선 Queen Mary 2
• 5대륙 39개 항구 방문
• 파나마운하/수에즈운하 통과
• 평생 잊지 못할 세계일주
• 올인클루시브 옵션 가능`,
        source: 'wcruise',
        category: '세계일주',
        tags: ['큐나드', '세계일주', '대양횡단', '럭셔리', '버킷리스트'],
        isPremium: true,
        isMainProduct: true,
        isRecommended: true,
        updatedAt: new Date()
      }
    });
    console.log('✅ 상품 9 추가: 더블유 세계일주 크루즈');

    console.log('\n✨ 총 9개의 샘플 크루즈 상품이 성공적으로 추가되었습니다!\n');
    console.log('📊 상품 목록:');
    console.log('  롯데JTB (3개): 지중해, 알래스카, 카리브해');
    console.log('  크루즈닷 (3개): 일본 온천, 동남아 5개국, 지중해 럭셔리');
    console.log('  더블유 (3개): 오키나와, 북유럽 4개국, 세계일주\n');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addSampleProducts()
  .then(() => {
    console.log('🎉 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 실행 실패:', error);
    process.exit(1);
  });
