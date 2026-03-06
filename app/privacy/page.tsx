import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '개인정보처리방침 | 크루즈닷',
  description: '크루즈닷 여행 서비스 개인정보처리방침',
};

const COMPANY = {
  name: '크루즈닷',
  ceo: '배연성',
  address: '경기도 화성시 효행로 1068, 603-A60호(병점동, 리더스프라자)',
  phone: '010-3289-3800',
  regNo: '714-57-00419',
  email: 'cruise@cruisedot.co.kr',
};

const sections = [
  {
    id: 'purpose',
    title: '제1조 개인정보의 처리 목적',
    content: (
      <div className="space-y-2 text-gray-700 leading-relaxed">
        <p>크루즈닷(이하 &quot;회사&quot;)은 다음의 목적을 위하여 개인정보를 처리합니다. 처리하는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경될 경우에는 개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>크루즈 여행 상품 계약 체결 및 이행</li>
          <li>여행자 보험 가입 및 항공·선박 탑승 수속</li>
          <li>여행 대금 결제 및 정산</li>
          <li>기항지 관련 서비스 및 AI 가이드 서비스 제공</li>
          <li>고객 상담, 민원 처리, 분쟁 해결</li>
          <li>서비스 이용 실적 분석 및 맞춤 서비스 제공</li>
          <li>법령상 의무 이행 (관광진흥법, 전자상거래법 등)</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'items',
    title: '제2조 처리하는 개인정보 항목',
    content: (
      <div className="space-y-4 text-gray-700 leading-relaxed">
        <div>
          <p className="font-semibold text-[#1a3a6b] mb-1">필수 수집 항목</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>성명, 생년월일, 성별</li>
            <li>연락처(휴대전화번호)</li>
            <li>주소</li>
            <li>이메일 주소</li>
            <li>여권정보 (여권번호, 발급일, 만료일, 국적, 여권 사진)</li>
            <li>결제정보 (카드번호 일부, 결제 금액, 거래 내역)</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-[#1a3a6b] mb-1">서비스 이용 시 자동 수집 항목</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>접속 IP 주소, 쿠키, 서비스 이용 기록</li>
            <li>기기 정보 (기기 종류, 운영체제)</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-[#1a3a6b] mb-1">선택 수집 항목 (마케팅 동의 시)</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>마케팅 수신 동의 여부 및 수신 채널 정보</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'retention',
    title: '제3조 개인정보의 보유·이용 기간',
    content: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#1a3a6b] text-white">
                <th className="border border-[#1a3a6b] px-3 py-2 text-left">구분</th>
                <th className="border border-[#1a3a6b] px-3 py-2 text-left">보유 기간</th>
                <th className="border border-[#1a3a6b] px-3 py-2 text-left">근거 법령</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-blue-50">
                <td className="border border-gray-200 px-3 py-2">여행 계약 및 결제 기록</td>
                <td className="border border-gray-200 px-3 py-2">5년</td>
                <td className="border border-gray-200 px-3 py-2">전자상거래법 제6조</td>
              </tr>
              <tr className="hover:bg-blue-50">
                <td className="border border-gray-200 px-3 py-2">소비자 불만 및 분쟁 기록</td>
                <td className="border border-gray-200 px-3 py-2">3년</td>
                <td className="border border-gray-200 px-3 py-2">전자상거래법 제6조</td>
              </tr>
              <tr className="hover:bg-blue-50">
                <td className="border border-gray-200 px-3 py-2">여행업 등록 관련 서류</td>
                <td className="border border-gray-200 px-3 py-2">5년</td>
                <td className="border border-gray-200 px-3 py-2">관광진흥법 시행규칙</td>
              </tr>
              <tr className="hover:bg-blue-50">
                <td className="border border-gray-200 px-3 py-2">세금계산서 등 세무 기록</td>
                <td className="border border-gray-200 px-3 py-2">5년</td>
                <td className="border border-gray-200 px-3 py-2">국세기본법 제85조의3</td>
              </tr>
              <tr className="hover:bg-blue-50">
                <td className="border border-gray-200 px-3 py-2">마케팅 수신 동의 기록</td>
                <td className="border border-gray-200 px-3 py-2">동의 철회 시까지 (최대 계약 종료 후 5년)</td>
                <td className="border border-gray-200 px-3 py-2">정보통신망법 제50조</td>
              </tr>
              <tr className="hover:bg-blue-50">
                <td className="border border-gray-200 px-3 py-2">서비스 로그 기록</td>
                <td className="border border-gray-200 px-3 py-2">3개월</td>
                <td className="border border-gray-200 px-3 py-2">통신비밀보호법 제15조의2</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    id: 'third-party',
    title: '제4조 개인정보의 제3자 제공',
    content: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>회사는 정보주체의 동의 없이는 개인정보를 외부에 제공하지 않습니다. 단, 여행 서비스 제공을 위해 아래와 같이 필수 제3자에게 개인정보를 제공합니다.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#1a3a6b] text-white">
                <th className="border border-[#1a3a6b] px-3 py-2 text-left">제공받는 자</th>
                <th className="border border-[#1a3a6b] px-3 py-2 text-left">제공 목적</th>
                <th className="border border-[#1a3a6b] px-3 py-2 text-left">제공 항목</th>
                <th className="border border-[#1a3a6b] px-3 py-2 text-left">보유 기간</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-blue-50">
                <td className="border border-gray-200 px-3 py-2">항공사</td>
                <td className="border border-gray-200 px-3 py-2">탑승 수속 및 항공권 발권</td>
                <td className="border border-gray-200 px-3 py-2">성명, 여권번호, 생년월일, 연락처</td>
                <td className="border border-gray-200 px-3 py-2">여행 서비스 종료 시까지</td>
              </tr>
              <tr className="hover:bg-blue-50">
                <td className="border border-gray-200 px-3 py-2">선사 (크루즈 운항사)</td>
                <td className="border border-gray-200 px-3 py-2">승선 수속 및 크루즈 서비스 제공</td>
                <td className="border border-gray-200 px-3 py-2">성명, 여권번호, 생년월일, 국적, 연락처</td>
                <td className="border border-gray-200 px-3 py-2">여행 서비스 종료 시까지</td>
              </tr>
              <tr className="hover:bg-blue-50">
                <td className="border border-gray-200 px-3 py-2">랜드사 (현지여행사)</td>
                <td className="border border-gray-200 px-3 py-2">기항지 관광 서비스 제공</td>
                <td className="border border-gray-200 px-3 py-2">성명, 연락처</td>
                <td className="border border-gray-200 px-3 py-2">여행 서비스 종료 시까지</td>
              </tr>
              <tr className="hover:bg-blue-50">
                <td className="border border-gray-200 px-3 py-2">여행자 보험사</td>
                <td className="border border-gray-200 px-3 py-2">여행자 보험 가입 및 보험금 지급</td>
                <td className="border border-gray-200 px-3 py-2">성명, 생년월일, 여권번호, 연락처</td>
                <td className="border border-gray-200 px-3 py-2">보험계약 기간 및 법령에 따른 기간</td>
              </tr>
              <tr className="hover:bg-blue-50">
                <td className="border border-gray-200 px-3 py-2">결제대행사 (웰컴페이먼츠 등)</td>
                <td className="border border-gray-200 px-3 py-2">여행 대금 결제 처리</td>
                <td className="border border-gray-200 px-3 py-2">성명, 연락처, 결제 정보</td>
                <td className="border border-gray-200 px-3 py-2">전자상거래법에 따른 기간</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500">※ 위 제3자 제공은 계약 이행에 필수적이며, 동의하지 않으실 경우 여행 서비스 이용이 제한될 수 있습니다.</p>
      </div>
    ),
  },
  {
    id: 'refusal',
    title: '제5조 개인정보 수집 동의 거부 시 불이익',
    content: (
      <div className="space-y-2 text-gray-700 leading-relaxed">
        <p>정보주체는 개인정보 수집·이용 및 제3자 제공에 대한 동의를 거부할 권리가 있습니다. 다만, 아래와 같은 불이익이 발생할 수 있습니다.</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li><strong>필수 항목 동의 거부 시:</strong> 크루즈 여행 상품 계약 체결 불가, 여행 서비스 전체 이용 불가</li>
          <li><strong>제3자 제공 동의 거부 시:</strong> 항공·선박 탑승 수속, 여행자 보험 가입 등 여행 서비스 제공 불가로 계약 이행 불가</li>
          <li><strong>선택 항목 (마케팅) 동의 거부 시:</strong> 신상품 및 여행 정보 안내 서비스 이용 불가 (계약 이행에는 영향 없음)</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'rights',
    title: '제6조 정보주체의 권리·의무 및 행사 방법',
    content: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>정보주체는 회사에 대해 언제든지 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-[#c9a84c] shrink-0">1.</span>
            <p><span className="font-semibold">열람 요구:</span> 처리 중인 개인정보 열람 요구</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-[#c9a84c] shrink-0">2.</span>
            <p><span className="font-semibold">정정·삭제 요구:</span> 오류가 있는 개인정보 정정 또는 삭제 요구</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-[#c9a84c] shrink-0">3.</span>
            <p><span className="font-semibold">처리정지 요구:</span> 개인정보의 처리 정지 요구</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-[#c9a84c] shrink-0">4.</span>
            <p><span className="font-semibold">동의 철회:</span> 이전에 제공한 개인정보 수집·이용 동의 철회</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="font-semibold text-[#1a3a6b] mb-2">행사 방법</p>
          <ul className="space-y-1 text-sm">
            <li>전화: <a href={`tel:${COMPANY.phone.replace(/-/g, '')}`} className="text-[#1a3a6b] hover:underline">{COMPANY.phone}</a></li>
            <li>이메일: <a href={`mailto:${COMPANY.email}`} className="text-[#1a3a6b] hover:underline">{COMPANY.email}</a></li>
            <li>방문 접수: {COMPANY.address}</li>
          </ul>
          <p className="text-sm text-gray-500 mt-3">※ 권리 행사는 정보주체의 법정대리인이나 위임을 받은 자도 할 수 있습니다. 이 경우 위임장을 제출하여야 합니다.</p>
          <p className="text-sm text-gray-500">※ 개인정보의 정정·삭제 요구 시 다른 법령에서 해당 개인정보가 수집 대상으로 명시되어 있는 경우에는 삭제를 요구할 수 없습니다.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'officer',
    title: '제7조 개인정보 보호책임자',
    content: (
      <div className="text-gray-700 leading-relaxed">
        <p className="mb-3">회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <p className="font-semibold text-[#1a3a6b] mb-2">개인정보 보호책임자</p>
          <ul className="space-y-1 text-sm">
            <li><span className="font-medium">성명:</span> {COMPANY.ceo}</li>
            <li><span className="font-medium">직책:</span> 대표</li>
            <li><span className="font-medium">전화:</span> <a href={`tel:${COMPANY.phone.replace(/-/g, '')}`} className="text-[#1a3a6b] hover:underline">{COMPANY.phone}</a></li>
            <li><span className="font-medium">이메일:</span> <a href={`mailto:${COMPANY.email}`} className="text-[#1a3a6b] hover:underline">{COMPANY.email}</a></li>
          </ul>
        </div>
        <p className="text-sm text-gray-500 mt-3">정보주체는 회사의 서비스를 이용하면서 발생한 모든 개인정보 보호 관련 문의, 불만 처리, 피해 구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.</p>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-3">
          <p className="font-semibold text-[#1a3a6b] mb-2">권익 침해 구제 기관</p>
          <ul className="space-y-1 text-sm">
            <li>개인정보 침해신고센터: <a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer" className="text-[#1a3a6b] hover:underline">privacy.kisa.or.kr</a> (국번 없이 118)</li>
            <li>개인정보 분쟁조정위원회: <a href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer" className="text-[#1a3a6b] hover:underline">www.kopico.go.kr</a> (1833-6972)</li>
            <li>대검찰청 사이버범죄수사단: <a href="https://www.spo.go.kr" target="_blank" rel="noopener noreferrer" className="text-[#1a3a6b] hover:underline">www.spo.go.kr</a> (국번 없이 1301)</li>
            <li>경찰청 사이버안전국: <a href="https://ecrm.cyber.go.kr" target="_blank" rel="noopener noreferrer" className="text-[#1a3a6b] hover:underline">ecrm.cyber.go.kr</a> (국번 없이 182)</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'security',
    title: '제8조 기술적·관리적 보호조치',
    content: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>회사는 개인정보의 안전성 확보를 위하여 다음과 같은 보호조치를 취하고 있습니다.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="font-semibold text-[#1a3a6b] mb-2">기술적 보호조치</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>개인정보 암호화 저장 (비밀번호 bcrypt 해시)</li>
              <li>HTTPS/TLS 전송 암호화</li>
              <li>여권번호 등 민감 정보 접근 권한 제어</li>
              <li>침입 탐지 및 차단 시스템 운영</li>
              <li>SQL Injection, XSS 등 보안 취약점 대응</li>
              <li>정기적 보안 취약점 점검</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="font-semibold text-[#1a3a6b] mb-2">관리적 보호조치</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>개인정보 접근 권한 최소화 및 관리</li>
              <li>개인정보 처리 담당자 교육 실시</li>
              <li>개인정보 처리 내부 감사 및 로그 기록</li>
              <li>제3자 제공 시 계약서 보안 조항 포함</li>
              <li>개인정보 보호 내부 관리계획 수립·시행</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'changes',
    title: '제9조 개인정보처리방침의 변경',
    content: (
      <div className="space-y-2 text-gray-700 leading-relaxed">
        <p>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>공고일: 변경사항 시행 7일 전 이상 사전 공지</li>
          <li>공고 방법: 회사 웹사이트(cruisedot.co.kr) 공지사항 게시</li>
          <li>중요한 권리 변동이 있는 경우: 30일 전 사전 공지</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'effective-date',
    title: '제10조 시행일',
    content: (
      <div className="text-gray-700 leading-relaxed">
        <p>이 개인정보처리방침은 <strong>2026년 3월 1일</strong>부터 시행됩니다.</p>
      </div>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-[#1a3a6b] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex items-center gap-2 text-[#c9a84c] text-sm mb-3">
            <Link href="/" className="hover:underline">홈</Link>
            <span>/</span>
            <span>개인정보처리방침</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">개인정보처리방침</h1>
          <p className="text-blue-200 text-sm sm:text-base">
            {COMPANY.name} ({COMPANY.regNo}) · 시행일: 2026년 3월 1일
          </p>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* 목차 */}
        <nav className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-8">
          <p className="font-semibold text-[#1a3a6b] mb-3 text-sm uppercase tracking-wide">목차</p>
          <ol className="grid sm:grid-cols-2 gap-1 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-gray-600 hover:text-[#1a3a6b] hover:underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 회사 정보 요약 */}
        <div className="bg-white rounded-xl border border-[#c9a84c]/30 shadow-sm p-5 mb-8">
          <p className="font-semibold text-[#1a3a6b] mb-3">개인정보 처리 사업자 정보</p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-700">
            <div><span className="font-medium">상호:</span> {COMPANY.name}</div>
            <div><span className="font-medium">대표자:</span> {COMPANY.ceo}</div>
            <div><span className="font-medium">사업자등록번호:</span> {COMPANY.regNo}</div>
            <div><span className="font-medium">전화:</span> <a href={`tel:${COMPANY.phone.replace(/-/g, '')}`} className="text-[#1a3a6b] hover:underline">{COMPANY.phone}</a></div>
            <div className="sm:col-span-2"><span className="font-medium">주소:</span> {COMPANY.address}</div>
            <div><span className="font-medium">이메일:</span> <a href={`mailto:${COMPANY.email}`} className="text-[#1a3a6b] hover:underline">{COMPANY.email}</a></div>
          </div>
        </div>

        {/* 본문 섹션 */}
        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden scroll-mt-6"
            >
              <div className="bg-[#1a3a6b]/5 border-b border-gray-200 px-5 py-4">
                <h2 className="text-base sm:text-lg font-bold text-[#1a3a6b]">{section.title}</h2>
              </div>
              <div className="px-5 py-5">{section.content}</div>
            </section>
          ))}
        </div>

        {/* 하단 고지 */}
        <div className="mt-10 p-5 bg-[#1a3a6b] text-white rounded-xl text-sm leading-relaxed">
          <p className="font-semibold text-[#c9a84c] mb-2">공시 정보</p>
          <p>본 개인정보처리방침은 개인정보보호법 제30조에 따라 공개됩니다.</p>
          <p className="mt-1">시행일: 2026년 3월 1일 · 최종 개정일: 2026년 3월 1일</p>
          <p className="mt-1">문의: {COMPANY.phone} · {COMPANY.email}</p>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-block text-sm text-gray-500 hover:text-[#1a3a6b] hover:underline"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
