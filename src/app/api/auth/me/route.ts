import { NextRequest, NextResponse } from "next/server";

import { getDbOrThrow } from "@/lib/supabase-db";
import { requireUser } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const db = getDbOrThrow();
  const { data } = await db
    .from("profiles")
    .select("role")
    .eq("user_id", guard.userId)
    .single();

  return NextResponse.json(
    { userId: guard.userId, role: data?.role ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

