import { requireSession, unauthorized, forbidden, bad, json } from '@/lib/api';
import { getUser, countAdmins, deleteUser, setPassword } from '@/lib/store';
import { hashPw } from '@/lib/auth';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if (!s) return unauthorized();
  const target = await getUser(params.id);
  if (!target) return bad('not found');
  if (target.id === s.uid) return bad('cannot delete yourself');

  if (s.role === 'admin') {
    if (target.role === 'admin' && (await countAdmins()) <= 1) return bad('cannot delete the last admin');
  } else if (s.role === 'manager') {
    if (!(target.role === 'sales' && target.companyId === s.companyId)) return forbidden();
  } else {
    return forbidden();
  }
  await deleteUser(target.id);
  return json({ ok: true });
}

// Sets a new password for another user: a master admin for anyone, a manager for the sales agents of their company.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if (!s) return unauthorized();
  const target = await getUser(params.id);
  if (!target) return bad('not found');
  if (!(s.role === 'admin' || (s.role === 'manager' && target.role === 'sales' && target.companyId === s.companyId))) return forbidden();
  const b = await req.json().catch(() => ({}));
  const np = String(b.password || '');
  if (np.length < 8) return bad('password too short');
  await setPassword(target.id, await hashPw(np));
  return json({ ok: true });
}
