"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { getSupabaseClient } from "@/lib/supabase";

export type AuthRole = "employer" | "candidate" | "unknown";

export type AuthRoleState =
  | { status: "loading" }
  | { status: "logged_out" }
  | { status: "logged_in"; role: AuthRole };

type RoleCache = { userId: string; role: AuthRole; ts: number };

const ROLE_CACHE_KEY = "joppa:authRole";
const ROLE_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h

const supabase = getSupabaseClient();

let started = false;
let snapshot: AuthRoleState = { status: "loading" };
const listeners = new Set<(s: AuthRoleState) => void>();

function emit(next: AuthRoleState) {
  snapshot = next;
  for (const l of listeners) l(next);
}

function readRoleCache(userId: string): AuthRole | null {
  try {
    const raw = localStorage.getItem(ROLE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RoleCache>;
    if (!parsed.userId || !parsed.role || !parsed.ts) return null;
    if (parsed.userId !== userId) return null;
    if (Date.now() - parsed.ts > ROLE_CACHE_MAX_AGE_MS) return null;
    if (parsed.role !== "employer" && parsed.role !== "candidate" && parsed.role !== "unknown") {
      return null;
    }
    return parsed.role;
  } catch {
    return null;
  }
}

function writeRoleCache(userId: string, role: AuthRole) {
  try {
    const payload: RoleCache = { userId, role, ts: Date.now() };
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function clearRoleCache() {
  try {
    localStorage.removeItem(ROLE_CACHE_KEY);
  } catch {
    // ignore
  }
}

async function refreshFromSession(session: Session | null | undefined) {
  try {
    const token = session?.access_token;
    const userId = session?.user?.id ?? null;
    if (!token || !userId) {
      clearRoleCache();
      emit({ status: "logged_out" });
      return;
    }

    // Optimistic: instantly set role from cache to avoid header flicker
    // on mobile / slow networks. We'll still verify in background.
    const cachedRole = readRoleCache(userId);
    if (cachedRole) emit({ status: "logged_in", role: cachedRole });

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
    writeRoleCache(userId, role);
    emit({ status: "logged_in", role });
  } catch {
    clearRoleCache();
    emit({ status: "logged_out" });
  }
}

async function startOnce() {
  if (started) return;
  started = true;

  try {
    if (!supabase) {
      emit({ status: "logged_out" });
      return;
    }
    const { data } = await supabase.auth.getSession();
    await refreshFromSession(data.session);
  } catch {
    emit({ status: "logged_out" });
  }

  supabase?.auth.onAuthStateChange((_event, session) => {
    void refreshFromSession(session);
  });
}

export function useAuthRole(): AuthRoleState {
  const [state, setState] = useState<AuthRoleState>(() => snapshot);

  useEffect(() => {
    listeners.add(setState);
    void startOnce();
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}

