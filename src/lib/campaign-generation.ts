import { extractJsonFromText, geminiGenerateText } from "@/lib/gemini";
import { mockGenerateCampaign } from "@/lib/mock-generate";

export type CampaignCompanyInput = {
  name: string;
  website?: string;
  brandTone?: string;
  brandPitch?: string;
};

export type GeminiCampaign = {
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

export const allCampaignChannels = [
  "website",
  "indeed",
  "linkedin",
  "instagram",
  "facebook",
  "tiktok",
] as const;

export type CampaignChannel = (typeof allCampaignChannels)[number];

export type CampaignPromptVariant = "brain_dump" | "input";

export async function generateCampaign(input: {
  rawIntent: string;
  company: CampaignCompanyInput;
  variant?: CampaignPromptVariant;
}): Promise<GeminiCampaign> {
  if (!process.env.GEMINI_API_KEY) {
    const fallback = mockGenerateCampaign({ rawIntent: input.rawIntent, company: null });
    const contents: GeminiCampaign["contents"] = {};

    for (const c of fallback.contents) {
      const raw = c.content as unknown;
      const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
      const headline =
        typeof obj?.headline === "string" ? obj.headline : obj?.headline === null ? undefined : undefined;
      const body = typeof obj?.body === "string" ? obj.body : "";
      contents[c.channel] = { headline, body };
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

  const prompt = buildCampaignPrompt({
    rawIntent: input.rawIntent,
    company: input.company,
    variant: input.variant ?? "brain_dump",
  });
  const { text } = await geminiGenerateText(prompt);
  return extractJsonFromText<GeminiCampaign>(text);
}

export function buildCampaignPrompt(input: {
  rawIntent: string;
  company: CampaignCompanyInput;
  variant: CampaignPromptVariant;
}) {
  const isBrainDump = input.variant === "brain_dump";
  return [
    "Je bent een Nederlandse recruitment copywriter en campaign builder.",
    isBrainDump
      ? "Doel: maak van een 'brain dump' een publicatie-klare vacature + kanaalteksten."
      : "Doel: maak van de input een publicatie-klare vacature + kanaalteksten.",
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
    isBrainDump
      ? "LinkedIn/Instagram/Facebook/TikTok: kort, wervend, met CTA en max ~1200 tekens. Gebruik spaarzaam emoji: liever geen."
      : "LinkedIn/Instagram/Facebook/TikTok: kort, wervend, met CTA en max ~1200 tekens.",
    "",
    `Bedrijf: ${input.company.name}`,
    input.company.website ? `Website: ${input.company.website}` : "",
    input.company.brandTone ? `Tone of voice: ${input.company.brandTone}` : "",
    input.company.brandPitch ? `Pitch: ${input.company.brandPitch}` : "",
    "",
    isBrainDump ? "Brain dump:" : "Input:",
    input.rawIntent,
  ]
    .filter(Boolean)
    .join("\n");
}

export function getEnabledChannels(structured: unknown): CampaignChannel[] {
  const ch = (structured as { channels?: Record<string, boolean> } | null)?.channels ?? null;
  const enabled = allCampaignChannels.filter((k) => Boolean(ch?.[k]));
  return enabled.length ? enabled : ["website", "indeed"];
}

