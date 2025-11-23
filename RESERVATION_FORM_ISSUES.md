# ReservationForm 컴포넌트 문제점 6가지

## 문제 1: generateRoomGroups 함수의 상태 업데이트 버그

**위치**: `314:339:components/partner/ReservationForm.tsx`

**문제점**:
```typescript
const generateRoomGroups = (purchases: CabinPurchase[]) => {
  // ... newRoomGroups 생성 ...
  
  setRoomGroups(newRoomGroups);
  
  // ❌ 문제: roomGroups는 아직 업데이트되지 않은 상태
  setUnassignedTravelers([...unassignedTravelers, ...roomGroups.flatMap((rg) => rg.travelers)]);
  
  // ❌ 문제: 상태 객체를 직접 변경하고 있음 (React 불변성 위반)
  roomGroups.forEach((rg) => {
    rg.travelers = [];
  });
};
```

**영향**: 
- 방 그룹 업데이트 시 기존 여행자들이 제대로 미배정 목록으로 이동하지 않음
- React의 불변성 원칙 위반으로 상태 업데이트가 제대로 반영되지 않을 수 있음

**해결 방법**:
- `setUnassignedTravelers` 호출 시 업데이트된 `newRoomGroups`를 참조
- 상태 객체 직접 변경 대신 새로운 배열 생성

---

## 문제 2: 드래그 앤 드롭 이벤트 핸들러 불일치

**위치**: `899:903:components/partner/ReservationForm.tsx`, `1598:1600:components/partner/ReservationForm.tsx`

**문제점**:
- `handleDragStart`는 `draggedTravelerRef.current`에만 저장하고 `e.dataTransfer`를 사용하지 않음
- 드래그 시작 시 데이터 전송 객체에 정보를 저장하지 않음

**영향**: 
- 일부 브라우저나 환경에서 드래그 앤 드롭이 제대로 작동하지 않을 수 있음
- 접근성 문제 (스크린 리더 등)

**해결 방법**:
- `e.dataTransfer.effectAllowed`와 `e.dataTransfer.setData()` 사용
- 접근성을 위한 키보드 대안 제공 고려

---

## 문제 3: 여권 스캔 실패 시 isScanning 상태 초기화 타이밍

**위치**: `870:896:components/partner/ReservationForm.tsx`

**문제점**:
```typescript
finally {
  if (traveler) {
    // ... isScanning을 false로 설정 ...
  }
  // ❌ 문제: traveler가 null이거나 undefined일 경우 처리가 안 됨
  // ❌ 문제: finally 블록에서 traveler를 다시 찾는 로직이 없음
}
```

**영향**: 
- 스캔 중 오류 발생 시 `isScanning` 상태가 영구적으로 `true`로 남을 수 있음
- UI가 로딩 상태로 고정될 수 있음

**해결 방법**:
- finally 블록에서 traveler를 다시 찾는 로직 추가
- 또는 try-catch 전에 traveler를 변수에 저장

---

## 문제 4: 결제 정보 자동 채우기 시 검증 부족

**위치**: `211:289:components/partner/ReservationForm.tsx`

**문제점**:
- `handlePaymentSelect`에서 결제 내역을 선택할 때 필수 필드 검증이 없음
- `payment.metadata.roomSelections`가 없거나 잘못된 형식일 때 에러 처리 부족

**영향**: 
- 잘못된 데이터로 폼이 채워질 수 있음
- 런타임 에러 발생 가능

**해결 방법**:
- metadata 구조 검증 추가
- 필수 필드 확인 및 기본값 처리

---

## 문제 5: 날짜 변환 함수의 복잡성과 유지보수성

**위치**: `480:591:components/partner/ReservationForm.tsx`

**문제점**:
- `convertDateToYYYYMMDD` 함수가 너무 길고 복잡함 (110줄)
- 여러 날짜 형식을 처리하지만 패턴 매칭 로직이 복잡하고 오류 발생 가능성 높음
- 중복된 패턴 검사 로직

**영향**: 
- 버그 발생 시 디버깅이 어려움
- 새로운 날짜 형식 추가 시 복잡도 증가
- 유지보수 어려움

**해결 방법**:
- 날짜 파싱 라이브러리 사용 (예: date-fns, dayjs)
- 또는 함수를 더 작은 단위로 분리

---

## 문제 6: 여행자 정보 업데이트 로직 중복

**위치**: `762:855:components/partner/ReservationForm.tsx`

**문제점**:
- 방에 배정된 여행자와 미배정 여행자의 업데이트 로직이 거의 동일하지만 분리되어 있음
- 코드 중복으로 유지보수 어려움
- 한쪽 로직 수정 시 다른 쪽도 동일하게 수정해야 함

**예시**:
```typescript
// 방에 배정된 여행자 업데이트 (764-811줄)
if (isInRoom) {
  setRoomGroups((prevRoomGroups) => {
    // ... 복잡한 로직 ...
  });
} else {
  // 미배정 여행자 업데이트 (812-854줄)
  setUnassignedTravelers((prevTravelers) => {
    // ... 거의 동일한 로직 ...
  });
}
```

**영향**: 
- 코드 중복 증가
- 버그 수정 시 두 곳 모두 수정 필요
- 가독성 저하

**해결 방법**:
- 공통 업데이트 함수 추출
- 헬퍼 함수를 사용하여 중복 제거

---

## 요약

| 번호 | 문제 | 심각도 | 우선순위 |
|------|------|--------|----------|
| 1 | generateRoomGroups 상태 업데이트 버그 | 높음 | ⚠️⚠️⚠️ |
| 2 | 드래그 앤 드롭 이벤트 처리 | 중간 | ⚠️⚠️ |
| 3 | isScanning 상태 초기화 | 중간 | ⚠️⚠️ |
| 4 | 결제 정보 검증 부족 | 중간 | ⚠️⚠️ |
| 5 | 날짜 변환 함수 복잡성 | 낮음 | ⚠️ |
| 6 | 코드 중복 | 낮음 | ⚠️ |



