"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getSupabaseClient } from "@/lib/supabase";

export function RequireEmployer({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "allowed" }
    | { status: "denied"; reason: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!supabase) throw new Error("Supabase is not configured");
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Je bent niet ingelogd.");

        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json().catch(() => ({}))) as { role?: string | null; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Geen toegang.");
        if (json.role !== "employer") throw new Error("Deze pagina is voor bedrijven.");

        if (!cancelled) setState({ status: "allowed" });
      } catch (e) {
        if (cancelled) return;
        setState({ status: "denied", reason: e instanceof Error ? e.message : "Geen toegang." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (state.status === "allowed") return <>{children}</>;

  if (state.status === "denied") {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Geen toegang
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {state.reason}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/login/bedrijf"
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Inloggen als bedrijf
          </Link>
          <Link
            href="/vacatures"
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Vacatures bekijken
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-white p-6 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
      Laden…
    </div>
  );
}

