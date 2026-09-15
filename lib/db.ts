// Schema changes are additive only (CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS),
// so existing business data is never dropped or rewritten.
// Pure-JS PostgreSQL access. Works with Neon (via `pg`) in production and an
// in-memory Postgres (`pg-mem`) for local testing when USE_PGMEM=1 is set.
type AnyPool = { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> };

const g = globalThis as any;
let schemaReady = false;

async function makePool(): Promise<AnyPool> {
  if (process.env.USE_PGMEM) {
    const { newDb } = await import('pg-mem');
    const mem = newDb();
    const pgAdapter = mem.adapters.createPg();
    return new pgAdapter.Pool();
  }
  const pg = await import('pg');
  const ssl = process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false };
  return new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl });
}

const DDL = `
CREATE TABLE IF NOT EXISTS company (id TEXT PRIMARY KEY, name TEXT NOT NULL, "productType" TEXT NOT NULL DEFAULT 'Item', logo TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS app_user (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, "passwordHash" TEXT NOT NULL, role TEXT NOT NULL, name TEXT NOT NULL, avatar TEXT, "companyId" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, brand TEXT, model TEXT, sku TEXT, "purchaseUSD" DOUBLE PRECISION DEFAULT 0, "fxRate" DOUBLE PRECISION DEFAULT 0, "purchasePYG" DOUBLE PRECISION DEFAULT 0, "sellPrice" DOUBLE PRECISION DEFAULT 0, status TEXT DEFAULT 'Available', "purchaseDate" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS client (id TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "agentId" TEXT, name TEXT, phone TEXT, email TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sale (id TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "agentId" TEXT, "inventoryId" TEXT, brand TEXT, model TEXT, price DOUBLE PRECISION, delivery TEXT, "clientId" TEXT, payment TEXT, date TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS expense (id TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, date TEXT, amount DOUBLE PRECISION, category TEXT, description TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS revenue (id TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, date TEXT, amount DOUBLE PRECISION, category TEXT, description TEXT, "saleId" TEXT, brand TEXT, model TEXT, delivery TEXT, "agentId" TEXT, "clientId" TEXT, payment TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS client_payment (id TEXT PRIMARY KEY, "companyId" TEXT NOT NULL, "clientId" TEXT NOT NULL, "agentId" TEXT, amount DOUBLE PRECISION NOT NULL DEFAULT 0, date TEXT, note TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE expense ADD COLUMN IF NOT EXISTS "inventoryId" TEXT;
`;

async function ensureSchema(pool: AnyPool) {
  if (schemaReady) return;
  for (const stmt of DDL.split(';').map((x) => x.trim()).filter(Boolean)) {
    await pool.query(stmt);
  }
  schemaReady = true;
}

export async function getPool(): Promise<AnyPool> {
  if (g.__bfPool) return g.__bfPool;
  const pool = await makePool();
  await ensureSchema(pool);
  g.__bfPool = pool;
  return pool;
}

export async function q(text: string, params: any[] = []): Promise<{ rows: any[] }> {
  const pool = await getPool();
  return pool.query(text, params);
}
