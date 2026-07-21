import { hashPw } from '@/lib/auth';
import { requireSession, unauthorized, forbidden, bad, json, canManageProfiles, pubUser } from '@/lib/api';
import { findUserByUsername, createUser } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!canManageProfiles(s)) return forbidden();
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  const username = String(b.username || '').trim();
  const password = String(b.password || '');
  const role = String(b.role || '');
  if (!name || !username || !password || !role) return bad('missing fields');
  if (!['admin', 'manager', 'sales'].includes(role)) return bad('bad role');

  let companyId: string | null = null;
  if (s.role === 'admin') {
    if (role !== 'admin') {
      companyId = String(b.companyId || '') || null;
      if (!companyId) return bad('company required');
    }
  } else {
    if (role !== 'sales') return forbidden();
    companyId = s.companyId;
  }
  if (await findUserByUsername(username)) return bad('username exists');
  const u = await createUser({ name, username, passwordHash: await hashPw(password), role, companyId });
  return json({ ok: true, user: pubUser(u) });
}
