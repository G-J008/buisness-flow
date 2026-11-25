import { requireSession, unauthorized, forbidden, bad, json, isAdmin } from '@/lib/api';
import { updateCompany, getCompany, companyUsage, deleteCompany, listUsersByCompany } from '@/lib/store';

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
  // details printed on construction proposals
  for (const k of ['ruc', 'contact', 'email', 'bankDetails']) if (typeof b[k] === 'string') f[k] = b[k].trim();
  if (b.defaultMargin !== undefined && Number(b.defaultMargin) >= 0) f.defaultMargin = Number(b.defaultMargin);
  const company = await updateCompany(params.id, f);
  return json({ ok: true, company });
}

// Master admin only, and only for companies without data. Its user profiles go too, once confirmed (?withUsers=1).
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!isAdmin(s)) return forbidden();
  const c = await getCompany(params.id);
  if (!c) return bad('not found');
  const usage = await companyUsage(c.id);
  if (Object.keys(usage).length) return json({ error: 'company in use', usage }, 400);
  const users = await listUsersByCompany(c.id);
  if (users.length && new URL(req.url).searchParams.get('withUsers') !== '1')
    return json({ error: 'company has users', users: users.map((u: any) => u.name + ' (@' + u.username + ')') }, 400);
  await deleteCompany(c.id);
  return json({ ok: true });
}
