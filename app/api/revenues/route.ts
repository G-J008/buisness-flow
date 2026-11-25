import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId, actorOf, linkOf } from '@/lib/api';
import { checkLink, linkMoney } from '@/lib/cajas';
import { createRevenue } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!canManageMoney(s)) return forbidden();
  const b = await req.json().catch(() => ({}));
  const companyId = await resolveCompanyId(s, b.companyId);
  if (!companyId) return bad('no company');
  const amount = Number(b.amount) || 0;
  if (amount <= 0) return bad('amount required');
  const link = linkOf(b);
  try { await checkLink(companyId, link); } catch (e: any) { return bad(e.message); }
  const revenue = await createRevenue({
    companyId,
    date: String(b.date || new Date().toISOString().slice(0, 10)),
    amount,
    category: String(b.category || 'Other Revenue'),
    description: String(b.description || '').trim() || null,
  });
  await linkMoney(companyId, link, { pyg: amount, direction: 'in', refType: 'revenue', refId: revenue.id, date: revenue.date, description: revenue.description || revenue.category }, await actorOf(s));
  return json({ ok: true, revenue });
}
