import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { verifyPw, hashPw, makeToken, COOKIE } from '@/lib/auth';
import { ensureAdmin, findUserByUsername, setPassword, createUser, getUser } from '@/lib/store';
import { q } from '@/lib/db';
import { pubUser } from '@/lib/api';

export const runtime = 'nodejs';

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Recovery while ADMIN_RESET_PASSWORD is set in Vercel (delete it once you are back in):
// - any master admin account signs in with it, and it becomes that account's password;
// - if the account named in ADMIN_USERNAME doesn't exist, it is created as master admin.
// Each attempt writes the reason to the server log, never the password.
async function recover(username: string, password: string) {
  const reset = (process.env.ADMIN_RESET_PASSWORD || '').trim();
  if (reset.length < 8) return null;
  if (!sameSecret(password.trim(), reset)) {
    console.warn('[recuperación] la contraseña no coincide con ADMIN_RESET_PASSWORD');
    return null;
  }
  let u = await findUserByUsername(username);
  if (!u) u = (await q('SELECT * FROM app_user WHERE lower(username)=lower($1) LIMIT 1', [username])).rows[0] || null;
  if (u && u.role === 'admin') {
    await setPassword(u.id, await hashPw(reset));
    console.warn(`[recuperación] acceso recuperado para el admin "${u.username}"`);
    return u;
  }
  if (u) {
    console.warn(`[recuperación] "${u.username}" existe pero no es admin (rol ${u.role})`);
    return null;
  }
  const wanted = (process.env.ADMIN_USERNAME || 'AdminJoo').trim();
  if (username.toLowerCase() !== wanted.toLowerCase()) {
    console.warn('[recuperación] ese usuario no existe y no coincide con ADMIN_USERNAME');
    return null;
  }
  const created = await createUser({ name: 'Admin', username: wanted, passwordHash: await hashPw(reset), role: 'admin', companyId: null });
  console.warn(`[recuperación] se creó el admin maestro "${wanted}"`);
  return (await getUser(created.id)) || created;
}

export async function POST(req: Request) {
  await ensureAdmin();
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  let u = await findUserByUsername(username);
  if (!u || !(await verifyPw(password, u.passwordHash))) {
    u = await recover(username, password);
    if (!u) return NextResponse.json({ error: 'invalid' }, { status: 401 });
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
