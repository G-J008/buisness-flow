// Argus Construcción: suppliers and their products, item types, budgets, proposals, projects with tasks,
// reminders and the payment calendar. Every create, edit and delete is written to c_log.
import { q } from './db';
import { genId, getCompany } from './store';
import { linkMoney, unlinkMoney, checkLink, type Actor, type CajaLink } from './cajas';
import { proposalItems, inflateLines, type Line } from './obra-calc';
import { norm } from './obra-norm';

type Role = 'admin' | 'manager' | 'sales';
export type Ctx = { role: Role; uid: string; actor: Actor; companyId: string };
const MANAGERS: Role[] = ['admin', 'manager'];
const ALL: Role[] = ['admin', 'manager', 'sales'];

// Field spec: str, num, date, bool, json, enum:a|b, ref:<table>. A trailing ! makes it required.
type Spec = { table: string; fields: Record<string, string>; write: Role[]; ownOnly?: boolean; logDetail?: boolean };
export const ENTITIES: Record<string, Spec> = {
  suppliers: { table: 'c_supplier', write: MANAGERS, fields: { name: 'str!', phone: 'str', contact: 'str', notes: 'str' } },
  categories: { table: 'c_category', write: MANAGERS, fields: { name: 'str!' } },
  products: { table: 'c_product', write: MANAGERS, logDetail: true, fields: { supplierId: 'ref:c_supplier!', categoryId: 'ref:c_category!', name: 'str!', unit: 'enum:m2|ml|un', price: 'num!', code: 'str' } },
  itemtypes: { table: 'c_itemtype', write: MANAGERS, fields: { name: 'str!', parts: 'json', laborMode: 'enum:item|m2', laborRate: 'num' } },
  budgets: { table: 'c_budget', write: ALL, ownOnly: true, fields: { title: 'str', clientId: 'ref:client', projectName: 'str', location: 'str', marginPct: 'num', lines: 'json', notes: 'str' } },
  proposals: { table: 'c_proposal', write: ALL, ownOnly: true, fields: { clientId: 'ref:client', clientName: 'str', clientRuc: 'str', projectName: 'str', location: 'str', items: 'json', paymentTerms: 'str', estimatedTime: 'str', bankDetails: 'str', notes: 'str', date: 'date' } },
  projects: { table: 'c_project', write: MANAGERS, fields: { name: 'str!', clientId: 'ref:client', location: 'str', startDate: 'date', status: 'enum:active|done', budgetId: 'ref:c_budget', proposalId: 'ref:c_proposal', notes: 'str' } },
  tasks: { table: 'c_task', write: MANAGERS, fields: { projectId: 'ref:c_project!', title: 'str!', dueDate: 'date', done: 'bool' } },
  reminders: { table: 'c_reminder', write: ALL, fields: { text: 'str!', date: 'date', done: 'bool' } },
  payments: { table: 'c_payment', write: MANAGERS, logDetail: true, fields: { direction: 'enum:in|out', projectId: 'ref:c_project', clientId: 'ref:client', supplierId: 'ref:c_supplier', description: 'str', amount: 'num!', dueDate: 'date!', method: 'enum:efectivo|transferencia|cheque', chequeNumber: 'str', chequeDate: 'date' } },
};

export class ObraError extends Error {
  constructor(msg: string, public status = 400) { super(msg); }
}
const JSON_COLS = new Set(['parts', 'lines', 'items']);
const col = (k: string) => `"${k}"`;
function decode(row: any) {
  if (!row) return row;
  for (const k of JSON_COLS) if (typeof row[k] === 'string') { try { row[k] = JSON.parse(row[k]); } catch { row[k] = []; } }
  return row;
}
export async function getRow(entity: string, id: string) {
  const spec = ENTITIES[entity];
  return decode((await q(`SELECT * FROM ${spec.table} WHERE id=$1`, [id])).rows[0] || null);
}
async function log(ctx: Ctx, entity: string, entityId: string, action: string, detail?: any) {
  await q('INSERT INTO c_log (id,"companyId",entity,"entityId",action,"userName",detail) VALUES ($1,$2,$3,$4,$5,$6,$7)', [
    genId(), ctx.companyId, entity, entityId, action, ctx.actor.name, detail ? JSON.stringify(detail) : null,
  ]);
}

// Validates and converts the body into column values. Partial when editing.
async function clean(spec: Spec, body: any, ctx: Ctx, partial: boolean) {
  const out: Record<string, any> = {};
  for (const [k, t0] of Object.entries(spec.fields)) {
    const required = t0.endsWith('!');
    const t = required ? t0.slice(0, -1) : t0;
    if (!(k in body)) {
      if (required && !partial) throw new ObraError(`${k} required`);
      continue;
    }
    let v = body[k];
    if (t === 'str') v = v == null ? null : String(v).trim() || null;
    else if (t === 'num') { v = v === '' || v == null ? null : Number(v); if (v != null && (!isFinite(v) || v < 0)) throw new ObraError(`invalid ${k}`); }
    else if (t === 'date') { v = v ? String(v).slice(0, 10) : null; if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new ObraError(`invalid ${k}`); }
    else if (t === 'bool') v = !!v;
    else if (t === 'json') v = JSON.stringify(Array.isArray(v) ? v : []);
    else if (t.startsWith('enum:')) { const opts = t.slice(5).split('|'); v = opts.includes(v) ? v : opts[0]; }
    else if (t.startsWith('ref:')) {
      v = v ? String(v) : null;
      if (v) {
        const r = (await q(`SELECT "companyId" FROM ${t.slice(4)} WHERE id=$1`, [v])).rows[0];
        if (!r || r.companyId !== ctx.companyId) throw new ObraError(`invalid ${k}`);
      }
    }
    if (required && (v == null || v === '')) throw new ObraError(`${k} required`);
    out[k] = v;
  }
  return out;
}

/* ---------- budgets: lines are re-priced from the supplier database on every save ---------- */
async function marginFactor(companyId: string) {
  const c = await getCompany(companyId);
  return 1 + (Number(c?.defaultMargin ?? 30) || 0) / 100;
}
async function normalizeLines(raw: any[], ctx: Ctx, k: number): Promise<Line[]> {
  const prods = new Map<string, any>();
  for (const p of (await q('SELECT * FROM c_product WHERE "companyId"=$1', [ctx.companyId])).rows) prods.set(p.id, p);
  const num = (v: any) => Math.max(0, Number(v) || 0);
  return (Array.isArray(raw) ? raw : []).slice(0, 300).map((l: any) => ({
    id: String(l.id || genId()),
    itemTypeId: l.itemTypeId ? String(l.itemTypeId) : undefined,
    baseName: String(l.baseName || 'Ítem').trim().slice(0, 120),
    width: num(l.width),
    height: num(l.height),
    qty: Math.max(1, Math.floor(Number(l.qty) || 1)),
    laborMode: l.laborMode === 'm2' ? 'm2' : 'item',
    // a sales agent types labour at client price (margin included); stored as cost
    laborRate: num(l.laborRate) / (ctx.role === 'sales' ? k : 1),
    parts: (Array.isArray(l.parts) ? l.parts : []).slice(0, 20).map((p: any) => {
      const pr = p.productId ? prods.get(String(p.productId)) : null;
      return {
        label: String(p.label || '').trim().slice(0, 60),
        categoryId: p.categoryId ? String(p.categoryId) : pr?.categoryId,
        supplierId: pr ? pr.supplierId : p.supplierId ? String(p.supplierId) : undefined,
        productId: pr ? pr.id : undefined,
        productName: pr ? pr.name : undefined,
        unit: pr ? pr.unit : undefined,
        price: pr ? Number(pr.price) : undefined,
        accessories: (Array.isArray(p.accessories) ? p.accessories : []).slice(0, 30).map((a: any) => {
          const ap = a.productId ? prods.get(String(a.productId)) : null;
          return ap ? { supplierId: ap.supplierId, productId: ap.id, name: ap.name, price: Number(ap.price), qty: num(a.qty) } : null;
        }).filter(Boolean),
      };
    }),
  }));
}

async function nextNumber(table: string, companyId: string) {
  const { rows } = await q(`SELECT COALESCE(MAX(number),0)+1 AS n FROM ${table} WHERE "companyId"=$1`, [companyId]);
  return Number(rows[0].n);
}

function canWrite(spec: Spec, ctx: Ctx, row?: any) {
  if (!spec.write.includes(ctx.role)) throw new ObraError('forbidden', 403);
  if (row && row.companyId !== ctx.companyId) throw new ObraError('forbidden', 403);
  if (row && spec.ownOnly && ctx.role === 'sales' && row.createdBy !== ctx.uid) throw new ObraError('forbidden', 403);
}

// Proposal rows are re-checked here and the total always comes from them.
function cleanItems(f: Record<string, any>) {
  if (f.items === undefined) return;
  const items = (JSON.parse(f.items) as any[]).slice(0, 300).map((it) => {
    const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
    const unitPrice = Math.max(0, Math.round(Number(it.unitPrice) || 0));
    return { description: String(it.description || '').trim().slice(0, 500), qty, unitPrice, total: qty * unitPrice };
  });
  f.items = JSON.stringify(items);
  f.total = items.reduce((t, it) => t + it.total, 0);
}

// Exact duplicates are refused one record at a time: same supplier name, category name, item type name,
// or the same product (code, or name) for the same supplier. Names compare without capitals, accents or extra spaces.
export async function findDuplicate(entity: string, f: Record<string, any>, companyId: string, selfId?: string) {
  const rows = async (t: string, extra = '', args: any[] = []) =>
    (await q(`SELECT * FROM ${t} WHERE "companyId"=$1 ${extra}`, [companyId, ...args])).rows.filter((r: any) => r.id !== selfId);
  if (entity === 'suppliers' && f.name) return (await rows('c_supplier')).find((r: any) => norm(r.name) === norm(f.name)) || null;
  if (entity === 'categories' && f.name) return (await rows('c_category')).find((r: any) => norm(r.name) === norm(f.name)) || null;
  if (entity === 'itemtypes' && f.name) return (await rows('c_itemtype')).find((r: any) => norm(r.name) === norm(f.name)) || null;
  if (entity === 'products' && f.supplierId) {
    const same = await rows('c_product', 'AND "supplierId"=$2', [f.supplierId]);
    if (f.code && norm(f.code)) { const byCode = same.find((r: any) => r.code && norm(r.code) === norm(f.code)); if (byCode) return byCode; }
    if (f.name) return same.find((r: any) => norm(r.name) === norm(f.name)) || null;
  }
  return null;
}

export async function createEntity(entity: string, body: any, ctx: Ctx) {
  const spec = ENTITIES[entity];
  if (!spec) throw new ObraError('not found', 404);
  canWrite(spec, ctx);
  if (entity === 'proposals' && body.budgetId) return proposalFromBudget(String(body.budgetId), body, ctx);
  if (entity === 'payments' && body.direction === 'out' && !body.supplierId) throw new ObraError('supplierId required');
  const f = await clean(spec, body, ctx, false);
  const dup = await findDuplicate(entity, f, ctx.companyId);
  if (dup) throw new ObraError('duplicate', 409);
  const id = genId();
  const extra: Record<string, any> = {};
  if (entity === 'budgets') {
    const k = await marginFactor(ctx.companyId);
    if (ctx.role === 'sales' || f.marginPct == null) f.marginPct = Math.round((k - 1) * 10000) / 100;
    f.lines = JSON.stringify(await normalizeLines(JSON.parse(f.lines || '[]'), ctx, k));
    extra.number = await nextNumber('c_budget', ctx.companyId);
  }
  if (entity === 'proposals') { cleanItems(f); extra.number = await nextNumber('c_proposal', ctx.companyId); }
  if (['budgets', 'proposals', 'payments'].includes(entity)) extra.createdBy = ctx.uid;
  if (entity === 'reminders') extra.userId = ctx.uid;
  if (entity === 'tasks' && f.done) extra.doneAt = new Date().toISOString();
  const all = { id, companyId: ctx.companyId, ...f, ...extra };
  const keys = Object.keys(all);
  await q(`INSERT INTO ${spec.table} (${keys.map(col).join(',')}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')})`, keys.map((k) => all[k]));
  if (entity === 'products') await q('UPDATE c_supplier SET "pricesUpdatedAt"=now() WHERE id=$1', [f.supplierId]);
  const row = await getRow(entity, id);
  await log(ctx, entity, id, 'crear', spec.logDetail ? { after: row } : { name: row.name || row.title || row.text || row.number });
  return row;
}

export async function updateEntity(entity: string, id: string, body: any, ctx: Ctx) {
  const spec = ENTITIES[entity];
  if (!spec) throw new ObraError('not found', 404);
  const before = await getRow(entity, id);
  if (!before) throw new ObraError('not found', 404);
  canWrite(spec, ctx, before);
  if (entity === 'payments' && before.status === 'paid' && ('amount' in body || 'direction' in body))
    throw new ObraError('mark the payment as pending before changing the amount');
  const f = await clean(spec, body, ctx, true);
  if (['suppliers', 'categories', 'itemtypes', 'products'].includes(entity) && ('name' in f || 'code' in f || 'supplierId' in f)) {
    const dup = await findDuplicate(entity, { ...before, ...f }, ctx.companyId, id);
    if (dup) throw new ObraError('duplicate', 409);
  }
  if (entity === 'budgets') {
    const k = await marginFactor(ctx.companyId);
    if (ctx.role === 'sales') delete f.marginPct;
    if (f.lines !== undefined) f.lines = JSON.stringify(await normalizeLines(JSON.parse(f.lines), ctx, k));
  }
  if (entity === 'proposals') cleanItems(f);
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(f)) { vals.push(v); sets.push(`${col(k)}=$${vals.length}`); }
  if (entity === 'tasks' && 'done' in f) sets.push(f.done ? `"doneAt"=COALESCE("doneAt", now())` : `"doneAt"=NULL`);
  if (entity === 'products' && 'price' in f && Number(f.price) !== Number(before.price)) sets.push(`"updatedAt"=now()`);
  if (['budgets', 'proposals', 'payments'].includes(entity)) sets.push(`"updatedAt"=now()`);
  if (sets.length) { vals.push(id); await q(`UPDATE ${spec.table} SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals); }
  const after = await getRow(entity, id);
  if (entity === 'products' && Number(after.price) !== Number(before.price))
    await q('UPDATE c_supplier SET "pricesUpdatedAt"=now() WHERE id=$1', [after.supplierId]);
  await log(ctx, entity, id, 'editar', spec.logDetail ? { before, after } : { name: after.name || after.title || after.text || after.number });
  return after;
}

export async function deleteEntity(entity: string, id: string, ctx: Ctx) {
  const spec = ENTITIES[entity];
  if (!spec) throw new ObraError('not found', 404);
  const row = await getRow(entity, id);
  if (!row) throw new ObraError('not found', 404);
  canWrite(spec, ctx, row);
  const used = async (sql: string) => Number((await q(sql, [id])).rows[0].n) > 0;
  if (entity === 'suppliers' && (await used('SELECT COUNT(*) AS n FROM c_product WHERE "supplierId"=$1'))) throw new ObraError('supplier has products');
  if (entity === 'categories' && (await used('SELECT COUNT(*) AS n FROM c_product WHERE "categoryId"=$1'))) throw new ObraError('category has products');
  if (entity === 'payments' && row.status === 'paid') await unlinkMoney('cpay', id, ctx.actor);
  if (entity === 'projects') await q('DELETE FROM c_task WHERE "projectId"=$1', [id]);
  await q(`DELETE FROM ${spec.table} WHERE id=$1`, [id]);
  await log(ctx, entity, id, 'eliminar', spec.logDetail ? { before: row } : { name: row.name || row.title || row.text || row.number });
}

/* ---------- proposals ---------- */
async function proposalFromBudget(budgetId: string, body: any, ctx: Ctx) {
  const b = await getRow('budgets', budgetId);
  if (!b || b.companyId !== ctx.companyId) throw new ObraError('invalid budgetId');
  if (ctx.role === 'sales' && b.createdBy !== ctx.uid) throw new ObraError('forbidden', 403);
  const company = await getCompany(ctx.companyId);
  const client = b.clientId ? (await q('SELECT * FROM client WHERE id=$1', [b.clientId])).rows[0] : null;
  const items = proposalItems(b.lines || [], b.marginPct);
  return createEntity('proposals', {
    clientId: b.clientId, clientName: client?.name || '', clientRuc: client?.ruc || '',
    projectName: b.projectName || b.title || '', location: b.location || '', items,
    paymentTerms: body.paymentTerms ?? '50% al aprobar, 50% al finalizar la obra', estimatedTime: body.estimatedTime ?? '',
    bankDetails: company?.bankDetails || '', notes: '', date: new Date().toISOString().slice(0, 10),
  }, ctx).then(async (row) => {
    await q('UPDATE c_proposal SET "budgetId"=$1 WHERE id=$2', [budgetId, row.id]);
    return getRow('proposals', row.id);
  });
}

/* ---------- payment calendar: paying moves money in the caja picked ---------- */
export async function payPayment(id: string, link: CajaLink, paidAt: string, ctx: Ctx) {
  const p = await getRow('payments', id);
  if (!p || p.companyId !== ctx.companyId) throw new ObraError('not found', 404);
  canWrite(ENTITIES.payments, ctx, p);
  if (p.status === 'paid') throw new ObraError('already paid');
  try { await checkLink(ctx.companyId, link); } catch (e: any) { throw new ObraError(e.message); }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(paidAt) ? paidAt : new Date().toISOString().slice(0, 10);
  const who = p.direction === 'in'
    ? (await q('SELECT name FROM client WHERE id=$1', [p.clientId])).rows[0]?.name
    : (await q('SELECT name FROM c_supplier WHERE id=$1', [p.supplierId])).rows[0]?.name;
  const desc = [p.direction === 'in' ? 'Cobro' : 'Pago', who, p.description, p.method === 'cheque' && p.chequeNumber ? `cheque ${p.chequeNumber}` : '']
    .filter(Boolean).join(' · ');
  await linkMoney(ctx.companyId, link, { pyg: Number(p.amount) || 0, direction: p.direction === 'in' ? 'in' : 'out', refType: 'cpay', refId: id, date, description: desc }, ctx.actor);
  await q('UPDATE c_payment SET status=$1, "paidAt"=$2, "updatedAt"=now() WHERE id=$3', ['paid', date, id]);
  const after = await getRow('payments', id);
  await log(ctx, 'payments', id, 'pagado', { before: p, after });
  return after;
}
export async function unpayPayment(id: string, ctx: Ctx) {
  const p = await getRow('payments', id);
  if (!p || p.companyId !== ctx.companyId) throw new ObraError('not found', 404);
  canWrite(ENTITIES.payments, ctx, p);
  await unlinkMoney('cpay', id, ctx.actor);
  await q('UPDATE c_payment SET status=$1, "paidAt"=NULL, "updatedAt"=now() WHERE id=$2', ['pending', id]);
  const after = await getRow('payments', id);
  await log(ctx, 'payments', id, 'pendiente', { before: p, after });
  return after;
}

/* ---------- what each role receives ---------- */
export async function obraState(companyId: string, role: Role, uid: string) {
  const all = async (t: string, order = '"createdAt" ASC') => (await q(`SELECT * FROM ${t} WHERE "companyId"=$1 ORDER BY ${order}`, [companyId])).rows.map(decode);
  const company = await getCompany(companyId);
  const k = 1 + (Number(company?.defaultMargin ?? 30) || 0) / 100;
  const st: any = {
    suppliers: await all('c_supplier', 'name ASC'),
    categories: await all('c_category', 'name ASC'),
    products: await all('c_product', 'name ASC'),
    itemTypes: await all('c_itemtype', 'name ASC'),
    budgets: await all('c_budget', 'number DESC'),
    proposals: await all('c_proposal', 'number DESC'),
    projects: await all('c_project'),
    tasks: await all('c_task', '"dueDate" ASC NULLS LAST'),
    reminders: await all('c_reminder', 'date ASC NULLS LAST'),
    payments: [],
    log: [],
  };
  if (role === 'sales') {
    // sales agents never see supplier costs or margins: prices arrive with the margin already included
    st.products = st.products.map((p: any) => ({ ...p, price: Number(p.price) * k }));
    st.itemTypes = st.itemTypes.map((t: any) => ({ ...t, laborRate: Number(t.laborRate) * k }));
    st.budgets = st.budgets.filter((b: any) => b.createdBy === uid).map((b: any) => {
      const kb = 1 + (Number(b.marginPct) || 0) / 100;
      return { ...b, lines: inflateLines(b.lines || [], kb), marginPct: 0, pricesIncludeMargin: true };
    });
    st.proposals = st.proposals.filter((p: any) => p.createdBy === uid);
  } else {
    st.payments = await all('c_payment', '"dueDate" ASC');
    st.log = (await q('SELECT * FROM c_log WHERE "companyId"=$1 ORDER BY "createdAt" DESC LIMIT 400', [companyId])).rows;
  }
  return st;
}
