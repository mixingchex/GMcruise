import { TravelContractData } from './types';

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

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
  if (data.airlineName) transportParts.push(`항공기 (${escapeHtml(data.airlineName)})`);
  transportParts.push(`선박 (${escapeHtml(data.shipName)})`);
  const transportText = transportParts.join(', ');

  // 숙박
  const accommodationText = hasHotel ? '☑ 호텔포함' : '☑ 일정에 표시';

  // 인솔자/안내원/현지교통/현지여행사
  const tourLeader = isPackage ? '☑ 유 &nbsp; □ 무' : '□ 유 &nbsp; ☑ 무';
  const localGuide = isPackage ? '☑ 유 &nbsp; □ 무' : '□ 유 &nbsp; ☑ 무';
  const lt = data.localTransportType || (isPackage ? 'bus' : 'none');
  const localTransport = [
    lt === 'bus' ? '■ 버스' : '□ 버스',
    lt === 'car' ? '■ 승용차' : '□ 승용차',
    lt === 'other' ? '■ 기타' : '□ 기타',
    lt === 'none' ? '■ 없음' : '□ 없음',
  ].join(' &nbsp; ');
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
    `<tr><td>${i + 1}</td><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.phone)}</td></tr>`
  ).join('') || `<tr><td colspan="3" style="color:#aaa;text-align:center">동행자 없음</td></tr>`;

  // 서명 영역
  const sigBox = (imgUrl?: string, label = '') => {
    if (imgUrl) {
      return `<img src="${escapeHtml(imgUrl)}" style="max-height:60px;max-width:150px;object-fit:contain;" alt="${escapeHtml(label)}서명">`;
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
    font-family: 'BaeMinDoHyeon', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
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

  <!-- ===== 회사보관용 ===== -->
  <div class="contract-header">
    <div class="logo">크루즈<span>닷</span></div>
    <div class="contract-title">크루즈닷 여행계약서</div>
    <div class="contract-copy-label" style="border-color:#c9a84c;color:#c9a84c;">회사보관용</div>
  </div>

  <p class="subtitle">
    크루즈닷(이하 "당사")과 여행자는 아래와 같이
    ${isPackage ? '<strong>☑ 기획</strong> &nbsp; □ 희망' : '□ 기획 &nbsp; <strong>☑ 희망</strong>'}
    여행 계약을 체결한다.
  </p>

  <table class="contract-table">
    <tr>
      <td class="lbl">상품명</td>
      <td colspan="3">${escapeHtml(data.productName)}</td>
    </tr>
    <tr>
      <td class="lbl">여행기간</td>
      <td>${data.departureDate} ~ ${data.returnDate}&nbsp;(${data.nights}박 ${data.days}일)</td>
      <td class="lbl2">여행보증</td>
      <td>
        ${data.guaranteeType === 'mutual-aid' ? '■' : '□'} 공제 &nbsp;
        ${(!data.guaranteeType || data.guaranteeType === 'insurance') ? '■' : '□'} 여행보증보험 &nbsp;
        ${data.guaranteeType === 'deposit' ? '■' : '□'} 영업보증금
      </td>
    </tr>
    <tr>
      <td class="lbl">여행자보험</td>
      <td>
        ${data.hasInsurance ? '☑ 유' : '□ 유'}&nbsp; ${data.hasInsurance ? '□ 무' : '☑ 무'}
        ${data.hasInsurance && data.insuranceCompany ? `&nbsp;(${escapeHtml(data.insuranceCompany)}${data.insuranceCoverage ? ', ' + escapeHtml(data.insuranceCoverage) : ''})` : ''}
      </td>
      <td class="lbl2">여행인원</td>
      <td><strong>${data.totalPeople}명</strong>${data.minGroupSize ? `&nbsp;(최저 ${data.minGroupSize}명 / 최대 ${data.maxGroupSize || '-'}명)` : ''}</td>
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
    ${data.otherNotes ? `
    <tr>
      <td class="lbl">기타사항</td>
      <td colspan="3" style="color:#555;">${escapeHtml(data.otherNotes)}</td>
    </tr>` : ''}
  </table>

  <!-- 약관교부 확인 서명란 -->
  <div style="margin-top:10px;padding:8px 12px;border:1px solid #c9a84c;border-radius:6px;background:#fffdf5;font-size:8.5pt;">
    <p style="font-weight:600;color:#1a3a6b;margin-bottom:5px;">■ 약관교부 확인</p>
    <p>본인은 국외여행표준약관(공정위 제10021호) 및 크루즈 특별약관을 교부받고 그 내용을 충분히 설명받았습니다.</p>
    <div class="sig-row" style="margin-top:6px;">
      <span>여행자 서명: </span>
      <div style="width:120px;height:40px;border-bottom:1px solid #999;"></div>
      <span style="margin-left:20px;">일자: ______년 ______월 ______일</span>
    </div>
  </div>

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
      <p>담당자: <strong>${escapeHtml(data.affiliateName)}</strong>${data.affiliatePhone ? ' (' + escapeHtml(data.affiliatePhone) + ')' : ''}</p>
    </div>

    <!-- 여행자 -->
    <div class="sig-box">
      <h3>여행자</h3>
      <div class="sig-row">
        <span>성명: <strong>${escapeHtml(data.mainTravelerName)}</strong></span>
        <span>(서명)</span>
        ${sigBox(signatureImageUrl, '여행자')}
      </div>
      <p style="margin-top:6px">전화: ${escapeHtml(data.mainTravelerPhone)}</p>
      <p>주소: ${customerAddress ? escapeHtml(customerAddress) : '__________________ (계약서에 직접 기입)'}</p>
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
      <span>성명: <strong>${escapeHtml(data.mainTravelerName)}</strong></span>
      <span>(서명)</span>
      ${sigBox(contractorSignatureUrl, '계약자')}
    </div>
  </div>

  <div class="gold-line"></div>

  <!-- 고객보관용 시작 -->
  <div class="page-break"></div>
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
  <!-- 고객보관용은 계약 테이블 + 서명란만 반복 (약관은 1부만) -->
  <table class="contract-table">
    <tr>
      <td class="lbl">상품명</td>
      <td colspan="3">${escapeHtml(data.productName)}</td>
    </tr>
    <tr>
      <td class="lbl">여행기간</td>
      <td>${data.departureDate} ~ ${data.returnDate}&nbsp;(${data.nights}박 ${data.days}일)</td>
      <td class="lbl2">여행보증</td>
      <td>
        ${data.guaranteeType === 'mutual-aid' ? '■' : '□'} 공제 &nbsp;
        ${(!data.guaranteeType || data.guaranteeType === 'insurance') ? '■' : '□'} 여행보증보험 &nbsp;
        ${data.guaranteeType === 'deposit' ? '■' : '□'} 영업보증금
      </td>
    </tr>
    <tr>
      <td class="lbl">여행자보험</td>
      <td>
        ${data.hasInsurance ? '☑ 유' : '□ 유'}&nbsp; ${data.hasInsurance ? '□ 무' : '☑ 무'}
        ${data.hasInsurance && data.insuranceCompany ? `&nbsp;(${escapeHtml(data.insuranceCompany)}${data.insuranceCoverage ? ', ' + escapeHtml(data.insuranceCoverage) : ''})` : ''}
      </td>
      <td class="lbl2">여행인원</td>
      <td><strong>${data.totalPeople}명</strong>${data.minGroupSize ? `&nbsp;(최저 ${data.minGroupSize}명 / 최대 ${data.maxGroupSize || '-'}명)` : ''}</td>
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
      <td class="lbl">불포함내역</td>
      <td colspan="3" style="color:#555">${excluded}</td>
    </tr>
    ${data.otherNotes ? `
    <tr>
      <td class="lbl">기타사항</td>
      <td colspan="3" style="color:#555;">${escapeHtml(data.otherNotes)}</td>
    </tr>` : ''}
  </table>
  <div style="margin-top:10px;padding:8px 12px;border:1px solid #c9a84c;border-radius:6px;background:#fffdf5;font-size:8.5pt;">
    <p style="font-weight:600;color:#1a3a6b;margin-bottom:5px;">■ 약관교부 확인</p>
    <p>본인은 국외여행표준약관(공정위 제10021호) 및 크루즈 특별약관을 교부받고 그 내용을 충분히 설명받았습니다.</p>
    <div class="sig-row" style="margin-top:6px;">
      <span>여행자 서명: </span>
      <div style="width:120px;height:40px;border-bottom:1px solid #999;"></div>
      <span style="margin-left:20px;">일자: ______년 ______월 ______일</span>
    </div>
  </div>
  <div class="sig-section">
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
      <p>담당자: <strong>${escapeHtml(data.affiliateName)}</strong>${data.affiliatePhone ? ' (' + escapeHtml(data.affiliatePhone) + ')' : ''}</p>
    </div>
    <div class="sig-box">
      <h3>여행자</h3>
      <div class="sig-row">
        <span>성명: <strong>${escapeHtml(data.mainTravelerName)}</strong></span>
        <span>(서명)</span>
        ${sigBox(signatureImageUrl, '여행자')}
      </div>
      <p style="margin-top:6px">전화: ${escapeHtml(data.mainTravelerPhone)}</p>
      <p>주소: ${customerAddress ? escapeHtml(customerAddress) : '__________________ (계약서에 직접 기입)'}</p>
    </div>
  </div>
  <div style="margin-top:10px;padding:8px 12px;border:1px solid #bbb;border-radius:6px;font-size:8.5pt;">
    <span style="font-weight:600;color:#1a3a6b;">계약자 확인 및 서명</span>
    <div class="sig-row" style="margin-top:6px;">
      <span>성명: <strong>${escapeHtml(data.mainTravelerName)}</strong></span>
      <span>(서명)</span>
      ${sigBox(contractorSignatureUrl, '계약자')}
    </div>
  </div>
  <p style="font-size:8pt;color:#999;margin-top:8px;text-align:center;">※ 고객보관용 — 약관 전문은 회사보관용 앞면 참조</p>

  <div class="gold-line"></div>
  <div class="page-break"></div>

  <!-- ===== 국외여행표준약관 ===== -->
  <div class="section-h">국외여행 표준약관</div>
  <p style="font-size:8pt;color:#666;margin-bottom:10px;">
    (공정거래위원회 표준약관 제10021호 · 2017.1.1. 시행)
  </p>

  <div class="terms-article">
    <div class="art-title">제1조 (목적)</div>
    <div>이 약관은 크루즈닷(이하 "당사")과 여행자가 체결한 국외여행계약의 세부 이행 및 준수사항을 정함을 목적으로 합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제2조 (당사와 여행자 의무)</div>
    <div>당사는 여행자에게 안전하고 만족스러운 여행서비스를 제공하기 위해 최선을 다하여야 하며, 여행자는 안전하고 즐거운 여행을 위해 당사의 관련 규정에 따라야 합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제3조 (용어의 정의)</div>
    <div>① "기획여행"이라 함은 당사가 미리 여행목적지·여행일정·여행서비스 내용 및 여행요금 등을 정하고 이에 참가하는 여행자를 모집하여 실시하는 여행을 말합니다.<br>
    ② "희망여행"이라 함은 여행자가 희망하는 여행조건에 따라 당사가 실시하는 여행을 말합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제4조 (계약의 구성)</div>
    <div>여행계약은 여행계약서(이하 "계약서")와 여행약관·여행일정표(또는 여행설명서)를 계약내용으로 합니다. 계약서에 기재된 사항이 약관과 다른 경우에는 계약서에 기재된 사항을 우선합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제5조 (특약)</div>
    <div>당사와 여행자는 관련법령에 위반하지 않는 범위 내에서 이 약관의 내용과 다른 사항을 약정할 수 있으며, 이 경우 특약이 이 약관에 우선합니다. 크루즈 여행 특별약관이 있는 경우 특별약관이 우선합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제6조 (계약서 교부)</div>
    <div>당사는 여행자와 여행계약을 체결한 경우 계약서를 2부 작성하여 여행자에게 1부를 교부하여야 합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제7조 (계약서 교부 간주)</div>
    <div>여행일정, 여행요금, 여행서비스 내용 등을 전자문서의 방법으로 제공하고 여행자가 이를 확인하여 계약을 체결한 경우 계약서를 교부한 것으로 봅니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제8조 (당사의 책임)</div>
    <div>① 당사는 여행 출발 시부터 도착 시까지 당사가 여행자에게 제공하기로 한 여행서비스가 불성실하게 이행된 경우 여행자에게 손해를 배상합니다.<br>
    ② 당사의 귀책사유에 의한 경우가 아닌 다음 각 호의 경우에는 배상책임을 지지 않습니다.<br>
    1. 여행자의 고의 또는 과실로 인한 경우<br>
    2. 여행자 자신의 신체이상으로 인한 경우<br>
    3. 자연재해, 전쟁, 항공기 결항·연착, 기타 불가항력적 사유로 인한 경우<br>
    4. 여행 중 발생한 여행자의 신변 사고로 당사에 귀책사유가 없는 경우</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제9조 (최저 행사인원 미충족시 계약해제)</div>
    <div>① 당사는 최저행사인원에 미달되어 여행계약을 해제하는 경우 다음의 기준에 따른 손해를 배상합니다.<br>
    1. 여행개시 7일 전까지 통보: 계약금 환급<br>
    2. 여행개시 1일 전까지 통보: 여행요금의 30% 배상<br>
    3. 여행 당일 통보: 여행요금의 50% 배상<br>
    ② 당사가 최저행사인원 미충족을 이유로 계약을 해제하는 경우 여행개시 7일 전까지 여행자에게 통지하여야 합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제10조 (당사의 계약해제)</div>
    <div>당사는 여행자가 다음 각 호의 1에 해당하는 경우 일정 기간을 정하여 계약의 이행을 최고하고, 기간 내 불이행 시 계약을 해제할 수 있습니다.<br>
    1. 계약금 또는 여행요금을 납부하지 않은 경우<br>
    2. 관련법령에서 여행을 제한하거나 금지한 경우<br>
    3. 여행자의 질병, 부상 등으로 여행이 불가능하다고 의사 또는 전문가가 인정한 경우</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제11조 (여행요금)</div>
    <div>① 여행자는 계약 체결과 동시에 계약금을 납부하여야 합니다.<br>
    ② 잔금의 납부는 여행 출발 전 당사가 지정한 날까지 완납하여야 합니다.<br>
    ③ 여행요금에 포함되지 않은 비용(선내팁, 개인 경비 등)은 여행자가 부담하여야 합니다.<br>
    ④ 여행자가 여행 출발 후 자기 사정으로 여행에 참가하지 못한 경우 불참가 기간에 대한 환급은 없습니다.<br>
    ⑤ 여행자가 여행 출발 후 자기 사정으로 중도 포기하는 경우 잔여 여행요금은 환급되지 않습니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제12조 (여행요금 변경)</div>
    <div>항공운임 또는 관련 운임이 계약 당시보다 5% 이상 증감하거나, 여행요금에 적용된 외화환율이 계약 당시보다 2% 이상 변동된 경우 당사 또는 여행자는 그 증감 또는 변동분을 여행요금에 추가하거나 공제할 수 있습니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제13조 (여행업자의 계약이행 의무)</div>
    <div>당사는 여행자와 계약한 여행일정 내용이 정상적으로 이행될 수 있도록 최선을 다하여야 하며, 여행 중 예정된 여행지 변경, 여행 내용 변경, 여행요금 변경 등 계약을 불이행하는 경우 여행자에게 적절한 대가를 지급하여야 합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제14조 (손해배상)</div>
    <div>① 당사의 귀책사유로 여행이 개시되지 않거나 현저하게 변경된 경우에는 여행자에게 손해를 배상합니다.<br>
    ② 당사는 현지여행사 또는 업체의 잘못이 원인이 되어 여행자에게 발생한 손해도 배상합니다.<br>
    ③ 여행자의 귀책사유로 당사에 손해를 끼친 경우에도 동등하게 배상 의무가 발생합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제15조 (여행 출발 전 계약해제)</div>
    <div>① 당사 또는 여행자는 여행 출발 전 여행계약을 해제할 수 있으며, 계약 해제 시 취소료 등을 지급합니다.<br>
    ② 다음 각 호의 경우 손해배상 없이 여행계약을 해제할 수 있습니다.<br>
    1. 배우자 또는 직계존비속의 병환·사망<br>
    2. 본인의 입원치료가 필요한 부상·질병 발생<br>
    3. 여행목적지의 천재지변, 전쟁, 폭동 등 불가항력적 사유 발생<br>
    4. 외교부 여행경보 위험단계(여행자제 이상) 발령<br>
    5. 국가 또는 지방자치단체의 불가피한 여행 금지 조치<br>
    6. 감염병 확산으로 정부가 해당 국가 입국 금지를 공표한 경우</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제16조 (여행 출발 후 계약해제)</div>
    <div>당사 또는 여행자는 여행 출발 후에도 부득이한 사유가 있는 경우 계약을 해제할 수 있으며, 이 경우 당사는 여행자가 귀환하는 데 필요한 교통편 마련, 비용 정산 등의 사항을 처리합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제17조 (여행의 시작과 종료)</div>
    <div>여행의 시작은 탑승수속 완료 시점부터이며, 여행의 종료는 여행자가 국내 입국장의 보세구역을 이탈하는 시점으로 합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제18조 (여행의 중요 변경)</div>
    <div>당사는 천재지변, 항공기 결항, 기타 불가항력 등의 사유로 이미 제공된 여행서비스의 내용을 변경하고자 하는 경우 변경 전에 여행자에게 통보하여야 합니다. 단, 긴급한 경우 변경 후 즉시 통보합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제19조 (보험가입)</div>
    <div>① 당사는 여행업 영위를 위해 영업보증보험에 가입합니다.<br>
    ② 여행자 보험(상해·질병·휴대품 손해 등)은 계약서에 기재된 가입 여부에 따릅니다.<br>
    ③ 여행자 보험에 가입한 경우 보험증권 사본을 여행자에게 제공합니다.</div>
  </div>

  <div class="terms-article">
    <div class="art-title">제20조 (손해배상의 감경)</div>
    <div>당사 또는 여행자의 손해배상액은 각자의 귀책사유 정도에 따라 그 일부 또는 전부가 감경될 수 있으며, 과실 비율은 관계 법령 및 대법원 판례에 따라 산정합니다.</div>
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

  <p style="font-size:7.5pt;color:#555;margin:4px 0 10px;line-height:1.7;">
    ※ 취소 기준일은 여행 출발일 00:00 기준으로 계산합니다.<br>
    ※ 크루즈 상품 특성상 선사 취소 수수료가 별도 부과될 수 있습니다.<br>
    ※ 노쇼(No-Show) 시 여행요금 전액 취소수수료가 부과됩니다.<br>
    ※ 단체 예약(10인 이상)은 별도 취소 약정이 적용됩니다.<br>
    ※ 비자 거부에 의한 취소는 여행자 귀책으로 취소수수료가 부과됩니다.<br>
    ※ 항공권이 포함된 경우 항공사 페널티가 추가 부과될 수 있습니다.<br>
    ※ 여행보험 가입 여부와 관계없이 취소수수료는 면제되지 않습니다.
  </p>

  <div class="terms-article">
    <div class="art-title">제3조 (여권 및 비자)</div>
    <div>여권 유효기간은 여행 출발일 기준 6개월 이상 남아있어야 합니다. 여권 또는 비자 미비로 인한 탑승 거부·입국 거부의 책임은 여행자에게 있습니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제4조 (예약금 납부)</div>
    <div>예약 후 당사가 지정한 기한(통상 3영업일) 이내에 계약금을 납부하여야 하며, 미납 시 예약이 자동 취소될 수 있습니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제5조 (잔금 납부)</div>
    <div>잔금은 출발일 이전 당사가 정한 날짜까지 완납하여야 합니다. 잔금 미납 시 당사는 계약을 해제하고 기납부 금액 중 취소료를 공제 후 환급합니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제6조 (미성년자 및 탑승 제한)</div>
    <div>18세 미만 미성년자는 성인 보호자와 동반하여야 합니다. 생후 6개월 미만 유아 및 임신 24주(6개월) 이상인 경우 선사 규정에 따라 탑승이 제한될 수 있으며, 이로 인한 불이익의 책임은 여행자에게 있습니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제7조 (기항지 투어)</div>
    <div>기항지 투어는 선택사항이며, 불참 시 환불 여부는 상품 조건에 따릅니다. 기항지 투어 중 발생한 사고에 대하여 당사는 현지 업체 귀책의 경우를 제외하고 책임지지 않습니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제8조 (선내 구매물품)</div>
    <div>선내 면세점 구매 물품 및 기항지 쇼핑 물품은 교환·환불이 불가합니다. 선내 카지노 이용은 해당 국가 법령에 따르며, 발생한 손실에 대해 당사는 책임지지 않습니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제9조 (크루즈 특별 취소 및 불가항력 면책)</div>
    <div>① 선사의 선박 결함, 기계 고장, 안전 문제 등 선사 귀책으로 크루즈가 취소된 경우 당사는 선사로부터 환급받은 금액 전액을 여행자에게 지급합니다.<br>
    ② 전쟁, 내란, 테러, 천재지변(지진·화산·허리케인 등), 기상악화(항만 폐쇄·접안 불가), WHO 선언 팬데믹, 방사능 오염, 국가 간 항로 폐쇄 등 불가항력적 사유로 크루즈가 취소 또는 변경되는 경우 당사는 이미 지출된 실비(선사 페널티, 항공 수수료, 현지 랜드사 계약금 등)를 공제한 금액만 환급하며, 추가 손해배상 의무는 없습니다.<br>
    ③ ②항의 불가항력 사유는 국제 공인 기관(WHO, IATA, 외교부 등) 또는 관련 정부기관의 공식 발표를 기준으로 합니다.<br>
    ④ 불가항력 사유 발생 시 당사는 여행자의 귀환을 위해 합리적인 범위 내에서 최선을 다합니다.</div>
  </div>
  <div class="terms-article">
    <div class="art-title">제10조 (선사 약관 우선)</div>
    <div>크루즈 선박 내 규정 및 선내 서비스에 관해서는 해당 선사(크루즈 운항사)의 약관이 우선 적용됩니다.</div>
  </div>

  <div class="gold-line"></div>
  <div class="page-break"></div>

  <!-- ===== 개인정보처리 동의사항 ===== -->
  <div class="section-h">개인정보처리 동의사항</div>

  <div class="privacy-box">
    <h4>① 개인정보 수집·이용 동의 (필수) — 개인정보보호법 제15조 제1항 근거</h4>
    <p><strong>수집 항목:</strong> 성명, 생년월일, 주소, 연락처, 이메일, 여권정보</p>
    <p><strong>수집 목적:</strong> 여행계약 이행, 여행자 보험 가입, 탑승 수속, 기항지 관련 서비스 제공</p>
    <p><strong>보유 기간:</strong> 목적 달성 시까지 (계약·결제 기록 5년, 분쟁 기록 3년)</p>
    <div class="privacy-check-row">
      ☑ 동의합니다 &nbsp;&nbsp; □ 동의하지 않습니다
      <span style="margin-left:20px;font-size:8pt;color:#888">(미동의 시 계약 체결 불가)</span>
    </div>
  </div>

  <div class="privacy-box">
    <h4>② 개인정보 제3자 제공 동의 (필수) — 개인정보보호법 제17조 제1항 근거</h4>
    <p><strong>제공 대상:</strong> 항공사, 선사(크루즈 운항사), 랜드사(현지여행사), 보험사</p>
    <p><strong>제공 목적:</strong> 크루즈 여행 서비스 제공 및 탑승수속</p>
    <p><strong>보유 기간:</strong> 크루즈 여행 서비스 종료 시까지</p>
    <div class="privacy-check-row">
      ☑ 동의합니다 &nbsp;&nbsp; □ 동의하지 않습니다
      <span style="margin-left:20px;font-size:8pt;color:#888">(미동의 시 계약 체결 불가)</span>
    </div>
  </div>

  <div class="privacy-box">
    <h4>③ 마케팅 정보 활용 동의 (선택) — 개인정보보호법 제22조 제4항 근거</h4>
    <p><strong>목적:</strong> 신상품·여행정보 안내 및 판매 권유</p>
    <p><strong>방법:</strong> 우편, 전화, 이메일, 문자, SNS</p>
    <p><strong>보유 기간:</strong> 동의 철회 시까지 (최대 계약 종료 후 5년)</p>
    <p style="font-size:7.5pt;color:#888;margin-top:4px;">
      ※ 동의하지 않으셔도 여행 계약 및 서비스 이용에 불이익이 없습니다.<br>
      ※ 동의 후 언제든지 고객센터(${COMPANY.phone})를 통해 철회 가능합니다.
    </p>
    <div class="privacy-check-row">
      □ 동의합니다 &nbsp;&nbsp; □ 동의하지 않습니다
    </div>
  </div>

  <!-- 분쟁해결 안내 -->
  <div style="margin:12px 0 8px;padding:8px 12px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9;font-size:8pt;color:#555;line-height:1.7;">
    <strong style="color:#1a3a6b;">■ 분쟁해결 안내</strong><br>
    여행계약에 관한 분쟁은 한국여행업협회(KATA) 또는 공정거래위원회에 신고하실 수 있습니다.<br>
    소비자상담센터: 국번없이 <strong>1372</strong> / 한국여행업협회(KATA): <strong>02-752-8601</strong>
  </div>

  <!-- 최종 확인 서명 -->
  <div style="margin-top:16px;padding:12px;border:2px solid #1a3a6b;border-radius:8px;background:#f8f9fc;">
    <p style="font-size:9pt;font-weight:600;color:#1a3a6b;margin-bottom:8px;">
      본인은 위 계약 내용 및 약관을 모두 확인하였으며, 이에 동의하여 서명합니다.
    </p>
    <p style="font-size:8.5pt;">계약일: <strong>${new Date().getFullYear()}년 ${new Date().getMonth()+1}월 ${new Date().getDate()}일</strong></p>
    <div class="sig-row" style="margin-top:8px;">
      <span>계약자 성명: <strong>${escapeHtml(data.mainTravelerName)}</strong></span>
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
