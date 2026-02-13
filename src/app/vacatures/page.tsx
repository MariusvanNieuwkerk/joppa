"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuthRole } from "@/hooks/use-auth-role";

type PublicJobListItem = {
  id: string;
  title: string | null;
  location: string | null;
  seniority: string | null;
  employment_type: string | null;
  job_slug: string;
  published_at: string | null;
  company: { name: string; slug: string } | null;
};

function uniq(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

export default function VacaturesPage() {
  const auth = useAuthRole();
  const viewerRole: "loading" | "logged_out" | "employer" | "candidate" | "unknown" =
    auth.status === "loading"
      ? "loading"
      : auth.status === "logged_out"
        ? "logged_out"
        : auth.role;

  const [jobs, setJobs] = useState<PublicJobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState("");
  const [employmentType, setEmploymentType] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/public/jobs");
        const json = (await res.json()) as { jobs?: PublicJobListItem[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Kon vacatures niet laden.");
        if (cancelled) return;
        setJobs(json.jobs ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Er ging iets mis.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const locations = useMemo(
    () => uniq(jobs.map((j) => j.location)).sort((a, b) => a.localeCompare(b)),
    [jobs]
  );
  const seniorities = useMemo(
    () => uniq(jobs.map((j) => j.seniority)).sort((a, b) => a.localeCompare(b)),
    [jobs]
  );
  const employmentTypes = useMemo(
    () =>
      uniq(jobs.map((j) => j.employment_type)).sort((a, b) =>
        a.localeCompare(b)
      ),
    [jobs]
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (location && (j.location ?? "") !== location) return false;
      if (seniority && (j.seniority ?? "") !== seniority) return false;
      if (employmentType && (j.employment_type ?? "") !== employmentType) return false;
      if (!qq) return true;
      const hay = [
        j.title,
        j.location,
        j.seniority,
        j.employment_type,
        j.company?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(qq);
    });
  }, [jobs, q, location, seniority, employmentType]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Vacatures</h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Bekijk alle live vacatures. Gebruik de filters om snel te vinden wat je
          zoekt.
        </p>
      </header>

      <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-6">
            <label className="text-sm font-medium">Zoeken</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Bijv. ‘sales’, ‘Amsterdam’, ‘senior’…"
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Locatie</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
            >
              <option value="">Alles</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Niveau</label>
            <select
              value={seniority}
              onChange={(e) => setSeniority(e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
            >
              <option value="">Alles</option>
              {seniorities.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Type</label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
            >
              <option value="">Alles</option>
              {employmentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            {loading ? "Laden…" : `${filtered.length} vacature(s)`}
          </div>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setLocation("");
              setSeniority("");
              setEmploymentType("");
            }}
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            Filters wissen
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-5 text-sm text-amber-900/90 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
          {error}
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Geen vacatures gevonden
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Probeer een andere zoekterm of wis je filters.
          </p>
          <div className="mt-4">
            {viewerRole === "employer" ? (
              <Link
                href="/create"
                className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Nieuwe vacature maken
              </Link>
            ) : viewerRole === "candidate" ? (
              <Link
                href="/kandidaat"
                className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Naar kandidaatomgeving
              </Link>
            ) : viewerRole === "logged_out" ? (
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Log in
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((j) => {
          const companySlug = j.company?.slug ?? "bedrijf";
          const jobSlug = j.job_slug;
          return (
            <Link
              key={j.id}
              href={`/jobs/${companySlug}/${jobSlug}`}
              className="group rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm transition-colors hover:bg-amber-50/40 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-black"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {j.title ?? "Vacature"}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {j.company?.name ?? "Bedrijf"}
                  </div>
                  <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {j.location ? j.location : "Locatie in overleg"}
                    {j.seniority ? ` · ${j.seniority}` : ""}
                    {j.employment_type ? ` · ${j.employment_type}` : ""}
                  </div>
                </div>
                <span className="mt-0.5 text-xs font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100">
                  Bekijk →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

