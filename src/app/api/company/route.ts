import { NextRequest, NextResponse } from "next/server";

import { requireEmployer } from "@/lib/auth-guard";
import { getDbOrThrow, getOrCreateDefaultCompany } from "@/lib/supabase-db";
import { slugify } from "@/lib/slug";

export async function GET() {
  const db = getDbOrThrow();
  const { data } = await db
    .from("companies")
    .select("id,name,slug,website,brand_primary_color,brand_tone,brand_pitch,created_at")
    .order("created_at", { ascending: true })
    .limit(1);
  return NextResponse.json({ company: data?.[0] ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const guard = await requireEmployer(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const db = getDbOrThrow();
  const existing = await getOrCreateDefaultCompany();
  const body = (await req.json().catch(() => null)) as null | {
    name?: string;
    website?: string;
    brandPrimaryColor?: string;
    brandTone?: string;
    brandPitch?: string;
  };

  const name = (body?.name ?? existing.name).trim() || existing.name;
  const baseSlug = slugify(name) || existing.slug || "bedrijf";

  // Keep slug stable unless name changes drastically; for alpha, update slug with name.
  const slug = baseSlug;

  const { data, error } = await db
    .from("companies")
    .update({
      name,
      slug,
      website: body?.website || null,
      brand_primary_color: body?.brandPrimaryColor || null,
      brand_tone: body?.brandTone || null,
      brand_pitch: body?.brandPitch || null,
    })
    .eq("id", existing.id)
    .select("id,name,slug,website,brand_primary_color,brand_tone,brand_pitch,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ company: data }, { headers: { "Cache-Control": "no-store" } });
}

