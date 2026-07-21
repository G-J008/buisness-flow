import { requireSession, unauthorized, forbidden, bad, json, isAdmin } from '@/lib/api';
import { createCompany } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!isAdmin(s)) return forbidden();
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  if (!name) return bad('name required');
  const productType = String(b.productType || 'Item').trim() || 'Item';
  const company = await createCompany(name, productType);
  return json({ ok: true, company });
}
