import { NextRequest, NextResponse } from "next/server";

import { requireEmployer } from "@/lib/auth-guard";
import { getDbOrThrow, getOrCreateDefaultCompany } from "@/lib/supabase-db";
import { slugify } from "@/lib/slug";
import { allCampaignChannels, generateCampaign } from "@/lib/campaign-generation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const guard = await requireEmployer(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const payload = (await req.json().catch(() => null)) as null | {
    rawIntent?: string;
    structured?: unknown;
  };
  const rawIntent = (payload?.rawIntent ?? "").trim();
  if (rawIntent.length < 10) {
    return NextResponse.json({ error: "rawIntent too short" }, { status: 400 });
  }
  const structured = payload?.structured ?? null;

  const db = getDbOrThrow();
  const company = await getOrCreateDefaultCompany();

  const { data: job, error: jobErr } = await db
    .from("jobs")
    .insert({
      company_id: company.id,
      raw_intent: rawIntent,
      status: "draft",
      job_slug: `draft-${crypto.randomUUID()}`,
    })
    .select("id,company_id,status,title,location,seniority,employment_type,job_slug,created_at,updated_at")
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ error: jobErr?.message ?? "job insert failed" }, { status: 500 });
  }

  // Create run record(s)
  const { data: runExtract } = await db
    .from("generation_runs")
    .insert({
      job_id: job.id,
      step: "extract",
      status: "running",
      model: process.env.GEMINI_MODEL || (process.env.GEMINI_API_KEY ? "gemini" : "demo"),
      prompt: "extract+copy+channels",
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
      variant: "brain_dump",
    });

    const jobSlug =
      slugify(generated.job.jobSlug || generated.job.title) || `vacature-${job.id.slice(0, 8)}`;

    const { error: updErr } = await db
      .from("jobs")
      .update({
        title: generated.job.title,
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
      .eq("id", job.id);

    if (updErr) throw updErr;

    for (const channel of allCampaignChannels) {
      const c = generated.contents[channel] ?? generated.contents.website;
      if (!c?.body) continue;
      const { error: contentErr } = await db.from("job_contents").insert({
        job_id: job.id,
        channel,
        version: 1,
        state: "draft",
        content: {
          headline: c.headline ?? null,
          body: c.body,
        },
      });
      if (contentErr) throw contentErr;
    }

    if (runExtract?.id) {
      await db.from("generation_runs").update({ status: "succeeded" }).eq("id", runExtract.id);
    }

    return NextResponse.json(
      { jobId: job.id },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (runExtract?.id) {
      await db.from("generation_runs").update({ status: "failed", error: msg }).eq("id", runExtract.id);
    }
    return NextResponse.json({ error: msg, jobId: job.id }, { status: 500 });
  }
}

