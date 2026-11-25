// Cajas: where the company's money physically sits (Gs / USD, bank / cash).
// Every movement records who made it and when; every create, edit and delete is written to caja_log.
import { q } from './db';
import { genId } from './store';

export type Actor = { id: string; name: string };
export type CajaLink = { cajaId?: string | null; fxRate?: number | null };

const CURRENCIES = ['PYG', 'USD'];
export const roundFor = (currency: string, n: number) =>
  currency === 'USD' ? Math.round(n * 100) / 100 : Math.round(n);

/* ---------- cajas ---------- */
const DEFAULTS = [
  ['pyg-banco', 'Gs · Banco', 'PYG', 'Banco', 1],
  ['pyg-efectivo', 'Gs · Efectivo', 'PYG', 'Efectivo', 2],
  ['usd-banco', 'USD · Banco', 'USD', 'Banco', 3],
  ['usd-efectivo', 'USD · Efectivo', 'USD', 'Efectivo', 4],
] as const;

// The four default cajas get fixed ids per company, so two requests at once can't create them twice.
export async function ensureDefaultCajas(companyId: string) {
  const { rows } = await q('SELECT COUNT(*) AS n FROM caja WHERE "companyId"=$1', [companyId]);
  if (Number(rows[0]?.n || 0) > 0) return;
  for (const [key, name, currency, kind, order] of DEFAULTS) {
    await q(
      'INSERT INTO caja (id,"companyId",name,currency,kind,"sortOrder") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING',
      [`${companyId}-${key}`, companyId, name, currency, kind, order]
    );
  }
}
export async function listCajas(companyId: string) {
  return (await q('SELECT * FROM caja WHERE "companyId"=$1 ORDER BY "sortOrder" ASC, "createdAt" ASC', [companyId])).rows;
}
export async function getCaja(id: string) {
  return (await q('SELECT * FROM caja WHERE id=$1', [id])).rows[0] || null;
}
export async function createCaja(companyId: string, f: { name: string; currency: string; kind: string }, by: Actor) {
  if (!CURRENCIES.includes(f.currency)) throw new Error('bad currency');
  const id = genId();
  await q('INSERT INTO caja (id,"companyId",name,currency,kind) VALUES ($1,$2,$3,$4,$5)', [id, companyId, f.name, f.currency, f.kind || 'Otro']);
  await log(companyId, by, 'caja_crear', { cajaId: id, detail: { name: f.name, currency: f.currency, kind: f.kind } });
  return getCaja(id);
}
export async function renameCaja(c: any, name: string, by: Actor) {
  await q('UPDATE caja SET name=$1 WHERE id=$2', [name, c.id]);
  await log(c.companyId, by, 'caja_editar', { cajaId: c.id, detail: { before: { name: c.name }, after: { name } } });
  return getCaja(c.id);
}
export async function cajaHasMovs(id: string) {
  const { rows } = await q('SELECT COUNT(*) AS n FROM caja_mov WHERE "cajaId"=$1', [id]);
  return Number(rows[0]?.n || 0) > 0;
}
export async function deleteCaja(c: any, by: Actor) {
  await q('DELETE FROM caja WHERE id=$1', [c.id]);
  await log(c.companyId, by, 'caja_eliminar', { cajaId: c.id, detail: { name: c.name } });
}

/* ---------- movements ---------- */
export async function listMovs(companyId: string) {
  return (await q('SELECT * FROM caja_mov WHERE "companyId"=$1', [companyId])).rows;
}
export async function getMov(id: string) {
  return (await q('SELECT * FROM caja_mov WHERE id=$1', [id])).rows[0] || null;
}
export async function listLog(companyId: string, limit = 500) {
  return (await q('SELECT * FROM caja_log WHERE "companyId"=$1 ORDER BY "createdAt" DESC LIMIT ' + Math.floor(limit), [companyId])).rows;
}
async function log(companyId: string, by: Actor, action: string, o: { movId?: string | null; cajaId?: string | null; detail?: any }) {
  await q('INSERT INTO caja_log (id,"companyId","movId","cajaId",action,"userId","userName",detail) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [
    genId(), companyId, o.movId || null, o.cajaId || null, action, by.id, by.name, o.detail ? JSON.stringify(o.detail) : null,
  ]);
}
const snap = (m: any) => ({ cajaId: m.cajaId, direction: m.direction, amount: m.amount, fxRate: m.fxRate, date: m.date, description: m.description });

async function insertMov(m: any, by: Actor) {
  const id = genId();
  await q(
    `INSERT INTO caja_mov (id,"companyId","cajaId",direction,amount,"fxRate",date,description,"refType","refId","transferId","userId","userName")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id, m.companyId, m.cajaId, m.direction, m.amount, m.fxRate ?? null, m.date, m.description ?? null, m.refType || 'manual', m.refId ?? null, m.transferId ?? null, by.id, by.name]
  );
  const row = await getMov(id);
  await log(m.companyId, by, 'crear', { movId: id, cajaId: m.cajaId, detail: { after: snap(row), refType: row.refType } });
  return row;
}

// Validates a caja picked in a sale/expense/payment form. Returns the caja, or throws a message the client translates.
export async function checkLink(companyId: string, link: CajaLink) {
  if (!link.cajaId) return null;
  const c = await getCaja(String(link.cajaId));
  if (!c || c.companyId !== companyId) throw new Error('invalid caja');
  if (c.currency !== 'PYG' && !(Number(link.fxRate) > 0)) throw new Error('exchange rate required');
  return c;
}

// Money in or out of a caja because of a sale, expense, revenue or client payment (amounts in PYG).
// Into a USD caja the amount is converted with the rate the user entered.
export async function linkMoney(
  companyId: string, link: CajaLink, o: { pyg: number; usd?: number; direction: 'in' | 'out'; refType: string; refId: string; date: string; description: string }, by: Actor
) {
  const c = await checkLink(companyId, link);
  if (!c) return null;
  const fx = Number(link.fxRate) > 0 ? Number(link.fxRate) : null;
  const amount = c.currency === 'PYG' ? roundFor('PYG', o.pyg) : roundFor('USD', o.usd != null ? o.usd : o.pyg / (fx as number));
  return insertMov({ companyId, cajaId: c.id, direction: o.direction, amount, fxRate: fx, date: o.date, description: o.description, refType: o.refType, refId: o.refId }, by);
}

export async function unlinkMoney(refType: string, refId: string, by: Actor) {
  const rows = (await q('SELECT * FROM caja_mov WHERE "refType"=$1 AND "refId"=$2', [refType, refId])).rows;
  for (const m of rows) {
    await q('DELETE FROM caja_mov WHERE id=$1', [m.id]);
    await log(m.companyId, by, 'eliminar', { movId: m.id, cajaId: m.cajaId, detail: { before: snap(m), refType, reason: 'origen eliminado' } });
  }
}

export async function addManualMov(companyId: string, f: { cajaId: string; direction: 'in' | 'out'; amount: number; fxRate: number; date: string; description: string }, by: Actor) {
  const c = await getCaja(f.cajaId);
  if (!c || c.companyId !== companyId) throw new Error('invalid caja');
  return insertMov({ companyId, cajaId: c.id, direction: f.direction, amount: roundFor(c.currency, f.amount), fxRate: f.fxRate, date: f.date, description: f.description, refType: 'manual' }, by);
}

// Converts an amount between the currencies of two cajas with the given rate (Gs per 1 USD).
export function convert(amount: number, from: string, to: string, fx: number) {
  if (from === to) return amount;
  return from === 'USD' ? amount * fx : amount / fx;
}

export async function transfer(companyId: string, f: { fromId: string; toId: string; amount: number; fxRate: number; date: string; description: string }, by: Actor) {
  const a = await getCaja(f.fromId), b = await getCaja(f.toId);
  if (!a || !b || a.companyId !== companyId || b.companyId !== companyId || a.id === b.id) throw new Error('invalid caja');
  const tid = genId();
  const desc = f.description || null;
  const out = await insertMov({ companyId, cajaId: a.id, direction: 'out', amount: roundFor(a.currency, f.amount), fxRate: f.fxRate, date: f.date, description: desc, refType: 'transfer', transferId: tid }, by);
  const inn = await insertMov({ companyId, cajaId: b.id, direction: 'in', amount: roundFor(b.currency, convert(f.amount, a.currency, b.currency, f.fxRate)), fxRate: f.fxRate, date: f.date, description: desc, refType: 'transfer', transferId: tid }, by);
  return { out, in: inn };
}

async function updateRow(m: any, f: any, by: Actor) {
  await q(
    `UPDATE caja_mov SET "cajaId"=$1, amount=$2, "fxRate"=$3, date=$4, description=$5, "updatedAt"=now(), "updatedByName"=$6 WHERE id=$7`,
    [f.cajaId, f.amount, f.fxRate, f.date, f.description, by.name, m.id]
  );
  const after = await getMov(m.id);
  await log(m.companyId, by, 'editar', { movId: m.id, cajaId: after.cajaId, detail: { before: snap(m), after: snap(after), refType: m.refType } });
  return after;
}

// Edits keep the movement and record before/after. A transfer is edited as a whole (both sides move together).
// Movements that come from a sale, expense, revenue or payment keep their amount in Gs: only the caja,
// the exchange rate and the note can change, and the amount is recalculated from the origin.
export async function editMov(m: any, f: { cajaId?: string; amount?: number; fxRate?: number; date?: string; description?: string }, by: Actor, originPYG?: number | null) {
  const fx = f.fxRate !== undefined ? Number(f.fxRate) : m.fxRate;
  const date = f.date !== undefined ? f.date : m.date;
  const description = f.description !== undefined ? f.description : m.description;
  if (m.refType === 'transfer') {
    const legs = (await q('SELECT * FROM caja_mov WHERE "transferId"=$1', [m.transferId])).rows;
    const out = legs.find((x: any) => x.direction === 'out'), inn = legs.find((x: any) => x.direction === 'in');
    if (!out || !inn) throw new Error('not found');
    const a = await getCaja(out.cajaId), b = await getCaja(inn.cajaId);
    if (!(fx > 0)) throw new Error('exchange rate required');
    const amt = f.amount !== undefined ? Number(f.amount) : (m.direction === 'out' ? out.amount : convert(inn.amount, b.currency, a.currency, fx));
    // the amount typed is always read in the currency of the leg being edited
    const outAmt = m.direction === 'out' ? amt : convert(amt, b.currency, a.currency, fx);
    await updateRow(out, { cajaId: out.cajaId, amount: roundFor(a.currency, outAmt), fxRate: fx, date, description }, by);
    await updateRow(inn, { cajaId: inn.cajaId, amount: roundFor(b.currency, convert(outAmt, a.currency, b.currency, fx)), fxRate: fx, date, description }, by);
    return getMov(m.id);
  }
  const cajaId = f.cajaId || m.cajaId;
  const c = await getCaja(cajaId);
  if (!c || c.companyId !== m.companyId) throw new Error('invalid caja');
  let amount: number;
  if (m.refType === 'manual') {
    if (!(fx > 0)) throw new Error('exchange rate required');
    amount = f.amount !== undefined ? Number(f.amount) : m.amount;
    if (!(amount > 0)) throw new Error('amount required');
  } else {
    const pyg = originPYG != null ? originPYG : 0;
    if (c.currency !== 'PYG' && !(fx > 0)) throw new Error('exchange rate required');
    amount = c.currency === 'PYG' ? pyg : pyg / fx;
  }
  return updateRow(m, { cajaId: c.id, amount: roundFor(c.currency, amount), fxRate: fx || null, date: m.refType === 'manual' ? date : m.date, description }, by);
}

export async function deleteMov(m: any, by: Actor) {
  const rows = m.transferId ? (await q('SELECT * FROM caja_mov WHERE "transferId"=$1', [m.transferId])).rows : [m];
  for (const x of rows) {
    await q('DELETE FROM caja_mov WHERE id=$1', [x.id]);
    await log(x.companyId, by, 'eliminar', { movId: x.id, cajaId: x.cajaId, detail: { before: snap(x), refType: x.refType } });
  }
}
