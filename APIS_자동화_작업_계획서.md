# 🚢 APIS 자동화 시스템 작업 계획서

> **작성일**: 2025.11.22  
> **작업 목적**: 여권 PNR 구글시트 자동화 및 관리자 효율화  
> **참고 파일**: `20251122재미나이여권PNR구글시트대화백업.txt`, `더블유 전달 크루즈 네임 업로드(마비즈) .xlsx`

---

## 📋 1. 작업 목표

### 1.1 핵심 목표
1. **APIS 자동화**: 구매 고객이 여행 등록 시 자동으로 APIS 정보 생성 및 구글시트 등록
2. **관리자 효율화**: 관리자 패널에서 구매 고객 APIS 정보 수정 및 관리
3. **동행자 관리**: 동행자를 잠재고객으로 자동 생성하여 다음 여행 시 재사용
4. **여권 만료 알람**: 여권 만료 6개월 전 자동 알람 설정
5. **여권 파일 그룹핑**: 여행별로 여권 파일을 서버와 구글 드라이브에 그룹핑 저장

### 1.2 기존 소스 구조 준수
- ✅ **기존 Trip 모델 사용** (새로 생성하지 않음)
- ✅ **기존 CruiseProduct 모델과 자연스러운 연결**
- ✅ **기존 Reservation, Traveler 모델 활용** (이미 schema.prisma에 존재)
- ✅ **고객 관리 페이지 구조 참고하여 일관성 유지**

---

## 📊 2. 데이터베이스 구조 (기존 모델 활용)

### 2.1 기존 모델 구조 확인

**Trip 모델** (이미 존재)
```prisma
model Trip {
  id                 Int
  userId             Int
  productId          Int?
  productCode        String? // APIS용 (이미 추가됨)
  shipName           String? // APIS용 (이미 추가됨)
  departureDate      DateTime? // APIS용 (이미 추가됨)
  googleFolderId     String? // APIS용 (이미 추가됨)
  spreadsheetId      String? // APIS용 (이미 추가됨)
  // ... 기존 필드들
  Reservation        Reservation[]
  CruiseProduct      CruiseProduct?
}
```

**Reservation 모델** (이미 존재)
```prisma
model Reservation {
  id           Int
  tripId       Int
  userId       Int
  pnrStatus    String?
  totalPeople  Int
  cabinType    String?
  Traveler     Traveler[]
  Trip         Trip
  User         User
}
```

**Traveler 모델** (이미 존재)
```prisma
model Traveler {
  id                 Int
  reservationId      Int
  roomNumber         Int? // 방 배정 그룹핑
  korName            String
  engSurname         String?
  engGivenName       String?
  passportNo         String?
  residentNum        String? // 주민번호
  nationality        String?
  dateOfBirth        DateTime?
  passportExpiryDate DateTime?
  ocrRawData         Json?
  Reservation        Reservation
}
```

### 2.2 추가 필요 필드 확인
- Trip 모델: 이미 필요한 필드들이 추가되어 있음 (productCode, shipName, departureDate, googleFolderId, spreadsheetId)
- Reservation, Traveler 모델: 이미 필요한 필드들이 모두 있음

---

## 🔄 3. 작업 흐름 및 자동화 로직

### 3.1 구매 고객 여행 등록 시 자동 APIS 생성 흐름

```
1. 고객이 여행 등록 (온보딩 또는 관리자 배정)
   ↓
2. Trip 생성 시:
   - productId가 있으면 CruiseProduct에서 productCode, shipName 가져오기
   - departureDate = startDate로 설정
   ↓
3. Reservation 자동 생성:
   - tripId, userId 연결
   - 동행자 정보 입력 받으면 Traveler 생성
   ↓
4. 동행자 처리:
   - 각 동행자를 잠재고객(Prospect)으로 자동 생성
   - 동행자도 User 생성 (role: 'prospect' 또는 별도 처리)
   ↓
5. 구글 드라이브 폴더 생성:
   - Root > [출발일YYYYMMDD]_[선박명] > [예약자명]_[폰뒷자리] > 여권이미지
   ↓
6. 구글 시트 생성:
   - 여행별로 APIS 시트 생성
   - 양식: "더블유 전달 크루즈 네임 업로드(마비즈) .xlsx" 파일과 동일
   ↓
7. APIS 데이터 자동 입력:
   - Reservation 생성일 순 -> roomNumber 순
   - 헤더: A(순번), B(RV), C(CABIN), D(한국이름), E(영문성), F(영문이름), 
           G(여권번호), H(주민번호), I(국적), J(생년월일), K(여권만료일),
           L(방번호), M(예약상태), N(총인원), O(객실타입), P(예약자명),
           Q(예약자전화), ... V(여권링크)
```

### 3.2 반복 구매 시 자동화

```
고객이 2번째, 3번째 여행 등록 시:
1. 기존 Reservation, Traveler 정보 확인
2. 동행자가 이미 잠재고객으로 등록되어 있으면 재사용
3. 새 여행별로 별도 APIS 시트 생성
4. 구글 드라이브도 새 여행 폴더에 여권 파일 저장
```

---

## 📝 4. 구글 시트 양식 분석 (작업 필요)

### 4.1 양식 파일 확인 필요
- 파일: `더블유 전달 크루즈 네임 업로드(마비즈) .xlsx`
- 이 파일의 정확한 헤더와 형식을 확인하여 동일하게 맞춰야 함

### 4.2 예상 헤더 구조 (txt 파일 참고)
- A: 순번
- B: RV (Reservation Code)
- C: CABIN (객실 타입)
- D: 한국이름
- E: 영문성
- F: 영문이름
- G: 여권번호
- H: 주민번호
- I: 국적
- J: 생년월일
- K: 여권만료일
- L: 방번호
- M: 예약상태 (PNR Status)
- N: 총인원
- O: 객실타입
- P: 예약자명
- Q: 예약자전화
- ... V: 여권링크

---

## 🎯 5. 주요 기능 구현 계획

### 5.1 관리자 패널 - 크루즈 상품 관리 연동
- **위치**: `/app/admin/products/page.tsx`
- **기능**: 
  - 상품 등록/수정 시 productCode, shipName 등이 Trip에 자동 연결되도록 확인
  - 상품별로 연결된 Trip 목록 확인 가능
  - 상품별 APIS 시트 링크 표시

### 5.2 관리자 패널 - 고객 관리 확장
- **위치**: `/app/admin/customers/page.tsx` 구조 참고
- **신규 페이지**: `/app/admin/passport-pnr/page.tsx`
- **기능**:
  - 전체 예약(Reservation) 목록 조회
  - 여권 정보 수정
  - PNR 상태 수정
  - 구글시트 동기화 버튼
  - 여권 만료 알람 설정
  - 동행자 잠재고객 확인

### 5.3 APIS 자동 생성 API
- **엔드포인트**: 
  - `POST /api/trips/auto-create` (기존) - Trip 생성 시 APIS 자동 생성 트리거
  - `POST /api/admin/assign-trip` (기존) - 관리자 배정 시 APIS 자동 생성 트리거
  - `POST /api/apis/auto-generate` (신규) - Trip 생성 후 APIS 생성
- **기능**:
  - Trip 생성 시 자동으로 Reservation 생성
  - 동행자 정보 입력 시 Traveler 생성 및 잠재고객(User) 생성
  - 구글 드라이브 폴더 생성
  - 구글 시트 생성 및 데이터 입력

### 5.4 구글시트 동기화 API
- **엔드포인트**: `POST /api/admin/apis/sync`
- **기능**:
  - 기존 구글 시트 업데이트
  - 새 데이터 추가 또는 수정된 데이터 반영
  - 실시간 동기화

### 5.5 여권 만료 알람 시스템
- **스케줄러**: 기존 `proactiveEngine.ts`에 추가
- **기능**:
  - 매일 Traveler 테이블 스캔
  - passportExpiryDate가 6개월 이내인 경우 알람
  - 관리자에게 알림 또는 고객에게 안내 메시지

### 5.6 동행자 잠재고객 자동 생성
- **위치**: Reservation/Traveler 생성 시
- **로직**:
  ```typescript
  // 동행자 입력 시
  1. 동행자 이름, 전화번호 확인
  2. User 테이블에서 phone으로 검색
  3. 없으면:
     - User 생성 (role: 'prospect', customerType: 'prospect')
     - Prospect 테이블에도 추가 (선택)
  4. Traveler 생성 시 userId 연결 (동행자도 User로 관리)
  ```

---

## 📁 6. 파일 구조 및 작업 순서

### 6.1 작업 순서
1. ✅ **기존 구조 파악** (완료)
   - Trip, Reservation, Traveler 모델 확인
   - CruiseProduct 모델 확인
   - 고객 관리 페이지 구조 확인

2. ⏳ **APIS 양식 파일 분석** (필요)
   - `더블유 전달 크루즈 네임 업로드(마비즈) .xlsx` 파일 열어서 정확한 헤더 확인

3. ⏳ **구글시트 함수 구현** (`lib/google-sheets.ts`)
   - `createAPISSpreadsheet`: APIS 양식에 맞춰 시트 생성
   - `syncAPISToSheets`: Reservation/Traveler 데이터를 시트에 동기화
   - `createAPISFolder`: 구글 드라이브 폴더 구조 생성

4. ⏳ **Trip 생성 시 APIS 자동 생성 로직**
   - `app/api/trips/auto-create/route.ts` 수정
   - `app/api/admin/assign-trip/route.ts` 수정
   - Reservation, Traveler 자동 생성
   - 동행자 잠재고객 자동 생성

5. ⏳ **관리자 패널 - APIS 관리 페이지**
   - `/app/admin/passport-pnr/page.tsx` 생성 (고객 관리 페이지 구조 참고)
   - `/app/api/admin/passport-pnr/route.ts` 생성
   - `/components/admin/PassportPNRTable.tsx` 생성

6. ⏳ **여권 만료 알람 시스템**
   - `lib/proactive/passport-expiry-checker.ts` 생성
   - `proactiveEngine.ts`에 통합

7. ⏳ **여권 파일 업로드 및 그룹핑**
   - 여권 이미지 업로드 시 구글 드라이브에 그룹핑 저장
   - 여행별 폴더 구조 유지

---

## 🔍 7. 기존 코드와의 통합 포인트

### 7.1 Trip 생성 시점
- **파일**: `app/api/trips/auto-create/route.ts`
- **수정 내용**: Trip 생성 후 APIS 자동 생성 트리거 추가

### 7.2 관리자 여행 배정 시점
- **파일**: `app/api/admin/assign-trip/route.ts`
- **수정 내용**: Trip 생성 후 APIS 자동 생성 트리거 추가

### 7.3 CruiseProduct 연결
- **기존**: Trip.productId → CruiseProduct.id
- **APIS용**: Trip.productCode는 CruiseProduct.productCode와 연결
- **확인 필요**: Trip 생성 시 productCode가 제대로 설정되는지 확인

---

## ⚠️ 8. 주의사항

### 8.1 기존 소스 구조 준수
- ❌ **절대 하지 말 것**: Trip 모델을 trip으로 변경하거나 새로 생성
- ❌ **절대 하지 말 것**: 기존 필드명 변경 (productCode, shipName 등은 이미 존재)
- ✅ **해야 할 것**: 기존 구조 그대로 활용하여 기능 추가만

### 8.2 에러 방지
- 모든 Prisma 쿼리는 기존 필드명 사용
- TypeScript 타입은 기존 인터페이스 활용
- API 응답 구조는 고객 관리 API와 일관성 유지

### 8.3 데이터 무결성
- Reservation은 반드시 Trip과 User에 연결
- Traveler는 반드시 Reservation에 연결
- 동행자도 User로 관리하여 다음 여행 시 재사용

---

## 📋 9. 다음 단계 (작업 시작 전)

1. **APIS 양식 파일 정확한 분석** (Excel 파일 열어서 헤더 확인)
2. **기존 Trip 생성 로직 재확인** (어디서 어떻게 생성되는지)
3. **구글 드라이브 API 권한 확인** (서비스 계정 권한)
4. **구글 시트 API 권한 확인** (공유 드라이브 접근 가능 여부)

---

## ✅ 10. 작업 체크리스트

- [ ] APIS 양식 파일 분석 완료
- [ ] 기존 Trip 생성 로직 파악 완료
- [ ] 구글시트 함수 구현 (`lib/google-sheets.ts`)
- [ ] Trip 생성 시 APIS 자동 생성 로직 추가
- [ ] 동행자 잠재고객 자동 생성 로직 구현
- [ ] 관리자 패널 APIS 관리 페이지 구현
- [ ] 여권 만료 알람 시스템 구현
- [ ] 여권 파일 그룹핑 저장 기능 구현
- [ ] 테스트 및 검증

---

## 📌 11. 참고 파일

1. `20251122재미나이여권PNR구글시트대화백업.txt` - 요구사항 정리
2. `더블유 전달 크루즈 네임 업로드(마비즈) .xlsx` - APIS 양식 파일
3. `app/admin/customers/page.tsx` - 고객 관리 페이지 구조 참고
4. `app/api/admin/customers/route.ts` - API 구조 참고
5. `components/admin/CustomerTable.tsx` - 테이블 컴포넌트 구조 참고

---

**작업 시작 전에 이 계획서를 검토하고, APIS 양식 파일을 정확히 분석한 후 작업을 진행해야 합니다.**

