"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export default function EmployerLoginPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured() || !supabase) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold">Supabase is nog niet ingesteld</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Zet `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
          `.env.local` (en op Vercel).
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Bedrijfsomgeving
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Inloggen</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Vul je e‑mail in. Je krijgt een link om direct in te loggen.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {sent ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Check je inbox
            </div>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              We hebben een login link gestuurd naar <b>{email}</b>.
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Geen mail? Check je spam of probeer opnieuw.
            </p>
          </div>
        ) : (
          <>
            <label className="text-sm font-medium">E‑mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@bedrijf.nl"
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
            />
            {error ? (
              <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-900/90 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
                {error}
              </div>
            ) : null}
            <button
              disabled={busy || !email.includes("@")}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const redirectTo = `${window.location.origin}/auth/callback?role=employer&next=/dashboard`;
                  const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: { emailRedirectTo: redirectTo },
                  });
                  if (error) throw error;
                  setSent(true);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Er ging iets mis.");
                } finally {
                  setBusy(false);
                }
              }}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {busy ? "Even bezig…" : "Stuur login link"}
            </button>
          </>
        )}
      </div>

      <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Ben je werkzoekende?{" "}
        <Link
          href="/login/werkzoekende"
          className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
        >
          Ga naar werkzoekende login
        </Link>
        .
      </div>
    </div>
  );
}

