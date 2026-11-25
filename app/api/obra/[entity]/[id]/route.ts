import { json } from '@/lib/api';
import { updateEntity, deleteEntity } from '@/lib/obra';
import { obraCtx, obraErr, publicRow } from '@/lib/obra-api';

export const runtime = 'nodejs';

export async function PATCH(req: Request, { params }: { params: { entity: string; id: string } }) {
  const b = await req.json().catch(() => ({}));
  const { ctx, err } = await obraCtx(b.companyId);
  if (err) return err;
  try { return json({ ok: true, row: publicRow(params.entity, await updateEntity(params.entity, params.id, b, ctx!), ctx!) }); } catch (e) { return obraErr(e); }
}

export async function DELETE(req: Request, { params }: { params: { entity: string; id: string } }) {
  const { ctx, err } = await obraCtx(new URL(req.url).searchParams.get('companyId') || undefined);
  if (err) return err;
  try { await deleteEntity(params.entity, params.id, ctx!); return json({ ok: true }); } catch (e) { return obraErr(e); }
}
