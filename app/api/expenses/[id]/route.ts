import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId, actorOf } from '@/lib/api';
import { unlinkMoney } from '@/lib/cajas';
import { getExpense, deleteExpense } from '@/lib/store';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!canManageMoney(s)) return forbidden();
  const e = await getExpense(params.id);
  if (!e) return bad('not found');
  const companyId = await resolveCompanyId(s, e.companyId);
  if (companyId !== e.companyId) return forbidden();
  if (e.inventoryId) return bad('this expense comes from an inventory item — delete the item instead');
  await deleteExpense(e.id);
  await unlinkMoney('expense', e.id, await actorOf(s));
  return json({ ok: true });
}
