"use client";

import Link from "next/link";
import { useAuthRole } from "@/hooks/use-auth-role";

export function RequireEmployer({ children }: { children: React.ReactNode }) {
  const auth = useAuthRole();

  if (auth.status === "logged_in" && auth.role === "employer") return <>{children}</>;

  if (auth.status === "logged_in" && auth.role !== "employer") {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Geen toegang
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Deze pagina is voor bedrijven.
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

  if (auth.status === "logged_out") {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Geen toegang
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Je bent niet ingelogd.
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

