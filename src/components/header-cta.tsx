"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getSupabaseClient } from "@/lib/supabase";

type Cta =
  | { kind: "login" }
  | { kind: "new_job" }
  | { kind: "vacatures" };

export function HeaderCta() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [cta, setCta] = useState<Cta>({ kind: "login" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (!cancelled) setCta({ kind: "login" });
          return;
        }

        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json().catch(() => ({}))) as { role?: string | null };
        if (!cancelled) {
          if (res.ok && json.role === "employer") setCta({ kind: "new_job" });
          else setCta({ kind: "vacatures" });
        }
      } catch {
        if (!cancelled) setCta({ kind: "login" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (cta.kind === "new_job") {
    return (
      <Link
        href="/create"
        className="inline-flex h-9 items-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        Nieuwe vacature
      </Link>
    );
  }

  if (cta.kind === "vacatures") {
    return (
      <Link
        href="/vacatures"
        className="inline-flex h-9 items-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
      >
        Vacatures
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex h-9 items-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
    >
      Log in
    </Link>
  );
}

