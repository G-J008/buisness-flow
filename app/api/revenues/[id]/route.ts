import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId, actorOf } from '@/lib/api';
import { unlinkMoney } from '@/lib/cajas';
import { getRevenue, deleteRevenue } from '@/lib/store';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!canManageMoney(s)) return forbidden();
  const r = await getRevenue(params.id);
  if (!r) return bad('not found');
  if (r.saleId) return bad('this revenue comes from a sale — delete the sale instead');
  const companyId = await resolveCompanyId(s, r.companyId);
  if (companyId !== r.companyId) return forbidden();
  await deleteRevenue(r.id);
  await unlinkMoney('revenue', r.id, await actorOf(s));
  return json({ ok: true });
}
