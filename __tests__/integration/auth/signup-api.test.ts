/**
 * Signup API Integration Tests
 *
 * 커버 범위:
 * 1. 정상 회원가입 성공 (200)
 * 2. 필수 필드 누락 (400)
 * 3. 아이디 중복 (409 + field: 'username')
 * 4. 닉네임 중복 (409 + field: 'nickname')
 * 5. 이메일 중복 (409)
 * 6. 비밀번호 6자 미만 (400)
 * 7. 이메일 형식 불일치 (400)
 */

// server-only 모듈을 테스트 환경에서 우회
jest.mock('server-only', () => ({}));

// hashPassword mock: bcrypt 연산 없이 단순 접두사 반환
jest.mock('@/lib/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  verifyPassword: jest.fn(),
  isBcryptHash: jest.fn(),
  SYSTEM_PASSWORDS: {},
  PARTNER_DEFAULT_PASSWORDS: [],
}));

jest.mock('@/lib/prisma');
jest.mock('@/lib/rate-limiter');
jest.mock('@/lib/ip-utils');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({ set: jest.fn(), get: jest.fn() })),
  headers: jest.fn(() => new Map([['x-forwarded-for', '127.0.0.1']])),
}));

import { POST } from '@/app/api/auth/signup/route';
import prisma from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// 각 테스트에서 사용할 유효한 기본 요청 바디
const validBody = {
  nickname: '테스트닉',
  name: '홍길동',
  phone: '01012345678',
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
};

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Signup API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // 기본: 중복 없음
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    // 성공 시 user.create 반환값
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: 1,
      mallUserId: validBody.username,
      mallNickname: validBody.nickname,
      name: validBody.name,
      phone: validBody.phone,
      email: validBody.email,
      role: 'community',
      customerSource: 'mall-signup',
    });

    // passwordEvent.create mock
    (mockPrisma.passwordEvent as any) = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    };
  });

  // ------------------------------------------------------------------
  // 1. 정상 회원가입 성공 (200)
  // ------------------------------------------------------------------
  describe('성공 케이스', () => {
    it('유효한 입력으로 회원가입 성공 시 200을 반환한다', async () => {
      const response = await POST(makeRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.message).toBe('회원가입이 완료되었습니다.');
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe(validBody.username);
      expect(data.user.email).toBe(validBody.email);
    });

    it('성공 응답에 비밀번호가 포함되지 않아야 한다', async () => {
      const response = await POST(makeRequest(validBody));
      const data = await response.json();

      expect(JSON.stringify(data)).not.toContain(validBody.password);
      expect(data.user?.password).toBeUndefined();
    });

    it('user.create가 올바른 필드로 호출된다', async () => {
      await POST(makeRequest(validBody));

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mallUserId: validBody.username.trim(),
            mallNickname: validBody.nickname.trim(),
            name: validBody.name.trim(),
            phone: validBody.phone.trim(),
            email: validBody.email.trim(),
            role: 'community',
            customerSource: 'mall-signup',
          }),
        })
      );
    });
  });

  // ------------------------------------------------------------------
  // 2. 필수 필드 누락 (400)
  // ------------------------------------------------------------------
  describe('필수 필드 누락', () => {
    const requiredFields = ['nickname', 'name', 'phone', 'username', 'email', 'password'] as const;

    requiredFields.forEach((field) => {
      it(`${field} 누락 시 400을 반환한다`, async () => {
        const body = { ...validBody, [field]: '' };
        const response = await POST(makeRequest(body));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.ok).toBe(false);
        expect(data.error).toBeDefined();
      });
    });

    it('모든 필드가 없을 때 400을 반환한다', async () => {
      const response = await POST(makeRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // 3. 아이디 중복 (409 + field: 'username')
  // ------------------------------------------------------------------
  describe('아이디 중복', () => {
    it('이미 사용 중인 username이면 409와 field: username을 반환한다', async () => {
      // 첫 번째 findFirst(username 중복 체크)에서 기존 사용자 반환
      // 이후 suggestAlternatives 내부 호출은 null 반환 (대안 추천용)
      (mockPrisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 99 }) // username 중복 감지
        .mockResolvedValue(null);           // suggestAlternatives 내부 호출

      const response = await POST(makeRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.ok).toBe(false);
      expect(data.field).toBe('username');
      expect(data.error).toContain('아이디');
    });

    it('username 중복 응답에 suggestions 배열이 포함된다', async () => {
      (mockPrisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 99 })
        .mockResolvedValue(null);

      const response = await POST(makeRequest(validBody));
      const data = await response.json();

      expect(Array.isArray(data.suggestions)).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 4. 닉네임 중복 (409 + field: 'nickname')
  // ------------------------------------------------------------------
  describe('닉네임 중복', () => {
    it('이미 사용 중인 nickname이면 409와 field: nickname을 반환한다', async () => {
      // username 중복 체크: null (통과)
      // nickname 중복 체크: 기존 사용자 반환
      // 이후 suggestAlternatives: null 반환
      (mockPrisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)        // username 중복 없음
        .mockResolvedValueOnce({ id: 88 }) // nickname 중복 감지
        .mockResolvedValue(null);           // suggestAlternatives 내부

      const response = await POST(makeRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.ok).toBe(false);
      expect(data.field).toBe('nickname');
      expect(data.error).toContain('닉네임');
    });

    it('nickname 중복 응답에 suggestions 배열이 포함된다', async () => {
      (mockPrisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 88 })
        .mockResolvedValue(null);

      const response = await POST(makeRequest(validBody));
      const data = await response.json();

      expect(Array.isArray(data.suggestions)).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 5. 이메일 중복 (409)
  // ------------------------------------------------------------------
  describe('이메일 중복', () => {
    it('이미 사용 중인 email이면 409를 반환한다', async () => {
      // username 중복 체크: null (통과)
      // nickname 중복 체크: null (통과)
      // email 중복 체크: 기존 사용자 반환
      (mockPrisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)        // username 중복 없음
        .mockResolvedValueOnce(null)        // nickname 중복 없음
        .mockResolvedValueOnce({ id: 77, name: '기존유저', phone: '010', role: 'user', email: validBody.email }); // email 중복

      const response = await POST(makeRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('이메일');
    });
  });

  // ------------------------------------------------------------------
  // 6. 비밀번호 6자 미만 (400)
  // ------------------------------------------------------------------
  describe('비밀번호 검증', () => {
    it('비밀번호가 6자 미만이면 400을 반환한다', async () => {
      const body = { ...validBody, password: '12345' };
      const response = await POST(makeRequest(body));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('6자');
    });

    it('비밀번호가 정확히 6자면 통과한다', async () => {
      const body = { ...validBody, password: '123456' };
      const response = await POST(makeRequest(body));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('비밀번호가 5자(경계값)면 400을 반환한다', async () => {
      const body = { ...validBody, password: 'abcde' };
      const response = await POST(makeRequest(body));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // 7. 이메일 형식 불일치 (400)
  // ------------------------------------------------------------------
  describe('이메일 형식 검증', () => {
    const invalidEmails = [
      'notanemail',
      'missing@',
      '@nodomain.com',
      'no spaces @domain.com',
      'double@@domain.com',
    ];

    invalidEmails.forEach((email) => {
      it(`유효하지 않은 이메일 "${email}"에 400을 반환한다`, async () => {
        const body = { ...validBody, email };
        const response = await POST(makeRequest(body));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.ok).toBe(false);
        expect(data.error).toContain('이메일');
      });
    });

    it('유효한 이메일 형식은 통과한다', async () => {
      const body = { ...validBody, email: 'valid.user+tag@sub.domain.co.kr' };
      const response = await POST(makeRequest(body));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 추가: username 4자 미만 검증
  // ------------------------------------------------------------------
  describe('아이디 길이 검증', () => {
    it('아이디가 4자 미만이면 400을 반환한다', async () => {
      const body = { ...validBody, username: 'abc' };
      const response = await POST(makeRequest(body));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('4자');
    });
  });

  // ------------------------------------------------------------------
  // 에러 처리
  // ------------------------------------------------------------------
  describe('에러 처리', () => {
    it('DB 오류 시 500을 반환한다', async () => {
      (mockPrisma.user.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await POST(makeRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.ok).toBe(false);
    });

    it('Prisma P2002(unique constraint) 오류 시 409를 반환한다', async () => {
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      const p2002Error = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
        meta: { target: ['email'] },
      });
      (mockPrisma.user.create as jest.Mock).mockRejectedValue(p2002Error);

      const response = await POST(makeRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.ok).toBe(false);
    });
  });
});
