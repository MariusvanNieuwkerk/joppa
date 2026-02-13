"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getSupabaseClient } from "@/lib/supabase";

export function AuthCallbackClient() {
  const sp = useSearchParams();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState<string>("Even een moment…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!supabase) throw new Error("Supabase is not configured");
        const role = (sp.get("role") ?? "").toLowerCase();
        const nextRaw = sp.get("next") ?? "/";
        const next =
          nextRaw === "/" || nextRaw === "/dashboard"
            ? role === "employer"
              ? "/create"
              : role === "candidate"
                ? "/kandidaat"
                : "/"
            : nextRaw;

        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken)
          throw new Error("Geen sessie gevonden. Probeer opnieuw in te loggen.");

        const res = await fetch("/api/auth/set-role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ role }),
        });

        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Kon rol niet opslaan.");

        if (cancelled) return;
        setStatus("done");
        setMessage("Gelukt. Je wordt doorgestuurd…");
        window.location.href = next;
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Er ging iets mis.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sp, supabase]);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Inloggen
      </div>
      <div className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {message}
      </div>
      {status === "error" ? (
        <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Tip: ga terug naar <b>/login</b> en probeer opnieuw.
        </div>
      ) : null}
    </div>
  );
}

