import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { verifyPw, hashPw, makeToken, COOKIE } from '@/lib/auth';
import { ensureAdmin, findUserByUsername, setPassword } from '@/lib/store';
import { pubUser } from '@/lib/api';

export const runtime = 'nodejs';

function isRecovery(username: string, password: string) {
  const reset = process.env.ADMIN_RESET_PASSWORD || '';
  const admin = process.env.ADMIN_USERNAME || 'AdminJoo';
  if (reset.length < 8 || username !== admin) return false;
  const a = Buffer.from(password), b = Buffer.from(reset);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  await ensureAdmin();
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const u = await findUserByUsername(username);
  // Recovery: while ADMIN_RESET_PASSWORD is set in Vercel, the main admin can sign in with it,
  // and that becomes the admin's password. Delete the variable once you are back in.
  if (u && u.role === 'admin' && isRecovery(username, password)) {
    await setPassword(u.id, await hashPw(password));
    u.passwordHash = '';
  } else if (!u || !(await verifyPw(password, u.passwordHash))) {
    return NextResponse.json({ error: 'invalid' }, { status: 401 });
  }
  const token = await makeToken(u);
  const res = NextResponse.json({ ok: true, user: pubUser(u) });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
