import { NextRequest, NextResponse } from "next/server";

import { requireEmployer } from "@/lib/auth-guard";
import { getDbOrThrow } from "@/lib/supabase-db";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const guard = await requireEmployer(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const id = (await context.params).id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as null | {
    title?: string;
    location?: string;
    seniority?: string;
    employmentType?: string;
  };

  const db = getDbOrThrow();

  const patch = {
    title: body?.title?.trim() || null,
    location: body?.location?.trim() || null,
    seniority: body?.seniority?.trim() || null,
    employment_type: body?.employmentType?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  // If title changes, keep job_slug aligned (simple v1 behavior).
  const nextSlug = body?.title?.trim() ? slugify(body.title) : "";
  const updatePatch = nextSlug ? { ...patch, job_slug: nextSlug } : patch;

  const { data, error } = await db
    .from("jobs")
    .update(updatePatch)
    .eq("id", id)
    .select("id,title,location,seniority,employment_type,job_slug,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { headers: { "Cache-Control": "no-store" } });
}

