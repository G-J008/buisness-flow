import { requireSession, unauthorized, forbidden, bad, json } from '@/lib/api';
import { getUser, countAdmins, deleteUser } from '@/lib/store';

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
