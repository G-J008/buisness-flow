import { NextResponse } from 'next/server';
import { verifyPw, makeToken, COOKIE } from '@/lib/auth';
import { ensureAdmin, findUserByUsername } from '@/lib/store';
import { pubUser } from '@/lib/api';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  await ensureAdmin();
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const u = await findUserByUsername(username);
  if (!u || !(await verifyPw(password, u.passwordHash))) {
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
