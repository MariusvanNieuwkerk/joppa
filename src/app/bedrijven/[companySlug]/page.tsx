"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getCompany, listJobs } from "@/lib/demo-db";
import type { Company, Job } from "@/lib/types";

type PublicCompany = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  brand_primary_color: string | null;
  brand_tone: string | null;
  brand_pitch: string | null;
  created_at: string;
};

type PublicJob = {
  id: string;
  title: string | null;
  location: string | null;
  seniority: string | null;
  job_slug: string;
  published_at: string | null;
  status: "published";
};

type PublicCompanyResponse = { company: PublicCompany; jobs: PublicJob[] };

export default function CompanyPage({
  params,
}: {
  params: { companySlug: string };
}) {
  const demoCompany = useMemo(() => getCompany(), []);
  const demoJobs = useMemo(() => listJobs(), []);

  const [mode, setMode] = useState<"live" | "demo">("live");
  const [company, setCompany] = useState<Company | PublicCompany | null>(null);
  const [jobs, setJobs] = useState<Array<Job | PublicJob>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/company/${params.companySlug}`);
        if (!res.ok) throw new Error("not ok");
        const json = (await res.json()) as PublicCompanyResponse;
        if (cancelled) return;
        setMode("live");
        setCompany(json.company);
        setJobs(json.jobs ?? []);
      } catch {
        if (cancelled) return;
        setMode("demo");
        setCompany(demoCompany);
        setJobs(demoJobs);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.companySlug, demoCompany, demoJobs]);

  const companySlug = company?.slug ?? demoCompany?.slug;

  if (!company || companySlug !== params.companySlug) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold">Bedrijfspagina niet gevonden</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          {mode === "demo"
            ? "In demo-modus komt deze pagina uit je lokale browserdata. Stel eerst je bedrijfsstijl in of maak een vacature."
            : "Deze bedrijfspagina bestaat (nog) niet."}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/onboarding"
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Bedrijfsstijl instellen
          </Link>
          <Link
            href="/create"
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Vacature maken
          </Link>
        </div>
      </div>
    );
  }

  const liveJobs =
    mode === "live"
      ? jobs
      : jobs.filter((j) => (j as Job).status === "published");

  const pitch =
    mode === "live"
      ? (company as PublicCompany).brand_pitch
      : (company as Company).brandPitch;

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Bedrijf
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {company.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {pitch ? pitch : "Bekijk onze openstaande vacatures."}
            </p>
            {company.website ? (
              <p className="mt-2 text-sm">
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
                >
                  {company.website}
                </a>
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/create"
              className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Nieuwe vacature
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Mijn vacatures
            </Link>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Openstaande vacatures</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {liveJobs.length} live
            </p>
          </div>
        </div>

        {liveJobs.length === 0 ? (
          <div className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Nog geen live vacatures
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Maak een vacature en zet hem live. Dan verschijnt hij hier op je
              bedrijfspagina.
            </p>
            <div className="mt-4">
              <Link
                href="/create"
                className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Vacature maken
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {liveJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${company.slug}/${
                  mode === "live"
                    ? (job as PublicJob).job_slug
                    : (job as Job).jobSlug
                }`}
                className="group rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm transition-colors hover:bg-amber-50/40 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-black"
              >
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {job.title ?? "Vacature"}
                </div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {job.location ? job.location : "Locatie in overleg"}
                  {job.seniority ? ` · ${job.seniority}` : ""}
                </div>
                <div className="mt-3 text-xs font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100">
                  Bekijk vacature →
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

