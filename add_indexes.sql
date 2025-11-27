-- 성능 최적화를 위한 인덱스 추가 SQL
-- Prisma 마이그레이션 대신 직접 실행할 수 있는 SQL 스크립트

-- 1. customerSource 인덱스
CREATE INDEX IF NOT EXISTS "User_customerSource_idx" ON "User"("customerSource");

-- 2. role, customerSource 복합 인덱스
CREATE INDEX IF NOT EXISTS "User_role_customerSource_idx" ON "User"("role", "customerSource");

-- 3. mallUserId 인덱스
CREATE INDEX IF NOT EXISTS "User_mallUserId_idx" ON "User"("mallUserId");

-- 4. testModeStartedAt 인덱스
CREATE INDEX IF NOT EXISTS "User_testModeStartedAt_idx" ON "User"("testModeStartedAt");

-- 5. customerStatus, createdAt 복합 인덱스
CREATE INDEX IF NOT EXISTS "User_customerStatus_createdAt_idx" ON "User"("customerStatus", "createdAt");

-- 인덱스 생성 확인 쿼리
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'User' 
-- AND indexname LIKE '%customerSource%' OR indexname LIKE '%mallUserId%' OR indexname LIKE '%testModeStartedAt%';


