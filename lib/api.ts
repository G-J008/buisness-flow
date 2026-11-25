import { NextResponse } from 'next/server';
import { getSession, Session } from './auth';
import { getCompany, firstCompany } from './store';

export const runtime = 'nodejs';

export function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}
export function unauthorized() {
  return json({ error: 'unauthorized' }, 401);
}
export function forbidden() {
  return json({ error: 'forbidden' }, 403);
}
export function bad(msg: string) {
  return json({ error: msg }, 400);
}

export function pubUser(u: any) {
  if (!u) return u;
  const { passwordHash, ...rest } = u;
  return rest;
}

export async function requireSession(): Promise<Session | null> {
  return getSession();
}

export const isAdmin = (s: Session) => s.role === 'admin';
export const canManageMoney = (s: Session) => s.role === 'admin' || s.role === 'manager';
export const canManageProfiles = (s: Session) => s.role === 'admin' || s.role === 'manager';

// Which company a request targets, and whether the caller may act on it.
export async function resolveCompanyId(s: Session, requested?: string | null): Promise<string | null> {
  if (s.role === 'admin') {
    if (requested) {
      const c = await getCompany(requested);
      return c ? c.id : null;
    }
    const first = await firstCompany();
    return first ? first.id : null;
  }
  if (requested && requested !== s.companyId) return null;
  return s.companyId;
}

// Who is acting, for the caja records (name is stored as it was at that moment).
export async function actorOf(s: Session) {
  const { getUser } = await import('./store');
  const u = await getUser(s.uid);
  return { id: s.uid, name: (u && u.name) || 'Usuario' };
}
// Caja chosen in a form: { cajaId, fxRate }.
export function linkOf(b: any) {
  return { cajaId: b && b.cajaId ? String(b.cajaId) : null, fxRate: b && b.cajaFx != null ? Number(b.cajaFx) : null };
}
