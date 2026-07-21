import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId } from '@/lib/api';
import { getInventory, deleteInventory } from '@/lib/store';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!canManageMoney(s)) return forbidden();
  const it = await getInventory(params.id);
  if (!it) return bad('not found');
  const companyId = await resolveCompanyId(s, it.companyId);
  if (companyId !== it.companyId) return forbidden();
  await deleteInventory(it.id);
  return json({ ok: true });
}
