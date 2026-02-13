import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase-admin";

type GuardOk = { ok: true; userId: string };
type GuardFail = { ok: false; status: number; message: string };

function getBearerToken(req: NextRequest) {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? "";
}

async function getUserIdFromAccessToken(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) return null;
  return data.user?.id ?? null;
}

export async function requireEmployer(req: NextRequest): Promise<GuardOk | GuardFail> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, status: 500, message: "Supabase is not configured" };
  }
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, status: 500, message: "Supabase admin client missing" };

  const accessToken = getBearerToken(req);
  if (!accessToken) return { ok: false, status: 401, message: "Missing Authorization Bearer token" };

  const userId = await getUserIdFromAccessToken(accessToken);
  if (!userId) return { ok: false, status: 401, message: "Invalid session" };

  const { data, error } = await db
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .single();

  if (error) return { ok: false, status: 403, message: "No profile/role found" };
  if (data.role !== "employer") return { ok: false, status: 403, message: "Employer access required" };

  return { ok: true, userId };
}

export async function requireUser(req: NextRequest): Promise<GuardOk | GuardFail> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, status: 500, message: "Supabase is not configured" };
  }
  const accessToken = getBearerToken(req);
  if (!accessToken) return { ok: false, status: 401, message: "Missing Authorization Bearer token" };
  const userId = await getUserIdFromAccessToken(accessToken);
  if (!userId) return { ok: false, status: 401, message: "Invalid session" };
  return { ok: true, userId };
}

