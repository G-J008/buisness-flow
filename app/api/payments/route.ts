import { requireSession, unauthorized, forbidden, bad, json, resolveCompanyId, actorOf, linkOf } from '@/lib/api';
import { checkLink, linkMoney } from '@/lib/cajas';
import { getClient, createPayment, clientOutstanding } from '@/lib/store';

export const runtime = 'nodejs';

// Records a payment made by a client. It only reduces the client's credit balance;
// the revenue was already recorded when the credit sale was logged.
export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const companyId = await resolveCompanyId(s, b.companyId);
  if (!companyId) return bad('no company');
  const client = await getClient(String(b.clientId || ''));
  if (!client || client.companyId !== companyId) return bad('invalid client');
  if (s.role === 'sales' && client.agentId !== s.uid) return forbidden();
  const amount = Math.round(Number(b.amount) || 0);
  if (amount <= 0) return bad('amount required');
  const outstanding = await clientOutstanding(client.id);
  if (amount > Math.round(outstanding)) return bad('payment exceeds credit balance');
  const link = linkOf(b);
  try { await checkLink(companyId, link); } catch (e: any) { return bad(e.message); }
  const payment = await createPayment({
    companyId,
    clientId: client.id,
    agentId: s.uid,
    amount,
    date: String(b.date || new Date().toISOString().slice(0, 10)),
    note: String(b.note || '').trim() || null,
  });
  await linkMoney(companyId, link, { pyg: amount, direction: 'in', refType: 'payment', refId: payment.id, date: payment.date, description: 'Pago de ' + (client.name || 'cliente') }, await actorOf(s));
  return json({ ok: true, payment });
}
