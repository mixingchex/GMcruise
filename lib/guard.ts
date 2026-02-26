import 'server-only';
import { getSessionUser, SessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * Server Component 전용 인증 가드
 * - 미인증 → /login 리다이렉트
 * - onboarded: true 옵션 시 온보딩 미완료 → /onboarding 리다이렉트
 */
export async function requireUser(opts: { onboarded?: boolean } = {}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (opts.onboarded && !user.onboarded) redirect('/onboarding');
  return user;
}
