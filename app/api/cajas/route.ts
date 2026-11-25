import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId, actorOf } from '@/lib/api';
import { createCaja, ensureDefaultCajas } from '@/lib/cajas';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!canManageMoney(s)) return forbidden();
  const b = await req.json().catch(() => ({}));
  const companyId = await resolveCompanyId(s, b.companyId);
  if (!companyId) return bad('no company');
  const name = String(b.name || '').trim();
  if (!name) return bad('name required');
  const currency = String(b.currency || 'PYG');
  if (!['PYG', 'USD'].includes(currency)) return bad('bad currency');
  await ensureDefaultCajas(companyId);
  const caja = await createCaja(companyId, { name, currency, kind: String(b.kind || 'Otro') }, await actorOf(s));
  return json({ ok: true, caja });
}
