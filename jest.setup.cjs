// jest.setup.js
// Global test setup

// Mock environment variables
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.WELCOMEPAY_MID = 'test_mid';
process.env.WELCOMEPAY_SIGN_KEY = 'test_sign_key';

// Mock Prisma Client
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    affiliateSale: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    commissionLedger: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    reservation: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    traveler: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    userTrip: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    cruiseProduct: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      payment: { create: jest.fn(), findUnique: jest.fn() },
      affiliateSale: { create: jest.fn(), findUnique: jest.fn() },
      user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      traveler: { create: jest.fn(), findFirst: jest.fn() },
      reservation: { create: jest.fn() },
      userTrip: { findFirst: jest.fn(), create: jest.fn() },
      commissionLedger: { create: jest.fn(), deleteMany: jest.fn() },
    })),
  },
}));

// Mock external services
jest.mock('@/lib/google-drive', () => ({
  findOrCreateFolder: jest.fn().mockResolvedValue({ ok: true, folderId: 'test-folder-id' }),
  uploadFileToDrive: jest.fn().mockResolvedValue({ ok: true, url: 'https://drive.google.com/test' }),
}));

jest.mock('@/lib/customer-journey', () => ({
  recordCustomerJourney: jest.fn().mockResolvedValue({ ok: true }),
}));

// Extend Jest matchers (optional)
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Console suppression for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};
