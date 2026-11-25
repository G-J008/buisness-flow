import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId, actorOf } from '@/lib/api';
import { getCaja, renameCaja, deleteCaja, cajaHasMovs } from '@/lib/cajas';

export const runtime = 'nodejs';

async function load(id: string) {
  const s = await requireSession();
  if (!s) return { err: unauthorized() };
  if (!canManageMoney(s)) return { err: forbidden() };
  const c = await getCaja(id);
  if (!c) return { err: bad('not found') };
  if ((await resolveCompanyId(s, c.companyId)) !== c.companyId) return { err: forbidden() };
  return { s, c };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const r = await load(params.id);
  if (r.err) return r.err;
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  if (!name) return bad('name required');
  return json({ ok: true, caja: await renameCaja(r.c, name, await actorOf(r.s!)) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const r = await load(params.id);
  if (r.err) return r.err;
  if (await cajaHasMovs(r.c.id)) return bad('caja has movements');
  await deleteCaja(r.c, await actorOf(r.s!));
  return json({ ok: true });
}
