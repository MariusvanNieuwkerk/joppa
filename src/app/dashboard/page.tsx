"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RequireEmployer } from "@/components/require-employer";
import { deleteJob, getCompany, listJobs, updateJob } from "@/lib/demo-db";
import type { Company, Job } from "@/lib/types";
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

type LiveJobRow = {
  id: string;
  status: "draft" | "published" | "archived";
  title: string | null;
  location: string | null;
  seniority: string | null;
  employment_type: string | null;
  job_slug: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type LiveDashboardResponse = { company: LiveCompany; jobs: LiveJobRow[] };

function formatDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("nl-NL", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function DashboardPage() {
  const [mode, setMode] = useState<"live" | "demo">("live");
  const [jobs, setJobs] = useState<Job[]>(() => listJobs());
  const [company, setCompany] = useState<Company | LiveCompany | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard", await withAuth({ method: "GET" }));
        if (!res.ok) throw new Error("not ok");
        const json = (await res.json()) as LiveDashboardResponse;
        if (cancelled) return;
        setMode("live");
        setCompany(json.company);
        setJobs(
          (json.jobs ?? []).map((j) => ({
            id: j.id,
            companyId: json.company?.id ?? "company",
            status: j.status,
            rawIntent: "",
            title: j.title ?? undefined,
            location: j.location ?? undefined,
            seniority: j.seniority ?? undefined,
            employmentType: j.employment_type ?? undefined,
            extractedData: {},
            jobSlug: j.job_slug ?? undefined,
            publishedAt: j.published_at ?? undefined,
            createdAt: j.created_at ?? new Date().toISOString(),
            updatedAt: j.updated_at ?? new Date().toISOString(),
          })) as Job[]
        );
      } catch {
        if (cancelled) return;
        setMode("demo");
        setCompany(getCompany());
        setJobs(listJobs());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const publishedCount = useMemo(
    () => jobs.filter((j) => j.status === "published").length,
    [jobs]
  );

  return (
    <RequireEmployer>
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Mijn vacatures</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {jobs.length} totaal · {publishedCount} live
          </p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Nog geen vacatures
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Maak je eerste vacature door in je eigen woorden te beschrijven wie je
            zoekt.
          </p>
          <div className="mt-4">
            <Link
              href="/create"
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Vacature maken
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {job.title ?? "Nog geen titel"}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {job.location ? job.location : "Locatie in overleg"} ·{" "}
                      {formatDate(job.updatedAt)}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      job.status === "published"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    }`}
                  >
                    {job.status === "published" ? "Live" : "Concept"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/create?id=${job.id}`}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
                  >
                    Bewerken
                  </Link>
                  {job.status !== "published" ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Weet je zeker dat je deze conceptvacature wilt verwijderen?"))
                          return;
                        if (mode === "live") {
                          const res = await fetch(
                            `/api/campaigns/${job.id}`,
                            await withAuth({ method: "DELETE" })
                          );
                          const json = (await res.json().catch(() => ({}))) as { error?: string };
                          if (!res.ok) {
                            alert(json.error ?? "Verwijderen mislukt.");
                            return;
                          }
                          const res2 = await fetch("/api/dashboard", await withAuth({ method: "GET" }));
                          if (res2.ok) {
                            const json2 = (await res2.json()) as LiveDashboardResponse;
                            setCompany(json2.company);
                            setJobs(
                              (json2.jobs ?? []).map((j) => ({
                                id: j.id,
                                companyId: json2.company?.id ?? "company",
                                status: j.status,
                                rawIntent: "",
                                title: j.title ?? undefined,
                                location: j.location ?? undefined,
                                seniority: j.seniority ?? undefined,
                                employmentType: j.employment_type ?? undefined,
                                extractedData: {},
                                jobSlug: j.job_slug ?? undefined,
                                publishedAt: j.published_at ?? undefined,
                                createdAt: j.created_at ?? new Date().toISOString(),
                                updatedAt: j.updated_at ?? new Date().toISOString(),
                              })) as Job[]
                            );
                          }
                          return;
                        }
                        deleteJob(job.id);
                        setJobs(listJobs());
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:bg-black dark:text-rose-300 dark:hover:bg-rose-950"
                    >
                      Verwijderen
                    </button>
                  ) : null}
                  {job.status !== "published" ? (
                    <button
                      onClick={async () => {
                        if (mode === "live") {
                          await fetch(
                            `/api/campaigns/${job.id}/publish`,
                            await withAuth({
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ publish: true }),
                            })
                          );
                          const res = await fetch("/api/dashboard", await withAuth({ method: "GET" }));
                          if (res.ok) {
                            const json = (await res.json()) as LiveDashboardResponse;
                            setCompany(json.company);
                            setJobs(
                              (json.jobs ?? []).map((j) => ({
                                id: j.id,
                                companyId: json.company?.id ?? "company",
                                status: j.status,
                                rawIntent: "",
                                title: j.title ?? undefined,
                                location: j.location ?? undefined,
                                seniority: j.seniority ?? undefined,
                                employmentType: j.employment_type ?? undefined,
                                extractedData: {},
                                jobSlug: j.job_slug ?? undefined,
                                publishedAt: j.published_at ?? undefined,
                                createdAt: j.created_at ?? new Date().toISOString(),
                                updatedAt: j.updated_at ?? new Date().toISOString(),
                              })) as Job[]
                            );
                          }
                          return;
                        }

                        updateJob(job.id, {
                          status: "published",
                          publishedAt: new Date().toISOString(),
                        });
                        setJobs(listJobs());
                      }}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    >
                      Live zetten
                    </button>
                  ) : (
                    <Link
                      href={`/jobs/${company?.slug ?? "bedrijf"}/${job.jobSlug}`}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    >
                      Bekijken
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/tablet table */}
          <div className="hidden overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:block">
            <div className="grid grid-cols-12 gap-3 border-b border-amber-200/80 bg-amber-50/50 px-5 py-3 text-xs font-medium text-amber-900/80 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
              <div className="col-span-5">Vacature</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Laatst aangepast</div>
              <div className="col-span-2 text-right">Acties</div>
            </div>

            <div className="divide-y divide-amber-100 dark:divide-zinc-800">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="grid grid-cols-12 items-center gap-3 px-5 py-4"
                >
                  <div className="col-span-5">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {job.title ?? "Nog geen titel"}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {job.location ? job.location : "Locatie in overleg"}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        job.status === "published"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      }`}
                    >
                      {job.status === "published" ? "Live" : "Concept"}
                    </span>
                  </div>

                  <div className="col-span-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(job.updatedAt)}
                  </div>

                  <div className="col-span-2 flex justify-end gap-2">
                    <Link
                      href={`/create?id=${job.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
                    >
                      Bewerken
                    </Link>
                    {job.status !== "published" ? (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("Weet je zeker dat je deze conceptvacature wilt verwijderen?"))
                            return;
                          if (mode === "live") {
                            const res = await fetch(
                              `/api/campaigns/${job.id}`,
                              await withAuth({ method: "DELETE" })
                            );
                            const json = (await res.json().catch(() => ({}))) as { error?: string };
                            if (!res.ok) {
                              alert(json.error ?? "Verwijderen mislukt.");
                              return;
                            }
                            const res2 = await fetch("/api/dashboard", await withAuth({ method: "GET" }));
                            if (res2.ok) {
                              const json2 = (await res2.json()) as LiveDashboardResponse;
                              setCompany(json2.company);
                              setJobs(
                                (json2.jobs ?? []).map((j) => ({
                                  id: j.id,
                                  companyId: json2.company?.id ?? "company",
                                  status: j.status,
                                  rawIntent: "",
                                  title: j.title ?? undefined,
                                  location: j.location ?? undefined,
                                  seniority: j.seniority ?? undefined,
                                  employmentType: j.employment_type ?? undefined,
                                  extractedData: {},
                                  jobSlug: j.job_slug ?? undefined,
                                  publishedAt: j.published_at ?? undefined,
                                  createdAt: j.created_at ?? new Date().toISOString(),
                                  updatedAt: j.updated_at ?? new Date().toISOString(),
                                })) as Job[]
                              );
                            }
                            return;
                          }
                          deleteJob(job.id);
                          setJobs(listJobs());
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-rose-200 bg-white px-3 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:bg-black dark:text-rose-300 dark:hover:bg-rose-950"
                      >
                        Verwijderen
                      </button>
                    ) : null}
                    {job.status !== "published" ? (
                      <button
                        onClick={async () => {
                          if (mode === "live") {
                            await fetch(
                              `/api/campaigns/${job.id}/publish`,
                              await withAuth({
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ publish: true }),
                              })
                            );
                            const res = await fetch("/api/dashboard", await withAuth({ method: "GET" }));
                            if (res.ok) {
                              const json = (await res.json()) as LiveDashboardResponse;
                              setCompany(json.company);
                              setJobs(
                                (json.jobs ?? []).map((j) => ({
                                  id: j.id,
                                  companyId: json.company?.id ?? "company",
                                  status: j.status,
                                  rawIntent: "",
                                  title: j.title ?? undefined,
                                  location: j.location ?? undefined,
                                  seniority: j.seniority ?? undefined,
                                  employmentType: j.employment_type ?? undefined,
                                  extractedData: {},
                                  jobSlug: j.job_slug ?? undefined,
                                  publishedAt: j.published_at ?? undefined,
                                  createdAt: j.created_at ?? new Date().toISOString(),
                                  updatedAt: j.updated_at ?? new Date().toISOString(),
                                })) as Job[]
                              );
                            }
                            return;
                          }

                          updateJob(job.id, {
                            status: "published",
                            publishedAt: new Date().toISOString(),
                          });
                          setJobs(listJobs());
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-950 px-3 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                      >
                        Live zetten
                      </button>
                    ) : (
                      <Link
                        href={`/jobs/${company?.slug ?? "bedrijf"}/${job.jobSlug}`}
                        className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-950 px-3 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                      >
                        Bekijken
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="rounded-2xl border border-amber-200/80 bg-white p-5 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
          Indeed staat standaard aan
        </div>
        <p className="mt-1 leading-6">
          Je publiceert je vacature in Joppa. Daarna kan hij ook op Indeed komen
          (meestal is dat één keer koppelen, daarna gaat het vanzelf).
        </p>
      </div>
    </div>
    </RequireEmployer>
  );
}

