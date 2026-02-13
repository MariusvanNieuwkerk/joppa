"use client";

import Link from "next/link";
import { useAuthRole } from "@/hooks/use-auth-role";

type Cta =
  | { kind: "login" }
  | { kind: "new_job" }
  | { kind: "vacatures" };

export function HeaderCta() {
  const auth = useAuthRole();

  const cta: Cta =
    auth.status !== "logged_in"
      ? { kind: "login" }
      : auth.role === "employer"
        ? { kind: "new_job" }
        : { kind: "vacatures" };

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

