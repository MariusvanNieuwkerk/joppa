import { NextRequest, NextResponse } from "next/server";

import { requireEmployer } from "@/lib/auth-guard";
import { getDbOrThrow, getOrCreateDefaultCompany } from "@/lib/supabase-db";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const guard = await requireEmployer(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const id = (await context.params).id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = getDbOrThrow();

  const { data: job, error: jobErr } = await db
    .from("jobs")
    .select(
      "id,company_id,status,raw_intent,title,location,seniority,employment_type,job_slug,published_at,company_slug_snapshot,brand_snapshot_public,extracted_data,created_at,updated_at"
    )
    .eq("id", id)
    .single();

  if (jobErr || !job) return NextResponse.json({ error: jobErr?.message ?? "Not found" }, { status: 404 });

  const { data: company } = await db
    .from("companies")
    .select("id,name,slug,website,brand_primary_color,brand_tone,brand_pitch,created_at")
    .eq("id", job.company_id)
    .single();

  const { data: contents } = await db
    .from("job_contents")
    .select("id,job_id,channel,version,state,content,created_at")
    .eq("job_id", job.id)
    .order("version", { ascending: false });

  const latestByChannel: Record<string, unknown> = {};
  for (const c of contents ?? []) {
    if (!latestByChannel[c.channel]) latestByChannel[c.channel] = c;
  }

  const { data: runs } = await db
    .from("generation_runs")
    .select("id,job_id,step,status,model,prompt,error,cost_usd,created_at,updated_at")
    .eq("job_id", job.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(
    { company: company ?? null, job, contentsLatest: latestByChannel, runs: runs ?? [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const guard = await requireEmployer(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const id = (await context.params).id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = getDbOrThrow();
  const company = await getOrCreateDefaultCompany();

  const { data: job, error: jobErr } = await db
    .from("jobs")
    .select("id,company_id,status")
    .eq("id", id)
    .single();

  if (jobErr || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.company_id !== company.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (job.status === "published") {
    return NextResponse.json(
      { error: "Live vacatures kun je (nu) niet verwijderen. Zet eerst op archived." },
      { status: 400 }
    );
  }

  // Delete children first (no cascade assumptions)
  await db.from("job_contents").delete().eq("job_id", id);
  await db.from("generation_runs").delete().eq("job_id", id);

  const { error: delErr } = await db.from("jobs").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

