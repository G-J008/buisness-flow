import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId, actorOf } from '@/lib/api';
import { transfer } from '@/lib/cajas';

export const runtime = 'nodejs';

// Moves money between two cajas. The amount is in the currency of the source caja; the rate converts it.
export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!canManageMoney(s)) return forbidden();
  const b = await req.json().catch(() => ({}));
  const companyId = await resolveCompanyId(s, b.companyId);
  if (!companyId) return bad('no company');
  const amount = Number(b.amount) || 0;
  if (amount <= 0) return bad('amount required');
  const fxRate = Number(b.fxRate) || 0;
  if (fxRate <= 0) return bad('exchange rate required');
  try {
    const r = await transfer(companyId, {
      fromId: String(b.fromId || ''), toId: String(b.toId || ''), amount, fxRate,
      date: String(b.date || new Date().toISOString().slice(0, 10)),
      description: String(b.description || '').trim(),
    }, await actorOf(s));
    return json({ ok: true, ...r });
  } catch (e: any) { return bad(e.message); }
}
