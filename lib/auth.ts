import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export const COOKIE = 'bf_session';
const secretKey = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-insecure-secret-change-me');

export async function hashPw(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPw(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export type Session = { uid: string; role: 'admin' | 'manager' | 'sales'; companyId: string | null };

export async function makeToken(u: { id: string; role: string; companyId: string | null }) {
  return new SignJWT({ uid: u.id, role: u.role, companyId: u.companyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey());
}

export async function readToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return { uid: payload.uid as string, role: payload.role as any, companyId: (payload.companyId as string) ?? null };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return readToken(token);
}
