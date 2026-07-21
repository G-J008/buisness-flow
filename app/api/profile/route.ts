import { requireSession, unauthorized, json, pubUser } from '@/lib/api';
import { updateProfile } from '@/lib/store';

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  const s = await requireSession();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const f: any = {};
  if (typeof b.name === 'string' && b.name.trim()) f.name = b.name.trim();
  if (typeof b.avatar === 'string') f.avatar = b.avatar;
  const u = await updateProfile(s.uid, f);
  return json({ ok: true, user: pubUser(u) });
}
