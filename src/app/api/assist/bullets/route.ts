import { NextRequest, NextResponse } from "next/server";

import { requireEmployer } from "@/lib/auth-guard";
import { extractJsonFromText, geminiGenerateText } from "@/lib/gemini";

export const runtime = "nodejs";

type BulletsResponse = { bullets: string[] };

function fallbackBullets(text: string) {
  const parts = text
    .split(/\r?\n|•|- |\u2022|\t|;/g)
    .map((s) => s.trim())
    .map((s) => s.replace(/^\d+[.)]\s*/, ""))
    .filter(Boolean);
  if (parts.length >= 3) return parts.slice(0, 10);

  // Try splitting sentences
  const sentences = text
    .split(/[.!?]\s+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.slice(0, 10);
}

export async function POST(req: NextRequest) {
  const guard = await requireEmployer(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = (await req.json().catch(() => null)) as null | { text?: string; tone?: string };
  const text = (body?.text ?? "").trim();
  const tone = (body?.tone ?? "").trim();
  if (text.length < 10) {
    return NextResponse.json({ error: "Text too short" }, { status: 400 });
  }

  // No Gemini configured → heuristic bullets
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { bullets: fallbackBullets(text) },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const prompt = [
    "Je bent een Nederlandse recruiter.",
    "Zet de input om naar 4-8 concrete taken (bullets).",
    "Regels:",
    "- Korte bullets (max 12 woorden).",
    "- Begin met een werkwoord.",
    "- Geen salaris, geen fluff, geen emoji.",
    tone ? `Tone of voice: ${tone}` : "",
    "",
    "Output moet geldige JSON zijn (geen markdown):",
    '{ "bullets": string[] }',
    "",
    "Input:",
    text,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { text: out } = await geminiGenerateText(prompt);
    const json = extractJsonFromText<BulletsResponse>(out);
    const bullets = (json.bullets ?? []).map((b) => String(b).trim()).filter(Boolean).slice(0, 10);
    if (!bullets.length) {
      return NextResponse.json(
        { bullets: fallbackBullets(text) },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json({ bullets }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { bullets: fallbackBullets(text), error: msg },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}

