"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { RequireEmployer } from "@/components/require-employer";
import { getCompany, upsertCompany } from "@/lib/demo-db";
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

type CompanyResponse = { company: LiveCompany | null };

const tones = [
  "zakelijk",
  "warm",
  "direct",
  "speels",
  "premium",
  "technisch",
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const existing = useMemo(() => getCompany(), []);

  const [mode, setMode] = useState<"live" | "demo">("live");
  const [name, setName] = useState(existing?.name ?? "");
  const [website, setWebsite] = useState(existing?.website ?? "");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(
    existing?.brandPrimaryColor ?? "#111827"
  );
  const [brandTone, setBrandTone] = useState(existing?.brandTone ?? "direct");
  const [brandPitch, setBrandPitch] = useState(existing?.brandPitch ?? "");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/company", await withAuth({ method: "GET" }));
        if (!res.ok) throw new Error("not ok");
        const json = (await res.json()) as CompanyResponse;
        if (cancelled) return;
        if (json.company) {
          setMode("live");
          setName(json.company.name ?? "");
          setWebsite(json.company.website ?? "");
          setBrandPrimaryColor(json.company.brand_primary_color ?? "#111827");
          setBrandTone(json.company.brand_tone ?? "direct");
          setBrandPitch(json.company.brand_pitch ?? "");
        }
      } catch {
        // stay demo defaults
        if (cancelled) return;
        setMode("demo");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <RequireEmployer>
    <div className="grid gap-10 md:grid-cols-12 md:items-start">
      <div className="md:col-span-7">
        <h1 className="text-3xl font-semibold tracking-tight">Bedrijfsstijl</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Dit zorgt dat je vacatures meteen herkenbaar zijn. Je kunt dit later
          altijd aanpassen.
        </p>

        <form
          className="mt-6 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (mode === "live") {
              await fetch(
                "/api/company",
                await withAuth({
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: name || "My Company",
                    website: website || undefined,
                    brandPrimaryColor,
                    brandTone,
                    brandPitch: brandPitch || undefined,
                  }),
                })
              );
              router.push("/create");
              return;
            }
            upsertCompany({
              name: name || "My Company",
              website: website || undefined,
              brandPrimaryColor,
              brandTone,
              brandPitch: brandPitch || undefined,
            });
            router.push("/create");
          }}
        >
          <div>
            <label className="text-sm font-medium">Bedrijfsnaam</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Joppa BV"
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Website (optioneel)</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Hoofdkleur</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={brandPrimaryColor}
                  onChange={(e) => setBrandPrimaryColor(e.target.value)}
                  className="h-10 w-12 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950"
                />
                <input
                  value={brandPrimaryColor}
                  onChange={(e) => setBrandPrimaryColor(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Schrijfstijl</label>
              <select
                value={brandTone}
                onChange={(e) => setBrandTone(e.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
              >
                {tones.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              Korte intro over jullie (optioneel)
            </label>
            <textarea
              value={brandPitch}
              onChange={(e) => setBrandPitch(e.target.value)}
              rows={4}
              placeholder="Waarom is dit een toffe plek om te werken?"
              className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Opslaan
            </button>
            <button
              type="button"
              onClick={() => router.push("/create")}
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Later doen
            </button>
          </div>
        </form>
      </div>

      <div className="md:col-span-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm font-medium">Voorbeeld</div>
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-black">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl"
                style={{ backgroundColor: brandPrimaryColor }}
              />
              <div>
                <div className="text-sm font-semibold">
                  {name || "My Company"}
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-300">
                  Schrijfstijl: {brandTone}
                </div>
              </div>
            </div>
            {brandPitch ? (
              <p className="mt-3 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                {brandPitch}
              </p>
            ) : (
              <p className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Tip: voeg een korte intro toe voor extra vertrouwen.
              </p>
            )}
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Je kunt straks bij elke vacature makkelijk een andere stijl kiezen.
          </p>
        </div>
      </div>
    </div>
    </RequireEmployer>
  );
}

