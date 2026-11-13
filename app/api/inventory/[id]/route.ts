import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId } from '@/lib/api';
import { getInventory, deleteInventory, soldUnits } from '@/lib/store';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!canManageMoney(s)) return forbidden();
  const it = await getInventory(params.id);
  if (!it) return bad('not found');
  const companyId = await resolveCompanyId(s, it.companyId);
  if (companyId !== it.companyId) return forbidden();
  // Sales keep pointing at the item (cost, stock), so it can't go while it has sales.
  if ((await soldUnits(it.id)) > 0) return bad('this item has sales — delete the sales first');
  await deleteInventory(it.id);
  return json({ ok: true });
}
