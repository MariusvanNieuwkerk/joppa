import { NextRequest, NextResponse } from "next/server";

import { requireEmployer } from "@/lib/auth-guard";
import { getDbOrThrow, getOrCreateDefaultCompany } from "@/lib/supabase-db";
import { slugify } from "@/lib/slug";
import { generateCampaign, getEnabledChannels } from "@/lib/campaign-generation";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: Promise<Record<string, string>> }) {
  const guard = await requireEmployer(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const id = (await context.params).id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as null | {
    rawIntent?: string;
    structured?: unknown;
  };
  const rawIntent = (body?.rawIntent ?? "").trim();
  if (rawIntent.length < 10) return NextResponse.json({ error: "rawIntent too short" }, { status: 400 });
  const structured = body?.structured ?? null;

  const db = getDbOrThrow();
  const company = await getOrCreateDefaultCompany();

  const { data: job, error: jobErr } = await db
    .from("jobs")
    .select("id,company_id,status")
    .eq("id", id)
    .single();

  if (jobErr || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.company_id !== company.id) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { data: run } = await db
    .from("generation_runs")
    .insert({
      job_id: id,
      step: "wizard",
      status: "running",
      model: process.env.GEMINI_MODEL || (process.env.GEMINI_API_KEY ? "gemini" : "demo"),
      prompt: "wizard-regenerate",
    })
    .select("id")
    .single();

  try {
    const generated = await generateCampaign({
      rawIntent,
      company: {
        name: company.name,
        website: company.website ?? undefined,
        brandTone: company.brand_tone ?? undefined,
        brandPitch: company.brand_pitch ?? undefined,
      },
      variant: "input",
    });

    const titleFromStructured =
      (structured as { title?: string } | null)?.title?.trim() || "";
    const title = titleFromStructured || generated.job.title || "Vacature";
    const jobSlug = slugify(generated.job.jobSlug || title) || `vacature-${id.slice(0, 8)}`;

    const { error: updErr } = await db
      .from("jobs")
      .update({
        raw_intent: rawIntent,
        title,
        location: generated.job.location ?? null,
        seniority: generated.job.seniority ?? null,
        employment_type: generated.job.employmentType ?? null,
        job_slug: jobSlug,
        extracted_data: {
          ...(generated.job.summary ? { summary: generated.job.summary } : {}),
          ...(structured ? { input_v1: structured } : {}),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (updErr) throw updErr;

    const enabled = getEnabledChannels(structured);
    for (const channel of enabled) {
      const c = generated.contents[channel] ?? generated.contents.website;
      if (!c?.body) continue;

      const { data: latest } = await db
        .from("job_contents")
        .select("version")
        .eq("job_id", id)
        .eq("channel", channel)
        .order("version", { ascending: false })
        .limit(1);
      const nextVersion = (latest?.[0]?.version ?? 0) + 1;

      const { error: insErr } = await db.from("job_contents").insert({
        job_id: id,
        channel,
        version: nextVersion,
        state: "draft",
        content: { headline: c.headline ?? null, body: c.body },
      });
      if (insErr) throw insErr;
    }

    if (run?.id) await db.from("generation_runs").update({ status: "succeeded" }).eq("id", run.id);
    return NextResponse.json({ jobId: id }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (run?.id) {
      await db.from("generation_runs").update({ status: "failed", error: msg }).eq("id", run.id);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

