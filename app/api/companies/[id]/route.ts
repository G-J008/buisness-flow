import { requireSession, unauthorized, forbidden, json } from '@/lib/api';
import { updateCompany } from '@/lib/store';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (s.role === 'sales') return forbidden();
  if (s.role === 'manager' && s.companyId !== params.id) return forbidden();
  const b = await req.json().catch(() => ({}));
  const f: any = {};
  if (typeof b.name === 'string' && b.name.trim()) f.name = b.name.trim();
  if (typeof b.productType === 'string' && b.productType.trim()) f.productType = b.productType.trim();
  if (typeof b.logo === 'string') f.logo = b.logo;
  const company = await updateCompany(params.id, f);
  return json({ ok: true, company });
}
