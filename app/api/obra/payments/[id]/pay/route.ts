import { json, linkOf } from '@/lib/api';
import { payPayment, unpayPayment } from '@/lib/obra';
import { obraCtx, obraErr } from '@/lib/obra-api';

export const runtime = 'nodejs';

// Marks a calendar payment as paid; the money enters or leaves the caja picked.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json().catch(() => ({}));
  const { ctx, err } = await obraCtx(b.companyId);
  if (err) return err;
  try { return json({ ok: true, row: await payPayment(params.id, linkOf(b), String(b.paidAt || ''), ctx!) }); } catch (e) { return obraErr(e); }
}

// Back to pending: the caja movement is removed (and logged).
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { ctx, err } = await obraCtx(new URL(req.url).searchParams.get('companyId') || undefined);
  if (err) return err;
  try { return json({ ok: true, row: await unpayPayment(params.id, ctx!) }); } catch (e) { return obraErr(e); }
}
