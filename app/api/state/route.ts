import { ensureAdmin, getUser, listCompanies, listAllUsers, listUsersByCompany, listInventory, listClients, listSales, listRevenues, listExpenses, listPayments } from '@/lib/store';
import { requireSession, resolveCompanyId, unauthorized, json, pubUser } from '@/lib/api';
import { ensureDefaultCajas, listCajas, listMovs, listLog } from '@/lib/cajas';
import { obraState } from '@/lib/obra';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  await ensureAdmin();
  const s = await requireSession();
  if (!s) return unauthorized();
  const me = await getUser(s.uid);
  if (!me) return unauthorized();

  const requested = new URL(req.url).searchParams.get('companyId');
  let companies =
    s.role === 'admin' ? await listCompanies() : me.companyId ? (await listCompanies()).filter((c: any) => c.id === me.companyId) : [];
  // the construction margin is not for sales agents
  if (s.role === 'sales') companies = companies.map(({ defaultMargin, ...rest }: any) => rest);
  const activeCompanyId = await resolveCompanyId(s, requested);

  let users: any[] = [];
  let inventory: any[] = [];
  let clients: any[] = [];
  let sales: any[] = [];
  let expenses: any[] = [];
  let revenues: any[] = [];
  let payments: any[] = [];
  let cajas: any[] = [];
  let cajaMovs: any[] = [];
  let cajaLog: any[] = [];
  let obra: any = null;

  if (s.role === 'admin') users = await listAllUsers();
  else if (activeCompanyId) users = await listUsersByCompany(activeCompanyId);

  if (activeCompanyId) {
    await ensureDefaultCajas(activeCompanyId);
    cajas = await listCajas(activeCompanyId);
    inventory = await listInventory(activeCompanyId);
    if (s.role === 'sales') {
      clients = await listClients(activeCompanyId, s.uid);
      sales = await listSales(activeCompanyId, s.uid);
      revenues = await listRevenues(activeCompanyId, s.uid);
      payments = await listPayments(activeCompanyId, s.uid);
      expenses = [];
      // Sales agents never receive purchase costs or margins.
      inventory = inventory.map(({ purchaseUSD, fxRate, purchasePYG, ...rest }: any) => rest);
      sales = sales.map(({ unitCost, ...rest }: any) => rest);
      // Sales agents only need the caja names to say where a cash sale or a payment went.
      cajas = cajas.map(({ id, name, currency, kind }: any) => ({ id, name, currency, kind }));
    } else {
      clients = await listClients(activeCompanyId);
      sales = await listSales(activeCompanyId);
      revenues = await listRevenues(activeCompanyId);
      payments = await listPayments(activeCompanyId);
      expenses = await listExpenses(activeCompanyId);
      cajaMovs = await listMovs(activeCompanyId);
      cajaLog = await listLog(activeCompanyId);
    }
    const active = companies.find((c: any) => c.id === activeCompanyId);
    if (active && active.kind === 'construction') obra = await obraState(activeCompanyId, s.role as any, s.uid);
  }

  return json({
    me: pubUser(me),
    activeCompanyId,
    companies,
    users: users.map(pubUser),
    inventory,
    clients,
    sales,
    expenses,
    revenues,
    payments,
    cajas,
    cajaMovs,
    cajaLog,
    obra,
  });
}
