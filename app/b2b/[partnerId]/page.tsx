
import { PrismaClient } from '@prisma/client';
import B2BLandingClient from './B2BLandingClient';

const prisma = new PrismaClient();

// Default Template (Fallback)
const DEFAULT_TEMPLATE = `
<div class="min-h-screen bg-black text-white">
    <!-- 1. 시선 집중 (Hook) -->
    <section class="text-center pt-12 pb-20 px-4">
        <div class="max-w-4xl mx-auto">
            <h1 class="text-4xl md:text-6xl font-black leading-tight my-8">
                <span class="text-yellow-400">"비교불가 차원이 다른 압도적인 시스템"</span>
                <span class="block text-2xl md:text-3xl font-bold mt-4 text-gray-200">
                    고객을 '인솔'하고 '관리'하는<br />
                    크루즈 마케터 전문가 과정
                </span>
            </h1>

            <!-- 7일 체험 이미지 1-4 (2열 그리드 & 모달 확대) -->
            <div class="grid grid-cols-2 gap-4 mt-8 mb-8">
                 <div class="relative cursor-pointer group overflow-hidden rounded-lg shadow-lg aspect-[4/3]" onclick="window.openImage('https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492349_8859.jpg')">
                    <img src="https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492349_8859.jpg" alt="7일 체험 1" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div class="relative cursor-pointer group overflow-hidden rounded-lg shadow-lg aspect-[4/3]" onclick="window.openImage('https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492349_9565.jpg')">
                    <img src="https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492349_9565.jpg" alt="7일 체험 2" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div class="relative cursor-pointer group overflow-hidden rounded-lg shadow-lg aspect-[4/3]" onclick="window.openImage('https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492350_043.jpg')">
                    <img src="https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492350_043.jpg" alt="7일 체험 3" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div class="relative cursor-pointer group overflow-hidden rounded-lg shadow-lg aspect-[4/3]" onclick="window.openImage('https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492350_1041.jpg')">
                    <img src="https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492350_1041.jpg" alt="7일 체험 4" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                </div>
            </div>

            <!-- 새로운 헤드카피 -->
            <h2 class="text-3xl md:text-5xl font-black leading-tight text-white mb-8">
                "이제는 새로운 시대 입니다.<br />
                <span class="text-cyan-400">나만의 시스템으로 1인 여행사를 만들으세요"</span>
            </h2>

            <!-- GIF 이미지 -->
            <div class="mt-8 mb-8">
                <img src="https://leadgeny.kr/data/file/smarteditor2/2025-09-12/77e030891f0e61cdcb9d7d749405b536_1757613270_0684.gif" alt="크루즈 전문가 과정 소개" class="w-full max-w-4xl mx-auto rounded-lg shadow-2xl" loading="lazy" />
            </div>

            <div class="py-10 md:py-16">
                <h2 class="text-3xl md:text-5xl font-black text-white">단순 여행이 아닙니다.</h2>
                <p class="text-xl md:text-2xl font-bold text-cyan-400 mt-3">
                    '여행하며 수익을 창출하는' 전문 커리어입니다.
                </p>
            </div>

            <!-- 유튜브 영상 -->
            <div class="mt-8 rounded-lg overflow-hidden shadow-2xl max-w-4xl mx-auto" style="padding-bottom: 56.25%; position: relative; height: 0; background: #000;">
                <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/OIGkqQHfLgw?autoplay=1&mute=1&loop=1&playlist=OIGkqQHfLgw&modestbranding=1&iv_load_policy=3&controls=0" title="크루즈 마케터 소개 영상" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>

            <!-- 7일 무료 체험 혜택 안내 -->
            <div class="bg-gray-900 max-w-2xl mx-auto p-6 md:p-8 rounded-2xl shadow-2xl border border-cyan-500/50 mt-12">
                <h3 class="text-2xl md:text-3xl font-black text-center text-white mb-3">
                    <span class="text-yellow-400">7일 무료 마케터 체험</span>
                </h3>
                <p class="text-center text-lg text-cyan-400 font-bold mb-6">
                    지금 바로 시작하고, 크루즈 마케터 시스템을 직접 경험하세요!
                </p>

                <!-- 혜택 목록 -->
                <div class="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
                    <h4 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span class="text-2xl">🎁</span>
                        7일 동안 무료로 받는 혜택
                    </h4>
                    <ul class="space-y-3 text-gray-200 text-left">
                        <li class="flex items-start gap-3">
                            <span class="text-cyan-400 mt-1">✓</span>
                            <div><strong class="text-white">AI 세일즈 챗봇 '지니'</strong> - 24시간 고객 응대 지원</div>
                        </li>
                        <li class="flex items-start gap-3">
                            <span class="text-cyan-400 mt-1">✓</span>
                            <div><strong class="text-white">개인 판매몰 시스템</strong> - 즉시 판매 시작 가능</div>
                        </li>
                        <li class="flex items-start gap-3">
                            <span class="text-cyan-400 mt-1">✓</span>
                            <div><strong class="text-white">실시간 고객 관리</strong> - DB 관리 및 상담 기록</div>
                        </li>
                        <li class="flex items-start gap-3">
                            <span class="text-cyan-400 mt-1">✓</span>
                            <div><strong class="text-white">마케팅 자료 지원</strong> - 랜딩페이지 및 링크 생성</div>
                        </li>
                        <li class="flex items-start gap-3">
                            <span class="text-cyan-400 mt-1">✓</span>
                            <div><strong class="text-white">판매 수익 관리</strong> - 실시간 매출 및 정산 확인</div>
                        </li>
                    </ul>
                </div>

                <div class="bg-orange-900/30 border border-orange-500/50 rounded-xl p-4 mb-6">
                    <p class="text-center text-white font-bold text-base">
                        ⏰ 이름과 연락처만 입력하면<br />
                        <span class="text-yellow-400 text-lg">입력한 시점부터 7일간 무료</span>로 모든 기능을 사용할 수 있습니다!
                    </p>
                </div>

                <!-- FORM_TOP -->
                
                <p class="text-center text-xs text-gray-500 mt-4">
                    신청 즉시 서비스 이용이 가능합니다.
                </p>
            </div>
        </div>
    </section>

    <!-- 2. Before vs After -->
    <section class="py-20 bg-gray-900">
        <div class="max-w-4xl mx-auto px-4">
            <h2 class="text-3xl md:text-4xl font-black text-white text-center mt-12">
                월급 227만원 연구원, 평범한 주부에서...
            </h2>
            <p class="text-xl md:text-2xl font-bold text-cyan-400 text-center mt-3">
                여행을 '일'로 만드는 프로 마케터가 되기까지
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center my-8">
                <div class="text-center">
                    <img src="https://leadgeny.kr/data/file/smarteditor2/2025-06-26/b941a75d82cb776b1c7905af131243fa_1750946396_3068.png" alt="과거 연구원 시절" class="w-full rounded-lg shadow-xl" loading="lazy" />
                    <p class="font-bold text-lg mt-4">BEFORE</p>
                    <p class="text-gray-400">반복되는 일상, 정해진 월급</p>
                </div>
                <div class="text-center">
                    <img src="https://leadgeny.kr/data/file/smarteditor2/2025-06-26/b941a75d82cb776b1c7905af131243fa_1750946396_2474.png" alt="크루즈 스탭 활동" class="w-full rounded-lg shadow-xl border-2 border-yellow-400" loading="lazy" />
                    <p class="font-bold text-lg mt-4 text-yellow-400">AFTER</p>
                    <p class="text-gray-200">여행하며 수익을 창출하는 전문가</p>
                </div>
            </div>
        </div>
    </section>

    <!-- 3. 핵심 가치 제안 -->
    <section class="py-20 bg-black">
        <div class="max-w-4xl mx-auto px-4">
            <h2 class="text-3xl md:text-5xl font-black text-center mb-4">
                <span class="text-cyan-400">경쟁사는 흉내조차 낼 수 없습니다.</span>
                <br />왜 '마비즈'여야 하는가?
            </h2>
            <p class="text-lg text-center text-gray-300 mb-12">
                우리는 당신이 '진짜 전문가'가 될 수 있도록<br />
                업계 유일의 독점적인 기술을 지원합니다.
            </p>

            <h3 class="text-2xl font-bold text-white text-center mb-4">
                1. 고객이 엄지척 하는 <span class="text-yellow-400">AI 세일즈 챗봇</span> '지니'
            </h3>
            <div class="mb-12 rounded-lg overflow-hidden shadow-2xl max-w-4xl mx-auto" style="padding-bottom: 56.25%; position: relative; height: 0; background: #000;">
                <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/-p_6G69MgyQ?autoplay=1&mute=1&loop=1&playlist=-p_6G69MgyQ&modestbranding=1&iv_load_policy=3&controls=0" title="크루즈 AI 가이드 시스템" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- ... (Other features omitted for brevity, but should be included in full template) ... -->
                 <div>
                    <h3 class="text-2xl font-bold text-white text-center mb-4">2. <span class="text-yellow-400">대기업·중견기업</span> 협력</h3>
                    <img src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763276384_7279.jpg" alt="대기업 중견기업 협력" class="w-full rounded-lg shadow-xl" loading="lazy" />
                    <p class="text-center text-gray-300 mt-4">신뢰할 수 있는 국내 유수 기업들과의 제휴로 스탭 활동의 격을 높입니다.</p>
                </div>
                <div>
                    <h3 class="text-2xl font-bold text-white text-center mb-4">3. <span class="text-yellow-400">AI 세일즈 챗봇</span> 지원</h3>
                    <img src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763271257_8093.png" alt="크루즈 가이드 지니 세일즈 챗봇" class="w-full rounded-lg shadow-xl" loading="lazy" />
                    <p class="text-center text-gray-300 mt-4">24시간 고객을 응대하는 AI 챗봇이 당신의 영업사원이 되어 수익을 극대화합니다.</p>
                </div>
                 <div>
                    <h3 class="text-2xl font-bold text-white text-center mb-4">4. <span class="text-yellow-400">라이브 방송</span> 지원</h3>
                    <img src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763275311_9215.png" alt="크루즈 라이브 방송 카톡방 지원" class="w-full rounded-lg shadow-xl" loading="lazy" />
                    <p class="text-center text-gray-300 mt-4">고객과 실시간 소통하는 라이브 방송 및 카톡방 운영을 지원합니다.</p>
                </div>
                <div>
                    <h3 class="text-2xl font-bold text-white text-center mb-4">5. <span class="text-yellow-400">라이브 쇼핑</span> 지원</h3>
                    <img src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763275430_2282.gif" alt="크루즈 라이브 쇼핑 방송 지원" class="w-full rounded-lg shadow-xl" loading="lazy" />
                    <p class="text-center text-gray-300 mt-4">높은 전환율을 만드는 라이브 쇼핑 방송 시스템을 지원합니다.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- 4. 8가지 핵심 기능 -->
    <section class="py-20 bg-gray-900">
        <div class="max-w-4xl mx-auto px-4">
            <h2 class="text-3xl md:text-5xl font-black text-center mb-4">
                당신은 '교육'과 '고객'에만 집중하세요.<br />
                <span class="text-cyan-400">나머지는 본사가 모두 지원합니다.</span>
            </h2>
            <p class="text-lg text-center text-gray-300 mb-12">
                단순히 강의만 파는 곳과 비교를 거부합니다.<br />
                이것이 마비즈 수강생 95.7%가 수익을 내는 이유입니다.
            </p>

            <!-- 추가 이미지 4장 -->
            <div class="grid grid-cols-2 gap-4 mt-8 mb-12">
                 <div class="relative cursor-pointer group overflow-hidden rounded-lg shadow-lg aspect-[4/3]" onclick="window.openImage('https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492349_8859.jpg')">
                    <img src="https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492349_8859.jpg" alt="7일 체험 1" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div class="relative cursor-pointer group overflow-hidden rounded-lg shadow-lg aspect-[4/3]" onclick="window.openImage('https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492349_9565.jpg')">
                    <img src="https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492349_9565.jpg" alt="7일 체험 2" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div class="relative cursor-pointer group overflow-hidden rounded-lg shadow-lg aspect-[4/3]" onclick="window.openImage('https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492350_043.jpg')">
                    <img src="https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492350_043.jpg" alt="7일 체험 3" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div class="relative cursor-pointer group overflow-hidden rounded-lg shadow-lg aspect-[4/3]" onclick="window.openImage('https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492350_1041.jpg')">
                    <img src="https://leadgen.kr/data/file/smarteditor2/2025-11-30/e9ac5e0515cbeac8729782ba6c2d93d6_1764492350_1041.jpg" alt="7일 체험 4" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                </div>
            </div>

            <!-- 추가 유튜브 영상 -->
            <div class="mb-12 rounded-lg overflow-hidden shadow-2xl max-w-4xl mx-auto" style="padding-bottom: 56.25%; position: relative; height: 0; background: #000;">
                <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/a2M1OQIPAv8?autoplay=1&mute=1&loop=1&playlist=a2M1OQIPAv8&modestbranding=1&iv_load_policy=3&controls=0" title="크루즈 영상" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
                    <span class="text-3xl mr-4">🤖</span>
                    <div><h3 class="text-lg font-bold text-white mb-2">판매원 챗봇 AI (지니) 지원</h3><p class="text-sm text-gray-400">24시간 나를 대신해 고객을 응대하는 AI 비서</p></div>
                </div>
                <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
                    <span class="text-3xl mr-4">🛍️</span>
                    <div><h3 class="text-lg font-bold text-white mb-2">개인 판매원 몰 시스템 지원</h3><p class="text-sm text-gray-400">즉시 판매가 가능한 나만의 크루즈 쇼핑몰</p></div>
                </div>
                <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
                    <span class="text-3xl mr-4">💻</span>
                    <div><h3 class="text-lg font-bold text-white mb-2">100% 온라인 원격 교육</h3><p class="text-sm text-gray-400">언제 어디서든 학습 가능한 평생교육원 시스템</p></div>
                </div>
                <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
                    <span class="text-3xl mr-4">🤝</span>
                    <div><h3 class="text-lg font-bold text-white mb-2">1:1 멘토링 지원</h3><p class="text-sm text-gray-400">성공한 선배가 직접 이끄는 전담 멘토 시스템</p></div>
                </div>
                <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
                    <span class="text-3xl mr-4">🏢</span>
                    <div><h3 class="text-lg font-bold text-white mb-2">대기업·중견기업 연합</h3><p class="text-sm text-gray-400">신뢰할 수 있는 파트너사들과의 강력한 협력</p></div>
                </div>
                <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
                    <span class="text-3xl mr-4">🛳️</span>
                    <div><h3 class="text-lg font-bold text-white mb-2">100% 실무 교육 지원</h3><p class="text-sm text-gray-400">크루즈 탑승, 기항지 투어, 고객 인솔 실무</p></div>
                </div>
                <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
                    <span class="text-3xl mr-4">📈</span>
                    <div><h3 class="text-lg font-bold text-white mb-2">상위 1% 마케팅 교육</h3><p class="text-sm text-gray-400">고객을 끌어당기는 검증된 마케팅 비법</p></div>
                </div>
                <div class="bg-gray-800 p-6 rounded-lg border border-gray-700 flex items-start">
                    <span class="text-3xl mr-4">💰</span>
                    <div><h3 class="text-lg font-bold text-white mb-2">상위 1% 세일즈 전문 교육</h3><p class="text-sm text-gray-400">팔지 않아도 팔리는 압도적인 세일즈 전략</p></div>
                </div>
            </div>
        </div>
    </section>

    <!-- 5. 성장 과정 -->
    <section class="py-20 bg-black">
        <div class="max-w-4xl mx-auto px-4">
            <h2 class="text-3xl md:text-5xl font-black text-center mb-8">
                <span class="text-cyan-400">체계적인 성장 과정</span>입니다.
            </h2>
            <div class="bg-gray-900 p-8 rounded-2xl border border-gray-700">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                    <div><div class="bg-cyan-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-lg border-4 border-gray-900">1단계</div><p class="font-bold text-white mt-3">1주</p><p class="text-sm text-gray-400 leading-tight mt-1">크루즈 전문 교육과정</p></div>
                    <div><div class="bg-cyan-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-lg border-4 border-gray-900">2단계</div><p class="font-bold text-white mt-3">2주</p><p class="text-sm text-gray-400 leading-tight mt-1">크루즈 전문 인솔과정</p></div>
                    <div><div class="bg-cyan-700 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-lg border-4 border-gray-900">3단계</div><p class="font-bold text-white mt-3">3주</p><p class="text-sm text-gray-400 leading-tight mt-1">퍼포먼스 마케팅 과정</p></div>
                    <div><div class="bg-cyan-800 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 font-bold text-lg border-4 border-gray-900">4단계</div><p class="font-bold text-white mt-3">4주</p><p class="text-sm text-gray-400 leading-tight mt-1">95.7% 여행사 프리랜서 계약</p></div>
                </div>
            </div>
        </div>
    </section>

    <!-- 6. 수강생 후기 -->
    <section class="py-20 bg-gray-900">
        <div class="max-w-4xl mx-auto px-4">
            <h3 class="text-2xl md:text-3xl font-bold text-center mb-8 text-white">
                꾸며낸 후기가 아닌, <span class="text-cyan-400">진짜 수강생들의 목소리</span>입니다.
            </h3>
            <p class="text-center text-gray-400 mb-8">(수강생들의 동의 하에 공개합니다.)</p>
            <div class="grid grid-cols-2 gap-4">
                <img src="https://leadgeny.kr/data/file/smarteditor2/2025-06-26/b941a75d82cb776b1c7905af131243fa_1750943544_0562.png" alt="후기1" class="w-full rounded-lg shadow-xl" loading="lazy" />
                <img src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754193750_2256.png" alt="후기2" class="w-full rounded-lg shadow-xl" loading="lazy" />
                <img src="https://leadgeny.kr/data/file/smarteditor2/2025-06-26/b941a75d82cb776b1c7905af131243fa_1750943544_5234.png" alt="후기3" class="w-full rounded-lg shadow-xl" loading="lazy" />
                <img src="https://leadgeny.kr/data/file/smarteditor2/2025-06-26/b941a75d82cb776b1c7905af131243fa_1750943495_2443.png" alt="후기4" class="w-full rounded-lg shadow-xl" loading="lazy" />
                <img src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754194677_3697.png" alt="후기5" class="w-full rounded-lg shadow-xl" loading="lazy" />
                <img src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754194677_4423.png" alt="후기6" class="w-full rounded-lg shadow-xl" loading="lazy" />
            </div>
        </div>
    </section>

    <!-- 7. 실무 현장 사진 -->
    <section class="py-20 bg-black">
        <div class="max-w-4xl mx-auto px-4">
            <h3 class="text-2xl md:text-3xl font-bold text-center mb-12 text-white">
                이론이 아닙니다. <span class="text-cyan-400">100% 실무 현장</span>입니다.
            </h3>
            <div class="grid grid-cols-2 gap-4">
                <img src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763275229_9164.jpg" alt="실무1" class="w-full rounded-lg shadow-xl" loading="lazy" />
                <img src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763275230_1588.jpg" alt="실무2" class="w-full rounded-lg shadow-xl" loading="lazy" />
                <img src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763275230_6515.jpg" alt="실무3" class="w-full rounded-lg shadow-xl" loading="lazy" />
                <img src="https://leadgeny.kr/data/file/smarteditor2/2025-11-16/354def09d2ee2d48ff812a59a1f2c00b_1763275231_6474.jpg" alt="실무4" class="w-full rounded-lg shadow-xl" loading="lazy" />
            </div>

            <!-- 중간 신청 폼 -->
            <div class="text-center mt-12">
                <div class="bg-gray-900 max-w-2xl mx-auto p-6 md:p-8 rounded-2xl shadow-2xl border border-cyan-500/50">
                    <h2 class="text-3xl md:text-4xl font-black text-center mb-4 text-white">
                        지금 바로 시작하세요!
                    </h2>
                    <p class="text-center text-gray-300 mb-8">
                        7일 무료 체험으로 크루즈 마케터의 모든 것을 경험해보세요.
                    </p>

                    <!-- FORM_MIDDLE -->
                </div>
            </div>
        </div>
    </section>

    <!-- 8. 멘토 소개 -->
    <section class="py-20 bg-gray-900">
        <div class="max-w-4xl mx-auto px-4">
            <h2 class="text-3xl md:text-5xl font-black text-center mb-4">
                당신을 성공으로 이끌 <span class="text-yellow-400">1:1 전담 멘토</span>
            </h2>
            <p class="text-lg text-center text-gray-300 mb-12">
                이미 성공의 길을 걷고 있는 전문가 멘토 군단이<br />
                당신의 첫 수익이 날 때까지 멱살 잡고 끌고 갑니다.
            </p>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div class="text-center">
                    <img src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754199867_3063.png" alt="모니카 대표" class="w-40 h-40 object-cover rounded-full mx-auto border-4 border-cyan-500" loading="lazy" />
                    <h3 class="font-bold text-white text-xl mt-4">모니카 대표</h3>
                    <p class="text-sm text-cyan-400">총괄 디렉터</p>
                </div>
                <div class="text-center">
                    <img src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754199901_6284.jpg" alt="로즈 코치" class="w-40 h-40 object-cover rounded-full mx-auto border-4 border-gray-600" loading="lazy" />
                    <h3 class="font-bold text-white text-xl mt-4">로즈 코치</h3>
                    <p class="text-sm text-gray-400">전문 멘토</p>
                </div>
                <div class="text-center">
                    <img src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754199918_2226.jpg" alt="페르 코치" class="w-40 h-40 object-cover rounded-full mx-auto border-4 border-gray-600" loading="lazy" />
                    <h3 class="font-bold text-white text-xl mt-4">페르 코치</h3>
                    <p class="text-sm text-gray-400">전문 멘토</p>
                </div>
                <div class="text-center">
                    <img src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754199981_5468.jpg" alt="해리 점장" class="w-40 h-40 object-cover rounded-full mx-auto border-4 border-gray-600" loading="lazy" />
                    <h3 class="font-bold text-white text-xl mt-4">해리 점장</h3>
                    <p class="text-sm text-gray-400">전문 멘토</p>
                </div>
                <div class="text-center">
                    <img src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754200003_2384.jpg" alt="제이 점장" class="w-40 h-40 object-cover rounded-full mx-auto border-4 border-gray-600" loading="lazy" />
                    <h3 class="font-bold text-white text-xl mt-4">제이 점장</h3>
                    <p class="text-sm text-gray-400">전문 멘토</p>
                </div>
                <div class="text-center">
                    <img src="https://leadgeny.kr/data/file/smarteditor2/2025-08-03/2aaf4aa2aa0950f4d179e35f99934319_1754200020_0843.jpg" alt="노아 점장" class="w-40 h-40 object-cover rounded-full mx-auto border-4 border-gray-600" loading="lazy" />
                    <h3 class="font-bold text-white text-xl mt-4">노아 점장</h3>
                    <p class="text-sm text-gray-400">전문 멘토</p>
                </div>
            </div>
        </div>
    </section>
</div>
`;

export default async function PartnerB2BLandingPage({ params }: { params: { partnerId: string } }) {
    // 1. Fetch Partner-Specific Template or Global Template
    let template = DEFAULT_TEMPLATE;

    try {
        // First, try to find partner-specific template
        const partnerProfile = await prisma.affiliateProfile.findFirst({
            where: {
                OR: [
                    { landingSlug: params.partnerId },
                    { User: { mallUserId: params.partnerId } },
                    { User: { phone: params.partnerId } },
                ]
            },
            select: {
                id: true,
                metadata: true,
                displayName: true,
            }
        });

        // Check if partner has custom template in metadata
        if (partnerProfile?.metadata) {
            const metadata = partnerProfile.metadata as any;
            if (metadata.b2bLandingTemplate) {
                template = metadata.b2bLandingTemplate;
                console.log(`[B2B Landing] Using partner-specific template for ${params.partnerId}`);
            } else {
                // No custom template, use global
                console.log(`[B2B Landing] No custom template for ${params.partnerId}, using global template`);
            }
        }

        // If no partner-specific template, fetch global template
        if (template === DEFAULT_TEMPLATE) {
            const config = await prisma.systemConfig.findUnique({
                where: { configKey: 'B2B_LANDING_TEMPLATE' }
            });

            if (config?.configValue) {
                template = config.configValue;
            } else {
                // Seed the DB if empty
                await prisma.systemConfig.create({
                    data: {
                        configKey: 'B2B_LANDING_TEMPLATE',
                        configValue: DEFAULT_TEMPLATE,
                        description: 'B2B Partner Landing Page HTML Template (Global Default)',
                        category: 'landing_page',
                        updatedAt: new Date(),
                    }
                });
            }
        }
    } catch (error) {
        console.error('[B2B Landing] Failed to fetch template:', error);
    }

    return <B2BLandingClient partnerId={params.partnerId} template={template} />;
}
