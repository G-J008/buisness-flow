import { requireSession, unauthorized, bad, json, resolveCompanyId } from '@/lib/api';
import { createClient } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const companyId = await resolveCompanyId(s, b.companyId);
  if (!companyId) return bad('no company');
  const name = String(b.name || '').trim();
  if (!name) return bad('name required');
  const agentId = s.role === 'sales' ? s.uid : String(b.agentId || '') || s.uid;
  const client = await createClient({
    companyId,
    agentId,
    name,
    phone: String(b.phone || '').trim() || null,
    email: String(b.email || '').trim() || null,
  });
  return json({ ok: true, client });
}
