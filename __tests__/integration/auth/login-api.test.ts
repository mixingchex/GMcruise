/**
 * Login API Integration Tests
 *
 * Tests:
 * - 정상 로그인 플로우
 * - 비밀번호 검증
 * - Rate limiting
 * - Security headers
 * - Session management
 * - Error handling
 */

import { POST } from '@/app/api/auth/login/route';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/crypto';
import * as rateLimiter from '@/lib/rate-limiter';
import * as ipUtils from '@/lib/ip-utils';

// Mock modules
jest.mock('@/lib/prisma');
jest.mock('@/lib/rate-limiter');
jest.mock('@/lib/ip-utils');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    set: jest.fn(),
    get: jest.fn(),
  })),
  headers: jest.fn(() => new Map([
    ['user-agent', 'Mozilla/5.0'],
    ['x-forwarded-for', '127.0.0.1'],
  ])),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = rateLimiter.checkRateLimit as jest.MockedFunction<typeof rateLimiter.checkRateLimit>;
const mockGetClientIp = ipUtils.getClientIpFromRequest as jest.MockedFunction<typeof ipUtils.getClientIpFromRequest>;

describe('Login API Integration Tests', () => {
  let testUserPassword: string;
  let testUserHash: string;

  beforeAll(async () => {
    testUserPassword = 'SecurePassword123!';
    testUserHash = await hashPassword(testUserPassword);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockGetClientIp.mockReturnValue('127.0.0.1');
    // checkRateLimit은 async 함수이므로 mockResolvedValue 사용
    mockCheckRateLimit.mockResolvedValue({
      limited: false,
    });
  });

  describe('Normal Login Flow', () => {
    it('should login successfully with correct credentials', async () => {
      const testUser = {
        id: 1,
        phone: '01012345678',
        password: testUserHash,
        name: 'Test User',
        role: 'user',
        loginCount: 0,
        email: 'test@example.com',
      };

      mockPrisma.user.findFirst.mockResolvedValue(testUser as any);
      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        loginCount: 1,
      } as any);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01012345678',
          password: testUserPassword,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.password).toBeUndefined(); // Password should not be in response
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            loginCount: { increment: 1 },
          }),
        })
      );
    });

    it('should reject login with wrong password', async () => {
      const testUser = {
        id: 1,
        phone: '01012345678',
        password: testUserHash,
        name: 'Test User',
        role: 'user',
      };

      mockPrisma.user.findFirst.mockResolvedValue(testUser as any);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01012345678',
          password: 'WrongPassword123!',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
      expect(data.error).toBeDefined();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should reject login for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01099999999',
          password: 'AnyPassword123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
    });

    it('should trim whitespace from input', async () => {
      const testUser = {
        id: 1,
        phone: '01012345678',
        password: testUserHash,
        name: 'Test User',
        role: 'user',
        loginCount: 0,
      };

      mockPrisma.user.findFirst.mockResolvedValue(testUser as any);
      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        loginCount: 1,
      } as any);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '  01012345678  ',
          password: `  ${testUserPassword}  `,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should block login after rate limit exceeded', async () => {
      // checkRateLimit은 async 함수이므로 mockResolvedValue 사용
      mockCheckRateLimit.mockResolvedValue({
        limited: true,
        resetTime: Date.now() + 60000,
      });

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01012345678',
          password: 'AnyPassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.ok).toBe(false);
      expect(data.retryAfter).toBeDefined();
      expect(response.headers.get('Retry-After')).toBeDefined();
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('should check rate limit with correct IP', async () => {
      mockGetClientIp.mockReturnValue('192.168.1.100');

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01012345678',
          password: 'AnyPassword',
        }),
      });

      await POST(request);

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        'login:192.168.1.100',
        expect.any(Object)
      );
    });
  });

  describe('Security Headers & Response', () => {
    it('should not return password in response', async () => {
      const testUser = {
        id: 1,
        phone: '01012345678',
        password: testUserHash,
        name: 'Test User',
        role: 'user',
        loginCount: 0,
      };

      mockPrisma.user.findFirst.mockResolvedValue(testUser as any);
      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        loginCount: 1,
      } as any);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01012345678',
          password: testUserPassword,
        }),
      });

      const response = await POST(request);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      expect(responseText).not.toContain(testUserHash);
      expect(responseText).not.toContain(testUserPassword);
      expect(data.user?.password).toBeUndefined();
    });

    it('should set secure session cookie', async () => {
      const testUser = {
        id: 1,
        phone: '01012345678',
        password: testUserHash,
        name: 'Test User',
        role: 'user',
        loginCount: 0,
      };

      mockPrisma.user.findFirst.mockResolvedValue(testUser as any);
      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        loginCount: 1,
      } as any);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01012345678',
          password: testUserPassword,
        }),
      });

      await POST(request);

      // Verify cookie is set (mocked)
      const { cookies } = await import('next/headers');
      expect(cookies).toHaveBeenCalled();
    });
  });

  describe('Partner Login Mode', () => {
    it('should handle partner login with mallUserId', async () => {
      const partnerUser = {
        id: 2,
        mallUserId: 'partner123',
        phone: '01098765432',
        password: testUserHash,
        mallNickname: 'Partner User',
        role: 'partner',
        loginCount: 0,
        AffiliateProfile: {
          id: 1,
          type: 'PARTNER',
          status: 'ACTIVE',
        },
      };

      mockPrisma.user.findFirst.mockResolvedValue(partnerUser as any);
      mockPrisma.user.update.mockResolvedValue({
        ...partnerUser,
        loginCount: 1,
      } as any);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: 'partner123',
          password: testUserPassword,
          mode: 'partner',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('should handle partner login with special password qwe1', async () => {
      const partnerUser = {
        id: 2,
        mallUserId: 'partner123',
        phone: '01098765432',
        password: testUserHash,
        mallNickname: 'Partner User',
        role: 'partner',
        loginCount: 0,
        AffiliateProfile: {
          id: 1,
          type: 'PARTNER',
          status: 'ACTIVE',
        },
      };

      mockPrisma.user.findFirst.mockResolvedValue(partnerUser as any);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: 'partner123',
          password: 'qwe1',
        }),
      });

      const response = await POST(request);

      // This should trigger partner login mode
      expect(mockPrisma.user.findFirst).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    it('should reject empty phone', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '',
          password: 'AnyPassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      await expect(POST(request)).rejects.toThrow();
    });

    it('should handle SQL injection in phone', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: "' OR '1'='1",
          password: 'AnyPassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
      // Prisma should handle SQL injection safely
    });
  });

  describe('User State Management', () => {
    it('should update lastActiveAt on successful login', async () => {
      const testUser = {
        id: 1,
        phone: '01012345678',
        password: testUserHash,
        name: 'Test User',
        role: 'user',
        loginCount: 5,
        lastActiveAt: new Date('2024-01-01'),
      };

      mockPrisma.user.findFirst.mockResolvedValue(testUser as any);
      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        loginCount: 6,
        lastActiveAt: new Date(),
      } as any);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01012345678',
          password: testUserPassword,
        }),
      });

      await POST(request);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            loginCount: { increment: 1 },
            lastActiveAt: expect.any(Date),
          }),
        })
      );
    });

    it('should not update user data on failed login', async () => {
      const testUser = {
        id: 1,
        phone: '01012345678',
        password: testUserHash,
        name: 'Test User',
        role: 'user',
        loginCount: 5,
      };

      mockPrisma.user.findFirst.mockResolvedValue(testUser as any);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01012345678',
          password: 'WrongPassword',
        }),
      });

      await POST(request);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should handle locked users', async () => {
      const lockedUser = {
        id: 1,
        phone: '01012345678',
        password: testUserHash,
        name: 'Locked User',
        role: 'user',
        isLocked: true,
        lockedReason: 'Security violation',
      };

      mockPrisma.user.findFirst.mockResolvedValue(lockedUser as any);

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01012345678',
          password: testUserPassword,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should reject even with correct password
      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01012345678',
          password: 'AnyPassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should not leak sensitive error details in production', async () => {
      // NODE_ENV는 TypeScript strict 모드에서 read-only이므로
      // Object.defineProperty를 통해 우회하여 설정
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });

      mockPrisma.user.findFirst.mockRejectedValue(
        new Error('Detailed database error with sensitive info')
      );

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01012345678',
          password: 'AnyPassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      expect(responseText).not.toContain('database');
      expect(responseText).not.toContain('sensitive');

      // 원복
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('OWASP Security Tests', () => {
    it('should prevent timing attacks on password verification', async () => {
      const testUser = {
        id: 1,
        phone: '01012345678',
        password: testUserHash,
        name: 'Test User',
        role: 'user',
      };

      mockPrisma.user.findFirst.mockResolvedValue(testUser as any);

      const timings: number[] = [];

      for (let i = 0; i < 5; i++) {
        const request = new Request('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: '01012345678',
            password: 'WrongPassword' + i,
          }),
        });

        const start = Date.now();
        await POST(request);
        timings.push(Date.now() - start);
      }

      // All failed attempts should take similar time
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const variance = timings.map(t => Math.abs(t - avgTime));

      expect(Math.max(...variance)).toBeLessThan(100);
    }, 10000);

    it('should not enumerate users (same response for non-existent users)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const request1 = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01099999999',
          password: 'AnyPassword',
        }),
      });

      const response1 = await POST(request1);
      const data1 = await response1.json();

      const testUser = {
        id: 1,
        phone: '01012345678',
        password: testUserHash,
        name: 'Test User',
        role: 'user',
      };

      mockPrisma.user.findFirst.mockResolvedValue(testUser as any);

      const request2 = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '01012345678',
          password: 'WrongPassword',
        }),
      });

      const response2 = await POST(request2);
      const data2 = await response2.json();

      // Both should return same status and similar error
      expect(response1.status).toBe(response2.status);
      expect(data1.ok).toBe(data2.ok);
    });
  });
});
