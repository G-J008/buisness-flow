import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId, actorOf, linkOf } from '@/lib/api';
import { createInventory, listExpenses } from '@/lib/store';
import { checkLink, linkMoney } from '@/lib/cajas';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return unauthorized();
  if (!canManageMoney(s)) return forbidden();
  const b = await req.json().catch(() => ({}));
  const companyId = await resolveCompanyId(s, b.companyId);
  if (!companyId) return bad('no company');
  const brand = String(b.brand || '').trim();
  const model = String(b.model || '').trim();
  if (!brand || !model) return bad('brand & model required');
  const purchaseUSD = Number(b.purchaseUSD) || 0;
  const fxRate = Number(b.fxRate) || 0;
  const sellPrice = Number(b.sellPrice) || 0;
  const quantity = Math.floor(Number(b.quantity ?? 1));
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100000) return bad('quantity required');
  // The purchase leaves the caja picked in the form. A USD caja is charged the USD price, at the item's own rate.
  const link = linkOf(b);
  if (link.cajaId && !(Number(link.fxRate) > 0)) link.fxRate = fxRate;
  try { await checkLink(companyId, link); } catch (e: any) { return bad(e.message); }
  const item = await createInventory({
    companyId,
    brand,
    model,
    sku: String(b.sku || '').trim() || brand.slice(0, 2).toUpperCase() + '-' + Date.now().toString().slice(-5),
    purchaseUSD,
    fxRate,
    purchasePYG: Math.round(purchaseUSD * fxRate),
    sellPrice,
    quantity,
    status: String(b.status || 'Available'),
    purchaseDate: String(b.purchaseDate || new Date().toISOString().slice(0, 10)),
  });
  const exp = (await listExpenses(companyId)).find((e: any) => e.inventoryId === item.id);
  if (exp) {
    await linkMoney(companyId, link, { pyg: Number(exp.amount) || 0, usd: purchaseUSD * quantity, direction: 'out', refType: 'expense', refId: exp.id, date: exp.date, description: exp.description || '' }, await actorOf(s));
  }
  return json({ ok: true, item });
}
