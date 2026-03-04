import { TravelContractData } from './types';

const COMPANY = {
  name: '크루즈닷',
  address: '경기도 화성시 효행로 1068, 603-A60호(병점동, 리더스프라자)',
  phone: '010-3289-3800',
  regNo: '714-57-00419',
  ceo: '배연성',
  bank: '국민은행 531301-04-167150',
  bankHolder: '배연성(크루즈닷)',
  stampUrl: '/images/stamp-bae.png',
  cruisedotStampUrl: '/images/cruisedot-stamp.png',
};

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

export function generateTravelContractHTML(
  data: TravelContractData,
  signatureImageUrl?: string,
  contractorSignatureUrl?: string,
  customerAddress?: string,
  companions?: Array<{ name: string; phone: string }>,
): string {
  const { isPackage, hasHotel } = data;

  // 교통수단 텍스트
  const transportParts: string[] = [];
  if (data.airlineName) transportParts.push(`항공기 (${data.airlineName})`);
  transportParts.push(`선박 (${data.shipName})`);
  const transportText = transportParts.join(', ');

  // 숙박
  const accommodationText = hasHotel ? '☑ 호텔포함' : '☑ 일정에 표시';

  // 인솔자/안내원/현지교통/현지여행사
  const tourLeader = isPackage ? '☑ 유 &nbsp; □ 무' : '□ 유 &nbsp; ☑ 무';
  const localGuide = isPackage ? '☑ 유 &nbsp; □ 무' : '□ 유 &nbsp; ☑ 무';
  const localTransport = isPackage ? '☑ 버스 &nbsp; □ 없음' : '□ 버스 &nbsp; ☑ 없음';
  const localAgency = isPackage ? '☑ 유 &nbsp; □ 무' : '□ 유 &nbsp; ☑ 무';

  // 포함내역
  const includedItems = isPackage
    ? `☑ 항공기·선박·철도 등 운임&nbsp;&nbsp; ☑ 숙박·식사료&nbsp;&nbsp; ☑ 안내자 경비<br>
       ☑ 국내외 항공 및 항만세·관광기금·제세금&nbsp;&nbsp; ☑ 여행알선 수수료<br>
       ☑ 일정표 내 관광지 입장료 등`
    : `☑ 선박 운임 (크루즈 객실 요금 포함)<br>□ 숙박·식사료 &nbsp; □ 안내자 경비<br>자유여행 일정에 표시`;

  // 기타 선택항목
  const extraOptions = isPackage
    ? `☑ 여행보험료`
    : `□ 여행보험료 (선택사항 — 일정에 표시)`;

  // 불포함 내역
  const excluded = data.excludedItems.length > 0
    ? data.excludedItems.join(', ')
    : '선상팁, 개인 경비, 기타 일정 외 비용';

  // 취소료 규정 테이블
  const cancelRows = data.cancellationPolicy.map(r =>
    `<tr><td>${r.period}</td><td>${r.charge}</td></tr>`
  ).join('');

  // 동행자 명단
  const companionRows = (companions || []).map((c, i) =>
    `<tr><td>${i + 1}</td><td>${c.name}</td><td>${c.phone}</td></tr>`
  ).join('') || `<tr><td colspan="3" style="color:#aaa;text-align:center">동행자 없음</td></tr>`;

  // 서명 영역
  const sigBox = (imgUrl?: string, label = '') => {
    if (imgUrl) {
      return `<img src="${imgUrl}" style="max-height:60px;max-width:150px;object-fit:contain;" alt="${label}서명">`;
    }
    return `<div style="display:inline-block;width:150px;height:55px;border:1px solid #bbb;border-radius:4px;"></div>`;
  };

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>크루즈닷 여행계약서</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', '맑은 고딕', sans-serif;
    font-size: 9pt;
    color: #222;
    background: #fff;
    padding: 0;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 15mm 15mm 10mm;
    background: #fff;
  }
  @media print {
    .page { margin: 0; padding: 15mm 15mm 10mm; }
    .page-break { page-break-after: always; }
    .no-print { display: none !important; }
  }
  .page-break { page-break-after: always; height: 1px; }

  /* Header */
  .contract-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid #1a3a6b;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .logo {
    font-size: 22pt;
    font-weight: 900;
    color: #1a3a6b;
    letter-spacing: -1px;
  }
  .logo span { color: #c9a84c; }
  .contract-title {
    font-size: 15pt;
    font-weight: 700;
    color: #1a3a6b;
    text-align: center;
    flex: 1;
  }
  .contract-copy-label {
    font-size: 9pt;
    color: #888;
    border: 1px solid #ccc;
    padding: 3px 8px;
    border-radius: 4px;
  }

  .subtitle {
    font-size: 9pt;
    color: #555;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #eee;
  }

  /* Tables */
  .contract-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 8.5pt;
  }
  .contract-table td, .contract-table th {
    border: 1px solid #999;
    padding: 5px 7px;
    vertical-align: middle;
  }
  .contract-table .lbl {
    background: #f0f4fa;
    font-weight: 600;
    width: 100px;
    white-space: nowrap;
    color: #1a3a6b;
    text-align: center;
  }
  .contract-table .lbl2 {
    background: #f0f4fa;
    font-weight: 600;
    width: 90px;
    white-space: nowrap;
    color: #1a3a6b;
    text-align: center;
  }

  /* Signature section */
  .sig-section {
    display: flex;
    gap: 12px;
    margin-top: 14px;
    margin-bottom: 14px;
  }
  .sig-box {
    flex: 1;
    border: 1px solid #bbb;
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 8.5pt;
  }
  .sig-box h3 {
    font-size: 10pt;
    font-weight: 700;
    color: #1a3a6b;
    border-bottom: 1px solid #ddd;
    padding-bottom: 5px;
    margin-bottom: 8px;
  }
  .sig-box p { margin: 4px 0; line-height: 1.6; }
  .sig-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }

  /* Section titles */
  .section-h {
    font-size: 11pt;
    font-weight: 700;
    color: #1a3a6b;
    border-left: 4px solid #c9a84c;
    padding-left: 8px;
    margin: 14px 0 8px;
  }
  .section-sub {
    font-size: 9.5pt;
    font-weight: 700;
    color: #333;
    margin: 10px 0 5px;
  }

  /* Terms */
  .terms-article {
    margin-bottom: 8px;
    font-size: 8pt;
    line-height: 1.65;
  }
  .terms-article .art-title {
    font-weight: 700;
    color: #1a3a6b;
    margin-bottom: 2px;
  }
  .terms-article ul { padding-left: 16px; }
  .terms-article li { margin: 2px 0; }

  /* Cancel table */
  .cancel-table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 8.5pt;
  }
  .cancel-table th {
    background: #1a3a6b;
    color: #fff;
    padding: 5px 8px;
    text-align: center;
    border: 1px solid #1a3a6b;
  }
  .cancel-table td {
    border: 1px solid #bbb;
    padding: 5px 8px;
    text-align: center;
  }
  .cancel-table tr:nth-child(even) td { background: #f8f9fc; }

  /* Companion table */
  .companion-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin: 6px 0;
  }
  .companion-table th {
    background: #f0f4fa;
    padding: 4px 8px;
    border: 1px solid #bbb;
    font-weight: 600;
    color: #1a3a6b;
  }
  .companion-table td {
    border: 1px solid #bbb;
    padding: 4px 8px;
  }

  /* Privacy */
  .privacy-box {
    border: 1px solid #bbb;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 10px;
    font-size: 8pt;
    line-height: 1.6;
  }
  .privacy-box h4 {
    font-size: 9pt;
    font-weight: 700;
    color: #1a3a6b;
    margin-bottom: 5px;
  }
  .privacy-check-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    font-weight: 600;
    color: #555;
  }

  .stamp-img { width: 55px; height: 55px; object-fit: contain; }
  .gold-line { border-top: 2px solid #c9a84c; margin: 12px 0; }
</style>
</head>
<body>
<div class="page">

  <!-- ===== CONTRACT PAGE ===== -->
  <div class="contract-header">
    <div class="logo">크루즈<span>닷</span></div>
    <div class="contract-title">크루즈닷 여행계약서</div>
    <div class="contract-copy-label">고객보관용</div>
  </div>

  <p class="subtitle">
    크루즈닷(이하 "당사")과 여행자는 아래와 같이
    ${isPackage ? '<strong>☑ 기획</strong> &nbsp; □ 희망' : '□ 기획 &nbsp; <strong>☑ 희망</strong>'}
    여행 계약을 체결한다.
  </p>

  <table class="contract-table">
    <tr>
      <td class="lbl">상품명</td>
      <td colspan="3">${data.productName}</td>
    </tr>
    <tr>
      <td class="lbl">여행기간</td>
      <td>${data.departureDate} ~ ${data.returnDate}&nbsp;(${data.nights}박 ${data.days}일)</td>
      <td class="lbl2">여행보증</td>
      <td>☑ 여행보증보험</td>
    </tr>
    <tr>
      <td class="lbl">여행자보험</td>
      <td>${data.hasInsurance ? '☑ 유&nbsp; □ 무' : '□ 유&nbsp; ☑ 무'}</td>
      <td class="lbl2">여행인원</td>
      <td><strong>${data.totalPeople}명</strong></td>
    </tr>
    <tr>
      <td class="lbl">여행지역</td>
      <td colspan="3">여행일정표 참조</td>
    </tr>
    <tr>
      <td class="lbl">여행요금</td>
      <td>1인당 <strong>${fmt(data.pricePerPerson)}</strong>원 / 총액 <strong>${fmt(data.totalAmount)}</strong>원</td>
      <td class="lbl2">계좌정보</td>
      <td style="font-size:8pt">${COMPANY.bank}<br>예금주: ${COMPANY.bankHolder}</td>
    </tr>
    <tr>
      <td class="lbl">출발/도착</td>
      <td><strong>${data.departure}</strong> → <strong>${data.arrival}</strong></td>
      <td class="lbl2">교통수단</td>
      <td>${transportText}</td>
    </tr>
    <tr>
      <td class="lbl">숙박</td>
      <td>${accommodationText}</td>
      <td class="lbl2">식사</td>
      <td>☑ 일정에 표시</td>
    </tr>
    <tr>
      <td class="lbl">여행인솔자</td>
      <td>${tourLeader}</td>
      <td class="lbl2">현지안내원</td>
      <td>${localGuide}</td>
    </tr>
    <tr>
      <td class="lbl">현지교통</td>
      <td>${localTransport}</td>
      <td class="lbl2">현지여행사</td>
      <td>${localAgency}</td>
    </tr>
    <tr>
      <td class="lbl">여행요금<br>포함내역</td>
      <td colspan="3">${includedItems}</td>
    </tr>
    <tr>
      <td class="lbl">기타선택<br>항목</td>
      <td colspan="3">${extraOptions}</td>
    </tr>
    <tr>
      <td class="lbl">불포함내역</td>
      <td colspan="3" style="color:#555">${excluded}</td>
    </tr>
  </table>

  <!-- 서명 영역 -->
  <div class="sig-section">
    <!-- 여행업자 -->
    <div class="sig-box">
      <h3>여행업자 (당사)</h3>
      <p>상호: <strong>${COMPANY.name}</strong></p>
      <p>주소: ${COMPANY.address}</p>
      <p>전화: ${COMPANY.phone}</p>
      <p>등록번호: ${COMPANY.regNo}</p>
      <p style="display:flex;align-items:center;gap:8px;">
        대표자: ${COMPANY.ceo}
        <img src="${COMPANY.stampUrl}" class="stamp-img" alt="대표자 인장" />
      </p>
      <p>담당자: <strong>${data.affiliateName}</strong>${data.affiliatePhone ? ' (' + data.affiliatePhone + ')' : ''}</p>
    </div>

    <!-- 여행자 -->
    <div class="sig-box">
      <h3>여행자</h3>
      <div class="sig-row">
        <span>성명: <strong>${data.mainTravelerName}</strong></span>
        <span>(서명)</span>
        ${sigBox(signatureImageUrl, '여행자')}
      </div>
      <p style="margin-top:6px">전화: ${data.mainTravelerPhone}</p>
      <p>주소: ${customerAddress || '__________________ (계약서에 직접 기입)'}</p>
    </div>
  </div>

  <!-- 동행자 명단 -->
  <div class="section-sub">여행자 명단 (동행자)</div>
  <table class="companion-table">
    <tr><th style="width:40px">번호</th><th>성명</th><th>연락처</th></tr>
    ${companionRows}
  </table>

  <!-- 계약자 서명 -->
  <div style="margin-top:10px;padding:8px 12px;border:1px solid #bbb;border-radius:6px;font-size:8.5pt;">
    <span style="font-weight:600;color:#1a3a6b;">계약자 확인 및 서명</span>
    <div class="sig-row" style="margin-top:6px;">
      <span>성명: <strong>${data.mainTravelerName}</strong></span>
      <span>(서명)</span>
      ${sigBox(contractorSignatureUrl, '계약자')}
    </div>
  </div>

  <div class="gold-line"></div>
  <div class="page-break"></div>

  <!-- ===== 국외여행표준약관 ===== -->
  <div class="section-h">국외여행 표준약관</div>
  <p style="font-size:8pt;color:#666;margin-bottom:10px;">
    (공정거래위원회 표준약관 제10021호 · 2017.1.1. 시행)
  </p>

  <div class="terms-article">
    <div class="art-title">제1조 (목적)</div>
    <div>이 약관은 ○○여행사와 여행자가 체결한 국외여행계약의 세부 이행 및 준수사항을 정함을 목적으로 합니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제2조 (당사와 여행자 의무)</div>
    <div>당사는 여행자에게 안전하고 만족스러운 여행서비스를 제공하기 위해 최선을 다하여야 하며, 여행자는 안전하고 즐거운 여행을 위해 당사의 관련규정에 따라야 합니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제3조 (용어의 정의)</div>
    <div>① "기획여행"이라 함은 당사가 미리 여행목적지·여행일정·여행서비스 내용 및 여행요금 등을 정하고 이에 참가하는 여행자를 모집하여 실시하는 여행을 말합니다.<br>
    ② "희망여행"이라 함은 여행자가 희망하는 여행조건에 따라 당사가 실시하는 여행을 말합니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제4조 (계약의 구성)</div>
    <div>여행계약은 여행계약서(이하 "계약서")와 여행약관·여행일정표(또는 여행설명서)를 계약내용으로 합니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제5조 (특약)</div>
    <div>당사와 여행자는 관련법령에 위반하지 않는 범위 내에서 이 약관의 내용과 다른 사항을 약정할 수 있으며, 이 경우 특약이 이 약관에 우선합니다. 크루즈 여행 특별약관이 있는 경우 특별약관이 우선합니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제6조 ~ 제7조 (계약서 교부 및 교부 간주)</div>
    <div>당사는 여행자에게 계약서 및 약관을 교부하고, 전자적 방법에 의한 교부도 유효합니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제8조 (당사의 책임)</div>
    <div>당사는 여행 출발 시부터 도착 시까지 당사가 여행자에게 제공하기로 한 여행서비스가 불성실하게 이행된 경우 여행자에게 손해를 배상합니다. 단, 그 손해가 여행자의 고의·과실, 불가항력 등에 기인하는 경우에는 그러하지 않습니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제9조 (최저 행사인원 미충족 시 계약해제)</div>
    <div>당사는 최저행사인원에 미달로 계약을 해제하는 경우 출발일 이전 7일까지 여행자에게 통지합니다. 이 경우 당일 취소는 여행요금의 50%, 출발 1일 전까지 취소는 30%를 배상합니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제11조 (여행요금)</div>
    <div>① 여행자는 계약 체결 시 총 여행요금의 10% 이하를 계약금으로 납부하고, 잔금은 여행 출발 전 납부기한까지 납부합니다.<br>
    ② 여행요금은 계약서에 기재된 금액으로 하되, 특별한 사정이 없는 한 계약 체결 후 변경할 수 없습니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제12조 (여행요금 변경)</div>
    <div>항공운임 또는 관련 운임이 계약 당시보다 5% 이상 증감하거나, 여행요금에 적용된 외화환율이 계약 당시보다 2% 이상 변동된 경우 당사 또는 여행자는 그 증감 또는 변동분을 여행요금에 추가하거나 공제할 수 있습니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제14조 (손해배상)</div>
    <div>당사의 귀책사유로 여행자에게 손해를 끼친 경우에는 여행자에게 손해를 배상합니다. 여행자의 귀책사유로 당사에 손해를 끼친 경우에도 마찬가지입니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제15조 (출발 전 여행계약 해제)</div>
    <div>여행자는 여행 출발 전 이 계약을 해제할 수 있으며, 이 경우 아래 기준에 따른 취소료를 납부합니다. (※ 크루즈 특별약관 제2조 취소료 규정이 우선 적용됩니다)</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제17조 (여행의 시작과 종료)</div>
    <div>여행의 시작은 탑승수속 완료 시점부터이며, 여행의 종료는 여행자가 국내 입국장의 보세구역을 이탈하는 시점으로 합니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제19조 (보험가입)</div>
    <div>당사는 이 여행과 관련하여 여행자 보호 및 배상을 위한 영업보증보험 및 여행자 보험에 가입합니다. 단, 여행자 보험은 상품에 따라 유·무가 결정됩니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제21조 (시행일)</div>
    <div>이 약관은 2017년 1월 1일부터 시행합니다.</div>
  </div>

  <div class="gold-line"></div>
  <div class="page-break"></div>

  <!-- ===== 크루즈 여행 특별약관 ===== -->
  <div class="section-h">크루즈 여행 특별 약관</div>

  <div class="terms-article">
    <div class="art-title">제1조 (목적)</div>
    <div>이 특별약관은 크루즈 여행의 특성을 반영하여 표준약관에서 정하지 않은 사항을 보완하기 위해 제정합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제2조 (취소료 규정)</div>
    <table class="cancel-table">
      <tr><th>해지 통보 시기</th><th>취소료</th></tr>
      ${cancelRows}
    </table>
  </div>

  <div class="terms-article">
    <div class="art-title">제3조 ~ 제10조 (특별 규정)</div>
    <ul>
      <li>여권 유효기간은 여행 출발일 기준 6개월 이상 남아있어야 합니다.</li>
      <li>예약 후 3일 이내 계약금 미결제 시 예약이 자동 취소될 수 있습니다.</li>
      <li>잔금은 출발일 이전 당사가 정한 날짜까지 완납하여야 합니다.</li>
      <li>18세 미만 미성년자는 성인 보호자와 동반하여야 하며, 생후 6개월 미만 유아는 탑승할 수 없습니다.</li>
      <li>임신 6개월(24주) 이상인 경우 크루즈 탑승이 제한될 수 있습니다.</li>
      <li>기항지 투어 불참 시 일부 환불이 가능하나 추가 보상은 없습니다.</li>
      <li>선내 면세점 구매 물품 및 기항지 쇼핑 물품은 교환·환불이 불가합니다.</li>
      <li>선박 내 및 기항지에서의 안전사고에 대해 여행자 스스로 유의하여야 합니다.</li>
    </ul>
  </div>

  <div class="gold-line"></div>
  <div class="page-break"></div>

  <!-- ===== 개인정보처리 동의사항 ===== -->
  <div class="section-h">개인정보처리 동의사항</div>

  <div class="privacy-box">
    <h4>1. 개인정보 수집·이용 동의 (필수)</h4>
    <p><strong>수집 항목:</strong> 성명, 생년월일, 주소, 연락처, 이메일, 여권정보</p>
    <p><strong>수집 목적:</strong> 여행계약 이행, 여행자 보험 가입, 탑승 수속, 기항지 관련 서비스 제공</p>
    <p><strong>보유 기간:</strong> 목적 달성 시까지 (계약·결제 기록 5년, 분쟁 기록 3년)</p>
    <div class="privacy-check-row">
      ☑ 동의합니다 &nbsp;&nbsp; □ 동의하지 않습니다
      <span style="margin-left:20px;font-size:8pt;color:#888">(미동의 시 계약 체결 불가)</span>
    </div>
  </div>

  <div class="privacy-box">
    <h4>2. 개인정보 제3자 제공 동의 (필수)</h4>
    <p><strong>제공 대상:</strong> 항공사, 선사(크루즈 운항사), 랜드사(현지여행사), 보험사</p>
    <p><strong>제공 목적:</strong> 크루즈 여행 서비스 제공 및 탑승수속</p>
    <p><strong>보유 기간:</strong> 크루즈 여행 서비스 종료 시까지</p>
    <div class="privacy-check-row">
      ☑ 동의합니다 &nbsp;&nbsp; □ 동의하지 않습니다
      <span style="margin-left:20px;font-size:8pt;color:#888">(미동의 시 계약 체결 불가)</span>
    </div>
  </div>

  <div class="privacy-box">
    <h4>3. 마케팅 활용 동의 (선택)</h4>
    <p><strong>목적:</strong> 신상품·여행정보 안내 및 판매 권유</p>
    <p><strong>방법:</strong> 우편, 전화, 이메일, 문자, SNS</p>
    <p><strong>보유 기간:</strong> 동의 철회 시까지 (최대 계약 종료 후 5년)</p>
    <div class="privacy-check-row">
      □ 동의합니다 &nbsp;&nbsp; □ 동의하지 않습니다
    </div>
  </div>

  <!-- 최종 확인 서명 -->
  <div style="margin-top:16px;padding:12px;border:2px solid #1a3a6b;border-radius:8px;background:#f8f9fc;">
    <p style="font-size:9pt;font-weight:600;color:#1a3a6b;margin-bottom:8px;">
      본인은 위 계약 내용 및 약관을 모두 확인하였으며, 이에 동의하여 서명합니다.
    </p>
    <p style="font-size:8.5pt;">계약일: <strong>${new Date().getFullYear()}년 ${new Date().getMonth()+1}월 ${new Date().getDate()}일</strong></p>
    <div class="sig-row" style="margin-top:8px;">
      <span>계약자 성명: <strong>${data.mainTravelerName}</strong></span>
      <span>(서명)</span>
      ${sigBox(contractorSignatureUrl, '계약자최종')}
    </div>
  </div>

</div>
</body>
</html>`;
}

// 표준 크루즈 취소료 규정 (상품별 별도 규정 없을 경우 사용)
export const STANDARD_CRUISE_CANCELLATION_POLICY = [
  { period: '출발 75일 전 통보', charge: '위약금 없음' },
  { period: '출발 74일 ~ 50일 전', charge: '총 경비의 30%' },
  { period: '출발 49일 ~ 23일 전', charge: '총 경비의 70%' },
  { period: '출발 22일 ~ 출발 당일', charge: '총 경비의 100%' },
];
