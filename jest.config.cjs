const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Test environment
  testEnvironment: 'jest-environment-node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],

  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    // Include critical business logic
    'app/api/payment/**/*.{ts,tsx}',
    'app/api/affiliate/**/*.{ts,tsx}',
    'app/api/partner/reservation/**/*.{ts,tsx}',
    'app/api/auth/**/*.{ts,tsx}',
    'lib/affiliate/**/*.{ts,tsx}',
    'lib/crypto.ts',
    'lib/security/**/*.{ts,tsx}',

    // Exclude files
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/prisma/**',
  ],

  // Coverage thresholds (realistic targets)
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
    // Critical modules require higher coverage
    './app/api/payment/**/*.ts': {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
    './lib/affiliate/refund.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
    // Security modules require high coverage
    './lib/crypto.ts': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
    './lib/security/**/*.ts': {
      statements: 85,
      branches: 75,
      functions: 85,
      lines: 85,
    },
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // Jest로 실행하면 안 되는 독립 실행 스크립트 제외
  // payment-api-live-test.ts: tsx로 직접 실행하는 live 테스트 스크립트
  // payment-api-verification.ts: 동일하게 독립 실행 스크립트
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/payment-api-live-test\\.ts',
    '/__tests__/payment-api-verification\\.ts',
  ],

  // Transform configuration
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // Timeout for async tests
  testTimeout: 10000,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
