import { NextRequest, NextResponse } from "next/server";

import { requireEmployer } from "@/lib/auth-guard";
import { getDbOrThrow, getOrCreateDefaultCompany } from "@/lib/supabase-db";
import { slugify } from "@/lib/slug";
import { geminiGenerateText, extractJsonFromText } from "@/lib/gemini";
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

    const channels = [
      "website",
      "indeed",
      "linkedin",
      "instagram",
      "facebook",
      "tiktok",
    ] as const;

    for (const channel of channels) {
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

async function generateCampaign(input: {
  rawIntent: string;
  company: { name: string; website?: string; brandTone?: string; brandPitch?: string };
}): Promise<GeminiCampaign> {
  if (!process.env.GEMINI_API_KEY) {
    const fallback = mockGenerateCampaign({ rawIntent: input.rawIntent, company: null });
    const contents: GeminiCampaign["contents"] = {};
    for (const c of fallback.contents) {
      // demo-db format uses { body }
      contents[c.channel] = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        headline: (c.content as any)?.headline ?? undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: (c.content as any)?.body ?? "",
      };
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
  const json = extractJsonFromText<GeminiCampaign>(text);
  return json;
}

function buildPrompt(input: {
  rawIntent: string;
  company: { name: string; website?: string; brandTone?: string; brandPitch?: string };
}) {
  return [
    "Je bent een Nederlandse recruitment copywriter en campaign builder.",
    "Doel: maak van een 'brain dump' een publicatie-klare vacature + kanaalteksten.",
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
    "LinkedIn/Instagram/Facebook/TikTok: kort, wervend, met CTA en max ~1200 tekens. Gebruik spaarzaam emoji: liever geen.",
    "",
    `Bedrijf: ${input.company.name}`,
    input.company.website ? `Website: ${input.company.website}` : "",
    input.company.brandTone ? `Tone of voice: ${input.company.brandTone}` : "",
    input.company.brandPitch ? `Pitch: ${input.company.brandPitch}` : "",
    "",
    "Brain dump:",
    input.rawIntent,
  ]
    .filter(Boolean)
    .join("\n");
}

