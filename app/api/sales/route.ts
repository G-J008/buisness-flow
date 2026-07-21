import { requireSession, unauthorized, bad, json, resolveCompanyId } from '@/lib/api';
import { getInventory, createSaleWithRevenue } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const companyId = await resolveCompanyId(s, b.companyId);
  if (!companyId) return bad('no company');

  const inv = await getInventory(String(b.inventoryId || ''));
  if (!inv || inv.companyId !== companyId) return bad('invalid item');
  if (inv.status === 'Sold') return bad('item already sold');

  const price = Number(b.price) || 0;
  if (price <= 0) return bad('price required');
  const agentId = s.role === 'sales' ? s.uid : String(b.agentId || '') || s.uid;

  const sale = await createSaleWithRevenue(
    {
      companyId,
      agentId,
      price,
      delivery: String(b.delivery || 'Local pickup'),
      clientId: String(b.clientId || '') || null,
      payment: String(b.payment || 'Cash'),
      date: String(b.date || new Date().toISOString().slice(0, 10)),
    },
    inv
  );
  return json({ ok: true, sale });
}
