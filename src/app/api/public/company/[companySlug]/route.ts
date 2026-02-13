import { NextRequest, NextResponse } from "next/server";

import { getDbOrThrow } from "@/lib/supabase-db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const companySlug = (await context.params).companySlug;
  if (!companySlug) return NextResponse.json({ error: "Missing companySlug" }, { status: 400 });

  const db = getDbOrThrow();

  const { data: company, error: companyErr } = await db
    .from("companies")
    .select("id,name,slug,website,brand_primary_color,brand_tone,brand_pitch,created_at")
    .eq("slug", companySlug)
    .single();

  if (companyErr || !company) {
    return NextResponse.json({ error: companyErr?.message ?? "Not found" }, { status: 404 });
  }

  const { data: jobs, error: jobsErr } = await db
    .from("jobs")
    .select("id,title,location,seniority,job_slug,published_at,status")
    .eq("company_id", company.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (jobsErr) return NextResponse.json({ error: jobsErr.message }, { status: 500 });

  return NextResponse.json(
    { company, jobs: jobs ?? [] },
    {
      headers: {
        // Public company page data: safe to cache briefly.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

