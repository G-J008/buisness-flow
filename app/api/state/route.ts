import { ensureAdmin, getUser, listCompanies, listAllUsers, listUsersByCompany, listInventory, listClients, listSales, listRevenues, listExpenses, listPayments } from '@/lib/store';
import { requireSession, resolveCompanyId, unauthorized, json, pubUser } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  await ensureAdmin();
  const s = await requireSession();
  if (!s) return unauthorized();
  const me = await getUser(s.uid);
  if (!me) return unauthorized();

  const requested = new URL(req.url).searchParams.get('companyId');
  const companies =
    s.role === 'admin' ? await listCompanies() : me.companyId ? (await listCompanies()).filter((c: any) => c.id === me.companyId) : [];
  const activeCompanyId = await resolveCompanyId(s, requested);

  let users: any[] = [];
  let inventory: any[] = [];
  let clients: any[] = [];
  let sales: any[] = [];
  let expenses: any[] = [];
  let revenues: any[] = [];
  let payments: any[] = [];

  if (s.role === 'admin') users = await listAllUsers();
  else if (activeCompanyId) users = await listUsersByCompany(activeCompanyId);

  if (activeCompanyId) {
    inventory = await listInventory(activeCompanyId);
    if (s.role === 'sales') {
      clients = await listClients(activeCompanyId, s.uid);
      sales = await listSales(activeCompanyId, s.uid);
      revenues = await listRevenues(activeCompanyId, s.uid);
      payments = await listPayments(activeCompanyId, s.uid);
      expenses = [];
    } else {
      clients = await listClients(activeCompanyId);
      sales = await listSales(activeCompanyId);
      revenues = await listRevenues(activeCompanyId);
      payments = await listPayments(activeCompanyId);
      expenses = await listExpenses(activeCompanyId);
    }
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
  });
}
