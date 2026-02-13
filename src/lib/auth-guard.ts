import type { NextRequest } from "next/server";

import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase-admin";

type GuardOk = { ok: true; userId: string };
type GuardFail = { ok: false; status: number; message: string };

type TokenCacheEntry = { userId: string; exp: number };
type RoleCacheEntry = { role: string; exp: number };

const TOKEN_TTL_MS = 60_000;
const ROLE_TTL_MS = 60_000;

const tokenCache = new Map<string, TokenCacheEntry>();
const roleCache = new Map<string, RoleCacheEntry>();

function getBearerToken(req: NextRequest) {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? "";
}

async function getUserIdFromAccessToken(accessToken: string, db: ReturnType<typeof getSupabaseAdmin>) {
  const cached = tokenCache.get(accessToken);
  const now = Date.now();
  if (cached && cached.exp > now) return cached.userId;

  if (!db) return null;
  const { data, error } = await db.auth.getUser(accessToken);
  if (error || !data.user?.id) return null;

  const userId = data.user.id;
  tokenCache.set(accessToken, { userId, exp: now + TOKEN_TTL_MS });
  return userId;
}

export async function requireEmployer(req: NextRequest): Promise<GuardOk | GuardFail> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, status: 500, message: "Supabase is not configured" };
  }
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, status: 500, message: "Supabase admin client missing" };

  const accessToken = getBearerToken(req);
  if (!accessToken) return { ok: false, status: 401, message: "Missing Authorization Bearer token" };

  const userId = await getUserIdFromAccessToken(accessToken, db);
  if (!userId) return { ok: false, status: 401, message: "Invalid session" };

  const now = Date.now();
  const roleCached = roleCache.get(userId);
  let role: string | null = roleCached && roleCached.exp > now ? roleCached.role : null;

  if (!role) {
    const { data, error } = await db
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .single();
    if (error) return { ok: false, status: 403, message: "No profile/role found" };
    role = data.role ?? null;
    if (role) roleCache.set(userId, { role, exp: now + ROLE_TTL_MS });
  }

  if (role !== "employer") return { ok: false, status: 403, message: "Employer access required" };

  return { ok: true, userId };
}

export async function requireUser(req: NextRequest): Promise<GuardOk | GuardFail> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, status: 500, message: "Supabase is not configured" };
  }
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, status: 500, message: "Supabase admin client missing" };
  const accessToken = getBearerToken(req);
  if (!accessToken) return { ok: false, status: 401, message: "Missing Authorization Bearer token" };
  const userId = await getUserIdFromAccessToken(accessToken, db);
  if (!userId) return { ok: false, status: 401, message: "Invalid session" };
  return { ok: true, userId };
}

