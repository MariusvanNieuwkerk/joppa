"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { getSupabaseClient } from "@/lib/supabase";

type NavItem =
  | { kind: "link"; href: string; label: string }
  | { kind: "action"; id: "logout"; label: string };

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  const [authState, setAuthState] = useState<
    | { status: "loading" }
    | { status: "logged_out" }
    | { status: "logged_in"; role: "employer" | "candidate" | "unknown" }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!supabase) {
          if (!cancelled) setAuthState({ status: "logged_out" });
          return;
        }
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (!cancelled) setAuthState({ status: "logged_out" });
          return;
        }
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json().catch(() => ({}))) as { role?: string | null };
        const role =
          res.ok && json.role === "employer"
            ? "employer"
            : res.ok && json.role === "candidate"
              ? "candidate"
              : "unknown";
        if (!cancelled) setAuthState({ status: "logged_in", role });
      } catch {
        if (!cancelled) setAuthState({ status: "logged_out" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const items: NavItem[] = useMemo(() => {
    // Public / logged-out navigation
    if (authState.status !== "logged_in") {
      return [
        { kind: "link", href: "/vacatures", label: "Vacatures" },
        { kind: "link", href: "/pricing", label: "Pricing" },
      ];
    }

    // Candidate navigation
    if (authState.role === "candidate") {
      return [
        { kind: "link", href: "/vacatures", label: "Vacatures" },
        { kind: "link", href: "/kandidaat", label: "Kandidaat" },
        { kind: "link", href: "/instellingen", label: "Instellingen" },
        { kind: "action", id: "logout", label: "Uitloggen" },
      ];
    }

    // Employer (and unknown) navigation
    return [
      { kind: "link", href: "/vacatures", label: "Vacatures" },
      { kind: "link", href: "/dashboard", label: "Mijn vacatures" },
      { kind: "link", href: "/create", label: "Vacature maken" },
      { kind: "link", href: "/onboarding", label: "Bedrijfsstijl" },
      { kind: "link", href: "/instellingen", label: "Instellingen" },
      { kind: "action", id: "logout", label: "Uitloggen" },
      { kind: "link", href: "/pricing", label: "Pricing" },
    ];
  }, [authState]);

  async function doLogout() {
    try {
      await supabase?.auth.signOut();
    } finally {
      setAuthState({ status: "logged_out" });
      setOpenPath(null);
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <>
      {/* Desktop nav (large screens) */}
      <nav className="hidden items-center gap-4 text-sm text-zinc-700 dark:text-zinc-300 lg:flex">
        {items.map((it) =>
          it.kind === "link" ? (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "hover:text-zinc-950 dark:hover:text-white",
                pathname === it.href ? "text-zinc-950 dark:text-white" : ""
              )}
            >
              {it.label}
            </Link>
          ) : (
            <button
              key={it.id}
              type="button"
              onClick={doLogout}
              className="hover:text-zinc-950 dark:hover:text-white"
            >
              {it.label}
            </button>
          )
        )}
      </nav>

      {/* Mobile / tablet menu button */}
      <button
        type="button"
        className="inline-flex h-9 items-center justify-center rounded-full border border-amber-200/70 bg-white px-3 text-sm font-medium text-zinc-900 shadow-sm hover:bg-amber-50/60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900 lg:hidden"
        aria-haspopup="dialog"
        aria-controls="joppa-mobile-menu"
        aria-expanded={open}
        onClick={() => setOpenPath(pathname)}
      >
        <span className="sr-only">Menu</span>
        <HamburgerIcon />
        <span className="ml-2 hidden sm:inline">Menu</span>
      </button>

      {/* Overlay + panel */}
      {open ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          id="joppa-mobile-menu"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setOpenPath(null)}
            aria-label="Sluit menu"
          />

          <div className="absolute left-0 right-0 top-0 mx-auto w-full max-w-lg">
            <div className="m-3 overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm font-semibold">Navigatie</div>
                <button
                  type="button"
                  onClick={() => setOpenPath(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
                  aria-label="Sluit menu"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="px-2 pb-2">
                {items.map((it) =>
                  it.kind === "link" ? (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-zinc-900 hover:bg-amber-50/60 dark:text-zinc-100 dark:hover:bg-black",
                        pathname === it.href ? "bg-amber-50/70 dark:bg-black" : ""
                      )}
                    >
                      <span>{it.label}</span>
                      <span className="text-zinc-400">→</span>
                    </Link>
                  ) : (
                    <button
                      key={it.id}
                      type="button"
                      onClick={doLogout}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-amber-50/60 dark:text-zinc-100 dark:hover:bg-black"
                    >
                      <span>{it.label}</span>
                      <span className="text-zinc-400">→</span>
                    </button>
                  )
                )}
              </div>

              <div className="border-t border-amber-200/80 px-4 py-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                Tip: je kunt altijd een nieuwe vacature maken via de knop rechtsboven.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 7H20M4 12H20M4 17H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

