/**
 * Community Login API Integration Tests
 *
 * 커버 범위:
 * 1. 정상 커뮤니티 로그인 성공 (200)
 * 2. 잘못된 비밀번호 (401)
 * 3. 존재하지 않는 사용자 (401)
 * 4. 필수 필드 누락 - username 없음 (400)
 * 5. 필수 필드 누락 - password 없음 (400)
 * 6. Rate limit 초과 (429)
 * 7. role='user' 사용자가 community 로그인 시도 → 실패 (401)
 */

// server-only 모듈을 테스트 환경에서 우회 (lib/password.ts가 의존)
jest.mock('server-only', () => ({}));

// lib/password.ts mock
jest.mock('@/lib/password', () => ({
  verifyPassword: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('$2b$10$newhashedvalue'),
  isBcryptHash: jest.fn(),
  SYSTEM_PASSWORDS: {
    GUIDE_ACTIVE: '3800',
    TRIAL: '1101',
    PARTNER: 'qwe1',
    TEMP: '0000',
    LOCKED: '8300',
  },
  PARTNER_DEFAULT_PASSWORDS: ['1101', 'qwe1', 'zxc1'],
}));

jest.mock('@/lib/prisma');
jest.mock('@/lib/rate-limiter');
jest.mock('@/lib/ip-utils');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({ set: jest.fn(), get: jest.fn() })),
  headers: jest.fn(() => new Map([['x-forwarded-for', '127.0.0.1']])),
}));

import { POST } from '@/app/api/community/auth/login/route';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/crypto';
import * as rateLimiter from '@/lib/rate-limiter';
import * as ipUtils from '@/lib/ip-utils';
import { verifyPassword, hashPassword as hashPasswordMock } from '@/lib/password';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = rateLimiter.checkRateLimit as jest.MockedFunction<
  typeof rateLimiter.checkRateLimit
>;
const mockGetClientIp = ipUtils.getClientIpFromRequest as jest.MockedFunction<
  typeof ipUtils.getClientIpFromRequest
>;
const mockVerifyPassword = verifyPassword as jest.MockedFunction<typeof verifyPassword>;
const mockHashPasswordMock = hashPasswordMock as jest.MockedFunction<typeof hashPasswordMock>;

// jest.setup.cjs 글로벌 prisma mock에 session이 없으므로 직접 주입
const mockSessionCreate = jest.fn();
const mockSessionDeleteMany = jest.fn();

function makeRequest(body: Record<string, unknown>, url = 'http://localhost:3000/api/community/auth/login') {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Community Login API Integration Tests', () => {
  let testPassword: string;
  let testHash: string;

  beforeAll(async () => {
    testPassword = 'CommunityPass123!';
    testHash = await hashPassword(testPassword);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // 기본 mock 설정
    mockGetClientIp.mockReturnValue('127.0.0.1');
    mockCheckRateLimit.mockResolvedValue({ limited: false });

    // verifyPassword 기본: 유효, rehash 불필요
    mockVerifyPassword.mockResolvedValue({ valid: true, needsRehash: false });
    mockHashPasswordMock.mockResolvedValue('$2b$10$newhashedvalue');

    // session mock 주입 (jest.setup.cjs에 session 항목 없음)
    (mockPrisma as any).session = {
      create: mockSessionCreate,
      deleteMany: mockSessionDeleteMany,
    };

    mockSessionCreate.mockResolvedValue({
      id: 'a'.repeat(64),
      csrfToken: 'b'.repeat(64),
    });

    // user.update 기본 mock
    mockPrisma.user.update.mockResolvedValue({} as any);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. 정상 커뮤니티 로그인 성공 (200)
  // ─────────────────────────────────────────────────────────────────────────
  describe('1. 정상 로그인 성공', () => {
    const communityUser = {
      id: 10,
      phone: 'community_user01',
      password: '$2b$10$hashedpassword',
      name: '커뮤니티회원',
      email: 'community@example.com',
      role: 'community',
      loginCount: 5,
    };

    it('올바른 credentials로 로그인 성공 → 200, ok=true, csrfToken 반환', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(communityUser as any);

      const response = await POST(makeRequest({
        username: 'community_user01',
        password: testPassword,
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.csrfToken).toBeDefined();
      expect(data.next).toBeDefined();
    });

    it('로그인 성공 시 loginCount increment 호출됨', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(communityUser as any);

      await POST(makeRequest({
        username: 'community_user01',
        password: testPassword,
      }));

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: expect.objectContaining({
            loginCount: { increment: 1 },
          }),
        })
      );
    });

    it('로그인 성공 시 세션이 생성됨', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(communityUser as any);

      await POST(makeRequest({
        username: 'community_user01',
        password: testPassword,
      }));

      expect(mockSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 10,
          }),
        })
      );
    });

    it('next 쿼리가 안전한 상대경로이면 해당 경로 반환', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(communityUser as any);

      const response = await POST(makeRequest(
        { username: 'community_user01', password: testPassword },
        'http://localhost:3000/api/community/auth/login?next=/community/boards'
      ));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.next).toBe('/community/boards');
    });

    it('next 파라미터가 절대 URL이면 /community 반환 (Open Redirect 방지)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(communityUser as any);

      const response = await POST(makeRequest(
        { username: 'community_user01', password: testPassword },
        'http://localhost:3000/api/community/auth/login?next=https://evil.com'
      ));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.next).toBe('/community');
    });

    it('응답에 비밀번호 hash가 포함되지 않음', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(communityUser as any);

      const response = await POST(makeRequest({
        username: 'community_user01',
        password: testPassword,
      }));
      const data = await response.json();
      const responseText = JSON.stringify(data);

      expect(responseText).not.toContain('$2b$10$');
      expect(data.password).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. 잘못된 비밀번호 (401)
  // ─────────────────────────────────────────────────────────────────────────
  describe('2. 잘못된 비밀번호', () => {
    const communityUser = {
      id: 10,
      phone: 'community_user01',
      password: '$2b$10$hashedpassword',
      name: '커뮤니티회원',
      email: null,
      role: 'community',
      loginCount: 0,
    };

    it('비밀번호 불일치 → 401, ok=false', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(communityUser as any);
      mockVerifyPassword.mockResolvedValue({ valid: false, needsRehash: false });

      const response = await POST(makeRequest({
        username: 'community_user01',
        password: 'WrongPassword!',
      }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('아이디 또는 비밀번호가 올바르지 않습니다.');
    });

    it('비밀번호 불일치 시 loginCount를 증가시키지 않음', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(communityUser as any);
      mockVerifyPassword.mockResolvedValue({ valid: false, needsRehash: false });

      await POST(makeRequest({
        username: 'community_user01',
        password: 'BadPassword',
      }));

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('비밀번호 불일치 시 세션을 생성하지 않음', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(communityUser as any);
      mockVerifyPassword.mockResolvedValue({ valid: false, needsRehash: false });

      await POST(makeRequest({
        username: 'community_user01',
        password: 'BadPassword',
      }));

      expect(mockSessionCreate).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. 존재하지 않는 사용자 (401)
  // ─────────────────────────────────────────────────────────────────────────
  describe('3. 존재하지 않는 사용자', () => {
    it('DB에 없는 username → 401 반환', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const response = await POST(makeRequest({
        username: 'nonexistent_user',
        password: 'AnyPassword123',
      }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('아이디 또는 비밀번호가 올바르지 않습니다.');
    });

    it('존재하지 않는 사용자 → verifyPassword 호출 안 함', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await POST(makeRequest({
        username: 'ghost_user',
        password: 'SomePassword',
      }));

      expect(mockVerifyPassword).not.toHaveBeenCalled();
    });

    it('사용자 없음과 비밀번호 불일치 모두 동일한 에러 메시지 반환 (user enumeration 방지)', async () => {
      // Case A: 사용자 없음
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const res1 = await POST(makeRequest({ username: 'no_such_user', password: 'pass' }));
      const data1 = await res1.json();

      // Case B: 비밀번호 불일치
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 20,
        phone: 'real_user',
        password: '$2b$10$hash',
        name: '실제회원',
        email: null,
        role: 'community',
        loginCount: 0,
      } as any);
      mockVerifyPassword.mockResolvedValue({ valid: false, needsRehash: false });
      const res2 = await POST(makeRequest({ username: 'real_user', password: 'wrongpass' }));
      const data2 = await res2.json();

      expect(res1.status).toBe(res2.status);
      expect(data1.error).toBe(data2.error);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. 필수 필드 누락 - username 없음 (400)
  // ─────────────────────────────────────────────────────────────────────────
  describe('4. 필수 필드 누락 - username 없음', () => {
    it('username 빈 문자열 → 400', async () => {
      const response = await POST(makeRequest({ username: '', password: 'SomePassword' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('아이디와 비밀번호를 입력해주세요.');
    });

    it('username 공백만 구성 (trim 후 빈 문자열) → 400', async () => {
      const response = await POST(makeRequest({ username: '   ', password: 'SomePassword' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
    });

    it('username 필드 자체 누락 → 400', async () => {
      const response = await POST(makeRequest({ password: 'SomePassword' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
    });

    it('username 누락 시 DB 조회 안 함', async () => {
      await POST(makeRequest({ password: 'SomePassword' }));

      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. 필수 필드 누락 - password 없음 (400)
  // ─────────────────────────────────────────────────────────────────────────
  describe('5. 필수 필드 누락 - password 없음', () => {
    it('password 빈 문자열 → 400', async () => {
      const response = await POST(makeRequest({ username: 'community_user01', password: '' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('아이디와 비밀번호를 입력해주세요.');
    });

    it('password 필드 자체 누락 → 400', async () => {
      const response = await POST(makeRequest({ username: 'community_user01' }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
    });

    it('username, password 모두 없으면 → 400', async () => {
      const response = await POST(makeRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
    });

    it('password 누락 시 DB 조회 안 함', async () => {
      await POST(makeRequest({ username: 'community_user01' }));

      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Rate limit 초과 (429)
  // ─────────────────────────────────────────────────────────────────────────
  describe('6. Rate limit 초과', () => {
    it('rate limit 초과 → 429, Retry-After 헤더 포함', async () => {
      mockCheckRateLimit.mockResolvedValue({
        limited: true,
        resetTime: Date.now() + 300000,
      });

      const response = await POST(makeRequest({
        username: 'attacker',
        password: 'BruteForce',
      }));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.ok).toBe(false);
      expect(data.retryAfter).toBeDefined();
      expect(response.headers.get('Retry-After')).toBeDefined();
    });

    it('rate limit 초과 시 DB 조회 수행 안 함', async () => {
      mockCheckRateLimit.mockResolvedValue({
        limited: true,
        resetTime: Date.now() + 60000,
      });

      await POST(makeRequest({
        username: 'attacker',
        password: 'BruteForce',
      }));

      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('rate limit key가 community-login:<IP> 형식', async () => {
      mockGetClientIp.mockReturnValue('203.0.113.42');
      mockCheckRateLimit.mockResolvedValue({ limited: false });
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await POST(makeRequest({ username: 'someone', password: 'pass' }));

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        'community-login:203.0.113.42',
        expect.any(Object)
      );
    });

    it('rate limit 에러 메시지 확인', async () => {
      mockCheckRateLimit.mockResolvedValue({
        limited: true,
        resetTime: Date.now() + 60000,
      });

      const response = await POST(makeRequest({ username: 'a', password: 'b' }));
      const data = await response.json();

      expect(data.error).toBe('너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. role='user' 사용자가 community 로그인 시도 → 실패 (401)
  // ─────────────────────────────────────────────────────────────────────────
  describe("7. role='user' 사용자의 community 로그인 시도 → 401", () => {
    it("role='user' 사용자 → community 로그인 불가 (role 필터로 null 반환)", async () => {
      // route의 findFirst에 role: 'community' 조건이 있어 user 타입은 null 반환
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const response = await POST(makeRequest({
        username: 'regular_user_phone',
        password: testPassword,
      }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
    });

    it("findFirst 호출 시 where 조건에 role: 'community' 포함됨", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await POST(makeRequest({ username: 'any_user', password: 'any_pass' }));

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'community',
          }),
        })
      );
    });

    it("findFirst 호출 시 where 조건에 phone 필드로 username 조회됨", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await POST(makeRequest({ username: 'target_user', password: 'pass' }));

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            phone: 'target_user',
            role: 'community',
          }),
        })
      );
    });

    it("role='admin' 사용자도 community 로그인 불가", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const response = await POST(makeRequest({
        username: 'admin_account',
        password: testPassword,
      }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
    });

    it("role='partner' 사용자도 community 로그인 불가", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const response = await POST(makeRequest({
        username: 'partner_account',
        password: testPassword,
      }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 추가: Lazy Migration (needsRehash)
  // ─────────────────────────────────────────────────────────────────────────
  describe('Lazy Migration (평문 → bcrypt 재해시)', () => {
    it('needsRehash=true 이면 비밀번호 재해시 후 user.update 총 2번 호출', async () => {
      const oldUser = {
        id: 30,
        phone: 'old_user',
        password: 'plaintext_password',
        name: '구버전유저',
        email: null,
        role: 'community',
        loginCount: 0,
      };

      mockPrisma.user.findFirst.mockResolvedValue(oldUser as any);
      mockVerifyPassword.mockResolvedValue({ valid: true, needsRehash: true });
      mockHashPasswordMock.mockResolvedValue('$2b$10$newbcrypthash');

      const response = await POST(makeRequest({
        username: 'old_user',
        password: 'plaintext_password',
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      // update 2번: 1) 재해시, 2) loginCount 증가
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(2);
    });

    it('needsRehash=false 이면 user.update 1번만 호출 (loginCount 증가)', async () => {
      const normalUser = {
        id: 40,
        phone: 'normal_user',
        password: '$2b$10$alreadyhashed',
        name: '정상유저',
        email: null,
        role: 'community',
        loginCount: 2,
      };

      mockPrisma.user.findFirst.mockResolvedValue(normalUser as any);
      mockVerifyPassword.mockResolvedValue({ valid: true, needsRehash: false });

      await POST(makeRequest({
        username: 'normal_user',
        password: 'correctpass',
      }));

      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ loginCount: { increment: 1 } }),
        })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 추가: 에러 핸들링
  // ─────────────────────────────────────────────────────────────────────────
  describe('에러 핸들링', () => {
    it('DB 연결 오류 → 500 반환', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error('DB connection timeout'));

      const response = await POST(makeRequest({
        username: 'community_user01',
        password: testPassword,
      }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('로그인 실패');
    });

    it('프로덕션 환경에서 500 에러 시 details 필드 없음', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });

      mockPrisma.user.findFirst.mockRejectedValue(
        new Error('Sensitive internal DB error details')
      );

      const response = await POST(makeRequest({
        username: 'community_user01',
        password: testPassword,
      }));
      const data = await response.json();
      const responseText = JSON.stringify(data);

      expect(responseText).not.toContain('Sensitive');
      expect(responseText).not.toContain('internal');
      expect(data.details).toBeUndefined();

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        writable: true,
        configurable: true,
      });
    });

    it('세션 생성 오류도 500으로 처리됨', async () => {
      const communityUser = {
        id: 10,
        phone: 'community_user01',
        password: '$2b$10$hash',
        name: '커뮤니티회원',
        email: null,
        role: 'community',
        loginCount: 0,
      };

      mockPrisma.user.findFirst.mockResolvedValue(communityUser as any);
      mockSessionCreate.mockRejectedValue(new Error('Session store unavailable'));

      const response = await POST(makeRequest({
        username: 'community_user01',
        password: testPassword,
      }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
    });
  });
});
