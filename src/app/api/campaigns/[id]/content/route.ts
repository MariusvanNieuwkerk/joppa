import { NextRequest, NextResponse } from "next/server";

import { requireEmployer } from "@/lib/auth-guard";
import { getDbOrThrow } from "@/lib/supabase-db";

export const runtime = "nodejs";

const allowedChannels = new Set([
  "website",
  "indeed",
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
]);

const allowedStates = new Set(["draft", "needs_review", "approved"]);

export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const guard = await requireEmployer(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const id = (await context.params).id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as null | {
    channel?: string;
    headline?: string;
    body?: string;
  };

  const channel = (body?.channel ?? "").trim();
  if (!allowedChannels.has(channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }
  const text = (body?.body ?? "").trim();
  if (text.length < 10) return NextResponse.json({ error: "Body too short" }, { status: 400 });

  const db = getDbOrThrow();

  const { data: latest } = await db
    .from("job_contents")
    .select("version")
    .eq("job_id", id)
    .eq("channel", channel)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = (latest?.[0]?.version ?? 0) + 1;

  const { data, error } = await db
    .from("job_contents")
    .insert({
      job_id: id,
      channel,
      version: nextVersion,
      state: "draft",
      content: {
        headline: body?.headline ?? null,
        body: text,
      },
    })
    .select("id,job_id,channel,version,state,content,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  const guard = await requireEmployer(req);
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const id = (await context.params).id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as null | {
    channel?: string;
    state?: string;
  };

  const channel = (body?.channel ?? "").trim();
  if (!allowedChannels.has(channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }
  const nextState = (body?.state ?? "").trim();
  if (!allowedStates.has(nextState)) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const db = getDbOrThrow();
  const { data: latest } = await db
    .from("job_contents")
    .select("id")
    .eq("job_id", id)
    .eq("channel", channel)
    .order("version", { ascending: false })
    .limit(1);

  const latestId = latest?.[0]?.id as string | undefined;
  if (!latestId) {
    return NextResponse.json({ error: "No content found for channel" }, { status: 404 });
  }

  const { data, error } = await db
    .from("job_contents")
    .update({ state: nextState })
    .eq("id", latestId)
    .select("id,job_id,channel,version,state,content,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ content: data }, { headers: { "Cache-Control": "no-store" } });
}

