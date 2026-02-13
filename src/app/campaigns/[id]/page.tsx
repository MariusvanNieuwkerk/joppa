"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { RequireEmployer } from "@/components/require-employer";
import {
  getCompany,
  getJob,
  getLatestContent,
  listRuns,
  updateJob,
  upsertContent,
} from "@/lib/demo-db";
import type { Channel, Company, GenerationRun, Job, JobContent } from "@/lib/types";
import { Tabs } from "@/components/tabs";
import { DownloadExportPackButton } from "@/components/download-export-pack-button";
import { withAuth } from "@/lib/auth-client";

type LiveCompany = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  brand_primary_color: string | null;
  brand_tone: string | null;
  brand_pitch: string | null;
  created_at: string;
};

type LiveJob = {
  id: string;
  company_id: string;
  status: "draft" | "published" | "archived";
  raw_intent: string;
  title: string | null;
  location: string | null;
  seniority: string | null;
  employment_type: string | null;
  job_slug: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type LiveContentRow = {
  id: string;
  job_id: string;
  channel: Channel;
  version: number;
  state: string;
  content: { headline?: string | null; body?: string | null };
  created_at: string;
};

type LiveRun = {
  id: string;
  job_id: string;
  step: string;
  status: string;
  model: string | null;
  prompt: string | null;
  error: string | null;
  cost_usd: number | null;
  created_at: string;
  updated_at: string;
};

type LiveCampaignResponse = {
  company: LiveCompany | null;
  job: LiveJob;
  contentsLatest: Partial<Record<Channel, LiveContentRow>>;
  runs: LiveRun[];
};

type AnyCompany = Company | LiveCompany;
type AnyJob = Job | LiveJob;
type AnyRun = GenerationRun | LiveRun;

const tabItems = [
  { id: "overview", label: "Overview" },
  { id: "structure", label: "Structure" },
  { id: "copy", label: "Copy" },
  { id: "visuals", label: "Visuals" },
  { id: "publish", label: "Publish/Export" },
  { id: "history", label: "History" },
] as const;

const channels: Array<{ id: Channel; label: string }> = [
  { id: "website", label: "Website" },
  { id: "indeed", label: "Indeed" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
];

export default function JobCockpitPage({
  params,
}: {
  params: { id: string };
}) {
  const sp = useSearchParams();
  const tab = sp.get("tab") ?? "overview";

  const demoCompany = useMemo(() => getCompany(), []);
  const demoJob = useMemo(() => getJob(params.id), [params.id]);

  const [mode, setMode] = useState<"live" | "demo">("live");
  const [company, setCompany] = useState<AnyCompany | null>(null);
  const [job, setJobState] = useState<AnyJob | null>(null);
  const [contentsLatest, setContentsLatest] = useState<
    Partial<Record<Channel, LiveContentRow>>
  >({});
  const [runs, setRuns] = useState<LiveRun[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/campaigns/${params.id}`,
          await withAuth({ method: "GET" })
        );
        if (!res.ok) throw new Error("not ok");
        const json = (await res.json()) as LiveCampaignResponse;
        if (cancelled) return;
        setMode("live");
        setCompany(json.company);
        setJobState(json.job);
        setContentsLatest(json.contentsLatest ?? {});
        setRuns(json.runs ?? []);
      } catch {
        if (cancelled) return;
        setMode("demo");
        setCompany(demoCompany);
        setJobState(demoJob);
        setContentsLatest({});
        setRuns([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, demoCompany, demoJob]);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState("");

  useEffect(() => {
    setTitle(job?.title ?? "");
    setLocation(job?.location ?? "");
    setSeniority(job?.seniority ?? "");
  }, [job?.title, job?.location, job?.seniority]);

  const [activeChannel, setActiveChannel] = useState<Channel>("website");
  const initial = useMemo(() => {
    if (mode === "live") {
      const c = contentsLatest?.website;
      return (c?.content?.body as string) ?? "";
    }
    const c = getLatestContent(params.id, "website");
    return (c?.content?.body as string) ?? "";
  }, [params.id, mode, contentsLatest]);
  const [copyBody, setCopyBody] = useState(initial);

  useEffect(() => {
    setCopyBody(initial);
  }, [initial]);

  if (!job) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold">Job not found</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Maak een nieuwe job via{" "}
          <Link className="underline underline-offset-2" href="/create">
            /create
          </Link>
          .
        </p>
      </div>
    );
  }

  const companySlug = company?.slug ?? "bedrijf";
  const jobSlug =
    mode === "live"
      ? (job as LiveJob).job_slug
      : (job as Job).jobSlug ?? "vacature";

  return (
    <RequireEmployer>
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Job Campaign
          </div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {job.title ?? "Untitled role"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Status:{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {job.status}
            </span>
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={`/jobs/${companySlug}/${jobSlug}`}
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Preview public page
          </Link>
          <Link
            href="/create"
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            New job
          </Link>
        </div>
      </div>

      <Tabs items={[...tabItems]} />

      {tab === "overview" ? (
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-8">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-medium">Checklist</div>
              <div className="mt-4 grid gap-3">
                <ChecklistItem
                  title="Structure OK"
                  ok={Boolean(job.title && (job.location || job.seniority))}
                  hint="Zorg dat titel/locatie/seniority klopt."
                />
                <ChecklistItem
                  title="Copy reviewed"
                  ok={
                    mode === "live"
                      ? Boolean(contentsLatest?.website)
                      : Boolean(getLatestContent(job.id, "website"))
                  }
                  hint="Controleer kanaal-copy en pas aan."
                />
                <ChecklistItem
                  title="Visual selected"
                  ok={true}
                  hint="Templates zijn default in v1."
                />
                <ChecklistItem
                  title="Ready to publish"
                  ok={job.status === "published"}
                  hint="Public page + export pack."
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-medium">Next actions</div>
              <div className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                <p>
                  - Review in <b>Structure</b> en <b>Copy</b>
                </p>
                <p>
                  - Kies visuals in <b>Visuals</b>
                </p>
                <p>
                  - Publish/export in <b>Publish/Export</b>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "structure" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm font-medium">Structured fields</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Seniority</label>
              <input
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={async () => {
                  if (mode === "live") {
                    const res = await fetch(
                      `/api/campaigns/${job.id}/structure`,
                      await withAuth({
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title,
                          location,
                          seniority,
                        }),
                      })
                    );
                    if (res.ok) {
                      const json = (await res.json()) as { job?: Partial<LiveJob> };
                      if (json.job)
                        setJobState(
                          (prev) => ({ ...(prev as LiveJob), ...json.job }) as LiveJob
                        );
                    }
                    return;
                  }

                  updateJob(job.id, {
                    title: title || undefined,
                    location: location || undefined,
                    seniority: seniority || undefined,
                  });
                  window.location.reload();
                }}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Save structure
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "copy" ? (
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-medium">Channels</div>
              <div className="mt-3 grid gap-2">
                {channels.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveChannel(c.id);
                      if (mode === "live") {
                        const latest = contentsLatest?.[c.id];
                        setCopyBody((latest?.content?.body as string) ?? "");
                      } else {
                        const latest = getLatestContent(job.id, c.id);
                        setCopyBody((latest?.content?.body as string) ?? "");
                      }
                    }}
                    className={`flex items-center justify-between rounded-xl border px-4 py-2 text-left text-sm ${
                      activeChannel === c.id
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <span className="font-medium">{c.label}</span>
                    <span className="text-xs opacity-80">v1</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-8">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">
                    {channels.find((c) => c.id === activeChannel)?.label} copy
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Edit direct. Later: section-level regen + version history.
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (mode === "live") {
                      const res = await fetch(
                        `/api/campaigns/${job.id}/content`,
                        await withAuth({
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            channel: activeChannel,
                            body: copyBody,
                          }),
                        })
                      );
                      if (res.ok) {
                        const json = (await res.json()) as { content?: LiveContentRow };
                        if (json.content) {
                          setContentsLatest((prev) => ({
                            ...(prev ?? {}),
                            [activeChannel]: json.content,
                          }));
                        }
                      }
                      return;
                    }

                    const latest = getLatestContent(job.id, activeChannel);
                    const nextVersion = (latest?.version ?? 1) + 1;
                    upsertContent({
                      jobId: job.id,
                      channel: activeChannel,
                      version: nextVersion,
                      state: "draft",
                      content: {
                        ...(latest?.content ?? {}),
                        body: copyBody,
                      },
                    } as Omit<JobContent, "id" | "createdAt">);
                    window.location.reload();
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  Save as new version
                </button>
              </div>

              <textarea
                value={copyBody}
                onChange={(e) => setCopyBody(e.target.value)}
                rows={18}
                className="mt-4 w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
              />
            </div>
          </div>
        </div>
      ) : null}

      {tab === "visuals" ? (
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-medium">Templates (v1)</div>
              <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                We renderen visuals als SVG (gratis, consistent). Later vervangen we dit door
                compositing + optionele AI backgrounds (preview→approve).
              </p>
              <div className="mt-4 grid gap-3">
                <TemplatePreview jobId={job.id} template="bold" label="Bold" />
                <TemplatePreview jobId={job.id} template="minimal" label="Minimal" />
                <TemplatePreview jobId={job.id} template="friendly" label="Friendly" />
              </div>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-medium">Preview</div>
              <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                <img
                  alt="Job visual preview"
                  src={`/api/assets/job/${job.id}.svg?ratio=4x5&template=bold`}
                  className="w-full"
                />
              </div>
              <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Export pack gebruikt dezelfde renders (1:1, 4:5, 9:16).
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "publish" ? (
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-medium">Public job page</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                URL:{" "}
                <Link
                  className="font-medium underline underline-offset-2"
                  href={`/jobs/${companySlug}/${jobSlug}`}
                >
                  /jobs/{companySlug}/{jobSlug}
                </Link>
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  onClick={async () => {
                    if (mode === "live") {
                      const res = await fetch(
                        `/api/campaigns/${job.id}/publish`,
                        await withAuth({
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ publish: true }),
                        })
                      );
                      if (res.ok) {
                        const json = (await res.json()) as { job?: Partial<LiveJob> };
                        if (json.job)
                          setJobState(
                            (prev) => ({ ...(prev as LiveJob), ...json.job }) as LiveJob
                          );
                      }
                      return;
                    }

                    updateJob(job.id, {
                      status: "published",
                      publishedAt: new Date().toISOString(),
                    });
                    window.location.reload();
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  Publish
                </button>
                <button
                  onClick={async () => {
                    if (mode === "live") {
                      const res = await fetch(
                        `/api/campaigns/${job.id}/publish`,
                        await withAuth({
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ publish: false }),
                        })
                      );
                      if (res.ok) {
                        const json = (await res.json()) as { job?: Partial<LiveJob> };
                        if (json.job)
                          setJobState(
                            (prev) => ({ ...(prev as LiveJob), ...json.job }) as LiveJob
                          );
                      }
                      return;
                    }

                    updateJob(job.id, { status: "draft", publishedAt: undefined });
                    window.location.reload();
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  Unpublish
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-medium">Plaatsen op kanalen</div>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Download een pakket met teksten per kanaal en beelden in 1:1, 4:5
                en 9:16. Daarna kun je het overal makkelijk plaatsen.
              </p>
              <div className="mt-4">
                <DownloadExportPackButton
                  jobId={job.id}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                />
              </div>
              <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Tip: begin met LinkedIn of Instagram. Gebruik het 4:5 beeld voor
                feeds en 9:16 voor stories/reels.
              </div>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-medium">Indeed & social</div>
              <div className="mt-3 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                <p>
                  - Indeed: staat standaard aan (na eenmalig koppelen)
                </p>
                <p>
                  - Social: download teksten + visuals en plaats waar je wil
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-medium">Generation runs</div>
              <div className="mt-4 space-y-2 text-sm">
                {(mode === "live" ? runs : listRuns(job.id)).length ? (
                  (mode === "live" ? (runs as AnyRun[]) : (listRuns(job.id) as AnyRun[])).map(
                    (r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-black"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{r.step}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {r.status}
                          </div>
                        </div>
                        {r.model ? (
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            model: {r.model}
                          </div>
                        ) : null}
                      </div>
                    )
                  )
                ) : (
                  <div className="text-zinc-500 dark:text-zinc-400">
                    No runs yet.
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-medium">Notes</div>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                In de echte implementatie bewaren we per stap: prompt, model, status, errors en cost.
                Dan kun je “regenereer alleen Indeed copy” of “regenereer visuals” doen zonder de rest opnieuw te draaien.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </RequireEmployer>
  );
}

function ChecklistItem({
  title,
  ok,
  hint,
}: {
  title: string;
  ok: boolean;
  hint: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-black">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </div>
      </div>
      <div
        className={`mt-0.5 inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ${
          ok
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
        }`}
      >
        {ok ? "OK" : "TODO"}
      </div>
    </div>
  );
}

function TemplatePreview({
  jobId,
  template,
  label,
}: {
  jobId: string;
  template: "bold" | "minimal" | "friendly";
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-black">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <img
            alt={`${label} template`}
            src={`/api/assets/job/${jobId}.svg?ratio=1x1&template=${template}`}
            className="h-12 w-12"
          />
        </div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Template</div>
        </div>
      </div>
      <a
        className="text-xs font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
        href={`/api/assets/job/${jobId}.svg?ratio=4x5&template=${template}`}
        target="_blank"
        rel="noreferrer"
      >
        Open
      </a>
    </div>
  );
}

