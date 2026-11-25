import { json } from '@/lib/api';
import { analyze, applyImport, importItemTypes } from '@/lib/obra-import';
import { obraCtx, obraErr } from '@/lib/obra-api';

export const runtime = 'nodejs';
export const maxDuration = 120;

// { kind: 'products', rows, dryRun: true }  → preview of each row
// { kind: 'products', rows, decisions }     → saves row by row; problems are reported, never fatal
// { kind: 'itemtypes', rows }               → item types, one row per part
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const { ctx, err } = await obraCtx(b.companyId);
  if (err) return err;
  const rows = Array.isArray(b.rows) ? b.rows : [];
  try {
    if (b.kind === 'itemtypes') return json({ ok: true, result: await importItemTypes(rows, ctx!) });
    if (b.dryRun) return json({ ok: true, preview: await analyze(rows, ctx!) });
    return json({ ok: true, result: await applyImport(rows, b.decisions || {}, ctx!) });
  } catch (e) { return obraErr(e); }
}
