import { NextRequest, NextResponse } from "next/server";

import { getDbOrThrow, getOrCreateDefaultCompany } from "@/lib/supabase-db";
import { requireUser } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const guard = await requireUser(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = (await req.json().catch(() => null)) as null | { role?: string };
  const role = (body?.role ?? "").toLowerCase();
  if (role !== "employer" && role !== "candidate") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const db = getDbOrThrow();

  const { error: upsertErr } = await db.from("profiles").upsert(
    {
      user_id: guard.userId,
      role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  // For employers, make sure there is a default company + membership (alpha simplification).
  if (role === "employer") {
    const company = await getOrCreateDefaultCompany();
    await db.from("company_members").upsert(
      {
        company_id: company.id,
        user_id: guard.userId,
        role: "owner",
      },
      { onConflict: "company_id,user_id" }
    );
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

