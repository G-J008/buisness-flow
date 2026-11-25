import { requireSession, unauthorized, bad, json, pubUser } from '@/lib/api';
import { updateProfile, getUser, setPassword } from '@/lib/store';
import { hashPw, verifyPw } from '@/lib/auth';

export const runtime = 'nodejs';

export async function PATCH(req: Request) {
  const s = await requireSession();
  if (!s) return unauthorized();
  const b = await req.json().catch(() => ({}));
  // Password change: the current password is required.
  if (b.newPassword !== undefined) {
    const np = String(b.newPassword || '');
    if (np.length < 8) return bad('password too short');
    const me = await getUser(s.uid);
    if (!me || !(await verifyPw(String(b.currentPassword || ''), me.passwordHash))) return bad('current password is incorrect');
    await setPassword(s.uid, await hashPw(np));
    return json({ ok: true });
  }
  const f: any = {};
  if (typeof b.name === 'string' && b.name.trim()) f.name = b.name.trim();
  if (typeof b.avatar === 'string') f.avatar = b.avatar;
  const u = await updateProfile(s.uid, f);
  return json({ ok: true, user: pubUser(u) });
}
