"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

import { getSupabaseClient } from "@/lib/supabase";

export type AuthRole = "employer" | "candidate" | "unknown";

export type AuthRoleState =
  | { status: "loading" }
  | { status: "logged_out" }
  | { status: "logged_in"; role: AuthRole };

export function useAuthRole(): AuthRoleState {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [state, setState] = useState<AuthRoleState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function refreshFromSession(session: Session | null | undefined) {
      try {
        const token = session?.access_token;
        if (!token) {
          if (!cancelled) setState({ status: "logged_out" });
          return;
        }
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json().catch(() => ({}))) as { role?: string | null };
        const role: AuthRole =
          res.ok && json.role === "employer"
            ? "employer"
            : res.ok && json.role === "candidate"
              ? "candidate"
              : "unknown";
        if (!cancelled) setState({ status: "logged_in", role });
      } catch {
        if (!cancelled) setState({ status: "logged_out" });
      }
    }

    (async () => {
      try {
        if (!supabase) {
          if (!cancelled) setState({ status: "logged_out" });
          return;
        }
        const { data } = await supabase.auth.getSession();
        await refreshFromSession(data.session);
      } catch {
        if (!cancelled) setState({ status: "logged_out" });
      }
    })();

    const sub = supabase?.auth.onAuthStateChange((_event, session) => {
      void refreshFromSession(session);
    });

    return () => {
      cancelled = true;
      sub?.data.subscription.unsubscribe();
    };
  }, [supabase]);

  return state;
}

