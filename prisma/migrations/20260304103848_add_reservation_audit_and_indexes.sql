-- Migration: add_reservation_audit_and_indexes
-- Generated: 2026-03-04
-- Description: ReservationAudit 테이블 추가 + Session/UserTrip 인덱스 추가

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReservationAudit" (
    "id" SERIAL NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "changedBy" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,

    CONSTRAINT "ReservationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReservationAudit_reservationId_changedAt_idx" ON "ReservationAudit"("reservationId", "changedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReservationAudit_changedBy_changedAt_idx" ON "ReservationAudit"("changedBy", "changedAt");

-- CreateIndex (기존 테이블 성능 인덱스)
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- CreateIndex (기존 테이블 성능 인덱스)
CREATE INDEX IF NOT EXISTS "UserTrip_userId_productId_idx" ON "UserTrip"("userId", "productId");

-- AddForeignKey (멱등성: 이미 존재하면 건너뜀)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ReservationAudit_reservationId_fkey'
  ) THEN
    ALTER TABLE "ReservationAudit"
      ADD CONSTRAINT "ReservationAudit_reservationId_fkey"
      FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ReservationAudit_changedBy_fkey'
  ) THEN
    ALTER TABLE "ReservationAudit"
      ADD CONSTRAINT "ReservationAudit_changedBy_fkey"
      FOREIGN KEY ("changedBy") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
