import { q } from './db';
import { hashPw } from './auth';

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

let adminEnsured = false;
export async function ensureAdmin() {
  if (adminEnsured) return;
  const { rows } = await q('SELECT COUNT(*) AS n FROM app_user');
  if (Number(rows[0]?.n || 0) === 0) {
    await q(
      'INSERT INTO app_user (id, username, "passwordHash", role, name, "companyId") VALUES ($1,$2,$3,$4,$5,$6)',
      [genId(), process.env.ADMIN_USERNAME || 'AdminJoo', await hashPw(process.env.ADMIN_PASSWORD || 'Admin08082005'), 'admin', 'Admin', null]
    );
  }
  adminEnsured = true;
}

/* ---------- companies ---------- */
export async function listCompanies() {
  return (await q('SELECT * FROM company ORDER BY "createdAt" ASC')).rows;
}
export async function getCompany(id: string) {
  return (await q('SELECT * FROM company WHERE id=$1', [id])).rows[0] || null;
}
export async function firstCompany() {
  return (await q('SELECT * FROM company ORDER BY "createdAt" ASC LIMIT 1')).rows[0] || null;
}
export async function createCompany(name: string, productType: string) {
  const id = genId();
  await q('INSERT INTO company (id, name, "productType") VALUES ($1,$2,$3)', [id, name, productType]);
  return getCompany(id);
}
export async function updateCompany(id: string, f: { name?: string; productType?: string; logo?: string }) {
  const sets: string[] = [];
  const vals: any[] = [];
  if (f.name !== undefined) { vals.push(f.name); sets.push(`name=$${vals.length}`); }
  if (f.productType !== undefined) { vals.push(f.productType); sets.push(`"productType"=$${vals.length}`); }
  if (f.logo !== undefined) { vals.push(f.logo); sets.push(`logo=$${vals.length}`); }
  if (!sets.length) return getCompany(id);
  vals.push(id);
  await q(`UPDATE company SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals);
  return getCompany(id);
}

/* ---------- users ---------- */
export async function listAllUsers() {
  return (await q('SELECT * FROM app_user ORDER BY "createdAt" ASC')).rows;
}
export async function listUsersByCompany(companyId: string) {
  return (await q('SELECT * FROM app_user WHERE "companyId"=$1 ORDER BY "createdAt" ASC', [companyId])).rows;
}
export async function findUserByUsername(username: string) {
  return (await q('SELECT * FROM app_user WHERE username=$1', [username])).rows[0] || null;
}
export async function getUser(id: string) {
  return (await q('SELECT * FROM app_user WHERE id=$1', [id])).rows[0] || null;
}
export async function countAdmins() {
  const { rows } = await q(`SELECT COUNT(*) AS n FROM app_user WHERE role='admin'`);
  return Number(rows[0]?.n || 0);
}
export async function createUser(u: { name: string; username: string; passwordHash: string; role: string; companyId: string | null }) {
  const id = genId();
  await q(
    'INSERT INTO app_user (id, username, "passwordHash", role, name, "companyId") VALUES ($1,$2,$3,$4,$5,$6)',
    [id, u.username, u.passwordHash, u.role, u.name, u.companyId]
  );
  return getUser(id);
}
export async function deleteUser(id: string) {
  await q('DELETE FROM app_user WHERE id=$1', [id]);
}
export async function updateProfile(id: string, f: { name?: string; avatar?: string }) {
  const sets: string[] = [];
  const vals: any[] = [];
  if (f.name !== undefined) { vals.push(f.name); sets.push(`name=$${vals.length}`); }
  if (f.avatar !== undefined) { vals.push(f.avatar); sets.push(`avatar=$${vals.length}`); }
  if (sets.length) { vals.push(id); await q(`UPDATE app_user SET ${sets.join(', ')} WHERE id=$${vals.length}`, vals); }
  return getUser(id);
}

/* ---------- inventory ---------- */
export async function listInventory(companyId: string) {
  return (await q('SELECT * FROM inventory WHERE "companyId"=$1', [companyId])).rows;
}
export async function getInventory(id: string) {
  return (await q('SELECT * FROM inventory WHERE id=$1', [id])).rows[0] || null;
}
export async function createInventory(d: any) {
  const id = genId();
  await q(
    `INSERT INTO inventory (id,"companyId",brand,model,sku,"purchaseUSD","fxRate","purchasePYG","sellPrice",status,"purchaseDate")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, d.companyId, d.brand, d.model, d.sku, d.purchaseUSD, d.fxRate, d.purchasePYG, d.sellPrice, d.status, d.purchaseDate]
  );
  // The purchase cost is recorded once, automatically, as an expense in the business flow.
  if (Number(d.purchasePYG) > 0) {
    await createExpense({
      companyId: d.companyId,
      date: d.purchaseDate,
      amount: Number(d.purchasePYG),
      category: 'Inventory Purchase',
      description: `${d.brand} ${d.model} (${d.sku})`,
      inventoryId: id,
    });
  }
  return getInventory(id);
}
export async function deleteInventory(id: string) {
  // Only the expense created automatically for this item is removed with it.
  await q('DELETE FROM expense WHERE "inventoryId"=$1', [id]);
  await q('DELETE FROM inventory WHERE id=$1', [id]);
}
export async function setInventoryStatus(id: string, status: string) {
  await q('UPDATE inventory SET status=$1 WHERE id=$2', [status, id]);
}

/* ---------- clients ---------- */
export async function listClients(companyId: string, agentId?: string) {
  if (agentId) return (await q('SELECT * FROM client WHERE "companyId"=$1 AND "agentId"=$2', [companyId, agentId])).rows;
  return (await q('SELECT * FROM client WHERE "companyId"=$1', [companyId])).rows;
}
export async function createClient(d: any) {
  const id = genId();
  await q('INSERT INTO client (id,"companyId","agentId",name,phone,email) VALUES ($1,$2,$3,$4,$5,$6)', [id, d.companyId, d.agentId, d.name, d.phone, d.email]);
  return (await q('SELECT * FROM client WHERE id=$1', [id])).rows[0];
}

/* ---------- sales / revenues ---------- */
export async function listSales(companyId: string, agentId?: string) {
  if (agentId) return (await q('SELECT * FROM sale WHERE "companyId"=$1 AND "agentId"=$2', [companyId, agentId])).rows;
  return (await q('SELECT * FROM sale WHERE "companyId"=$1', [companyId])).rows;
}
export async function getSale(id: string) {
  return (await q('SELECT * FROM sale WHERE id=$1', [id])).rows[0] || null;
}
export async function createSaleWithRevenue(d: any, inv: any) {
  const saleId = genId();
  await q(
    `INSERT INTO sale (id,"companyId","agentId","inventoryId",brand,model,price,delivery,"clientId",payment,date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [saleId, d.companyId, d.agentId, inv.id, inv.brand, inv.model, d.price, d.delivery, d.clientId, d.payment, d.date]
  );
  await q(
    `INSERT INTO revenue (id,"companyId",date,amount,category,description,"saleId",brand,model,delivery,"agentId","clientId",payment)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [genId(), d.companyId, d.date, d.price, 'Product Sales', `${inv.brand} ${inv.model}`, saleId, inv.brand, inv.model, d.delivery, d.agentId, d.clientId, d.payment]
  );
  await setInventoryStatus(inv.id, 'Sold');
  return getSale(saleId);
}
export async function deleteSaleCascade(sale: any) {
  await q('DELETE FROM revenue WHERE "saleId"=$1', [sale.id]);
  if (sale.inventoryId) await setInventoryStatus(sale.inventoryId, 'Available');
  await q('DELETE FROM sale WHERE id=$1', [sale.id]);
}
export async function listRevenues(companyId: string, agentId?: string) {
  if (agentId) return (await q('SELECT * FROM revenue WHERE "companyId"=$1 AND "agentId"=$2', [companyId, agentId])).rows;
  return (await q('SELECT * FROM revenue WHERE "companyId"=$1', [companyId])).rows;
}
export async function getRevenue(id: string) {
  return (await q('SELECT * FROM revenue WHERE id=$1', [id])).rows[0] || null;
}
export async function createRevenue(d: any) {
  const id = genId();
  await q('INSERT INTO revenue (id,"companyId",date,amount,category,description) VALUES ($1,$2,$3,$4,$5,$6)', [id, d.companyId, d.date, d.amount, d.category, d.description]);
  return getRevenue(id);
}
export async function deleteRevenue(id: string) {
  await q('DELETE FROM revenue WHERE id=$1', [id]);
}

/* ---------- expenses ---------- */
export async function listExpenses(companyId: string) {
  return (await q('SELECT * FROM expense WHERE "companyId"=$1', [companyId])).rows;
}
export async function getExpense(id: string) {
  return (await q('SELECT * FROM expense WHERE id=$1', [id])).rows[0] || null;
}
export async function createExpense(d: any) {
  const id = genId();
  await q('INSERT INTO expense (id,"companyId",date,amount,category,description,"inventoryId") VALUES ($1,$2,$3,$4,$5,$6,$7)', [id, d.companyId, d.date, d.amount, d.category, d.description, d.inventoryId || null]);
  return getExpense(id);
}
export async function deleteExpense(id: string) {
  await q('DELETE FROM expense WHERE id=$1', [id]);
}

/* ---------- client payments (affect only the client's credit balance) ---------- */
export async function getClient(id: string) {
  return (await q('SELECT * FROM client WHERE id=$1', [id])).rows[0] || null;
}
export async function listPayments(companyId: string, agentId?: string) {
  if (agentId) {
    return (await q(
      'SELECT p.* FROM client_payment p JOIN client c ON c.id=p."clientId" WHERE p."companyId"=$1 AND c."agentId"=$2',
      [companyId, agentId]
    )).rows;
  }
  return (await q('SELECT * FROM client_payment WHERE "companyId"=$1', [companyId])).rows;
}
export async function getPayment(id: string) {
  return (await q('SELECT * FROM client_payment WHERE id=$1', [id])).rows[0] || null;
}
export async function clientOutstanding(clientId: string) {
  const credit = (await q(`SELECT COALESCE(SUM(price),0) AS t FROM sale WHERE "clientId"=$1 AND payment='Credit'`, [clientId])).rows[0];
  const paid = (await q('SELECT COALESCE(SUM(amount),0) AS t FROM client_payment WHERE "clientId"=$1', [clientId])).rows[0];
  return Number(credit?.t || 0) - Number(paid?.t || 0);
}
export async function createPayment(d: any) {
  const id = genId();
  await q(
    'INSERT INTO client_payment (id,"companyId","clientId","agentId",amount,date,note) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [id, d.companyId, d.clientId, d.agentId, d.amount, d.date, d.note]
  );
  return getPayment(id);
}
export async function deletePayment(id: string) {
  await q('DELETE FROM client_payment WHERE id=$1', [id]);
}
