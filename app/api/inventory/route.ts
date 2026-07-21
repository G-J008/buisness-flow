import { requireSession, unauthorized, forbidden, bad, json, canManageMoney, resolveCompanyId } from '@/lib/api';
import { createInventory } from '@/lib/store';

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
  const item = await createInventory({
    companyId,
    brand,
    model,
    sku: String(b.sku || '').trim() || brand.slice(0, 2).toUpperCase() + '-' + Date.now().toString().slice(-5),
    purchaseUSD,
    fxRate,
    purchasePYG: Math.round(purchaseUSD * fxRate),
    sellPrice,
    status: String(b.status || 'Available'),
    purchaseDate: String(b.purchaseDate || new Date().toISOString().slice(0, 10)),
  });
  return json({ ok: true, item });
}
