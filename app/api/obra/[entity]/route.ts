import { json } from '@/lib/api';
import { createEntity } from '@/lib/obra';
import { obraCtx, obraErr, publicRow } from '@/lib/obra-api';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { entity: string } }) {
  const b = await req.json().catch(() => ({}));
  const { ctx, err } = await obraCtx(b.companyId);
  if (err) return err;
  try { return json({ ok: true, row: publicRow(params.entity, await createEntity(params.entity, b, ctx!), ctx!) }); } catch (e) { return obraErr(e); }
}
