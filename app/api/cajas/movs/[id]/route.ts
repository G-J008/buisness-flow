import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId, actorOf } from '@/lib/api';
import { getMov, editMov, deleteMov } from '@/lib/cajas';
import { getSale, getExpense, getRevenue, getPayment } from '@/lib/store';
import { getRow } from '@/lib/obra';

export const runtime = 'nodejs';

async function load(id: string) {
  const s = await requireSession();
  if (!s) return { err: unauthorized() };
  if (!canManageMoney(s)) return { err: forbidden() };
  const m = await getMov(id);
  if (!m) return { err: bad('not found') };
  if ((await resolveCompanyId(s, m.companyId)) !== m.companyId) return { err: forbidden() };
  return { s, m };
}

// Amount in Gs of whatever created a linked movement.
async function originPYG(m: any) {
  const get: any = { sale: getSale, expense: getExpense, revenue: getRevenue, payment: getPayment, cpay: (id: string) => getRow('payments', id) }[m.refType];
  if (!get || !m.refId) return null;
  const o = await get(m.refId);
  return o ? Number(o.price ?? o.amount) || 0 : null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const r = await load(params.id);
  if (r.err) return r.err;
  const b = await req.json().catch(() => ({}));
  const f: any = {};
  if (b.cajaId !== undefined) f.cajaId = String(b.cajaId);
  if (b.amount !== undefined) f.amount = Number(b.amount);
  if (b.fxRate !== undefined) f.fxRate = Number(b.fxRate);
  if (b.date !== undefined) f.date = String(b.date);
  if (b.description !== undefined) f.description = String(b.description).trim();
  if (r.m.refType === 'transfer' && f.cajaId && f.cajaId !== r.m.cajaId) return bad('a transfer keeps its cajas — delete it and create it again');
  try {
    const mov = await editMov(r.m, f, await actorOf(r.s!), await originPYG(r.m));
    return json({ ok: true, mov });
  } catch (e: any) { return bad(e.message); }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const r = await load(params.id);
  if (r.err) return r.err;
  if (!['manual', 'transfer'].includes(r.m.refType)) return bad('this movement comes from a sale or expense — delete it there');
  await deleteMov(r.m, await actorOf(r.s!));
  return json({ ok: true });
}
