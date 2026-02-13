"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export default function EmployerLoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");

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
          Log in met wachtwoord (snelste) of gebruik een login link.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 inline-flex rounded-full border border-zinc-200 bg-white p-1 text-xs dark:border-zinc-800 dark:bg-black">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setSent(false);
              setError(null);
            }}
            className={`rounded-full px-3 py-1.5 font-medium ${
              mode === "password"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-black"
                : "text-zinc-700 dark:text-zinc-300"
            }`}
          >
            Wachtwoord
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setSent(false);
              setError(null);
            }}
            className={`rounded-full px-3 py-1.5 font-medium ${
              mode === "magic"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-black"
                : "text-zinc-700 dark:text-zinc-300"
            }`}
          >
            Login link
          </button>
        </div>

        {mode === "magic" && sent ? (
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
        ) : mode === "magic" ? (
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
        ) : (
          <>
            <label className="text-sm font-medium">E‑mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@bedrijf.nl"
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
            />
            <label className="mt-4 block text-sm font-medium">Wachtwoord</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
            />

            {error ? (
              <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-900/90 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
                {error}
              </div>
            ) : null}

            <div className="mt-4 grid gap-2">
              <button
                disabled={busy || !email.includes("@") || password.length < 6}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const { data, error } = await supabase.auth.signInWithPassword({
                      email,
                      password,
                    });
                    if (error) throw error;
                    const token = data.session?.access_token;
                    if (!token) throw new Error("Geen sessie gevonden.");

                    await fetch("/api/auth/set-role", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ role: "employer" }),
                    });

                    router.push("/dashboard");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Er ging iets mis.");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {busy ? "Even bezig…" : "Inloggen"}
              </button>
              <button
                type="button"
                disabled={busy || !email.includes("@") || password.length < 6}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const { data, error } = await supabase.auth.signUp({
                      email,
                      password,
                    });
                    if (error) throw error;

                    const token = data.session?.access_token;
                    if (!token) {
                      // If email confirmations are enabled, user must confirm first.
                      throw new Error(
                        "Account aangemaakt. Bevestig je e‑mail en log daarna in."
                      );
                    }

                    await fetch("/api/auth/set-role", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ role: "employer" }),
                    });

                    router.push("/dashboard");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Er ging iets mis.");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Account aanmaken
              </button>
            </div>

            <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Tip: als Supabase “email confirmations” aan heeft staan, moet je je
              e‑mail eerst bevestigen. Wil je echt zonder e‑mail: zet dat tijdelijk uit in
              Supabase Auth settings.
            </div>
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

