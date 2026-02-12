import { NextRequest, NextResponse } from "next/server";

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  context: { params: Promise<{}> }
) {
  // For now (demo-mode), we don't fetch server-side data.
  // We render a generic but consistent template that can be used for previews/exports.
  const { id } = (await context.params) as { id: string };
  const url = new URL(req.url);
  const ratio = url.searchParams.get("ratio") ?? "4x5";
  const template = url.searchParams.get("template") ?? "bold";

  const [w, h] =
    ratio === "1x1"
      ? [1080, 1080]
      : ratio === "9x16"
        ? [1080, 1920]
        : [1080, 1350]; // 4x5 default

  const title = "Job Campaign";
  const subtitle = `ID: ${id.slice(-10)}`;

  const bg =
    template === "minimal"
      ? { a: "#0b0b0f", b: "#12121a" }
      : template === "friendly"
        ? { a: "#0ea5e9", b: "#111827" }
        : { a: "#111827", b: "#0b1220" };

  const accent =
    template === "friendly" ? "#fbbf24" : template === "minimal" ? "#a1a1aa" : "#22c55e";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg.a}"/>
      <stop offset="1" stop-color="${bg.b}"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="40" />
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>

  <circle cx="${Math.round(w * 0.2)}" cy="${Math.round(h * 0.2)}" r="${Math.round(w * 0.22)}" fill="${accent}" opacity="0.18" filter="url(#soft)"/>
  <circle cx="${Math.round(w * 0.85)}" cy="${Math.round(h * 0.75)}" r="${Math.round(w * 0.28)}" fill="${accent}" opacity="0.12" filter="url(#soft)"/>

  <g font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" fill="#ffffff">
    <text x="80" y="140" font-size="34" opacity="0.9">${escapeXml("Joppa")}</text>
    <text x="80" y="${Math.round(h * 0.45)}" font-size="${template === "minimal" ? 76 : 86}" font-weight="700" letter-spacing="-1">
      ${escapeXml(title)}
    </text>
    <text x="80" y="${Math.round(h * 0.45) + 70}" font-size="32" opacity="0.85">
      ${escapeXml(subtitle)}
    </text>
    <rect x="80" y="${h - 210}" width="${w - 160}" height="90" rx="24" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.18)"/>
    <text x="120" y="${h - 152}" font-size="30" font-weight="600">${escapeXml("Apply now")}</text>
  </g>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

