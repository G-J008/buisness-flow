import { requireSession, unauthorized, bad, json, resolveCompanyId, actorOf } from './api';
import { getCompany } from './store';
import { ObraError, type Ctx } from './obra';

// Session + company for a construction request. The company must be of kind 'construction'.
export async function obraCtx(companyIdHint?: string): Promise<{ ctx?: Ctx; err?: Response }> {
  const s = await requireSession();
  if (!s) return { err: unauthorized() };
  const companyId = await resolveCompanyId(s, companyIdHint);
  if (!companyId) return { err: bad('no company') };
  const c = await getCompany(companyId);
  if (!c || c.kind !== 'construction') return { err: bad('not a construction company') };
  return { ctx: { role: s.role as any, uid: s.uid, actor: await actorOf(s), companyId } };
}
export function obraErr(e: any) {
  if (e instanceof ObraError) return json({ error: e.message }, e.status);
  throw e;
}

// Sales agents never get supplier costs back: a saved budget returns only its id and number
// (their screen reloads the version with the margin included).
export function publicRow(entity: string, row: any, ctx: Ctx) {
  if (ctx.role === 'sales' && (entity === 'budgets' || entity === 'products' || entity === 'itemtypes')) return { id: row.id, number: row.number };
  return row;
}
