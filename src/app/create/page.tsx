"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createJob, createRun, getCompany, upsertContent, updateJob } from "@/lib/demo-db";
import { mockGenerateCampaign } from "@/lib/mock-generate";

export default function CreateJobPage() {
  const router = useRouter();
  const company = useMemo(() => getCompany(), []);
  const [rawIntent, setRawIntent] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid gap-10 md:grid-cols-12 md:items-start">
      <div className="md:col-span-8">
        <h1 className="text-3xl font-semibold tracking-tight">Vacature maken</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Schrijf in je eigen woorden wat je zoekt. Joppa maakt er een nette
          vacature van (tekst + visuals).
        </p>

        <div className="mt-6 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <label className="text-sm font-medium">Vertel wie je zoekt</label>
          <textarea
            value={rawIntent}
            onChange={(e) => setRawIntent(e.target.value)}
            rows={12}
            placeholder="Bijv.: We zoeken een … voor team … Je gaat … doen. Must-haves: … Nice-to-haves: … Locatie: … Salaris (optioneel): … Startdatum: …"
            className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Bedrijfsstijl:{" "}
              {company ? (
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  {company.name}
                </span>
              ) : (
                <span>
                  nog niet ingesteld.{" "}
                  <Link
                    className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
                    href="/onboarding"
                  >
                    Stel in
                  </Link>
                </span>
              )}
            </div>

            <button
              disabled={loading || rawIntent.trim().length < 20}
              onClick={async () => {
                setLoading(true);
                try {
                  const job = createJob({ rawIntent });

                  // Runs: extract + copy + assets (demo)
                  const runExtract = createRun({
                    jobId: job.id,
                    step: "extract",
                    status: "running",
                    model: "demo",
                    prompt: "mock extractor",
                  });

                  const generated = mockGenerateCampaign({ rawIntent, company });
                  updateJob(job.id, generated.jobPatch);
                  createRun({
                    jobId: job.id,
                    step: "extract",
                    status: "succeeded",
                    model: "demo",
                    prompt: runExtract.prompt,
                  });

                  const runCopy = createRun({
                    jobId: job.id,
                    step: "copy",
                    status: "running",
                    model: "demo",
                    prompt: "mock copywriter",
                  });

                  for (const c of generated.contents) {
                    upsertContent({
                      jobId: job.id,
                      channel: c.channel,
                      version: 1,
                      state: "draft",
                      content: c.content,
                    });
                  }
                  createRun({
                    jobId: job.id,
                    step: "copy",
                    status: "succeeded",
                    model: "demo",
                    prompt: runCopy.prompt,
                  });

                  createRun({
                    jobId: job.id,
                    step: "assets",
                    status: "succeeded",
                    model: "template",
                    prompt: "template-based visuals",
                  });

                  router.push(`/campaigns/${job.id}`);
                } finally {
                  setLoading(false);
                }
              }}
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {loading ? "Even bezig…" : "Maak mijn vacature"}
            </button>
          </div>
        </div>
      </div>

      <div className="md:col-span-4">
        <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm font-medium">Wat je krijgt</div>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            <li>Een nette vacaturetekst (voor je website)</li>
            <li>Korte teksten voor LinkedIn en socials</li>
            <li>Een set visuals in handige formaten</li>
            <li>Een export die je zo kunt plaatsen</li>
          </ul>
          <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-900/80 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
            Tip: begin simpel. Je kunt straks altijd bijschaven, of een andere
            stijl kiezen voor de visuals.
          </div>
        </div>
      </div>
    </div>
  );
}

