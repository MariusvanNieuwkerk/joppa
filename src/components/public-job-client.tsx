"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getCompany, listJobs, getLatestContent } from "@/lib/demo-db";
import type { Company, Job, JobContent } from "@/lib/types";

type PublicJob = {
  id: string;
  status: "published";
  title: string | null;
  location: string | null;
  seniority: string | null;
  employment_type: string | null;
  job_slug: string;
  brand_snapshot_public: { name?: string | null; website?: string | null } | null;
};

type WebsiteContentRow = {
  content?: { body?: string | null };
};

type PublicJobResponse = { job: PublicJob; websiteContent: WebsiteContentRow | null };

type PublicCompanySnapshot = Pick<Company, "slug" | "name" | "website">;

export function PublicJobClient({
  companySlug,
  jobSlug,
}: {
  companySlug: string;
  jobSlug: string;
}) {
  const demoCompany = useMemo(() => getCompany(), []);
  const demoJob = useMemo(() => {
    const jobs = listJobs();
    return (
      jobs.find((j) => j.jobSlug === jobSlug) ??
      jobs.find((j) => j.jobSlug === decodeURIComponent(jobSlug))
    );
  }, [jobSlug]);

  const [mode, setMode] = useState<"live" | "demo">("live");
  const [job, setJob] = useState<PublicJob | Job | null>(null);
  const [company, setCompany] = useState<PublicCompanySnapshot | Company | null>(null);
  const [websiteContent, setWebsiteContent] = useState<WebsiteContentRow | JobContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/job/${companySlug}/${jobSlug}`);
        if (!res.ok) throw new Error("not ok");
        const json = (await res.json()) as PublicJobResponse;
        if (cancelled) return;
        setMode("live");
        setJob(json.job);
        setWebsiteContent(json.websiteContent);
        const snap = json.job?.brand_snapshot_public ?? {};
        setCompany({
          slug: companySlug,
          name: snap?.name ?? "Bedrijf",
          website: snap?.website ?? undefined,
        });
      } catch {
        if (cancelled) return;
        setMode("demo");
        setCompany(demoCompany);
        setJob(demoJob ?? null);
        setWebsiteContent(demoJob ? getLatestContent(demoJob.id, "website") : null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companySlug, jobSlug, demoCompany, demoJob]);

  if (!job || !company || company.slug !== companySlug) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold">Vacature niet gevonden</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          {mode === "demo"
            ? "In demo-modus komen publieke pagina’s uit je lokale browserdata. Maak eerst een vacature via /create."
            : "Deze vacature is (nog) niet live."}
        </p>
      </div>
    );
  }

  return (
    <article className="space-y-6">
      <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {company.name}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {job.title ?? "Zonder titel"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          {job.location ? job.location : "Locatie in overleg"}
          {job.seniority ? ` · ${job.seniority}` : ""}
        </p>

        <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <img
            alt="Job visual"
            src={`/api/assets/job/${job.id}.svg?ratio=4x5&template=bold`}
            className="w-full"
          />
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <a
            href="#apply"
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Solliciteer
          </a>
          <Link
            href={`/bedrijven/${company.slug}`}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Meer vacatures van {company.name}
          </Link>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {mode === "live" ? "Live vacature" : "Demo-modus"}
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="prose prose-zinc max-w-none text-sm leading-6 dark:prose-invert">
          <pre className="whitespace-pre-wrap font-sans">
            {(websiteContent?.content?.body as string) ??
              "Nog geen vacaturetekst. Ga terug naar de cockpit en genereer tekst."}
          </pre>
        </div>
      </section>

      <section
        id="apply"
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="text-lg font-semibold">Solliciteren</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          In v1 koppelen we hier je ATS link / formulier. Voor nu is dit een
          placeholder.
        </p>
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
          Later: tracking links + analytics events (views/apply_clicks).
        </div>
      </section>
    </article>
  );
}

