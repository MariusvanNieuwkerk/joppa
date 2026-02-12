"use client";

import { useMemo } from "react";

import { getCompany, listJobs, getLatestContent } from "@/lib/demo-db";

export function PublicJobClient({
  companySlug,
  jobSlug,
}: {
  companySlug: string;
  jobSlug: string;
}) {
  const company = useMemo(() => getCompany(), []);
  const job = useMemo(() => {
    const jobs = listJobs();
    return (
      jobs.find((j) => j.jobSlug === jobSlug) ??
      jobs.find((j) => j.jobSlug === decodeURIComponent(jobSlug))
    );
  }, [jobSlug]);

  const website = useMemo(() => {
    if (!job) return null;
    return getLatestContent(job.id, "website");
  }, [job]);

  if (!job || !company || company.slug !== companySlug) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold">Job page not found</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          In demo-mode komen public pages uit je lokale browser data. Maak eerst
          een job via <b>/create</b>.
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
          {job.title ?? "Untitled role"}
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
            Apply
          </a>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Public snapshot concept in v1 (demo-mode).
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="prose prose-zinc max-w-none text-sm leading-6 dark:prose-invert">
          <pre className="whitespace-pre-wrap font-sans">
            {(website?.content?.body as string) ??
              "No website copy yet. Go back to the cockpit and generate copy."}
          </pre>
        </div>
      </section>

      <section
        id="apply"
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="text-lg font-semibold">Apply</h2>
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

