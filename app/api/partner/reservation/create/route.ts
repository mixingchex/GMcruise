export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, SYSTEM_PASSWORDS } from '@/lib/password';
import { recordCustomerJourney } from '@/lib/customer-journey';
import { getSessionUser } from '@/lib/auth';
import { log, error as logError, warn } from '@/lib/logger-wrapper';

/**
 * 예약 생성 API
 * 
 * 주요 기능:
 * 1. PNR 그룹핑: roomNumber를 사용하여 같은 방 배정 그룹핑
 * 2. 싱글차지 처리: totalPeople === 1일 때 cabinType에 '싱글차지' 기록
 * 3. 동행자 자동 가입: 동행자가 없으면 role='PROSPECT'로 자동 회원가입
 * 
 * ⚠️ APIS 호환: 실제 DB에는 birthDate (String), expiryDate (String)만 있음
 * APIS 코드는 dateOfBirth/passportExpiryDate도 지원하므로 입력 데이터에서 양쪽 모두 처리
 */
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, message: '로그인이 필요합니다.' }, { status: 401 });
  }
  if (sessionUser.role !== 'partner' && sessionUser.role !== 'admin') {
    return NextResponse.json({ ok: false, message: '파트너 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { tripId, mainUser, travelers, cabinType, pnrStatus } = body;

    // ⚠️ 필수 필드 검증 완화: 여권 1명만 입력해도 저장 가능, 여권 0명이어도 저장 가능 (나중에 추가)
    if (!tripId || !travelers || !Array.isArray(travelers)) {
      return NextResponse.json(
        { ok: false, message: '필수 필드가 누락되었습니다. (tripId, travelers 필수)' },
        { status: 400 }
      );
    }
    
    // pnrStatus 화이트리스트 검증 (임의 문자열 저장 차단)
    const VALID_PNR_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'WAITLIST', 'CHECKED_IN'];
    const validatedPnrStatus = VALID_PNR_STATUSES.includes(pnrStatus) ? pnrStatus : 'PENDING';

    // ⚠️ mainUser.phone이 없어도 저장 가능 (이름만 있어도 가능)
    if (!mainUser || (!mainUser.name && !mainUser.phone)) {
      return NextResponse.json(
        { ok: false, message: '대표 예약자 이름 또는 연락처를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    // ⚠️ CruiseProduct 존재 확인 (Trip 모델이 없으므로 CruiseProduct를 직접 사용)
    // tripId는 실제로 CruiseProduct.id를 의미함
    const cruiseProduct = await prisma.cruiseProduct.findUnique({
      where: { id: tripId },
    });

    if (!cruiseProduct) {
      return NextResponse.json(
        { ok: false, message: '여행 상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 판매중지/판매완료 상품 예약 차단
    if (['판매중지', '판매완료', '준비중', '삭제'].includes(cruiseProduct.saleStatus || '')) {
      return NextResponse.json(
        { ok: false, message: '현재 예약할 수 없는 상품입니다.' },
        { status: 400 }
      );
    }

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. 메인 유저 처리: phone 또는 name으로 검색 -> 없으면 생성
      // ⚠️ Reservation은 mainUserId가 필수이므로 먼저 처리
      // ⚠️ phone이 없어도 name으로 검색 가능
      let mainUserData = null;
      
      if (mainUser.phone) {
        mainUserData = await tx.user.findFirst({
          where: { phone: mainUser.phone },
        });
      }
      
      // [WO-01] name 단독 findFirst 제거 — 동명이인 시 무관한 계정에 예약 연결되는 개인정보 위반 방지

      if (!mainUserData) {
        // [WO-PAY-15] 전화번호는 유출 가능 정보 — 비밀번호 소스 사용 금지. 동행자와 동일한 TEMP 정책
        const hashedPassword = await hashPassword(SYSTEM_PASSWORDS.TEMP);
        
        mainUserData = await tx.user.create({
          data: {
            phone: mainUser.phone || null, // phone이 없으면 null
            name: mainUser.name || null,
            email: mainUser.email || null,
            password: hashedPassword,
            role: 'user', // 메인 유저는 일반 사용자
            onboarded: false,
            updatedAt: new Date(), // 필수 필드
          },
        });
      } else {
        // 기존 유저 정보 업데이트 (이름, 이메일, phone)
        const updateData: any = {};
        if (mainUser.name && !mainUserData.name) {
          updateData.name = mainUser.name;
        }
        if (mainUser.phone && !mainUserData.phone) {
          updateData.phone = mainUser.phone;
        }
        if (mainUser.email && !mainUserData.email) {
          updateData.email = mainUser.email;
        }

        if (Object.keys(updateData).length > 0) {
          mainUserData = await tx.user.update({
            where: { id: mainUserData.id },
            data: updateData,
          });
        }
      }

      // 2. 동행자 자동 가입 처리 (PROSPECT 역할)
      // 여권 스캔 정보를 기반으로 User를 자동 생성하고 Traveler와 연결
      const travelerUserMap: Map<number, number> = new Map(); // travelerIndex -> userId 매핑
      
      // ⚠️ 싱글차지 여부 확인: 동일 여권번호가 2개 이상이면 싱글차지로 간주
      const passportCounts = new Map<string, number>();
      travelers.forEach((t) => {
        if (t.passportNo) {
          passportCounts.set(t.passportNo, (passportCounts.get(t.passportNo) || 0) + 1);
        }
      });
      const isSingleCharge = travelers.length === 1 || 
        (passportCounts.size === 1 && Array.from(passportCounts.values())[0] >= 2);
      // 동일 여권번호가 2개 이상이면 싱글차지 (동일 인물 여권 두 번 입력)
      
      // ⚠️ 싱글차지인 경우, 동일 여권번호를 가진 여행자들을 같은 User로 매핑하기 위한 Map
      const passportToUserIdMap = new Map<string, number>();
      
      for (let i = 0; i < travelers.length; i++) {
        const traveler = travelers[i];
        
        // 메인 유저와 동일한 경우 메인 유저 ID 사용
        if (traveler.phone === mainUser.phone) {
          travelerUserMap.set(i, mainUserData.id);
          // 싱글차지인 경우, 동일 여권번호 매핑에도 추가
          if (isSingleCharge && traveler.passportNo) {
            passportToUserIdMap.set(traveler.passportNo, mainUserData.id);
          }
          continue;
        }

        let travelerUser: any = null;
        let foundBy: string = '';

        // ⚠️ 싱글차지인 경우: 동일 여권번호를 가진 여행자가 이미 처리되었으면 같은 User 사용
        if (isSingleCharge && traveler.passportNo && passportToUserIdMap.has(traveler.passportNo)) {
          const existingUserId = passportToUserIdMap.get(traveler.passportNo)!;
          travelerUserMap.set(i, existingUserId);
          continue;
        }

        // 우선순위 1: phone 번호로 찾기
        if (traveler.phone) {
          travelerUser = await tx.user.findFirst({
            where: { phone: traveler.phone },
          });
          if (travelerUser) {
            foundBy = 'phone';
          }
        }

        // 우선순위 2: 여권번호로 찾기 (phone이 없거나 찾지 못한 경우)
        // Traveler 테이블을 통해 역참조: 같은 여권번호를 가진 Traveler -> Reservation -> User
        if (!travelerUser && traveler.passportNo) {
          const existingTraveler = await tx.traveler.findFirst({
            where: { passportNo: traveler.passportNo },
            include: {
              Reservation: {
                select: { mainUserId: true },
              },
            },
          });

          if (existingTraveler?.Reservation?.mainUserId) {
            travelerUser = await tx.user.findUnique({
              where: { id: existingTraveler.Reservation.mainUserId },
            });
            if (travelerUser) {
              foundBy = 'passport';
            }
          }
        }

        // 우선순위 3: 이름 + 생년월일로 찾기 (phone과 passportNo가 모두 없는 경우)
        // Traveler 테이블을 통해 역참조: 같은 이름과 생년월일을 가진 Traveler -> Reservation -> User
        // ⚠️ 실제 DB에는 birthDate (String) 필드만 있음 - dateOfBirth 사용 금지!
        if (!travelerUser && traveler.korName && (traveler.birthDate || traveler.dateOfBirth)) {
          // birthDate를 YYYY-MM-DD 형식으로 변환 (입력 데이터에서 dateOfBirth도 지원)
          const birthDateValue = traveler.birthDate || traveler.dateOfBirth;
          const birthDateStr = typeof birthDateValue === 'string' 
            ? birthDateValue.split('T')[0] 
            : new Date(birthDateValue).toISOString().split('T')[0];
          
          // ⚠️ 실제 DB 필드명 birthDate 사용 (String)
          const existingTraveler = await tx.traveler.findFirst({
            where: {
              korName: traveler.korName,
              birthDate: birthDateStr, // String 필드로 직접 비교
            },
            include: {
              Reservation: {
                select: { mainUserId: true },
              },
            },
          });

          if (existingTraveler?.Reservation?.mainUserId) {
            travelerUser = await tx.user.findUnique({
              where: { id: existingTraveler.Reservation.mainUserId },
            });
            if (travelerUser) {
              foundBy = 'name+birth';
            }
          }
        }

        // User를 찾지 못한 경우 새로 생성 (PROSPECT 역할)
        if (!travelerUser) {
          // 비밀번호 생성 — 여권번호는 개인정보보호법상 비밀번호 소스 사용 금지
          // PROSPECT 계정은 임시 비밀번호로 생성 (관리자가 나중에 변경)
          const hashedPassword = await hashPassword(SYSTEM_PASSWORDS.TEMP);
          
          // OCR로 얻은 모든 정보를 User에 저장
          travelerUser = await tx.user.create({
            data: {
              phone: traveler.phone || null, // phone이 있으면 저장, 없으면 null
              name: traveler.korName || traveler.name || null, // 한글 이름 우선
              email: traveler.email || null,
              password: hashedPassword,
              role: 'PROSPECT', // 잠재고객 역할
              onboarded: false,
              customerStatus: 'PROSPECT', // 고객 상태도 설정
              updatedAt: new Date(), // 필수 필드
            },
          });

        } else {
          // 기존 User 정보 업데이트 (OCR로 얻은 정보로 보강)
          const updateData: any = {};
          if (traveler.korName && !travelerUser.name) {
            updateData.name = traveler.korName;
          }
          if (traveler.phone && !travelerUser.phone) {
            updateData.phone = traveler.phone;
          }
          if (traveler.email && !travelerUser.email) {
            updateData.email = traveler.email;
          }

          if (Object.keys(updateData).length > 0) {
            travelerUser = await tx.user.update({
              where: { id: travelerUser.id },
              data: updateData,
            });
            // 기존 User 정보 업데이트 로그 (개인정보 미포함)
          }
        }

        // 매핑 저장 (travelerIndex -> userId)
        if (travelerUser) {
          travelerUserMap.set(i, travelerUser.id);
          // ⚠️ 싱글차지인 경우, 동일 여권번호 매핑에도 추가
          if (isSingleCharge && traveler.passportNo) {
            passportToUserIdMap.set(traveler.passportNo, travelerUser.id);
          }
        }
      }

      // 3. 싱글차지 처리: totalPeople이 1명이거나 동일 여권번호가 2개 이상이면 '싱글차지' 기록
      const totalPeople = travelers.length;
      // [1-2] cabinType 영문→한글 정규화 (MallProductContent에서 영문값이 올 수 있음)
      const CABIN_TYPE_MAP: Record<string, string> = {
        'INSIDE': '인사이드', 'inside': '인사이드',
        'OCEANVIEW': '오션뷰', 'oceanview': '오션뷰', 'OCEAN_VIEW': '오션뷰',
        'BALCONY': '발코니', 'balcony': '발코니',
        'SUITE': '스위트', 'suite': '스위트',
      };
      const normalizedCabinType = cabinType ? (CABIN_TYPE_MAP[cabinType] ?? cabinType) : null;
      let finalCabinType = normalizedCabinType;

      if (isSingleCharge) {
        finalCabinType = normalizedCabinType ? `${normalizedCabinType} (싱글차지)` : '싱글차지';
        // [WO-LOG-01] 삭제 — DEBUG 레벨, 로직에 이미 반영됨
      }

      // 3. Trip 확인 및 생성 (Reservation.tripId → Trip.id FK)
      // upsert 사용: productCode @unique 충돌로 인한 동시 요청 race condition 방지
      const trip = await tx.trip.upsert({
        where: { productCode: cruiseProduct.productCode },
        update: {},
        create: {
          productCode: cruiseProduct.productCode,
          shipName: cruiseProduct.shipName,
          departureDate: cruiseProduct.startDate || new Date(),
          endDate: cruiseProduct.endDate || null,
          status: 'Upcoming',
          updatedAt: new Date(),
        },
        select: { id: true },
      });

      // Reservation에서 사용할 tripId는 Trip.id (FK: Reservation.tripId -> Trip.id)
      // ⚠️ UserTrip 생성은 트랜잭션 밖에서 처리 (tx 내 try/catch 시 PostgreSQL aborted 상태 위험)
      const reservationTripId = trip.id;

      // 4. 예약 생성 (Reservation.tripId → Trip.id FK)
      const reservation = await tx.reservation.create({
        data: {
          tripId: reservationTripId, // Trip.id 사용 (FK 정확성 보장)
          mainUserId: mainUserData.id, // ⚠️ Reservation 모델에 mainUserId 필드가 필수 (userId 아님)
          totalPeople,
          cabinType: finalCabinType, // 싱글차지 정보 포함
          pnrStatus: validatedPnrStatus, // PNR 상태 저장 (화이트리스트 검증됨)
        },
      });

      // 5. 여행자 등록 (roomNumber 그룹핑 처리 및 User 연결)
      const createdTravelers = [];
      const roomNumberMap = new Map<string, number>(); // roomKey -> roomNumber 매핑
      let nextRoomNumber = 1;

      for (let i = 0; i < travelers.length; i++) {
        const traveler = travelers[i];
        
        // roomNumber가 명시적으로 지정된 경우
        // ⚠️ 실제 DB에서 roomNumber는 필수(Int)이므로 항상 숫자 값 보장
        let roomNumber: number;
        
        if (traveler.roomNumber !== undefined && traveler.roomNumber !== null) {
          // 명시적으로 지정된 roomNumber 사용
          roomNumber = traveler.roomNumber;
        } else if (traveler.roomKey) {
          // roomKey를 사용하여 그룹핑 (같은 roomKey는 같은 roomNumber)
          if (roomNumberMap.has(traveler.roomKey)) {
            roomNumber = roomNumberMap.get(traveler.roomKey)!;
          } else {
            roomNumber = nextRoomNumber;
            roomNumberMap.set(traveler.roomKey, roomNumber);
            nextRoomNumber++;
          }
        } else {
          // roomNumber나 roomKey가 없으면 메인 유저와 같은 방으로 간주
          if (traveler.phone === mainUser.phone) {
            roomNumber = 1; // 메인 유저는 항상 방 1
            roomNumberMap.set('main', 1);
          } else {
            // 새로운 방 배정
            roomNumber = nextRoomNumber;
            nextRoomNumber++;
          }
        }

        // 연결된 User ID 가져오기
        const userId = travelerUserMap.get(i) || null;

        // Traveler 생성 (OCR로 얻은 모든 정보 저장)
        // ⚠️ 실제 DB에는 birthDate, issueDate, expiryDate (모두 String) 필드만 있음
        // APIS 시스템은 dateOfBirth/passportExpiryDate도 지원하므로 입력 데이터에서 양쪽 모두 처리
        // 날짜를 YYYY-MM-DD 형식의 String으로 변환
        const birthDateValue = traveler.birthDate || traveler.dateOfBirth;
        const birthDateFormatted = birthDateValue 
          ? (typeof birthDateValue === 'string' ? birthDateValue.split('T')[0] : new Date(birthDateValue).toISOString().split('T')[0])
          : null;
        
        const expiryDateValue = traveler.expiryDate || traveler.passportExpiryDate;
        const expiryDateFormatted = expiryDateValue
          ? (typeof expiryDateValue === 'string' ? expiryDateValue.split('T')[0] : new Date(expiryDateValue).toISOString().split('T')[0])
          : null;
        
        const issueDateValue = traveler.issueDate || null;
        const issueDateFormatted = issueDateValue
          ? (typeof issueDateValue === 'string' ? issueDateValue.split('T')[0] : new Date(issueDateValue).toISOString().split('T')[0])
          : null;

        // Traveler 생성 (실제 DB 스키마에 맞춰 String 필드 사용)
        // ⚠️ 실제 DB: roomNumber는 필수(Int), isSingleCharge 필드 있음
        const travelerData: any = {
          reservationId: reservation.id,
          userId, // 연결된 User ID (여권 스캔으로 자동 등록된 고객)
          roomNumber, // 방 배정 번호 (필수 Int, 항상 숫자 값 보장됨)
          isSingleCharge: isSingleCharge, // 싱글차지 여부
          korName: traveler.korName || traveler.name || null, // 한글 이름 - 1
          engSurname: traveler.engSurname || null, // 영문 성 - 2
          engGivenName: traveler.engGivenName || null, // 영문 이름 - 3
          passportNo: traveler.passportNo || null, // 여권번호 - 4
          residentNum: traveler.residentNum || null, // 주민번호
          nationality: traveler.nationality || null, // 국적 - 5
          birthDate: birthDateFormatted, // 생년월일 (String) - 6 (APIS: dateOfBirth로도 입력 가능)
          gender: traveler.gender || null, // 성별 (M 또는 F) - 7
          issueDate: issueDateFormatted, // 여권 발급일 (String) - 8
          expiryDate: expiryDateFormatted, // 여권 만료일 (String) - 9 (APIS: passportExpiryDate로도 입력 가능)
          passportImage: null, // 여권 이미지: base64 원본은 DB 저장 금지. Drive 업로드 성공 후 URL로 업데이트됨 (WO-01)
        };

        const createdTraveler = await tx.traveler.create({
          data: travelerData,
        });

        // Traveler 생성 완료 (개인정보는 로그 미포함)

        createdTravelers.push(createdTraveler);
      }

      return { 
        reservation, 
        mainUser: mainUserData, 
        travelers: createdTravelers,
        travelerUsers: Array.from(travelerUserMap.entries()).map(([index, userId]) => ({ 
          travelerIndex: index,
          userId,
          travelerName: travelers[index]?.korName || travelers[index]?.name || 'Unknown',
        })),
      };
    });

    log(`[Reservation Create] 예약 생성 완료: reservationId=${result.reservation.id}`);

    // 여권 이미지 구글 드라이브 백업 (트랜잭션 외부에서 실행)
    if (result.travelers && result.travelers.length > 0 && travelers && travelers.length > 0) {
      for (let i = 0; i < result.travelers.length; i++) {
        const createdTraveler = result.travelers[i];
        const originalTraveler = travelers[i];
        if (originalTraveler?.passportImage && createdTraveler.passportNo) {
          try {
            // base64 이미지를 Buffer로 변환
            const base64Data = originalTraveler.passportImage.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // 구글 드라이브 백업
            const { findOrCreateFolder, uploadFileToDrive } = await import('@/lib/google-drive');
            
            // 여권 백업 폴더 ID 가져오기
            let rootFolderId = process.env.GOOGLE_DRIVE_PASSPORT_FOLDER_ID;
            if (!rootFolderId) {
              const config = await prisma.systemConfig.findUnique({
                where: { configKey: 'google_drive_passports_folder_id' },
              });
              rootFolderId = config?.configValue || '1Nen5t7rE8WaT9e4xWswSiUNJIcgMiDRF';
            }
            
            // 여행 상품 폴더 생성/검색
            const trip = await prisma.trip.findUnique({
              where: { id: result.reservation.tripId },
              select: { id: true, productCode: true, departureDate: true, shipName: true, googleFolderId: true },
            });
            // Trip.productCode로 CruiseProduct 별도 조회 (Trip에 CruiseProduct 직접 relation 없음)
            const tripCruiseProduct = trip?.productCode
              ? await prisma.cruiseProduct.findUnique({ where: { productCode: trip.productCode }, select: { shipName: true } })
              : null;

            if (trip && tripCruiseProduct) {
              const departureDate = trip.departureDate ? new Date(trip.departureDate).toISOString().split('T')[0].replace(/-/g, '') : 'UNKNOWN';
              const tripFolderName = `${departureDate}_${trip.shipName || tripCruiseProduct.shipName || 'UNKNOWN'}`;
              const tripFolderResult = await findOrCreateFolder(tripFolderName, rootFolderId);
              
              if (tripFolderResult.ok && tripFolderResult.folderId) {
                // Trip.googleFolderId 저장 (첫 번째 여권 업로드 시 1회만) — WO-NEW-06-B
                if (trip?.id && !trip.googleFolderId) {
                  await prisma.trip.update({
                    where: { id: trip.id },
                    data: { googleFolderId: tripFolderResult.folderId },
                  }).catch((err: unknown) => {
                    logError('[Reservation Create] googleFolderId DB 저장 실패 (비차단)', {
                      tripId: trip.id,
                      errorType: (err as any)?.constructor?.name,
                      prismaCode: (err as any)?.code,
                    });
                  });
                }
                // 예약 그룹 폴더 생성/검색
                const mainUserPhone = result.mainUser.phone || '';
                const phoneLast4 = mainUserPhone.length >= 4 ? mainUserPhone.slice(-4) : '0000';
                const groupFolderName = `${result.mainUser.name || 'UNKNOWN'}_${phoneLast4}`;
                const groupFolderResult = await findOrCreateFolder(groupFolderName, tripFolderResult.folderId);
                
                if (groupFolderResult.ok && groupFolderResult.folderId) {
                  // 파일명 생성
                  const engName = `${createdTraveler.engSurname || ''}_${createdTraveler.engGivenName || ''}`.trim() || createdTraveler.korName || 'UNKNOWN';
                  const fileName = `${createdTraveler.passportNo}_${engName.toUpperCase()}.jpg`;
                  
                  // 파일 업로드
                  const uploadResult = await uploadFileToDrive({
                    folderId: groupFolderResult.folderId,
                    fileName,
                    mimeType: 'image/jpeg',
                    buffer: imageBuffer,
                    makePublic: false,
                  });
                  
                  if (uploadResult.ok && uploadResult.url) {
                    log(`[Reservation Create] 여권 이미지 구글 드라이브 백업 완료: ${fileName}`);
                    // WO-01: Drive URL을 Traveler.passportImage에 저장
                    try {
                      await prisma.traveler.update({
                        where: { id: createdTraveler.id },
                        data: { passportImage: uploadResult.url },
                      });
                    } catch (dbErr) {
                      logError('[Reservation Create] passportImage DB 저장 실패 — Drive 고아파일 발생 가능', {
                        travelerId: createdTraveler?.id,
                        passportNo: createdTraveler?.passportNo || 'unknown',
                        errorType: (dbErr as any)?.constructor?.name,
                        prismaCode: (dbErr as any)?.code,
                      });
                      // 비차단: Drive 백업 성공, DB 링크만 누락 — 예약 프로세스 계속
                    }
                  }
                }
              }
            }
          } catch (error) {
            // [WO-LOG-01] error 객체 원본 제거 — Google API credential 노출 위험
            logError('[Reservation Create] 여권 이미지 구글 드라이브 백업 실패', { travelerId: createdTraveler?.id });
            // 백업 실패해도 예약은 계속 진행
          }
        }
      }
    }

    // UserTrip 생성 (가이드 앱 여정 데이터용, 트랜잭션 외부에서 실행 — 실패해도 예약에 영향 없음)
    try {
      const existingUserTrip = await prisma.userTrip.findFirst({
        where: { userId: result.mainUser.id, productId: tripId },
        select: { id: true },
      });
      if (!existingUserTrip) {
        await prisma.userTrip.create({
          data: {
            userId: result.mainUser.id,
            productId: tripId,
            cruiseName: `${cruiseProduct.cruiseLine} ${cruiseProduct.shipName}`,
            status: 'Upcoming',
            startDate: cruiseProduct.startDate || new Date(),
            endDate: cruiseProduct.endDate || new Date(),
            nights: cruiseProduct.nights || 0,
            days: cruiseProduct.days || 0,
            visitCount: 0,
            companionType: '가족',
            destination: cruiseProduct.itineraryPattern || [],
            updatedAt: new Date(),
          },
        });
      }
    } catch (userTripError: any) {
      // UserTrip 생성 실패는 예약 완료에 영향 없음 (가이드 앱 여정 데이터 누락만 발생)
      logError('[Reservation Create] UserTrip 생성 에러 (무시됨)', { errorType: userTripError?.constructor?.name });
    }

    // 고객 여정 기록: 구매고객으로 전환 (메인 유저 및 동행자 모두)
    try {
      // 메인 유저 여정 기록
      await recordCustomerJourney(
        result.mainUser.id,
        'purchase',
        'reservation_created',
        {
          triggerId: result.reservation.id,
          triggerDescription: `예약 생성 (${result.reservation.totalPeople}명)`,
          metadata: { 
            reservationId: result.reservation.id,
            totalPeople: result.reservation.totalPeople,
            cabinType: result.reservation.cabinType,
          },
        }
      );

      // 동행자들도 구매고객으로 여정 기록
      for (const travelerUser of result.travelerUsers) {
        if (travelerUser.userId && travelerUser.userId !== result.mainUser.id) {
          await recordCustomerJourney(
            travelerUser.userId,
            'purchase',
            'reservation_created',
            {
              triggerId: result.reservation.id,
              triggerDescription: `예약 생성 (동행자: ${travelerUser.travelerName})`,
              metadata: { 
                reservationId: result.reservation.id,
                isCompanion: true,
                mainUserId: result.mainUser.id,
              },
            }
          );
        }
      }
    } catch (journeyError) {
      logError('[Reservation Create] Customer journey 기록 실패 (예약은 성공 처리)', { errorType: (journeyError as any)?.constructor?.name });
      // 여정 기록 실패해도 예약 생성은 성공으로 처리
    }

    // APIS 자동화 실행 (해당 여행의 엑셀에 자동 복사 붙여넣기)
    // ⚠️ 중요: APIS 자동화는 실패해도 예약 생성은 성공으로 처리하되, 재시도 로직 포함
    let apisSyncResult: { ok: boolean; error?: string; retryCount?: number } | null = null;
    const maxRetries = 3;
    
    for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
      try {
        // UserTrip.id를 Trip.id로 변환 필요 (Reservation.tripId는 UserTrip.id)
        const userTrip = await prisma.userTrip.findUnique({
          where: { id: result.reservation.tripId },
          select: { id: true },
        });

        if (!userTrip) {
          logError('[Reservation Create] UserTrip 미발견 — APIS 자동화 중단', { tripId: result.reservation.tripId });
          apisSyncResult = { ok: false, error: 'UserTrip을 찾을 수 없습니다.', retryCount };
          break;
        }

        // syncApisSpreadsheet 함수 import (동적 import로 에러 방지)
        // google-sheets.ts 파일이 비어있어서 임시 함수로 대체
        const syncApisSpreadsheet = async (tripId: number) => ({ ok: false, error: 'google-sheets 모듈이 없습니다', spreadsheetId: null });
        
        // Trip.id를 찾기 위해 UserTrip에서 Trip으로 연결
        // 실제로는 UserTrip.id를 그대로 사용하거나, Trip 테이블에서 찾아야 함
        // 일단 UserTrip.id를 tripId로 사용 (나중에 수정 필요할 수 있음)
        const tripId = userTrip.id;
        
        // [WO-LOG-01] 삭제 — 스텁 함수 DEBUG 로그 불필요
        
        const syncResult = await syncApisSpreadsheet(tripId);
        
        if (syncResult.ok) {
          // [WO-LOG-01] 삭제 — 스텁 함수 성공 불가, DEBUG 로그 불필요
          apisSyncResult = { ok: true, retryCount: retryCount + 1 };
          break; // 성공하면 재시도 중단
        } else {
          warn(`[Reservation Create] APIS 자동화 실패 (재시도 ${retryCount + 1}/${maxRetries})`);
          apisSyncResult = { ok: false, error: syncResult.error, retryCount: retryCount + 1 };

          // 스텁 함수(모듈 없음)이면 재시도 불필요
          if (syncResult.error?.includes('google-sheets') || syncResult.error?.includes('모듈이 없습니다')) {
            break;
          }

          // 마지막 재시도가 아니면 잠시 대기 후 재시도
          if (retryCount < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // 2초, 4초, 6초 대기
          }
        }
      } catch (apisError: any) {
        warn(`[Reservation Create] APIS 자동화 에러 (재시도 ${retryCount + 1}/${maxRetries})`);
        apisSyncResult = { ok: false, error: apisError.message || 'APIS 자동화 실행 중 오류 발생', retryCount: retryCount + 1 };

        // 파일이 없거나 import 에러인 경우 재시도하지 않음
        if (apisError.message?.includes('Cannot find module') || apisError.message?.includes('google-sheets')) {
          warn('[Reservation Create] google-sheets 모듈 없음 — APIS 자동화 건너뜀');
          break;
        }
        
        // 마지막 재시도가 아니면 잠시 대기 후 재시도
        if (retryCount < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        }
      }
    }

    // APIS 자동화 결과 로깅 (실패해도 예약 생성은 성공)
    if (apisSyncResult && !apisSyncResult.ok) {
      warn(`[Reservation Create] APIS 자동화 최종 실패 (${apisSyncResult.retryCount}회 시도) — 관리자 수동 입력 필요`);
    }

    return NextResponse.json({
      ok: true,
      reservationId: result.reservation.id,
      message: '예약 생성이 완료되었습니다.',
      data: {
        reservation: result.reservation,
        totalPeople: result.reservation.totalPeople,
        cabinType: result.reservation.cabinType,
        travelers: result.travelers,
        autoRegisteredUsers: result.travelerUsers,
      },
    });
  } catch (error: any) {
    // [WO-LOG-01] error.message 제거 — Prisma 쿼리/바인딩 정보 노출 위험
    logError('[Reservation Create] API 요청 실패', { errorType: error?.constructor?.name || 'Unknown' });
    return NextResponse.json(
      {
        ok: false,
        message: '예약 생성에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}
