// Importing a supplier price list pasted from Excel. Each row is checked on its own: a duplicate or a row
// with an error is left out and reported, and the rest of the sheet is still loaded.
import { q } from './db';
import { createEntity, updateEntity, findDuplicate, ObraError, type Ctx } from './obra';
import { norm, productKey, similar, parsePrice, parseUnit, guessUnit } from './obra-norm';

export type InRow = { supplier?: any; category?: any; product?: any; unit?: any; price?: any; code?: any };
export type Status = 'new' | 'update' | 'same' | 'similar' | 'dup' | 'error';
export type OutRow = {
  i: number; status: Status; reason?: string;
  supplier: string; supplierNew: boolean; category: string; categoryNew: boolean;
  product: string; code?: string; unit: string | null; unitGuessed: boolean; price: number | null;
  existing?: { id: string; name: string; price: number; unit: string; category: string; code?: string };
  candidates?: { id: string; name: string; price: number; unit: string }[];
  changes?: string[];
};

async function load(companyId: string) {
  const all = async (t: string) => (await q(`SELECT * FROM ${t} WHERE "companyId"=$1`, [companyId])).rows;
  const suppliers = await all('c_supplier'), categories = await all('c_category'), products = await all('c_product');
  return {
    suppliers, categories, products,
    supByKey: new Map(suppliers.map((s: any) => [norm(s.name), s])),
    catByKey: new Map(categories.map((c: any) => [norm(c.name), c])),
    catById: new Map(categories.map((c: any) => [c.id, c])),
  };
}

export async function analyze(rows: InRow[], ctx: Ctx): Promise<OutRow[]> {
  if (!['admin', 'manager'].includes(ctx.role)) throw new ObraError('forbidden', 403);
  const db = await load(ctx.companyId);
  const seen = new Map<string, number>();
  return rows.slice(0, 2000).map((r, i) => {
    const supplier = String(r.supplier ?? '').trim(), category = String(r.category ?? '').trim();
    const product = String(r.product ?? '').trim(), code = String(r.code ?? '').trim() || undefined;
    const sup: any = db.supByKey.get(norm(supplier)), cat: any = db.catByKey.get(norm(category));
    const unitIn = parseUnit(r.unit);
    const price = parsePrice(r.price);
    const base: OutRow = { i, status: 'error', supplier: sup ? sup.name : supplier, supplierNew: !sup, category: cat ? cat.name : category, categoryNew: !cat,
      product, code, unit: unitIn, unitGuessed: false, price };
    const missing = [!supplier && 'proveedor', !category && 'categoría', !product && 'producto', price == null && 'precio'].filter(Boolean);
    if (missing.length) return { ...base, reason: 'Falta ' + missing.join(', ') };
    if (String(r.unit ?? '').trim() && !unitIn) return { ...base, reason: `Unidad desconocida: "${r.unit}"` };
    const key = productKey(norm(supplier), product, code);
    if (seen.has(key)) return { ...base, status: 'dup', reason: `Repetido en la planilla (fila ${seen.get(key)! + 1})` };
    seen.set(key, i);
    // already in the database?
    const mine = sup ? db.products.filter((p: any) => p.supplierId === sup.id) : [];
    const exact = (code && mine.find((p: any) => p.code && norm(p.code) === norm(code))) || mine.find((p: any) => norm(p.name) === norm(product));
    if (exact) {
      const unit = unitIn || exact.unit;
      const changes: string[] = [];
      if (Number(exact.price) !== price) changes.push('precio');
      if (unit !== exact.unit) changes.push('unidad');
      if (cat && cat.id !== exact.categoryId) changes.push('categoría');
      if (!cat) changes.push('categoría');
      if (code && norm(code) !== norm(exact.code)) changes.push('código');
      const existing = { id: exact.id, name: exact.name, price: Number(exact.price), unit: exact.unit, category: (db.catById.get(exact.categoryId) as any)?.name || '', code: exact.code || undefined };
      return { ...base, unit, existing, changes, status: changes.length ? 'update' : 'same', reason: changes.length ? undefined : 'Ya existe con el mismo precio' };
    }
    const unit = unitIn || guessUnit(category);
    const candidates = mine.filter((p: any) => similar(p.name, product)).slice(0, 3).map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price), unit: p.unit }));
    if (candidates.length) return { ...base, unit, unitGuessed: !unitIn, status: 'similar', candidates, reason: 'Se parece a un producto que ya existe' };
    return { ...base, unit, unitGuessed: !unitIn, status: 'new' };
  });
}

// decisions[i] for "similar" rows: an existing product id (update it), "new" (create) or "skip" (default).
export async function applyImport(rows: InRow[], decisions: Record<string, string>, ctx: Ctx) {
  const plan = await analyze(rows, ctx);
  const res = { created: 0, updated: 0, unchanged: 0, skipped: 0, suppliersCreated: 0, categoriesCreated: 0, problems: [] as { row: number; reason: string }[] };
  const supIds = new Map<string, string>(), catIds = new Map<string, string>();
  const ensure = async (kind: 'suppliers' | 'categories', name: string, cache: Map<string, string>) => {
    const k = norm(name);
    if (cache.has(k)) return cache.get(k)!;
    const existing: any = await findDuplicate(kind, { name }, ctx.companyId);
    let id = existing?.id;
    if (!id) { id = (await createEntity(kind, { name }, ctx)).id; if (kind === 'suppliers') res.suppliersCreated++; else res.categoriesCreated++; }
    cache.set(k, id);
    return id;
  };
  for (const r of plan) {
    const row = r.i + 1;
    try {
      if (r.status === 'error' || r.status === 'dup') { res.skipped++; res.problems.push({ row, reason: r.reason || 'Omitida' }); continue; }
      if (r.status === 'same') { res.unchanged++; continue; }
      let target = r.status === 'update' ? r.existing!.id : null;
      if (r.status === 'similar') {
        const d = decisions[String(r.i)] || 'skip';
        if (d === 'skip') { res.skipped++; res.problems.push({ row, reason: 'Posible duplicado: omitida' }); continue; }
        if (d !== 'new') { if (!r.candidates!.some((c) => c.id === d)) throw new ObraError('invalid decision'); target = d; }
      }
      const supplierId = await ensure('suppliers', r.supplier, supIds);
      const categoryId = await ensure('categories', r.category, catIds);
      if (target) {
        const body: any = { price: r.price, categoryId };
        if (r.unit && !(r.status === 'similar' && r.unitGuessed)) body.unit = r.unit;
        if (r.code) body.code = r.code;
        await updateEntity('products', target, body, ctx);
        res.updated++;
      } else {
        await createEntity('products', { supplierId, categoryId, name: r.product, unit: r.unit, price: r.price, code: r.code }, ctx);
        res.created++;
      }
    } catch (e: any) {
      // one bad row never stops the others
      res.skipped++;
      res.problems.push({ row, reason: e?.message === 'duplicate' ? 'Duplicado exacto: omitida' : 'No se pudo guardar: ' + (e?.message || 'error') });
    }
  }
  return res;
}

// Item types: "Tipo de ítem | Parte | Categoría | Mano de obra | Valor", one row per part.
export async function importItemTypes(rows: any[], ctx: Ctx) {
  if (!['admin', 'manager'].includes(ctx.role)) throw new ObraError('forbidden', 403);
  const db = await load(ctx.companyId);
  const groups = new Map<string, { name: string; parts: any[]; laborMode: string; laborRate: number; rows: number[] }>();
  const res = { created: 0, skipped: 0, categoriesCreated: 0, problems: [] as { row: number; reason: string }[] };
  rows.slice(0, 2000).forEach((r, i) => {
    const name = String(r.type ?? '').trim();
    if (!name) { res.problems.push({ row: i + 1, reason: 'Falta el tipo de ítem' }); return; }
    const k = norm(name);
    if (!groups.has(k)) groups.set(k, { name, parts: [], laborMode: 'item', laborRate: 0, rows: [] });
    const g = groups.get(k)!;
    g.rows.push(i + 1);
    if (String(r.part ?? '').trim()) g.parts.push({ label: String(r.part).trim(), category: String(r.category ?? '').trim() });
    const mode = norm(r.laborMode);
    if (mode.includes('m2') || mode.includes('metro')) g.laborMode = 'm2';
    const rate = parsePrice(r.laborRate);
    if (rate) g.laborRate = rate;
  });
  for (const g of groups.values()) {
    try {
      if (await findDuplicate('itemtypes', { name: g.name }, ctx.companyId)) { res.skipped++; res.problems.push({ row: g.rows[0], reason: `"${g.name}" ya existe: omitido` }); continue; }
      const parts = [];
      for (const p of g.parts) {
        let cat: any = p.category ? db.catByKey.get(norm(p.category)) : null;
        if (p.category && !cat) { cat = await createEntity('categories', { name: p.category }, ctx); db.catByKey.set(norm(p.category), cat); res.categoriesCreated++; }
        parts.push({ label: p.label, categoryId: cat ? cat.id : null });
      }
      await createEntity('itemtypes', { name: g.name, parts, laborMode: g.laborMode, laborRate: g.laborRate }, ctx);
      res.created++;
    } catch (e: any) {
      res.skipped++; res.problems.push({ row: g.rows[0], reason: e?.message === 'duplicate' ? `"${g.name}" ya existe: omitido` : 'No se pudo guardar' });
    }
  }
  return res;
}
