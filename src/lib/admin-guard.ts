import type { NextRequest } from "next/server";

export function requireAdmin(req: NextRequest) {
  const expected = process.env.JOPPA_ADMIN_TOKEN;
  if (!expected) return { ok: true as const };

  const got = req.headers.get("x-joppa-admin") ?? "";
  if (got && timingSafeEqual(got, expected)) return { ok: true as const };
  return { ok: false as const, status: 401, message: "Unauthorized" };
}

function timingSafeEqual(a: string, b: string) {
  // Avoid leaking length timing.
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < aa.length; i++) out |= aa[i] ^ bb[i];
  return out === 0;
}

