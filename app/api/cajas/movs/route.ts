import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId, actorOf } from '@/lib/api';
import { addManualMov } from '@/lib/cajas';

export const runtime = 'nodejs';

// Money put into or taken out of a caja by hand. The exchange rate of the day is always required.
export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!canManageMoney(s)) return forbidden();
  const b = await req.json().catch(() => ({}));
  const companyId = await resolveCompanyId(s, b.companyId);
  if (!companyId) return bad('no company');
  const direction = b.direction === 'out' ? 'out' : 'in';
  const amount = Number(b.amount) || 0;
  if (amount <= 0) return bad('amount required');
  const fxRate = Number(b.fxRate) || 0;
  if (fxRate <= 0) return bad('exchange rate required');
  try {
    const mov = await addManualMov(companyId, {
      cajaId: String(b.cajaId || ''), direction, amount, fxRate,
      date: String(b.date || new Date().toISOString().slice(0, 10)),
      description: String(b.description || '').trim(),
    }, await actorOf(s));
    return json({ ok: true, mov });
  } catch (e: any) { return bad(e.message); }
}
