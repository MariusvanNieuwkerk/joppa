import { NextRequest, NextResponse } from "next/server";

import { requireEmployer } from "@/lib/auth-guard";
import { getDbOrThrow, getOrCreateDefaultCompany } from "@/lib/supabase-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const guard = await requireEmployer(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const db = getDbOrThrow();
  const company = await getOrCreateDefaultCompany();

  const { data: jobs, error } = await db
    .from("jobs")
    .select("id,status,title,location,seniority,job_slug,published_at,created_at,updated_at")
    .eq("company_id", company.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ company, jobs: jobs ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

