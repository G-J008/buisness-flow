import { requireSession, unauthorized, bad, json, resolveCompanyId, actorOf, linkOf } from '@/lib/api';
import { checkLink, linkMoney } from '@/lib/cajas';
import { getInventory, createSaleWithRevenue, soldUnits } from '@/lib/store';

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

  // `price` is the price of ONE unit; the sale total is price x quantity.
  const unitPrice = Number(b.unitPrice ?? b.price) || 0;
  if (unitPrice <= 0) return bad('price required');
  const quantity = Math.floor(Number(b.quantity ?? 1));
  if (!Number.isFinite(quantity) || quantity < 1) return bad('quantity required');
  const left = (Number(inv.quantity) || 1) - (await soldUnits(inv.id));
  if (quantity > left) return bad('not enough stock');
  const agentId = s.role === 'sales' ? s.uid : String(b.agentId || '') || s.uid;
  const payment = String(b.payment || 'Cash');
  // A cash sale puts the money in the caja picked in the form; a credit sale only when the client pays.
  const link = payment === 'Cash' ? linkOf(b) : { cajaId: null, fxRate: null };
  try { await checkLink(companyId, link); } catch (e: any) { return bad(e.message); }

  const sale = await createSaleWithRevenue(
    {
      companyId,
      agentId,
      unitPrice,
      quantity,
      delivery: String(b.delivery || 'Local pickup'),
      clientId: String(b.clientId || '') || null,
      payment,
      date: String(b.date || new Date().toISOString().slice(0, 10)),
    },
    inv
  );
  await linkMoney(companyId, link, { pyg: Number(sale.price) || 0, direction: 'in', refType: 'sale', refId: sale.id, date: sale.date, description: `${inv.brand} ${inv.model}${quantity > 1 ? ' x' + quantity : ''}` }, await actorOf(s));
  return json({ ok: true, sale });
}
