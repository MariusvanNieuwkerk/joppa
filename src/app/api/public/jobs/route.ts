import { NextResponse } from "next/server";

import { getDbOrThrow } from "@/lib/supabase-db";

export const runtime = "nodejs";

type PublicJobListItem = {
  id: string;
  title: string | null;
  location: string | null;
  seniority: string | null;
  employment_type: string | null;
  job_slug: string;
  published_at: string | null;
  company: { name: string; slug: string } | null;
};

export async function GET() {
  const db = getDbOrThrow();

  // Join jobs -> companies so the browse page can link correctly.
  const { data, error } = await db
    .from("jobs")
    .select(
      `
      id,
      title,
      location,
      seniority,
      employment_type,
      job_slug,
      published_at,
      company:companies!inner(name,slug)
    `
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const jobs: PublicJobListItem[] = (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      title: string | null;
      location: string | null;
      seniority: string | null;
      employment_type: string | null;
      job_slug: string;
      published_at: string | null;
      company: Array<{ name: string; slug: string }> | { name: string; slug: string } | null;
    };

    const company = Array.isArray(r.company)
      ? r.company[0] ?? null
      : r.company ?? null;

    return {
      id: r.id,
      title: r.title ?? null,
      location: r.location ?? null,
      seniority: r.seniority ?? null,
      employment_type: r.employment_type ?? null,
      job_slug: r.job_slug,
      published_at: r.published_at ?? null,
      company: company ? { name: company.name, slug: company.slug } : null,
    };
  });

  return NextResponse.json(
    { jobs },
    {
      headers: {
        // Safe to cache briefly: public, published jobs list.
        // Vercel will cache at the edge when using s-maxage.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

