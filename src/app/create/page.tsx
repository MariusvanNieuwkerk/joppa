"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { RequireEmployer } from "@/components/require-employer";
import {
  createJob,
  createRun,
  getCompany,
  upsertContent,
  updateJob,
} from "@/lib/demo-db";
import { mockGenerateCampaign } from "@/lib/mock-generate";
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

type LiveDashboardResponse = { company: LiveCompany; jobs: unknown[] };

type WizardState = {
  // Step 1
  title: string;
  location: string;
  employmentType: string;
  seniority: string;
  hoursPerWeek: string;
  workplace: "on-site" | "hybrid" | "remote";

  // Step 2
  responsibilities: string[];
  responsibilitiesFreeText: string;

  // Step 3
  mustHaves: string[];
  niceToHaves: string[];

  // Step 4
  salary: string;
  benefits: string[];

  // Step 5
  toneOverride: string;
  channels: {
    website: boolean;
    indeed: boolean;
    linkedin: boolean;
    instagram: boolean;
    facebook: boolean;
    tiktok: boolean;
  };
  visualTemplate: "clean" | "bold" | "photo";
};

const steps = [
  { id: "basics", label: "Basis" },
  { id: "work", label: "Werk" },
  { id: "requirements", label: "Eisen" },
  { id: "offer", label: "Aanbod" },
  { id: "tone", label: "Stijl & kanalen" },
  { id: "review", label: "Check & maken" },
] as const;

const benefitPresets = [
  "Reiskostenvergoeding",
  "Pensioen",
  "Opleidingsbudget",
  "Flexibele werktijden",
  "Bonusregeling",
  "Teamuitjes",
] as const;

function isBrandComplete(company: LiveCompany | null) {
  if (!company) return false;
  if (!company.name || company.name.trim().length < 2) return false;
  if (!company.brand_primary_color) return false;
  if (!company.brand_tone) return false;
  return true;
}

function normalizeBullets(input: string) {
  return input
    .split(/\r?\n|•|- |\u2022|\t|;/g)
    .map((s) => s.trim())
    .map((s) => s.replace(/^\d+[.)]\s*/, ""))
    .filter(Boolean)
    .slice(0, 12);
}

function buildRawIntent(companyName: string | null, state: WizardState) {
  const lines: string[] = [];
  lines.push(`Bedrijf: ${companyName ?? "Bedrijf"}`);
  lines.push("");
  lines.push("Rol basics:");
  lines.push(`- Titel: ${state.title}`);
  lines.push(`- Locatie: ${state.location}`);
  lines.push(`- Werkplek: ${state.workplace}`);
  if (state.hoursPerWeek.trim()) lines.push(`- Uren: ${state.hoursPerWeek}`);
  if (state.employmentType.trim()) lines.push(`- Type: ${state.employmentType}`);
  if (state.seniority.trim()) lines.push(`- Niveau: ${state.seniority}`);
  lines.push("");

  lines.push("Wat ga je doen:");
  for (const b of state.responsibilities) lines.push(`- ${b}`);
  lines.push("");

  lines.push("Must-haves:");
  for (const b of state.mustHaves) lines.push(`- ${b}`);
  lines.push("");

  if (state.niceToHaves.length) {
    lines.push("Nice-to-haves:");
    for (const b of state.niceToHaves) lines.push(`- ${b}`);
    lines.push("");
  }

  lines.push("Aanbod:");
  if (state.salary.trim()) lines.push(`- Salaris: ${state.salary}`);
  if (state.benefits.length) lines.push(`- Benefits: ${state.benefits.join(", ")}`);
  lines.push("");

  lines.push("Extra:");
  if (state.toneOverride.trim()) lines.push(`- Tone-of-voice (override): ${state.toneOverride}`);
  lines.push(`- Kanalen: ${Object.entries(state.channels)
    .filter(([, on]) => on)
    .map(([k]) => k)
    .join(", ")}`);
  lines.push(`- Visual template: ${state.visualTemplate}`);

  return lines.join("\n");
}

export default function CreateJobPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const editId = (sp.get("id") ?? "").trim();
  const isEditing = Boolean(editId);

  const demoCompany = useMemo(() => getCompany(), []);
  const [mode, setMode] = useState<"live" | "demo">("live");
  const [liveCompany, setLiveCompany] = useState<LiveCompany | null>(null);
  const companyName = mode === "live" ? liveCompany?.name ?? null : demoCompany?.name ?? null;

  const storageKey = useMemo(
    () => `joppa.create.wizard.v1:${isEditing ? editId : "new"}`,
    [editId, isEditing]
  );
  const [stepIdx, setStepIdx] = useState(0);
  const [state, setState] = useState<WizardState>(() => ({
    title: "",
    location: "",
    employmentType: "Vast",
    seniority: "Medior",
    hoursPerWeek: "32-40",
    workplace: "on-site",
    responsibilities: [],
    responsibilitiesFreeText: "",
    mustHaves: [],
    niceToHaves: [],
    salary: "In overleg",
    benefits: [],
    toneOverride: "",
    channels: {
      website: true,
      indeed: true,
      linkedin: true,
      instagram: false,
      facebook: false,
      tiktok: false,
    },
    visualTemplate: "clean",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  // Load company (live) + restore draft
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard", await withAuth({ method: "GET" }));
        if (!res.ok) throw new Error("not ok");
        const json = (await res.json()) as LiveDashboardResponse;
        if (cancelled) return;
        setMode("live");
        setLiveCompany(json.company ?? null);
      } catch {
        if (cancelled) return;
        setMode("demo");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<WizardState>;
      setState((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, storageKey]);

  // If editing: prefill from existing campaign (structured input if present)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isEditing) return;
      try {
        const res = await fetch(`/api/campaigns/${editId}`, await withAuth({ method: "GET" }));
        const json = (await res.json().catch(() => ({}))) as {
          job?: {
            id: string;
            title: string | null;
            location: string | null;
            seniority: string | null;
            employment_type: string | null;
            raw_intent?: string | null;
            extracted_data?: unknown;
          };
        };
        if (!res.ok) throw new Error("not ok");
        if (cancelled) return;

        const job = json.job;
        const basePatch: Partial<WizardState> = {
          title: job?.title ?? "",
          location: job?.location ?? "",
          seniority: job?.seniority ?? "Medior",
          employmentType: job?.employment_type ?? "Vast",
        };
        const input = (job?.extracted_data as { input_v1?: unknown } | null)?.input_v1;
        const inputObj = input && typeof input === "object" ? (input as Partial<WizardState>) : null;
        setState((prev) => ({
          ...prev,
          ...basePatch,
          ...(inputObj ?? {}),
        }));
        setStepIdx(0);
      } catch {
        // ignore (keep draft)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, isEditing]);

  const brandOk = mode === "demo" ? Boolean(demoCompany?.brandTone) : isBrandComplete(liveCompany);

  function stepValid(i: number) {
    const s = state;
    if (i === 0) return s.title.trim().length >= 2 && s.location.trim().length >= 2;
    if (i === 1) return s.responsibilities.length >= 3;
    if (i === 2) return s.mustHaves.length >= 3;
    if (i === 3) return s.salary.trim().length >= 2;
    if (i === 4) return s.channels.website || s.channels.indeed;
    return true;
  }

  async function aiMakeBullets() {
    setError(null);
    const text = state.responsibilitiesFreeText.trim();
    if (!text) {
      setError("Plak eerst wat tekst (of type 2–3 zinnen).");
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch(
        "/api/assist/bullets",
        await withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            tone: (mode === "live" ? liveCompany?.brand_tone : demoCompany?.brandTone) ?? undefined,
          }),
        })
      );
      const json = (await res.json().catch(() => ({}))) as { bullets?: string[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Kon bullets niet maken.");
      const bullets = (json.bullets ?? []).filter(Boolean).slice(0, 10);
      if (!bullets.length) throw new Error("Geen bullets gevonden. Probeer iets meer context.");
      setState((p) => ({ ...p, responsibilities: bullets }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Er ging iets mis.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <RequireEmployer>
      <div className="grid gap-10 md:grid-cols-12 md:items-start">
        <div className="md:col-span-8">
          <h1 className="text-3xl font-semibold tracking-tight">Vacature maken</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Stap voor stap. Je vult de basis in, Joppa maakt er een nette vacature
            van (tekst + visuals).
          </p>

          {!brandOk ? (
            <div className="mt-6 rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Eerst bedrijfsstijl instellen
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Zodat je vacature meteen de juiste tone of voice en uitstraling heeft.
                Dit is één keer invullen (5 minuten).
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/onboarding"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  Bedrijfsstijl invullen
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              {/* Stepper */}
              <div className="flex flex-wrap gap-2">
                {steps.map((s, i) => {
                  const active = i === stepIdx;
                  const done = i < stepIdx && stepValid(i);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStepIdx(i)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                          : done
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                            : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-black dark:text-zinc-200"
                      }`}
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-[11px] dark:bg-white/10">
                        {i + 1}
                      </span>
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Step content */}
              <div className="mt-5 space-y-4">
                {stepIdx === 0 ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Functietitel</label>
                        <input
                          value={state.title}
                          onChange={(e) => setState((p) => ({ ...p, title: e.target.value }))}
                          placeholder="Bijv. HR medewerker"
                          className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Locatie</label>
                        <input
                          value={state.location}
                          onChange={(e) => setState((p) => ({ ...p, location: e.target.value }))}
                          placeholder="Bijv. Rotterdam"
                          className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Werkplek</label>
                        <select
                          value={state.workplace}
                          onChange={(e) =>
                            setState((p) => ({
                              ...p,
                              workplace: e.target.value as WizardState["workplace"],
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
                        >
                          <option value="on-site">Op locatie</option>
                          <option value="hybrid">Hybride</option>
                          <option value="remote">Remote</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Uren per week</label>
                        <input
                          value={state.hoursPerWeek}
                          onChange={(e) =>
                            setState((p) => ({ ...p, hoursPerWeek: e.target.value }))
                          }
                          placeholder="Bijv. 32-40"
                          className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Contracttype</label>
                        <select
                          value={state.employmentType}
                          onChange={(e) =>
                            setState((p) => ({ ...p, employmentType: e.target.value }))
                          }
                          className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
                        >
                          <option>Vast</option>
                          <option>Tijdelijk</option>
                          <option>Stage</option>
                          <option>Freelance</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Niveau</label>
                        <select
                          value={state.seniority}
                          onChange={(e) => setState((p) => ({ ...p, seniority: e.target.value }))}
                          className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
                        >
                          <option>Junior</option>
                          <option>Medior</option>
                          <option>Senior</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Tip: houd het simpel. Je kunt later altijd verfijnen.
                    </p>
                  </>
                ) : null}

                {stepIdx === 1 ? (
                  <>
                    <div>
                      <label className="text-sm font-medium">
                        Wat gaat iemand vooral doen? (3–6 bullets)
                      </label>
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        <textarea
                          value={state.responsibilitiesFreeText}
                          onChange={(e) =>
                            setState((p) => ({ ...p, responsibilitiesFreeText: e.target.value }))
                          }
                          rows={6}
                          placeholder="Plak hier je tekst (2–3 zinnen). Bijvoorbeeld: ‘Je plant HR zaken, beantwoordt vragen, verwerkt contracten…’"
                          className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
                        />
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            Joppa kan helpen
                          </div>
                          <p className="mt-1 leading-5">
                            Plak ruwe tekst en klik “Maak bullets”. Daarna kun je
                            bullets aanpassen of verwijderen.
                          </p>
                          <button
                            type="button"
                            disabled={aiBusy}
                            onClick={aiMakeBullets}
                            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                          >
                            {aiBusy ? "Even bezig…" : "AI: maak bullets"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setState((p) => ({
                                ...p,
                                responsibilities: normalizeBullets(p.responsibilitiesFreeText),
                              }))
                            }
                            className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
                          >
                            Zonder AI: bullets uit tekst
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {state.responsibilities.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            value={b}
                            onChange={(e) =>
                              setState((p) => ({
                                ...p,
                                responsibilities: p.responsibilities.map((x, i) =>
                                  i === idx ? e.target.value : x
                                ),
                              }))
                            }
                            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setState((p) => ({
                                ...p,
                                responsibilities: p.responsibilities.filter((_, i) => i !== idx),
                              }))
                            }
                            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
                          >
                            Verwijder
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setState((p) => ({ ...p, responsibilities: [...p.responsibilities, ""] }))
                        }
                        className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
                      >
                        + Bullet toevoegen
                      </button>
                    </div>
                  </>
                ) : null}

                {stepIdx === 2 ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <BulletEditor
                        title="Must-haves (min. 3)"
                        hint="Dingen die echt nodig zijn."
                        items={state.mustHaves}
                        onChange={(items) => setState((p) => ({ ...p, mustHaves: items }))}
                      />
                      <BulletEditor
                        title="Nice-to-haves (optioneel)"
                        hint="Mooi meegenomen."
                        items={state.niceToHaves}
                        onChange={(items) => setState((p) => ({ ...p, niceToHaves: items }))}
                      />
                    </div>
                  </>
                ) : null}

                {stepIdx === 3 ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Salaris</label>
                        <input
                          value={state.salary}
                          onChange={(e) => setState((p) => ({ ...p, salary: e.target.value }))}
                          placeholder="Bijv. €2800-€3400 of In overleg"
                          className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
                        />
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          Tip: “In overleg” is prima. Je kunt later altijd een range toevoegen.
                        </p>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Benefits</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {benefitPresets.map((b) => {
                            const on = state.benefits.includes(b);
                            return (
                              <button
                                key={b}
                                type="button"
                                onClick={() =>
                                  setState((p) => ({
                                    ...p,
                                    benefits: on
                                      ? p.benefits.filter((x) => x !== b)
                                      : [...p.benefits, b],
                                  }))
                                }
                                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                                  on
                                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                                    : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-black dark:text-zinc-200"
                                }`}
                              >
                                {b}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                {stepIdx === 4 ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Tone of voice (optioneel)</label>
                        <input
                          value={state.toneOverride}
                          onChange={(e) =>
                            setState((p) => ({ ...p, toneOverride: e.target.value }))
                          }
                          placeholder="Bijv. warm, menselijk, nuchter"
                          className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
                        />
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          Default gebruikt Joppa jullie bedrijfsstijl. Hier kun je afwijken per vacature.
                        </p>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Kanalen</div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(state.channels).map(([k, v]) => (
                            <label
                              key={k}
                              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-black"
                            >
                              <input
                                type="checkbox"
                                checked={v}
                                onChange={(e) =>
                                  setState((p) => ({
                                    ...p,
                                    channels: { ...p.channels, [k]: e.target.checked },
                                  }))
                                }
                              />
                              <span className="capitalize">{k}</span>
                            </label>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          Website + Indeed staan standaard aan.
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium">Visuals</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(
                          [
                            { id: "clean", label: "Template (clean)" },
                            { id: "bold", label: "Template (bold)" },
                            { id: "photo", label: "Foto-stijl (later)" },
                          ] as const
                        ).map((t) => {
                          const on = state.visualTemplate === t.id;
                          const disabled = t.id === "photo";
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={disabled}
                              onClick={() =>
                                setState((p) => ({ ...p, visualTemplate: t.id }))
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                                on
                                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                                  : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-black dark:text-zinc-200"
                              }`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        In v1 gebruiken we templates (super goedkoop en consistent). AI-beelden voegen we later toe met “regenereer” knop.
                      </p>
                    </div>
                  </>
                ) : null}

                {stepIdx === 5 ? (
                  <>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Check
                      </div>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>
                          <b>Basis</b>: {state.title && state.location ? "ok" : "mist info"}
                        </li>
                        <li>
                          <b>Werk</b>: {state.responsibilities.length >= 3 ? "ok" : "min. 3 bullets"}
                        </li>
                        <li>
                          <b>Eisen</b>: {state.mustHaves.length >= 3 ? "ok" : "min. 3 must-haves"}
                        </li>
                        <li>
                          <b>Kanalen</b>: {state.channels.website || state.channels.indeed ? "ok" : "zet website of indeed aan"}
                        </li>
                      </ul>
                    </div>

                    <button
                      disabled={loading || !stepValid(0) || !stepValid(1) || !stepValid(2) || !stepValid(3) || !stepValid(4)}
                      onClick={async () => {
                        setLoading(true);
                        setError(null);
                        try {
                          const rawIntent = buildRawIntent(companyName, state);

                          if (mode === "live") {
                            const url = isEditing
                              ? `/api/campaigns/${editId}/wizard`
                              : "/api/campaigns/generate";
                            const res = await fetch(
                              url,
                              await withAuth({
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ rawIntent, structured: state }),
                              })
                            );
                            const json = (await res.json().catch(() => ({}))) as {
                              jobId?: string;
                              error?: string;
                            };
                            if (!res.ok) throw new Error(json.error ?? "Opslaan mislukt.");
                            const jobId = json.jobId ?? (isEditing ? editId : undefined);
                            if (jobId) {
                              try {
                                localStorage.removeItem(storageKey);
                              } catch {
                                // ignore
                              }
                              router.push(`/campaigns/${jobId}`);
                              return;
                            }
                          }

                          // Fallback: demo/localStorage
                          const jobId = isEditing ? editId : createJob({ rawIntent }).id;
                          if (isEditing) updateJob(editId, { rawIntent });
                          if (!jobId) throw new Error("Kon vacature niet opslaan.");
                          const runExtract = createRun({
                            jobId,
                            step: "extract",
                            status: "running",
                            model: "demo",
                            prompt: "wizard input",
                          });

                          const generated = mockGenerateCampaign({ rawIntent, company: demoCompany ?? null });
                          updateJob(jobId, generated.jobPatch);
                          createRun({
                            jobId,
                            step: "extract",
                            status: "succeeded",
                            model: "demo",
                            prompt: runExtract.prompt,
                          });

                          const runCopy = createRun({
                            jobId,
                            step: "copy",
                            status: "running",
                            model: "demo",
                            prompt: "mock copywriter",
                          });

                          for (const c of generated.contents) {
                            upsertContent({
                              jobId,
                              channel: c.channel,
                              version: 1,
                              state: "draft",
                              content: c.content,
                            });
                          }
                          createRun({
                            jobId,
                            step: "copy",
                            status: "succeeded",
                            model: "demo",
                            prompt: runCopy.prompt,
                          });

                          createRun({
                            jobId,
                            step: "assets",
                            status: "succeeded",
                            model: "template",
                            prompt: `template:${state.visualTemplate}`,
                          });

                          try {
                            localStorage.removeItem(storageKey);
                          } catch {
                            // ignore
                          }
                          router.push(`/campaigns/${jobId}`);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Er ging iets mis.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    >
                      {loading ? "Even bezig…" : isEditing ? "Opslaan & (opnieuw) maken" : "Maak mijn vacature"}
                    </button>
                  </>
                ) : null}

                {error ? (
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-900/90 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
                    {error}
                  </div>
                ) : null}

                {/* Nav buttons */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    disabled={stepIdx === 0}
                    onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
                  >
                    Terug
                  </button>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Stap {stepIdx + 1} van {steps.length}
                  </div>
                  <button
                    type="button"
                    disabled={stepIdx >= steps.length - 1 || !stepValid(stepIdx)}
                    onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    Volgende
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-4">
          <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-medium">Je voortgang</div>
            <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <div>
                <b>Bedrijf</b>: {companyName ?? "—"}
              </div>
              <div>
                <b>Titel</b>: {state.title || "—"}
              </div>
              <div>
                <b>Locatie</b>: {state.location || "—"}
              </div>
              <div>
                <b>Bullets</b>: {state.responsibilities.length}
              </div>
              <div>
                <b>Must-haves</b>: {state.mustHaves.length}
              </div>
              <div>
                <b>Kanalen</b>:{" "}
                {Object.entries(state.channels)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(", ")}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-900/80 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
              Tip: Joppa werkt het beste als je eerst de basis invult. Daarna kan AI
              de tekst, kanalen en visuals consistent maken.
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-medium">Wat je krijgt</div>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <li>Een nette vacaturetekst (voor je website)</li>
              <li>Korte teksten voor Indeed + socials</li>
              <li>Visuals op basis van templates (goedkoop)</li>
              <li>Een export die je zo kunt plaatsen</li>
            </ul>
          </div>
        </div>
      </div>
    </RequireEmployer>
  );
}

function BulletEditor({
  title,
  hint,
  items,
  onChange,
}: {
  title: string;
  hint: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</div>
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</div>

      <div className="mt-3 space-y-2">
        {items.map((b, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              value={b}
              onChange={(e) => onChange(items.map((x, i) => (i === idx ? e.target.value : x)))}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              –
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nieuwe bullet…"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
          />
          <button
            type="button"
            onClick={() => {
              const v = draft.trim();
              if (!v) return;
              onChange([...items, v]);
              setDraft("");
            }}
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

