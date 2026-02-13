import type { Channel, Company } from "@/lib/types";
import { slugify } from "@/lib/slug";

function pickTitle(raw: string) {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const first = lines[0] ?? "Nieuwe rol";
  // Heuristic: strip leading labels
  return first.replace(/^(functie|rol|title|job)\s*[:\-]\s*/i, "").slice(0, 80);
}

function pickLocation(raw: string) {
  const m =
    raw.match(/locatie\s*[:\-]\s*([^\n,]+)/i) ??
    raw.match(/location\s*[:\-]\s*([^\n,]+)/i);
  return m?.[1]?.trim();
}

function pickSeniority(raw: string) {
  const t = raw.toLowerCase();
  if (t.includes("senior")) return "Senior";
  if (t.includes("lead")) return "Lead";
  if (t.includes("medior")) return "Medior";
  if (t.includes("junior")) return "Junior";
  return undefined;
}

function channelLabel(channel: Channel) {
  switch (channel) {
    case "website":
      return "Website";
    case "indeed":
      return "Indeed";
    case "instagram":
      return "Instagram";
    case "facebook":
      return "Facebook";
    case "tiktok":
      return "TikTok";
    case "linkedin":
      return "LinkedIn";
  }
}

export function mockGenerateCampaign(input: {
  rawIntent: string;
  company?: Company | null;
}) {
  const title = pickTitle(input.rawIntent);
  const location = pickLocation(input.rawIntent);
  const seniority = pickSeniority(input.rawIntent);

  const companyName = input.company?.name ?? "My Company";
  const tone = input.company?.brandTone ?? "direct & helder";

  const base = {
    title,
    location,
    seniority,
    extractedData: {
      confidence: "demo",
      notes:
        "Dit is demo-generatie (template-based) zodat de UX al klopt. Later vervangen we dit door echte AI runs + caching.",
    },
    jobSlug: slugify(title || "job"),
  };

  const channels: Channel[] = [
    "website",
    "indeed",
    "instagram",
    "facebook",
    "tiktok",
    "linkedin",
  ];

  const contents = channels.map((channel) => {
    const label = channelLabel(channel);
    const headline =
      channel === "tiktok"
        ? `Stop met scrollen: ${title}`
        : `${title} bij ${companyName}`;

    const body =
      channel === "website"
        ? [
            `## Over de rol`,
            `Je zoekt iemand die ownership pakt en snel waarde levert. Dit is geschreven in een ${tone} tone of voice.`,
            ``,
            `## Wat je gaat doen`,
            `- Kernverantwoordelijkheid #1`,
            `- Kernverantwoordelijkheid #2`,
            `- Samenwerken met team(s)`,
            ``,
            `## Wat jij meebrengt`,
            `- 3+ jaar relevante ervaring (pas aan)`,
            `- Sterke communicatie`,
            `- Hands-on mentaliteit`,
            ``,
            `## Solliciteer`,
            `Klik op ‘Solliciteren’ en we nemen snel contact op.`,
          ].join("\n")
        : channel === "indeed"
          ? [
              `${headline}`,
              ``,
              `Locatie: ${location ?? "n.t.b."}`,
              `Senioriteit: ${seniority ?? "n.t.b."}`,
              ``,
              `Korte samenvatting`,
              `- Punt 1`,
              `- Punt 2`,
              ``,
              `Solliciteren: via de sollicitatielink`,
            ].join("\n")
          : [
              headline,
              ``,
              `📍 ${location ?? "Locatie in overleg"}`,
              `✅ ${seniority ?? "Niveau in overleg"}`,
              ``,
              `Wat ga je doen?`,
              `- Punt 1`,
              `- Punt 2`,
              ``,
              `Reageer / solliciteer via link in bio.`,
              `#vacature #werken #${slugify(title).replace(/-/g, "")}`,
            ].join("\n");

    return {
      channel,
      content: {
        label,
        headline,
        body,
      },
    };
  });

  return { jobPatch: base, contents };
}

