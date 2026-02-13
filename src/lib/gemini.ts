type GeminiGenerateResult = {
  text: string;
  raw: unknown;
};

export async function geminiGenerateText(prompt: string): Promise<GeminiGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`
  );
  url.searchParams.set("key", apiKey);

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6,
      topP: 0.9,
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const raw = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    throw new Error(
      `Gemini request failed (${res.status}): ${JSON.stringify(raw).slice(0, 500)}`
    );
  }

  const text =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((raw as any)?.candidates?.[0]?.content?.parts ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => p?.text)
      .filter(Boolean)
      .join("\n") || "";

  return { text, raw };
}

export function extractJsonFromText<T>(input: string): T {
  // Try direct JSON first
  try {
    return JSON.parse(input) as T;
  } catch {
    // Continue
  }

  // Strip ```json fences if present
  const fenced = input.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]) as T;
    } catch {
      // Continue
    }
  }

  // Fallback: first {...} block
  const first = input.indexOf("{");
  const last = input.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const slice = input.slice(first, last + 1);
    return JSON.parse(slice) as T;
  }

  throw new Error("Could not parse JSON from Gemini output");
}

