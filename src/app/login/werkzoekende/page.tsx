"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export default function CandidateLoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedUp, setSignedUp] = useState(false);
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
          Werkzoekenden
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Inloggen</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Log in met je e‑mail en wachtwoord.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {signedUp ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Account aangemaakt
            </div>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Als Supabase e‑mailbevestiging aan heeft staan, krijg je nu een mail
              om je account te bevestigen. Daarna kun je hier inloggen met je
              wachtwoord.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setSignedUp(false)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Terug naar inloggen
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="text-sm font-medium">E‑mail</label>
            <input
              ref={emailRef}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="naam@email.com"
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
            />
            <label className="mt-4 block text-sm font-medium">Wachtwoord</label>
            <input
              ref={passwordRef}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black dark:focus:border-zinc-600"
            />

            {error ? (
              <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-amber-900/90 dark:border-zinc-800 dark:bg-black dark:text-zinc-200">
                {error}
              </div>
            ) : null}

            <div className="mt-4 grid gap-2">
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const e = (emailRef.current?.value ?? email).trim();
                    const p = passwordRef.current?.value ?? password;
                    if (!e.includes("@") || p.length < 6) {
                      throw new Error("Vul een geldig e‑mailadres en een wachtwoord (min. 6 tekens) in.");
                    }
                    const { data, error } = await supabase.auth.signInWithPassword({
                      email: e,
                      password: p,
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
                      body: JSON.stringify({ role: "candidate" }),
                    });

                    router.push("/kandidaat");
                  } catch (e) {
                    setError(toFriendlyAuthError(e));
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
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const e = (emailRef.current?.value ?? email).trim();
                    const p = passwordRef.current?.value ?? password;
                    if (!e.includes("@") || p.length < 6) {
                      throw new Error("Vul een geldig e‑mailadres en een wachtwoord (min. 6 tekens) in.");
                    }
                    const { data, error } = await supabase.auth.signUp({
                      email: e,
                      password: p,
                    });
                    if (error) throw error;

                    const token = data.session?.access_token;
                    if (!token) {
                      setSignedUp(true);
                      return;
                    }

                    await fetch("/api/auth/set-role", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ role: "candidate" }),
                    });

                    router.push("/kandidaat");
                  } catch (e) {
                    const friendly = toFriendlyAuthError(e);
                    setError(friendly);
                    if (friendly.includes("al een account")) {
                      try {
                        const { data, error } = await supabase.auth.signInWithPassword({
                          email: (emailRef.current?.value ?? email).trim(),
                          password: passwordRef.current?.value ?? password,
                        });
                        if (!error && data.session?.access_token) {
                          await fetch("/api/auth/set-role", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${data.session.access_token}`,
                            },
                            body: JSON.stringify({ role: "candidate" }),
                          });
                          router.push("/kandidaat");
                        }
                      } catch {
                        // ignore
                      }
                    }
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
        Ben je een bedrijf?{" "}
        <Link
          href="/login/bedrijf"
          className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
        >
          Ga naar bedrijf login
        </Link>
        .
      </div>
    </div>
  );
}

function toFriendlyAuthError(err: unknown) {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Er ging iets mis.";
  const lower = msg.toLowerCase();

  if (lower.includes("email rate limit") || lower.includes("rate limit")) {
    return "Te veel pogingen achter elkaar. Wacht even (5–15 min) of zet ‘Confirm sign up’ tijdelijk uit in Supabase Auth → Email.";
  }
  if (lower.includes("signups not allowed") || lower.includes("signup is disabled")) {
    return "Account aanmaken staat uit in Supabase. Zet signup aan in Supabase Auth settings (Disable signups = uit).";
  }
  if (lower.includes("user already registered") || lower.includes("already registered")) {
    return "Dit e‑mailadres heeft al een account. Klik op ‘Inloggen’.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Deze combinatie klopt niet. Controleer je e‑mail en wachtwoord.";
  }
  if (lower.includes("password") && lower.includes("6")) {
    return "Je wachtwoord moet minimaal 6 tekens zijn.";
  }
  return msg;
}

