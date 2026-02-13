import { NextRequest, NextResponse } from "next/server";

import { getDbOrThrow } from "@/lib/supabase-db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const companySlug = params.companySlug;
  const jobSlug = params.jobSlug;
  if (!companySlug || !jobSlug) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const db = getDbOrThrow();

  const { data: job, error: jobErr } = await db
    .from("jobs")
    .select(
      "id,company_id,status,title,location,seniority,employment_type,job_slug,published_at,company_slug_snapshot,brand_snapshot_public"
    )
    .eq("status", "published")
    .eq("company_slug_snapshot", companySlug)
    .eq("job_slug", jobSlug)
    .single();

  if (jobErr || !job) return NextResponse.json({ error: jobErr?.message ?? "Not found" }, { status: 404 });

  const { data: website } = await db
    .from("job_contents")
    .select("id,channel,version,state,content,created_at")
    .eq("job_id", job.id)
    .eq("channel", "website")
    .order("version", { ascending: false })
    .limit(1);

  return NextResponse.json(
    { job, websiteContent: website?.[0] ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

