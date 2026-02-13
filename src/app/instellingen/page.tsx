"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<"employer" | "candidate" | "unknown">("unknown");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      let sessionPresent = false;
      try {
        if (!supabase) throw new Error("Supabase is niet ingesteld.");
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const userEmail = data.session?.user?.email ?? "";
        sessionPresent = Boolean(token);
        if (!cancelled) setHasSession(sessionPresent);
        if (!token) throw new Error("Je bent niet ingelogd.");
        setEmail(userEmail);

        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json().catch(() => ({}))) as {
          role?: "employer" | "candidate" | null;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Kon je rol niet ophalen.");
        if (cancelled) return;
        setRole(json.role ?? "unknown");
      } catch (e) {
        if (cancelled) return;
        setHasSession(sessionPresent);
        setError(e instanceof Error ? e.message : "Er ging iets mis.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Instellingen</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Je account, voorkeuren en (als bedrijf) je bedrijfsinstellingen.
        </p>
      </div>

      {!isSupabaseConfigured() ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-5 text-sm text-amber-900/90 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
          Supabase is nog niet ingesteld. Vul `NEXT_PUBLIC_SUPABASE_URL` en
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` in.
        </div>
      ) : null}

      {/* Account */}
      <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Account
        </div>
        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          {loading ? (
            "Laden…"
          ) : error ? (
            <span className="text-amber-900/90 dark:text-zinc-200">{error}</span>
          ) : (
            <div className="space-y-1">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">E‑mail</span>:{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {email || "—"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Type</span>:{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {role === "employer"
                    ? "Bedrijf"
                    : role === "candidate"
                      ? "Werkzoekende"
                      : "Onbekend"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          {hasSession ? (
            <button
              type="button"
              onClick={async () => {
                if (!supabase) return;
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Uitloggen
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Naar inloggen
            </Link>
          )}
        </div>
      </div>

      {/* Employer settings */}
      {role === "employer" ? (
        <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Voor bedrijven
          </div>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <SettingCard
              title="Bedrijfsstijl"
              body="Pas je bedrijfsnaam, schrijfstijl en intro aan. Dit bepaalt de look & feel van je vacatures."
              href="/onboarding"
              cta="Bedrijfsstijl aanpassen"
            />
            <SettingCard
              title="Vacatures beheren"
              body="Bekijk je vacatures, zet ze live of pas teksten aan in de cockpit."
              href="/dashboard"
              cta="Naar mijn vacatures"
            />
          </div>
          <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs leading-5 text-amber-900/90 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
            Later voegen we hier teamleden/invites, notificaties en facturatie toe.
          </div>
        </div>
      ) : null}

      {/* Candidate settings */}
      {role === "candidate" ? (
        <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Voor werkzoekenden
          </div>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <SettingCard
              title="Vacatures"
              body="Bekijk alle live vacatures en filter op wat bij je past."
              href="/vacatures"
              cta="Naar vacatures"
            />
            <SettingCard
              title="Job alerts (later)"
              body="Straks kun je alerts aanzetten voor nieuwe vacatures op jouw criteria."
              href="/kandidaat"
              cta="Bekijk kandidaat omgeving"
            />
          </div>
          <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs leading-5 text-amber-900/90 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
            Later voegen we hier profiel (CV/skills), opgeslagen vacatures en privacy‑instellingen toe.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettingCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm transition-colors hover:bg-amber-50/40 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-950"
    >
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {body}
      </p>
      <div className="mt-3 text-xs font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100">
        {cta} →
      </div>
    </Link>
  );
}

