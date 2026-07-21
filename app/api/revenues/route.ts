import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId } from '@/lib/api';
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
  const revenue = await createRevenue({
    companyId,
    date: String(b.date || new Date().toISOString().slice(0, 10)),
    amount,
    category: String(b.category || 'Other Revenue'),
    description: String(b.description || '').trim() || null,
  });
  return json({ ok: true, revenue });
}
