import { NextRequest, NextResponse } from "next/server";

import { requireEmployer } from "@/lib/auth-guard";
import { getDbOrThrow } from "@/lib/supabase-db";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const guard = await requireEmployer(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const id = (await context.params).id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as null | { publish?: boolean };
  const publish = Boolean(body?.publish);

  const db = getDbOrThrow();
  const { data: job, error: jobErr } = await db
    .from("jobs")
    .select("id,company_id,job_slug,status")
    .eq("id", id)
    .single();
  if (jobErr || !job) return NextResponse.json({ error: jobErr?.message ?? "Not found" }, { status: 404 });

  const { data: company } = await db
    .from("companies")
    .select("id,slug,name,website,brand_primary_color")
    .eq("id", job.company_id)
    .single();

  const patch = publish
    ? {
        status: "published",
        published_at: new Date().toISOString(),
        company_slug_snapshot: company?.slug ?? null,
        brand_snapshot_public: {
          name: company?.name ?? null,
          website: company?.website ?? null,
          brandPrimaryColor: company?.brand_primary_color ?? null,
        },
        updated_at: new Date().toISOString(),
      }
    : {
        status: "draft",
        published_at: null,
        updated_at: new Date().toISOString(),
      };

  const { data, error } = await db
    .from("jobs")
    .update(patch)
    .eq("id", job.id)
    .select("id,status,published_at,company_slug_snapshot")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { headers: { "Cache-Control": "no-store" } });
}

