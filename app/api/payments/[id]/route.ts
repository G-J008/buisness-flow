import { requireSession, unauthorized, forbidden, bad, json, resolveCompanyId } from '@/lib/api';
import { getPayment, deletePayment, getClient } from '@/lib/store';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if (!s) return unauthorized();
  const p = await getPayment(params.id);
  if (!p) return bad('not found');
  const companyId = await resolveCompanyId(s, p.companyId);
  if (companyId !== p.companyId) return forbidden();
  if (s.role === 'sales') {
    const c = await getClient(p.clientId);
    if (!c || c.agentId !== s.uid) return forbidden();
  }
  await deletePayment(p.id);
  return json({ ok: true });
}
