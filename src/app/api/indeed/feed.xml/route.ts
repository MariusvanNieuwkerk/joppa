import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase-admin";

type CompanyRow = {
  name: string | null;
  slug: string | null;
};

type JobRow = {
  id: string;
  title: string | null;
  location: string | null;
  published_at: string | null;
  job_slug: string | null;
  company_slug_snapshot: string | null;
  company_id: string;
  companies: CompanyRow | null;
};

type ContentRow = {
  job_id: string;
  channel: "indeed" | "website";
  version: number;
  content: Record<string, unknown> & { body?: unknown; headline?: unknown };
};

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlCdata(s: string) {
  // split "]]>" occurrences safely
  return `<![CDATA[${s.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

export async function GET(req: NextRequest) {
  const baseUrl = new URL(req.url);

  if (!isSupabaseAdminConfigured()) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>Joppa</publisher>
  <publisherurl>${escapeXml(baseUrl.origin)}</publisherurl>
  <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>
  <job>
    <title>Voorbeeld vacature</title>
    <date>${escapeXml(new Date().toISOString())}</date>
    <referencenumber>voorbeeld-1</referencenumber>
    <url>${escapeXml(baseUrl.origin)}</url>
    <company>Joppa</company>
    <city>Amsterdam</city>
    <country>NL</country>
    <description>${xmlCdata(
      "Indeed feed is nog niet gekoppeld. Voeg SUPABASE_SERVICE_ROLE_KEY en NEXT_PUBLIC_SUPABASE_URL toe om live vacatures in deze feed te zetten."
    )}</description>
  </job>
</source>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return new NextResponse("Misconfiguratie", { status: 500 });
  }

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id,title,location,published_at,job_slug,company_slug_snapshot,company_id,companies(name,slug)"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>Joppa</publisher>
  <publisherurl>${escapeXml(baseUrl.origin)}</publisherurl>
  <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>
  <job>
    <title>Feed error</title>
    <date>${escapeXml(new Date().toISOString())}</date>
    <referencenumber>error</referencenumber>
    <url>${escapeXml(baseUrl.origin)}</url>
    <company>Joppa</company>
    <city>Amsterdam</city>
    <country>NL</country>
    <description>${xmlCdata(
      `Kon vacatures niet ophalen: ${error.message}`
    )}</description>
  </job>
</source>`;
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const typedJobs = (jobs ?? []) as unknown as JobRow[];
  const jobIds = typedJobs.map((j) => j.id);

  const { data: contents } = await supabase
    .from("job_contents")
    .select("job_id,channel,version,content")
    .in("job_id", jobIds)
    .in("channel", ["indeed", "website"])
    .order("version", { ascending: false });

  const typedContents = (contents ?? []) as unknown as ContentRow[];
  const latestByJob: Record<string, { indeed?: ContentRow; website?: ContentRow }> = {};
  for (const c of typedContents) {
    const jobId = c.job_id;
    const channel = c.channel;
    latestByJob[jobId] ??= {};
    if (channel === "indeed" && !latestByJob[jobId].indeed)
      latestByJob[jobId].indeed = c;
    if (channel === "website" && !latestByJob[jobId].website)
      latestByJob[jobId].website = c;
  }

  const items = typedJobs.map((job) => {
    const company = job.companies?.name ?? "Bedrijf";
    const companySlug =
      job.company_slug_snapshot ?? job.companies?.slug ?? "bedrijf";
    const jobSlug = job.job_slug ?? "vacature";
    const url = `${baseUrl.origin}/jobs/${companySlug}/${jobSlug}`;
    const body =
      (latestByJob[job.id]?.indeed?.content?.body as string | undefined) ??
      (latestByJob[job.id]?.website?.content?.body as string | undefined) ??
      "";

    const city = job.location?.split(",")?.[0]?.trim() || "Nederland";
    const published = job.published_at ?? new Date().toISOString();

    return `  <job>
    <title>${escapeXml(job.title ?? "Vacature")}</title>
    <date>${escapeXml(published)}</date>
    <referencenumber>${escapeXml(job.id)}</referencenumber>
    <url>${escapeXml(url)}</url>
    <company>${escapeXml(company)}</company>
    <city>${escapeXml(city)}</city>
    <country>NL</country>
    <description>${xmlCdata(String(body))}</description>
  </job>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>Joppa</publisher>
  <publisherurl>${escapeXml(baseUrl.origin)}</publisherurl>
  <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>
${items.join("\n")}
</source>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Indeed fetches frequently; keep this fresh but cachable.
      "Cache-Control": "public, max-age=60",
    },
  });
}

