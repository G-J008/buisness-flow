import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId } from '@/lib/api';
import { getSale, deleteSaleCascade } from '@/lib/store';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!canManageMoney(s)) return forbidden();
  const sale = await getSale(params.id);
  if (!sale) return bad('not found');
  const companyId = await resolveCompanyId(s, sale.companyId);
  if (companyId !== sale.companyId) return forbidden();
  await deleteSaleCascade(sale);
  return json({ ok: true });
}
