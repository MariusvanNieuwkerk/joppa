import { NextRequest, NextResponse } from "next/server";

import { requireEmployer } from "@/lib/auth-guard";
import { getDbOrThrow, getOrCreateDefaultCompany } from "@/lib/supabase-db";
import { slugify } from "@/lib/slug";
import { extractJsonFromText, geminiGenerateText } from "@/lib/gemini";
import { mockGenerateCampaign } from "@/lib/mock-generate";

export const runtime = "nodejs";

type GeminiCampaign = {
  job: {
    title: string;
    location?: string;
    seniority?: string;
    employmentType?: string;
    jobSlug?: string;
    summary?: string;
  };
  contents: Record<
    string,
    {
      headline?: string;
      body: string;
    }
  >;
};

function getEnabledChannels(structured: unknown) {
  const ch = (structured as { channels?: Record<string, boolean> } | null)?.channels ?? null;
  const all = ["website", "indeed", "linkedin", "instagram", "facebook", "tiktok"] as const;
  const enabled = all.filter((k) => Boolean(ch?.[k]));
  return enabled.length ? enabled : (["website", "indeed"] as const);
}

async function generateCampaign(input: {
  rawIntent: string;
  company: { name: string; website?: string; brandTone?: string; brandPitch?: string };
}): Promise<GeminiCampaign> {
  if (!process.env.GEMINI_API_KEY) {
    const fallback = mockGenerateCampaign({ rawIntent: input.rawIntent, company: null });
    const contents: GeminiCampaign["contents"] = {};
    for (const c of fallback.contents) {
      // demo-db format uses { body }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contents[c.channel] = { headline: (c.content as any)?.headline ?? undefined, body: (c.content as any)?.body ?? "" };
    }
    return {
      job: {
        title: fallback.jobPatch.title || "Vacature",
        location: fallback.jobPatch.location,
        seniority: fallback.jobPatch.seniority,
        employmentType: undefined,
        jobSlug: fallback.jobPatch.jobSlug,
      },
      contents,
    };
  }

  const prompt = buildPrompt(input);
  const { text } = await geminiGenerateText(prompt);
  return extractJsonFromText<GeminiCampaign>(text);
}

function buildPrompt(input: {
  rawIntent: string;
  company: { name: string; website?: string; brandTone?: string; brandPitch?: string };
}) {
  return [
    "Je bent een Nederlandse recruitment copywriter en campaign builder.",
    "Doel: maak van de input een publicatie-klare vacature + kanaalteksten.",
    "",
    "Regels:",
    "- Schrijf warm, menselijk, niet-technisch Nederlands.",
    "- Gebruik geen buzzwords of overdreven AI-taal.",
    "- Als iets ontbreekt, kies redelijke aannames (zonder bedragen te verzinnen).",
    "- Output MOET geldige JSON zijn (geen markdown, geen uitleg).",
    "",
    "Geef JSON met dit schema:",
    "{",
    '  "job": { "title": string, "location"?: string, "seniority"?: string, "employmentType"?: string, "jobSlug"?: string, "summary"?: string },',
    '  "contents": {',
    '     "website": { "headline"?: string, "body": string },',
    '     "indeed": { "headline"?: string, "body": string },',
    '     "linkedin": { "headline"?: string, "body": string },',
    '     "instagram": { "headline"?: string, "body": string },',
    '     "facebook": { "headline"?: string, "body": string },',
    '     "tiktok": { "headline"?: string, "body": string }',
    "  }",
    "}",
    "",
    "Schrijf website-body als een nette vacature met secties en duidelijke bullets.",
    "Indeed-body mag compacter, maar compleet.",
    "LinkedIn/Instagram/Facebook/TikTok: kort, wervend, met CTA en max ~1200 tekens.",
    "",
    `Bedrijf: ${input.company.name}`,
    input.company.website ? `Website: ${input.company.website}` : "",
    input.company.brandTone ? `Tone of voice: ${input.company.brandTone}` : "",
    input.company.brandPitch ? `Pitch: ${input.company.brandPitch}` : "",
    "",
    "Input:",
    input.rawIntent,
  ]
    .filter(Boolean)
    .join("\n");
}

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

